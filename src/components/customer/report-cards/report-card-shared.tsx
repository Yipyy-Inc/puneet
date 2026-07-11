import type { ComponentType } from "react";
import { Star, Bell, Ghost, Egg, PartyPopper, Heart } from "lucide-react";
import type { ReportCard } from "@/types/pet";

/** One entry in the customer report-cards feed (a report card + resolved pet/facility). */
export type ReportCardTimelineItem = {
  id: string;
  date: string;
  petName: string;
  petImage?: string;
  serviceType: string;
  mood: string;
  photos: string[];
  meals: ReportCard["meals"];
  pottyBreaks: ReportCard["pottyBreaks"];
  staffNotes: string;
  activities: string[];
  facilityName: string;
  timeLabel: string;
  theme?: string;
  overallFeedback?: string;
  petConditions?: Record<string, string>;
  reportCard: ReportCard;
};

/* ── Daily summary builder ────────────────────────────────────────── */
export function buildDailySummary(item: {
  petName: string;
  mood: string;
  activities: string[];
  meals: Array<{ consumed: string }>;
  staffNotes?: string;
  serviceType: string;
}): string {
  const { petName, mood, activities, meals, staffNotes } = item;
  const moodMap: Record<string, string> = {
    happy: "in wonderful spirits",
    excited: "full of excitement",
    calm: "calm and relaxed",
    anxious: "a little nervous at first but settled in well",
    tired: "on the mellow side",
    playful: "super playful all day",
    energetic: "full of energy",
  };
  const moodText = moodMap[mood] || "in good spirits";
  const actText =
    activities.length > 0
      ? ` Highlights included ${activities.slice(0, 3).join(", ")}.`
      : "";
  const mealCount = meals.filter(
    (m) => m.consumed === "all" || m.consumed === "most",
  ).length;
  const mealText =
    mealCount > 0
      ? ` ${petName} had a healthy appetite and enjoyed ${mealCount === 1 ? "a meal" : `${mealCount} meals`}.`
      : "";
  const noteText = staffNotes ? ` ${staffNotes}` : "";
  return `${petName} was ${moodText} today!${actText}${mealText}${noteText}`;
}

/** Opening sentence of the AI summary, truncated to ~120 chars with an ellipsis. */
export function buildSummaryExcerpt(
  item: Parameters<typeof buildDailySummary>[0],
  maxLen = 120,
): string {
  const summary = buildDailySummary(item);
  const endIdx = summary.search(/[.!?]\s/);
  const firstSentence = endIdx >= 0 ? summary.slice(0, endIdx + 1) : summary;
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
  happy: "😊",
  excited: "🤩",
  calm: "😌",
  anxious: "😟",
  tired: "😴",
  playful: "😃",
  energetic: "⚡",
};
