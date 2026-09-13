"use client";

import {
  CircleCheck,
  CircleDashed,
  CircleMinus,
  Clock3,
  Send,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { FormChipStatus } from "@/lib/yipyy-go/form-chip-status";

// ============================================================================
// Where a pre-arrival form stands, as the facility reads it (§3): a glyph, a
// word and an ink, never the colour alone. One chip for the bookings list, the
// booking page and the check-in desk, from the real booking — the old badge
// read a fixture store keyed by fixture ids, so every real booking showed
// “PreCheck Missing”.
//
// A form nobody has started is a problem only where the facility requires it.
// ============================================================================

// The status itself is pure, in lib, where a unit test reads it.
export { formChipStatusOf } from "@/lib/yipyy-go/form-chip-status";

type ChipVariant =
  | "confirmed"
  | "checkedIn"
  | "pending"
  | "overdue"
  | "cancelled";

const CHIPS: Record<
  FormChipStatus,
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
  completed_by_staff: {
    variant: "confirmed",
    icon: CircleCheck,
    key: "formCompletedByStaff",
  },
};

export function FormStatusChip({
  status,
  mandatory,
}: {
  status: FormChipStatus;
  mandatory: boolean;
}) {
  const { t } = useStaffText("yipyyGo");
  const chip = CHIPS[status];
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
