"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useSetSessionProgress } from "@/lib/api/grooming-appointments";
import { formatDuration, formatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

import {
  DetailsCard,
  DetailsCardHeader,
  DetailsCardNote,
} from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { GroomingAppointment } from "@/types/grooming";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// A groom's services, as the mock draws them: the groom and each add-on, a
// box to tick as each is done, its price, and "N of M done · time" above.
//
// The ticks live in the appointment's own checklist
// (`grooming_appointments.session_progress`) as "service:…" steps, beside the
// groomer's own steps (Bath, Haircut…), which this card keeps when it writes.
// ============================================================================

type Step = { step: string; done: boolean; at?: string };

export function GroomServicesCard({
  d,
  facts,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
}) {
  const { t, fill, locale } = d.text;
  const save = useSetSessionProgress();
  const queryClient = useQueryClient();
  const groom = facts.grooming;
  const [optimistic, setOptimistic] = useState<Step[] | null>(null);
  if (!d.booking) return null;

  const progress: Step[] = optimistic ?? groom?.groomingProgress ?? [];
  const addOns = d.lineItems.filter((line) => line.kind === "add_on");
  const services = [
    {
      key: "service:main",
      name: groom?.packageName || d.booking.serviceType || d.serviceLabel,
      sub: [
        groom?.stylistName,
        groom?.serviceDurationMin
          ? formatDuration(groom.serviceDurationMin, locale)
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      price: groom?.basePrice ?? d.booking.basePrice,
    },
    ...addOns.map((line) => ({
      key: `service:${line.id}`,
      name: line.name,
      sub: [
        t("addOn"),
        line.durationMin ? formatDuration(line.durationMin, locale) : null,
        line.staffName,
      ]
        .filter(Boolean)
        .join(" · "),
      price: line.price,
    })),
  ];
  const isDone = (key: string) =>
    progress.some((p) => p.step === key && p.done);
  const doneCount = services.filter((s) => isDone(s.key)).length;
  const minutes =
    (groom?.serviceDurationMin ?? 0) +
    addOns.reduce((sum, l) => sum + (l.durationMin ?? 0) * l.quantity, 0);

  const toggle = (key: string) => {
    if (!groom) return;
    const done = !isDone(key);
    const next: Step[] = [
      ...progress.filter((p) => p.step !== key),
      { step: key, done, ...(done ? { at: new Date().toISOString() } : {}) },
    ];
    setOptimistic(next);
    save.mutate(
      { id: groom.id, sessionProgress: next },
      {
        // The saved list goes straight into the appointment this page read,
        // so the tick does not flash back while the boards refetch.
        onSuccess: () => {
          queryClient.setQueryData<GroomingAppointment | null>(
            ["grooming", "appointments", "booking", d.booking?.id ?? 0],
            (old) => (old ? { ...old, groomingProgress: next } : old),
          );
          setOptimistic(null);
        },
        onError: (error) => {
          setOptimistic(null);
          toast.error(t("checklistNotSaved"), { description: error.message });
        },
      },
    );
  };

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardServices")}>
        <DetailsCardNote>
          {[
            fill("servicesDone", { done: doneCount, total: services.length }),
            minutes > 0 ? formatDuration(minutes, locale) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </DetailsCardNote>
      </DetailsCardHeader>
      <ul className="flex flex-col px-5 pt-1.5 pb-3.5">
        {services.map((service) => {
          const done = isDone(service.key);
          return (
            <li
              key={service.key}
              className="border-line-soft flex items-center justify-between gap-3 border-b py-3"
            >
              <span className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={fill(done ? "markNotDone" : "markServiceDone", {
                    name: service.name,
                  })}
                  disabled={!groom || save.isPending}
                  onClick={() => toggle(service.key)}
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-[8px] text-[13px] font-bold text-white",
                    done
                      ? "bg-success"
                      : "bg-card border-[1.5px] border-(--check-off)",
                  )}
                >
                  {done ? "✓" : ""}
                </button>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] font-medium">
                    {service.name}
                  </span>
                  {service.sub ? (
                    <span className="text-ink-tertiary text-[12px]">
                      {service.sub}
                    </span>
                  ) : null}
                </span>
              </span>
              {d.permissions.canSeeBookingAmounts ? (
                <span className="text-[14px] font-semibold tabular-nums">
                  {formatMoney(service.price, locale)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </DetailsCard>
  );
}
