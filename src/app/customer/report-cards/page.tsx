"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useSearchParams } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useQuery } from "@tanstack/react-query";
import {
  reportCardQueries,
  markReportCardViewed,
  setReportCardFavourite,
} from "@/lib/api/report-cards";
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
import {
  buildTimelineItem,
  type ReportCardTimelineItem,
} from "@/components/customer/report-cards/report-card-shared";
import { toast } from "sonner";

// Service-type filter chips — value matches ReportCard.serviceType.
const SERVICE_FILTERS = [
  { value: "all", label: "All" },
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
] as const;

/** The signed-in customer's own pet shape, from the live record. */
type CustomerPet = NonNullable<
  ReturnType<typeof useCurrentCustomer>["client"]
>["pets"][number];

export default function CustomerReportCardsPage() {
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility } = useCustomerFacility();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // ── The cards, from Postgres ────────────────────────────────────────────
  //
  // `mine()` asks for SENT cards only. No filtering by pet ownership happens
  // here and none should: RLS admits a client to their own cards and to
  // nobody else's, so the previous `customerPetIds.includes(...)` pass was
  // doing in the browser what the database already guarantees — and doing it
  // against a fixture that contained other people's dogs.
  const {
    data: cards = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(reportCardQueries.mine());

  // Favourites live on the row. Seeded from the server and updated optimistically
  // so the heart responds immediately; the write is what makes it true.
  const favIds = useMemo(
    () => new Set(cards.filter((c) => c.favourite).map((c) => c.id)),
    [cards],
  );
  const [pendingFav, setPendingFav] = useState<Map<string, boolean>>(new Map());
  const isFavourite = (id: string) => pendingFav.get(id) ?? favIds.has(id);

  const customerReportCards = cards;

  const facilityName = selectedFacility
    ? selectedFacility.name
    : (customer?.facility ?? "Your Facility");

  const petById = useMemo(() => {
    const map = new Map<number, CustomerPet>();
    customer?.pets.forEach((pet) => map.set(pet.id, pet));
    return map;
  }, [customer]);

  // Filter and sort report cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = [...customerReportCards];

    if (selectedPetId !== "all") {
      filtered = filtered.filter(
        (card) => card.petRef === parseInt(selectedPetId),
      );
    }

    if (selectedService !== "all") {
      filtered = filtered.filter(
        (card) => card.serviceType === selectedService,
      );
    }

    // Favourites only — reflects the live (heart-toggled) favourite state.
    if (favOnly) {
      filtered = filtered.filter((card) => isFavourite(card.id));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Searches what the facility WROTE. The old version searched
      // `staffNotes` and an `activities` array that no card has ever carried,
      // so the only field that could ever match was the service type.
      filtered = filtered.filter((card) => {
        const haystack = [
          card.petName ?? "",
          card.serviceType,
          Object.values(card.generated).filter(Boolean).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.visitDate).getTime();
      const dateB = new Date(b.visitDate).getTime();
      return sortBy === "date-desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customerReportCards,
    selectedPetId,
    selectedService,
    favOnly,
    favIds,
    pendingFav,
    searchQuery,
    sortBy,
  ]);

  const timelineItems = useMemo<ReportCardTimelineItem[]>(
    () =>
      filteredAndSortedCards.map((card) =>
        buildTimelineItem(card, {
          facilityName,
          petImage: card.petRef
            ? petById.get(card.petRef)?.imageUrl
            : undefined,
        }),
      ),
    [filteredAndSortedCards, petById, facilityName],
  );

  const openItem = useMemo(
    () => timelineItems.find((i) => i.id === openId) ?? null,
    [timelineItems, openId],
  );

  const openDetail = (id: string) => {
    setOpenId(id);
    // Persist "viewed" (F1) so dashboard/sidebar notifications auto-dismiss.
    // Fire and forget: "the owner opened it" is worth recording but not worth
    // interrupting them over, and the function coalesces so a repeat is a no-op.
    void markReportCardViewed(id).catch(() => {});
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
    void markReportCardViewed(deepLinkId).catch(() => {});
    setReadIds((prev) => new Set(prev).add(deepLinkId));
  }, [deepLinkId, customerReportCards]);

  const toggleFavourite = async (id: string) => {
    const nowFavourite = !isFavourite(id);

    // Optimistic, then reconciled. Previously this MUTATED the fixture row in
    // place — `card.favourite = nowFavourite` on an imported module — which
    // survived navigation only because the module did, and was gone on reload.
    setPendingFav((prev) => new Map(prev).set(id, nowFavourite));
    try {
      await setReportCardFavourite(id, nowFavourite);
      await refetch();
    } catch {
      // Put it back. A heart that stays filled after the write was refused is
      // the same lie in miniature as a delivery that never happened.
      setPendingFav((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      toast.error("That could not be saved.");
    }
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

        {/* Loading and failure are DISTINCT from empty, and all three are
            distinct from "here are somebody else's cards". This page no longer
            falls back to a fixture, so a failed load says so. */}
        {isLoading ? (
          <Card>
            <CardContent className="space-y-3 py-12 text-center">
              <div
                data-slot="skeleton"
                className="bg-muted mx-auto h-12 w-12 animate-pulse rounded-full"
              />
              <p className="text-muted-foreground text-sm">
                Loading your report cards…
              </p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="space-y-3 py-12 text-center">
              <FileText className="mx-auto size-12 text-red-500 opacity-70" />
              <p className="font-semibold">
                Your report cards could not be loaded
              </p>
              <p className="text-muted-foreground text-sm">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong."}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : timelineItems.length === 0 ? (
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
                favourite={isFavourite(item.id)}
                // Unread is "the row has never been viewed", which the database
                // now answers directly. `viewedByCustomer === false` could only
                // ever be true of a fixture that set the flag explicitly.
                unread={item.card.viewedAt == null && !readIds.has(item.id)}
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
