"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { liveWrite } from "@/lib/api/live-fetch";
import { withFormOverride } from "@/lib/forms/override-prompt";
import type { RequestAction } from "@/lib/bookings/request-decision";

/** What the decision route answers. */
export interface RequestDecision {
  status: "confirmed" | "declined" | "waitlisted";
  /** Every booking the request made — each day of it. */
  refs: number[];
  /** Whether the facility's own message for this decision went out. */
  messaged: "sent" | "queued" | "not_sent";
}

/**
 * Approve, decline or waitlist a customer's request — every day of it at once
 * (POST /api/bookings/[ref]/decision). `atQuote` approves at the price the
 * customer's form quoted. A request missing a form the facility requires
 * before approval asks staff why, and is sent once more with the reason.
 */
export function useDecideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      /** Any booking of the request; the server finds the rest. */
      ref: number;
      action: RequestAction;
      atQuote?: boolean;
    }) =>
      withFormOverride((formOverrideReason) =>
        liveWrite<RequestDecision>(
          `/api/bookings/${input.ref}/decision`,
          "POST",
          {
            action: input.action,
            atQuote: input.atQuote ?? false,
            ...(formOverrideReason ? { formOverrideReason } : {}),
          },
        ),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
