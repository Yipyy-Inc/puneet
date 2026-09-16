"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileDown,
  TrendingUp,
  Wallet,
  CalendarClock,
  Send,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { GiftCard } from "@/types/payments";
import { giftCardQueries } from "@/lib/api/gift-cards";
import { totalsWindow } from "../_lib/totals-range";
// No `isWithinRange` any more: the ranges are handed to the database, which
// does the filtering it was always going to do better than a reduce over every
// card the facility ever issued.
import {
  GiftCardDateRangeFilter,
  presetRange,
  type DateRange,
} from "./GiftCardDateRangeFilter";

const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const money = (n: number) => `$${n.toFixed(2)}`;

// ── WHAT USED TO BE HERE ───────────────────────────────────────────────────
//
//   // Redemptions don't carry a service category in the mock, so derive a
//   // stable one.
//   const categoryFor = (id: string) => {
//     let h = 0;
//     for (const ch of id) h = (h + ch.charCodeAt(0)) % SERVICE_CATEGORIES.length;
//     return SERVICE_CATEGORIES[h];
//   };
//
// A CHECKSUM OF THE CARD'S UUID, filed under Grooming, Boarding, Daycare,
// Retail or Training. The comment was true when it was written — the data was a
// fixture — and the derivation outlived the fixture, so a facility owner read a
// confident five-way split of their own gift-card revenue that was decided by
// arithmetic on an id.
//
// A redemption that paid for a booking carries `booking_id`, and the booking
// knows its service. `gift_card_totals` does that join; one with no booking
// behind it is `unattributed`, which is a fact rather than a guess.

/** The service names are the database's own; these are what a person reads. */
const SERVICE_LABELS: Record<string, string> = {
  grooming: "Grooming",
  boarding: "Boarding",
  daycare: "Daycare",
  training: "Training",
  evaluation: "Evaluation",
  retail: "Retail",
  unattributed: "Not tied to a booking",
};

const serviceLabel = (service: string) =>
  SERVICE_LABELS[service] ??
  // A custom service the facility named itself. Shown as it is, capitalised,
  // rather than dropped — a bucket nobody can see is money nobody can find.
  service.charAt(0).toUpperCase() + service.slice(1);

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}

interface GiftCardReportsTabProps {
  /**
   * The OUTSTANDING cards — active, and still holding money.
   *
   * The only list this tab needs, and the only one of the gift-card lists that
   * is bounded by something other than time: a card leaves it when it is spent,
   * cancelled or expires. Every NUMBER on this tab comes from the database
   * instead (`gift_card_totals`), because the tab used to reduce them out of
   * every card the facility had ever issued with every movement attached —
   * 6,022 cards and 3.46 MB on the e2e facility, for four figures and two
   * charts.
   */
  outstanding: GiftCard[];
}

export function GiftCardReportsTab({ outstanding }: GiftCardReportsTabProps) {
  const [salesRange, setSalesRange] = useState<DateRange>(() =>
    presetRange("year"),
  );
  const [redeemRange, setRedeemRange] = useState<DateRange>(() =>
    presetRange("year"),
  );
  const [expiryWindow, setExpiryWindow] = useState<30 | 60 | 90>(30);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // The two windows are separate questions and the route takes them separately:
  // this tab has a range picker for sales and another for redemptions, and
  // liability answers to neither — money owed is owed today.
  const sales = totalsWindow(salesRange);
  const redeem = totalsWindow(redeemRange);
  const { data: totals } = useQuery(
    giftCardQueries.totals({
      salesFrom: sales.from,
      salesTo: sales.to,
      redeemFrom: redeem.from,
      redeemTo: redeem.to,
    }),
  );

  // ── Outstanding liability ────────────────────────────────────────────────
  //
  // The rows are the ones passed in; the TOTAL is the database's. They agree,
  // and where they could not — a facility with more outstanding cards than one
  // read returns — the total is the half that stays right.
  const liabilityCards = outstanding;
  const totalLiability = totals?.liability.total ?? 0;

  const exportLiability = () => {
    const headers = [
      "Card Code",
      "Type",
      "Balance",
      "Issued",
      "Last Used",
      "Expiry",
    ];
    const rows = liabilityCards.map((c) => [
      c.code,
      c.type === "physical" ? "Physical" : "Digital",
      c.currentBalance.toFixed(2),
      c.purchaseDate,
      c.lastUsedAt ?? "Never",
      c.neverExpires ? "Never" : (c.expiryDate ?? "—"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "gift-card-outstanding-liability.csv";
    a.click();
  };

  // ── Sales summary ──────────────────────────────────────────────────────────
  const soldCount = totals?.sales.count ?? 0;
  const salesValue = totals?.sales.value ?? 0;
  const avgDenom = soldCount ? salesValue / soldCount : 0;
  const digitalCount = totals?.sales.digital ?? 0;
  const physicalCount = totals?.sales.physical ?? 0;
  // `YYYY-MM` from SQL, already ordered. Kept as pairs because that is what the
  // bars below read, and the month key sorts as a string by construction.
  const salesByMonth = useMemo(
    () =>
      (totals?.salesByMonth ?? []).map(
        ({ month, value }) => [month, value] as const,
      ),
    [totals],
  );
  const maxMonth = Math.max(1, ...salesByMonth.map(([, v]) => v));

  // ── Redemptions ──────────────────────────────────────────────────────────
  const redemptionCount = totals?.redemptions.count ?? 0;
  const totalRedeemed = totals?.redemptions.total ?? 0;
  // Not memoised, deliberately. `serviceLabel` is a lookup today, but a memo
  // that closes over a label function and does not depend on it serves whatever
  // that function returned on the first render forever — which is the defect
  // `check:frozen-translator` exists for, and it flagged this line when it WAS
  // a memo. There are at most a handful of services; recomputing is free, and
  // it stays correct if these labels ever come from the catalogue.
  const redeemByCategory = (totals?.redemptionsByService ?? []).map(
    ({ service, value }) => ({ category: serviceLabel(service), value }),
  );

  // ── Expiry alerts ──────────────────────────────────────────────────────────
  const expiringCards = useMemo(() => {
    // Normalize to local start-of-day so the window is [today .. cutoff day] inclusive
    // (expiryDate is a date-only string; parse it as local, not UTC midnight).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = new Date(startOfToday);
    cutoff.setDate(startOfToday.getDate() + expiryWindow);
    cutoff.setHours(23, 59, 59, 999);
    // Already the active, still-funded set — `outstanding` is exactly the
    // cards this used to filter for, so what is left is the expiry window.
    return outstanding
      .filter((c) => {
        if (c.neverExpires || !c.expiryDate) return false;
        const exp = new Date(`${c.expiryDate}T00:00:00`);
        return exp >= startOfToday && exp <= cutoff;
      })
      .sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""));
  }, [outstanding, expiryWindow]);

  const sendAllReminders = () =>
    setRemindedIds(
      (prev) => new Set([...prev, ...expiringCards.map((c) => c.id)]),
    );

  return (
    <Tabs defaultValue="liability" className="mt-2">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="liability">Liability</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
        <TabsTrigger value="expiry">Expiry Alerts</TabsTrigger>
      </TabsList>

      {/* Outstanding Liability */}
      <TabsContent value="liability" className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Outstanding Liability</h3>
            <p className="text-muted-foreground text-sm">
              Active cards with an unredeemed balance.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportLiability}
          >
            <FileDown className="size-4" />
            Export CSV
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Card</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                  Issued
                </th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                  Last Used
                </th>
                <th className="px-3 py-2 text-left font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {liabilityCards.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-600">
                    {money(c.currentBalance)}
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-2 sm:table-cell">
                    {fmtDate(c.purchaseDate)}
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-2 sm:table-cell">
                    {c.lastUsedAt ? (
                      fmtDate(c.lastUsedAt)
                    ) : (
                      <span className="italic">Never</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {c.neverExpires ? "Never" : fmtDate(c.expiryDate)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t font-semibold">
                <td className="px-3 py-2">Total ({liabilityCards.length})</td>
                <td className="px-3 py-2 text-right text-green-600">
                  {money(totalLiability)}
                </td>
                <td className="hidden sm:table-cell" />
                <td className="hidden sm:table-cell" />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </TabsContent>

      {/* Sales Summary */}
      <TabsContent value="sales" className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Sales Summary</h3>
            <p className="text-muted-foreground text-sm">
              Gift cards sold in the selected period.
            </p>
          </div>
          <GiftCardDateRangeFilter
            value={salesRange}
            onChange={setSalesRange}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Cards sold" value={String(soldCount)} />
          <StatTile label="Total value" value={money(salesValue)} />
          <StatTile label="Avg. denomination" value={money(avgDenom)} />
          <StatTile
            label="Digital / Physical"
            value={`${digitalCount} / ${physicalCount}`}
          />
        </div>
        <div className="rounded-xl border p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <TrendingUp className="size-4" />
            Value by month
          </p>
          {salesByMonth.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No sales in this period.
            </p>
          ) : (
            <div className="flex h-40 items-end gap-2">
              {salesByMonth.map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-muted-foreground text-[10px]">
                    {money(value)}
                  </span>
                  <div
                    className="bg-primary w-full rounded-t"
                    style={{
                      height: `${Math.max(4, (value / maxMonth) * 120)}px`,
                    }}
                  />
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(`${key}-01T00:00:00`).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        year: "2-digit",
                      },
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Redemptions */}
      <TabsContent value="redemptions" className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Redemptions</h3>
            <p className="text-muted-foreground text-sm">
              Value redeemed in the selected period, by service.
            </p>
          </div>
          <GiftCardDateRangeFilter
            value={redeemRange}
            onChange={setRedeemRange}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Redemptions" value={String(redemptionCount)} />
          <StatTile label="Total redeemed" value={money(totalRedeemed)} />
        </div>
        <div className="rounded-xl border p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <Wallet className="size-4" />
            By service category
          </p>
          {redeemByCategory.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No redemptions in this period.
            </p>
          ) : (
            <div className="space-y-2">
              {redeemByCategory.map(({ category, value }) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm">{category}</span>
                  <div className="bg-muted h-5 flex-1 overflow-hidden rounded-sm">
                    <div
                      className="bg-primary h-full rounded-sm"
                      style={{ width: `${(value / totalRedeemed) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-medium">
                    {money(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Expiry Alerts */}
      <TabsContent value="expiry" className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Expiry Alerts</h3>
            <p className="text-muted-foreground text-sm">
              Active cards with a balance expiring soon.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {([30, 60, 90] as const).map((w) => (
              <Button
                key={w}
                size="sm"
                variant={expiryWindow === w ? "default" : "outline"}
                onClick={() => setExpiryWindow(w)}
              >
                {w} days
              </Button>
            ))}
          </div>
        </div>

        {expiringCards.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm">
            <CalendarClock className="size-6" />
            No cards expiring in the next {expiryWindow} days.
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={sendAllReminders}>
                <Send className="size-4" />
                Send all reminders
              </Button>
            </div>
            <div className="space-y-2">
              {expiringCards.map((c) => {
                const reminded = remindedIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <CalendarClock className="size-5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium">
                        {c.code}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {c.recipientName ?? c.recipientEmail ?? "—"} · Expires{" "}
                        <span className="font-medium text-amber-600">
                          {fmtDate(c.expiryDate)}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-green-600">
                      {money(c.currentBalance)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      disabled={reminded}
                      onClick={() =>
                        setRemindedIds((prev) => new Set(prev).add(c.id))
                      }
                    >
                      {reminded ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          Sent
                        </>
                      ) : (
                        <>
                          <Mail className="size-3.5" />
                          Remind
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
