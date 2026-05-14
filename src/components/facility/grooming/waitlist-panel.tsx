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
} from "lucide-react";
import { toast } from "sonner";
import type { GroomingWaitlistEntry } from "@/data/grooming-waitlist";

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
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-amber-200/70 bg-white px-4 py-3 shadow-sm dark:border-amber-900/40 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {e.petName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {e.petBreed}
                        </span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3" />
                        {e.ownerName}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      added {formatRelative(e.addedAt)}
                    </span>
                  </div>

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
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => {
                        onBookFromWaitlist?.(e);
                        toast.success(`Booking ${e.petName} from waitlist`);
                      }}
                    >
                      <CalendarPlus className="size-3.5" />
                      Book
                    </Button>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
