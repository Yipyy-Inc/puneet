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
  AlertTriangle,
  MapPin,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { canMarkReadyForPickup, groomingQueries } from "@/lib/api/grooming";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { deductProductsForAppointment } from "@/lib/grooming-inventory-deduction";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import {
  CheckInConfirmationDialog,
  type CheckInConfirmation,
} from "./check-in-confirmation-dialog";

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

/**
 * Surface anything a groomer needs to see *before* opening the booking:
 * allergies, written-in care notes, behavior flags, or coat condition warnings.
 * Returns a summary string for the tooltip when there's at least one item.
 */
function getAppointmentAlerts(apt: GroomingAppointment): string | null {
  const items: string[] = [];
  if (apt.allergies.length > 0) {
    items.push(`Allergies: ${apt.allergies.join(", ")}`);
  }
  if (apt.specialInstructions?.trim()) {
    items.push(apt.specialInstructions.trim());
  }
  if (apt.intake?.behaviorNotes?.trim()) {
    items.push(`Behavior: ${apt.intake.behaviorNotes.trim()}`);
  }
  if (apt.intake?.coatCondition && apt.intake.coatCondition !== "normal") {
    items.push(
      `Coat: ${apt.intake.coatCondition.replace(/-/g, " ")}`,
    );
  }
  return items.length > 0 ? items.join(" · ") : null;
}

// ─── Appointment card ────────────────────────────────────────────────────────

interface AppointmentCardProps {
  apt: GroomingAppointment;
  stationName?: string;
  /** ISO timestamp captured when the pickup notification was sent. */
  notifiedAt?: string;
  onAction: (apt: GroomingAppointment, next: GroomingStatus) => void;
  onNotify: (apt: GroomingAppointment) => void;
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
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
};

function AppointmentCard({
  apt,
  stationName,
  notifiedAt,
  onAction,
  onNotify,
}: AppointmentCardProps) {
  const action = NEXT_STATUS[apt.status];
  const alertSummary = getAppointmentAlerts(apt);
  const showNotify = apt.status === "ready-for-pickup";
  const notifiedTimeLabel = notifiedAt
    ? new Date(notifiedAt).toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div
      className={cn(
        "group relative flex h-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-all",
        "hover:border-border hover:shadow-sm",
        apt.status === "completed" && "opacity-80",
      )}
    >
      {/* Pet avatar + alert overlay */}
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
        {alertSummary && (
          <span
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-background"
            title={alertSummary}
            aria-label={`Care alert: ${alertSummary}`}
          >
            <AlertTriangle className="size-3" />
          </span>
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
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {apt.packageName}
          </Badge>
          {stationName && (
            <Badge
              variant="outline"
              className="h-4 gap-0.5 border-sky-300 bg-sky-50 px-1.5 text-[10px] text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              title={`Assigned to ${stationName}`}
            >
              <MapPin className="size-2.5" />
              {stationName}
            </Badge>
          )}
        </div>
      </div>

      {/* Action column */}
      {(action || showNotify) && (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {showNotify &&
            (notifiedTimeLabel ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                title="Pickup notification sent to owner"
              >
                <CheckCircle2 className="size-3" />
                Notified — {notifiedTimeLabel}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotify(apt);
                }}
              >
                <Bell className="size-3.5" />
                Notify Owner
              </Button>
            ))}
          {action && (
            <Button
              size="sm"
              className={cn("gap-1 text-xs", action.className)}
              onClick={(e) => {
                e.stopPropagation();
                onAction(apt, action.next);
              }}
            >
              <action.icon className="size-3.5" />
              {action.label}
            </Button>
          )}
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
  const { setStationStatus } = useGroomingStations();

  const [localStatuses, setLocalStatuses] = useState<Record<string, GroomingStatus>>({});
  // Map of appointment id → { stationId, stationName } assigned at check-in.
  // Kept local for now since the appointment record doesn't carry a station;
  // when an appointment-side stationId field exists, this can move there.
  const [localStations, setLocalStations] = useState<
    Record<string, { id: string; name: string }>
  >({});
  const [pendingCheckIn, setPendingCheckIn] = useState<GroomingAppointment | null>(
    null,
  );
  // appt id → ISO timestamp the pickup-ready SMS/push was sent.
  const [localNotifications, setLocalNotifications] = useState<
    Record<string, string>
  >({});

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

  function handleNotifyOwner(apt: GroomingAppointment) {
    if (localNotifications[apt.id]) return;
    const sentAt = new Date().toISOString();
    setLocalNotifications((prev) => ({ ...prev, [apt.id]: sentAt }));
    // Message body comes from the template configured in Settings; we just
    // surface a confirmation toast here since the dispatch is server-side.
    toast.success(`Pickup notification sent to ${apt.ownerName}`, {
      description: `SMS · ${apt.ownerPhone}`,
    });
  }

  function handleConfirmCheckIn(result: CheckInConfirmation) {
    if (!pendingCheckIn) return;
    const apt = pendingCheckIn;
    // Spec: confirmation transitions directly to In Progress and timestamps
    // the start. The intermediate "checked-in" status stays in the enum for
    // legacy data but isn't used by this flow anymore.
    setLocalStatuses((prev) => ({ ...prev, [apt.id]: "in-progress" }));
    setLocalStations((prev) => ({
      ...prev,
      [apt.id]: { id: result.stationId, name: result.stationName },
    }));
    setStationStatus(result.stationId, "in-use", {
      petName: apt.petName,
      stylistName: apt.stylistName,
    });
    // Persist drop-off observations + add-on edits onto the mock appointment
    // so the session panel + ticket comments reflect the confirmation.
    const target = allAppointments.find((a) => a.id === apt.id) as
      | (GroomingAppointment & { intake?: GroomingAppointment["intake"] })
      | undefined;
    if (target) {
      const prevIntake = target.intake ?? {
        coatCondition: "normal",
        behaviorNotes: "",
        allergies: target.allergies ?? [],
        specialInstructions: target.specialInstructions ?? "",
        beforePhotos: [],
        mattingFeeWarning: false,
      };
      target.intake = {
        ...prevIntake,
        dropOffObservations:
          result.dropOffObservations || prevIntake.dropOffObservations,
        sessionStartedAt: new Date().toISOString(),
      };
      target.addOns = result.addOns;
      target.checkInTime = new Date().toISOString();
      if (result.dropOffObservations) {
        target.ticketComments = [
          ...(target.ticketComments ?? []),
          {
            id: `tc-${Date.now()}`,
            staff: "You",
            message: `Drop-off: ${result.dropOffObservations}`,
            at: new Date().toISOString(),
          },
        ];
      }
    }
    toast.success(`${apt.petName} — In Progress`, {
      description: `Station ${result.stationName} · session started`,
    });
    setPendingCheckIn(null);
  }

  function handleAction(apt: GroomingAppointment, next: GroomingStatus) {
    // Intercept Check In so the groomer assigns a station before the
    // appointment transitions. Status change happens after dialog confirm.
    if (next === "checked-in") {
      setPendingCheckIn(apt);
      return;
    }

    // Hard gate: at least one after photo (and one before photo, when the
    // facility requires it) must exist before the appointment can move to
    // Ready for Pickup. Both requirements relax to optional in Grooming
    // Settings → Express Check-In Form.
    if (next === "ready-for-pickup") {
      const check = canMarkReadyForPickup(apt);
      if (!check.allowed) {
        toast.error("Can't mark ready yet", {
          description: check.reason,
        });
        return;
      }
    }

    setLocalStatuses((prev) => ({ ...prev, [apt.id]: next }));

    // Release the station back to the board when the pet leaves so the
    // station board reflects the cleaning queue accurately.
    if (next === "completed") {
      const station = localStations[apt.id];
      if (station) {
        setStationStatus(station.id, "needs-cleaning");
      }
    }

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
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  stationName={localStations[apt.id]?.name}
                  notifiedAt={localNotifications[apt.id]}
                  onAction={handleAction}
                  onNotify={handleNotifyOwner}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CheckInConfirmationDialog
        open={!!pendingCheckIn}
        onOpenChange={(o) => {
          if (!o) setPendingCheckIn(null);
        }}
        apt={pendingCheckIn}
        onConfirm={handleConfirmCheckIn}
      />
    </div>
  );
}
