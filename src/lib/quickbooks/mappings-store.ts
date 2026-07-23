"use client";

import { useSyncExternalStore } from "react";

import { scopeKey, type QuickBooksScope } from "./connection-store";
import type { MappableGroup } from "./yipyy-catalog";

// ============================================================================
// Service → QuickBooks mappings (Phase 3.4).
//
// One entry per Yipyy item: which QuickBooks Product/Service it is sold as, and
// which income (or liability) account the money lands in.
//
// Persisted and scope-keyed like the rest of the module. This is the most
// expensive thing a facility fills in during setup, and it must survive a
// reload, a reconnect and an expiry — which is why it does NOT live on the
// connection. Only a disconnect to a DIFFERENT QuickBooks company invalidates
// it, because the ids point at that company's accounts and items.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-mappings";
const CHANNEL = "yipyy-quickbooks-mappings";

export interface QuickBooksMapping {
  /** QuickBooks Item Id. */
  itemId?: string;
  /** QuickBooks Account Id. */
  accountId?: string;
  /** The Yipyy item's name when it was mapped. Snapshotted so a mapping stays
   *  readable after the service is deleted from the catalog (4E) — an id alone
   *  tells nobody which service last year's receipts point at. */
  name?: string;
}

/** yipyy item id → mapping */
export type MappingSet = Record<string, QuickBooksMapping>;

const EMPTY_SET: MappingSet = Object.freeze({});

type MappingsByScope = Record<string, MappingSet>;

const EMPTY_MAP: MappingsByScope = Object.freeze({});

let state: MappingsByScope = EMPTY_MAP;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as MappingsByScope;
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
}

function commit(next: MappingsByScope) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQuickBooksMappings(scope: QuickBooksScope): MappingSet {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_SET;
}

export function useQuickBooksMappings(scope: QuickBooksScope): MappingSet {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_SET,
    () => EMPTY_SET,
  );
}

/** Set (or clear) one side of one item's mapping. */
export function setQuickBooksMapping(
  scope: QuickBooksScope,
  itemKey: string,
  patch: QuickBooksMapping,
): void {
  ensureReady();
  const key = scopeKey(scope);
  const set = state[key] ?? EMPTY_SET;
  const next: QuickBooksMapping = { ...set[itemKey], ...patch };
  // Drop empty entries so "mapped" counts never include a row that was set and
  // then cleared.
  const merged: MappingSet = { ...set, [itemKey]: next };
  if (!next.itemId && !next.accountId) delete merged[itemKey];
  commit({ ...state, [key]: merged });
}

/** Apply one mapping to many items at once — the bulk "apply to all selected". */
export function setQuickBooksMappings(
  scope: QuickBooksScope,
  itemKeys: string[],
  patch: QuickBooksMapping,
  /** item id → display name, snapshotted alongside the mapping. */
  names: Record<string, string> = {},
): void {
  ensureReady();
  const key = scopeKey(scope);
  const set = { ...(state[key] ?? EMPTY_SET) };
  for (const itemKey of itemKeys) {
    const next: QuickBooksMapping = {
      ...set[itemKey],
      ...patch,
      name: names[itemKey] ?? set[itemKey]?.name,
    };
    if (!next.itemId && !next.accountId) delete set[itemKey];
    else set[itemKey] = next;
  }
  commit({ ...state, [key]: set });
}

export function clearQuickBooksMappings(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface MappingProgress {
  mapped: number;
  total: number;
  /** 0–100. */
  percent: number;
}

/** An item counts as mapped only when it has BOTH an item and an account —
 *  half a mapping can't produce a posting line. */
export function isMapped(mapping: QuickBooksMapping | undefined): boolean {
  return Boolean(mapping?.itemId && mapping?.accountId);
}

export function mappingProgress(
  groups: MappableGroup[],
  mappings: MappingSet,
): MappingProgress {
  // Items configured elsewhere (tax) are not part of this screens work, and
  // neither are retained mappings for deleted services — counting those would
  // put work in the denominator that nobody can ever do.
  const all = groups
    .flatMap((g) => g.items)
    .filter((i) => !i.mappedElsewhere && !i.deleted);
  const mapped = all.filter((i) => isMapped(mappings[i.id])).length;
  const total = all.length;
  return {
    mapped,
    total,
    percent: total === 0 ? 0 : Math.round((mapped / total) * 100),
  };
}

export function groupProgress(
  group: MappableGroup,
  mappings: MappingSet,
): MappingProgress {
  return mappingProgress([group], mappings);
}

/** Ids that carry a usable mapping — the input to `withRetainedMappings`. */
export function mappedItemIds(mappings: MappingSet): string[] {
  return Object.keys(mappings).filter((id) => isMapped(mappings[id]));
}

/** id → the name recorded when it was mapped, for rows whose catalog entry is
 *  gone. Mappings written before names were snapshotted simply aren't listed. */
export function mappedItemNames(mappings: MappingSet): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [id, mapping] of Object.entries(mappings)) {
    if (mapping.name) names[id] = mapping.name;
  }
  return names;
}

// ── Resolving a mapping at sync time ────────────────────────────────────────

export interface ResolvedMapping {
  itemId?: string;
  accountId?: string;
  /** True when the item had no mapping and fell through to the catch-all. */
  usedCatchAll: boolean;
  /** Attached to the sync log so an unassigned posting is visible rather than
   *  silently absorbed. */
  warning?: string;
}

/**
 * What a transaction line should post to.
 *
 * An unmapped item does NOT block the sale — the money already moved in Yipyy,
 * and refusing to sync would leave the books further from the truth, not
 * closer. It posts to the catch-all and says so.
 */
export function resolveMapping(
  itemKey: string,
  itemName: string,
  mappings: MappingSet,
  catchAllAccountId: string,
): ResolvedMapping {
  const mapping = mappings[itemKey];
  if (isMapped(mapping)) {
    return {
      itemId: mapping?.itemId,
      accountId: mapping?.accountId,
      usedCatchAll: false,
    };
  }
  return {
    itemId: mapping?.itemId,
    accountId: mapping?.accountId ?? catchAllAccountId,
    usedCatchAll: true,
    warning: `"${itemName}" isn't mapped to a QuickBooks account — posted to Yipyy Unassigned Income.`,
  };
}
