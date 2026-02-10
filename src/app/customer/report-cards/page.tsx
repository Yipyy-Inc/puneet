"use client";

import { useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { reportCards } from "@/data/pet-data";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Dog,
  FileText,
  Image as ImageIcon,
  Clock,
  Utensils,
  Droplets,
} from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type Client = (typeof clients)[number];

export default function CustomerReportCardsPage() {
  const { selectedFacility } = useCustomerFacility();

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

  const timelineItems = useMemo(() => {
    return [...customerReportCards]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((card) => {
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
        };
      });
  }, [customerReportCards, petById, facilityName]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Report Cards History</h1>
          <p className="text-muted-foreground">
            A warm timeline of your pet's stays at {facilityName}.
          </p>
        </div>

        {timelineItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="font-semibold">No report cards yet</p>
              <p className="text-sm text-muted-foreground">
                Once your pet visits the facility, their report cards will appear here as a memory timeline.
              </p>
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

                    {/* Card */}
                    <Card className="flex-1 overflow-hidden">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span>{item.petName}'s {item.serviceType} day</span>
                            <Badge variant="outline" className="capitalize">
                              {item.mood}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(item.date)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> {formatTime(item.timeLabel)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Dog className="h-3 w-3" /> {item.facilityName}
                            </span>
                          </CardDescription>
                        </div>

                        {item.petImage && (
                          <div className="hidden sm:block h-14 w-14 rounded-full bg-muted overflow-hidden border">
                            <img
                              src={item.petImage}
                              alt={item.petName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {item.photos.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" /> Photos from this stay
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {item.photos.map((photo, idx) => (
                                <div
                                  key={`${item.id}-photo-${idx}`}
                                  className="aspect-[4/3] rounded-lg overflow-hidden bg-muted"
                                >
                                  <img
                                    src={photo}
                                    alt={`${item.petName} at the facility`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
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
                                  <span className="px-2 py-0.5 rounded-full bg-muted capitalize text-[0.7rem]">
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
                      </CardContent>
                    </Card>
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
