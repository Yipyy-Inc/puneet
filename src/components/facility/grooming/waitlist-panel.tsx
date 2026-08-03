"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Clock,
  Hourglass,
  Mail,
  MessageCircle,
  Phone,
  Scissors,
  User,
  CalendarPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { toast } from "sonner";
import type {
  GroomingWaitlistEntry,
  GroomingWaitlistStatus,
} from "@/data/grooming-waitlist";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { buildWaitlistOfferForEntry } from "@/lib/grooming-waitlist-offer";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── Rendering the STRUCTURED preference ─────────────────────────────────────
//
// This panel used to read `preferredTimeWindow`, `preferredStylistName` and
// `notes` — the three legacy halves of the type's legacy/structured field
// pairs. Entries from Postgres never carry them (20260806100000, Decision 1),
// and neither did the two newer mock entries, so those rows rendered a name and
// a service and nothing else: no time preference, no comment, no groomer.
//
// These read the structured half. The legacy fields are still accepted as a
// fallback so an entry built by a non-Postgres caller keeps rendering.

const PERIOD_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Any time",
};

function timePreferenceLabel(entry: GroomingWaitlistEntry): string | null {
  const pref = entry.expectedTime;
  if (!pref) {
    return entry.preferredTimeWindow
      ? (PERIOD_LABEL[entry.preferredTimeWindow] ?? null)
      : null;
  }
  if (pref.kind === "anytime") return "Any time";
  if (pref.kind === "period") return PERIOD_LABEL[pref.period] ?? null;
  return `At ${pref.time}`;
}

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

/** Null for `asap` — "as soon as possible" is the absence of a date
 *  constraint, and a chip saying so is noise on every second card. */
function datePreferenceLabel(entry: GroomingWaitlistEntry): string | null {
  const pref = entry.expectedDate;
  if (!pref || pref.kind === "asap") return null;
  if (pref.kind === "specific-date") return shortDate(pref.date);
  if (pref.kind === "range") {
    return `${shortDate(pref.startDate)} – ${shortDate(pref.endDate)}`;
  }
  return pref.daysOfWeek
    .map((d) => WEEKDAY_LABEL[d] ?? "")
    .filter(Boolean)
    .join(", ");
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.round((now - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const STATUS_STYLES: Record<
  GroomingWaitlistStatus,
  { label: string; className: string }
> = {
  waiting: {
    label: "Waiting",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  },
  offered: {
    label: "Offered",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  expired: {
    label: "Expired",
    className:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  removed: {
    label: "Removed",
    className:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

function OfferCountdown({ untilIso }: { untilIso: string }) {
  // Gated by mount so server/client times match on hydrate.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const remainMs = new Date(untilIso).getTime() - now;
  if (remainMs <= 0) {
    return (
      <span className="text-[10px] font-semibold text-red-600">
        offer expired
      </span>
    );
  }
  const mins = Math.round(remainMs / 60_000);
  if (mins < 60)
    return (
      <span className="text-[10px] font-medium text-sky-700">
        {mins} min to confirm
      </span>
    );
  const hours = Math.floor(mins / 60);
  return (
    <span className="text-[10px] font-medium text-sky-700">
      {hours}h {mins % 60}m to confirm
    </span>
  );
}

export function WaitlistPanel({
  open,
  onOpenChange,
  date,
  entries,
  onBookFromWaitlist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  entries: GroomingWaitlistEntry[];
  onBookFromWaitlist?: (entry: GroomingWaitlistEntry) => void;
}) {
  const { setStatus, expireAndOfferNext } = useGroomingWaitlist();
  // `preferredStylistIds` are ids; the card shows people. The legacy
  // `preferredStylistName` is never set on an entry from Postgres, so without
  // this lookup a client who asked for a specific groomer renders as if they
  // did not care who grooms their dog.
  const { data: stylists = [] } = useQuery(groomingQueries.stylists());
  const preferredNames = (entry: GroomingWaitlistEntry): string | null => {
    const ids = entry.preferredStylistIds ?? [];
    if (ids.length === 0) return entry.preferredStylistName ?? null;
    const names = ids.map(
      (id) => stylists.find((s) => s.id === id)?.name ?? id,
    );
    return names.join(", ");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Hourglass className="size-4 text-amber-600" />
            Waitlist
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-5 bg-amber-500 px-1.5 text-white"
            >
              {entries.length}
            </Badge>
          </SheetTitle>
          <p className="text-muted-foreground text-xs">
            {formatDateLong(date)}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Hourglass className="text-muted-foreground/40 size-6" />
              <p className="text-muted-foreground text-sm">
                Nobody on the waitlist for this date.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((e) => {
                const status = e.status ?? "waiting";
                const statusCfg = STATUS_STYLES[status];
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-slate-900",
                      status === "offered"
                        ? "border-sky-300 dark:border-sky-900"
                        : status === "confirmed"
                          ? "border-emerald-300 dark:border-emerald-900"
                          : status === "expired"
                            ? "border-slate-300 opacity-70 dark:border-slate-700"
                            : "border-amber-200/70 dark:border-amber-900/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">
                            {e.petName}
                            <span className="text-muted-foreground ml-2 text-xs font-normal">
                              {e.petBreed}
                            </span>
                          </p>
                          <Badge
                            className={cn(
                              "border-0 text-[10px]",
                              statusCfg.className,
                            )}
                          >
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                          <User className="size-3" />
                          {e.ownerName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block shrink-0 text-[10px]">
                          added {formatRelative(e.addedAt)}
                        </span>
                        {status === "offered" && e.offeredUntil && (
                          <OfferCountdown untilIso={e.offeredUntil} />
                        )}
                      </div>
                    </div>

                    {status === "offered" && e.offeredSlot && (
                      <div className="mt-2 rounded-md border border-sky-300 bg-sky-50/60 px-2.5 py-1.5 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                        Slot offered: <strong>{e.offeredSlot}</strong>
                      </div>
                    )}

                    <Separator className="my-2.5" />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Scissors className="text-muted-foreground size-3" />
                        <span className="truncate">{e.serviceName}</span>
                      </div>
                      {timePreferenceLabel(e) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="text-muted-foreground size-3" />
                          <span>{timePreferenceLabel(e)}</span>
                        </div>
                      )}
                      {datePreferenceLabel(e) && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="text-muted-foreground size-3" />
                          <span className="truncate">
                            {datePreferenceLabel(e)}
                          </span>
                        </div>
                      )}
                      {preferredNames(e) && (
                        <div className="col-span-2 flex items-center gap-1.5">
                          <User className="text-muted-foreground size-3" />
                          <span className="text-muted-foreground">Prefers</span>
                          <span className="font-medium">
                            {preferredNames(e)}
                          </span>
                        </div>
                      )}
                    </div>

                    {(e.comment ?? e.notes) && (
                      <p className="bg-muted/40 text-muted-foreground mt-2 rounded-md px-2.5 py-1.5 text-xs">
                        {e.comment ?? e.notes}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {status === "offered" ? (
                        <>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => {
                              setStatus(e.id, "confirmed");
                              onBookFromWaitlist?.(e);
                              toast.success(
                                `${e.petName} confirmed — booking the offered slot`,
                              );
                            }}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Mark Confirmed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => {
                              const [startTime, endTime] = (
                                e.offeredSlot ?? "–"
                              ).split("–");
                              // Table 96 — expire this offer and hand the slot
                              // to the next matching client.
                              const next = expireAndOfferNext(e.id, {
                                date: e.date,
                                startTime: startTime || "",
                                endTime: endTime || "",
                                serviceName: e.serviceName,
                              });
                              if (next) {
                                const { message } = buildWaitlistOfferForEntry(
                                  next,
                                  { date: e.date, startTime: startTime || "" },
                                );
                                toast.info(
                                  `Offer to ${e.petName} expired — passed to ${next.petName}`,
                                  { description: message },
                                );
                              } else {
                                toast.info(
                                  `Offer to ${e.petName} expired — no one else is waiting for this slot`,
                                );
                              }
                            }}
                          >
                            <XCircle className="size-3.5" />
                            Expire & Pass
                          </Button>
                        </>
                      ) : status === "waiting" ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => {
                            onBookFromWaitlist?.(e);
                            toast.success(`Booking ${e.petName} from waitlist`);
                          }}
                        >
                          <CalendarPlus className="size-3.5" />
                          Book Now
                        </Button>
                      ) : null}
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                      >
                        <a href={`tel:${e.ownerPhone}`}>
                          <Phone className="size-3.5" />
                          {e.ownerPhone}
                        </a>
                      </Button>
                      {e.ownerEmail && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                        >
                          <a href={`mailto:${e.ownerEmail}`}>
                            <Mail className="size-3.5" />
                            Email
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => toast.info(`Messaging ${e.ownerName}`)}
                      >
                        <MessageCircle className="size-3.5" />
                        Message
                      </Button>
                      {status === "waiting" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive/70 hover:text-destructive ml-auto h-8 gap-1.5"
                          onClick={() => {
                            setStatus(e.id, "removed");
                            toast.success(`Removed ${e.petName} from waitlist`);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
