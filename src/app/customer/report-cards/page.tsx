"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { reportCards, type ReportCard } from "@/data/pet-data";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Dog,
  FileText,
  Image as ImageIcon,
  Clock,
  Utensils,
  Droplets,
  Search,
  Filter,
  X,
  Sparkles,
  Star,
  Bell,
  Ghost,
  Egg,
  PartyPopper,
  Heart,
  ClipboardCheck,
  Stethoscope,
} from "lucide-react";
import { ReportCardPhotoGallery } from "@/components/customer/ReportCardPhotoGallery";
import { ReportCardQuickReply } from "@/components/customer/ReportCardQuickReply";

/* ── Report-card theme visuals ────────────────────────────────────── */
const themeStyles: Record<string, { label: string; emoji: string; cardBg: string; accentBg: string; accentText: string; DecorativeIcon: React.ComponentType<{ className?: string }>; iconPos: string }> = {
  everyday:     { label: "Everyday",     emoji: "✨", cardBg: "bg-slate-50",  accentBg: "bg-slate-600",  accentText: "text-white", DecorativeIcon: Star,        iconPos: "-top-1 -right-1" },
  christmas:    { label: "Christmas",    emoji: "🎄", cardBg: "bg-red-50",    accentBg: "bg-red-600",    accentText: "text-white", DecorativeIcon: Bell,        iconPos: "-top-1 -right-1" },
  halloween:    { label: "Halloween",    emoji: "🎃", cardBg: "bg-orange-50",  accentBg: "bg-violet-700", accentText: "text-white", DecorativeIcon: Ghost,       iconPos: "-top-1 -right-1" },
  easter:       { label: "Easter",       emoji: "🐣", cardBg: "bg-pink-50",   accentBg: "bg-pink-500",   accentText: "text-white", DecorativeIcon: Egg,         iconPos: "-bottom-1 -right-1" },
  thanksgiving: { label: "Thanksgiving", emoji: "🦃", cardBg: "bg-amber-50",  accentBg: "bg-amber-600",  accentText: "text-white", DecorativeIcon: Star,        iconPos: "-top-1 -right-1" },
  new_year:     { label: "New Year",     emoji: "🎉", cardBg: "bg-indigo-50", accentBg: "bg-indigo-600", accentText: "text-white", DecorativeIcon: PartyPopper, iconPos: "-top-1 -right-1" },
  valentines:   { label: "Valentine's",  emoji: "💘", cardBg: "bg-rose-50",   accentBg: "bg-rose-500",   accentText: "text-white", DecorativeIcon: Heart,       iconPos: "-top-1 -right-1" },
  summer:       { label: "Summer",       emoji: "☀️", cardBg: "bg-sky-50",    accentBg: "bg-sky-500",    accentText: "text-white", DecorativeIcon: Star,        iconPos: "-top-1 -right-1" },
  winter:       { label: "Winter",       emoji: "❄️", cardBg: "bg-blue-50",   accentBg: "bg-blue-600",   accentText: "text-white", DecorativeIcon: Star,        iconPos: "-top-1 -right-1" },
};

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type Client = (typeof clients)[number];

export default function CustomerReportCardsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc");

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  const customerPetIds = useMemo(() => customer?.pets.map((p) => p.id) ?? [], [customer]);

  const customerReportCards = useMemo(() => {
    if (!customer) return [] as typeof reportCards;

    // Show all report cards for this customer's pets,
    // regardless of facility, so examples are always visible.
    return reportCards.filter((card) => customerPetIds.includes(card.petId));
  }, [customer, customerPetIds]);

  const facilityName = selectedFacility
    ? selectedFacility.name
    : customer?.facility ?? "Your Facility";

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
      filtered = filtered.filter((card) => card.petId === parseInt(selectedPetId));
    }

    // Filter by service type
    if (selectedServiceType !== "all") {
      filtered = filtered.filter((card) => card.serviceType === selectedServiceType);
    }

    // Filter by date range
    if (dateRangeStart) {
      filtered = filtered.filter((card) => card.date >= dateRangeStart);
    }
    if (dateRangeEnd) {
      filtered = filtered.filter((card) => card.date <= dateRangeEnd);
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
  }, [customerReportCards, selectedPetId, selectedServiceType, dateRangeStart, dateRangeEnd, searchQuery, sortBy, petById]);

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
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getThemeBadge = (theme?: string) => {
    if (!theme || theme === "everyday") return null;
    
    const themeLabels: Record<string, string> = {
      halloween: "🎃 Halloween",
      christmas: "🎄 Christmas",
      valentines: "💝 Valentine's",
      easter: "🐰 Easter",
      summer: "☀️ Summer",
      winter: "❄️ Winter",
    };

    return (
      <Badge variant="outline" className="text-xs">
        <Sparkles className="h-3 w-3 mr-1" />
        {themeLabels[theme] || theme}
      </Badge>
    );
  };

  const hasActiveFilters = selectedPetId !== "all" || selectedServiceType !== "all" || dateRangeStart || dateRangeEnd || searchQuery;

  const clearFilters = () => {
    setSelectedPetId("all");
    setSelectedServiceType("all");
    setDateRangeStart("");
    setDateRangeEnd("");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Report Cards History</h1>
          <p className="text-muted-foreground">
            A warm timeline of your pet's stays at {facilityName}.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters & Search
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by pet name, notes, activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Pet Filter */}
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger>
                  <SelectValue placeholder="All pets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pets</SelectItem>
                  {customer?.pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Service Type Filter */}
              <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  <SelectItem value="daycare">Daycare</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date-desc" | "date-asc")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {timelineItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="font-semibold">
                {hasActiveFilters ? "No report cards match your filters" : "No report cards yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Once your pet visits the facility, their report cards will appear here as a memory timeline."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-9rem)] pr-4">
            <div className="relative pl-4">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" aria-hidden="true" />

              <div className="space-y-6">
                {timelineItems.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-3">
                      <div className="h-3 w-3 rounded-full bg-primary shadow-sm" />
                      {index !== timelineItems.length - 1 && (
                        <div className="flex-1 w-px bg-border/40" />
                      )}
                    </div>

                    {/* Themed Card */}
                    {(() => {
                      const ts = themeStyles[item.theme || "everyday"] ?? themeStyles.everyday;
                      const { DecorativeIcon } = ts;
                      return (
                        <div className={`flex-1 relative overflow-hidden rounded-xl border ${ts.cardBg}`}>
                          {/* Decorative corner icon */}
                          <DecorativeIcon
                            className={`absolute h-20 w-20 opacity-[0.06] text-gray-900 ${ts.iconPos}`}
                          />

                          {/* Themed accent header */}
                          <div className={`relative px-5 py-3 ${ts.accentBg} ${ts.accentText} flex items-start justify-between gap-4`}>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg">{ts.emoji}</span>
                                <p className="text-base font-bold">
                                  {item.petName}&apos;s {item.serviceType} day
                                </p>
                                <Badge className="bg-white/20 text-white border-0 capitalize text-xs">
                                  {item.mood}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs opacity-80">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {formatDate(item.date)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {formatTime(item.timeLabel)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Dog className="h-3 w-3" /> {item.facilityName}
                                </span>
                              </div>
                            </div>

                            {item.petImage && (
                              <div className="hidden sm:block h-14 w-14 rounded-full bg-white/20 overflow-hidden border-2 border-white/30 shrink-0">
                                <img
                                  src={item.petImage}
                                  alt={item.petName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {/* Card body */}
                          <div className="relative p-4 space-y-4">
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
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Utensils className="h-4 w-4" /> Meals
                                </p>
                                <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                                  {item.meals.map((meal, idx) => (
                                    <div
                                      key={`${item.id}-meal-${idx}`}
                                      className="flex flex-wrap items-center gap-2 justify-between"
                                    >
                                      <span className="font-medium">{meal.time}</span>
                                      <span className="flex-1 min-w-[140px]">
                                        {meal.food}
                                      </span>
                                      <span>{meal.amount}</span>
                                      <span className="px-2 py-0.5 rounded-full bg-white capitalize text-[0.7rem]">
                                        Ate {meal.consumed}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.pottyBreaks && item.pottyBreaks.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Droplets className="h-4 w-4" /> Potty breaks
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {item.pottyBreaks.map((pb, idx) => (
                                    <Badge
                                      key={`${item.id}-potty-${idx}`}
                                      variant={pb.type === "accident" ? "destructive" : "secondary"}
                                      className="text-xs"
                                    >
                                      {pb.time} •{" "}
                                      {pb.type === "success" ? "Success" : "Accident"}
                                    </Badge>
                                  ))}
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
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <ClipboardCheck className="h-4 w-4" /> Overall Feedback
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {item.overallFeedback}
                                </Badge>
                              </div>
                            )}

                            {item.petConditions && Object.keys(item.petConditions).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Stethoscope className="h-4 w-4" /> Pet Condition
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(item.petConditions).map(([category, value]) => (
                                    <div key={`${item.id}-condition-${category}`} className="flex items-center justify-between rounded-md bg-white/60 px-2 py-1.5">
                                      <span className="text-muted-foreground capitalize">{category}</span>
                                      <span className="font-medium">{value}</span>
                                    </div>
                                  ))}
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
