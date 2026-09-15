"use client";

import { toast } from "sonner";

import { estimateToBody, useEstimateMutations } from "@/lib/api/estimates";
import type {
  DeliveryReason,
  EstimateDelivery,
} from "@/lib/estimates/estimate-message";
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
// "Send" opens the estimate to the customer, EMAILS it to the address on file
// (lib/estimates/deliver-estimate.ts) and copies the link. The toast says
// which of those happened: "emailed to …" only when the email service took
// it, and otherwise why not — a claimed email that never left is the failure
// this redesign exists to remove.
// ============================================================================

export function customerEstimateLink(
  estimate: Pick<Estimate, "estimateToken">,
) {
  return `${window.location.origin}/customer/estimates/${estimate.estimateToken}`;
}

/** What the send route returns beyond the estimate. */
export type SentEstimate = Estimate & {
  delivery?: EstimateDelivery[];
  guestClient?: { created: boolean } | { reason: string };
};

const REASON_KEY: Record<DeliveryReason, string> = {
  no_address: "reasonNoAddress",
  invalid_address: "reasonInvalidAddress",
  opted_out: "reasonOptedOut",
  not_configured: "reasonNotConfigured",
  failed: "reasonFailed",
};

/** The toast for a send, from what the route says actually happened. */
export function sendToast(
  text: {
    t: (key: string) => string;
    fill: (key: string, values: Record<string, string | number>) => string;
  },
  sent: SentEstimate,
  copied: boolean,
): { title: string; description: string } {
  const { t, fill } = text;
  const email = sent.delivery?.find((d) => d.channel === "email");
  const attached =
    sent.guestClient &&
    "created" in sent.guestClient &&
    sent.guestClient.created
      ? fill("clientAttached", { name: sent.clientName || t("theCustomer") })
      : null;
  if (email?.sent && email.to) {
    return {
      title: fill("emailedToast", { number: sent.estimateId, email: email.to }),
      description: [attached, t(copied ? "emailedCopied" : "emailedNotCopied")]
        .filter(Boolean)
        .join(" "),
    };
  }
  return {
    title: fill("sentToast", { number: sent.estimateId }),
    description: [
      email
        ? fill("notEmailed", {
            reason: t(REASON_KEY[email.reason ?? "failed"]),
          })
        : null,
      attached,
      t(copied ? "sentCopied" : "sentNotCopied"),
    ]
      .filter(Boolean)
      .join(" "),
  };
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

    /** Open it to the customer, email it, and copy its link. */
    send: async () => {
      try {
        const sent = (await act.mutateAsync({
          id: estimate.id,
          patch: { action: "send", via: "email" },
        })) as SentEstimate;
        const copied = await copyLink();
        const message = sendToast({ t, fill }, sent, copied);
        toast.success(message.title, { description: message.description });
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
