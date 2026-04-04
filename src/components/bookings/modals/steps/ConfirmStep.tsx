import {
  PawPrint,
  CalendarDays,
  Clock,
  DoorOpen,
  Utensils,
  Pill,
  Sparkles,
  Mail,
  Smartphone,
  User,
  CheckCircle2,
  Pencil,
  AlertTriangle,
  Moon,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { evaluationConfig } from "@/data/settings";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type { Pet } from "@/types/pet";
import type { Client } from "@/types/client";
import { SERVICE_CATEGORIES } from "../constants";

interface ConfirmStepProps {
  selectedClient: Client | undefined;
  selectedPets: Pet[];
  selectedService: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  daycareSelectedDates: Date[];
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  feedingSchedule: FeedingScheduleItem[];
  medications: MedicationItem[];
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  calculatePrice: { basePrice: number; total: number };
  notificationEmail: boolean;
  setNotificationEmail: (value: boolean) => void;
  notificationSMS: boolean;
  setNotificationSMS: (value: boolean) => void;
  /** Jump to a specific wizard step (index) + optional sub-step */
  onEditStep?: (stepIndex: number, subStep?: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string) {
  try {
    return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return t;
  }
}

function fmtDateLong(d: Date | string) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });
}

function nightsBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ── Section header with optional Edit button ──────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  onEdit,
}: {
  icon: React.ElementType;
  label: string;
  onEdit?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          {label}
        </span>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[10px] font-medium transition-colors"
        >
          <Pencil className="size-2.5" />
          Edit
        </button>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfirmStep({
  selectedClient,
  selectedPets,
  selectedService,
  serviceType,
  startDate,
  endDate,
  checkInTime,
  checkOutTime,
  daycareSelectedDates,
  boardingRangeStart,
  boardingRangeEnd,
  boardingDateTimes,
  roomAssignments,
  feedingSchedule,
  medications,
  extraServices,
  calculatePrice,
  notificationEmail,
  setNotificationEmail,
  notificationSMS,
  setNotificationSMS,
  onEditStep,
}: ConfirmStepProps) {
  const serviceInfo = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
  const ServiceIcon = serviceInfo?.icon ?? PawPrint;
  const hasAddons = extraServices.length > 0;
  const hasRooms = roomAssignments.length > 0;
  const isEvaluation = selectedService === "evaluation";
  const isDaycareOrBoarding =
    selectedService === "daycare" || selectedService === "boarding";

  // #1 — Missing data warnings
  const roomsIncomplete =
    isDaycareOrBoarding && selectedPets.length > roomAssignments.length;
  const noFeeding = isDaycareOrBoarding && feedingSchedule.length === 0;
  const noMeds = isDaycareOrBoarding && medications.length === 0;

  // #5 — Boarding nights count
  const boardingNights =
    boardingRangeStart && boardingRangeEnd
      ? nightsBetween(boardingRangeStart, boardingRangeEnd)
      : 0;

  // Time display
  const timeDisplay =
    selectedService === "boarding" && boardingDateTimes.length > 0
      ? `${fmtTime(boardingDateTimes[0]?.checkInTime || checkInTime)} — ${fmtTime(boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime || checkOutTime)}`
      : checkInTime
        ? `${fmtTime(checkInTime)}${checkOutTime ? ` — ${fmtTime(checkOutTime)}` : ""}`
        : "";

  // Step index helpers for edit jumps (step ids: service=0, client-pet=1, details=2, confirm=3)
  const detailsStepIdx = onEditStep ? 2 : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <ServiceIcon className="text-primary size-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Review Your Booking</h2>
          <p className="text-muted-foreground text-sm">
            {serviceInfo?.name}
            {serviceType
              ? ` · ${serviceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`
              : ""}
          </p>
        </div>
      </div>

      {/* ── #1 — Warnings ───────────────────────────────────────── */}
      {roomsIncomplete && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800">
            {selectedPets.length - roomAssignments.length} pet
            {selectedPets.length - roomAssignments.length > 1 ? "s" : ""} not
            assigned to a room.{" "}
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(detailsStepIdx, 1)}
                className="font-semibold underline"
              >
                Assign now
              </button>
            )}
          </p>
        </div>
      )}

      {/* ── Client & Pets ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={User}
            label="Client"
            onEdit={onEditStep ? () => onEditStep(1) : undefined}
          />
          <p className="text-sm font-semibold">{selectedClient?.name ?? "—"}</p>
          {selectedClient?.email && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {selectedClient.email}
            </p>
          )}
          {selectedClient?.phone && (
            <p className="text-muted-foreground text-xs">
              {selectedClient.phone}
            </p>
          )}
        </div>

        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={PawPrint}
            label={`Pet${selectedPets.length > 1 ? "s" : ""}`}
            onEdit={onEditStep ? () => onEditStep(1) : undefined}
          />
          <div className="flex flex-wrap gap-2">
            {selectedPets.map((pet) => (
              <div key={pet.id} className="flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
                  {pet.name[0]}
                </span>
                <div>
                  <p className="text-sm leading-tight font-semibold">
                    {pet.name}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {pet.type} · {pet.breed}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── #4 — Evaluation info card ───────────────────────────── */}
      {isEvaluation && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <SectionHeader icon={ClipboardCheck} label="Evaluation Details" />
          <p className="text-sm font-semibold">
            {evaluationConfig.customerName}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {evaluationConfig.description}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Duration
              </p>
              <p className="text-xs font-semibold">
                {evaluationConfig.schedule.defaultDurationMinutes} min
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Price
              </p>
              <p className="text-xs font-semibold text-emerald-600">Free</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule ────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-4">
        <SectionHeader
          icon={CalendarDays}
          label="Schedule"
          onEdit={onEditStep ? () => onEditStep(detailsStepIdx, 0) : undefined}
        />

        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Date
            </p>
            {selectedService === "daycare" &&
            daycareSelectedDates.length > 0 ? (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {daycareSelectedDates.map((date, idx) => (
                  <span
                    key={idx}
                    className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ))}
              </div>
            ) : selectedService === "boarding" &&
              boardingRangeStart &&
              boardingRangeEnd ? (
              <p className="text-sm font-semibold">
                {fmtDateLong(boardingRangeStart)} →{" "}
                {fmtDateLong(boardingRangeEnd)}
              </p>
            ) : startDate ? (
              <p className="text-sm font-semibold">
                {fmtDateLong(startDate)}
                {endDate && endDate !== startDate && (
                  <> → {fmtDateLong(endDate)}</>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Not set</p>
            )}
          </div>

          {/* #5 — Boarding nights count */}
          {selectedService === "boarding" && boardingNights > 0 && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Duration
              </p>
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Moon className="text-muted-foreground size-3" />
                {boardingNights} night{boardingNights !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {timeDisplay && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Time
              </p>
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Clock className="text-muted-foreground size-3" />
                {timeDisplay}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Room Assignments ────────────────────────────────────── */}
      {(hasRooms || roomsIncomplete) && (
        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={DoorOpen}
            label="Room Assignments"
            onEdit={
              onEditStep ? () => onEditStep(detailsStepIdx, 1) : undefined
            }
          />
          {hasRooms ? (
            <div className="flex flex-wrap gap-2">
              {roomAssignments.map((a) => {
                const pet = selectedPets.find((p) => p.id === a.petId);
                return (
                  <div
                    key={a.petId}
                    className="bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-bold">
                      {pet?.name[0]}
                    </span>
                    <span className="text-xs font-medium">{pet?.name}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-xs font-semibold capitalize">
                      {a.roomId.replace(/-/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              No rooms assigned yet
            </p>
          )}
        </div>
      )}

      {/* ── Add-ons ─────────────────────────────────────────────── */}
      {hasAddons && (
        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={Sparkles}
            label="Add-ons"
            onEdit={
              onEditStep ? () => onEditStep(detailsStepIdx, 2) : undefined
            }
          />
          <div className="space-y-1.5">
            {extraServices.map((es) => {
              const pet = selectedPets.find((p) => p.id === es.petId);
              return (
                <div
                  key={`${es.serviceId}-${es.petId}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary flex size-4 items-center justify-center rounded-full text-[8px] font-bold">
                      {pet?.name[0]}
                    </span>
                    <span className="capitalize">
                      {es.serviceId.replace(/-/g, " ")}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-[tabular-nums]">
                    × {es.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Care Notes ──────────────────────────────────────────── */}
      {isDaycareOrBoarding && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Feeding */}
          <div className="rounded-2xl border p-4">
            <SectionHeader
              icon={Utensils}
              label="Feeding"
              onEdit={
                onEditStep ? () => onEditStep(detailsStepIdx, 3) : undefined
              }
            />
            {feedingSchedule.length > 0 ? (
              feedingSchedule.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  {item.occasions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.occasions.map((occ) => (
                        <span
                          key={occ.id}
                          className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700"
                        >
                          {occ.label} · {fmtTime(occ.time)}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.allergies && item.allergies.length > 0 && (
                    <p className="text-[11px] text-red-600">
                      Allergies: {item.allergies.join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-muted-foreground text-[11px] italic">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              /* #1 — empty state */
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Info className="size-3 shrink-0" />
                No feeding instructions added
              </p>
            )}
          </div>

          {/* Medications */}
          <div className="rounded-2xl border p-4">
            <SectionHeader
              icon={Pill}
              label="Medications"
              onEdit={
                onEditStep ? () => onEditStep(detailsStepIdx, 3) : undefined
              }
            />
            {medications.length > 0 ? (
              <div className="space-y-2">
                {medications.map((med, idx) => (
                  <div key={idx}>
                    <p className="text-xs font-semibold">
                      {med.name || `Medication ${idx + 1}`}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {med.amount}
                      {med.strength ? ` (${med.strength})` : ""} ·{" "}
                      {med.form.replace(/_/g, " ")}
                      {med.times.length > 0 &&
                        ` · ${med.times.map(fmtTime).join(", ")}`}
                    </p>
                    {med.notes && (
                      <p className="text-muted-foreground text-[11px] italic">
                        {med.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* #1 — empty state */
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Info className="size-3 shrink-0" />
                No medications added
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────── */}
      <div className="rounded-2xl border p-4">
        <SectionHeader icon={Mail} label="Notifications" />
        <p className="text-muted-foreground mb-3 text-[11px]">
          Defaults are set per service in Settings → Notifications. Toggle off
          to skip for this booking.
        </p>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <Label
              htmlFor="confirm-email"
              className="flex cursor-pointer items-start gap-2"
            >
              <Mail className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Email confirmation</p>
                {/* #6 — explanation */}
                <p className="text-muted-foreground text-[11px]">
                  Booking confirmation with date, time, and care instructions
                </p>
              </div>
            </Label>
            <Switch
              id="confirm-email"
              checked={notificationEmail}
              onCheckedChange={setNotificationEmail}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <Label
              htmlFor="confirm-sms"
              className="flex cursor-pointer items-start gap-2"
            >
              <Smartphone className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">SMS notification</p>
                {/* #6 — explanation */}
                <p className="text-muted-foreground text-[11px]">
                  Short booking reminder sent before the visit
                </p>
              </div>
            </Label>
            <Switch
              id="confirm-sms"
              checked={notificationSMS}
              onCheckedChange={setNotificationSMS}
            />
          </div>
        </div>
      </div>

      {/* ── #3 — Price breakdown ────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border-2",
          "border-primary/30",
        )}
      >
        {/* Line items */}
        <div className="space-y-1.5 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {serviceInfo?.name}
              {serviceType ? ` (${serviceType.replace(/_/g, " ")})` : ""}
              {selectedService === "daycare" && daycareSelectedDates.length > 1
                ? ` × ${daycareSelectedDates.length} days`
                : ""}
              {selectedService === "boarding" && boardingNights > 0
                ? ` × ${boardingNights} nights`
                : ""}
            </span>
            <span className="font-[tabular-nums] font-medium">
              ${calculatePrice.basePrice.toFixed(2)}
            </span>
          </div>
          {hasAddons && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Add-ons ({extraServices.reduce((s, e) => s + e.quantity, 0)}{" "}
                items)
              </span>
              <span className="font-[tabular-nums] font-medium">
                ${(calculatePrice.total - calculatePrice.basePrice).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-primary/5 flex items-center justify-between border-t px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-primary size-5" />
            <span className="text-sm font-bold">Total</span>
          </div>
          <span className="text-primary font-[tabular-nums] text-xl font-bold">
            ${calculatePrice.total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
