"use client";

import { useMemo } from "react";
import { Bed } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useBoardingMenu } from "@/lib/api/boarding-catalogue";
import { useLocationContext } from "@/hooks/use-location-context";
import {
  eligibleBoardingServices,
  type BoardingPetFacts,
} from "@/lib/pricing/boarding-service-choice";

// ============================================================================
// WHICH BOARDING SERVICE. The thing that could not be chosen because it did
// not exist.
//
// Until Phase 5, `room_categories` was the kennel class AND the nightly rate:
// the Rooms page and the Rates page were two editors over one table, so the
// menu WAS the building. A facility could not offer two priced services in one
// kennel class, nor one service across two. This is the picker for the menu
// that now exists beside the building.
//
// It is filtered to the pet in front of you and the branch you are standing
// in. What a pet is NOT eligible for is left off rather than shown disabled —
// a greyed row invites "why not?", and the honest answer lives on the
// service's own setup screen, not in a tooltip at the till.
//
// ── A CUSTOMER READS A DIFFERENT ROUTE, AND THAT IS THE POINT ─────────────
//
// `asCustomer` is drilled rather than sniffed from a context. Which facility a
// menu belongs to, and which of its columns the reader may see, is exactly the
// question this codebase keeps losing time to — three services shipped the
// same defect before boarding, so the call site states it. The customer's
// route answers for ONE facility and hands back a projection; the staff route
// answers for the facility they are standing in and hands back the row.
//
// ── NOTHING CHOSEN IS A VALID ANSWER, AND IT IS THE OLD BEHAVIOUR ─────────
//
// Unlike daycare's picker, an empty menu here is NOT a refusal. Every boarding
// booking made before this commit was priced by its kennel class, and that
// path is still live and still correct: a facility that has authored no
// boarding service keeps charging exactly what it charged yesterday. So an
// empty menu renders nothing at all rather than a warning about a menu the
// facility has never been asked to write.
// ============================================================================

export function BoardingServicePicker({
  value,
  onChange,
  pet,
  petRefs,
  asCustomer = false,
}: {
  /** The chosen service's row id, or null. */
  value: string | null;
  onChange: (
    service: {
      rowId: string;
      name: string;
      price: number;
      unit: "night" | "day";
      lodgingTypeIds: string[];
    } | null,
  ) => void;
  pet: BoardingPetFacts;
  /** The pets chosen, by ref. Sent so the server can apply the tag rules. */
  petRefs?: readonly number[];
  /** True when a pet owner is booking for themselves. */
  asCustomer?: boolean;
}) {
  const { t, locale } = useStaffText("boardingServices");
  // The branch is read here rather than drilled: the price a service costs
  // depends on it, and three layers of prop is three places to forget it.
  const { currentLocation } = useLocationContext();
  const locationId = currentLocation?.id ?? null;
  const { data: services, isPending } = useBoardingMenu({
    asCustomer,
    locationId,
    petRefs,
  });

  const offered = useMemo(
    // No lodging type is passed: the service is chosen BEFORE the kennel, so
    // at this moment nothing has been assigned that could contradict it. The
    // filtering runs the other way round — the kennel list narrows to what the
    // chosen service may be booked into.
    () => eligibleBoardingServices(services ?? [], pet, { locationId }),
    [services, pet, locationId],
  );

  const money = (amount: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);

  if (isPending) return null;
  // See the header: a facility with no menu is on the pre-cutover path, which
  // is not an error state and must not be dressed as one.
  if (offered.length === 0) return null;

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
                        unit: service.unit,
                        lodgingTypeIds: service.lodgingTypeIds,
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
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-bold tabular-nums">
                    {money(service.price)}
                  </span>
                  {/* The unit is half of the price. MoéGo: "Monday to
                      Wednesday is 2 nights or 3 days", and which one a
                      facility charges is theirs to say — so it is never
                      implied, it is written beside the number. */}
                  <span className="text-muted-foreground block text-[12px] font-bold tracking-[.06em] uppercase">
                    {service.unit === "day" ? t("perDay") : t("perNight")}
                  </span>
                </span>
              </span>
              {service.lodgingTypeIds.length > 0 ? (
                <Badge variant="outline" className="mt-2 gap-1">
                  <Bed className="size-3" aria-hidden />
                  {t("limitedLodging")}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
