"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Clock,
  Scissors,
  Home,
  GraduationCap,
  Calendar,
  Dog,
  Inbox,
} from "lucide-react";
import type {
  UnfinishedBooking,
  AbandonmentStep,
} from "@/types/unfinished-booking";
import { ABANDONMENT_STEP_LABELS } from "@/data/unfinished-bookings";

interface Props {
  bookings: UnfinishedBooking[];
}

function getServiceIcon(service?: string) {
  switch (service?.toLowerCase()) {
    case "grooming":
      return Scissors;
    case "boarding":
      return Home;
    case "training":
      return GraduationCap;
    case "daycare":
      return Dog;
    default:
      return Calendar;
  }
}

function ProgressBar({ step }: { step: AbandonmentStep }) {
  const { label, progress } = ABANDONMENT_STEP_LABELS[step];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Left at: <span className="text-foreground font-medium">{label}</span>
        </span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString);
  const now = new Date("2026-04-11T00:00:00Z");
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH} hours ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CustomerUnfinishedBookings({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="py-16 text-center">
        <Inbox className="text-muted-foreground mx-auto mb-4 size-12" />
        <h3 className="mb-2 text-lg font-semibold">No unfinished bookings</h3>
        <p className="text-muted-foreground text-sm">
          Any reservation you start but don&apos;t complete will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contextual nudge */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
        <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          You have <span className="font-semibold">{bookings.length}</span>{" "}
          unfinished {bookings.length === 1 ? "reservation" : "reservations"}.
          Pick up where you left off — your details are saved.
        </p>
      </div>

      <div className="grid gap-4">
        {bookings.map((booking) => {
          const ServiceIcon = getServiceIcon(booking.service);

          return (
            <Card
              key={booking.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Service icon + info */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <ServiceIcon className="size-5 text-amber-600" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold capitalize">
                          {booking.service ?? "Reservation"}
                          {booking.serviceType && (
                            <span className="text-muted-foreground ml-1 font-normal">
                              · {booking.serviceType.replace(/_/g, " ")}
                            </span>
                          )}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        >
                          Unfinished
                        </Badge>
                      </div>

                      {booking.petName && (
                        <p className="text-muted-foreground text-sm">
                          For{" "}
                          <span className="text-foreground font-medium">
                            {booking.petName}
                          </span>
                          {booking.petType && (
                            <span className="capitalize">
                              {" "}
                              · {booking.petType}
                            </span>
                          )}
                        </p>
                      )}

                      {booking.requestedStartDate && (
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <Calendar className="size-3.5" />
                          {formatDate(booking.requestedStartDate)}
                          {booking.requestedEndDate &&
                            booking.requestedEndDate !==
                              booking.requestedStartDate && (
                              <> → {formatDate(booking.requestedEndDate)}</>
                            )}
                        </p>
                      )}

                      <ProgressBar step={booking.abandonmentStep} />

                      <p className="text-muted-foreground text-xs">
                        Started {formatRelativeTime(booking.abandonedAt)}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    <Button asChild size="sm" className="gap-1.5">
                      <Link
                        href={`/customer/bookings/new${booking.service ? `?service=${booking.service}` : ""}`}
                      >
                        Resume
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
