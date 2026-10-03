"use client";

import { toast } from "sonner";

import { useMessageClient } from "@/lib/api/client";
import { useFacilityProfile } from "@/lib/api/facility-profile";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// "Pickup: Text parent when ready" (the grooming mock), made true.
//
// Nothing told an owner their dog was ready — the grooming route deliberately
// sends nothing on `ready`, and the panel's ETA "SMS" was a mailto link. So
// when a groom is marked ready the toast OFFERS the text, in one tap, through
// the one sender (`POST /api/clients/[ref]/message`, opt-outs respected). It
// is offered rather than sent: staff decide when the owner is told, and an
// owner who opted out of texts is told nothing, which the answer says.
// ============================================================================

export function useNotifyReady(d: BookingDetails) {
  const message = useMessageClient();
  // The text names who it is from; an SMS carries no other sender.
  const { profile } = useFacilityProfile();
  const { t, fill } = d.text;

  const send = async () => {
    if (!d.client) return;
    try {
      const result = await message.mutateAsync({
        clientRef: d.client.id,
        channel: "sms",
        body: fill("readyText", {
          pet: d.petName,
          facility: profile.businessName,
        }).trim(),
      });
      if (result.sent) {
        toast.success(fill("readyTextSent", { name: d.client.name }));
      } else {
        toast.warning(t("readyTextNotSent"), { description: result.detail });
      }
    } catch (error) {
      toast.error(t("readyTextNotSent"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return {
    /** After "Ready for pickup": the offer, on the success toast's heels. */
    offer: () => {
      if (d.kind !== "grooming" || !d.client?.phone?.trim()) return;
      toast(fill("readyTextOffer", { name: d.client.name }), {
        action: { label: t("readyTextSend"), onClick: () => void send() },
      });
    },
  };
}
