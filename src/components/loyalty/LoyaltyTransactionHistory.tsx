"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatMoney,
  formatNumber,
  formatTime,
} from "@/lib/i18n/format";
/**
 * What this list needs from a points transaction, and nothing more.
 *
 * ── A TRANSITIONAL SHAPE, DELIBERATELY ────────────────────────────────────
 *
 * Two callers now pass REAL ledger rows (`kind`) and one still passes the
 * fixture shape (`transactionType`) — the customer wallet, which is not
 * converted yet. Rather than adapt at three call sites, this names the union of
 * what they have and reads whichever is present.
 *
 * `transactionType` goes when the wallet does. It is optional here, not
 * blessed: a row with neither field lands in "adjusted", which is the honest
 * answer for a movement nobody has classified.
 */
export interface LoyaltyHistoryEntry {
  id: string;
  points: number;
  description: string;
  createdAt: string;
  /** A cash value moved alongside the points, if any. */
  value?: number;
  staffName?: string | null;
  /** On a real ledger row. */
  kind?: string;
  /** On the fixture shape. Superseded by `kind`. */
  transactionType?: string;
}

type HistoryFilter = "all" | "earned" | "redeemed";

const isEarnedTxn = (t: LoyaltyHistoryEntry) =>
  t.points > 0 || (t.points === 0 && (t.value ?? 0) > 0);
const isRedeemedTxn = (t: LoyaltyHistoryEntry) => t.points < 0;

const PAGE_SIZE = 20;

type Kind =
  | "earned"
  | "badge"
  | "redeemed"
  | "expired"
  | "adjusted"
  | "referral";

// A filter's empty message, by CATALOGUE KEY.
const NO_TRANSACTIONS_KEY: Record<HistoryFilter, string> = {
  all: "noTransactionsAll",
  earned: "noTransactionsEarned",
  redeemed: "noTransactionsRedeemed",
};

// A movement's name, by CATALOGUE KEY in `shell.loyalty`.
const KIND_KEY: Record<Kind, string> = {
  earned: "kindEarned",
  badge: "kindBadge",
  redeemed: "kindRedeemed",
  expired: "kindExpired",
  adjusted: "kindAdjusted",
  referral: "kindReferral",
};

function kindOf(t: LoyaltyHistoryEntry): Kind {
  switch (t.kind ?? t.transactionType) {
    case "earned":
      return t.description?.startsWith("Badge unlocked") ? "badge" : "earned";
    case "redeemed":
      return "redeemed";
    case "expired":
      return "expired";
    case "referral":
      return "referral";
    case "adjusted":
    case "manual_adjustment":
      return "adjusted";
    default:
      // A movement nobody classified. The switch used to be exhaustive over an
      // enum; the entry type is now a union of two shapes, so this is the
      // honest answer rather than a crash.
      return "adjusted";
  }
}

function formatDate(iso: string, locale: AppLocale, withTime = false) {
  const date = formatDateLong(iso, locale);
  if (!withTime) return date;
  return `${date} · ${formatTime(iso, locale)}`;
}

/**
 * Chronological points-transaction history for one customer's loyalty account.
 * Shows date, type, description, +/- points (and credit), and a running balance
 * — anchored to the account's current balance and walked backward so the newest
 * row reflects the live balance regardless of seed drift. Paginated, 20 per page.
 */
export function LoyaltyTransactionHistory({
  transactions,
  currentBalance,
  filterable = false,
  showTime = false,
  emptyText,
}: {
  transactions: LoyaltyHistoryEntry[];
  currentBalance: number;
  /** Show an earned/redeemed/all type filter above the table. */
  filterable?: boolean;
  /** Append the time to each row's date. */
  showTime?: boolean;
  /** Empty-state message when there are no transactions. */
  emptyText?: string;
}) {
  const t = useShellText("loyalty");
  const locale = useShellLocale();
  const rows = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
    // Newest-first: balance after row i = current balance minus the net points of
    // every (newer) row above it. Computed functionally to stay render-pure.
    return sorted.map((txn, i) => {
      const pointsAbove = sorted
        .slice(0, i)
        .reduce((sum, r) => sum + r.points, 0);
      return { txn, balanceAfter: currentBalance - pointsAbove };
    });
  }, [transactions, currentBalance]);

  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [page, setPage] = useState(0);

  // Filter the balance-stamped rows so "Balance" still reflects the true account
  // balance at each transaction even when a subset is shown.
  const displayRows = useMemo(() => {
    if (!filterable || filter === "all") return rows;
    const pred = filter === "earned" ? isEarnedTxn : isRedeemedTxn;
    return rows.filter((r) => pred(r.txn));
  }, [rows, filter, filterable]);

  const pageCount = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = displayRows.slice(start, start + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {emptyText ?? t("noTransactionsYet")}
      </p>
    );
  }

  const filterControl = filterable ? (
    <div className="flex items-center justify-end">
      <Select
        value={filter}
        onValueChange={(v: HistoryFilter) => {
          setFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allActivity")}</SelectItem>
          <SelectItem value="earned">{t("earned")}</SelectItem>
          <SelectItem value="redeemed">{t("redeemed")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (displayRows.length === 0) {
    return (
      <div className="space-y-3">
        {filterControl}
        <p className="text-muted-foreground text-sm">
          {t(NO_TRANSACTIONS_KEY[filter])}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filterControl}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead className="text-right">{t("points")}</TableHead>
              <TableHead className="text-right">{t("balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map(({ txn, balanceAfter }) => {
              const kind = kindOf(txn);
              return (
                <TableRow key={txn.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDate(txn.createdAt, locale, showTime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={kind === "adjusted" ? "secondary" : "outline"}
                    >
                      {t(KIND_KEY[kind])}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm">{txn.description}</span>
                    {txn.staffName && (
                      <span className="text-muted-foreground block text-xs">
                        by {txn.staffName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      txn.points > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : txn.points < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {txn.points > 0 ? "+" : ""}
                    {formatNumber(txn.points, locale)}
                    {txn.points === 0 && (txn.value ?? 0) > 0 && (
                      <span className="text-muted-foreground block text-xs">
                        +{formatMoney(txn.value ?? 0, locale)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(balanceAfter, locale)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("rangeOf")
              .replace("{from}", String(start + 1))
              .replace(
                "{to}",
                String(Math.min(start + PAGE_SIZE, displayRows.length)),
              )
              .replace("{total}", String(displayRows.length))}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" /> {t("previous")}
            </Button>
            <span className="text-muted-foreground">
              {t("pageOf")
                .replace("{n}", String(safePage + 1))
                .replace("{total}", String(pageCount))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              {t("next")} <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
