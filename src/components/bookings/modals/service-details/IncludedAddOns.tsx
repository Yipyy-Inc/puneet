"use client";

import { useServiceAddOns } from "@/lib/api/facility-settings";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { ExtraService } from "@/types/booking";
import type { Pet } from "@/types/pet";

// ============================================================================
// WHAT THE CHOSEN BOARDING SERVICE ADDS BY ITSELF.
//
// A service's default add-ons are attached by the length of the stay — a
// daily walk on every day, a bath on the last one — and billed as their own
// lines. They were a table nothing read; now they are priced, and a price the
// customer cannot see being built is a price they will query. So they are
// listed here, before the add-ons a customer may choose, with what each costs.
//
// Read-only, because they are the facility's: a customer who wants an extra
// walk adds one below, and staff adjust a booking's lines where they always
// have. The lines come from the booking form's own computation, passed in, so
// this cannot count the days differently from the total it explains.
// ============================================================================

export function IncludedAddOns({
  lines,
  serviceName,
  pets,
}: {
  lines: readonly ExtraService[];
  serviceName: string;
  pets: readonly Pet[];
}) {
  const { t, fill, locale } = useStaffText("boardingServices");
  const { addOns } = useServiceAddOns();

  if (lines.length === 0) return null;

  return (
    <section className="bg-card space-y-3 rounded-2xl border border-(--line) p-4">
      <p className="text-[15px] font-semibold">
        {fill("includedTitle", { service: serviceName })}
      </p>
      <ul className="space-y-2">
        {lines.map((line) => {
          const addOn = addOns.find((a) => a.id === line.serviceId);
          if (!addOn) return null;
          // A pet's name is never put through the locale layer (§5q), and it
          // is only said when there is more than one to tell apart.
          const pet =
            pets.length > 1
              ? pets.find((p) => p.id === line.petId)?.name
              : undefined;
          return (
            <li
              key={`${line.serviceId}-${line.petId}`}
              className="flex items-baseline justify-between gap-3 text-[14.5px]"
            >
              <span className="min-w-0">
                {fill("includedLine", {
                  name: addOn.name,
                  quantity: line.quantity,
                })}
                {pet ? (
                  <span className="text-muted-foreground"> · {pet}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(Math.max(0, addOn.price) * line.quantity, locale)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-[13px]">{t("includedHelp")}</p>
    </section>
  );
}
