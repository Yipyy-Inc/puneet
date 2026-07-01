"use client";

import { useSyncExternalStore } from "react";

import { CURRENT_FACILITY } from "@/hooks/use-support-inbox";
import type {
  FacilityTicket,
  FacilityTicketStatus,
} from "@/types/facility-ticket";

// In-memory module store for the signed-in facility's support tickets. Backs the
// Support Center "Submit a Ticket" tab (submit → confirmation) and the
// /facility/support/tickets page. The seed is deterministic, so getServerSnapshot
// === getSnapshot and SSR agrees with the client's first render (no hydration
// flash). Newly submitted tickets persist for the session and appear instantly
// on the tickets page (same client navigation, no reload).

const D = "2026-06";

let state: FacilityTicket[] = [
  {
    id: "tkt-1041",
    number: "TKT-1041",
    facilityId: CURRENT_FACILITY.id,
    subject: "Can't export the client list to CSV",
    category: "Technical Issue",
    description:
      "The Export button on the Clients page spins but no file downloads.",
    status: "in_progress",
    createdAt: `${D}-25T09:10:00Z`,
  },
  {
    id: "tkt-1039",
    number: "TKT-1039",
    facilityId: CURRENT_FACILITY.id,
    subject: "Invoice shows a duplicate SMS charge",
    category: "Billing Question",
    description: "Our June invoice lists the SMS top-up twice.",
    status: "resolved",
    createdAt: `${D}-20T14:30:00Z`,
  },
];

// Next ticket number continues above the seeded ones.
let seq = 1041;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Create a ticket for the signed-in facility and return it (prepended, newest first). */
export function submitFacilityTicket(input: {
  subject: string;
  category: string;
  description: string;
  attachmentName?: string;
}): FacilityTicket {
  seq += 1;
  const ticket: FacilityTicket = {
    id: `tkt-${Date.now()}`,
    number: `TKT-${seq}`,
    facilityId: CURRENT_FACILITY.id,
    subject: input.subject.trim(),
    category: input.category,
    description: input.description.trim(),
    attachmentName: input.attachmentName,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  state = [ticket, ...state];
  emit();
  return ticket;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

/** The signed-in facility's tickets, newest first. */
export function useFacilityTickets(): FacilityTicket[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const FACILITY_TICKET_STATUS_META: Record<
  FacilityTicketStatus,
  { label: string; badge: string }
> = {
  open: {
    label: "Open",
    badge:
      "border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
  in_progress: {
    label: "In progress",
    badge:
      "border-sky-300/60 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  },
  resolved: {
    label: "Resolved",
    badge:
      "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  closed: {
    label: "Closed",
    badge:
      "border-slate-300/60 bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300",
  },
};
