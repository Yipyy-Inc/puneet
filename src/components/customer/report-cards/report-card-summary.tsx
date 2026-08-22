"use client";

import Image from "next/image";
import { Heart, ImageIcon, ArrowRight, Dog } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ReportCardTimelineItem,
  summaryExcerpt,
  formatReportDate,
  serviceHeaderColor,
  moodEmoji,
} from "./report-card-shared";

// The values the facility's form actually records. Previously these chips were
// counted off `meals` and `pottyBreaks` arrays that nothing has ever written,
// so every card showed none of them.
const APPETITE_CHIP: Record<string, string> = {
  "ate-all": "Ate everything 🍽",
  "ate-most": "Ate most 🍽",
  "ate-some": "Ate a little 🍽",
  refused: "Didn't eat 🍽",
};

const POTTY_CHIP: Record<string, string> = {
  normal: "Potty normal ✓",
  irregular: "Potty irregular",
  accident: "Had an accident",
};

// `not-needed` is deliberately absent: "no medication was due" is not news to
// the owner, and a chip for it would crowd out one that is.
const MEDS_CHIP: Record<string, string> = {
  given: "Meds given 💊",
  missed: "Meds missed",
};

const ENERGY_CHIP: Record<string, string> = {
  high: "High energy ⚡",
  medium: "Steady energy",
  low: "Restful day 😴",
};

/** Compact quick-stat chips, from what the facility actually recorded (max 4). */
function buildQuickStats(item: ReportCardTimelineItem): string[] {
  const input = item.card.input as Record<string, unknown>;
  const pick = (map: Record<string, string>, key: unknown) =>
    typeof key === "string" ? map[key] : undefined;

  const chips = [
    pick(APPETITE_CHIP, input.appetite),
    pick(POTTY_CHIP, input.potty),
    pick(MEDS_CHIP, input.meds),
    item.overallFeedback ? `${item.overallFeedback} ⭐` : undefined,
    pick(ENERGY_CHIP, input.energy),
    item.photos.length > 0
      ? `${item.photos.length} photo${item.photos.length === 1 ? "" : "s"} 📷`
      : undefined,
  ].filter((c): c is string => Boolean(c));

  return chips.slice(0, 4);
}

export function ReportCardSummary({
  item,
  favourite,
  unread,
  onToggleFavourite,
  onOpen,
}: {
  item: ReportCardTimelineItem;
  favourite: boolean;
  unread: boolean;
  onToggleFavourite: () => void;
  onOpen: () => void;
}) {
  const headerBg = serviceHeaderColor[item.serviceType] ?? "bg-slate-600";
  const emoji = moodEmoji[item.mood] ?? "🐾";
  const excerpt = summaryExcerpt(item);
  // Only photos that actually signed. A private-bucket path that failed to
  // sign would render as a broken image, which reads worse than no photo.
  const photos = item.photos.filter((p) => p.url).slice(0, 3);
  const stats = buildQuickStats(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="bg-card focus-visible:ring-primary/50 group relative cursor-pointer overflow-hidden rounded-2xl border shadow-sm transition-all outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2"
    >
      {/* Unread dot */}
      {unread && (
        <span
          className="absolute top-3 right-3 z-10 size-2.5 rounded-full bg-teal-400 ring-2 ring-white"
          aria-label="Unread"
        />
      )}

      {/* Service-coloured header bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 text-white",
          headerBg,
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold">{item.petName}</p>
            <span className="text-xs capitalize opacity-90">
              · {item.serviceType}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] opacity-90">
            <span>
              {emoji} <span className="capitalize">{item.mood}</span>
            </span>
            <span>· {formatReportDate(item.date)}</span>
            <span className="truncate">· {item.facilityName}</span>
          </div>
        </div>
        <div className="size-10 shrink-0 overflow-hidden rounded-full border-2 border-white/40 bg-white/20">
          {item.petImage ? (
            <Image
              src={item.petImage}
              alt={item.petName}
              width={40}
              height={40}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Dog className="size-5 text-white/80" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* 3-photo strip */}
        <div className="grid grid-cols-3 gap-2">
          {photos.length > 0
            ? photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={photo.url as string}
                    alt={photo.caption ?? `${item.petName} photo ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 30vw, 160px"
                    className="object-cover"
                  />
                </div>
              ))
            : [0, 1, 2].map((idx) => (
                <div
                  key={`${item.id}-ph-${idx}`}
                  className="bg-muted/60 text-muted-foreground/40 flex aspect-square items-center justify-center rounded-lg"
                >
                  <ImageIcon className="size-5" />
                </div>
              ))}
        </div>

        {/* AI excerpt */}
        <p className="text-muted-foreground line-clamp-1 text-sm">{excerpt}</p>

        {/* Quick-stats chips */}
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stats.map((chip, idx) => (
              <span
                key={`${item.id}-stat-${idx}`}
                className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
            aria-label={favourite ? "Remove favourite" : "Add favourite"}
            aria-pressed={favourite}
            className="text-muted-foreground transition-colors hover:text-rose-500"
          >
            <Heart
              className={cn(
                "size-5",
                favourite && "fill-rose-500 text-rose-500",
              )}
            />
          </button>
          <span className="text-primary inline-flex items-center gap-1 text-sm font-medium group-hover:underline">
            View full report
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
