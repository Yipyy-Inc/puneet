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
import type { PrepaidCredits } from "@/data/services-pricing";

interface Props {
  credits: PrepaidCredits | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function CreditsHistoryDrawer({ credits, open, onOpenChange }: Props) {
  if (!credits) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{credits.customerName}</SheetTitle>
          <SheetDescription>Prepaid credits history</SheetDescription>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <Stat
              label="Balance"
              value={fmt(credits.balance)}
              tone="emerald"
            />
            <Stat label="Purchased" value={fmt(credits.totalPurchased)} />
            <Stat label="Used" value={fmt(credits.totalUsed)} />
          </div>
        </SheetHeader>

        <div className="overflow-y-auto px-6 py-4">
          {credits.transactions.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No transactions.
            </div>
          ) : (
            <ol className="space-y-2">
              {credits.transactions.map((t) => {
                const icon =
                  t.type === "purchase" ? (
                    <ArrowUpRight className="size-3.5 text-emerald-600" />
                  ) : t.type === "usage" ? (
                    <ArrowDownRight className="size-3.5 text-red-600" />
                  ) : t.type === "refund" ? (
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
                        <div className="font-medium">{t.description}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(t.date).toLocaleString()}
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
                        {t.type}
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
