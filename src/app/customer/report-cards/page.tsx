"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { reportCards } from "@/data/pet-data";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Dog,
  FileText,
  Clock,
  Utensils,
  Droplets,
  Search,
  X,
  Star,
  Bell,
  Ghost,
  Egg,
  PartyPopper,
  Heart,
  ClipboardCheck,
  Stethoscope,
  ArrowUpDown,
  ArrowDownUp,
} from "lucide-react";
import { ReportCardPhotoGallery } from "@/components/customer/ReportCardPhotoGallery";
import { ReportCardQuickReply } from "@/components/customer/ReportCardQuickReply";
import { ReportCardBrandedHeader } from "@/components/shared/ReportCardBrandedHeader";
import { ReportCardBrandedFooter } from "@/components/shared/ReportCardBrandedFooter";
import { businessProfile, reportCardConfig } from "@/data/settings";

/* ── Daily summary builder ────────────────────────────────────────── */
function buildDailySummary(item: {
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

/* ── Report-card theme visuals ────────────────────────────────────── */
const themeStyles: Record<
  string,
  {
    label: string;
    emoji: string;
    cardBg: string;
    accentBg: string;
    accentText: string;
    DecorativeIcon: React.ComponentType<{ className?: string }>;
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

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type Client = (typeof clients)[number];

export default function CustomerReportCardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const customerPetIds = useMemo(
    () => customer?.pets.map((p) => p.id) ?? [],
    [customer],
  );

  const customerReportCards = useMemo(() => {
    if (!customer) return [] as typeof reportCards;

    // Show all report cards for this customer's pets,
    // regardless of facility, so examples are always visible.
    return reportCards.filter((card) => customerPetIds.includes(card.petId));
  }, [customer, customerPetIds]);

  const facilityName = selectedFacility
    ? selectedFacility.name
    : (customer?.facility ?? "Your Facility");

  const petById = useMemo(() => {
    const map = new Map<number, Client["pets"][number]>();
    customer?.pets.forEach((pet) => map.set(pet.id, pet));
    return map;
  }, [customer]);

  // Filter and sort report cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = [...customerReportCards];

    // Filter by pet
    if (selectedPetId !== "all") {
      filtered = filtered.filter(
        (card) => card.petId === parseInt(selectedPetId),
      );
    }

    // Search by keyword
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((card) => {
        const pet = petById.get(card.petId);
        const petName = pet?.name?.toLowerCase() || "";
        const staffNotes = card.staffNotes?.toLowerCase() || "";
        const activities = card.activities.join(" ").toLowerCase();
        const serviceType = card.serviceType.toLowerCase();

        return (
          petName.includes(query) ||
          staffNotes.includes(query) ||
          activities.includes(query) ||
          serviceType.includes(query)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === "date-desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [
    customerReportCards,
    selectedPetId,
    searchQuery,
    sortBy,
    petById,
  ]);

  const timelineItems = useMemo(() => {
    return filteredAndSortedCards.map((card) => {
      const pet = petById.get(card.petId);
      const booking = bookings.find((b) => b.id === card.bookingId);
      const facility = booking
        ? facilities.find((f) => f.id === booking.facilityId)
        : null;

      return {
        id: card.id,
        date: card.date,
        petName: pet?.name ?? "Your pet",
        petImage: pet?.imageUrl,
        serviceType: card.serviceType,
        mood: card.mood,
        photos: card.photos,
        meals: card.meals,
        pottyBreaks: card.pottyBreaks,
        staffNotes: card.staffNotes,
        activities: card.activities,
        facilityName: facility?.name ?? facilityName,
        timeLabel: card.sentAt ?? card.date,
        theme: card.theme,
        overallFeedback: card.overallFeedback,
        petConditions: card.petConditions,
        reportCard: card,
      };
    });
  }, [filteredAndSortedCards, petById, facilityName]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters = selectedPetId !== "all" || searchQuery;

  const clearFilters = () => {
    setSelectedPetId("all");
    setSearchQuery("");
  };

  const pillClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 h-7 rounded-full px-3.5 text-[11px] font-medium transition-all duration-150 cursor-pointer select-none",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "border border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-primary",
    );

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Report Cards History</h1>
          <p className="text-muted-foreground">
            A warm timeline of your pet&apos;s stays at {facilityName}.
          </p>
        </div>

        {/* Filters */}
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
          {/* Search + Sort */}
          <div className="flex items-center gap-3 px-5 py-3">
            <Search className="text-primary/40 size-4 shrink-0" />
            <Input
              placeholder="Search by pet, notes, or activity…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-auto flex-1 border-none bg-transparent p-0 text-sm shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
            />
            <button
              onClick={() =>
                setSortBy(sortBy === "date-desc" ? "date-asc" : "date-desc")
              }
              className="text-muted-foreground hover:text-primary ml-auto flex shrink-0 items-center gap-1.5 text-xs transition-colors"
            >
              {sortBy === "date-desc" ? (
                <ArrowUpDown className="size-3.5" />
              ) : (
                <ArrowDownUp className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {sortBy === "date-desc" ? "Newest first" : "Oldest first"}
              </span>
            </button>
          </div>

          {/* All filter rows */}
          <Separator />
          <div className="space-y-2 px-5 py-3">
            {/* Pet */}
            {customer && customer.pets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground w-14 shrink-0 text-[10px] font-semibold uppercase tracking-widest">
                  Pet
                </span>
                <button
                  onClick={() => setSelectedPetId("all")}
                  className={pillClass(selectedPetId === "all")}
                >
                  All
                </button>
                {customer.pets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id.toString())}
                    className={pillClass(selectedPetId === pet.id.toString())}
                  >
                    <Dog className="size-3" />
                    {pet.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active filter footer */}
          {hasActiveFilters && (
            <>
              <Separator className="bg-primary/10" />
              <div className="bg-primary/5 flex items-center justify-between px-5 py-2">
                <p className="text-muted-foreground text-xs">
                  <span className="text-primary font-semibold">
                    {filteredAndSortedCards.length}
                  </span>{" "}
                  {filteredAndSortedCards.length === 1
                    ? "report card"
                    : "report cards"}{" "}
                  found
                </p>
                <button
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors"
                >
                  <X className="size-3" />
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </div>

        {timelineItems.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-12 text-center">
              <FileText className="text-muted-foreground mx-auto size-12 opacity-50" />
              <p className="font-semibold">
                {hasActiveFilters
                  ? "No report cards match your filters"
                  : "No report cards yet"}
              </p>
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Once your pet visits the facility, their report cards will appear here as a memory timeline."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="pr-4">
            <div className="relative pl-4">
              {/* Vertical timeline line */}
              <div
                className="bg-border/60 absolute top-0 bottom-0 left-4 w-px"
                aria-hidden="true"
              />

              <div className="space-y-6">
                {timelineItems.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-3">
                      <div className="bg-primary size-3 rounded-full shadow-sm" />
                      {index !== timelineItems.length - 1 && (
                        <div className="bg-border/40 w-px flex-1" />
                      )}
                    </div>

                    {/* Themed Card */}
                    {(() => {
                      const ts =
                        themeStyles[item.theme || "everyday"] ??
                        themeStyles.everyday;
                      const { DecorativeIcon } = ts;
                      return (
                        <div
                          className={`relative flex-1 overflow-hidden rounded-xl border ${ts.cardBg} `}
                        >
                          {/* Decorative corner icon */}
                          <DecorativeIcon
                            className={`absolute h-20 w-20 text-gray-900 opacity-[0.06] ${ts.iconPos} `}
                          />

                          {/* Branded header */}
                          {reportCardConfig.brand && (
                            <ReportCardBrandedHeader
                              brandConfig={reportCardConfig.brand}
                              profile={businessProfile}
                              title={`${item.petName}'s ${item.serviceType} Report`}
                              subtitle={`${formatDate(item.date)} · ${item.facilityName}`}
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
                                  <Calendar className="size-3" />{" "}
                                  {formatDate(item.date)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3" />{" "}
                                  {formatTime(item.timeLabel)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Dog className="size-3" /> {item.facilityName}
                                </span>
                              </div>
                            </div>

                            {item.petImage && (
                              <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/30 bg-white/20 sm:block">
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

                          {/* Card body */}
                          <div className="relative space-y-4 p-4">
                            {/* AI daily summary */}
                            <div className="rounded-lg bg-slate-50 px-4 py-3">
                              <p className="text-sm/relaxed text-slate-600">
                                {buildDailySummary(item)}
                              </p>
                            </div>

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
                                  {item.meals.map((meal, idx) => (
                                    <div
                                      key={`${item.id}-meal-${idx}`}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span className="font-medium">
                                        {meal.time}
                                      </span>
                                      <span className="min-w-35 flex-1">
                                        {meal.food}
                                      </span>
                                      <span>{meal.amount}</span>
                                      <span className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] capitalize">
                                        Ate {meal.consumed}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.pottyBreaks &&
                              item.pottyBreaks.length > 0 && (
                                <div className="space-y-2">
                                  <p className="flex items-center gap-2 text-sm font-medium">
                                    <Droplets className="size-4" /> Potty breaks
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.pottyBreaks.map((pb, idx) => (
                                      <Badge
                                        key={`${item.id}-potty-${idx}`}
                                        variant={
                                          pb.type === "accident"
                                            ? "destructive"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {pb.time} •{" "}
                                        {pb.type === "success"
                                          ? "Success"
                                          : "Accident"}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {item.activities.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">
                                  Highlights from the day
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {item.activities.map((activity, idx) => (
                                    <Badge
                                      key={`${item.id}-activity-${idx}`}
                                      variant="secondary"
                                    >
                                      {activity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.overallFeedback && (
                              <div className="space-y-2">
                                <p className="flex items-center gap-2 text-sm font-medium">
                                  <ClipboardCheck className="size-4" /> Overall
                                  Feedback
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {item.overallFeedback}
                                </Badge>
                              </div>
                            )}

                            {item.petConditions &&
                              Object.keys(item.petConditions).length > 0 && (
                                <div className="space-y-2">
                                  <p className="flex items-center gap-2 text-sm font-medium">
                                    <Stethoscope className="size-4" /> Pet
                                    Condition
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(item.petConditions).map(
                                      ([category, value]) => (
                                        <div
                                          key={`${item.id}-condition-${category}`}
                                          className="flex items-center justify-between rounded-md bg-white/60 px-2 py-1.5"
                                        >
                                          <span className="text-muted-foreground capitalize">
                                            {category}
                                          </span>
                                          <span className="font-medium">
                                            {value}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Quick Reply */}
                            <ReportCardQuickReply
                              reportCardId={item.id}
                              petName={item.petName}
                              serviceType={item.serviceType}
                              onReplySent={(message) => {
                                console.log("Reply sent:", message);
                              }}
                            />

                            {/* Theme label */}
                            <div className="flex justify-end pt-1">
                              <span className="text-xs text-gray-400">
                                {ts.emoji} {ts.label} Theme
                              </span>
                            </div>

                            {/* Branded footer */}
                            {reportCardConfig.brand && (
                              <div className="mt-3 border-t pt-2">
                                <ReportCardBrandedFooter
                                  brandConfig={reportCardConfig.brand}
                                  profile={businessProfile}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
