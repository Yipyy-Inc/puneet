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
  Check,
  Hourglass,
  X,
  Sun,
  Bed,
  Scissors,
  GraduationCap,
} from "lucide-react";

import type { BookingRequest, BookingRequestService } from "@/types/booking";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { defaultServiceAddOns } from "@/data/service-addons";
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

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 py-1.5 first:pt-0 last:pb-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-foreground text-sm">{value}</div>
    </div>
  );
}

export interface BookingRequestDetailDialogProps {
  request: BookingRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "pending" | "waitlist";
  onSchedule?: (req: BookingRequest) => void;
  onDecline?: (req: BookingRequest) => void;
  onWaitlist?: (req: BookingRequest) => void;
}

export function BookingRequestDetailDialog({
  request,
  open,
  onOpenChange,
  variant = "pending",
  onSchedule,
  onDecline,
  onWaitlist,
}: BookingRequestDetailDialogProps) {
  if (!request) return null;

  const initial = request.petName.charAt(0).toUpperCase();
  const grad = gradientFor(request.clientName + request.petName);
  const isEmail = request.clientContact.includes("@");
  const room = request.roomPreference
    ? facilityRooms.find((r) => r.id === request.roomPreference)
    : null;

  const addOnLines = (request.extraServices ?? []).map((es) => {
    const def = defaultServiceAddOns.find((a) => a.id === es.serviceId);
    return {
      ...es,
      name: def?.name ?? es.serviceId,
      description: def?.description,
    };
  });

  const handleAction = (cb?: (req: BookingRequest) => void) => {
    if (!cb) return;
    cb(request);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-card flex max-h-[calc(100vh-4rem)] w-full flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:max-w-3xl"
      >
        <div className="relative overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 bg-linear-to-br opacity-90",
              grad,
            )}
            aria-hidden
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/20" aria-hidden />
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
                <span className="bg-white/20 text-white inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium backdrop-blur-sm">
                  {variant === "waitlist" ? "Waitlisted" : "Pending review"}
                </span>
                <span className="bg-white/15 text-white/95 inline-flex items-center gap-1 rounded-full px-2 py-0.5 backdrop-blur-sm">
                  <Clock className="size-3" />
                  Submitted {relativeTime(request.createdAt)}
                </span>
                <span className="bg-white/15 text-white/95 inline-flex items-center gap-1 rounded-full px-2 py-0.5 backdrop-blur-sm">
                  <Calendar className="size-3" />
                  {formatLongDate(request.appointmentAt)} ·{" "}
                  {formatTime(request.appointmentAt)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="text-white/80 hover:bg-white/15 hover:text-white flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
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
                  const occasions = fs.occasions.length;
                  const sourceLabel =
                    fs.source === "parent_brings"
                      ? "Parent brings food"
                      : fs.source === "facility_provides"
                        ? "Facility provides"
                        : "Mixed";
                  return (
                    <li key={fs.id} className="space-y-2 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {occasions} {occasions === 1 ? "meal" : "meals"} /
                          day · {fs.frequency.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {sourceLabel}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {fs.occasions.map((occ) => (
                          <div
                            key={occ.id}
                            className="text-muted-foreground flex items-baseline gap-2 text-xs"
                          >
                            <span className="text-foreground tabular-nums">
                              {occ.time}
                            </span>
                            <span>{occ.label}</span>
                            <span className="truncate">
                              {occ.components
                                .map((c) => `${c.amount} ${c.unit} ${c.name}`)
                                .join(" + ")}
                            </span>
                          </div>
                        ))}
                      </div>
                      {fs.allergies.length > 0 && (
                        <div className="text-destructive text-xs">
                          ⚠ Allergies: {fs.allergies.join(", ")}
                        </div>
                      )}
                      {fs.notes && (
                        <div className="text-muted-foreground line-clamp-2 text-xs italic">
                          “{fs.notes}”
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {request.medications && request.medications.length > 0 && (
            <Section icon={Pill} title="Medications">
              <ul className="divide-border/50 -my-3 divide-y">
                {request.medications.map((m) => (
                  <li key={m.id} className="space-y-1 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground text-sm font-medium">
                        {m.name}
                        {m.strength && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · {m.strength}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {m.frequency.replace(/_/g, " ")}
                      </span>
                    </div>
                    {m.purpose && (
                      <div className="text-muted-foreground text-xs">
                        For: {m.purpose}
                      </div>
                    )}
                    <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
                      {m.times.map((t, i) => (
                        <span key={i}>{t}</span>
                      ))}
                      <span>· {m.amount}</span>
                    </div>
                    {m.notes && (
                      <div className="text-muted-foreground line-clamp-2 text-xs italic">
                        “{m.notes}”
                      </div>
                    )}
                  </li>
                ))}
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

        <div className="bg-card border-border/60 flex items-center justify-end gap-2 border-t px-6 py-4">
          {onDecline && (
            <Button
              size="sm"
              onClick={() => handleAction(onDecline)}
              className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 text-white shadow-none"
            >
              <X className="size-3.5" />
              Decline
            </Button>
          )}
          {onWaitlist && variant === "pending" && (
            <Button
              size="sm"
              onClick={() => handleAction(onWaitlist)}
              className="bg-warning/10 text-warning hover:bg-warning/20 focus-visible:ring-warning/30 border-0 shadow-none"
            >
              <Hourglass className="size-3.5" />
              Move to waitlist
            </Button>
          )}
          {onSchedule && (
            <Button
              size="sm"
              onClick={() => handleAction(onSchedule)}
              className="bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success/30 shadow-none"
            >
              <Check className="size-3.5" />
              Schedule booking
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
