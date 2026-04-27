"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Check,
  ChevronRight,
  MoreHorizontal,
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

const DESTRUCTIVE_ACTIONS: Partial<Record<GroomingStatus, { next: GroomingStatus; label: string }[]>> = {
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
  const destructiveActions = DESTRUCTIVE_ACTIONS[appointment.status] ?? [];
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 flex flex-col overflow-hidden max-h-[calc(100vh-4rem)]"
        showCloseButton={true}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-pink-100 text-pink-700 text-xl font-bold dark:bg-pink-900/30 dark:text-pink-300 flex-shrink-0">
                {appointment.petName.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-base leading-tight">
                  {appointment.petName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {appointment.petBreed}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-shrink-0">
              <Badge className={cn("capitalize text-xs border-0", s.bg, s.text)}>
                {s.label}
              </Badge>
              {destructiveActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {destructiveActions.map((a) => (
                      <DropdownMenuItem
                        key={a.next}
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleAction(a.next)}
                      >
                        {a.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Interactive status steps */}
          {!isTerminal && (
            <div className="flex items-center gap-0.5 flex-wrap">
              {STATUS_FLOW.map((step, i) => {
                const isDone = i < currentStepIdx;
                const isCurrent = i === currentStepIdx;
                const isNext = i === currentStepIdx + 1;
                return (
                  <div key={step} className="flex items-center gap-0.5">
                    <button
                      onClick={isNext ? () => handleAction(step) : undefined}
                      disabled={!isNext}
                      title={isNext ? `Click to mark as ${STATUS_LABELS[step]}` : undefined}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all select-none",
                        isDone && "text-pink-500",
                        isCurrent && "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
                        isNext && "cursor-pointer ring-1 ring-border text-muted-foreground hover:ring-pink-400 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/30",
                        !isDone && !isCurrent && !isNext && "text-muted-foreground/40 cursor-default",
                      )}
                    >
                      {isDone && <Check className="size-3" />}
                      {STATUS_LABELS[step]}
                    </button>
                    {i < STATUS_FLOW.length - 1 && (
                      <ChevronRight className="size-3 text-muted-foreground/30 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex flex-col gap-5 px-6 py-5 flex-1 overflow-y-auto">
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

          {/* Two-column layout for main info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Pet + Owner */}
            <div className="flex flex-col gap-5">
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

              <div>
                <SectionLabel>Owner</SectionLabel>
                <div className="flex flex-col gap-3">
                  <InfoRow icon={User} label="Name" value={appointment.ownerName} />
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
            </div>

            {/* Right: Appointment + Price */}
            <div className="flex flex-col gap-5">
              <div>
                <SectionLabel>Appointment</SectionLabel>
                <div className="flex flex-col gap-3">
                  <InfoRow icon={Scissors} label="Service" value={appointment.packageName} />
                  <InfoRow icon={User} label="Groomer" value={appointment.stylistName} />
                  <InfoRow icon={CalendarDays} label="Date" value={displayDate} />
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
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
