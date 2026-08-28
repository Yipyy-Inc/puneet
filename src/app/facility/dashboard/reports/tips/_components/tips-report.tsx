"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Coins,
  Download,
  Smartphone,
  Globe,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { downloadReportCsv } from "@/lib/report-export";

// ============================================================================
// The tips report: what came in, who earned it, and what is still owed.
//
// ── THREE TABS BECAUSE THEY ANSWER THREE DIFFERENT QUESTIONS ──────────────
//
//   Summary     "how are we doing on tips" — the owner's glance
//   By staff    "what do I pay Amy on Friday" — the payout run
//   By booking  "why does Amy's total say $180" — the audit trail
//
// The middle one is the reason the report exists. Before it, a facility taking
// tips through Yipyy had no way to answer the only question that costs money to
// get wrong.
//
// ── UNASSIGNED IS SHOWN, NOT SWALLOWED ────────────────────────────────────
//
// A tip on a booking with nobody assigned has no allocation, so it appears in
// the totals and in nobody's payout. That gap is a number on the Summary tab
// rather than a silent difference between two figures that ought to match — a
// facility seeing "$40 unassigned" goes and assigns it; a facility seeing two
// totals that disagree by $40 assumes the report is broken.
// ============================================================================

export interface TipRow {
  id: string;
  date: string;
  bookingRef: number | null;
  clientName: string | null;
  petName: string | null;
  service: string | null;
  tip: number;
  bookingTotal: number;
  source: "Terminal" | "Online" | "Other";
  attributedTo: string[];
}

export interface StaffRow {
  staffId: string;
  name: string;
  bookings: number;
  total: number;
  unpaid: number;
}

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export function TipsReport({
  facilityId,
  rows,
  staff,
  rangeLabel,
}: {
  facilityId: string;
  rows: TipRow[];
  staff: StaffRow[];
  rangeLabel: string;
}) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidNote, setPaidNote] = useState<string | null>(null);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.tip, 0);
    const terminal = rows
      .filter((r) => r.source === "Terminal")
      .reduce((s, r) => s + r.tip, 0);
    const online = rows
      .filter((r) => r.source === "Online")
      .reduce((s, r) => s + r.tip, 0);
    // A tip nobody is owed. Counted from the ROWS, not inferred by subtracting
    // the staff totals — a subtraction would also absorb any rounding and
    // present it as unassigned money.
    const unassigned = rows
      .filter((r) => r.attributedTo.length === 0)
      .reduce((s, r) => s + r.tip, 0);
    // Cash, store credit, and any payment with no processor recorded.
    // `paymentChannel` deliberately refuses to claim those for a card channel,
    // so they are neither Terminal nor Online — and the first run of this
    // screen showed $1,116 collected against $216 + $0, leaving $900 that the
    // page simply did not mention. Three tiles that do not add up to the
    // fourth is a report telling somebody their own money is missing.
    const other = rows
      .filter((r) => r.source === "Other")
      .reduce((s, r) => s + r.tip, 0);
    const tipped = rows.length;
    return {
      total,
      terminal,
      online,
      other,
      unassigned,
      average: tipped > 0 ? total / tipped : 0,
    };
  }, [rows]);

  const byService = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of rows) {
      const key = r.service ?? "Unknown";
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.tip;
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (!needle) return true;
      return [r.clientName, r.petName, r.service, String(r.bookingRef ?? "")]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [rows, sourceFilter, search]);

  const markPaid = async (row: StaffRow) => {
    setPayingId(row.staffId);
    setPaidNote(null);
    try {
      const response = await fetch("/api/tips/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, staffId: row.staffId }),
      });
      const body = (await response.json().catch(() => null)) as {
        marked?: number;
        error?: string;
      } | null;

      // The RPC returns how many rows it actually changed. Zero means nothing
      // was outstanding — reporting that as a payout would tell somebody they
      // had just paid money they had already paid.
      setPaidNote(
        !response.ok || !body
          ? (body?.error ?? "The payout could not be recorded.")
          : body.marked === 0
            ? `${row.name} had nothing outstanding — nothing was changed.`
            : `Marked ${body.marked} tip${body.marked === 1 ? "" : "s"} paid for ${row.name}. Reload to refresh the totals.`,
      );
    } catch {
      setPaidNote("The payout could not be recorded.");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold">Tips</h1>
        <p className="text-muted-foreground text-sm">
          Every tip taken, who it was attributed to, and what is still owed ·{" "}
          {rangeLabel}
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="staff">By staff member</TabsTrigger>
          <TabsTrigger value="booking">By booking</TabsTrigger>
        </TabsList>

        {/* ── Summary ─────────────────────────────────────────────────── */}
        <TabsContent value="summary" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Tips collected"
              value={money(totals.total)}
              icon={Coins}
              tone="indigo"
            />
            <KpiTile
              label="On the terminal"
              value={money(totals.terminal)}
              icon={Smartphone}
              tone="violet"
            />
            <KpiTile
              label="Online"
              value={money(totals.online)}
              icon={Globe}
              tone="indigo"
            />
            <KpiTile
              label="Cash and other"
              value={money(totals.other)}
              hint="not taken on a card"
              icon={Banknote}
              tone="violet"
            />
          </div>

          {/* The three channel tiles above must add up to what was collected.
              Saying so, with the average alongside, is cheaper than leaving
              somebody to add them up and wonder. */}
          <p className="text-muted-foreground text-xs">
            {money(totals.terminal)} + {money(totals.online)} +{" "}
            {money(totals.other)} = {money(totals.total)} across {rows.length}{" "}
            payment{rows.length === 1 ? "" : "s"} · average{" "}
            {money(totals.average)}
          </p>

          {totals.unassigned > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
              <span className="font-semibold">
                {money(totals.unassigned)} is not attributed to anybody.
              </span>{" "}
              Those bookings had no staff member assigned when the tip was
              taken. Assign the tip by hand on the booking, or set an
              attribution rule under Settings → Tips.
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="p-3 text-left font-medium">Service</th>
                    <th className="p-3 text-right font-medium">Tips</th>
                    <th className="p-3 text-right font-medium">Collected</th>
                    <th className="p-3 text-right font-medium">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {byService.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-muted-foreground p-6 text-center"
                      >
                        No tips in this period.
                      </td>
                    </tr>
                  )}
                  {byService.map(([service, v]) => (
                    <tr key={service} className="border-b last:border-0">
                      <td className="p-3 capitalize">{service}</td>
                      <td className="p-3 text-right">{v.count}</td>
                      <td className="p-3 text-right font-medium">
                        {money(v.total)}
                      </td>
                      <td className="text-muted-foreground p-3 text-right">
                        {money(v.total / v.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── By staff ────────────────────────────────────────────────── */}
        <TabsContent value="staff" className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              What each person is owed out of the tips collected.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadReportCsv("tips-by-staff", [
                  ["Staff", "Allocations", "Total", "Unpaid"],
                  ...staff.map((s) => [
                    s.name,
                    s.bookings,
                    s.total.toFixed(2),
                    s.unpaid.toFixed(2),
                  ]),
                ])
              }
            >
              <Download className="mr-2 size-3.5" /> Export CSV
            </Button>
          </div>

          {paidNote && (
            <p className="rounded-lg border p-3 text-sm" role="status">
              {paidNote}
            </p>
          )}

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="p-3 text-left font-medium">Staff member</th>
                    <th className="p-3 text-right font-medium">Allocations</th>
                    <th className="p-3 text-right font-medium">Total</th>
                    <th className="p-3 text-right font-medium">Unpaid</th>
                    <th className="p-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-muted-foreground p-6 text-center"
                      >
                        Nothing attributed in this period.
                      </td>
                    </tr>
                  )}
                  {staff.map((s) => (
                    <tr key={s.staffId} className="border-b last:border-0">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-right">{s.bookings}</td>
                      <td className="p-3 text-right">{money(s.total)}</td>
                      <td className="p-3 text-right font-semibold">
                        {s.unpaid > 0 ? money(s.unpaid) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={s.unpaid <= 0 || payingId === s.staffId}
                          onClick={() => markPaid(s)}
                        >
                          {payingId === s.staffId && (
                            <Loader2 className="mr-2 size-3.5 animate-spin" />
                          )}
                          Mark paid
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── By booking ──────────────────────────────────────────────── */}
        <TabsContent value="booking" className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search customer, pet, service or booking…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 max-w-xs text-sm"
            />
            {["all", "Terminal", "Online"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={sourceFilter === s ? "default" : "outline"}
                onClick={() => setSourceFilter(s)}
              >
                {s === "all" ? "All sources" : s}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() =>
                downloadReportCsv("tips-by-booking", [
                  [
                    "Date",
                    "Booking",
                    "Customer",
                    "Pet",
                    "Service",
                    "Booking total",
                    "Tip",
                    "Tip %",
                    "Source",
                    "Attributed to",
                  ],
                  ...filtered.map((r) => [
                    r.date.slice(0, 10),
                    r.bookingRef ?? "",
                    r.clientName ?? "",
                    r.petName ?? "",
                    r.service ?? "",
                    r.bookingTotal.toFixed(2),
                    r.tip.toFixed(2),
                    r.bookingTotal > 0
                      ? ((r.tip / r.bookingTotal) * 100).toFixed(1)
                      : "",
                    r.source,
                    r.attributedTo.join("; ") || "Unassigned",
                  ]),
                ])
              }
            >
              <Download className="mr-2 size-3.5" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs">
                  <tr>
                    <th className="p-3 text-left font-medium">Date</th>
                    <th className="p-3 text-left font-medium">Booking</th>
                    <th className="p-3 text-left font-medium">Customer</th>
                    <th className="p-3 text-left font-medium">Service</th>
                    <th className="p-3 text-right font-medium">Tip</th>
                    <th className="p-3 text-left font-medium">Source</th>
                    <th className="p-3 text-left font-medium">Attributed to</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted-foreground p-6 text-center"
                      >
                        No tips match.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3">{r.date.slice(0, 10)}</td>
                      <td className="p-3">
                        {r.bookingRef ? (
                          <Link
                            href={`/facility/dashboard/bookings?ref=${r.bookingRef}`}
                            className="underline"
                          >
                            #{r.bookingRef}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {r.clientName ?? "—"}
                        {r.petName && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {r.petName}
                          </span>
                        )}
                      </td>
                      <td className="p-3 capitalize">{r.service ?? "—"}</td>
                      <td className="p-3 text-right font-medium">
                        {money(r.tip)}
                      </td>
                      <td className="p-3">{r.source}</td>
                      <td className="p-3">
                        {r.attributedTo.length > 0 ? (
                          r.attributedTo.join(", ")
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
