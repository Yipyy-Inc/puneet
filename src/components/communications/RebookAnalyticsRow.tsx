"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, DollarSign, Send, TrendingUp } from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { rebookQueries } from "@/lib/api/rebook";

// ============================================================================
// What the rebook reminders have actually done.
//
// ── EVERY NUMBER HERE WAS INVENTED UNTIL 2026-08-28 ───────────────────────
//
// This row derived from `rebookReminders` and `lapsedClients` in
// src/data/rebook-reminders.ts — hand-written arrays, identical at every
// facility, on a system that had never sent a message. "Recovered revenue" was
// the sum of a `recoveredRevenue` field somebody typed.
//
// All four now come from the outbox and from bookings, and those arrays have
// been deleted rather than left lying around for the next person who needs
// "some rebook data".
//
// ── RESPONSE RATE IS OVER SENT, NOT OVER ATTEMPTED ────────────────────────
//
// A reminder that was skipped because the client unsubscribed never reached
// anybody, so counting it in the denominator would make the facility's
// messaging look less effective than it is for a reason that has nothing to do
// with the message. Skips are shown separately in the History tab, with reasons.
// ============================================================================

export function RebookAnalyticsRow() {
  const history = useQuery(rebookQueries.history());
  const lapsed = useQuery(rebookQueries.lapsed());

  const stats = history.data?.stats;
  const sent = stats?.sent ?? 0;
  const rebooked = stats?.rebooked ?? 0;
  const responseRate = sent === 0 ? null : Math.round((rebooked / sent) * 100);

  const loading = history.isLoading || lapsed.isLoading;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        label="Reminders sent"
        value={loading ? "—" : String(sent)}
        hint="Every rebook reminder that actually left"
        icon={Send}
        tone="violet"
      />
      <KpiTile
        label="Came back"
        value={loading ? "—" : String(rebooked)}
        // Null rather than 0% when nothing has been sent. "0%" reads as "the
        // messages are not working"; the truth is that none have gone out.
        hint={
          responseRate === null
            ? "Nothing sent yet"
            : `${responseRate}% of those sent booked again`
        }
        icon={TrendingUp}
        tone="emerald"
      />
      <KpiTile
        label="Revenue recovered"
        value={loading ? "—" : formatMoney(stats?.recoveredRevenue ?? 0)}
        hint="Value of the bookings made after a reminder"
        icon={DollarSign}
        tone="indigo"
      />
      <KpiTile
        label="Lapsed clients"
        value={loading ? "—" : String(lapsed.data?.clients.length ?? 0)}
        hint="Overdue, with nothing in the diary"
        icon={AlertTriangle}
        tone="amber"
      />
    </div>
  );
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}
