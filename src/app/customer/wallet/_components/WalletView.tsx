"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Wallet,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
  ShoppingBag,
  Home,
  Scissors,
  GraduationCap,
  Package,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { customerWallets, giftCards } from "@/data/gift-cards";

const MOCK_CLIENT_ID = 15;
const FACILITY_ID = 11;

const txTypeConfig: Record<
  string,
  { icon: typeof Wallet; color: string; label: string; bg: string }
> = {
  gift_card_redeem: {
    icon: Gift,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    label: "Gift Card Redeemed",
  },
  service_payment: {
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    label: "Service Payment",
  },
  deposit_payment: {
    icon: Home,
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    label: "Deposit",
  },
  package_payment: {
    icon: Package,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    label: "Package Payment",
  },
  retail_payment: {
    icon: ShoppingBag,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    label: "Retail Purchase",
  },
  tip_payment: {
    icon: Sparkles,
    color: "text-pink-600",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    label: "Tip",
  },
  addon_payment: {
    icon: Plus,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    label: "Add-On",
  },
  refund_in: {
    icon: ArrowUpRight,
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    label: "Refund",
  },
  adjustment: {
    icon: Wallet,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
    label: "Adjustment",
  },
};

export function WalletView() {
  const wallet = customerWallets.find(
    (w) => w.clientId === MOCK_CLIENT_ID && w.facilityId === FACILITY_ID,
  );

  const myGiftCards = useMemo(
    () =>
      giftCards.filter(
        (gc) =>
          gc.facilityId === FACILITY_ID &&
          (gc.purchasedByClientId === MOCK_CLIENT_ID ||
            gc.recipientEmail?.includes("alice")) &&
          gc.status === "active",
      ),
    [],
  );

  const totalIn = useMemo(
    () =>
      (wallet?.transactions ?? [])
        .filter((tx) => tx.amount > 0)
        .reduce((s, tx) => s + tx.amount, 0),
    [wallet],
  );

  const totalOut = useMemo(
    () =>
      (wallet?.transactions ?? [])
        .filter((tx) => tx.amount < 0)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0),
    [wallet],
  );

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatDateTime = (s: string) =>
    new Date(s).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Wallet className="text-muted-foreground size-8" />
        </div>
        <p className="mt-4 font-semibold">No wallet yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Redeem a gift card to set up your wallet
        </p>
        <Button asChild className="mt-4">
          <Link href="/customer/gift-cards/redeem">
            <Gift className="mr-2 size-4" />
            Redeem a Gift Card
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 opacity-80">
                <Wallet className="size-4" />
                <span className="text-sm font-medium">Account Wallet</span>
              </div>
              <p className="mt-2 text-5xl font-bold tracking-tight">
                ${wallet.balance.toFixed(2)}
              </p>
              <p className="mt-1 text-sm opacity-70">Available balance</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                Active
              </Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
            <div>
              <p className="text-xs opacity-60">Total Received</p>
              <p className="text-lg font-semibold">+${totalIn.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">Total Spent</p>
              <p className="text-lg font-semibold">-${totalOut.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" asChild className="h-auto flex-col gap-1.5 py-3">
          <Link href="/customer/gift-cards/redeem">
            <Gift className="size-5 text-violet-600" />
            <span className="text-xs font-medium">Redeem Gift Card</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto flex-col gap-1.5 py-3">
          <Link href="/customer/gift-cards">
            <Sparkles className="size-5 text-amber-600" />
            <span className="text-xs font-medium">Buy Gift Card</span>
          </Link>
        </Button>
      </div>

      {/* Active gift cards */}
      {myGiftCards.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">My Gift Cards</h3>
          <div className="space-y-2">
            {myGiftCards.map((gc) => (
              <div
                key={gc.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Gift className="text-primary size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">
                      ****{gc.code.slice(-6)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Issued {formatDate(gc.purchaseDate)} ·{" "}
                      {gc.neverExpires
                        ? "Never expires"
                        : gc.expiryDate
                          ? `Expires ${formatDate(gc.expiryDate)}`
                          : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    ${gc.currentBalance.toFixed(2)}
                  </p>
                  <Badge variant="outline" className="mt-0.5 text-xs capitalize">
                    {gc.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" asChild className="mt-1 w-full text-xs">
            <Link href="/customer/gift-cards/redeem">
              + Redeem another card
            </Link>
          </Button>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="mb-3 font-semibold">Transaction History</h3>
        {wallet.transactions.length === 0 ? (
          <div className="rounded-xl border py-8 text-center">
            <Wallet className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
            <p className="text-muted-foreground text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...wallet.transactions]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((tx) => {
                const cfg = txTypeConfig[tx.type] ?? {
                  icon: Wallet,
                  color: "text-muted-foreground",
                  bg: "bg-muted",
                  label: tx.type,
                };
                const Icon = cfg.icon;
                const isCredit = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        cfg.bg,
                      )}
                    >
                      <Icon className={cn("size-4", cfg.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{cfg.label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {tx.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "price-value font-semibold",
                          isCredit ? "text-green-600" : "text-foreground",
                        )}
                      >
                        {isCredit ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        ${tx.balanceAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Usage note */}
      <Card className="border-dashed">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="text-primary size-4" />
            Where can I use my wallet?
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { icon: Home, label: "Boarding" },
              { icon: Scissors, label: "Grooming" },
              { icon: GraduationCap, label: "Training" },
              { icon: ShoppingBag, label: "Retail" },
              { icon: Package, label: "Packages" },
              { icon: Plus, label: "Add-Ons" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Simply select &quot;Pay with Wallet&quot; at checkout — your balance will be
            applied automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
