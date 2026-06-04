"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { recordLoyaltyEvent } from "@/data/loyalty-engine";
import { customerNotificationsStore } from "@/data/customer-notifications";
import type { EngineResult, LoyaltyEventInput } from "@/lib/loyalty/engine";

/**
 * React entrypoint for the loyalty automation engine. Call `recordEvent` from a
 * completion flow (booking checkout, POS sale, payment) and it:
 *   1. runs the engine with the facility's live config (from useLoyaltyProgram),
 *   2. persists the new account state + transactions,
 *   3. pushes tier-upgrade / badge-unlock notifications into the customer bell,
 *   4. invalidates loyalty queries so member/account views refresh,
 *   5. shows a staff-facing summary toast.
 *
 * The facilityId defaults to the active loyalty facility; occurredAt defaults to
 * now in the commit layer, so callers only pass what the event is about.
 */
export function useLoyaltyEngine() {
  const { config, facilityId } = useLoyaltyProgram();
  const queryClient = useQueryClient();

  const recordEvent = useCallback(
    (
      input: Omit<LoyaltyEventInput, "facilityId"> & { facilityId?: number },
    ): EngineResult => {
      const result = recordLoyaltyEvent(
        { ...input, facilityId: input.facilityId ?? facilityId },
        config,
      );

      customerNotificationsStore.pushLoyaltyNotifications(result.notifications);
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      summarizeForStaff(result);

      return result;
    },
    [config, facilityId, queryClient],
  );

  return { recordEvent };
}

/** Staff-facing toast summarizing what the engine just did. Reuses the engine's
 *  notification titles for tier/badge messaging. No-op when nothing changed. */
function summarizeForStaff(result: EngineResult): void {
  const earnedPoints = result.transactions
    .filter((t) => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);
  const earnedCredit = result.transactions
    .filter((t) => t.points === 0 && (t.value ?? 0) > 0)
    .reduce((sum, t) => sum + (t.value ?? 0), 0);

  const parts: string[] = [];
  if (earnedPoints > 0) parts.push(`+${earnedPoints} pts`);
  if (earnedCredit > 0) parts.push(`+$${earnedCredit} credit`);
  if (result.discountApplied && result.discountApplied.amount > 0) {
    parts.push(`−$${result.discountApplied.amount.toFixed(2)} member discount`);
  }
  for (const note of result.notifications) parts.push(note.title);

  if (parts.length === 0) return;
  toast.success("Loyalty updated", { description: parts.join(" · ") });
}
