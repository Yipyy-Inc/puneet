"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  PawPrint,
  Scissors,
  Clock,
  User,
  CalendarDays,
  MapPin,
  AlertTriangle,
  MessageSquare,
  History,
  DollarSign,
  Printer,
  Pencil,
  CalendarClock,
  XCircle,
  UserX,
  Repeat,
  ChevronDown,
  LogIn,
  LogOut,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Plus,
  Phone,
  Mail,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { groomingQueries, getEffectiveAlertNotes } from "@/lib/api/grooming";
import type {
  GroomingAppointment,
  GroomingStatus,
  AlertNote,
  TicketComment,
  AppointmentHistoryEntry,
} from "@/types/grooming";
import type { PetNote } from "@/types/pet";
import { Switch } from "@/components/ui/switch";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { STATUS_META } from "./grooming-calendar";
import {
  CancelAppointmentDialog,
  NoShowDialog,
  RescheduleDialog,
  toastClientNotification,
  type CancelResult,
  type NoShowResult,
  type RescheduleResult,
} from "./appointment-workflow-dialogs";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import {
  getNoShowCount,
  isNoShowRisk,
  NO_SHOW_RISK_THRESHOLD,
} from "@/lib/grooming-no-show-tracker";
import {
  useGroomingWaitlist,
  DEFAULT_OFFER_WINDOW_MINUTES,
} from "@/hooks/use-grooming-waitlist";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Severity-graded alerts pulled from the booking's specialInstructions /
// allergies / intake notes. "high" = bite risk / aggressive language;
// "medium" otherwise.
type Alert = { id: string; severity: "high" | "medium"; text: string };

function deriveAlerts(apt: GroomingAppointment): Alert[] {
  const out: Alert[] = [];
  if (apt.allergies.length > 0) {
    out.push({
      id: "allergies",
      severity: "high",
      text: `Allergies: ${apt.allergies.join(", ")}`,
    });
  }
  if (apt.specialInstructions?.trim()) {
    const s = apt.specialInstructions.toLowerCase();
    const isHigh =
      s.includes("bite") || s.includes("aggressive") || s.includes("snap");
    out.push({
      id: "special",
      severity: isHigh ? "high" : "medium",
      text: apt.specialInstructions.trim(),
    });
  }
  if (apt.intake?.behaviorNotes?.trim()) {
    out.push({
      id: "behavior",
      severity: "medium",
      text: `Behavior: ${apt.intake.behaviorNotes.trim()}`,
    });
  }
  if (apt.intake?.coatCondition && apt.intake.coatCondition !== "normal") {
    out.push({
      id: "coat",
      severity: "medium",
      text: `Coat: ${apt.intake.coatCondition.replace(/-/g, " ")}`,
    });
  }
  return out;
}

function ProfileNoteRow({
  note,
  pinnedOverride,
  onTogglePin,
}: {
  note: PetNote;
  pinnedOverride?: boolean;
  onTogglePin: () => void;
}) {
  const isPinned = pinnedOverride ?? note.pinned;
  return (
    <li
      className={cn(
        "group flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
        isPinned
          ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900/50"
          : "bg-background",
      )}
    >
      {isPinned ? (
        <Pin className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-300" />
      ) : (
        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className="leading-snug">{note.text}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {note.createdBy} · {new Date(note.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>
      <button
        type="button"
        aria-label={isPinned ? "Unpin note" : "Pin note to top"}
        title={isPinned ? "Unpin" : "Pin to top"}
        onClick={onTogglePin}
        className={cn(
          "shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100",
          isPinned
            ? "text-amber-700 hover:bg-amber-100 dark:text-amber-300"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        {isPinned ? (
          <PinOff className="size-3" />
        ) : (
          <Pin className="size-3" />
        )}
      </button>
    </li>
  );
}

function sortNotesPinnedFirst(
  notes: PetNote[],
  pinnedOverrides: Record<string, boolean>,
): PetNote[] {
  return [...notes]
    .map((n) =>
      n.id in pinnedOverrides ? { ...n, pinned: pinnedOverrides[n.id] } : n,
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AppointmentDetailPage({ id }: { id: string }) {
  const { data: apt } = useQuery(groomingQueries.appointment(id));
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: petProfileNotes = [] } = useQuery({
    ...groomingQueries.petNotes(apt?.petId ?? -1),
    enabled: !!apt,
  });
  const { data: clientProfileNotes = [] } = useQuery({
    ...groomingQueries.clientNotes(apt?.ownerId ?? -1),
    enabled: !!apt,
  });
  const { findMatchForSlot, offerSlot, addEntry: addWaitlistEntry } =
    useGroomingWaitlist();

  function autoMatchAndOffer(reason: "cancellation" | "no-show") {
    if (!apt) return;
    const match = findMatchForSlot({
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      stylistName: apt.stylistName,
      serviceName: apt.packageName,
    });
    if (!match) {
      recordHistory(
        `Slot freed by ${reason} — no matching waitlist client for ${apt.date}`,
      );
      return;
    }
    offerSlot(
      match.id,
      { startTime: apt.startTime, endTime: apt.endTime },
      DEFAULT_OFFER_WINDOW_MINUTES,
    );
    const hours = Math.round(DEFAULT_OFFER_WINDOW_MINUTES / 60);
    toast.success(
      `Slot offered to ${match.petName} (${match.ownerName}) from the waitlist`,
      {
        description: `${hours}h to confirm — Phone/SMS sent`,
      },
    );
    recordHistory(
      `Waitlist auto-match — offered ${match.petName} (${match.ownerName}) the freed slot · ${DEFAULT_OFFER_WINDOW_MINUTES}m window`,
    );
  }

  // Local state seeded from the appointment record. Mock-only: a real backend
  // mutation would write back to the appointment and the query cache.
  const [status, setStatus] = useState<GroomingStatus | null>(null);
  const [alertNotes, setAlertNotes] = useState<AlertNote[]>([]);
  const [newAlert, setNewAlert] = useState("");
  const [newAlertCarryForward, setNewAlertCarryForward] = useState(true);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [history, setHistory] = useState<AppointmentHistoryEntry[]>([]);
  // Pet-level notes are read-only here in terms of authoring, but staff can
  // pin/unpin from this page so the most important note floats to the top.
  const [pinnedOverrides, setPinnedOverrides] = useState<
    Record<string, boolean>
  >({});

  // Workflow dialog open/close + override fields applied by the dialogs.
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [bookAgainOpen, setBookAgainOpen] = useState(false);
  const [feeOverride, setFeeOverride] = useState<number | null>(null);
  const [scheduleOverride, setScheduleOverride] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [noShowRiskFlag, setNoShowRiskFlag] = useState(false);

  // Seed local state from the appointment record once it loads.
  useEffect(() => {
    if (!apt) return;
    setStatus(apt.status);
    setAlertNotes(apt.alertNotes ?? []);
    setComments(apt.ticketComments ?? []);
    setHistory(
      apt.history && apt.history.length > 0
        ? apt.history
        : [
            {
              id: "h-seed",
              at: apt.createdAt,
              staff: "System",
              description: "Appointment created",
            },
          ],
    );
    setNoShowRiskFlag(isNoShowRisk(apt.ownerId));
  }, [apt]);

  const alerts = useMemo(() => (apt ? deriveAlerts(apt) : []), [apt]);

  // Effective alerts shown on this booking = own alerts + any carry-forward
  // alerts from past appointments for this pet. Computed at render so editing
  // a pet's alerts immediately reflects everywhere.
  const effectiveAlerts = useMemo(() => {
    if (!apt) return [];
    const carriedView = getEffectiveAlertNotes(
      { ...apt, alertNotes },
      allAppointments,
    );
    // Replace own entries with the locally-edited list, keep carried-from extras.
    const ownIds = new Set(alertNotes.map((n) => n.id));
    return carriedView.filter(
      (n) => ownIds.has(n.id) || n.carriedFromAppointmentId,
    );
  }, [apt, alertNotes, allAppointments]);

  // Sort pet/client profile notes pinned-first, then most-recent-first.
  // Local pin overrides win over the stored value so staff can re-pin in place.
  const sortedPetNotes = useMemo(
    () => sortNotesPinnedFirst(petProfileNotes, pinnedOverrides),
    [petProfileNotes, pinnedOverrides],
  );
  const sortedClientNotes = useMemo(
    () => sortNotesPinnedFirst(clientProfileNotes, pinnedOverrides),
    [clientProfileNotes, pinnedOverrides],
  );

  if (!apt) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Scissors className="text-muted-foreground size-10" />
          <p className="font-medium">Appointment not found</p>
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find an appointment with id <code>{id}</code>.
          </p>
          <Button asChild variant="outline">
            <Link href="/facility/dashboard/services/grooming">
              <ArrowLeft className="mr-2 size-4" />
              Back to Calendar
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = status ?? apt.status;
  const sMeta = STATUS_META[currentStatus];
  const priceAdjTotal = apt.priceAdjustments.reduce(
    (s, a) => s + a.amount,
    0,
  );
  // When the booking was cancelled or marked no-show, the invoice replaces
  // the full subtotal with the configured fee (or $0 when fees aren't applied).
  const replacedByFee =
    (currentStatus === "cancelled" || currentStatus === "no-show") &&
    feeOverride !== null;
  const subtotal = replacedByFee ? feeOverride : apt.totalPrice;
  const TAX_RATE = 0.15; // demo
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const paymentStatus =
    currentStatus === "completed"
      ? ("paid" as const)
      : currentStatus === "cancelled" || currentStatus === "no-show"
        ? feeOverride && feeOverride > 0
          ? ("fee due" as const)
          : ("voided" as const)
        : ("unpaid" as const);

  function recordHistory(description: string) {
    setHistory((prev) => [
      ...prev,
      {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        staff: "You",
        description,
      },
    ]);
  }

  function recordFieldChange(
    field: string,
    before: string | null,
    after: string | null,
  ) {
    setHistory((prev) => [
      ...prev,
      {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        staff: "You",
        fieldChange: { field, before, after },
      },
    ]);
  }

  function advanceStatus(next: GroomingStatus, verb: string) {
    if (!apt) return;
    const before = STATUS_META[status ?? apt.status].label;
    setStatus(next);
    recordFieldChange("Status", before, STATUS_META[next].label);
    toast.success(`${apt.petName} — ${verb}`);
  }

  function handleCancelConfirm(r: CancelResult) {
    if (!apt) return;
    const beforeStatus = STATUS_META[status ?? apt.status].label;
    setStatus("cancelled");
    setFeeOverride(r.fee);
    const reasonLabel =
      r.reason === "other" ? r.reasonNote || "other" : r.reason;
    recordFieldChange("Status", beforeStatus, "Cancelled");
    if (r.fee > 0) recordFieldChange("Cancellation Fee", null, `$${r.fee}`);
    recordHistory(`Cancellation reason: ${reasonLabel}`);
    if (r.notifyClient) {
      toastClientNotification(apt, "cancellation");
      recordHistory("Cancellation notification sent");
    } else {
      toast.success("Appointment cancelled");
    }
    // Slot just opened — offer it to the first matching waitlist client.
    autoMatchAndOffer("cancellation");
    setCancelOpen(false);
  }

  function handleNoShowConfirm(r: NoShowResult) {
    if (!apt) return;
    const beforeStatus = STATUS_META[status ?? apt.status].label;
    setStatus("no-show");
    setFeeOverride(r.fee);
    setNoShowRiskFlag(r.newCount >= NO_SHOW_RISK_THRESHOLD);
    recordFieldChange("Status", beforeStatus, "No Show");
    if (r.fee > 0) recordFieldChange("No-Show Fee", null, `$${r.fee}`);
    recordHistory(`Client no-show total now ${r.newCount}`);
    if (r.flaggedAsRisk) {
      recordHistory(
        `Client flagged "No-Show Risk" (≥ ${NO_SHOW_RISK_THRESHOLD} no-shows)`,
      );
    }
    if (r.notifyClient) {
      toastClientNotification(apt, "no-show");
    }
    autoMatchAndOffer("no-show");
    setNoShowOpen(false);
  }

  function handleRescheduleConfirm(r: RescheduleResult) {
    if (!apt) return;
    const beforeDate = scheduleOverride?.date ?? apt.date;
    const beforeStart = scheduleOverride?.startTime ?? apt.startTime;
    const beforeEnd = scheduleOverride?.endTime ?? apt.endTime;
    setScheduleOverride({
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
    });
    recordFieldChange(
      "Date / Time",
      `${beforeDate} ${beforeStart}–${beforeEnd}`,
      `${r.date} ${r.startTime}–${r.endTime}`,
    );
    if (r.applyToSeries) {
      recordHistory("Applied to all future occurrences in the series");
    }
    if (r.notifyClient) {
      toastClientNotification(apt, "reschedule");
    }
    setRescheduleOpen(false);
  }

  function handleMoveToWaitlist() {
    if (!apt) return;
    // Capture the current schedule as the entry's preferred date/time/groomer
    // so the matcher can recommend it back immediately if a similar slot
    // opens. Existing in-flight notes/comments stay on the appointment;
    // the waitlist comment lifts the most recent comment as a hint.
    const recentComment = comments[comments.length - 1]?.message;
    addWaitlistEntry({
      id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: apt.date,
      petId: apt.petId,
      petName: apt.petName,
      petBreed: apt.petBreed,
      ownerName: apt.ownerName,
      ownerPhone: apt.ownerPhone,
      ownerEmail: apt.ownerEmail,
      serviceName: apt.packageName,
      preferredStylistIds: apt.stylistId ? [apt.stylistId] : [],
      expectedDate: { kind: "specific-date", date: apt.date },
      expectedTime: { kind: "exact-time", time: apt.startTime },
      validUntil: undefined,
      source: "moved-from-appointment",
      comment:
        recentComment ?? `Moved from appointment ${apt.id} (${apt.date} ${apt.startTime}).`,
      addedAt: new Date().toISOString(),
      status: "waiting",
    });
    setStatus("cancelled");
    recordHistory(
      `Moved to waitlist · originally ${apt.date} ${apt.startTime}`,
    );
    toast.success(
      `${apt.petName} moved to the waitlist — appointment cancelled.`,
    );
    autoMatchAndOffer("cancellation");
  }

  function addAlert() {
    const text = newAlert.trim();
    if (!text) return;
    const entry: AlertNote = {
      id: `an-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdBy: "You",
      createdAt: new Date().toISOString(),
      appliesToFuture: newAlertCarryForward,
    };
    setAlertNotes((prev) => [...prev, entry]);
    recordHistory(
      newAlertCarryForward
        ? `Alert added (carries to future appointments): "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`
        : `Alert added (this booking only): "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`,
    );
    setNewAlert("");
  }

  function removeAlert(noteId: string) {
    const target = alertNotes.find((n) => n.id === noteId);
    if (!target) return;
    setAlertNotes((prev) => prev.filter((n) => n.id !== noteId));
    recordHistory(`Alert removed: "${target.text.slice(0, 60)}${target.text.length > 60 ? "…" : ""}"`);
  }

  function addComment() {
    const text = newComment.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        staff: "You",
        at: new Date().toISOString(),
        message: text,
      },
    ]);
    recordHistory("Internal comment posted");
    setNewComment("");
  }

  function togglePin(note: PetNote) {
    const current = pinnedOverrides[note.id] ?? note.pinned;
    setPinnedOverrides((prev) => ({ ...prev, [note.id]: !current }));
    toast.success(!current ? "Note pinned to top" : "Note unpinned");
  }

  // Primary action depends on status. Same colors as the side panel.
  const primary: {
    label: string;
    next: GroomingStatus;
    icon: React.ElementType;
    className: string;
  } | null =
    currentStatus === "scheduled"
      ? {
          label: "Check In",
          next: "checked-in",
          icon: LogIn,
          className: "bg-emerald-600 hover:bg-emerald-700 text-white",
        }
      : currentStatus === "checked-in" || currentStatus === "in-progress"
        ? {
            label: "Mark Ready",
            next: "ready-for-pickup",
            icon: Sparkles,
            className: "bg-sky-600 hover:bg-sky-700 text-white",
          }
        : currentStatus === "ready-for-pickup"
          ? {
              label: "Check Out",
              next: "completed",
              icon: LogOut,
              className: "bg-emerald-600 hover:bg-emerald-700 text-white",
            }
          : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/facility/dashboard/services/grooming">
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Calendar
        </Link>
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Appointment</p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tabular-nums">
                  #{apt.id}
                </h1>
                <Badge
                  className={cn(
                    "capitalize border-0",
                    sMeta.bg,
                    sMeta.text,
                  )}
                >
                  {sMeta.label}
                </Badge>
                {noShowRiskFlag && (
                  <Badge
                    variant="destructive"
                    title={`Client has ${getNoShowCount(apt.ownerId)} no-shows on record`}
                  >
                    <UserX className="mr-1 size-3" />
                    No-Show Risk
                  </Badge>
                )}
              </div>
              {scheduleOverride ? (
                <p className="text-xs">
                  <span className="text-muted-foreground line-through">
                    {formatDateLong(apt.date)} · {apt.startTime}–{apt.endTime}
                  </span>
                  <span className="ml-2 font-semibold text-sky-700 dark:text-sky-300">
                    {formatDateLong(scheduleOverride.date)} ·{" "}
                    {scheduleOverride.startTime}–{scheduleOverride.endTime}
                  </span>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {formatDateLong(apt.date)} · {apt.startTime}–{apt.endTime}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {primary && (
              <Button
                className={primary.className}
                onClick={() => advanceStatus(primary.next, primary.label)}
              >
                <primary.icon className="mr-1.5 size-4" />
                {primary.label}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  More
                  <ChevronDown className="ml-1.5 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => toast.info("Edit appointment")}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRescheduleOpen(true)}>
                  <CalendarClock className="mr-2 size-4" />
                  Reschedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBookAgainOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Book Again
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toast.info("Repeat — same time next week")}
                >
                  <Repeat className="mr-2 size-4" />
                  Repeat
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleMoveToWaitlist}
                  disabled={
                    currentStatus === "cancelled" ||
                    currentStatus === "completed" ||
                    currentStatus === "no-show"
                  }
                >
                  <Hourglass className="mr-2 size-4" />
                  Move to Waitlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" />
                  Print Card
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setCancelOpen(true)}
                  disabled={
                    currentStatus === "cancelled" ||
                    currentStatus === "completed"
                  }
                >
                  <XCircle className="mr-2 size-4" />
                  Cancel
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setNoShowOpen(true)}
                  disabled={
                    currentStatus === "no-show" ||
                    currentStatus === "completed"
                  }
                >
                  <UserX className="mr-2 size-4" />
                  No Show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Pet Card */}
      <SectionCard icon={PawPrint} title="Pet">
        <div className="flex gap-4">
          {apt.petPhotoUrl ? (
            <div className="size-20 overflow-hidden rounded-2xl ring-2 ring-background shrink-0">
              <Image
                src={apt.petPhotoUrl}
                alt={apt.petName}
                width={80}
                height={80}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-2xl ring-2 ring-background">
              <PawPrint className="size-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{apt.petName}</p>
            <p className="text-muted-foreground text-sm">{apt.petBreed}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <InfoRow label="Size" value={apt.petSize} />
              <InfoRow label="Weight" value={`${apt.petWeight} lbs`} />
              <InfoRow label="Coat" value={apt.coatType} />
            </div>
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                  a.severity === "high"
                    ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Service Details */}
      <SectionCard icon={Scissors} title="Service Details">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            icon={Scissors}
            label="Service"
            value={apt.packageName}
          />
          <InfoRow icon={User} label="Groomer" value={apt.stylistName} />
          <InfoRow
            icon={MapPin}
            label="Station"
            value={
              <span className="text-muted-foreground italic">
                Assigned at check-in
              </span>
            }
          />
          <InfoRow
            icon={CalendarDays}
            label="Date"
            value={formatDateLong(apt.date)}
          />
          <InfoRow
            icon={Clock}
            label="Time"
            value={`${apt.startTime} – ${apt.endTime}`}
          />
          <InfoRow
            icon={Clock}
            label="Duration"
            value={`${(() => {
              const [sh, sm] = apt.startTime.split(":").map(Number);
              const [eh, em] = apt.endTime.split(":").map(Number);
              return eh * 60 + em - (sh * 60 + sm);
            })()} min`}
          />
        </div>
        {apt.addOns.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">
              Add-ons:
            </span>
            {apt.addOns.map((ao) => (
              <Badge key={ao} variant="secondary" className="text-xs">
                {ao}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Pricing Panel */}
      <SectionCard
        icon={DollarSign}
        title="Pricing"
        action={
          <Badge
            className={cn(
              "capitalize border-0",
              paymentStatus === "paid"
                ? "bg-emerald-100 text-emerald-800"
                : paymentStatus === "voided"
                  ? "bg-slate-200 text-slate-700"
                  : "bg-amber-100 text-amber-900",
            )}
          >
            {paymentStatus}
          </Badge>
        }
      >
        <div className="space-y-1 text-sm">
          {replacedByFee && (
            <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Invoice replaced by{" "}
              {currentStatus === "no-show" ? "no-show" : "cancellation"} fee.
              Original service charges below are voided.
            </div>
          )}
          <div
            className={cn(
              "flex justify-between",
              replacedByFee && "text-muted-foreground line-through",
            )}
          >
            <span className="text-muted-foreground">
              Base — {apt.packageName}
            </span>
            <span className="tabular-nums">${apt.basePrice}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Size adjustment ({apt.petSize})</span>
            <span className="tabular-nums">included</span>
          </div>
          {apt.priceAdjustments.map((adj) => (
            <div
              key={adj.id}
              className="flex justify-between text-amber-700 dark:text-amber-400"
            >
              <span className="capitalize">
                {adj.reason.replace(/-/g, " ")}
              </span>
              <span className="tabular-nums">+${adj.amount}</span>
            </div>
          ))}
          {apt.addOns.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Add-ons ({apt.addOns.length})
              </span>
              <span className="tabular-nums">
                +${Math.max(0, apt.totalPrice - apt.basePrice - priceAdjTotal)}
              </span>
            </div>
          )}
          {replacedByFee && (
            <div className="flex justify-between font-medium text-amber-800 dark:text-amber-300">
              <span>
                {currentStatus === "no-show" ? "No-show" : "Cancellation"} fee
              </span>
              <span className="tabular-nums">${feeOverride}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums">${subtotal}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Tax (15%)</span>
            <span className="tabular-nums">${tax.toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold tabular-nums">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Alert Notes — critical warnings, red-flag at-a-glance */}
      <Card className="border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base text-red-900 dark:text-red-200">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Alert Notes
              {effectiveAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {effectiveAlerts.length}
                </Badge>
              )}
            </span>
            <span className="text-[10px] font-normal text-red-700 dark:text-red-300">
              Shown on the calendar card · multiple allowed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {effectiveAlerts.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">
              No alerts yet. Things like &quot;Bites when ears are touched&quot;
              or &quot;On medication — owner administers&quot; go here. Toggle
              &quot;Apply to future&quot; so the alert follows the pet forever.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {effectiveAlerts.map((n) => {
                const isCarried = !!n.carriedFromAppointmentId;
                const isLocal = !isCarried;
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-2 rounded-md border border-red-300 bg-red-100/70 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p>{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-red-700/80 dark:text-red-300/80">
                        {n.createdBy} · {formatDateTime(n.createdAt)}
                        {n.appliesToFuture && !isCarried && (
                          <span className="ml-1.5 font-semibold uppercase tracking-wide">
                            · carries forward
                          </span>
                        )}
                        {isCarried && (
                          <span className="ml-1.5 font-semibold uppercase tracking-wide">
                            · carried from prior visit
                          </span>
                        )}
                      </p>
                    </div>
                    {isLocal && (
                      <button
                        type="button"
                        aria-label="Remove alert"
                        onClick={() => removeAlert(n.id)}
                        className="text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Textarea
              value={newAlert}
              onChange={(e) => setNewAlert(e.target.value)}
              placeholder="Add an alert note…"
              rows={2}
              className="text-sm"
            />
            <Button
              onClick={addAlert}
              disabled={!newAlert.trim()}
              className="self-end bg-red-600 text-white hover:bg-red-700"
            >
              Add
            </Button>
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-red-900 dark:text-red-200">
            <Switch
              checked={newAlertCarryForward}
              onCheckedChange={setNewAlertCarryForward}
            />
            <span>
              <strong>Apply to future appointments for this pet</strong> — alert
              follows the pet to every booking forever
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Internal Comments */}
      <SectionCard icon={MessageSquare} title="Internal Comments">
        <ul className="space-y-3">
          {comments.length === 0 && (
            <li className="text-muted-foreground text-xs italic">
              No comments yet.
            </li>
          )}
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border bg-muted/30 px-3 py-2.5"
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-semibold">{c.staff}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(c.at)}
                </span>
              </div>
              <p className="text-sm">{c.message}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a handoff note for the team…"
            rows={2}
            className="text-sm"
          />
          <Button
            onClick={addComment}
            disabled={!newComment.trim()}
            className="self-end"
          >
            Post
          </Button>
        </div>
      </SectionCard>

      {/* Client & pet profile notes — pinned-first, pulled from profile.
          These are routine info that follows the pet/client to every booking. */}
      <SectionCard
        icon={User}
        title="Client & Pet Notes"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/facility/dashboard/clients/${apt.ownerId}`}>
              <ExternalLink className="mr-1.5 size-3.5" />
              Open Profile
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Client */}
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                Client
              </p>
              <p className="text-sm font-semibold">{apt.ownerName}</p>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Phone className="size-3" />
                {apt.ownerPhone}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Mail className="size-3" />
                {apt.ownerEmail}
              </p>
            </div>
            {sortedClientNotes.length > 0 && (
              <ul className="space-y-1.5 border-t pt-2">
                {sortedClientNotes.map((n) => (
                  <ProfileNoteRow
                    key={n.id}
                    note={n}
                    pinnedOverride={pinnedOverrides[n.id]}
                    onTogglePin={() => togglePin(n)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Pet */}
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                Pet
              </p>
              <p className="text-sm font-semibold">
                {apt.petName}
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  {apt.petBreed}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                {apt.petSize} · {apt.coatType} · {apt.petWeight} lbs
              </p>
              {apt.lastGroomDate && (
                <p className="text-muted-foreground text-xs">
                  Last groom: {formatDateLong(apt.lastGroomDate)}
                </p>
              )}
            </div>
            {sortedPetNotes.length > 0 && (
              <ul className="space-y-1.5 border-t pt-2">
                {sortedPetNotes.map((n) => (
                  <ProfileNoteRow
                    key={n.id}
                    note={n}
                    pinnedOverride={pinnedOverrides[n.id]}
                    onTogglePin={() => togglePin(n)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-[10px]">
          Pinned notes float to the top across every appointment. Manage the
          full list on the client / pet profile.
        </p>
      </SectionCard>

      {/* Update History — structured field-level audit trail */}
      <SectionCard icon={History} title="Update History">
        <ol className="relative border-l pl-4">
          {history
            .slice()
            .sort((a, b) => (a.at < b.at ? 1 : -1))
            .map((h) => (
              <li key={h.id} className="mb-3 last:mb-0">
                <span
                  className={cn(
                    "absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background",
                    h.fieldChange ? "bg-sky-500" : "bg-primary",
                  )}
                />
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{h.staff}</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(h.at)}
                  </span>
                </div>
                {h.fieldChange ? (
                  <p className="text-sm">
                    <span className="font-medium">{h.fieldChange.field}:</span>{" "}
                    {h.fieldChange.before !== null ? (
                      <span className="text-muted-foreground line-through">
                        {h.fieldChange.before}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        (empty)
                      </span>
                    )}
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    {h.fieldChange.after !== null ? (
                      <span className="font-semibold text-sky-700 dark:text-sky-300">
                        {h.fieldChange.after}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        (cleared)
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm">{h.description}</p>
                )}
              </li>
            ))}
        </ol>
      </SectionCard>

      {currentStatus === "completed" && (
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="size-4" />
            Appointment completed. Ledger sealed.
          </CardContent>
        </Card>
      )}

      <CancelAppointmentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        appointment={apt}
        onConfirm={handleCancelConfirm}
      />
      <NoShowDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        appointment={apt}
        onConfirm={handleNoShowConfirm}
      />
      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={apt}
        isInSeries={false}
        onConfirm={handleRescheduleConfirm}
      />
      <NewAppointmentDialog
        open={bookAgainOpen}
        onOpenChange={setBookAgainOpen}
        prefillFrom={apt}
      />
    </div>
  );
}
