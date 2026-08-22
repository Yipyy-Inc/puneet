"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Gift,
  TrendingUp,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { loyaltyLedgerQueries } from "@/lib/api/loyalty-ledger";
import { bookingQueries } from "@/lib/api/booking";
import { useHydrated } from "@/hooks/use-hydrated";
import { computeProgramPerformanceFromLedger } from "@/lib/loyalty/program-metrics";

// Captured once at module load; the banner only renders after hydration so SSR
// and the first client render match.
const NOW_ISO = new Date().toISOString();
const REPORTS_HREF = "/facility/dashboard/marketing/loyalty-reports";

const TONE: Record<string, { text: string; bg: string }> = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-950",
  },
};

export function LoyaltyPerformanceBanner() {
  const hydrated = useHydrated();
  // The LEDGER, not `@/lib/api/loyalty` — that module is the fixture one, and
  // this banner quoted a dollar figure out of it. `@/data/bookings` is gone for
  // the same reason: retention was being measured against invented history.
  const accountsQ = useQuery(loyaltyLedgerQueries.accounts());
  const vouchersQ = useQuery(loyaltyLedgerQueries.allVouchers());
  const bookingsQ = useQuery(bookingQueries.all());
  const accounts = accountsQ.data ?? [];
  const vouchers = vouchersQ.data ?? [];
  const bookings = bookingsQ.data ?? [];
  // Every default above is EMPTY, and an empty ledger computes to $0, 0%,
  // "0 of 0 members" — which is not "loading", it is a claim, and a wrong one.
  // Measured on the demo facility: the first paint said $0 and 0 of 0 while the
  // truth was 3 of 4 members and real money off real bills. A zero that arrives
  // before the data is the same lie as an invented constant, told faster.
  const loading =
    accountsQ.isPending || vouchersQ.isPending || bookingsQ.isPending;

  const perf = useMemo(
    () =>
      computeProgramPerformanceFromLedger({
        accounts,
        vouchers,
        bookings,
        now: NOW_ISO,
      }),
    [accounts, vouchers, bookings],
  );

  if (!hydrated || loading) {
    return <div className="bg-muted/30 h-28 animate-pulse rounded-xl border" />;
  }

  const retentionDelta = Math.round(
    (perf.memberRetention - perf.nonMemberRetention) * 100,
  );

  const stats: {
    key: string;
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    tone: keyof typeof TONE;
  }[] = [
    {
      key: "revenue",
      label: "Revenue retained",
      value: `$${perf.revenueRetained.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      // The unpriceable rewards are DISCLOSED rather than folded in at an
      // assumed value. A free service stores no amount, so its cash worth is
      // not knowable from the ledger — and a total that quietly included a
      // guess would be worse than one that admits its edge.
      hint:
        perf.unvaluedRewards > 0
          ? `Off real bills this month · ${perf.unvaluedRewards} reward${perf.unvaluedRewards === 1 ? "" : "s"} not priceable`
          : "Taken off real bills this month",
      icon: DollarSign,
      tone: "emerald",
    },
    {
      key: "redemptions",
      label: "Redemption rate",
      value: `${Math.round(perf.redemptionRate * 100)}%`,
      hint: `${perf.membersRedeemed} of ${perf.totalMembers} members redeemed this month`,
      icon: Gift,
      tone: "amber",
    },
    {
      key: "retention",
      label: "Member retention",
      value: `${Math.round(perf.memberRetention * 100)}%`,
      hint: `vs ${Math.round(perf.nonMemberRetention * 100)}% non-members${
        retentionDelta !== 0
          ? ` (${retentionDelta > 0 ? "+" : ""}${retentionDelta} pts)`
          : ""
      } · rebooked ≤60 days`,
      icon: TrendingUp,
      tone: "violet",
    },
  ];

  return (
    <div className="to-background rounded-xl border bg-linear-to-br from-indigo-50/60 p-4 dark:from-indigo-950/20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Program performance</h3>
        <span className="text-muted-foreground text-xs">This month</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => {
          const tone = TONE[s.tone];
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              href={`${REPORTS_HREF}?metric=${s.key}`}
              className="group bg-background hover:border-primary/40 relative rounded-lg border p-3 transition-colors"
            >
              <ArrowUpRight className="text-muted-foreground/50 group-hover:text-primary absolute top-3 right-3 size-4 transition-colors" />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    tone.bg,
                  )}
                >
                  <Icon className={cn("size-4", tone.text)} />
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  {s.label}
                </span>
              </div>
              <div
                className={cn(
                  "mt-2 text-2xl font-bold tabular-nums",
                  tone.text,
                )}
              >
                {s.value}
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">{s.hint}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
