"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Send,
  Sparkles,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TableSkeleton } from "@/components/ui/skeletons";
import {
  rebookQueries,
  useDismissLapsed,
  useRemindLapsed,
} from "@/lib/api/rebook";
import { DISMISSAL_EXPLANATION, type LapsedClient } from "@/types/rebook";

// ============================================================================
// The clients who have not come back.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Five invented people from `src/data/rebook-reminders.ts`, identical at every
// facility, with six buttons between them that raised a toast and did nothing:
// "Composer opened for Charlie Brown", "Booking flow opened", "Karen Liu marked
// inactive", "Removed Liam O'Connor from list". Every one of those was a
// success message for an action that had no implementation behind it.
//
// So the rule applied here is: an action either does the thing, or it is not
// offered. Nothing on this tab reports a success it cannot perform.
//
// ── WHY THERE IS NO "MARK INACTIVE" ANY MORE ──────────────────────────────
//
// `clients.status` is one of seven columns `private.enforce_client_integrity`
// REVERTS for a caller without `edit_clients` — silently, by rewriting the row
// on the way in. A button here would therefore report success and change
// nothing for exactly the staff most likely to press it, since managing
// automations and editing clients are separate permissions. Marking a client
// inactive belongs on the client file, where the permission that governs it is
// the one being used.
// ============================================================================

export function LapsedTab() {
  const lapsed = useQuery(rebookQueries.lapsed());
  const [service, setService] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const remind = useRemindLapsed();

  const payload = lapsed.data;
  const clients = payload?.clients ?? [];
  const services = [...new Set(clients.map((c) => c.service))].sort();
  const shown =
    service === "all" ? clients : clients.filter((c) => c.service === service);

  const key = (c: LapsedClient) => `${c.clientId}:${c.service}`;
  const sendable = shown.filter((c) =>
    (payload?.remindersEnabledFor ?? []).includes(c.service),
  );
  const chosen = shown.filter((c) => selected.has(key(c)));

  const sendTo = (targets: LapsedClient[]) => {
    if (targets.length === 0) return;
    remind.mutate(
      targets.map((c) => ({ clientId: c.clientId, service: c.service })),
      {
        onSuccess: (result) => {
          setSelected(new Set());
          // Every branch names what actually happened. "Queued 3" and
          // "3 were already reminded today" are different facts, and the
          // second one used to be reported as the first.
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

          // The reasons matter more than the count: "no email address on file"
          // is something staff can fix, and a bare number is not.
          for (const s of result.skipped.slice(0, 3)) {
            toast.warning(`${s.service}: ${s.reason}`);
          }
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  if (lapsed.isLoading) {
    return <TableSkeleton rows={4} cols={3} />;
  }
  if (lapsed.error) {
    return (
      <p className="text-muted-foreground rounded-lg border p-4 text-sm">
        The lapsed list could not be loaded: {lapsed.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* `configured` travels with the data for exactly this sentence. A
          facility that has never set its own frequencies is looking at the
          app's assumptions, and saying so is the difference between a number
          and a guess presented as a number. */}
      {!payload?.configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" />
            These are our assumed visit frequencies, not yours
          </p>
          <p className="mt-1">
            Nobody has set how often each service should come round here, so
            this list uses our defaults — and reminders stay switched off until
            somebody does. Set them on the Defaults tab.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label={`All services (${clients.length})`}
            active={service === "all"}
            onClick={() => setService("all")}
          />
          {services.map((s) => (
            <FilterChip
              key={s}
              label={`${s} (${clients.filter((c) => c.service === s).length})`}
              active={service === s}
              onClick={() => setService(s)}
            />
          ))}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/facility/dashboard/marketing?segment=lapsed_${service}`}
          >
            <Sparkles className="mr-1 size-3.5" />
            Create marketing segment
            <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-12 opacity-50" />
          <p className="font-medium">Nobody has lapsed</p>
          <p className="mt-1 text-xs">
            Anyone with a booking already in the diary is not counted here.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={
                  sendable.length > 0 && chosen.length === sendable.length
                }
                onCheckedChange={(checked) =>
                  setSelected(
                    checked ? new Set(sendable.map(key)) : new Set<string>(),
                  )
                }
                disabled={sendable.length === 0}
              />
              Select everyone who can be reminded ({sendable.length})
            </label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  disabled={chosen.length === 0 || remind.isPending}
                >
                  <Send className="mr-1 size-3.5" />
                  Send {chosen.length > 0 ? chosen.length : ""} reminder
                  {chosen.length === 1 ? "" : "s"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Send {chosen.length} rebook reminder
                    {chosen.length === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    These go out as real emails and texts. Anyone who has
                    unsubscribed is dropped when the message is sent, and nobody
                    is written to twice on the same day.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => sendTo(chosen)}
                  >
                    Send them
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shown.map((client) => (
              <LapsedCard
                key={key(client)}
                client={client}
                canRemind={(payload?.remindersEnabledFor ?? []).includes(
                  client.service,
                )}
                selected={selected.has(key(client))}
                onSelect={(on) =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(key(client));
                    else next.delete(key(client));
                    return next;
                  })
                }
                onRemind={() => sendTo([client])}
                pending={remind.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium capitalize"
          : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs capitalize"
      }
    >
      {label}
    </button>
  );
}

function LapsedCard({
  client,
  canRemind,
  selected,
  onSelect,
  onRemind,
  pending,
}: {
  client: LapsedClient;
  canRemind: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onRemind: () => void;
  pending: boolean;
}) {
  const dismiss = useDismissLapsed();
  const severe = client.daysOverdue > 30;

  return (
    <div className="bg-card hover:border-primary/30 rounded-xl border p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-1"
          checked={selected}
          disabled={!canRemind}
          onCheckedChange={(checked) => onSelect(checked === true)}
        />
        <Avatar className="size-11">
          <AvatarFallback
            className={
              severe ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            }
          >
            {initials(client.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {client.clientName}
            </p>
            <Badge
              variant="outline"
              className={
                severe
                  ? "border-red-200 bg-red-50 text-[10px] text-red-700"
                  : "border-amber-200 bg-amber-50 text-[10px] text-amber-700"
              }
            >
              {client.daysOverdue}d overdue
            </Badge>
          </div>
          <p className="text-muted-foreground truncate text-xs capitalize">
            {client.petName ? `${client.petName} · ` : ""}
            {client.service}
          </p>
        </div>
      </div>

      <div className="bg-muted/40 mt-3 grid grid-cols-3 gap-2 rounded-lg p-2.5 text-center">
        <Fact label="Last visit" value={formatDate(client.lastVisitAt)} />
        <Fact label="Expected" value={`every ${client.expectedDays}d`} />
        <Fact
          label="Reminders"
          value={`${client.remindersSent} sent`}
          hint={
            client.remindersSent > 0
              ? "Counted from the outbox — what actually went out"
              : undefined
          }
        />
      </div>

      {!canRemind && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          Reminders are switched off for {client.service}, so this client can be
          seen but not messaged.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={dismiss.isPending}
            >
              <UserMinus className="mr-1 size-3" />
              Dismiss
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Stop showing {client.clientName} for {client.service}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {DISMISSAL_EXPLANATION} They stay on the list for every other
                service.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep them</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  dismiss.mutate(
                    { clientId: client.clientId, service: client.service },
                    {
                      onSuccess: () =>
                        toast.success(
                          `${client.clientName} hidden until their next visit.`,
                        ),
                      onError: (e: Error) => toast.error(e.message),
                    },
                  )
                }
              >
                Dismiss
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href={`/facility/dashboard/clients/${client.clientId}`}>
            <CalendarPlus className="mr-1 size-3" />
            Open client
          </Link>
        </Button>

        <Button
          size="sm"
          className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          disabled={!canRemind || pending}
          onClick={onRemind}
        >
          <Send className="mr-1 size-3" />
          Remind
        </Button>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div title={hint}>
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
