"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useDaycareMenu } from "@/lib/api/daycare-catalogue";
import { useLocationContext } from "@/hooks/use-location-context";
import {
  eligibleDaycareServices,
  type DaycarePetFacts,
} from "@/lib/pricing/daycare-service-choice";

// ============================================================================
// WHICH DAYCARE SERVICE. The thing nobody used to choose.
//
// Before 2026-09-23 the price came from `daycareRateForHours`: every active
// rate that covered the stay's hours, cheapest wins. The facility wrote a menu
// and the till ignored it, so a receipt could not say what had been sold.
//
// This is the menu, filtered to the pet in front of you and the branch you are
// standing in. What a pet is NOT eligible for is left off rather than shown
// disabled — a greyed row invites "why not?", and the honest answer lives on
// the service's own setup screen, not in a tooltip at the till.
//
// ── A CUSTOMER READS A DIFFERENT ROUTE, AND THAT IS THE POINT ─────────────
//
// `asCustomer` is drilled rather than sniffed from a context. Which facility
// a menu belongs to, and which of its columns the reader may see, is exactly
// the "fixture or Postgres, staff or customer?" question this codebase keeps
// losing time to — so the call site states it. The customer's route answers
// for ONE facility and hands back a projection; the staff route answers for
// the facility they are standing in and hands back the row. See
// `useDaycareMenu`.
//
// The pet-tag rules are applied SERVER-SIDE for a customer, because the tags
// themselves are the facility's own classification and are not sent. So the
// customer's menu arrives with empty tag arrays, `isPetEligible` finds
// nothing left to test, and the filtering below still runs — it simply agrees
// with what the server already decided.
// ============================================================================

export function DaycareServicePicker({
  value,
  onChange,
  pet,
  petRefs,
  asCustomer = false,
}: {
  /** The chosen service's row id, or null. */
  value: string | null;
  onChange: (
    service: { rowId: string; name: string; price: number } | null,
  ) => void;
  pet: DaycarePetFacts;
  /** The pets chosen, by ref. Sent so the server can apply the tag rules. */
  petRefs?: readonly number[];
  /** True when a pet owner is booking for themselves. */
  asCustomer?: boolean;
}) {
  const { t, locale } = useStaffText("daycareServices");
  // The branch is read here rather than drilled: the price a service costs
  // depends on it, and three layers of prop is three places to forget it.
  const { currentLocation } = useLocationContext();
  const locationId = currentLocation?.id ?? null;
  const { data: services, isPending } = useDaycareMenu({
    asCustomer,
    locationId,
    petRefs,
  });

  const offered = useMemo(
    () => eligibleDaycareServices(services ?? [], pet, locationId),
    [services, pet, locationId],
  );

  const money = (value: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);

  if (isPending) return null;

  if (offered.length === 0) {
    // NOT a silent zero. A facility with nothing this pet may book has to be
    // told so, because the alternative is a booking priced at nothing.
    return (
      <div className="bg-card rounded-2xl border border-[var(--line)] p-4">
        <p className="text-[14.5px] font-semibold">{t("noServiceForPet")}</p>
        <p className="text-muted-foreground text-[13.5px]">
          {t("noServiceForPetHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold">{t("whichService")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {offered.map((service) => {
          const chosen = service.rowId === value;
          return (
            <button
              key={service.rowId}
              type="button"
              onClick={() =>
                onChange(
                  chosen
                    ? null
                    : {
                        rowId: service.rowId,
                        name: service.name,
                        price: service.price,
                      },
                )
              }
              aria-pressed={chosen}
              // A 2px ring, not an edge accent and not a tint fill (§6 1 & 2).
              className={cn(
                "bg-card min-h-10 rounded-2xl border p-4 text-left max-lg:min-h-12",
                "transition-[box-shadow,border-color] duration-150",
                chosen
                  ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary)]"
                  : "border-[var(--line)] hover:border-[var(--line-strong)]",
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">
                    {service.name}
                  </span>
                  {service.description ? (
                    <span className="text-muted-foreground line-clamp-2 block text-[13.5px]">
                      {service.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[15px] font-bold tabular-nums">
                  {money(service.price)}
                </span>
              </span>
              {service.maxDurationHours != null ? (
                <Badge variant="outline" className="mt-2 gap-1">
                  <Clock className="size-3" aria-hidden />
                  {t("upToHours").replace(
                    "{n}",
                    String(service.maxDurationHours),
                  )}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
