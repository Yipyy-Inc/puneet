"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { reportCards, markReportCardViewed } from "@/data/pet-data";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Dog,
  FileText,
  Search,
  X,
  ArrowUpDown,
  ArrowDownUp,
  Heart,
} from "lucide-react";
import { ReportCardSummary } from "@/components/customer/report-cards/report-card-summary";
import { ReportCardDetail } from "@/components/customer/report-cards/report-card-detail";
import type { ReportCardTimelineItem } from "@/components/customer/report-cards/report-card-shared";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

// Service-type filter chips — value matches ReportCard.serviceType.
const SERVICE_FILTERS = [
  { value: "all", label: "All" },
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
] as const;

type Client = (typeof clients)[number];

export default function CustomerReportCardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [favIds, setFavIds] = useState<Set<string>>(
    () => new Set(reportCards.filter((c) => c.favourite).map((c) => c.id)),
  );

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
    // Show all report cards for this customer's pets, regardless of facility.
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

    if (selectedPetId !== "all") {
      filtered = filtered.filter(
        (card) => card.petId === parseInt(selectedPetId),
      );
    }

    if (selectedService !== "all") {
      filtered = filtered.filter(
        (card) => card.serviceType === selectedService,
      );
    }

    // Favourites only — reflects the live (heart-toggled) favourite state.
    if (favOnly) {
      filtered = filtered.filter((card) => favIds.has(card.id));
    }

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

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === "date-desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [
    customerReportCards,
    selectedPetId,
    selectedService,
    favOnly,
    favIds,
    searchQuery,
    sortBy,
    petById,
  ]);

  const timelineItems = useMemo<ReportCardTimelineItem[]>(() => {
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

  const openItem = useMemo(
    () => timelineItems.find((i) => i.id === openId) ?? null,
    [timelineItems, openId],
  );

  const openDetail = (id: string) => {
    setOpenId(id);
    // Persist "viewed" (F1) so dashboard/sidebar notifications auto-dismiss.
    markReportCardViewed(id);
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Deep link: ?report=<id> opens that report directly (from a notification).
  const deepLinkId = searchParams.get("report");
  const appliedDeepLink = useRef(false);
  useEffect(() => {
    if (appliedDeepLink.current || !deepLinkId) return;
    if (!customerReportCards.some((c) => c.id === deepLinkId)) return;
    appliedDeepLink.current = true;
    setOpenId(deepLinkId);
    markReportCardViewed(deepLinkId);
    setReadIds((prev) => new Set(prev).add(deepLinkId));
  }, [deepLinkId, customerReportCards]);

  const toggleFavourite = (id: string) => {
    const nowFavourite = !favIds.has(id);
    // Persist to the report card (F1) so it survives navigation, mock-store style.
    const card = reportCards.find((c) => c.id === id);
    if (card) card.favourite = nowFavourite;
    setFavIds((prev) => {
      const next = new Set(prev);
      if (nowFavourite) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const hasActiveFilters =
    selectedPetId !== "all" ||
    selectedService !== "all" ||
    favOnly ||
    searchQuery;

  const clearFilters = () => {
    setSelectedPetId("all");
    setSelectedService("all");
    setFavOnly(false);
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
        <div className="border-primary/20 bg-card overflow-hidden rounded-2xl border shadow-sm">
          {/* Search + Sort */}
          <div className="flex items-center gap-3 px-5 py-3">
            <Search className="text-primary/40 size-4 shrink-0" />
            <Input
              placeholder="Search by pet, notes, or activity…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="placeholder:text-muted-foreground/40 h-auto flex-1 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
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
                <span className="text-muted-foreground w-14 shrink-0 text-[10px] font-semibold tracking-widest uppercase">
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

            {/* Service type */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground w-14 shrink-0 text-[10px] font-semibold tracking-widest uppercase">
                Service
              </span>
              {SERVICE_FILTERS.map((svc) => (
                <button
                  key={svc.value}
                  onClick={() => setSelectedService(svc.value)}
                  className={pillClass(selectedService === svc.value)}
                >
                  {svc.label}
                </button>
              ))}
            </div>

            {/* Show */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground w-14 shrink-0 text-[10px] font-semibold tracking-widest uppercase">
                Show
              </span>
              <button
                onClick={() => setFavOnly((v) => !v)}
                className={pillClass(favOnly)}
                aria-pressed={favOnly}
              >
                <Heart className={cn("size-3", favOnly && "fill-current")} />
                Favourites
              </button>
            </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            {timelineItems.map((item) => (
              <ReportCardSummary
                key={item.id}
                item={item}
                favourite={favIds.has(item.id)}
                unread={
                  item.reportCard.viewedByCustomer === false &&
                  !readIds.has(item.id)
                }
                onToggleFavourite={() => toggleFavourite(item.id)}
                onOpen={() => openDetail(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      <Sheet
        open={openId !== null}
        onOpenChange={(o) => {
          if (!o) setOpenId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>
              {openItem ? `${openItem.petName}'s report card` : "Report card"}
            </SheetTitle>
          </SheetHeader>
          {openItem && (
            <div className="p-4">
              <ReportCardDetail
                item={openItem}
                favourite={favIds.has(openItem.id)}
                onToggleFavourite={() => toggleFavourite(openItem.id)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
