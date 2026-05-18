"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Repeat,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { trainers } from "@/data/training";
import { getDayName, type TrainingSeries } from "@/lib/training-series";

interface Props {
  series: TrainingSeries;
  /** Already-enrolled pet names for this series, for the "Enrolled: …" pill. */
  enrolledPetNames: string[];
  /** Computed spots-remaining count. */
  spotsLeft: number;
  /** Used to defer the "Starts {date}" string until after hydration so SSR
   *  and CSR don't disagree on timezones. */
  isMounted: boolean;
  /** When true (facility allows drop-ins + series has `allowDropIns`), the
   *  drop-in CTA renders alongside the primary action. */
  dropInsEnabled: boolean;
  onEnroll: () => void;
  onWaitlist: () => void;
  onDetails: () => void;
  onBookDropIn: () => void;
}

function formatStartDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function CustomerTrainingSeriesCard({
  series,
  enrolledPetNames,
  spotsLeft,
  isMounted,
  dropInsEnabled,
  onEnroll,
  onWaitlist,
  onDetails,
  onBookDropIn,
}: Props) {
  const isFull = spotsLeft === 0;
  const isAlmostFull = !isFull && spotsLeft <= 3;

  // Pull the canonical trainer record by id so we can show a real photo
  // rather than the denormalized name string the series carries. Fall back
  // to series.instructorName when the lookup misses.
  const trainerById = useMemo(() => new Map(trainers.map((t) => [t.id, t])), []);
  const trainer = trainerById.get(series.instructorId);
  const displayName = trainer?.name ?? series.instructorName;
  const photoUrl = trainer?.photoUrl;
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Spots badge tone — emerald when plenty, amber when ≤3, rose when 0.
  const spotsCls = isFull
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : isAlmostFull
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const startsLabel = isMounted ? formatStartDate(series.startDate) : "";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{series.seriesName}</CardTitle>
        <ul className="space-y-1.5 pt-1 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground size-4" />
            <span>
              Starts{" "}
              <span className="font-semibold text-slate-900">
                {startsLabel}
              </span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Repeat className="text-muted-foreground size-4" />
            <span>
              {getDayName(series.dayOfWeek)}s · {formatTime(series.startTime)}
              {series.numberOfWeeks > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  · {series.numberOfWeeks} weeks
                </span>
              )}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            <span>{series.location}</span>
          </li>
          <li className="flex items-center gap-2 pt-0.5">
            <InstructorAvatar
              name={displayName}
              photoUrl={photoUrl}
              initials={initials}
            />
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Instructor
              </span>
              <span className="block truncate text-sm font-medium text-slate-800">
                {displayName}
              </span>
            </span>
          </li>
        </ul>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-end space-y-3 pt-0">
        <div>
          <Badge
            variant="outline"
            className={cn("gap-1 border", spotsCls)}
          >
            <Users className="size-3" />
            {isFull
              ? `Full — ${series.maxCapacity} of ${series.maxCapacity} enrolled`
              : `${spotsLeft} of ${series.maxCapacity} spots left`}
          </Badge>
        </div>

        {enrolledPetNames.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-2 text-sm">
            <div className="text-primary flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" />
              Enrolled: {enrolledPetNames.join(", ")}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-1.5">
          {isFull ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={onWaitlist}
            >
              <Clock className="mr-2 size-4" />
              Join Waitlist
            </Button>
          ) : (
            <Button className="w-full" onClick={onEnroll}>
              Enroll
            </Button>
          )}
          {dropInsEnabled && !isFull && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              onClick={onBookDropIn}
            >
              <Ticket className="size-4" />
              Book Drop-In Session
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 w-full gap-1 text-[12px]"
            onClick={onDetails}
          >
            <Info className="size-3.5" />
            View course details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InstructorAvatar({
  name,
  photoUrl,
  initials,
}: {
  name: string;
  photoUrl?: string;
  initials: string;
}) {
  if (photoUrl) {
    return (
      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-white shadow-sm">
        <Image
          src={photoUrl}
          alt={name}
          width={36}
          height={36}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 ring-2 ring-white shadow-sm">
      {initials || <User className="size-4" />}
    </div>
  );
}
