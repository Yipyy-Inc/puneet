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
} from "lucide-react";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { toast } from "sonner";
import { STATUS_META } from "./grooming-calendar";
import { useQuery } from "@tanstack/react-query";
import {
  groomingQueries,
  getEffectiveAlertNotes,
  canMarkReadyForPickup,
} from "@/lib/api/grooming";
import { PreVisitBriefing } from "./pre-visit-briefing";
import {
  CheckInConfirmationDialog,
  type CheckInConfirmation,
} from "./check-in-confirmation-dialog";
import { useState } from "react";

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

  if (!appointment) return null;

  const s = STATUS_META[appointment.status];
  const destructiveActions = DESTRUCTIVE_ACTIONS[appointment.status] ?? [];
  const effectiveAlerts = getEffectiveAlertNotes(appointment, allAppointments);
  const hasAlert =
    appointment.allergies.length > 0 || !!appointment.specialInstructions;
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
      const check = canMarkReadyForPickup(appointment!);
      if (!check.allowed) {
        toast.error("Can't mark ready yet", { description: check.reason });
        return;
      }
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
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          // Keep the calendar fully interactive behind the panel: don't close
          // on outside clicks, don't trap focus.
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className={cn(
            "fixed top-4 bottom-4 right-4 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col",
            "rounded-2xl border bg-background shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4",
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
                                toast.success(
                                  `${st.label} complete${
                                    next
                                      ? ` — handoff sent to ${next.stylistName}`
                                      : ""
                                  }`,
                                );
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
          (appointment as typeof appointment & {
            intake?: typeof appointment.intake;
          }).intake = {
            ...(appointment.intake ?? {
              coatCondition: "normal",
              behaviorNotes: "",
              allergies: appointment.allergies,
              specialInstructions: appointment.specialInstructions,
              beforePhotos: [],
              mattingFeeWarning: false,
            }),
            dropOffObservations:
              result.dropOffObservations ||
              appointment.intake?.dropOffObservations,
            sessionStartedAt: new Date().toISOString(),
          };
          appointment.addOns = result.addOns;
          appointment.checkInTime = new Date().toISOString();
          toast.success(`${appointment.petName} — In Progress`, {
            description: `Station ${result.stationName} · session started`,
          });
          setCheckInOpen(false);
        }}
      />
    </DialogPrimitive.Root>
  );
}
