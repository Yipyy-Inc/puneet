"use client";

import { Clock3, DoorOpen } from "lucide-react";

import { CheckedIn } from "@/components/icons/yipyy-icons";
import { Badge } from "@/components/ui/badge";
import type { YipyyGoArrival } from "@/lib/api/mappers/yipyy-go";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Whether the dog is here, as the desk reads it at a glance (§3): a glyph, a
// word and an ink, never the colour alone. Being on site is orange’s own
// territory (§2b): a solid fill under body ink.
//
// Where a pre-arrival form stands is the shared chip in
// components/yipyygo/form-status-chip — the one the bookings list and the
// booking page read too.
// ============================================================================

export function PresenceChip({
  presence,
}: {
  presence: YipyyGoArrival["presence"];
}) {
  const { t } = useStaffText("kiosk");
  if (presence === "unknown") return null;
  if (presence === "on-site") {
    return (
      <Badge variant="cancelled" className="bg-brand-orange text-body-ink">
        <CheckedIn aria-hidden />
        {t("presenceOnSite")}
      </Badge>
    );
  }
  const departed = presence === "departed";
  const Icon = departed ? DoorOpen : Clock3;
  return (
    <Badge variant="cancelled">
      <Icon aria-hidden />
      {t(departed ? "presenceDeparted" : "presenceExpected")}
    </Badge>
  );
}
