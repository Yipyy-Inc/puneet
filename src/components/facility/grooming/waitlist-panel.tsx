"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
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
import { toast } from "sonner";
import type {
  GroomingWaitlistEntry,
  GroomingWaitlistStatus,
} from "@/data/grooming-waitlist";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TIME_WINDOW_LABEL: Record<
  NonNullable<GroomingWaitlistEntry["preferredTimeWindow"]>,
  string
> = {
  morning: "Morning",
  afternoon: "Afternoon",
  anytime: "Any time",
};

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
  const { setStatus } = useGroomingWaitlist();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="border-b bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Hourglass className="size-4 text-amber-600" />
            Waitlist
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-5 bg-amber-500 px-1.5 text-white"
            >
              {entries.length}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatDateLong(date)}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Hourglass className="size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
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
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
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
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3" />
                        {e.ownerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block shrink-0 text-[10px] text-muted-foreground">
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
                      <Scissors className="size-3 text-muted-foreground" />
                      <span className="truncate">{e.serviceName}</span>
                    </div>
                    {e.preferredTimeWindow && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>{TIME_WINDOW_LABEL[e.preferredTimeWindow]}</span>
                      </div>
                    )}
                    {e.preferredStylistName && (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <User className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Prefers</span>
                        <span className="font-medium">
                          {e.preferredStylistName}
                        </span>
                      </div>
                    )}
                  </div>

                  {e.notes && (
                    <p className="mt-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                      {e.notes}
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
                            setStatus(e.id, "expired");
                            toast.info(`Offer to ${e.petName} expired`);
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
                          toast.success(
                            `Booking ${e.petName} from waitlist`,
                          );
                        }}
                      >
                        <CalendarPlus className="size-3.5" />
                        Book Now
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                      <a href={`tel:${e.ownerPhone}`}>
                        <Phone className="size-3.5" />
                        {e.ownerPhone}
                      </a>
                    </Button>
                    {e.ownerEmail && (
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
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
      </DialogContent>
    </Dialog>
  );
}
