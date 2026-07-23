"use client";

import { useSyncExternalStore } from "react";

import {
  scopeKey,
  type QuickBooksEnvironment,
  type QuickBooksScope,
} from "./connection-store";
import type { SyncDocumentType } from "./sync-engine";

// ============================================================================
// What actually reached QuickBooks (Phase 5.2).
//
// Separate from the sync queue on purpose. A job is work — it can be retried,
// ignored, or cleared once it's done. A synced document is a FACT: money was
// posted to someone's books, and that record has to outlive the job that
// created it. The dashboard's money figures read from here rather than from the
// queue, so pruning the queue can never make revenue appear to vanish.
//
// TODO: real QuickBooks API — this is Yipyy's local record of what it posted.
// The authoritative copy lives in the facility's QuickBooks company.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-synced-documents";
const CHANNEL = "yipyy-quickbooks-synced-documents";

export interface SyncedDocument {
  id: string;
  transactionId: string;
  jobId: string;
  documentType: SyncDocumentType;
  quickBooksDocumentId: string;
  /** Human reference, e.g. "QB Sales Receipt #1042". */
  documentNumber: string;
  amount: number;
  description: string;
  /** ISO timestamp of when QuickBooks accepted it. */
  syncedAt: string;
  /** "sandbox" for a Test-mode entry (Phase 10). Absent means production, so
   *  documents recorded before Test mode existed count as real. */
  environment?: QuickBooksEnvironment;
}

type DocsByScope = Record<string, SyncedDocument[]>;

const EMPTY_DOCS: SyncedDocument[] = Object.freeze(
  [],
) as unknown as SyncedDocument[];
const EMPTY_MAP: DocsByScope = Object.freeze({});

let state: DocsByScope = EMPTY_MAP;
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
    if (raw) state = JSON.parse(raw) as DocsByScope;
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

function commit(next: DocsByScope) {
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

export function getSyncedDocuments(scope: QuickBooksScope): SyncedDocument[] {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_DOCS;
}

export function useSyncedDocuments(scope: QuickBooksScope): SyncedDocument[] {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_DOCS,
    () => EMPTY_DOCS,
  );
}

/**
 * Record a document QuickBooks accepted.
 *
 * Keyed by transaction + document type, so replaying a sync can't record the
 * same posting twice — the same guarantee the queue's idempotency key gives,
 * enforced again here because this is the ledger the money figures come from.
 */
export function recordSyncedDocument(
  scope: QuickBooksScope,
  doc: Omit<SyncedDocument, "id">,
): SyncedDocument {
  ensureReady();
  const key = scopeKey(scope);
  const docs = state[key] ?? EMPTY_DOCS;
  const id = `${doc.transactionId}:${doc.documentType}`;

  const existing = docs.find((d) => d.id === id);
  if (existing) return existing;

  const record: SyncedDocument = { ...doc, id };
  commit({ ...state, [key]: [...docs, record] });
  return record;
}

export function clearSyncedDocuments(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}
