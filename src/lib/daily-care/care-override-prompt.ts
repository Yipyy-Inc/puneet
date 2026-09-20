"use client";

import { useSyncExternalStore } from "react";

import { LiveWriteError } from "@/lib/api/live-fetch";
import {
  CARE_OVERRIDE_REASON_REQUIRED,
  type PendingCareItem,
} from "@/lib/care-completion";

// ============================================================================
// Asking staff why a pet goes home with today's care unlogged.
//
// The same shape as `src/lib/forms/override-prompt.ts`, and deliberately so:
// a write the server refuses with `care_override_reason_required` is retried
// once with the reason staff give, and the question is asked by a host mounted
// at the root. The kennel board, the daily care board, the calendar and the
// booking page therefore share one dialog instead of each building its own —
// which is how this gate came to exist on exactly one screen in the first
// place.
//
// The reason is not decoration. `record_care_gate_override` keeps it
// append-only against the booking, so a stay that left with three unlogged
// doses says who decided that and why.
// ============================================================================

export interface CareRefusal {
  code: string;
  message: string;
  pending: PendingCareItem[];
  hasCritical: boolean;
}

interface Pending {
  refusal: CareRefusal;
  resolve: (reason: string | null) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isPendingItem(value: unknown): value is PendingCareItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingCareItem>;
  return typeof item.kind === "string" && typeof item.label === "string";
}

/** The care refusal inside a failed write, or null when it is anything else. */
export function careRefusalOf(error: unknown): CareRefusal | null {
  if (!(error instanceof LiveWriteError)) return null;
  if (error.code !== CARE_OVERRIDE_REASON_REQUIRED) return null;
  const items = Array.isArray(error.body?.pending)
    ? error.body.pending.filter(isPendingItem)
    : [];
  return {
    code: error.code,
    message: error.message,
    pending: items,
    hasCritical: Boolean(error.body?.hasCritical),
  };
}

/** Ask for a reason. Resolves with it, or null when staff go back instead. */
export function askCareOverrideReason(
  refusal: CareRefusal,
): Promise<string | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { refusal, resolve };
    emit();
  });
}

/** Answer the question being asked. For the dialog host. */
export function settleCareOverride(reason: string | null) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(reason);
}

/** The question being asked, or null. For the dialog host. */
export function usePendingCareOverride(): CareRefusal | null {
  return useSyncExternalStore(
    subscribe,
    () => pending?.refusal ?? null,
    () => null,
  );
}

/**
 * Send a check-out; if the server asks why it goes ahead with today's care
 * unlogged, ask staff and send it once more with their reason.
 *
 * Going back instead rethrows the original refusal, so the caller shows the
 * server's own sentence and nothing is written — the pet stays checked in,
 * which is the truthful outcome of deciding not to answer.
 */
export async function withCareOverride<T>(
  send: (careOverrideReason?: string) => Promise<T>,
): Promise<T> {
  try {
    return await send();
  } catch (error) {
    const refusal = careRefusalOf(error);
    if (!refusal) throw error;
    const reason = await askCareOverrideReason(refusal);
    if (!reason) throw error;
    return await send(reason);
  }
}
