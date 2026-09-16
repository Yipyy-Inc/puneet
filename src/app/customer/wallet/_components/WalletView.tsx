"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  Gift,
  ArrowUpRight,
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
import { useMyStoreCredit } from "@/lib/api/customer-store-credit";
import { useMyGiftCards } from "@/lib/api/customer-gift-cards";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import {
  formatDateLong,
  formatDateShort,
  formatMoney,
  formatTime,
} from "@/lib/i18n/format";

// ============================================================================
// The owner's own wallet — their store credit, and the gift cards they hold.
//
// This file named Alice Johnson: `MOCK_CLIENT_ID = 15` at fixture facility 11,
// over `src/data/gift-cards`. /customer/wallet is in the customer sidebar, so
// every signed-in owner opening My Wallet was shown HER balance, HER history
// and HER cards as their own.
//
// Both halves are real now. The credit comes from `store_credit_entries`
// through `my_store_credit()`, which is keyed on the caller's own JWT and takes
// no argument through which anyone could ask about somebody else; the cards
// come from `/api/customer/gift-cards`.
//
// The ledger deliberately withholds `note` and `author_name` — staff write
// those about a customer, to other staff — so this screen shows what moved and
// when, and not the commentary beside it.
// ============================================================================

// A movement's words by CATALOGUE KEY, keyed on the LEDGER's own `reason`.
//
// The fixture invented nine types (`service_payment`, `deposit_payment`,
// `tip_payment`, `addon_payment` …) describing what the money was FOR.
// `store_credit_entries.reason` has five and describes what happened to the
// CREDIT: added, redeemed, refund, gift_card, adjustment. Three of the old
// words fit exactly; `added` and `spent` are new, because the ledger draws the
// line in a different place and pretending otherwise would put a label on a row
// that does not mean it.
const REASON_CONFIG: Record<
  string,
  { icon: typeof Wallet; color: string; labelKey: string; bg: string }
> = {
  added: {
    icon: Plus,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    labelKey: "txAdded",
  },
  gift_card: {
    icon: Gift,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    labelKey: "txGiftCardRedeemed",
  },
  redeemed: {
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    labelKey: "txSpent",
  },
  refund: {
    icon: ArrowUpRight,
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    labelKey: "txRefund",
  },
  adjustment: {
    icon: Wallet,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-900/30",
    labelKey: "txAdjustment",
  },
};

// Where the wallet can be spent, by CATALOGUE KEY — four are services and
// are named by serviceTypeLabel; packages and add-ons are this page's words.
const USES: { icon: typeof Wallet; service?: string; key?: string }[] = [
  { icon: Home, service: "boarding" },
  { icon: Scissors, service: "grooming" },
  { icon: GraduationCap, service: "training" },
  { icon: ShoppingBag, service: "retail" },
  { icon: Package, key: "usePackages" },
  { icon: Plus, key: "useAddOns" },
];

export function WalletView() {
  const { t, fill, locale } = useCustomerText("wallet");
  const { accounts, entries, isPending } = useMyStoreCredit();
  const { cards } = useMyGiftCards();

  // The BALANCE is the sum of the accounts, and an account is itself the sum of
  // a facility's ledger. A person can hold credit at more than one facility —
  // the row name says which — so the hero is their total and the list below
  // names the facility whenever there is more than one to tell apart.
  const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const facilityNames = useMemo(
    () => new Map(accounts.map((a) => [a.facilityId, a.facilityName])),
    [accounts],
  );
  const showFacility = accounts.length > 1;

  const myGiftCards = useMemo(
    () => cards.filter((gc) => gc.effectiveStatus === "active"),
    [cards],
  );

  // From the ACCOUNTS, not from `entries`. `entries` is the most recent 200 and
  // the e2e client has 465, so summing the list on screen would have shown a
  // "Total received" far below the real $20,116.27 — understated, with nothing
  // saying it was a partial view. A total is an aggregate fact, so it is
  // computed where the balance is.
  const totalIn = accounts.reduce((sum, a) => sum + a.totalIn, 0);
  const totalOut = accounts.reduce((sum, a) => sum + a.totalOut, 0);

  const formatDate = (s: string) => formatDateLong(s, locale);

  const formatDateTime = (s: string) =>
    `${formatDateShort(s, locale)} · ${formatTime(s, locale)}`;

  // Waiting is not "no wallet yet". The fixture answered instantly, so that
  // empty state was safe to render immediately; over a request it tells
  // somebody they have no credit before anyone has looked (§5s).
  if (isPending) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="bg-muted h-44 animate-pulse rounded-2xl" />
        <div className="bg-muted h-20 animate-pulse rounded-xl" />
        <div className="bg-muted h-20 animate-pulse rounded-xl" />
      </div>
    );
  }

  // No account anywhere AND nothing ever moved. An account that has been
  // emptied still has a history worth showing, so both have to be absent.
  if (accounts.length === 0 && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted flex size-16 items-center justify-center rounded-full">
          <Wallet className="text-muted-foreground size-8" />
        </div>
        <p className="mt-4 font-semibold">{t("noWalletYet")}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("redeemToSetUp")}
        </p>
        <Button asChild className="mt-4">
          <Link href="/customer/gift-cards/redeem">
            <Gift className="mr-2 size-4" />
            {t("redeemAGiftCard")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 size-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 opacity-80">
                <Wallet className="size-4" />
                <span className="text-sm font-medium">
                  {t("accountWallet")}
                </span>
              </div>
              <p className="mt-2 text-5xl font-bold tracking-tight">
                {formatMoney(balance, locale)}
              </p>
              <p className="mt-1 text-sm opacity-70">{t("availableBalance")}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-white/20 text-xs text-white hover:bg-white/30">
                {t("active")}
              </Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
            <div>
              <p className="text-xs opacity-60">{t("totalReceived")}</p>
              <p className="text-lg font-semibold">
                +{formatMoney(totalIn, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-60">{t("totalSpent")}</p>
              <p className="text-lg font-semibold">
                {formatMoney(-totalOut, locale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          asChild
          className="h-auto flex-col gap-1.5 py-3"
        >
          <Link href="/customer/gift-cards/redeem">
            <Gift className="size-5 text-violet-600" />
            <span className="text-xs font-medium">{t("redeemGiftCard")}</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto flex-col gap-1.5 py-3"
        >
          <Link href="/customer/gift-cards">
            <Sparkles className="size-5 text-amber-600" />
            <span className="text-xs font-medium">{t("buyGiftCard")}</span>
          </Link>
        </Button>
      </div>

      {/* Active gift cards */}
      {myGiftCards.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">{t("myGiftCards")}</h3>
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
                      {fill("issuedOn", { date: formatDate(gc.issuedAt) })} ·{" "}
                      {/* One nullable column instead of the fixture's
                          `neverExpires` boolean beside an `expiryDate` that
                          could disagree with it. */}
                      {gc.expiresAt
                        ? fill("expiresOn", { date: formatDate(gc.expiresAt) })
                        : t("neverExpires")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {formatMoney(gc.balance, locale)}
                  </p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {gc.kind === "physical"
                      ? t("cardPhysical")
                      : t("cardOnline")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mt-1 w-full text-xs"
          >
            <Link href="/customer/gift-cards/redeem">
              {t("redeemAnotherCard")}
            </Link>
          </Button>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="mb-3 font-semibold">{t("transactionHistory")}</h3>
        {entries.length === 0 ? (
          <div className="rounded-xl border py-8 text-center">
            <Wallet className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
            <p className="text-muted-foreground text-sm">
              {t("noTransactionsYet")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Already newest-first from the database; sorting again here would
                be a second opinion about the same fact. */}
            {entries.map((tx) => {
              const cfg = REASON_CONFIG[tx.reason] ?? {
                icon: Wallet,
                color: "text-muted-foreground",
                bg: "bg-muted",
                labelKey: "",
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
                    <p className="truncate text-sm font-medium">
                      {cfg.labelKey ? t(cfg.labelKey) : tx.reason}
                    </p>
                    {/* The fixture carried a free-text `description` here. The
                        ledger's equivalent is `note`, which the projection
                        withholds on purpose: staff write it about a customer,
                        to other staff. Where the person holds credit at more
                        than one business, the facility is the useful line. */}
                    {showFacility && (
                      <p className="text-muted-foreground truncate text-xs">
                        {facilityNames.get(tx.facilityId) ?? ""}
                      </p>
                    )}
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
                      {isCredit ? "+" : ""}
                      {formatMoney(Math.abs(tx.amount), locale)}
                    </p>
                    {/* No running balance. The fixture stored `balanceAfter` on
                        every row; the ledger does not, and this list is the
                        most recent 200 — so a total computed here would be the
                        sum of a WINDOW presented as the balance after that
                        movement. A number that is wrong for the oldest rows on
                        screen is worse than no number. */}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Usage note */}
      <Card className="border-dashed">
        <CardHeader className="pt-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="text-primary size-4" />
            {t("whereCanIUse")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {USES.map((use) => {
              const Icon = use.icon;
              const label = use.service
                ? serviceTypeLabel(locale, use.service)
                : t(use.key ?? "");
              return (
                <div
                  key={label}
                  className="text-muted-foreground flex items-center gap-1.5"
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            {t("payWithWalletAtCheckout")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
