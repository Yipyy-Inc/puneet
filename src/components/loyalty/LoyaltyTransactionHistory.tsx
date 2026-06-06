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
import type { LoyaltyTransaction } from "@/types/loyalty";

type HistoryFilter = "all" | "earned" | "redeemed";

const isEarnedTxn = (t: LoyaltyTransaction) =>
  t.points > 0 || (t.points === 0 && (t.value ?? 0) > 0);
const isRedeemedTxn = (t: LoyaltyTransaction) => t.points < 0;

const PAGE_SIZE = 20;

type Kind = "earned" | "badge" | "redeemed" | "expired" | "adjusted" | "referral";

const KIND_LABEL: Record<Kind, string> = {
  earned: "Earned",
  badge: "Badge",
  redeemed: "Redeemed",
  expired: "Expired",
  adjusted: "Adjustment",
  referral: "Referral",
};

function kindOf(t: LoyaltyTransaction): Kind {
  switch (t.transactionType) {
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
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
}: {
  transactions: LoyaltyTransaction[];
  currentBalance: number;
  /** Show an earned/redeemed/all type filter above the table. */
  filterable?: boolean;
}) {
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
      <p className="text-muted-foreground text-sm">No transactions yet.</p>
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
          <SelectItem value="all">All activity</SelectItem>
          <SelectItem value="earned">Earned</SelectItem>
          <SelectItem value="redeemed">Redeemed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (displayRows.length === 0) {
    return (
      <div className="space-y-3">
        {filterControl}
        <p className="text-muted-foreground text-sm">
          No {filter} transactions.
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
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map(({ txn, balanceAfter }) => {
              const kind = kindOf(txn);
              return (
                <TableRow key={txn.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {formatDate(txn.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={kind === "adjusted" ? "secondary" : "outline"}>
                      {KIND_LABEL[kind]}
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
                    {txn.points.toLocaleString()}
                    {txn.points === 0 && (txn.value ?? 0) > 0 && (
                      <span className="text-muted-foreground block text-xs">
                        +${txn.value!.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {balanceAfter.toLocaleString()}
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
            {start + 1}–{Math.min(start + PAGE_SIZE, displayRows.length)} of{" "}
            {displayRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="text-muted-foreground">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
