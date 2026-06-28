import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  CreditCard,
  MessageSquare,
  PawPrint,
  Rocket,
  Settings,
  UsersRound,
} from "lucide-react";

import type { KpiTone } from "@/components/facility/dashboard/kpi-tile";

// The canonical Help Center taxonomy. Knowledge Base articles are grouped into
// these eight categories via normalizeCategory(); each carries the icon, tone
// and badge styling used across the page.

export interface HelpCategoryMeta {
  name: string;
  icon: LucideIcon;
  tone: KpiTone;
  blurb: string;
  badgeClass: string;
  synonyms: string[];
}

export const HELP_CATEGORIES: HelpCategoryMeta[] = [
  {
    name: "Getting Started",
    icon: Rocket,
    tone: "indigo",
    blurb: "Set up your account and learn the basics.",
    badgeClass:
      "border-indigo-300 text-indigo-600 dark:border-indigo-800 dark:text-indigo-300",
    synonyms: ["getting started", "onboarding", "setup", "basics"],
  },
  {
    name: "Bookings & Scheduling",
    icon: CalendarClock,
    tone: "violet",
    blurb: "Create, manage and automate bookings.",
    badgeClass:
      "border-violet-300 text-violet-600 dark:border-violet-800 dark:text-violet-300",
    synonyms: [
      "bookings & scheduling",
      "bookings",
      "booking",
      "scheduling",
      "schedule",
      "calendar",
      "appointments",
    ],
  },
  {
    name: "Clients & Pets",
    icon: PawPrint,
    tone: "emerald",
    blurb: "Manage client and pet profiles.",
    badgeClass:
      "border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300",
    synonyms: ["clients & pets", "clients", "pets", "customers", "loyalty"],
  },
  {
    name: "Payments & Invoicing",
    icon: CreditCard,
    tone: "amber",
    blurb: "Take payments, refunds and discounts.",
    badgeClass:
      "border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-300",
    synonyms: [
      "payments & invoicing",
      "payments",
      "billing",
      "invoicing",
      "invoices",
      "refunds",
      "promo",
      "marketing",
    ],
  },
  {
    name: "Staff Management",
    icon: UsersRound,
    tone: "rose",
    blurb: "Roles, permissions and your team.",
    badgeClass:
      "border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-300",
    synonyms: [
      "staff management",
      "staff",
      "team",
      "employees",
      "permissions",
      "roles",
    ],
  },
  {
    name: "Calling & Messaging",
    icon: MessageSquare,
    tone: "violet",
    blurb: "Calls, voicemail and client messaging.",
    badgeClass:
      "border-fuchsia-300 text-fuchsia-600 dark:border-fuchsia-800 dark:text-fuchsia-300",
    synonyms: [
      "calling & messaging",
      "calling",
      "calls",
      "messaging",
      "messages",
      "sms",
      "voicemail",
      "communication",
    ],
  },
  {
    name: "Reports",
    icon: BarChart3,
    tone: "emerald",
    blurb: "Analytics, exports and business insights.",
    badgeClass:
      "border-cyan-300 text-cyan-600 dark:border-cyan-800 dark:text-cyan-300",
    synonyms: ["reports", "reporting", "analytics", "insights"],
  },
  {
    name: "Account Settings",
    icon: Settings,
    tone: "slate",
    blurb: "Profile, security and notifications.",
    badgeClass:
      "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300",
    synonyms: [
      "account settings",
      "account",
      "settings",
      "security",
      "notifications",
      "profile",
    ],
  },
];

const SYNONYM_TO_CANONICAL: Record<string, string> = Object.fromEntries(
  HELP_CATEGORIES.flatMap((c) => c.synonyms.map((s) => [s, c.name] as const)),
);

const META_BY_NAME: Record<string, HelpCategoryMeta> = Object.fromEntries(
  HELP_CATEGORIES.map((c) => [c.name, c] as const),
);

/** Map a raw KB category onto the canonical taxonomy (unknown → kept as-is). */
export function normalizeCategory(raw: string): string {
  return SYNONYM_TO_CANONICAL[raw.trim().toLowerCase()] ?? raw.trim();
}

export function categoryMeta(name: string): HelpCategoryMeta | undefined {
  return META_BY_NAME[name];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimated read time in minutes (~200 wpm, minimum 1). */
export function estimateReadTime(html: string): number {
  const words = stripHtml(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
