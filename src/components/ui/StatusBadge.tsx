import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleSlash,
  CircleX,
  Clock3,
  DoorOpen,
  Lock,
  Tags,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================================
// Status chips. docs/design-system/design-system.md §3, §5b1, §5r.
//
// ── WHAT CHANGED, AND WHY IT WAS A DEFECT AND NOT A PREFERENCE ────────────
//
// This rendered a 6px COLOURED DOT and a word, and nothing else: emerald for
// active, red for suspended, amber for pending. §3's own anatomy table says
// why that cannot ship — "Mandatory. Colour is never the only channel — 1 in
// 12 men cannot separate the green from the orange." A reader with the common
// form of colour blindness could not tell Confirmed from Cancelled anywhere in
// this product, across bookings, clients, staff, inventory, billing and the
// platform portal.
//
// Every value below now resolves to one of §3's SIX chips and carries a glyph.
//
// ── THE SIX, VERBATIM FROM §3 ─────────────────────────────────────────────
//
//   Confirmed   #0F7A52  5.35:1   paid, completed, active, vaccines current
//   Checked in  #0F58C6  6.50:1   in progress, on site, neutral notice
//   In service  #4C3BB8  8.00:1   plans, packages, programmes, timed work
//   Pending     #8A5115  6.43:1   needs attention, expiring, low stock
//   Overdue     #B23B3B  5.86:1   failed, unpaid, expired, blocking
//   Cancelled   #4C5B6C  6.95:1   inactive, dormant, refunded, offline
//
// White surface, a 1px hairline in the SAME ink as the label, full pill, 26px.
// The inks live in badge.tsx's six variants; this file decides which one a
// value belongs to and which glyph goes with it.
//
// ── GLYPHS ARE TRANSLATED, NOT PORTED ─────────────────────────────────────
//
// The reference page draws these in Material Symbols Rounded, which this app
// does not have and will not get: §5b1 says Tier 1 is lucide-react. So each
// glyph is the lucide name docs/design-system/icon-map.json already assigns to
// that MEANING — check_circle to circle-check, schedule to clock-3, cancel to
// circle-x, login to door-open, content_cut to circle-dot (the map's own
// in-service status glyph, rather than `scissors`, which means grooming
// specifically).
//
// ONE IS NOT IN THE MAP. Material `error` for Overdue has no lucide entry in
// §5b1's status list: `triangle-alert` there means Incidents (a nav area) and
// `circle-x` is already cancelled. `circle-alert` is used, which is the same
// glyph the reference page itself draws for a whole view that failed, and it
// collides with nothing. Flagged for the §5v gate rather than decided quietly.
// ============================================================================

type ChipVariant =
  | "confirmed"
  | "checkedIn"
  | "inService"
  | "pending"
  | "overdue"
  | "cancelled";

interface Chip {
  variant: ChipVariant;
  icon: LucideIcon;
  label: string;
}

/** Confirmed — paid, completed, active, vaccines current. */
const ok = (label: string): Chip => ({
  variant: "confirmed",
  icon: CircleCheck,
  label,
});

/** Checked in — in progress, on site, the one live state. */
const live = (label: string): Chip => ({
  variant: "checkedIn",
  icon: DoorOpen,
  label,
});

/** Pending — awaiting action, expiring soon, low stock. */
const soon = (label: string): Chip => ({
  variant: "pending",
  icon: Clock3,
  label,
});

/** Overdue — failed, unpaid, expired, blocking. */
const bad = (label: string): Chip => ({
  variant: "overdue",
  icon: CircleAlert,
  label,
});

/** Cancelled — inactive, dormant, refunded, offline. */
const off = (label: string): Chip => ({
  variant: "cancelled",
  icon: CircleX,
  label,
});

/** In service / Membership — plans, packages, programmes, timed work. */
const plan = (label: string, icon: LucideIcon = Tags): Chip => ({
  variant: "inService",
  icon,
  label,
});

// Sentence case throughout (§5r) — this table read "In Stock", "Read/Write"
// and "System Admin" in title case, which §3's anatomy calls out directly.
const CHIPS: Record<string, Chip> = {
  // ── positive ──
  active: ok("Active"),
  success: ok("Success"),
  completed: ok("Completed"),
  confirmed: ok("Confirmed"),
  paid: ok("Paid"),
  approved: ok("Approved"),
  in_stock: ok("In stock"),
  online: ok("Online"),
  available: ok("Available"),
  finished: ok("Finished"),

  // ── on site now — §3's one live state ──
  checked_in: live("Checked in"),
  checkedin: live("Checked in"),
  in_progress: live("In progress"),

  // ── awaiting action ──
  pending: soon("Pending"),
  invited: soon("Invited"),
  low_stock: soon("Low stock"),
  busy: soon("Busy"),
  request_submitted: soon("Requested"),
  waitlisted: soon("Waitlisted"),
  scheduled: soon("Scheduled"),

  // ── blocking ──
  suspended: bad("Suspended"),
  denied: bad("Denied"),
  failed: bad("Failed"),
  overdue: bad("Overdue"),
  unpaid: bad("Unpaid"),
  expired: bad("Expired"),

  // ── inactive. §3 puts refunded here rather than on a blue notice chip:
  //    nothing is wrong and nothing is happening. ──
  inactive: off("Inactive"),
  cancelled: off("Cancelled"),
  canceled: off("Cancelled"),
  offline: off("Offline"),
  out_of_stock: off("Out of stock"),
  refunded: off("Refunded"),
  no_show: {
    variant: "cancelled" as const,
    icon: CircleSlash,
    label: "No-show",
  },
  archived: off("Archived"),
  draft: off("Draft"),

  // ── severity words that mean the same thing whatever the column ──
  critical: bad("Critical"),
  high: bad("High"),

  // ── plans and packages — §3's violet chip, "plans, packages, programmes" ──
  free: plan("Free"),
  basic: plan("Basic"),
  premium: plan("Premium"),
  enterprise: plan("Enterprise"),
  trial: plan("Trial"),

  // ── roles ──
  system_administrator: plan("System admin", UserCheck),
  account_manager: plan("Account manager", UserCheck),
  sales_team: plan("Sales team", UserCheck),
  technical_support: plan("Technical support", UserCheck),
  financial_auditor: plan("Financial auditor", UserCheck),
  owner: plan("Owner", UserCheck),
  manager: plan("Manager", UserCheck),
  staff: plan("Staff", UserCheck),

  // ── access levels. `lock` is the glyph stage 3 introduced for a permission
  //    boundary; reused here so one meaning keeps one glyph. ──
  full: plan("Full access", Lock),
  read_write: plan("Read and write", Lock),
  read_only: plan("Read only", Lock),
  restricted: plan("Restricted", Lock),
};

/**
 * ── WHY `type` IS NOT DECORATION ──────────────────────────────────────────
 *
 * `low` is the one word in this vocabulary that means opposite things in two
 * columns: a LOW severity is good and green, a LOW stock level is a warning.
 * A single flat table would have to pick one and be wrong on the other screen,
 * so severity gets its own lookup and `type` is what selects it. Both `low`
 * and `medium` are deliberately absent from CHIPS above for that reason —
 * nothing else in the product uses either word bare.
 */
const SEVERITY_CHIPS: Record<string, Chip> = {
  critical: bad("Critical"),
  high: bad("High"),
  medium: soon("Medium"),
  low: ok("Low"),
};

/**
 * The fallback for a value this table has never seen. `circle-dot` is §5b1's
 * in-service glyph and violet is the categorical chip, so an unknown value
 * reads as a neutral category rather than borrowing success or failure — a
 * wrong GREEN is a far more expensive guess than a wrong violet.
 */
function unknownChip(value: string): Chip {
  const words = value.replace(/_/g, " ").trim();
  return {
    variant: "inService",
    icon: CircleDot,
    label: words.charAt(0).toUpperCase() + words.slice(1).toLowerCase(),
  };
}

export interface StatusBadgeProps {
  type:
    | "status"
    | "plan"
    | "role"
    | "inventory"
    | "adminRole"
    | "accessLevel"
    | "severity";
  value: string;
  /**
   * §3 ships two heights and no others: 26px compact, 32px full. `sm` and
   * `default` are both the compact chip — the old `sm` rendered 9px type,
   * below anything §1's scale carries.
   */
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function StatusBadge({
  type,
  value,
  size = "default",
  className,
}: StatusBadgeProps) {
  const key = value.toLowerCase();
  const chip =
    (type === "severity" ? SEVERITY_CHIPS[key] : undefined) ??
    CHIPS[key] ??
    unknownChip(value);
  const Icon = chip.icon;

  return (
    <Badge
      variant={chip.variant}
      className={cn(size === "lg" && "h-8 px-3", className)}
    >
      {/* Mandatory, and never announced: the word beside it already says the
          status, so a screen reader that read the glyph too would say it
          twice (§3, §5b1). */}
      <Icon aria-hidden />
      {chip.label}
    </Badge>
  );
}
