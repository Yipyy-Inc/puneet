"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BookmarkPlus,
  PawPrint,
} from "lucide-react";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { toast } from "sonner";
import { STATUS_META } from "./grooming-calendar";

// ─── Status workflow ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<GroomingStatus, string> = {
  scheduled: "Scheduled",
  "checked-in": "Checked In",
  "in-progress": "In Progress",
  "ready-for-pickup": "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

const STATUS_FLOW: GroomingStatus[] = [
  "scheduled",
  "checked-in",
  "in-progress",
  "ready-for-pickup",
  "completed",
];

type StatusAction = {
  next: GroomingStatus;
  label: string;
  variant: "default" | "destructive" | "outline";
};

const STATUS_ACTIONS: Partial<Record<GroomingStatus, StatusAction[]>> = {
  scheduled: [
    { next: "checked-in", label: "Check In", variant: "default" },
    { next: "cancelled", label: "Cancel Appointment", variant: "destructive" },
  ],
  "checked-in": [
    { next: "in-progress", label: "Start Grooming", variant: "default" },
    { next: "no-show", label: "Mark No Show", variant: "destructive" },
  ],
  "in-progress": [
    { next: "ready-for-pickup", label: "Mark Ready for Pickup", variant: "default" },
  ],
  "ready-for-pickup": [
    { next: "completed", label: "Complete & Check Out", variant: "default" },
  ],
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
      <div className="flex size-7 items-center justify-center rounded-md bg-muted flex-shrink-0 mt-0.5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-none mb-0.5">
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
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
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
  if (!appointment) return null;

  const s = STATUS_META[appointment.status];
  const actions = STATUS_ACTIONS[appointment.status] ?? [];
  const currentStepIdx = STATUS_FLOW.indexOf(appointment.status);
  const isTerminal = ["cancelled", "no-show"].includes(appointment.status);
  const hasAlert =
    appointment.allergies.length > 0 || !!appointment.specialInstructions;
  const priceAdjTotal = appointment.priceAdjustments.reduce(
    (sum, a) => sum + a.amount,
    0,
  );

  function handleAction(next: GroomingStatus) {
    toast.success(`Status updated to "${STATUS_LABELS[next]}"`);
    onOpenChange(false);
  }

  const displayDate = new Date(
    appointment.date + "T00:00:00",
  ).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] flex flex-col p-0 overflow-y-auto gap-0">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-pink-100 text-pink-700 text-xl font-bold dark:bg-pink-900/30 dark:text-pink-300 flex-shrink-0">
                {appointment.petName.charAt(0)}
              </div>
              <div>
                <SheetHeader className="p-0 text-left">
                  <SheetTitle className="text-base leading-tight">
                    {appointment.petName}
                  </SheetTitle>
                </SheetHeader>
                <p className="text-sm text-muted-foreground">
                  {appointment.petBreed}
                </p>
              </div>
            </div>
            <Badge
              className={cn(
                "capitalize text-xs mt-1 flex-shrink-0",
                s.bg,
                s.text,
                "border-0",
              )}
            >
              {s.label}
            </Badge>
          </div>

          {/* Progress bar (hidden for terminal statuses) */}
          {!isTerminal && (
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((step, i) => (
                <div
                  key={step}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= currentStepIdx
                      ? "bg-pink-500"
                      : "bg-muted-foreground/20",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-5 px-6 py-5 flex-1">
          {/* Alert banner */}
          {hasAlert && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {appointment.allergies.length > 0 && (
                  <p>
                    <strong>Allergies:</strong>{" "}
                    {appointment.allergies.join(", ")}
                  </p>
                )}
                {appointment.specialInstructions && (
                  <p>
                    <strong>Instructions:</strong>{" "}
                    {appointment.specialInstructions}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pet details */}
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
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="text-xs font-semibold capitalize mt-0.5">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Owner */}
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

          {/* Appointment */}
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
                label="Groomer"
                value={appointment.stylistName}
              />
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
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1 self-center">
                  <PawPrint className="size-3 inline mr-1" />
                  Add-ons:
                </span>
                {appointment.addOns.map((ao) => (
                  <Badge key={ao} variant="secondary" className="text-xs">
                    {ao}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Price */}
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
              <div className="flex justify-between font-semibold text-base pt-0.5">
                <span>Total</span>
                <span>${appointment.totalPrice}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <>
              <Separator />
              <div>
                <SectionLabel>Notes</SectionLabel>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">
                  {appointment.notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Footer actions ── */}
        {(actions.length > 0 || appointment.status === "completed") && (
          <div className="sticky bottom-0 border-t bg-background px-6 py-4">
            {actions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.next}
                    variant={action.variant}
                    className="w-full"
                    onClick={() => handleAction(action.next)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info("Book Again — coming soon")}
              >
                <BookmarkPlus className="size-4 mr-2" />
                Book Again
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
