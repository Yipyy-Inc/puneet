import type { ComponentType } from "react";
import { Star, Bell, Ghost, Egg, PartyPopper, Heart } from "lucide-react";
import { reportCardSectionMeta } from "@/data/settings";
import type { ReportCard, ReportCardPhoto } from "@/types/report-card";

// ============================================================================
// The owner's view of a report card.
//
// WHAT CHANGED, AND WHY IT HAD TO
//
// This file used to describe a card as `meals`, `pottyBreaks` and
// `activities` — arrays that NOTHING in the product has ever produced. The
// facility's form collects mood, energy, appetite and a closing comment, and
// turns them into prose sections using the facility's own templates. So the
// owner's page was shaped for data that was never going to arrive, and the
// prose the facility actually writes had nowhere to go.
//
// `buildDailySummary` went with them. It ASSEMBLED a summary in the browser
// —  "Buddy was in wonderful spirits today!" — from a mood key and a meal
// count, and showed it to the owner as though the facility had written it.
// The facility does write one; it is in `generated`, and that is what an owner
// should be reading. Fabricating a cheerful sentence from an enum is the same
// class of thing as the in-memory outbox that reported deliveries that never
// happened.
// ============================================================================

/** One prose section of a card, ready to render. */
export type ReportCardSection = {
  id: string;
  label: string;
  body: string;
};

/** The canonical order. A facility's enabled set is a subset of this. */
const SECTION_ORDER = [
  "todaysVibe",
  "friendsAndFun",
  "careMetrics",
  "holidaySparkle",
  "closingNote",
] as const;

/** One entry in the customer report-cards feed. */
export type ReportCardTimelineItem = {
  id: string;
  date: string;
  petName: string;
  petImage?: string;
  serviceType: string;
  mood: string;
  photos: ReportCardPhoto[];
  /** The facility's own words. Empty sections are dropped, not rendered blank. */
  sections: ReportCardSection[];
  facilityName: string;
  timeLabel: string;
  theme?: string;
  overallFeedback?: string;
  petConditions?: Record<string, string>;
  card: ReportCard;
};

/**
 * Which sections this card actually has.
 *
 * Driven by content rather than by the facility's config, deliberately: the
 * owner's portal cannot see `facility_settings`, and a section the facility
 * turned off simply arrives empty. Dropping empties gets the same answer
 * without the customer needing to read a facility's configuration.
 */
export function sectionsOf(card: ReportCard): ReportCardSection[] {
  const generated = card.generated as unknown as Record<string, unknown>;
  return SECTION_ORDER.flatMap((id) => {
    const body = typeof generated[id] === "string" ? String(generated[id]) : "";
    if (!body.trim()) return [];
    return [{ id, label: reportCardSectionMeta[id]?.label ?? id, body }];
  });
}

export function buildTimelineItem(
  card: ReportCard,
  opts: { facilityName: string; petImage?: string },
): ReportCardTimelineItem {
  const input = card.input as Record<string, unknown>;
  const asText = (v: unknown) => (typeof v === "string" ? v : "");

  return {
    id: card.id,
    date: card.visitDate,
    petName: card.petName ?? "Your pet",
    petImage: opts.petImage,
    serviceType: card.serviceType,
    mood: asText(input.mood),
    photos: card.photos,
    sections: sectionsOf(card),
    facilityName: opts.facilityName,
    timeLabel: card.sentAt ? formatReportTime(card.sentAt) : "",
    theme: card.theme ?? undefined,
    overallFeedback: asText(input.overallFeedback) || undefined,
    petConditions: (input.petConditions as Record<string, string>) ?? undefined,
    card,
  };
}

/**
 * The opening of what the facility wrote, for a collapsed card.
 *
 * Reads the first section that has words in it rather than assembling one, so
 * the excerpt is always a real sentence somebody chose to send.
 */
export function summaryExcerpt(
  item: ReportCardTimelineItem,
  maxLen = 120,
): string {
  const body = item.sections[0]?.body?.trim() ?? "";
  if (!body) return "";
  const endIdx = body.search(/[.!?]\s/);
  const firstSentence = endIdx >= 0 ? body.slice(0, endIdx + 1) : body;
  if (firstSentence.length <= maxLen) return firstSentence;
  return `${firstSentence.slice(0, maxLen - 1).trimEnd()}…`;
}

export const formatReportDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const formatReportTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

/* ── Report-card theme visuals ────────────────────────────────────── */
export const themeStyles: Record<
  string,
  {
    label: string;
    emoji: string;
    cardBg: string;
    accentBg: string;
    accentText: string;
    DecorativeIcon: ComponentType<{ className?: string }>;
    iconPos: string;
  }
> = {
  everyday: {
    label: "Everyday",
    emoji: "✨",
    cardBg: "bg-slate-50",
    accentBg: "bg-slate-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  christmas: {
    label: "Christmas",
    emoji: "🎄",
    cardBg: "bg-red-50",
    accentBg: "bg-red-600",
    accentText: "text-white",
    DecorativeIcon: Bell,
    iconPos: "-top-1 -right-1",
  },
  halloween: {
    label: "Halloween",
    emoji: "🎃",
    cardBg: "bg-orange-50",
    accentBg: "bg-violet-700",
    accentText: "text-white",
    DecorativeIcon: Ghost,
    iconPos: "-top-1 -right-1",
  },
  easter: {
    label: "Easter",
    emoji: "🐣",
    cardBg: "bg-pink-50",
    accentBg: "bg-pink-500",
    accentText: "text-white",
    DecorativeIcon: Egg,
    iconPos: "-bottom-1 -right-1",
  },
  thanksgiving: {
    label: "Thanksgiving",
    emoji: "🦃",
    cardBg: "bg-amber-50",
    accentBg: "bg-amber-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  new_year: {
    label: "New Year",
    emoji: "🎉",
    cardBg: "bg-indigo-50",
    accentBg: "bg-indigo-600",
    accentText: "text-white",
    DecorativeIcon: PartyPopper,
    iconPos: "-top-1 -right-1",
  },
  valentines: {
    label: "Valentine's",
    emoji: "💘",
    cardBg: "bg-rose-50",
    accentBg: "bg-rose-500",
    accentText: "text-white",
    DecorativeIcon: Heart,
    iconPos: "-top-1 -right-1",
  },
  summer: {
    label: "Summer",
    emoji: "☀️",
    cardBg: "bg-sky-50",
    accentBg: "bg-sky-500",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  winter: {
    label: "Winter",
    emoji: "❄️",
    cardBg: "bg-blue-50",
    accentBg: "bg-blue-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
};

/** Service-type → header bar colour + mood emoji, for summary cards. */
export const serviceHeaderColor: Record<string, string> = {
  daycare: "bg-teal-600",
  grooming: "bg-pink-500",
  boarding: "bg-indigo-900",
  training: "bg-amber-600",
};

export const moodEmoji: Record<string, string> = {
  // The four the facility's form actually records (MoodValue in
  // ReportCardsModule). `content` and `shy` were missing, so two of the four
  // moods a facility can choose fell through to the generic paw.
  happy: "😊",
  content: "😌",
  shy: "🙈",
  tired: "😴",
  // Retained: the fixture's wider set, still referenced by unconverted screens.
  excited: "🤩",
  calm: "😌",
  anxious: "😟",
  playful: "😃",
  energetic: "⚡",
};
