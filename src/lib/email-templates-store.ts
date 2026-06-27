"use client";

import { useSyncExternalStore } from "react";

import { emailTemplates } from "@/data/email-templates";
import type { EmailTemplate } from "@/types/email-templates";

// Editable layer over the shared email-template seed. Admin edits live here so
// the page can save without mutating the source array (automated senders like
// dunning still read the seed). The seed is static — no clock — so it
// initializes eagerly and the same snapshot is safe on server and client.

let state: EmailTemplate[] = emailTemplates.map((t) => ({ ...t }));
const listeners = new Set<() => void>();

function commit(next: EmailTemplate[]) {
  state = next;
  listeners.forEach((l) => l());
}

/** Save subject/body edits for a template (stamps updatedAt). */
export function updateEmailTemplate(
  id: string,
  patch: { subject: string; body: string },
) {
  commit(
    state.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
    ),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): EmailTemplate[] {
  return state;
}

export function useEmailTemplates(): EmailTemplate[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
