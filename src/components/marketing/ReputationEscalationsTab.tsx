"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Clock,
  Loader2,
  Phone,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  actOnEscalation,
  escalationQueries,
  hoursOverdue,
  RESOLUTION_CODES,
  RESOLUTION_LABELS,
  type Escalation,
  type ResolutionCode,
} from "@/lib/api/reputation-escalations";
import { cn } from "@/lib/utils";

// ============================================================================
// The recovery queue.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// A tab over a localStorage overlay, whose tickets had no age, no due date and
// no resolution. One had been open since 27 April with nothing on screen
// suggesting that was odd. Its "Call via IVR" button navigated to the calling
// page — an IVR is an inbound menu system, so the label was wrong as well as
// the behaviour, and its "Apology credit" mutated an in-memory array that reset
// on reload.
//
// ── THE AGE IS THE FEATURE ────────────────────────────────────────────────
//
// Ordered by due date, breached first, with the overdue hours on the card. A
// queue ordered by arrival puts the ticket you have already missed at the
// bottom, which is how one stayed open for four months.
//
// ── CLOSING REQUIRES SAYING HOW ───────────────────────────────────────────
//
// The resolution code is not paperwork. It is what turns "we fixed four of
// eight Laval complaints for the same reason" from a hunch into a query, and
// the database refuses a resolution without one — so this form asks for it
// rather than discovering the constraint.
// ============================================================================

export function ReputationEscalationsTab() {
  const [scope, setScope] = useState<"open" | "resolved">("open");
  const { data, isPending, error } = useQuery(escalationQueries.list(scope));

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["open", "resolved"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              scope === value
                ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {value === "open" ? "Needs work" : "Resolved"}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {error instanceof Error
              ? error.message
              : "Could not load the queue."}
          </CardContent>
        </Card>
      ) : isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Check className="size-6 text-emerald-500" />
            <p className="text-sm font-medium">
              {scope === "open" ? "Nothing to recover" : "Nothing resolved yet"}
            </p>
            <p className="text-muted-foreground max-w-sm text-xs">
              {scope === "open"
                ? "A rating at or below your escalation threshold opens a ticket here, with a clock on it."
                : "Resolved tickets keep their resolution code, so you can see what actually fixed things."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} scope={scope} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  scope,
}: {
  ticket: Escalation;
  scope: "open" | "resolved";
}) {
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState(false);
  const [code, setCode] = useState<ResolutionCode | "">("");
  const [note, setNote] = useState("");

  const overdue = hoursOverdue(ticket);
  const client = ticket.response.request.client;

  const act = useMutation({
    mutationFn: (action: Parameters<typeof actOnEscalation>[1]) =>
      actOnEscalation(ticket.id, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["reputation", "escalations"],
      });
    },
    onError: (failure) => {
      // Say what went wrong. A silent failure on this screen means somebody
      // believes they have logged a call they have not logged.
      toast.error(
        failure instanceof Error ? failure.message : "That could not be saved.",
      );
    },
  });

  return (
    <Card
      className={cn(overdue !== null && "border-rose-300 dark:border-rose-900")}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{client.name}</span>
              <span className="flex items-center gap-0.5 text-xs font-semibold">
                {ticket.response.rating}
                <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>
              {ticket.service_type && (
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {ticket.service_type}
                </Badge>
              )}
              <StateBadge ticket={ticket} overdue={overdue} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {when(ticket.opened_at)}
              {ticket.response.staff &&
                ` · ${ticket.response.staff.first_name} ${ticket.response.staff.last_name} was on the visit`}
            </p>
          </div>

          <div className="text-muted-foreground text-right text-xs">
            {ticket.resolved_at ? (
              <span>Resolved {when(ticket.resolved_at)}</span>
            ) : ticket.acknowledged_at ? (
              <span>Resolve by {when(ticket.resolve_due_at)}</span>
            ) : (
              <span>Acknowledge by {when(ticket.first_response_due_at)}</span>
            )}
          </div>
        </div>

        {ticket.response.comment && (
          <p className="bg-muted/40 rounded-lg border p-2 text-xs italic">
            &ldquo;{ticket.response.comment}&rdquo;
          </p>
        )}

        {ticket.resolution_code && (
          <p className="text-xs">
            <span className="font-medium">
              {RESOLUTION_LABELS[ticket.resolution_code]}
            </span>
            {ticket.resolution_note && (
              <span className="text-muted-foreground">
                {" "}
                — {ticket.resolution_note}
              </span>
            )}
          </p>
        )}

        {ticket.events.length > 0 && (
          <ul className="text-muted-foreground space-y-0.5 text-xs">
            {[...ticket.events]
              .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
              .map((event) => (
                <li key={event.id}>
                  {when(event.occurred_at)} — {describeEvent(event.kind)}
                  {typeof event.payload.note === "string" &&
                    `: ${event.payload.note}`}
                </li>
              ))}
          </ul>
        )}

        {scope === "open" && (
          <div className="space-y-2 border-t pt-3">
            {!resolving ? (
              <div className="flex flex-wrap gap-2">
                {!ticket.acknowledged_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => act.mutate({ action: "acknowledge" })}
                  >
                    I am on it
                  </Button>
                )}
                {/* "Call client", not "Call via IVR": an IVR is an inbound menu
                    system. This records that a call happened; it does not dial,
                    and it does not claim to. */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={act.isPending || !client.phone}
                  onClick={() =>
                    act.mutate({
                      action: "log",
                      kind: "call",
                      note: client.phone ? `Called ${client.phone}` : undefined,
                    })
                  }
                >
                  <Phone className="size-3.5" />
                  Log a call
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={act.isPending}
                  onClick={() => setResolving(true)}
                >
                  Resolve
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={code}
                  onValueChange={(value) => setCode(value as ResolutionCode)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="What fixed it?" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_CODES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {RESOLUTION_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything worth knowing next time (optional)"
                  className="min-h-16 resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={!code || act.isPending}
                    onClick={() =>
                      code &&
                      act.mutate(
                        {
                          action: "resolve",
                          resolutionCode: code,
                          note: note.trim() || undefined,
                        },
                        { onSuccess: () => setResolving(false) },
                      )
                    }
                  >
                    {act.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Mark resolved"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResolving(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StateBadge({
  ticket,
  overdue,
}: {
  ticket: Escalation;
  overdue: number | null;
}) {
  if (overdue !== null) {
    return (
      <Badge className="gap-1 border-0 bg-rose-100 text-[10px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertTriangle className="size-3" />
        {overdue}h overdue
      </Badge>
    );
  }
  if (ticket.resolved_at) {
    return (
      <Badge className="gap-1 border-0 bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Check className="size-3" />
        Resolved
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <Clock className="size-3" />
      {ticket.acknowledged_at ? "In recovery" : "Waiting"}
    </Badge>
  );
}

function describeEvent(kind: string): string {
  const words: Record<string, string> = {
    opened: "Ticket opened",
    assigned: "Assigned",
    acknowledged: "Acknowledged",
    call: "Called them",
    message: "Messaged them",
    note: "Note added",
    credit: "Credit given",
    refund: "Refunded",
    state_change: "Status changed",
    sla_breach: "Missed the deadline",
    resolved: "Resolved",
    reinvited: "Asked again",
  };
  return words[kind] ?? kind;
}

/** With the zone named, for the reason the Requests tab gives. */
function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
