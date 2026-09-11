"use client";

import { toast } from "sonner";

import { estimateToBody, useEstimateMutations } from "@/lib/api/estimates";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Estimate } from "@/types/booking";

// ============================================================================
// What staff can do to an estimate, for the card and the detail drawer.
//
// Both used to take optional callbacks — `onSend`, `onDecline`, `onDuplicate`
// — that the list page passed as empty functions ("Mock seams"), and then
// toasted success regardless: "Estimate sent to customer" with nothing sent,
// "Estimate duplicated" with nothing created. Every action here is a write,
// and every toast states what the write did.
//
// "Send" sends NO message. It opens the estimate to the customer and copies
// the link for staff to share, and says exactly that — an email claimed but
// never sent is the failure this whole redesign exists to remove.
// ============================================================================

export function customerEstimateLink(
  estimate: Pick<Estimate, "estimateToken">,
) {
  return `${window.location.origin}/customer/estimates/${estimate.estimateToken}`;
}

export function useEstimateActions(estimate: Estimate) {
  const { t, fill } = useStaffText("estimateActions");
  const { create, act, remove } = useEstimateMutations();
  const busy = create.isPending || act.isPending || remove.isPending;
  const number = estimate.estimateId;

  const fail = (key: string) => (error: unknown) =>
    toast.error(t(key), {
      description: error instanceof Error ? error.message : undefined,
    });

  const copyLink = async (): Promise<boolean> => {
    if (!estimate.estimateToken) return false;
    try {
      await navigator.clipboard.writeText(customerEstimateLink(estimate));
      return true;
    } catch {
      return false;
    }
  };

  return {
    busy,

    /** Open it to the customer (or re-open it with a fresh expiry). */
    send: async () => {
      try {
        await act.mutateAsync({
          id: estimate.id,
          patch: { action: "send", via: "link" },
        });
        const copied = await copyLink();
        toast.success(fill("sentToast", { number }), {
          description: t(copied ? "sentCopied" : "sentNotCopied"),
        });
      } catch (error) {
        fail("sendFailed")(error);
      }
    },

    copyLink: async () => {
      if (await copyLink()) toast.success(t("linkCopied"));
      else toast.error(t("linkNotCopied"));
    },

    acceptOnBehalf: async () => {
      try {
        await act.mutateAsync({
          id: estimate.id,
          patch: { action: "accept_on_behalf" },
        });
        toast.success(
          fill("acceptedToast", {
            number,
            client: estimate.clientName || t("theCustomer"),
          }),
        );
      } catch (error) {
        fail("acceptFailed")(error);
      }
    },

    decline: async (reason?: string) => {
      try {
        await act.mutateAsync({
          id: estimate.id,
          patch: { action: "decline", reason },
        });
        toast.success(fill("declinedToast", { number }));
      } catch (error) {
        fail("declineFailed")(error);
      }
    },

    duplicate: async () => {
      try {
        const copy = await create.mutateAsync({
          ...estimateToBody(estimate),
          send: false,
          duplicatedFrom: estimate.id,
        });
        toast.success(
          fill("duplicatedToast", { number, copy: copy.estimateId }),
        );
      } catch (error) {
        fail("duplicateFailed")(error);
      }
    },

    remove: async () => {
      try {
        await remove.mutateAsync(estimate.id);
        toast.success(fill("deletedToast", { number }));
      } catch (error) {
        fail("deleteFailed")(error);
      }
    },
  };
}
