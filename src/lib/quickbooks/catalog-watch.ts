"use client";

import { useSyncExternalStore } from "react";

import { scopeKey, type QuickBooksScope } from "./connection-store";
import { isMapped, type MappingSet } from "./mappings-store";
import type { MappableGroup, MappableItem } from "./yipyy-catalog";

// ============================================================================
// Watching the Yipyy catalog for change (Phase 5.4 / 4E).
//
// RULE: when a new service is created while the integration is live, the
// facility is told within 24 hours — because the alternative is that it quietly
// posts to the catch-all account and nobody notices until their accountant does.
//
// The watch stores WHEN each catalog item was first seen. That is the only way
// to tell "new" from "always been there": the catalog itself has no created-at
// that survives being rebuilt from mock data.
//
// TODO: real catalog events — with a backend, service creation emits an event
// and this becomes a subscription rather than a diff on every render.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-catalog-watch";
const CHANNEL = "yipyy-quickbooks-catalog-watch";

/** How long a new service stays "new". After this it's just an unmapped item,
 *  which the mapping progress already reports. */
export const NEW_SERVICE_WINDOW_HOURS = 24;

export interface CatalogWatch {
  /** When this facility's catalog was first recorded. Everything present at
   *  that moment is "existing", however old the integration is. */
  baselineAt?: string;
  /** item id → first seen. */
  seen: Record<string, string>;
}

const EMPTY_WATCH: CatalogWatch = Object.freeze({ seen: Object.freeze({}) });

type WatchByScope = Record<string, CatalogWatch>;

const EMPTY_MAP: WatchByScope = Object.freeze({});

let state: WatchByScope = EMPTY_MAP;
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
    if (raw) state = JSON.parse(raw) as WatchByScope;
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

function commit(next: WatchByScope) {
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

// ── Pure diff ───────────────────────────────────────────────────────────────

/**
 * Fold the current catalog into the watch.
 *
 * The first call is a BASELINE: every item is recorded at the same instant and
 * none of them counts as new. Announcing fifty "new services" the first time a
 * facility opens the dashboard would train them to dismiss the banner, which is
 * the one thing it cannot afford.
 */
export function recordSeen(
  watch: CatalogWatch,
  itemIds: string[],
  now: Date = new Date(),
): CatalogWatch {
  const stamp = now.toISOString();
  const baselineAt = watch.baselineAt ?? stamp;
  const seen = { ...watch.seen };
  let changed = !watch.baselineAt;

  for (const id of itemIds) {
    if (seen[id]) continue;
    seen[id] = stamp;
    changed = true;
  }

  return changed ? { baselineAt, seen } : watch;
}

/** Ids first seen after the baseline and still inside the window. */
export function newlySeenIds(
  watch: CatalogWatch,
  now: Date = new Date(),
): string[] {
  if (!watch.baselineAt) return [];
  const baseline = Date.parse(watch.baselineAt);
  const cutoff = now.getTime() - NEW_SERVICE_WINDOW_HOURS * 60 * 60 * 1000;

  return Object.entries(watch.seen)
    .filter(([, at]) => {
      const t = Date.parse(at);
      if (Number.isNaN(t)) return false;
      return t > baseline && t >= cutoff;
    })
    .map(([id]) => id);
}

/**
 * New services that still need a mapping.
 *
 * A new service someone mapped immediately is not a problem, so it doesn't
 * raise a banner — the banner is about money heading for the catch-all.
 */
export function newUnmappedItems(
  watch: CatalogWatch,
  groups: MappableGroup[],
  mappings: MappingSet,
  now: Date = new Date(),
): { item: MappableItem; groupKey: string }[] {
  const fresh = new Set(newlySeenIds(watch, now));
  if (fresh.size === 0) return [];

  return groups.flatMap((group) =>
    group.items
      .filter(
        (item) =>
          fresh.has(item.id) &&
          !item.mappedElsewhere &&
          !isMapped(mappings[item.id]),
      )
      .map((item) => ({ item, groupKey: group.key })),
  );
}

/** The banner sentence. One name is worth stating; several is a count. */
export function newServiceMessage(items: MappableItem[]): string {
  if (items.length === 0) return "";
  if (items.length === 1)
    return `New service detected: “${items[0].name}” is not yet mapped to QuickBooks. Until it is, sales of it post to Yipyy Unassigned Income.`;
  return `${items.length} new services detected — including “${items[0].name}” — are not yet mapped to QuickBooks. Until they are, sales of them post to Yipyy Unassigned Income.`;
}

// ── Store access ────────────────────────────────────────────────────────────

export function getCatalogWatch(scope: QuickBooksScope): CatalogWatch {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_WATCH;
}

export function useCatalogWatch(scope: QuickBooksScope): CatalogWatch {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_WATCH,
    () => EMPTY_WATCH,
  );
}

/** Fold the current catalog in. Writes only when something actually changed —
 *  this is called on render, and an unconditional commit would loop. */
export function observeCatalog(
  scope: QuickBooksScope,
  itemIds: string[],
  now: Date = new Date(),
): void {
  ensureReady();
  const key = scopeKey(scope);
  const current = state[key] ?? EMPTY_WATCH;
  const next = recordSeen(current, itemIds, now);
  if (next === current) return;
  commit({ ...state, [key]: next });
}

export function clearCatalogWatch(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}
