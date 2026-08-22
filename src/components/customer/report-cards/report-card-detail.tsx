"use client";

import Image from "next/image";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Dog,
  Clock,
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
import {
  type ReportCardTimelineItem,
  summaryExcerpt,
  themeStyles,
  formatReportDate,
  formatReportTime,
} from "./report-card-shared";
import { ReportCardShare } from "./report-card-share";

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
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const ts = themeStyles[item.theme || "everyday"] ?? themeStyles.everyday;
  const { DecorativeIcon } = ts;

  // Only photos that signed. The bucket is private, so an unsigned path would
  // render as a broken image — worse for the owner than no picture at all.
  const usable = item.photos.filter((p) => p.url);
  const galleryUrls = usable
    .filter((p) => p.kind === "moment")
    .map((p) => p.url as string);

  const befores = usable.filter((p) => p.kind === "before");
  const afters = usable.filter((p) => p.kind === "after");
  const beforeAfterPairs = befores.flatMap((before, idx) => {
    const after = afters[idx];
    return after ? [{ before, after }] : [];
  });

  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();

  // Pre-filter the booking flow to this report's service + pet (Table 59).
  const handleBookVisit = () => {
    if (!selectedFacility || !customer) return;
    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      preSelectedPetId: item.card.petRef,
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
        {/* What the facility wrote. Previously this was one paragraph
            assembled in the browser from a mood key and a meal count, over the
            caption "AI-generated summary" — neither the facility's words nor,
            in fact, the AI's. These are the sections the facility composed. */}
        {item.sections.length > 0 && (
          <div className="space-y-3">
            {item.sections.map((section) => (
              <div
                key={`${item.id}-${section.id}`}
                className="rounded-lg bg-slate-50 px-4 py-3"
              >
                <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
                  {section.label}
                </p>
                <p className="mt-1 text-sm/relaxed whitespace-pre-line text-slate-700">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Grooming before/after.
            Paired from the photos' own `kind` rather than a `photoPairs`
            array: the pairing is a property of the pictures, and one list
            with a kind on each row cannot disagree with itself the way a
            second parallel array can. Zipped in order, so a before with no
            after simply does not render a slider. */}
        {item.serviceType === "grooming" && beforeAfterPairs.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Scissors className="size-4" /> Before &amp; After
            </p>
            <div className="space-y-3">
              {beforeAfterPairs.map((pair) => (
                <BeforeAfterSlider
                  key={`${item.id}-pair-${pair.before.id}`}
                  before={pair.before.url as string}
                  after={pair.after.url as string}
                  alt={`${item.petName} grooming`}
                />
              ))}
            </div>
          </div>
        )}

        {galleryUrls.length > 0 && (
          <ReportCardPhotoGallery
            photos={galleryUrls}
            petName={item.petName}
            reportCardId={item.id}
            serviceType={item.serviceType}
            date={item.date}
          />
        )}

        {/* The per-meal table, the potty-break chips and the highlights list
            were removed rather than reshaped. They rendered `meals`,
            `pottyBreaks` and `activities` — arrays no part of this product has
            ever written, so these blocks have never appeared for anybody.
            What the facility records about food, toileting and medication is
            the `careMetrics` section above, in its own words.

            The structured version of this belongs to `care_log_entries` and
            `daycare_attendance`, which are real tables that already hold the
            day's feedings and potty breaks. When the owner's portal shows
            those, it should read them from there rather than have the report
            card form collect the same day twice. */}

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
          reportCard={item.card}
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
          photos={galleryUrls}
          summary={summaryExcerpt(item)}
        />
      </div>
    </div>
  );
}
