"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { bookingMutations } from "./booking";
import type { Booking } from "@/types/booking";

// ============================================================================
// Moving a booking through its statuses.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Every status control on the booking detail page fired a toast and nothing
// else. Three of them:
//
//   onCheckIn        toast.success("Booking checked in — service in progress")
//   onStatusChange   toast.success(`${ref} status changed to ${newStatus}`)
//   autoTransition   toast.success(`Status auto-updated to ${label}`)
//
// No mutation, no request, no state change. The page reported the transition,
// the row never moved, and a reload put the booking back where it started.
//
// The consequence was not cosmetic. `BookingDetailActionBar` picks its primary
// action FROM the status — Check In at `confirmed`, Proceed to Checkout at
// `checked_in` — so a status that could not advance meant the checkout button
// never appeared. Taking payment on a terminal was unreachable through the UI
// for any confirmed booking, and the only way to reach it was to edit the row
// by hand.
//
// `autoTransition` was the most convincing of the three: it read the facility's
// configured rules, resolved a target status, and announced "Status
// auto-updated to Checked In (default rule)". Everything about that sentence
// was true except the updating.
//
// ── WHY THE STATUS IS NOT SET OPTIMISTICALLY ──────────────────────────────
//
// The status decides which actions the page offers, and the server may refuse
// the write — `bookings_update` is gated on a permission, and an RLS refusal
// affects zero rows rather than raising. Showing the new status before the
// server has agreed would put the page back in exactly the state this file
// exists to fix: a booking that looks checked in and is not.
// ============================================================================

/**
 * Set a booking's status.
 *
 * @returns a mutation whose `mutateAsync` resolves once the server has stored
 *   it. Callers should await it and report failure — the PATCH route answers
 *   403 for an RLS refusal rather than pretending, so there is something real
 *   to show.
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      /** The booking's numeric ref. */
      id: number;
      status: Booking["status"];
    }) => bookingMutations.update(input.id, { status: input.status }),

    onSuccess: () => {
      // Bookings AND clients: a client's outstanding balance and its "next
      // visit" both move with a booking's status, and a stale client page is
      // how staff end up chasing a booking that has already been checked in.
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
