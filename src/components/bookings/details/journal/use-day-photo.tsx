"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  createReportCard,
  reportCardQueries,
  uploadReportCardPhoto,
} from "@/lib/api/report-cards";
import type { ReportCardService } from "@/types/report-card";

import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// "+ Add photo" and "Send report card", for one day of the journal.
//
// A photo taken during a stay is for the owner, and what reaches the owner is
// the day's report card. So "+ Add photo" puts it on that card — the day's
// draft, made empty if there is none yet — and "Send report card" opens that
// draft in the report cards module, or the module's Create on this visit when
// nothing has been started.
// ============================================================================

const ROUTE: Record<ReportCardService, string> = {
  boarding: "boarding",
  daycare: "daycare",
  grooming: "grooming",
  training: "training",
};

export function useDayPhoto(d: BookingDetails, day: string) {
  const queryClient = useQueryClient();
  const { t, fill } = d.text;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const petRef = d.pet?.id ?? 0;
  const service = (
    ["boarding", "daycare", "grooming", "training"].includes(d.kind)
      ? d.kind
      : "daycare"
  ) as ReportCardService;
  const cards = useQuery({
    ...reportCardQueries.byPet(petRef),
    enabled: petRef > 0,
  });
  const draft = (cards.data ?? []).find(
    (card) =>
      card.visitDate === day &&
      card.serviceType === service &&
      card.deliveryStatus !== "sent",
  );

  const add = async (file: File | undefined) => {
    if (!file || !d.booking || petRef <= 0) return;
    setBusy(true);
    try {
      const card =
        draft ??
        (await createReportCard({
          petRef,
          bookingRef: d.booking.id,
          serviceType: service,
          visitDate: day,
          input: {},
          generated: {
            todaysVibe: "",
            friendsAndFun: "",
            careMetrics: "",
            closingNote: "",
          },
          deliveryStatus: "pending",
        }));
      await uploadReportCardPhoto(card.id, file, { kind: "moment" });
      await queryClient.invalidateQueries({ queryKey: ["report-cards"] });
      toast.success(fill("photoOnReportCard", { pet: d.petName }));
    } catch (error) {
      toast.error(t("photoNotAdded"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const base = d.portal.href(
    `/facility/dashboard/services/${ROUTE[service]}/report-cards`,
  );
  return {
    busy,
    pick: () => input.current?.click(),
    reportCardHref: draft
      ? `${base}?card=${encodeURIComponent(draft.id)}`
      : `${base}?visit=${d.booking?.id ?? ""}`,
    input: (
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/heic"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void add(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    ),
  };
}
