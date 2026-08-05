"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  RotateCcw,
  CalendarX,
} from "lucide-react";
import type {
  StoreCreditAccount,
  StoreCreditEntry,
} from "@/lib/api/store-credit";

// The account and its entries come in separately because the ledger is not
// nested: a balance is a sum over rows, not an object that owns them.
interface Props {
  account: StoreCreditAccount | null;
  entries: StoreCreditEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASON_LABEL: Record<string, string> = {
  added: "Credit added",
  redeemed: "Spent at checkout",
  expired: "Expired",
  refund: "Refunded to credit",
  adjustment: "Adjustment",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function CreditsHistoryDrawer({
  account,
  entries,
  open,
  onOpenChange,
}: Props) {
  if (!account) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{account.clientName}</SheetTitle>
          <SheetDescription>Store credit history</SheetDescription>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <Stat label="Balance" value={fmt(account.balance)} tone="emerald" />
            <Stat label="Issued" value={fmt(account.totalIssued)} />
            <Stat label="Spent" value={fmt(account.totalSpent)} />
          </div>
        </SheetHeader>

        <div className="overflow-y-auto px-6 py-4">
          {entries.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No entries.
            </div>
          ) : (
            <ol className="space-y-2">
              {entries.map((t) => {
                // The ledger's own vocabulary: added, redeemed, expired,
                // refund, adjustment. The sign is part of the reason -- the
                // CHECK enforces it -- so the icon follows the reason rather
                // than second-guessing it from the amount.
                const icon =
                  t.reason === "added" ? (
                    <ArrowUpRight className="size-3.5 text-emerald-600" />
                  ) : t.reason === "redeemed" ? (
                    <ArrowDownRight className="size-3.5 text-red-600" />
                  ) : t.reason === "refund" ? (
                    <RotateCcw className="size-3.5 text-blue-600" />
                  ) : (
                    <CalendarX className="size-3.5 text-slate-500" />
                  );
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted/40 flex size-7 items-center justify-center rounded-md">
                        {icon}
                      </div>
                      <div>
                        <div className="font-medium">
                          {t.note || REASON_LABEL[t.reason] || t.reason}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(t.createdAt).toLocaleString()}
                          {t.authorName ? ` · ${t.authorName}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          t.amount >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        }
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {fmt(t.amount)}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {t.reason}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="bg-muted/40 rounded-lg border p-2">
      <div className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase">
        <CircleDollarSign className="size-3" />
        {label}
      </div>
      <div
        className={`text-base font-semibold ${
          tone === "emerald" ? "text-emerald-700 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
