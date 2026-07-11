"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Dog,
  Clock,
  Utensils,
  Droplets,
  ClipboardCheck,
  Stethoscope,
  Heart,
  Scissors,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "./before-after-slider";
import { ReportCardRating } from "./report-card-rating";
import { ReportCardPhotoGallery } from "@/components/customer/ReportCardPhotoGallery";
import { ReportCardQuickReply } from "@/components/customer/ReportCardQuickReply";
import { ReportCardBrandedHeader } from "@/components/shared/ReportCardBrandedHeader";
import { ReportCardBrandedFooter } from "@/components/shared/ReportCardBrandedFooter";
import { businessProfile, reportCardConfig } from "@/data/settings";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import {
  type ReportCardTimelineItem,
  buildDailySummary,
  buildSummaryExcerpt,
  themeStyles,
  formatReportDate,
  formatReportTime,
} from "./report-card-shared";
import { ReportCardShare } from "./report-card-share";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

/** Time-of-day bucket for a meal, derived from its "H:MM AM/PM" (or 24h) time. */
function mealPeriodLabel(time: string): string {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  let hour = 0;
  if (m) {
    hour = parseInt(m[1], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === "PM" && hour !== 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
  }
  if (hour < 12) return "Morning Meal";
  if (hour < 17) return "Midday Meal";
  return "Evening Meal";
}

/** Potty-outcome chip label + colour — abnormal outcomes read as amber/red. */
function pottyChip(outcome: string): { label: string; className: string } {
  switch (outcome) {
    case "soft_stool":
      return {
        label: "Soft stool",
        className:
          "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
      };
    case "diarrhea":
      return {
        label: "Diarrhea",
        className:
          "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      };
    case "vomit":
      return {
        label: "Vomit",
        className:
          "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      };
    case "accident":
      return {
        label: "Accident",
        className:
          "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
      };
    default:
      return {
        label: "Success",
        className:
          "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300",
      };
  }
}

/** Full, expanded report-card content — shown in the detail slide-over. */
export function ReportCardDetail({
  item,
  favourite,
  onToggleFavourite,
}: {
  item: ReportCardTimelineItem;
  favourite?: boolean;
  onToggleFavourite?: () => void;
}) {
  const ts = themeStyles[item.theme || "everyday"] ?? themeStyles.everyday;
  const { DecorativeIcon } = ts;

  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  // Pre-filter the booking flow to this report's service + pet (Table 59).
  const handleBookVisit = () => {
    if (!selectedFacility || !customer) return;
    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      preSelectedPetId: item.reportCard.petId,
      preSelectedService: item.serviceType,
      lockService: true,
      isCustomerMode: true,
      onCreateBooking: () => {
        // Modal shows its own booking-request confirmation.
      },
    });
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border ${ts.cardBg}`}>
      {/* Decorative corner icon */}
      <DecorativeIcon
        className={`absolute size-20 text-gray-900 opacity-[0.06] ${ts.iconPos} `}
      />

      {/* Branded header */}
      {reportCardConfig.brand && (
        <ReportCardBrandedHeader
          brandConfig={reportCardConfig.brand}
          profile={businessProfile}
          title={`${item.petName}'s ${item.serviceType} Report`}
          subtitle={`${formatReportDate(item.date)} · ${item.facilityName}`}
        />
      )}

      {/* Themed accent header */}
      <div
        className={`relative px-5 py-3 ${ts.accentBg} ${ts.accentText} flex items-start justify-between gap-4`}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{ts.emoji}</span>
            <p className="text-base font-bold">
              {item.petName}&apos;s {item.serviceType} day
            </p>
            <Badge className="border-0 bg-white/20 text-xs text-white capitalize">
              {item.mood}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs opacity-80">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" /> {formatReportDate(item.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {formatReportTime(item.timeLabel)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Dog className="size-3" /> {item.facilityName}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onToggleFavourite && (
            <button
              type="button"
              onClick={onToggleFavourite}
              aria-label={favourite ? "Remove favourite" : "Add favourite"}
              aria-pressed={favourite}
              className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/20"
            >
              <Heart className={cn("size-5", favourite && "fill-current")} />
            </button>
          )}
          {item.petImage && (
            <div className="hidden size-14 overflow-hidden rounded-full border-2 border-white/30 bg-white/20 sm:block">
              <Image
                src={item.petImage}
                alt={item.petName}
                width={56}
                height={56}
                className="size-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="relative space-y-4 p-4">
        {/* AI daily summary */}
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-sm/relaxed text-slate-600">
            {buildDailySummary(item)}
          </p>
          <p className="mt-1.5 text-[11px] text-gray-400 italic">
            AI-generated summary
          </p>
        </div>

        {/* Grooming before/after (Table 47) */}
        {item.serviceType === "grooming" &&
          item.reportCard.photoPairs &&
          item.reportCard.photoPairs.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Scissors className="size-4" /> Before &amp; After
              </p>
              <div className="space-y-3">
                {item.reportCard.photoPairs.map((pair, idx) => (
                  <BeforeAfterSlider
                    key={`${item.id}-pair-${idx}`}
                    before={pair.before}
                    after={pair.after}
                    alt={`${item.petName} grooming`}
                  />
                ))}
              </div>
            </div>
          )}

        {item.photos.length > 0 && (
          <ReportCardPhotoGallery
            photos={item.photos}
            petName={item.petName}
            reportCardId={item.id}
            serviceType={item.serviceType}
            date={item.date}
          />
        )}

        {item.meals && item.meals.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Utensils className="size-4" /> Meals
            </p>
            <div className="text-muted-foreground space-y-1 text-xs md:text-sm">
              {item.meals.map((meal, idx) => {
                const label = mealPeriodLabel(meal.time);
                const prevLabel =
                  idx > 0 ? mealPeriodLabel(item.meals[idx - 1].time) : null;
                const showDivider = label !== prevLabel;
                return (
                  <div key={`${item.id}-meal-${idx}`}>
                    {showDivider && (
                      <p className="text-muted-foreground/60 mt-2 mb-1 text-[10px] font-semibold tracking-widest uppercase first:mt-0">
                        {label}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{meal.time}</span>
                      <span className="min-w-35 flex-1">{meal.food}</span>
                      <span>{meal.amount}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] capitalize">
                        Ate {meal.consumed}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {item.pottyBreaks && item.pottyBreaks.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Droplets className="size-4" /> Potty breaks
            </p>
            <div className="flex flex-wrap gap-2">
              {item.pottyBreaks.map((pb, idx) => {
                const chip = pottyChip(pb.outcome ?? pb.type);
                return (
                  <Badge
                    key={`${item.id}-potty-${idx}`}
                    variant="outline"
                    className={cn("text-xs", chip.className)}
                  >
                    {pb.time} • {chip.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {item.activities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Highlights from the day</p>
            <div className="flex flex-wrap gap-2">
              {item.activities.map((activity, idx) => (
                <Badge key={`${item.id}-activity-${idx}`} variant="secondary">
                  {activity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {item.overallFeedback && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ClipboardCheck className="size-4" /> Overall Feedback
            </p>
            <Badge variant="outline" className="text-xs">
              {item.overallFeedback}
            </Badge>
          </div>
        )}

        {item.petConditions && Object.keys(item.petConditions).length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Stethoscope className="size-4" /> Pet Condition
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(item.petConditions).map(([category, value]) => {
                const abnormal = value.trim().toLowerCase() !== "normal";
                return (
                  <div
                    key={`${item.id}-condition-${category}`}
                    className="flex items-center justify-between rounded-md bg-white/60 px-2 py-1.5"
                  >
                    <span className="text-muted-foreground capitalize">
                      {category}
                    </span>
                    {abnormal ? (
                      <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3 shrink-0" />
                        {value}
                      </span>
                    ) : (
                      <span className="font-medium">{value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Star rating (F1) */}
        <ReportCardRating
          reportCard={item.reportCard}
          petName={item.petName}
          facilityName={item.facilityName}
        />

        {/* Quick Reply */}
        <ReportCardQuickReply
          reportCardId={item.id}
          petName={item.petName}
          serviceType={item.serviceType}
          date={formatReportDate(item.date)}
          onReplySent={(message) => {
            console.log("Reply sent:", message);
          }}
        />

        {/* Theme label */}
        <div className="flex justify-end pt-1">
          <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
            <span aria-hidden="true">{ts.emoji}</span>
            {ts.label} Theme
          </Badge>
        </div>

        {/* Branded footer */}
        {reportCardConfig.brand && (
          <div className="mt-3 border-t pt-2">
            <ReportCardBrandedFooter
              brandConfig={reportCardConfig.brand}
              profile={businessProfile}
              onBookVisit={handleBookVisit}
            />
          </div>
        )}

        {/* Social share (Table 60) */}
        <ReportCardShare
          petName={item.petName}
          serviceType={item.serviceType}
          facilityName={item.facilityName}
          photos={item.photos}
          summary={buildSummaryExcerpt(item)}
        />
      </div>
    </div>
  );
}
