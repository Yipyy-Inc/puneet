"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  Scissors,
  Clock,
  User,
  AlertTriangle,
  CalendarDays,
  PawPrint,
  MoreHorizontal,
  X,
  LogIn,
  Sparkles,
  LogOut,
  MessageCircle,
  Pencil,
  ExternalLink,
  Hourglass,
  CheckCircle2,
} from "lucide-react";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { toast } from "sonner";
import { STATUS_META } from "./grooming-calendar";
import { useQuery } from "@tanstack/react-query";
import {
  applyCheckInResult,
  applyMarkReadyResult,
  applyPaymentResult,
} from "@/lib/grooming/check-in-actions";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { useLoyaltyEngine } from "@/hooks/use-loyalty-engine";
import { clients as initialClients } from "@/data/clients";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { findZipTaxRate } from "@/lib/service-areas";
import {
  MarkReadyDialog,
  type MarkReadyConfirmation,
} from "./mark-ready-dialog";
import {
  PaymentDialog,
  type PaymentResult,
} from "./payment-dialog";
import {
  groomingQueries,
  getEffectiveAlertNotes,
} from "@/lib/api/grooming";
import { PreVisitBriefing } from "./pre-visit-briefing";
import {
  CheckInConfirmationDialog,
  type CheckInConfirmation,
} from "./check-in-confirmation-dialog";
import { useEffect, useMemo, useState } from "react";

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<GroomingStatus, string> = {
  scheduled: "Scheduled",
  "checked-in": "Checked In",
  "in-progress": "In Progress",
  "ready-for-pickup": "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

const DESTRUCTIVE_ACTIONS: Partial<
  Record<GroomingStatus, { next: GroomingStatus; label: string }[]>
> = {
  scheduled: [{ next: "cancelled", label: "Cancel Appointment" }],
  "checked-in": [{ next: "no-show", label: "Mark No Show" }],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-[11px] leading-none text-muted-foreground">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="text-sm font-medium text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppointmentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: GroomingAppointment | null;
}

export function AppointmentPanel({
  open,
  onOpenChange,
  appointment,
}: AppointmentPanelProps) {
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [markReadyOpen, setMarkReadyOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [etaSent, setEtaSent] = useState(false);
  const { setStationStatus } = useGroomingStations();
  const { recordEvent } = useLoyaltyEngine();
  const { data: customerPackages = [] } = useQuery(
    groomingQueries.customerPackages(),
  );
  const { zipTaxRates: paymentZipTaxRates } = useMobileGrooming();
  // Re-render every 30s so the elapsed timer + the running-long banner
  // refresh without depending on parent state.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const applicableCustomerPackages = useMemo(
    () =>
      !appointment
        ? []
        : customerPackages.filter(
            (p) =>
              p.customerId === appointment.ownerId &&
              p.status === "active" &&
              p.passesTotal - p.passesUsed > 0 &&
              p.passes.some((pass) => pass.moduleId === "grooming"),
          ),
    [customerPackages, appointment],
  );

  if (!appointment) return null;

  const s = STATUS_META[appointment.status];
  const destructiveActions = DESTRUCTIVE_ACTIONS[appointment.status] ?? [];
  const effectiveAlerts = getEffectiveAlertNotes(appointment, allAppointments);
  const hasAlert =
    appointment.allergies.length > 0 || !!appointment.specialInstructions;

  // Running-long detection — drives the inline banner with the one-tap "Send
  // ETA SMS" button. Quiet (no banner) until elapsed exceeds estimated by 15
  // min, and suppressed once the owner has been notified.
  const checkInDate = appointment.checkInTime
    ? new Date(appointment.checkInTime)
    : null;
  const checkInMin =
    checkInDate && !Number.isNaN(checkInDate.getTime())
      ? checkInDate.getHours() * 60 + checkInDate.getMinutes()
      : null;
  const estimatedReadyMin = appointment.estimatedReadyTime
    ? (() => {
        const [h, m] = appointment.estimatedReadyTime.split(":").map(Number);
        return h * 60 + m;
      })()
    : null;
  const scheduledStartMin = (() => {
    const [h, m] = appointment.startTime.split(":").map(Number);
    return h * 60 + m;
  })();
  const scheduledEndMin = (() => {
    const [h, m] = appointment.endTime.split(":").map(Number);
    return h * 60 + m;
  })();
  const sessionEstimatedMin =
    estimatedReadyMin !== null && checkInMin !== null
      ? Math.max(0, estimatedReadyMin - checkInMin)
      : scheduledEndMin - scheduledStartMin;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isOnToday = appointment.date === todayIso;
  const elapsedMin =
    isOnToday &&
    appointment.status === "in-progress" &&
    checkInMin !== null &&
    nowMin >= checkInMin
      ? nowMin - checkInMin
      : 0;
  const runningLongMin =
    appointment.status === "in-progress" &&
    elapsedMin > sessionEstimatedMin + 15
      ? elapsedMin - sessionEstimatedMin
      : 0;
  const ownerEtaAlreadySent = etaSent || !!appointment.ownerEtaNotifiedAt;

  function handleSendEtaSms() {
    if (!appointment) return;
    const smsBody = `${appointment.petName}'s groom is taking a little longer than expected. We'll notify you as soon as they're ready!`;
    toast.message(`SMS sent to ${appointment.ownerName}`, {
      description: smsBody,
      duration: 8000,
    });
    setEtaSent(true);
  }
  const priceAdjTotal = appointment.priceAdjustments.reduce(
    (sum, a) => sum + a.amount,
    0,
  );

  // Quick-action availability — each button is enabled only when its status
  // transition is the logical next step in the workflow.
  const canCheckIn = appointment.status === "scheduled";
  const canMarkReady =
    appointment.status === "checked-in" ||
    appointment.status === "in-progress";
  const canCheckOut = appointment.status === "ready-for-pickup";

  function advance(next: GroomingStatus) {
    if (next === "ready-for-pickup") {
      setMarkReadyOpen(true);
      return;
    }
    if (next === "completed") {
      setPaymentOpen(true);
      return;
    }
    toast.success(`Status updated to "${STATUS_LABELS[next]}"`);
  }

  const displayDate = new Date(
    appointment.date + "T00:00:00",
  ).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex w-[460px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-2xl border bg-background shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:duration-200 data-[state=closed]:duration-150",
          )}
        >
          {/* ── Header ── */}
          <div className="shrink-0 border-b bg-muted/20 px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                {appointment.petPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appointment.petPhotoUrl}
                    alt={appointment.petName}
                    className="size-12 shrink-0 rounded-xl object-cover ring-2 ring-pink-200/60 dark:ring-pink-900/40"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-xl font-bold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                    {appointment.petName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <DialogPrimitive.Title className="truncate text-base/tight font-semibold">
                    {appointment.petName}
                  </DialogPrimitive.Title>
                  <p className="truncate text-sm text-muted-foreground">
                    {appointment.petBreed}
                  </p>
                  <Badge
                    className={cn(
                      "mt-1.5 border-0 text-xs capitalize",
                      s.bg,
                      s.text,
                    )}
                  >
                    {s.label}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {destructiveActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {destructiveActions.map((a) => (
                        <DropdownMenuItem
                          key={a.next}
                          className="text-destructive focus:text-destructive"
                          onClick={() => advance(a.next)}
                        >
                          {a.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Link
                  href={`/facility/dashboard/services/grooming/appointments/${appointment.id}`}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted"
                  title="Open full detail page"
                >
                  <ExternalLink className="size-4" />
                </Link>
                <DialogPrimitive.Close
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted"
                  aria-label="Close panel"
                >
                  <X className="size-4" />
                </DialogPrimitive.Close>
              </div>
            </div>
          </div>

          {/* ── Body (scrollable) ── */}
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            {/* Running-long banner — fires automatically once elapsed time
                exceeds the estimated duration by 15 min. One-tap SMS to the
                owner, then the banner switches to a calmer "ETA sent" state. */}
            {runningLongMin > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      <Hourglass className="size-3.5" />
                      Running long · {runningLongMin} min over
                    </p>
                    <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/80">
                      Elapsed {elapsedMin} min of ~{sessionEstimatedMin} min
                      estimated.
                      {ownerEtaAlreadySent
                        ? ` ETA SMS sent to ${appointment.ownerName}.`
                        : ` Send ${appointment.ownerName} a heads-up?`}
                    </p>
                  </div>
                  {!ownerEtaAlreadySent ? (
                    <Button
                      size="sm"
                      className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
                      onClick={handleSendEtaSms}
                    >
                      <MessageCircle className="mr-1.5 size-3.5" />
                      Send ETA SMS
                    </Button>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">
                      <CheckCircle2 className="size-3" />
                      ETA sent
                    </span>
                  )}
                </div>
              </div>
            )}
            {effectiveAlerts.length > 0 && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/30">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                  <AlertTriangle className="size-3" />
                  Alert · {effectiveAlerts.length} note
                  {effectiveAlerts.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-1 text-xs text-red-900 dark:text-red-100">
                  {effectiveAlerts.map((n) => (
                    <li key={n.id} className="flex items-start gap-1.5">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-red-600 dark:bg-red-400" />
                      <span>
                        {n.text}
                        {n.carriedFromAppointmentId && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
                            · carried
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasAlert && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1 text-xs text-amber-800 dark:text-amber-200">
                  {appointment.allergies.length > 0 && (
                    <p>
                      <strong>Allergies:</strong>{" "}
                      {appointment.allergies.join(", ")}
                    </p>
                  )}
                  {appointment.specialInstructions && (
                    <p>
                      <strong>Care notes:</strong>{" "}
                      {appointment.specialInstructions}
                    </p>
                  )}
                </div>
              </div>
            )}

            <PreVisitBriefing appointment={appointment} layout="narrow" />

            <div>
              <SectionLabel>Appointment</SectionLabel>
              <div className="flex flex-col gap-3">
                <InfoRow
                  icon={Scissors}
                  label="Service"
                  value={appointment.packageName}
                />
                <InfoRow
                  icon={User}
                  label={
                    (appointment.additionalStylistIds?.length ?? 0) > 0
                      ? "Lead Groomer"
                      : "Groomer"
                  }
                  value={appointment.stylistName}
                />
                {(appointment.additionalStylistIds?.length ?? 0) > 0 && (
                  <div className="ml-10 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Working alongside:
                    </span>
                    {appointment.additionalStylistIds!.map((id) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {id}
                      </Badge>
                    ))}
                  </div>
                )}
                <InfoRow
                  icon={CalendarDays}
                  label="Date"
                  value={displayDate}
                />
                <InfoRow
                  icon={Clock}
                  label="Time"
                  value={`${appointment.startTime} – ${appointment.endTime}`}
                />
              </div>
              {appointment.addOns.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    <PawPrint className="mr-1 inline size-3" />
                    Add-ons:
                  </span>
                  {appointment.addOns.map((ao) => (
                    <Badge key={ao} variant="secondary" className="text-xs">
                      {ao}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stages — split-service handoff chain */}
              {(appointment.stages?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-violet-200/70 bg-violet-50/40 px-3 py-2.5 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Split service · {appointment.stages?.length} stages
                  </p>
                  <ol className="space-y-1.5">
                    {appointment.stages!.map((st, i) => {
                      const isDone = !!st.completedAt;
                      const isCurrent =
                        !isDone &&
                        appointment.stages!.slice(0, i).every(
                          (prev) => prev.completedAt,
                        );
                      const next = appointment.stages![i + 1];
                      return (
                        <li
                          key={st.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs",
                            isDone && "opacity-70",
                            isCurrent && "border-emerald-400",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              isDone
                                ? "bg-emerald-500 text-white"
                                : isCurrent
                                  ? "bg-amber-500 text-white"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isDone ? "✓" : i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {st.label}
                              <span className="text-muted-foreground ml-1 font-normal">
                                · {st.stylistName}
                              </span>
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {st.startTime}–{st.endTime}
                              {isDone && (
                                <span className="text-emerald-700 dark:text-emerald-300">
                                  {" · done"}
                                </span>
                              )}
                            </p>
                          </div>
                          {isCurrent && (
                            <button
                              type="button"
                              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              onClick={() => {
                                // Actually mark the stage complete + advance
                                // station ownership when the next stage uses
                                // a different table/tub.
                                const nowIso = new Date().toISOString();
                                const stages = appointment.stages ?? [];
                                if (stages[i]) {
                                  stages[i].completedAt = nowIso;
                                }
                                // Release the just-completed station, or hand
                                // it to the next stage's groomer if they're
                                // staying put.
                                if (st.stationId && next?.stationId !== st.stationId) {
                                  setStationStatus(
                                    st.stationId,
                                    "needs-cleaning",
                                  );
                                }
                                if (next?.stationId) {
                                  setStationStatus(next.stationId, "in-use", {
                                    petName: appointment.petName,
                                    stylistName: next.stylistName,
                                  });
                                }
                                toast.success(
                                  `${st.label} complete${
                                    next
                                      ? ` — handoff to ${next.stylistName}${
                                          next.stationId &&
                                          next.stationId !== st.stationId
                                            ? " (station change)"
                                            : ""
                                        }`
                                      : ""
                                  }`,
                                );
                                setTick((t) => t + 1);
                              }}
                            >
                              Mark Done
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Additional pets — multi-pet bookings */}
              {(appointment.additionalPets?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-pink-200/70 bg-pink-50/40 px-3 py-2.5 dark:border-pink-900/40 dark:bg-pink-950/20">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-pink-700 dark:text-pink-300">
                    Multi-pet booking ·{" "}
                    {(appointment.additionalPets?.length ?? 0) + 1} pets
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-start gap-2">
                      <PawPrint className="mt-0.5 size-3 text-pink-600 shrink-0" />
                      <span className="font-medium">
                        {appointment.petName}
                      </span>
                      <span className="text-muted-foreground">
                        · {appointment.packageName} · {appointment.petSize}
                      </span>
                    </li>
                    {appointment.additionalPets!.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <PawPrint className="mt-0.5 size-3 text-pink-600 shrink-0" />
                        <span className="font-medium">{p.petName}</span>
                        <span className="text-muted-foreground">
                          · {p.packageName} · {p.petSize}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <SectionLabel>Owner</SectionLabel>
              <div className="flex flex-col gap-3">
                <InfoRow
                  icon={User}
                  label="Name"
                  value={appointment.ownerName}
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={appointment.ownerPhone}
                  href={`tel:${appointment.ownerPhone}`}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={appointment.ownerEmail}
                  href={`mailto:${appointment.ownerEmail}`}
                />
              </div>
            </div>

            <Separator />

            <div>
              <SectionLabel>Pet Details</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Size", value: appointment.petSize },
                  { label: "Weight", value: `${appointment.petWeight} lbs` },
                  { label: "Coat", value: appointment.coatType },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-muted/50 px-3 py-2 text-center"
                  >
                    <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold capitalize">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <SectionLabel>Internal Notes</SectionLabel>
                  <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm/relaxed text-muted-foreground">
                    {appointment.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <SectionLabel>Price</SectionLabel>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base — {appointment.packageName}</span>
                  <span>${appointment.basePrice}</span>
                </div>
                {appointment.priceAdjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex justify-between text-amber-700 dark:text-amber-400"
                  >
                    <span className="capitalize">
                      {adj.reason.replace(/-/g, " ")}
                    </span>
                    <span>+${adj.amount}</span>
                  </div>
                ))}
                {priceAdjTotal > 0 && <Separator className="my-1" />}
                <div className="flex justify-between pt-0.5 text-base font-semibold">
                  <span>Total</span>
                  <span>${appointment.totalPrice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick actions footer ── */}
          <div className="shrink-0 space-y-2 border-t bg-muted/10 px-5 py-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                disabled={!canCheckIn}
                onClick={() => setCheckInOpen(true)}
                className={cn(
                  "h-9 gap-1.5",
                  canCheckIn &&
                    "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
                variant={canCheckIn ? "default" : "outline"}
              >
                <LogIn className="size-3.5" />
                Check In
              </Button>
              <Button
                size="sm"
                disabled={!canMarkReady}
                onClick={() => advance("ready-for-pickup")}
                className={cn(
                  "h-9 gap-1.5",
                  canMarkReady && "bg-sky-600 text-white hover:bg-sky-700",
                )}
                variant={canMarkReady ? "default" : "outline"}
              >
                <Sparkles className="size-3.5" />
                Mark Ready
              </Button>
              <Button
                size="sm"
                disabled={!canCheckOut}
                onClick={() => advance("completed")}
                className={cn(
                  "h-9 gap-1.5",
                  canCheckOut &&
                    "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
                variant={canCheckOut ? "default" : "outline"}
              >
                <LogOut className="size-3.5" />
                Check Out
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() =>
                  toast.success(`Messaging ${appointment.ownerName}`)
                }
              >
                <MessageCircle className="size-3.5" />
                Message Owner
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => toast.info("Edit appointment")}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      <CheckInConfirmationDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        apt={appointment}
        onConfirm={(result: CheckInConfirmation) => {
          applyCheckInResult(appointment, result, {
            clients: initialClients,
            setStationStatus,
            notify: (title, detail) => toast.message(title, detail),
          });
          const readyLine = result.estimatedReadyTime
            ? ` · ready ~${result.estimatedReadyTime}`
            : "";
          toast.success(`${appointment.petName} — In Progress`, {
            description:
              (result.mattedSurcharge > 0
                ? `Station ${result.stationName} · matting fee +$${result.mattedSurcharge}`
                : `Station ${result.stationName} · session started`) + readyLine,
          });
          setCheckInOpen(false);
        }}
      />
      <MarkReadyDialog
        open={markReadyOpen}
        onOpenChange={setMarkReadyOpen}
        apt={appointment}
        facilityName="Doggieville MTL"
        onConfirm={(result: MarkReadyConfirmation) => {
          const summary = applyMarkReadyResult(appointment, result, {
            clients: initialClients,
            setStationStatus,
            notify: (title, detail) => toast.message(title, detail),
            facilityName: "Doggieville MTL",
          });
          toast.success(`${appointment.petName} — Ready for Pickup`, {
            description: `Owner notified · total $${summary.updatedTotal.toFixed(2)}`,
          });
          setMarkReadyOpen(false);
        }}
      />
      {(() => {
        const paymentClient = initialClients.find(
          (c) => c.id === appointment.ownerId,
        );
        // Step 7 — same ZIP-prefix tax lookup BookingModal uses on
        // ConfirmStep so the two displays agree to the cent.
        const matchedTax = findZipTaxRate(
          paymentZipTaxRates,
          paymentClient?.address?.zip ?? "",
        );
        const resolvedTaxRate = matchedTax ? matchedTax.ratePercent / 100 : 0;
        return (
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        apt={appointment}
        client={paymentClient}
        applicableCustomerPackages={applicableCustomerPackages}
        taxRate={resolvedTaxRate}
        onConfirm={(result: PaymentResult) => {
          const summary = applyPaymentResult(appointment, result, {
            clients: initialClients,
            setStationStatus,
            notify: (title, detail) => toast.message(title, detail),
            facilityName: "Doggieville MTL",
          });
          toast.success(`${appointment.petName} — Completed`, {
            description: `Receipt sent · $${summary.amountCharged.toFixed(2)} charged`,
          });
          // Loyalty automation off the completed grooming booking.
          recordEvent({
            type: "booking_completed",
            id: String(appointment.id),
            customerId: appointment.ownerId,
            amount: summary.grandTotal,
            serviceType: "grooming",
            isService: true,
          });
          setPaymentOpen(false);
        }}
      />
        );
      })()}
    </DialogPrimitive.Root>
  );
}
