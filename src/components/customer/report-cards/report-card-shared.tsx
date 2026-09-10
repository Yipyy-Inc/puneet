import type { ComponentType } from "react";
import { Star, Bell, Ghost, Egg, PartyPopper, Heart } from "lucide-react";
import {
  sectionsOf,
  type ReportCardSection,
} from "@/lib/report-cards/sections";
import { usablePhotos, type UsablePhoto } from "@/lib/report-cards/photos";
import type { ReportCard, ReportCardPhoto } from "@/types/report-card";
import type { AppLocale } from "@/lib/language-settings";
import { formatDateLong, formatTime } from "@/lib/i18n/format";

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

// The prose sections moved to `@/lib/report-cards/sections` so the facility's
// client file can render the same thing without importing a customer
// component. Re-exported here because this file is the owner side's entry
// point and every call site already reaches for it.
export { sectionsOf, type ReportCardSection };
export { usablePhotos, type UsablePhoto };

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
  /** When the card was sent — an ISO instant, formatted where it renders. */
  sentAt: string;
  theme?: string;
  overallFeedback?: string;
  petConditions?: Record<string, string>;
  card: ReportCard;
};

export function buildTimelineItem(
  card: ReportCard,
  opts: { facilityName: string; petImage?: string; yourPet: string },
): ReportCardTimelineItem {
  const input = card.input as Record<string, unknown>;
  const asText = (v: unknown) => (typeof v === "string" ? v : "");

  return {
    id: card.id,
    date: card.visitDate,
    petName: card.petName ?? opts.yourPet,
    petImage: opts.petImage,
    serviceType: card.serviceType,
    mood: asText(input.mood),
    photos: card.photos,
    sections: sectionsOf(card),
    facilityName: opts.facilityName,
    // It stored a FORMATTED time here, which the detail view then handed
    // back to `new Date()` — "Invalid Date" on every card. The instant is
    // kept and formatted once, in the reader's locale, where it is shown.
    sentAt: card.sentAt ?? "",
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

export const formatReportDate = (dateString: string, locale: AppLocale) =>
  formatDateLong(dateString, locale);

export const formatReportTime = (dateString: string, locale: AppLocale) =>
  dateString ? formatTime(dateString, locale) : "";

/* ── Report-card theme visuals ────────────────────────────────────── */
export const themeStyles: Record<
  string,
  {
    /** A catalogue key in `customerPages.areas.reportCards`. */
    labelKey: string;
    emoji: string;
    cardBg: string;
    accentBg: string;
    accentText: string;
    DecorativeIcon: ComponentType<{ className?: string }>;
    iconPos: string;
  }
> = {
  everyday: {
    labelKey: "themeEveryday",
    emoji: "✨",
    cardBg: "bg-slate-50",
    accentBg: "bg-slate-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  christmas: {
    labelKey: "themeChristmas",
    emoji: "🎄",
    cardBg: "bg-red-50",
    accentBg: "bg-red-600",
    accentText: "text-white",
    DecorativeIcon: Bell,
    iconPos: "-top-1 -right-1",
  },
  halloween: {
    labelKey: "themeHalloween",
    emoji: "🎃",
    cardBg: "bg-orange-50",
    accentBg: "bg-violet-700",
    accentText: "text-white",
    DecorativeIcon: Ghost,
    iconPos: "-top-1 -right-1",
  },
  easter: {
    labelKey: "themeEaster",
    emoji: "🐣",
    cardBg: "bg-pink-50",
    accentBg: "bg-pink-500",
    accentText: "text-white",
    DecorativeIcon: Egg,
    iconPos: "-bottom-1 -right-1",
  },
  thanksgiving: {
    labelKey: "themeThanksgiving",
    emoji: "🦃",
    cardBg: "bg-amber-50",
    accentBg: "bg-amber-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  new_year: {
    labelKey: "themeNewYear",
    emoji: "🎉",
    cardBg: "bg-indigo-50",
    accentBg: "bg-indigo-600",
    accentText: "text-white",
    DecorativeIcon: PartyPopper,
    iconPos: "-top-1 -right-1",
  },
  valentines: {
    labelKey: "themeValentines",
    emoji: "💘",
    cardBg: "bg-rose-50",
    accentBg: "bg-rose-500",
    accentText: "text-white",
    DecorativeIcon: Heart,
    iconPos: "-top-1 -right-1",
  },
  summer: {
    labelKey: "themeSummer",
    emoji: "☀️",
    cardBg: "bg-sky-50",
    accentBg: "bg-sky-500",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
  winter: {
    labelKey: "themeWinter",
    emoji: "❄️",
    cardBg: "bg-blue-50",
    accentBg: "bg-blue-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPos: "-top-1 -right-1",
  },
};

/**
 * A mood's word, in the reader's language. The key is the record's own code
 * (`happy`, `tired` …); one this map does not know is shown as recorded
 * rather than dropped.
 */
const MOOD_KEY: Record<string, string> = {
  happy: "moodHappy",
  content: "moodContent",
  shy: "moodShy",
  tired: "moodTired",
  excited: "moodExcited",
  calm: "moodCalm",
  anxious: "moodAnxious",
  playful: "moodPlayful",
  energetic: "moodEnergetic",
};

export function moodLabel(mood: string, t: (key: string) => string): string {
  return MOOD_KEY[mood] ? t(MOOD_KEY[mood]) : mood;
}

/**
 * A section's heading. The five are the product's fixed names, not the
 * facility's words, so they are this page's to translate; the body under each
 * is the facility's and is never touched.
 */
const SECTION_KEY: Record<string, string> = {
  todaysVibe: "sectionTodaysVibe",
  friendsAndFun: "sectionFriendsAndFun",
  careMetrics: "sectionCareMetrics",
  holidaySparkle: "sectionHolidaySparkle",
  closingNote: "sectionClosingNote",
};

export function sectionLabel(
  section: ReportCardSection,
  t: (key: string) => string,
): string {
  return SECTION_KEY[section.id] ? t(SECTION_KEY[section.id]) : section.label;
}

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
