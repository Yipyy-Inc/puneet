"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Search, MoreHorizontal, Eye, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyGiftCards, type MyGiftCard } from "@/lib/api/customer-gift-cards";
import {
  EmptyState,
  STATUS_META,
  Thumb,
  fmtDate,
} from "./gift-card-list-shared";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";

type SortKey = "newest" | "oldest" | "highest" | "lowest";

// A sort's name, by CATALOGUE KEY.
const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "oldest", labelKey: "sortOldest" },
  { value: "highest", labelKey: "sortHighest" },
  { value: "lowest", labelKey: "sortLowest" },
];

// A movement's kind, by CATALOGUE KEY. These are the LEDGER's own words
// (`gift_card_transactions.kind`), not the fixture's: `issued` is the opening
// entry a card is created with, and `adjusted` is a correction — which the
// fixture had no name for at all, so it fell through to "Other".
const TXN_TYPE_KEY: Record<string, string> = {
  issued: "txnPurchase",
  redeemed: "txnRedemption",
  refunded: "txnRefund",
};

interface SentGiftCardsListProps {
  onSendFirst?: () => void;
}

export function SentGiftCardsList({ onSendFirst }: SentGiftCardsListProps) {
  const { t, fill, locale } = useCustomerText("giftCards");
  // The cards this person actually bought, from `gift_cards`. This filtered the
  // fixture by a facility and a client handed down from the page — 11 and 15 —
  // so it listed Alice Johnson's cards to whoever was signed in.
  const { cards: sent, isPending } = useMyGiftCards();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [detailCard, setDetailCard] = useState<MyGiftCard | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sent.filter(
          (gc) =>
            (gc.recipientName ?? "").toLowerCase().includes(q) ||
            (gc.recipientEmail ?? "").toLowerCase().includes(q),
        )
      : sent;
    const byDate = (gc: MyGiftCard) => new Date(gc.issuedAt).getTime();
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return byDate(a) - byDate(b);
        case "highest":
          return b.initialAmount - a.initialAmount;
        case "lowest":
          return a.initialAmount - b.initialAmount;
        default:
          return byDate(b) - byDate(a);
      }
    });
  }, [sent, query, sort]);

  const toggleChecked = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleResend = (gc: MyGiftCard) => {
    setResentIds((prev) => new Set(prev).add(gc.id));
    toast.success(
      fill("giftCardResentTo", {
        email: gc.recipientEmail ?? t("recipientLower"),
      }),
    );
  };

  // Waiting is not the same as none, and this screen now WAITS — the fixture
  // answered instantly, so "You haven't sent any gift cards yet" beside a
  // Send-your-first button was safe to render immediately. Over a request, that
  // is a claim about somebody's cards made before they have been read (§5s).
  if (isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  // True empty (nothing ever sent) → CTA to Tab 1.
  if (sent.length === 0) {
    return (
      <EmptyState
        pose="medal"
        text="You haven't sent any gift cards yet."
        action={
          onSendFirst && (
            <Button onClick={onSendFirst} className="gap-1.5">
              <Send className="size-4" />
              {t("sendYourFirstGiftCard")}
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + sort */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchByRecipientName")}
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {fill("noCardsMatch", { query })}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((gc) => {
            const checked = checkedIds.has(gc.id);
            const isPhysical = gc.kind === "physical";
            return (
              <div key={gc.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <Thumb id={gc.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {fill("toRecipient", {
                        name:
                          gc.recipientName ??
                          gc.recipientEmail ??
                          t("recipient"),
                      })}
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      {fill("sentOn", {
                        date: fmtDate(locale, gc.issuedAt),
                      })}
                      <Badge
                        className={cn(
                          "text-[10px]",
                          STATUS_META[gc.effectiveStatus].className,
                        )}
                      >
                        {t(STATUS_META[gc.effectiveStatus].labelKey)}
                      </Badge>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatMoney(gc.initialAmount, locale)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {fill("amountLeft", {
                        amount: formatMoney(gc.balance, locale),
                      })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={t("cardActions")}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isPhysical ? (
                        // Physical cards can't be emailed — greyed with a tooltip
                        // (kept hoverable so the tooltip actually shows).
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="opacity-50"
                            >
                              <Send className="size-4" />
                              {t("resendEmail")}
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56 text-xs">
                            {t("physicalCardsCannotBeResent")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <DropdownMenuItem
                          disabled={resentIds.has(gc.id)}
                          onSelect={() => handleResend(gc)}
                        >
                          <Send className="size-4" />
                          {resentIds.has(gc.id)
                            ? t("emailResent")
                            : t("resendEmail")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setDetailCard(gc)}>
                        <Eye className="size-4" />
                        {t("viewDetails")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleChecked(gc.id);
                        }}
                      >
                        <DollarSign className="size-4" />
                        {checked ? t("hideBalance") : t("checkBalance")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {checked && (
                  <p className="text-muted-foreground mt-2 pl-15 text-xs">
                    {t("currentBalanceLabel")}{" "}
                    <span className="text-foreground font-medium">
                      {formatMoney(gc.balance, locale)}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View details — transaction history */}
      <Dialog
        open={detailCard !== null}
        onOpenChange={(v) => !v && setDetailCard(null)}
      >
        <DialogContent className="max-w-md">
          {detailCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Thumb id={detailCard.id} />
                  <span>
                    {fill("cardTo", {
                      name:
                        detailCard.recipientName ??
                        detailCard.recipientEmail ??
                        t("recipient"),
                    })}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label={t("code")} value={detailCard.code} mono />
                <Detail
                  label={t("status")}
                  value={t(STATUS_META[detailCard.effectiveStatus].labelKey)}
                />
                <Detail
                  label={t("originalAmount")}
                  value={`${formatMoney(detailCard.initialAmount, locale)}`}
                />
                <Detail
                  label={t("remaining")}
                  value={`${formatMoney(detailCard.balance, locale)}`}
                />
                <Detail
                  label={t("sent")}
                  value={fmtDate(locale, detailCard.issuedAt)}
                />
                <Detail
                  label={t("expires")}
                  // A card with no `expires_at` never expires — one nullable
                  // column instead of the fixture's `neverExpires` boolean
                  // beside an `expiryDate`, which could disagree with itself.
                  // "Never" was the one English word left in this dialog.
                  value={
                    detailCard.expiresAt
                      ? fmtDate(locale, detailCard.expiresAt)
                      : t("noExpiry")
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("transactionHistory")}</p>
                {detailCard.transactions.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t("noTransactionsYet")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {detailCard.transactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium">
                            {t(TXN_TYPE_KEY[txn.kind] ?? "txnOther")}
                          </p>
                          <p className="text-muted-foreground">
                            {fmtDate(locale, txn.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-semibold",
                              txn.kind === "redeemed"
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {txn.kind === "redeemed" ? "−" : "+"}
                            {formatMoney(Math.abs(txn.amount), locale)}
                          </p>
                          <p className="text-muted-foreground">
                            {fill("balanceAfter", {
                              amount: formatMoney(txn.balanceAfter, locale),
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("font-medium", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}
