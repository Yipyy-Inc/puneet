"use client";

import {
  CircleCheck,
  CircleDashed,
  CircleMinus,
  Clock3,
  DoorOpen,
  Send,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { CheckedIn } from "@/components/icons/yipyy-icons";
import { Badge } from "@/components/ui/badge";
import type {
  YipyyGoArrival,
  YipyyGoBookingStatus,
} from "@/lib/api/mappers/yipyy-go";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// What the desk reads about an arrival at a glance (§3): where its pre-arrival
// form stands, and whether the dog is here. Each is a glyph, a word and an
// ink, never the colour alone.
//
// A form nobody has started is a problem only where the facility requires
// it. Being on site is orange’s own territory (§2b): a solid fill under body
// ink.
// ============================================================================

type ChipVariant =
  | "confirmed"
  | "checkedIn"
  | "pending"
  | "overdue"
  | "cancelled";

const FORM: Record<
  YipyyGoBookingStatus,
  { variant: ChipVariant; icon: LucideIcon; key: string }
> = {
  not_required: {
    variant: "cancelled",
    icon: CircleMinus,
    key: "formNotRequired",
  },
  not_started: {
    variant: "overdue",
    icon: CircleDashed,
    key: "formNotStarted",
  },
  in_progress: { variant: "pending", icon: Clock3, key: "formInProgress" },
  changes_requested: {
    variant: "pending",
    icon: TriangleAlert,
    key: "formChangesRequested",
  },
  submitted: { variant: "checkedIn", icon: Send, key: "formSubmitted" },
  approved: { variant: "confirmed", icon: CircleCheck, key: "formApproved" },
};

export function FormStatusChip({
  status,
  mandatory,
}: {
  status: YipyyGoBookingStatus;
  mandatory: boolean;
}) {
  const { t } = useStaffText("kiosk");
  const chip = FORM[status];
  const Icon = chip.icon;
  const variant =
    !mandatory && chip.variant === "overdue" ? "cancelled" : chip.variant;
  return (
    <Badge variant={variant}>
      <Icon aria-hidden />
      {t(chip.key)}
    </Badge>
  );
}

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
