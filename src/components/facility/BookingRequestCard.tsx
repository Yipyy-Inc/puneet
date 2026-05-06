"use client";

import * as React from "react";
import {
  Check,
  X,
  Hourglass,
  Calendar,
} from "lucide-react";

import type { BookingRequest, BookingRequestService } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { BookingRequestDetailDialog } from "@/components/facility/BookingRequestDetailDialog";
import { cn } from "@/lib/utils";

const SERVICE_LABEL: Record<BookingRequestService, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
};

const SERVICE_DOT: Record<BookingRequestService, string> = {
  daycare: "bg-amber-500",
  boarding: "bg-violet-500",
  grooming: "bg-pink-500",
  training: "bg-orange-500",
};

function relativeTime(iso: string, now = new Date()): string {
  const diffMin = Math.floor((+now - +new Date(iso)) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatAppointment(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export interface BookingRequestCardProps {
  request: BookingRequest;
  variant?: "pending" | "waitlist";
  onSchedule: (req: BookingRequest) => void;
  onDecline: (req: BookingRequest) => void;
  onWaitlist?: (req: BookingRequest) => void;
}

export function BookingRequestCard({
  request,
  variant = "pending",
  onSchedule,
  onDecline,
  onWaitlist,
}: BookingRequestCardProps) {
  const initial = request.petName.charAt(0).toUpperCase();
  const appt = formatAppointment(request.appointmentAt);
  const submitted = relativeTime(request.createdAt);
  const primary = request.services[0];
  const extra = request.services.length - 1;
  const [detailOpen, setDetailOpen] = React.useState(false);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
        className="bg-card hover:shadow-md focus-visible:ring-ring/50 group cursor-pointer rounded-2xl p-5 text-left shadow-sm transition-all duration-200 outline-none hover:-translate-y-0.5 focus-visible:ring-[3px]"
      >
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-sm font-semibold">
              {request.petName}
            </div>
            <div className="text-muted-foreground shrink-0 text-[11px]">
              {submitted}
            </div>
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {request.clientName}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("size-1.5 rounded-full", SERVICE_DOT[primary])}
            aria-hidden
          />
          <span className="text-foreground/80 font-medium">
            {SERVICE_LABEL[primary]}
            {extra > 0 && (
              <span className="text-muted-foreground"> +{extra}</span>
            )}
          </span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3" />
          <span className="text-foreground/80 tabular-nums">
            {appt.date}, {appt.time}
          </span>
        </div>
      </div>

      {request.notes && (
        <div className="text-muted-foreground mt-3 line-clamp-2 text-xs/relaxed">
          {request.notes}
        </div>
      )}

      <div
        className="mt-4 flex items-center justify-end gap-1.5"
        onClick={stop}
      >
        <Button
          size="sm"
          onClick={(e) => {
            stop(e);
            onSchedule(request);
          }}
          className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30 h-8 shadow-none"
        >
          <Check className="size-3.5" />
          Schedule
        </Button>
        {onWaitlist && variant === "pending" && (
          <Button
            size="sm"
            onClick={(e) => {
              stop(e);
              onWaitlist(request);
            }}
            className="bg-warning/10 text-warning hover:bg-warning/20 focus-visible:ring-warning/30 h-8 border-0 shadow-none"
            title="Move to waitlist"
          >
            <Hourglass className="size-3.5" />
            Waitlist
          </Button>
        )}
        <Button
          size="icon-sm"
          onClick={(e) => {
            stop(e);
            onDecline(request);
          }}
          className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 size-8 text-white shadow-none"
          title="Decline request"
          aria-label="Decline request"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      </div>

      <BookingRequestDetailDialog
        request={request}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        variant={variant}
        onSchedule={onSchedule}
        onDecline={onDecline}
        onWaitlist={onWaitlist}
      />
    </>
  );
}
