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
import type { GiftCard } from "@/types/payments";
import {
  GiftCardDateRangeFilter,
  presetRange,
  isWithinRange,
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

// Redemptions don't carry a service category in the mock, so derive a stable one.
const SERVICE_CATEGORIES = [
  "Grooming",
  "Boarding",
  "Daycare",
  "Retail",
  "Training",
];
const categoryFor = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h + ch.charCodeAt(0)) % SERVICE_CATEGORIES.length;
  return SERVICE_CATEGORIES[h];
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}

interface GiftCardReportsTabProps {
  cards: GiftCard[];
}

export function GiftCardReportsTab({ cards }: GiftCardReportsTabProps) {
  const [salesRange, setSalesRange] = useState<DateRange>(() =>
    presetRange("year"),
  );
  const [redeemRange, setRedeemRange] = useState<DateRange>(() =>
    presetRange("year"),
  );
  const [expiryWindow, setExpiryWindow] = useState<30 | 60 | 90>(30);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  // ── Outstanding liability ────────────────────────────────────────────────
  const liabilityCards = useMemo(
    () => cards.filter((c) => c.status === "active" && c.currentBalance > 0),
    [cards],
  );
  const totalLiability = liabilityCards.reduce(
    (sum, c) => sum + c.currentBalance,
    0,
  );

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
  const soldCards = useMemo(
    () =>
      cards.filter((c) =>
        isWithinRange(c.createdAt ?? c.purchaseDate, salesRange),
      ),
    [cards, salesRange],
  );
  const salesValue = soldCards.reduce((s, c) => s + c.initialAmount, 0);
  const avgDenom = soldCards.length ? salesValue / soldCards.length : 0;
  const digitalCount = soldCards.filter((c) => c.type !== "physical").length;
  const physicalCount = soldCards.length - digitalCount;
  const salesByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of soldCards) {
      const d = new Date(c.createdAt ?? c.purchaseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + c.initialAmount);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [soldCards]);
  const maxMonth = Math.max(1, ...salesByMonth.map(([, v]) => v));

  // ── Redemptions ──────────────────────────────────────────────────────────
  const redemptions = useMemo(() => {
    return cards.flatMap((c) =>
      c.transactionHistory
        .filter(
          (t) =>
            t.type === "redemption" && isWithinRange(t.timestamp, redeemRange),
        )
        .map((t) => ({ amount: t.amount, category: categoryFor(c.id) })),
    );
  }, [cards, redeemRange]);
  const totalRedeemed = redemptions.reduce((s, r) => s + r.amount, 0);
  const redeemByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of redemptions)
      map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    return SERVICE_CATEGORIES.map((cat) => ({
      category: cat,
      value: map.get(cat) ?? 0,
    })).filter((c) => c.value > 0);
  }, [redemptions]);

  // ── Expiry alerts ──────────────────────────────────────────────────────────
  const expiringCards = useMemo(() => {
    // Normalize to local start-of-day so the window is [today .. cutoff day] inclusive
    // (expiryDate is a date-only string; parse it as local, not UTC midnight).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = new Date(startOfToday);
    cutoff.setDate(startOfToday.getDate() + expiryWindow);
    cutoff.setHours(23, 59, 59, 999);
    return cards
      .filter((c) => {
        if (
          c.status !== "active" ||
          c.currentBalance <= 0 ||
          c.neverExpires ||
          !c.expiryDate
        )
          return false;
        const exp = new Date(`${c.expiryDate}T00:00:00`);
        return exp >= startOfToday && exp <= cutoff;
      })
      .sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""));
  }, [cards, expiryWindow]);

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
          <StatTile label="Cards sold" value={String(soldCards.length)} />
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
          <StatTile label="Redemptions" value={String(redemptions.length)} />
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
