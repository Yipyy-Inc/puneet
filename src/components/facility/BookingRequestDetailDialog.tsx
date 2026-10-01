"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  PawPrint,
  Utensils,
  Pill,
  Bell,
  StickyNote,
  Plus,
  X,
  Sun,
  Bed,
  Scissors,
  GraduationCap,
} from "lucide-react";

import type { BookingRequest, BookingRequestService } from "@/types/booking";
import {
  BookingRequestActions,
  type BookingRequestActionHandlers,
} from "@/components/facility/BookingRequestActions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { namesAddOn } from "@/lib/add-ons/bookable";
import {
  useFeedingInstructions,
  useMedicationInstructions,
  useServiceAddOns,
} from "@/lib/api/facility-settings";
import { describeFeeding } from "@/lib/feeding/describe";
import { describeMedication } from "@/lib/medications/describe";
import { fill as fillWords } from "@/lib/medications/dose";
import { bookingStay } from "@/lib/medications/schedule";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { facilityRooms } from "@/data/rooms";
import { cn } from "@/lib/utils";

const SERVICE_META: Record<
  BookingRequestService,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  daycare: { label: "Daycare", icon: Sun },
  boarding: { label: "Boarding", icon: Bed },
  grooming: { label: "Grooming", icon: Scissors },
  training: { label: "Training", icon: GraduationCap },
};

const AVATAR_GRAD = [
  "from-sky-400 to-violet-500",
  "from-violet-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
];

function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRAD[Math.abs(h) % AVATAR_GRAD.length];
}

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(yyyymmdd: string) {
  return new Date(yyyymmdd + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="bg-muted/40 rounded-2xl p-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 py-1.5 first:pt-0 last:pb-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-foreground text-sm">{value}</div>
    </div>
  );
}

export interface BookingRequestDetailDialogProps extends BookingRequestActionHandlers {
  request: BookingRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "pending" | "waitlist";
  busy?: boolean;
}

export function BookingRequestDetailDialog({
  request,
  open,
  onOpenChange,
  variant = "pending",
  busy,
  onReview,
  onApproveAtQuote,
  onWaitlist,
  onDecline,
}: BookingRequestDetailDialogProps) {
  // The facility's own extras, for resolving a requested add-on's name. This
  // looked the id up in the shipped fixture, so an add-on the business had
  // added itself displayed as a raw id.
  const { addOns: facilityAddOns } = useServiceAddOns();
  // The owner's feeding plan in the reader's words (2026-10-01).
  const words = useShellText("booking");
  const locale = useShellLocale();
  const { instructions: feedingSettings } = useFeedingInstructions();
  const { instructions: medicationSettings } = useMedicationInstructions();
  if (!request) return null;

  // The stay the owner's care is planned over, as the booking form planned it.
  const careService = request.services.includes("boarding")
    ? "boarding"
    : (request.services[0] ?? "");
  const careStay = bookingStay({
    service: careService,
    startDate: request.startDate,
    endDate: request.endDate,
  });
  const takesNone = (request.noMedication ?? []).includes(request.petId);
  const vet = request.vetContacts?.[String(request.petId)];
  const vetText = vet
    ? [vet.clinic, vet.phone].filter(Boolean).join(" · ")
    : "";

  const initial = request.petName.charAt(0).toUpperCase();
  const grad = gradientFor(request.clientName + request.petName);
  const isEmail = request.clientContact.includes("@");
  const room = request.roomPreference
    ? facilityRooms.find((r) => r.id === request.roomPreference)
    : null;

  const addOnLines = (request.extraServices ?? []).map((es) => {
    const def = facilityAddOns.find((a) => namesAddOn(es.serviceId, a));
    return {
      ...es,
      name: def?.name ?? es.serviceId,
      description: def?.description,
    };
  });

  const closeThen =
    (cb: (req: BookingRequest) => void) => (req: BookingRequest) => {
      onOpenChange(false);
      cb(req);
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-card flex max-h-[calc(100vh-4rem)] w-full flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:max-w-3xl"
      >
        <div className="relative overflow-hidden">
          <div
            className={cn("absolute inset-0 bg-linear-to-br opacity-90", grad)}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-linear-to-b from-transparent to-black/20"
            aria-hidden
          />
          <div className="relative flex items-start gap-4 p-6">
            <div className="bg-card/95 text-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-md backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1 text-white">
              <DialogTitle className="text-2xl/tight font-bold tracking-tight">
                {request.petName}
              </DialogTitle>
              <div className="mt-0.5 truncate text-sm text-white/85">
                Booking request from {request.clientName}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-medium text-white backdrop-blur-sm">
                  {variant === "waitlist" ? "Waitlisted" : "Pending review"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-white/95 backdrop-blur-sm">
                  <Clock className="size-3" />
                  Submitted {relativeTime(request.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-white/95 backdrop-blur-sm">
                  <Calendar className="size-3" />
                  {formatLongDate(request.appointmentAt)} ·{" "}
                  {formatTime(request.appointmentAt)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Section icon={PawPrint} title="Customer & pet">
            <Field label="Pet" value={request.petName} />
            <Field label="Client" value={request.clientName} />
            <Field
              label="Contact"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {isEmail ? (
                    <Mail className="text-muted-foreground size-3.5" />
                  ) : (
                    <Phone className="text-muted-foreground size-3.5" />
                  )}
                  {request.clientContact}
                </span>
              }
            />
          </Section>

          <Section icon={Calendar} title="Appointment">
            <Field
              label="Services"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {request.services.map((s) => {
                    const meta = SERVICE_META[s];
                    const Icon = meta.icon;
                    return (
                      <span
                        key={s}
                        className="bg-card text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      >
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              }
            />
            {request.startDate && request.endDate && (
              <Field
                label="Range"
                value={
                  request.endDate === request.startDate
                    ? formatDate(request.startDate)
                    : `${formatDate(request.startDate)} → ${formatDate(request.endDate)}`
                }
              />
            )}
            {(request.checkInTime || request.checkOutTime) && (
              <Field
                label="Check in / out"
                value={
                  <span className="tabular-nums">
                    {request.checkInTime ?? "—"}{" "}
                    <span className="text-muted-foreground">to</span>{" "}
                    {request.checkOutTime ?? "—"}
                  </span>
                }
              />
            )}
            {request.daycareDates && request.daycareDates.length > 0 && (
              <Field
                label="Daycare days"
                value={
                  <div className="flex flex-wrap gap-1">
                    {request.daycareDates.map((d) => (
                      <span
                        key={d}
                        className="bg-card rounded-md px-1.5 py-0.5 text-xs tabular-nums"
                      >
                        {formatDate(d)}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
            {(room || request.daycareSectionId) && (
              <Field
                label="Location"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="text-muted-foreground size-3.5" />
                    {room?.name ?? request.daycareSectionId ?? "—"}
                  </span>
                }
              />
            )}
          </Section>

          {addOnLines.length > 0 && (
            <Section icon={Plus} title="Add-ons">
              <ul className="divide-border/50 -my-2 divide-y">
                {addOnLines.map((line) => (
                  <li
                    key={`${line.serviceId}-${line.petId}`}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-foreground text-sm font-medium">
                        {line.name}
                      </div>
                      {line.description && (
                        <div className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          {line.description}
                        </div>
                      )}
                    </div>
                    <span className="bg-card shrink-0 rounded-md px-2 py-0.5 text-xs tabular-nums">
                      ×{line.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {request.feedingSchedule && request.feedingSchedule.length > 0 && (
            <Section icon={Utensils} title="Feeding">
              <ul className="divide-border/50 -my-3 divide-y">
                {request.feedingSchedule.map((fs) => {
                  const lines = describeFeeding(fs, {
                    t: words,
                    locale,
                    stay: careStay,
                    settings: feedingSettings,
                    service: careService,
                  });
                  return (
                    <li key={fs.id} className="space-y-1 py-3">
                      <div className="text-foreground text-sm font-medium">
                        {lines.meals}
                      </div>
                      {lines.foods.map((food, index) => (
                        <div
                          key={`${index}-${food}`}
                          className="text-muted-foreground text-xs"
                        >
                          {food}
                        </div>
                      ))}
                      {lines.extras.map((extra) => (
                        <div
                          key={extra}
                          className="text-muted-foreground text-xs italic"
                        >
                          {extra}
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {((request.medications?.length ?? 0) > 0 || takesNone || vetText) && (
            <Section icon={Pill} title={words("medications")}>
              <ul className="divide-border/50 -my-3 divide-y">
                {(request.medications ?? []).map((m) => {
                  // The step's own words for it, as the owner saved it —
                  // dose, days and times, how it is given (2026-10-01).
                  const lines = describeMedication(m, {
                    t: words,
                    locale,
                    stay: careStay,
                    settings: medicationSettings,
                  });
                  return (
                    <li key={m.id} className="space-y-1 py-3">
                      <span className="text-foreground text-sm font-medium">
                        {m.name}
                        {m.strength && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · {m.strength}
                          </span>
                        )}
                      </span>
                      {lines.dose ? (
                        <div className="text-muted-foreground text-xs">
                          {lines.dose}
                        </div>
                      ) : null}
                      {lines.schedule ? (
                        <div className="text-muted-foreground text-xs">
                          {lines.schedule}
                        </div>
                      ) : null}
                      <div className="text-muted-foreground text-xs">
                        {lines.method}
                      </div>
                      {lines.extras.map((extra) => (
                        <div
                          key={extra}
                          className="text-muted-foreground line-clamp-2 text-xs"
                        >
                          {extra}
                        </div>
                      ))}
                    </li>
                  );
                })}
                {takesNone ? (
                  <li className="text-muted-foreground py-3 text-xs">
                    {fillWords(words("medsTakesNone"), {
                      pet: request.petName,
                    })}
                  </li>
                ) : null}
                {vetText ? (
                  <li className="text-muted-foreground py-3 text-xs">
                    {fillWords(words("medsVetLine"), { vet: vetText })}
                  </li>
                ) : null}
              </ul>
            </Section>
          )}

          <Section icon={Bell} title="Notifications">
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  request.notificationEmail
                    ? "bg-success/15 text-success"
                    : "bg-card text-muted-foreground",
                )}
              >
                <Mail className="size-3" />
                Email{" "}
                <span className="opacity-70">
                  {request.notificationEmail ? "on" : "off"}
                </span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  request.notificationSMS
                    ? "bg-success/15 text-success"
                    : "bg-card text-muted-foreground",
                )}
              >
                <Phone className="size-3" />
                SMS{" "}
                <span className="opacity-70">
                  {request.notificationSMS ? "on" : "off"}
                </span>
              </span>
            </div>
          </Section>

          {request.notes && (
            <Section icon={StickyNote} title="Notes">
              <p className="text-foreground/90 text-sm/relaxed">
                {request.notes}
              </p>
            </Section>
          )}
        </div>

        <div className="bg-card border-border/60 border-t px-6 py-4">
          <BookingRequestActions
            request={request}
            variant={variant}
            busy={busy}
            onReview={closeThen(onReview)}
            onApproveAtQuote={
              onApproveAtQuote ? closeThen(onApproveAtQuote) : undefined
            }
            onWaitlist={onWaitlist ? closeThen(onWaitlist) : undefined}
            onDecline={closeThen(onDecline)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
