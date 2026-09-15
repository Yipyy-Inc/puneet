"use client";

import { useSyncExternalStore } from "react";

import {
  FORM_OVERRIDE_REASON_REQUIRED,
  formRefusalOf,
  type FormRefusal,
} from "@/lib/forms/requirements";

// ============================================================================
// Asking staff why they go ahead without a required form.
//
// A write that the server refuses with `form_override_reason_required` is
// retried once with the reason staff give. The question is asked by
// FormOverrideDialogHost, mounted once at the root, so a hook can ask it: the
// booking form, every check-in button and the approval of a request all wait
// on the same dialog instead of each screen building its own.
// ============================================================================

interface Pending {
  refusal: FormRefusal;
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

/** Ask for a reason. Resolves with it, or null when staff go back instead. */
export function askFormOverrideReason(
  refusal: FormRefusal,
): Promise<string | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { refusal, resolve };
    emit();
  });
}

/** Answer the question being asked. For the dialog host. */
export function settleFormOverride(reason: string | null) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(reason);
}

/** The question being asked, or null. For the dialog host. */
export function usePendingFormOverride(): FormRefusal | null {
  return useSyncExternalStore(
    subscribe,
    () => pending?.refusal ?? null,
    () => null,
  );
}

/**
 * Send a write; if the server asks why it goes ahead without a required form,
 * ask staff and send it once more with their reason.
 *
 * Going back instead rethrows the original refusal, so the caller shows the
 * server's own sentence and nothing is written.
 */
export async function withFormOverride<T>(
  send: (formOverrideReason?: string) => Promise<T>,
): Promise<T> {
  try {
    return await send();
  } catch (error) {
    const refusal = formRefusalOf(error);
    if (refusal?.code !== FORM_OVERRIDE_REASON_REQUIRED) throw error;
    const reason = await askFormOverrideReason(refusal);
    if (!reason) throw error;
    return await send(reason);
  }
}
