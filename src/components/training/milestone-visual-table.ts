/**
 * The per-milestone ICON AND COLOUR table, and nothing else.
 *
 * ── WHY THIS IS ITS OWN MODULE ───────────────────────────────────────────
 *
 * It used to live in `milestone-visuals.tsx`, beside `MilestoneCard` and
 * `MilestoneTrophyShelf` — two components the CUSTOMER portal renders. The
 * training SETTINGS screen imports only this table, but `check:ui-french`
 * walks a settings section three imports deep and attributes every string it
 * finds to that section. So the trophy shelf's copy — a hand-built plural
 * ("{n} unlocked") and an English possessive ("{petName}'s trophy shelf",
 * which French cannot form at all) — counted as training-settings debt, and
 * fixing it under a settings commit would have put customer-portal copy in
 * the settings catalogue.
 *
 * Splitting the DATA from the COMPONENTS puts each string where its own
 * screen can claim it. The trophy shelf's two defects are real and are in
 * the debt map, waiting for the customer-portal pass.
 *
 * There is no JSX here on purpose, so this is a `.ts` and stays cheap to
 * import from anywhere.
 */
import {
  type LucideIcon,
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  GraduationCap,
  Medal,
  PartyPopper,
  Trophy,
} from "lucide-react";
import type { MilestoneKind } from "@/lib/pet-milestones";

interface MilestoneVisual {
  icon: LucideIcon;
  /** Card background gradient — `from-X via-Y to-Z` tokens. */
  gradient: string;
  /** Chip background — solid color on the icon plaque. */
  chip: string;
  /** Subtle ring/border tone — pairs with the gradient. */
  ring: string;
}

export const MILESTONE_VISUAL: Record<MilestoneKind, MilestoneVisual> = {
  "first-session": {
    icon: Footprints,
    gradient: "from-sky-100 via-white to-sky-50",
    chip: "bg-sky-500",
    ring: "ring-sky-200",
  },
  "first-mastered": {
    icon: Crown,
    gradient: "from-violet-100 via-white to-violet-50",
    chip: "bg-violet-500",
    ring: "ring-violet-200",
  },
  "first-series": {
    icon: GraduationCap,
    gradient: "from-amber-100 via-white to-amber-50",
    chip: "bg-amber-500",
    ring: "ring-amber-200",
  },
  "five-sessions": {
    icon: Medal,
    gradient: "from-teal-100 via-white to-teal-50",
    chip: "bg-teal-500",
    ring: "ring-teal-200",
  },
  "ten-sessions": {
    icon: Medal,
    gradient: "from-emerald-100 via-white to-emerald-50",
    chip: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  "twenty-five-sessions": {
    icon: Trophy,
    gradient: "from-fuchsia-100 via-white to-fuchsia-50",
    chip: "bg-fuchsia-500",
    ring: "ring-fuchsia-200",
  },
  "first-homework": {
    icon: BookOpen,
    gradient: "from-rose-100 via-white to-rose-50",
    chip: "bg-rose-500",
    ring: "ring-rose-200",
  },
  "seven-day-homework-streak": {
    icon: Flame,
    gradient: "from-orange-100 via-white to-orange-50",
    chip: "bg-orange-500",
    ring: "ring-orange-200",
  },
  "thirty-day-homework-streak": {
    icon: PartyPopper,
    gradient: "from-pink-100 via-white to-pink-50",
    chip: "bg-pink-500",
    ring: "ring-pink-200",
  },
  // Legacy — keeps existing derivations rendering until that compute path
  // is removed from the codebase.
  "four-week-streak": {
    icon: CalendarCheck,
    gradient: "from-sky-100 via-white to-sky-50",
    chip: "bg-sky-500",
    ring: "ring-sky-200",
  },
};
