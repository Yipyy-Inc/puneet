"use client";

import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { useYipyyPayNav } from "../use-yipyy-pay-nav";

// ============================================================================
// Is my money moving, and where is it?
//
// ── EVERY NUMBER HERE IS OURS, AND TWO OF THEM ARE ESTIMATES ──────────────
//
// The activity list is exact: those are the payments Yipyy took, read back from
// the ledger that recorded them.
//
// The payout figures are not. Clover publishes no settlement endpoint to an
// integration, so these are computed from the same ledger — a day's card
// takings, net of refunds, plus the schedule the facility told us they are on.
// Correct except where Clover intervenes: a hold, a chargeback, a fee deducted
// at source.
//
// That distinction is on the screen, in words, next to the number. A facility
// reconciling a bank statement has to know which figure is authoritative, and
// it is not this one — so there is a link to the one that is.
//
// ── AND IT SPENDS THE CURRENCY THE MERCHANT ACTUALLY TRADES IN ────────────
//
// `formatCurrency` in lib/format is hardcoded to USD. The sandbox merchant is
// CAD, and both render a bare "$" — so a Canadian facility would read US
// dollars and never know. The currency comes off the connection.
// ============================================================================

function useMoney(currency: string | null) {
  const code = currency ?? "USD";
  return (cents: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(cents / 100);
}

/** "Tue 26 Aug" — enough to plan around, short enough for a tile. */
function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OverviewTab({ overview }: { overview: YipyyPayOverview }) {
  const nav = useYipyyPayNav();
  const money = useMoney(overview.connection.currency);
  const { connection, payouts, activity } = overview;

  const pendingCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const next = payouts[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Next payout"
          value={next ? money(next.amountCents) : "—"}
          hint={
            next
              ? `Estimated ${formatDay(next.expectedOn)}`
              : "Nothing waiting to settle"
          }
          icon={Wallet}
          tone="emerald"
          trail={
            next
              ? [{ label: "transactions", value: next.transactions }]
              : undefined
          }
        />
        <KpiTile
          label="On its way"
          value={money(pendingCents)}
          hint={
            payouts.length > 1
              ? `Across ${payouts.length} payouts`
              : "Estimated, before any Clover adjustments"
          }
          icon={Banknote}
          tone="indigo"
        />
        <KpiTile
          label="Card payments"
          value={connection.connected ? "Enabled" : "Not working"}
          hint={
            connection.currency
              ? `Settling in ${connection.currency}`
              : "Currency not confirmed yet"
          }
          icon={CreditCard}
          tone={connection.connected ? "emerald" : "rose"}
          alert={
            connection.connected
              ? undefined
              : { label: "Reconnect required", tone: "rose" }
          }
        />
      </div>

      {/* ── Payouts ──────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Money on its way to your bank</p>
              <p className="text-muted-foreground text-sm/relaxed">
                Estimated from the card payments you have taken. Clover settles
                the final amount.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <a
                href="https://www.clover.com/dashboard"
                target="_blank"
                rel="noreferrer noopener"
              >
                See actual deposits
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            </Button>
          </div>

          {payouts.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm/relaxed">
              Nothing is waiting to settle. Card payments you take today will
              appear here with the date they should reach your bank.
            </p>
          ) : (
            <ul className="divide-y">
              {payouts.map((payout) => (
                <li
                  key={payout.takenOn}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {formatDay(payout.expectedOn)}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {payout.transactions} payment
                        {payout.transactions === 1 ? "" : "s"} taken{" "}
                        {formatDay(payout.takenOn)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {money(payout.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 border-t pt-3 text-xs/relaxed">
            <span>
              Schedule:{" "}
              <span className="text-foreground font-medium">
                {overview.config.payoutSchedule === "next_day"
                  ? "Next business day"
                  : "2–3 business days"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => nav.go({ tab: "preferences" })}
              className="hover:text-foreground font-medium underline underline-offset-2"
            >
              Change
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">Recent card payments</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/facility/dashboard/billing">
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Receipt className="text-muted-foreground mx-auto size-6" />
              <p className="mt-2 text-sm font-medium">No card payments yet</p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm/relaxed">
                Take one at checkout, or send a customer a payment link, and it
                will show up here with the booking it belongs to.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {activity.map((row) => {
                const refunded = row.status === "refunded";
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {row.description}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {formatWhen(row.at)}
                        {row.cardBrand && (
                          <>
                            {" · "}
                            {row.cardBrand}
                            {row.cardLast4 && ` ····${row.cardLast4}`}
                          </>
                        )}
                        {row.entry === "card_present" && " · Terminal"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          refunded && "text-muted-foreground",
                        )}
                      >
                        {money(row.amountCents)}
                      </span>
                      <Badge variant={refunded ? "outline" : "success"}>
                        {refunded ? "Refunded" : "Paid"}
                      </Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
