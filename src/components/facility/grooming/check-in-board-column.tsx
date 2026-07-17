"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DoorOpen,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";

const STATUS_BADGE: Record<
  GroomingStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Booked",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  "checked-in": {
    label: "Checked In",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  "in-progress": {
    label: "In Progress",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  "ready-for-pickup": {
    label: "Ready",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
  },
  "no-show": {
    label: "No Show",
    className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
};

function checkInMinutes(apt: GroomingAppointment): number | null {
  if (!apt.checkInTime) return null;
  const d = new Date(apt.checkInTime);
  return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
}

export interface ColumnActions {
  onCheckIn: (a: GroomingAppointment) => void;
  onStart: (a: GroomingAppointment) => void;
  onMarkReady: (a: GroomingAppointment) => void;
  onCheckOut: (a: GroomingAppointment) => void;
}

// Zone 2 — one column per active stylist.
export function GroomerColumn({
  name,
  photoUrl,
  count,
  appointments,
  alertCountById,
  nowMin,
  actions,
}: {
  name: string;
  photoUrl?: string;
  count: number;
  appointments: GroomingAppointment[];
  alertCountById: Record<string, number>;
  nowMin: number | null;
  actions: ColumnActions;
}) {
  return (
    <div className="bg-muted/20 flex w-72 shrink-0 flex-col rounded-xl border">
      <div className="flex items-center gap-2.5 border-b px-3 py-2.5">
        <div className="ring-background relative size-8 shrink-0 overflow-hidden rounded-full bg-pink-100 ring-2 dark:bg-pink-950/40">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xs font-bold text-pink-700 dark:text-pink-300">
              {name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-muted-foreground text-[11px]">
            {count} appointment{count === 1 ? "" : "s"} today
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {appointments.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            Nothing on the schedule.
          </p>
        ) : (
          appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              apt={a}
              alertCount={alertCountById[a.id] ?? 0}
              nowMin={nowMin}
              actions={actions}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AppointmentCard({
  apt,
  alertCount,
  nowMin,
  actions,
}: {
  apt: GroomingAppointment;
  alertCount: number;
  nowMin: number | null;
  actions: ColumnActions;
}) {
  const badge = STATUS_BADGE[apt.status];
  const startMin = checkInMinutes(apt);
  const elapsed =
    apt.status === "in-progress" &&
    nowMin !== null &&
    startMin !== null &&
    nowMin >= startMin
      ? nowMin - startMin
      : null;

  return (
    <div className="bg-card rounded-lg border p-2.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="ring-background relative size-9 shrink-0 overflow-hidden rounded-full ring-2">
          {apt.petPhotoUrl ? (
            <Image
              src={apt.petPhotoUrl}
              alt={apt.petName}
              fill
              className="object-cover"
            />
          ) : (
            <span className="bg-muted flex size-full items-center justify-center">
              <PawPrint className="text-muted-foreground size-4" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{apt.petName}</p>
            <span className="text-muted-foreground shrink-0 text-[10px] font-semibold tabular-nums">
              {apt.startTime}
            </span>
          </div>
          <p className="text-muted-foreground truncate text-[11px]">
            {apt.petBreed} · {apt.ownerName}
          </p>
          <a
            href={`tel:${apt.ownerPhone}`}
            className="text-muted-foreground hover:text-foreground mt-0.5 inline-flex items-center gap-1 text-[11px]"
          >
            <Phone className="size-2.5" />
            {apt.ownerPhone}
          </a>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          <Scissors className="size-2.5" />
          {apt.packageName}
        </span>
        {elapsed !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
            <Clock className="size-2.5" />
            {elapsed}m
          </span>
        )}
        {alertCount > 0 && (
          <span
            title={`${alertCount} alert note${alertCount > 1 ? "s" : ""}`}
            className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
          >
            <AlertTriangle className="size-2.5" />
            {alertCount}
          </span>
        )}
      </div>

      {/* Status-driven action */}
      <div className="mt-2 flex gap-1.5">
        {apt.status === "scheduled" && (
          <Button
            size="sm"
            className="h-7 flex-1 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={() => actions.onCheckIn(apt)}
          >
            <LogIn className="size-3.5" />
            Check In
          </Button>
        )}
        {apt.status === "checked-in" && (
          <Button
            size="sm"
            className="h-7 flex-1 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={() => actions.onStart(apt)}
          >
            <DoorOpen className="size-3.5" />
            Start
          </Button>
        )}
        {apt.status === "in-progress" && (
          <Button
            size="sm"
            className="h-7 flex-1 gap-1.5 bg-purple-600 text-xs text-white hover:bg-purple-700"
            onClick={() => actions.onMarkReady(apt)}
          >
            <Sparkles className="size-3.5" />
            Mark Ready
          </Button>
        )}
        {apt.status === "ready-for-pickup" && (
          <Button
            size="sm"
            className="h-7 flex-1 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={() => actions.onCheckOut(apt)}
          >
            <LogOut className="size-3.5" />
            Check Out
          </Button>
        )}
        {apt.status === "completed" && (
          <span className="text-muted-foreground flex flex-1 items-center justify-center gap-1 text-[11px] font-medium">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Done
          </span>
        )}
      </div>
    </div>
  );
}
