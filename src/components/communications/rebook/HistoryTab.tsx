"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox, Mail, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeletons";
import { rebookQueries } from "@/lib/api/rebook";
import type { RebookHistoryEntry } from "@/types/rebook";

// ============================================================================
// What was actually attempted.
//
// ── THE NUMBER THAT USED TO BE A LITERAL ──────────────────────────────────
//
// This tab showed "Total Sent: 1,392" for months, on a system that had never
// sent a message. It was a number in a TypeScript file. Everything here is
// counted from `message_sends` — the same rows listed underneath, so anybody
// who doubts a tile can count the list and get the same answer.
//
// ── "REBOOKED" IS THE ONLY TILE THAT MATTERS ──────────────────────────────
//
// A reminder that went out is not a success. A client who came back is. That
// column is a lateral join onto bookings made AFTER the message left, excluding
// cancelled ones — derived on every read, so it cannot go stale and cannot keep
// crediting a rebook that was later called off.
//
// ── A SKIPPED MESSAGE SAYS WHY ────────────────────────────────────────────
//
// "Not sent" is not an answer staff can act on; "they unsubscribed" and "no
// email address on file" lead to completely different next steps, and only one
// of them is fixable. `skip_reason` is carried through to the row.
// ============================================================================

export function HistoryTab() {
  const history = useQuery(rebookQueries.history());

  if (history.isLoading) return <TableSkeleton rows={5} cols={4} />;
  if (history.error) {
    return (
      <p className="text-muted-foreground rounded-lg border p-4 text-sm">
        The history could not be loaded: {history.error.message}
      </p>
    );
  }

  const entries = history.data?.entries ?? [];
  const stats = history.data?.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Sent" value={stats?.sent ?? 0} />
        <Stat label="Waiting" value={stats?.waiting ?? 0} />
        <Stat label="Rebooked" value={stats?.rebooked ?? 0} tone="good" />
        <Stat label="Skipped" value={stats?.skipped ?? 0} />
        <Stat label="Failed" value={stats?.failed ?? 0} tone="bad" />
      </div>

      {entries.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <Inbox className="mx-auto mb-3 size-12 opacity-50" />
          {/* The NEGATION of a claim: nothing has been sent. This tab performs
              no action at all — it reads message_sends back. */}
          {/* success-claim-ok: an empty state, not a report of success */}
          <p className="font-medium">No rebook reminders have been sent yet</p>
          <p className="mt-1 text-sm">
            Anything sent from the Queue or the Lapsed tab appears here, whether
            it left or not.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {entries.map((entry) => (
            <HistoryRow key={entry.sendId} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({ entry }: { entry: RebookHistoryEntry }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {entry.channel === "email" ? (
            <Mail className="text-muted-foreground size-3.5" />
          ) : (
            <MessageSquare className="text-muted-foreground size-3.5" />
          )}
          <span className="truncate font-medium">
            {entry.clientName ?? "A client"}
          </span>
          <span className="text-muted-foreground text-xs capitalize">
            {entry.service}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {entry.toAddress} ·{" "}
          {new Date(entry.sentAt ?? entry.createdAt).toLocaleString()}
          {/* The reason, not just the status. "Skipped" alone tells staff
              nothing they can do anything about. */}
          {entry.skipReason ? ` · ${entry.skipReason}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {entry.rebookedAt && (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            rebooked
          </Badge>
        )}
        <Badge variant={entry.status === "sent" ? "default" : "secondary"}>
          {entry.status}
        </Badge>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p
        className={
          tone === "good"
            ? "mt-1 text-xl font-semibold text-emerald-600"
            : tone === "bad" && value > 0
              ? "mt-1 text-xl font-semibold text-red-600"
              : "mt-1 text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
