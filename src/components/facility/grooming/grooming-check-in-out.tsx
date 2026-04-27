"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";
import {
  PawPrint,
  Search,
  LogIn,
  LogOut,
  Scissors,
  Clock,
  CheckCircle2,
  Play,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { groomingQueries } from "@/lib/api/grooming";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { deductProductsForAppointment } from "@/lib/grooming-inventory-deduction";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "scheduled" | "in-progress" | "ready-for-pickup" | "completed";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Appointment card ────────────────────────────────────────────────────────

interface AppointmentCardProps {
  apt: GroomingAppointment;
  onAction: (apt: GroomingAppointment, next: GroomingStatus) => void;
}

const NEXT_STATUS: Partial<Record<GroomingStatus, { next: GroomingStatus; label: string; icon: React.ElementType; className: string }>> = {
  scheduled: {
    next: "checked-in",
    label: "Check In",
    icon: LogIn,
    className: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  "checked-in": {
    next: "in-progress",
    label: "Start Grooming",
    icon: Play,
    className: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  "in-progress": {
    next: "ready-for-pickup",
    label: "Mark Ready",
    icon: CheckCircle2,
    className: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  "ready-for-pickup": {
    next: "completed",
    label: "Check Out",
    icon: LogOut,
    className: "border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400",
  },
};

function AppointmentCard({ apt, onAction }: AppointmentCardProps) {
  const action = NEXT_STATUS[apt.status];

  return (
    <div
      className={cn(
        "group relative flex h-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-all",
        "hover:border-border hover:shadow-sm",
        apt.status === "completed" && "opacity-80",
      )}
    >
      {/* Pet avatar */}
      <div className="relative shrink-0">
        {apt.petPhotoUrl ? (
          <div className="size-12 overflow-hidden rounded-2xl ring-2 ring-background">
            <Image
              src={apt.petPhotoUrl}
              alt={apt.petName}
              width={48}
              height={48}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl ring-2 ring-background">
            <PawPrint className="size-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="min-w-0 truncate text-sm font-semibold leading-none">
            {apt.petName}
          </span>
          <span
            className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium"
            style={{ color: "#e879a0", borderColor: "#e879a040", backgroundColor: "#e879a012" }}
          >
            <Scissors className="size-3" />
            Grooming
          </span>
        </div>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {apt.ownerName}
          <span className="mx-1.5">·</span>
          <span className="inline-flex items-center gap-1">
            <Phone className="size-3" />
            {apt.ownerPhone}
          </span>
        </p>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          <span className="font-medium text-foreground/80">{apt.stylistName}</span>
          <span className="mx-1.5">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
          </span>
        </p>
        <div className="pt-0.5">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {apt.packageName}
          </Badge>
        </div>
      </div>

      {/* Action */}
      {action && (
        <div className="shrink-0">
          <Button
            size="sm"
            variant={apt.status === "ready-for-pickup" ? "outline" : "default"}
            className={cn("gap-1 text-xs", action.className)}
            onClick={(e) => {
              e.stopPropagation();
              onAction(apt, action.next);
            }}
          >
            <action.icon className="size-3.5" />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GroomingCheckInOut() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("scheduled");
  const [query, setQuery] = useState("");

  const { data: allAppointments = [] } = useQuery(groomingQueries.appointments());

  const [localStatuses, setLocalStatuses] = useState<Record<string, GroomingStatus>>({});

  const today = todayISO();

  const todayApts = useMemo(() => {
    return allAppointments
      .filter((a) => a.date === today)
      .map((a) => ({
        ...a,
        status: (localStatuses[a.id] ?? a.status) as GroomingStatus,
      }))
      .filter((a) => a.status !== "cancelled" && a.status !== "no-show");
  }, [allAppointments, today, localStatuses]);

  const counts = useMemo(() => ({
    scheduled: todayApts.filter((a) => a.status === "scheduled").length,
    inProgress: todayApts.filter((a) => a.status === "checked-in" || a.status === "in-progress").length,
    readyForPickup: todayApts.filter((a) => a.status === "ready-for-pickup").length,
    completed: todayApts.filter((a) => a.status === "completed").length,
  }), [todayApts]);

  const filteredApts = useMemo(() => {
    let base: typeof todayApts;
    if (activeTab === "scheduled") base = todayApts.filter((a) => a.status === "scheduled");
    else if (activeTab === "in-progress") base = todayApts.filter((a) => a.status === "checked-in" || a.status === "in-progress");
    else if (activeTab === "ready-for-pickup") base = todayApts.filter((a) => a.status === "ready-for-pickup");
    else base = todayApts.filter((a) => a.status === "completed");

    if (!query.trim()) return base;
    const v = query.toLowerCase();
    return base.filter(
      (a) =>
        a.petName.toLowerCase().includes(v) ||
        a.ownerName.toLowerCase().includes(v) ||
        a.ownerPhone.includes(v) ||
        a.stylistName.toLowerCase().includes(v) ||
        a.packageName.toLowerCase().includes(v),
    );
  }, [todayApts, activeTab, query]);

  function handleAction(apt: GroomingAppointment, next: GroomingStatus) {
    setLocalStatuses((prev) => ({ ...prev, [apt.id]: next }));

    const labels: Record<GroomingStatus, string> = {
      "checked-in": "Checked In",
      "in-progress": "Grooming Started",
      "ready-for-pickup": "Ready for Pickup",
      completed: "Checked Out",
      scheduled: "Scheduled",
      cancelled: "Cancelled",
      "no-show": "No Show",
    };

    // Trigger inventory deduction on checkout
    if (next === "completed") {
      const result = deductProductsForAppointment(apt, apt.stylistName);

      if (result.deductions.length > 0) {
        const deductionLines = result.deductions
          .map((d) => `${d.productName}: −${d.quantityDeducted}`)
          .join(", ");
        toast.success(`${apt.petName} — Checked Out`, {
          description: `Inventory updated: ${deductionLines}`,
          duration: 5000,
        });

        const nowLow = result.deductions.filter((d) => d.isNowLowStock && !d.wasLowStock);
        if (nowLow.length > 0) {
          setTimeout(() => {
            toast.warning("Low Stock Alert", {
              description: `${nowLow.map((d) => d.productName).join(", ")} ${nowLow.length === 1 ? "is" : "are"} now below minimum threshold.`,
              duration: 8000,
            });
          }, 600);
        }
      } else {
        toast.success(`${apt.petName} — ${labels[next]}`);
      }

      if (result.errors.length > 0) {
        result.errors.forEach((err) => {
          toast.error(`Stock deduction failed: ${err.productName}`, {
            description: err.reason,
          });
        });
      }
    } else {
      toast.success(`${apt.petName} — ${labels[next]}`);
    }
  }

  const emptyText: Record<ActiveTab, string> = {
    scheduled: "No scheduled appointments today",
    "in-progress": "No appointments in progress",
    "ready-for-pickup": "No pets ready for pickup",
    completed: "No completed appointments today",
  };

  return (
    <div className="space-y-5">
      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Today's Appointments"
          value={counts.scheduled}
          hint="Scheduled check-ins"
          icon={LogIn}
          tone="amber"
          active={activeTab === "scheduled"}
          onClick={() => setActiveTab("scheduled")}
        />
        <KpiTile
          label="In Progress"
          value={counts.inProgress}
          hint="Currently being groomed"
          icon={Scissors}
          tone="indigo"
          active={activeTab === "in-progress"}
          onClick={() => setActiveTab("in-progress")}
        />
        <KpiTile
          label="Ready for Pickup"
          value={counts.readyForPickup}
          hint="Waiting for owner"
          icon={CheckCircle2}
          tone="violet"
          active={activeTab === "ready-for-pickup"}
          onClick={() => setActiveTab("ready-for-pickup")}
        />
        <KpiTile
          label="Completed"
          value={counts.completed}
          hint="Already departed today"
          icon={LogOut}
          tone="emerald"
          active={activeTab === "completed"}
          onClick={() => setActiveTab("completed")}
        />
      </div>

      {/* ── Activity board ── */}
      <Card className="overflow-hidden border bg-card">
        <CardHeader className="relative space-y-0 overflow-hidden border-b bg-gradient-to-br from-card via-card to-pink-50/40 pb-4 dark:to-pink-950/20">
          <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-pink-200/40 via-rose-200/20 to-transparent blur-2xl dark:from-pink-500/15 dark:via-rose-500/10" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-pink-500 to-rose-500 text-white shadow-sm shadow-pink-500/20">
                <Scissors className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Grooming Activity Board
                </h3>
                <p className="text-muted-foreground text-xs">
                  Track arrivals, appointments in progress, and departures.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:flex-1 md:justify-end">
              <div className="relative w-full md:max-w-xl">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pet, owner, stylist, or phone…"
                  className="h-9 w-full pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {filteredApts.length === 0 ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
              {emptyText[activeTab]}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
              {filteredApts.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} onAction={handleAction} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
