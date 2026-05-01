"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Gift,
  User,
  Mail,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Ban,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GiftCard } from "@/types/payments";
import { clients } from "@/data/clients";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  redeemed: { label: "Fully Redeemed", variant: "secondary" },
  expired: { label: "Expired", variant: "destructive" },
  cancelled: { label: "Voided", variant: "destructive" },
};

const txConfig = {
  purchase: {
    icon: ArrowUpRight,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    label: "Issued",
  },
  redemption: {
    icon: ArrowDownRight,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    label: "Redeemed",
  },
  refund: {
    icon: RotateCcw,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    label: "Refunded",
  },
};

interface GiftCardDetailSheetProps {
  card: GiftCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoid?: (card: GiftCard) => void;
}

export function GiftCardDetailSheet({
  card,
  open,
  onOpenChange,
  onVoid,
}: GiftCardDetailSheetProps) {
  if (!card) return null;

  const statusCfg = statusConfig[card.status] ?? statusConfig.active;
  const purchaser = card.purchasedByClientId
    ? clients.find((c) => c.id === card.purchasedByClientId)
    : null;

  const usedAmount = card.initialAmount - card.currentBalance;
  const usedPct = card.initialAmount > 0 ? (usedAmount / card.initialAmount) * 100 : 0;

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const maskCode = (code: string) => {
    const parts = code.split("-");
    if (parts.length < 2) return `****${code.slice(-4)}`;
    return parts.slice(0, -1).join("-") + "-****";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Gift Card Details
          </SheetTitle>
          <SheetDescription>
            Full audit trail and balance information
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto py-4">
          {/* Balance card */}
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Current Balance</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">
                  ${card.currentBalance.toFixed(2)}
                </p>
                <div className="mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/80"
                    style={{ width: `${100 - usedPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs opacity-70">
                  ${usedAmount.toFixed(2)} used of ${card.initialAmount.toFixed(2)}
                </p>
              </div>
              <Badge
                className={cn(
                  "border-white/30 bg-white/20 text-white hover:bg-white/30",
                  card.status === "active" && "bg-green-500/80",
                  card.status === "expired" && "bg-red-500/80",
                  card.status === "cancelled" && "bg-gray-500/80",
                )}
              >
                {statusCfg.label}
              </Badge>
            </div>

            <div className="mt-4 border-t border-white/20 pt-3">
              <p className="font-mono text-sm opacity-60">
                {maskCode(card.code)}
              </p>
              <p className="mt-0.5 text-xs opacity-50 capitalize">
                {card.type} card ·{" "}
                {card.neverExpires
                  ? "Never expires"
                  : card.expiryDate
                    ? `Expires ${new Date(card.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {card.purchasedBy && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-3" />
                  Purchased By
                </div>
                <p className="mt-1 font-medium">{card.purchasedBy}</p>
                {purchaser?.email && (
                  <p className="text-muted-foreground text-xs">{purchaser.email}</p>
                )}
              </div>
            )}

            {card.recipientName && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-3" />
                  Recipient
                </div>
                <p className="mt-1 font-medium">{card.recipientName}</p>
                {card.recipientEmail && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Mail className="size-3" />
                    {card.recipientEmail}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Calendar className="size-3" />
                Issued
              </div>
              <p className="mt-1 text-sm font-medium">
                {new Date(card.purchaseDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {card.lastUsedAt && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="size-3" />
                  Last Used
                </div>
                <p className="mt-1 text-sm font-medium">
                  {new Date(card.lastUsedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {card.message && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                <MessageSquare className="size-3" />
                Gift Message
              </div>
              <p className="italic">&quot;{card.message}&quot;</p>
            </div>
          )}

          <Separator />

          {/* Transaction history */}
          <div>
            <h4 className="mb-3 font-semibold">Transaction History</h4>
            {card.transactionHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {[...card.transactionHistory]
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime(),
                  )
                  .map((tx) => {
                    const cfg = txConfig[tx.type] ?? txConfig.purchase;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={tx.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg p-3",
                          cfg.bg,
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-7 items-center justify-center rounded-full bg-white dark:bg-black/20",
                          )}
                        >
                          <Icon className={cn("size-3.5", cfg.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{cfg.label}</span>
                            <span
                              className={cn("text-sm font-bold", cfg.color)}
                            >
                              {tx.type === "redemption" ? "-" : "+"}$
                              {tx.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(tx.timestamp)}
                          </p>
                          {tx.notes && (
                            <p className="text-muted-foreground mt-0.5 text-xs italic">
                              {tx.notes}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Balance after:{" "}
                            <span className="font-medium">
                              ${tx.balanceAfter.toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {card.status === "active" && onVoid && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => onVoid(card)}
            >
              <Ban className="mr-2 size-4" />
              Void Gift Card
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
