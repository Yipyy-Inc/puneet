"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarClock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeletons";
import { rebookQueries, useRemindLapsed } from "@/lib/api/rebook";
import type { RebookDue } from "@/types/rebook";

// ============================================================================
// Who is coming due.
//
// ── IT IS A PROJECTION, AND IT SAYS SO ────────────────────────────────────
//
// There are no scheduled messages behind this list. Nothing is queued for
// anybody here: `scheduledSendOn` is arithmetic on their last visit and the
// facility's own interval, recomputed on every read. A client who books
// tomorrow simply stops appearing, with nothing to cancel.
//
// The screen has to say that, because the fixture version did not. It showed
// the same cards with a "Send Now" that raised a toast and did nothing, above a
// counter reading "Total Sent: 1,392" on a system that had never sent a single
// message. The distinction between "we will write to these people" and "we have
// scheduled messages for these people" is the whole difference between a
// forecast and a lie.
//
// ── SENDING EARLY IS THE ONLY ACTION HERE ─────────────────────────────────
//
// Same route as the Lapsed tab, and it re-derives eligibility server-side, so
// pressing Send on somebody who booked five seconds ago writes nothing and says
// why. Dismiss is deliberately absent: dismissing somebody who has not even
// reached their due date is not a thing anybody wants, and every control here
// has to be one that does something.
// ============================================================================

const RANGES = [30, 60, 90] as const;

export function QueueTab() {
  const [days, setDays] = useState<number>(30);
  const queue = useQuery(rebookQueries.queue(days));
  const remind = useRemindLapsed();

  const payload = queue.data;
  const clients = payload?.clients ?? [];

  const sendTo = (targets: RebookDue[]) => {
    remind.mutate(
      targets.map((c) => ({ clientId: c.clientId, service: c.service })),
      {
        onSuccess: (result) => {
          const parts: string[] = [];
          if (result.queued > 0) parts.push(`${result.queued} queued`);
          if (result.duplicates > 0) {
            parts.push(`${result.duplicates} already sent today`);
          }
          if (result.skipped.length > 0) {
            parts.push(`${result.skipped.length} skipped`);
          }
          const summary = parts.join(" · ") || "Nothing to send";
          if (result.queued > 0) toast.success(summary);
          else toast.info(summary);
          for (const s of result.skipped.slice(0, 3)) {
            toast.warning(`${s.service}: ${s.reason}`);
          }
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  if (queue.isLoading) return <TableSkeleton rows={4} cols={3} />;
  if (queue.error) {
    return (
      <p className="text-muted-foreground rounded-lg border p-4 text-sm">
        The queue could not be loaded: {queue.error.message}
      </p>
    );
  }

  // Grouped by the date staff would actually write, not by the due date. A
  // facility with a 14-day lead time on boarding is looking two weeks ahead of
  // its own due dates, and grouping by the wrong one makes the list read as
  // though it is late.
  const groups = new Map<string, RebookDue[]>();
  for (const client of clients) {
    const list = groups.get(client.scheduledSendOn) ?? [];
    list.push(client);
    groups.set(client.scheduledSendOn, list);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {!payload?.configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" />
            These dates come from our assumed intervals, not yours
          </p>
          <p className="mt-1">
            Set how often each service should come round on the Defaults tab and
            these will be the facility&apos;s own dates.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={
                days === r
                  ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium"
                  : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs"
              }
            >
              Next {r} days
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Nothing here is scheduled yet — these are the dates each client comes
          due.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Bell className="mx-auto mb-3 size-12 opacity-50" />
          <p className="font-medium">
            Nobody comes due in the next {days} days
          </p>
          <p className="mt-1 text-sm">
            Anyone with a booking already in the diary is not counted, and
            anyone already overdue is on the Lapsed tab.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {ordered.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold">{formatDay(date)}</h4>
                <span className="text-muted-foreground text-xs">
                  ({items.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((client) => (
                  <DueCard
                    key={`${client.clientId}:${client.service}`}
                    client={client}
                    canRemind={(payload?.remindersEnabledFor ?? []).includes(
                      client.service,
                    )}
                    pending={remind.isPending}
                    onRemind={() => sendTo([client])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DueCard({
  client,
  canRemind,
  pending,
  onRemind,
}: {
  client: RebookDue;
  canRemind: boolean;
  pending: boolean;
  onRemind: () => void;
}) {
  const daysAway = Math.abs(client.daysOverdue);

  return (
    <div className="bg-card hover:border-primary/30 rounded-xl border p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-blue-100 text-blue-700">
            {initials(client.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {client.clientName}
            </p>
            <Badge variant="outline" className="text-[10px]">
              due in {daysAway}d
            </Badge>
          </div>
          <p className="text-muted-foreground truncate text-xs capitalize">
            {client.petName ? `${client.petName} · ` : ""}
            {client.service} · last visit {formatDay(client.lastVisitAt)}
          </p>
        </div>
      </div>

      {!canRemind && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          Reminders are switched off for {client.service}, so this date is a
          forecast only.
        </p>
      )}

      <div className="mt-3 flex items-center justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!canRemind || pending}
            >
              <Send className="mr-1 size-3" />
              Send now
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Write to {client.clientName} now?
              </AlertDialogTitle>
              <AlertDialogDescription>
                They are not due for another {daysAway} days. This sends the
                rebook reminder today instead of waiting — a real email or text,
                and they will not be written to twice on the same day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Wait</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onRemind}
              >
                Send now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
