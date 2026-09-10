"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { giftCards, customerWallets } from "@/data/gift-cards";
import { clients } from "@/data/clients";
import type { GiftCard } from "@/types/payments";
import { EmptyState, Thumb, fmtDate } from "./gift-card-list-shared";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

const WALLET_EXPLAINER =
  "Loading to your wallet lets you pay for services at checkout automatically — no need to enter a code.";

interface ReceivedGiftCardsListProps {
  facilityId: number;
  customerId: number;
}

export function ReceivedGiftCardsList({
  facilityId,
  customerId,
}: ReceivedGiftCardsListProps) {
  const { t, fill, locale } = useCustomerText("giftCards");
  const customer = clients.find((c) => c.id === customerId);
  const customerEmail = customer?.email.toLowerCase() ?? "";

  const received = giftCards.filter(
    (gc) =>
      gc.facilityId === facilityId &&
      gc.recipientEmail?.toLowerCase() === customerEmail,
  );

  const initialWallet =
    customerWallets.find((w) => w.clientId === customerId)?.balance ?? 0;

  // Local mock state — loading a card moves value into the wallet and
  // decrements that card's remaining balance.
  const [walletBalance, setWalletBalance] = useState(initialWallet);
  const [cardBalances, setCardBalances] = useState<Record<string, number>>({});
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const balanceOf = (gc: GiftCard) => cardBalances[gc.id] ?? gc.currentBalance;

  // Load-to-wallet modal state.
  const [loadCard, setLoadCard] = useState<GiftCard | null>(null);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [loadedAmount, setLoadedAmount] = useState(0);

  const openLoad = (gc: GiftCard) => {
    setLoadCard(gc);
    setMode("full");
    setPartialAmount("");
    setDone(false);
    setLoadedAmount(0);
  };
  const closeLoad = () => {
    if (loading) return;
    setLoadCard(null);
    setDone(false);
  };

  const cardBal = loadCard ? balanceOf(loadCard) : 0;
  const partialNum = parseFloat(partialAmount) || 0;
  const amountToLoad = mode === "full" ? cardBal : partialNum;
  const partialValid =
    mode === "full" || (partialNum > 0 && partialNum <= cardBal);
  const canConfirm = partialValid && amountToLoad > 0 && !loading;

  const handleConfirm = async () => {
    if (!loadCard || !canConfirm) return;
    const amount = amountToLoad;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setWalletBalance((b) => b + amount);
    setCardBalances((prev) => ({ ...prev, [loadCard.id]: cardBal - amount }));
    setLoadedAmount(amount);
    setLoading(false);
    setDone(true);
    toast.success(
      fill("loadedToWallet", { amount: formatMoney(amount, locale) }),
    );
  };

  const toggleChecked = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {received.length === 0 ? (
        <EmptyState
          pose="medal"
          text="No gift cards received yet"
          note="Share the Gift Cards page with friends and family so they can send you one."
        />
      ) : (
        <div className="space-y-2">
          {received.map((gc) => {
            const bal = balanceOf(gc);
            const canLoad = gc.status === "active" && bal > 0;
            const checked = checkedIds.has(gc.id);
            return (
              <div key={gc.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <Thumb id={gc.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {fill("fromSender", {
                        name: gc.purchasedBy ?? t("someone"),
                      })}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {fill("receivedOn", {
                        date: fmtDate(locale, gc.createdAt ?? gc.purchaseDate),
                      })}{" "}
                      ·{" "}
                      {gc.neverExpires
                        ? t("noExpiry")
                        : fill("expiresOn", {
                            date: fmtDate(locale, gc.expiryDate),
                          })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {formatMoney(bal, locale)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      of {formatMoney(gc.initialAmount, locale)}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="shrink-0 gap-1.5"
                        disabled={!canLoad}
                        onClick={() => openLoad(gc)}
                      >
                        <Wallet className="size-3.5" />
                        {t("loadToMyWallet")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56 text-xs">
                      {WALLET_EXPLAINER}
                    </TooltipContent>
                  </Tooltip>
                </div>
                {/* Inline check balance */}
                <div className="mt-2 flex items-center gap-2 pl-15 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleChecked(gc.id)}
                    className="text-primary font-medium hover:underline"
                  >
                    {checked ? t("hideBalance") : t("checkBalance")}
                  </button>
                  {checked && (
                    <span className="text-muted-foreground">
                      {t("currentBalanceLabel")}{" "}
                      <span className="text-foreground font-medium">
                        {formatMoney(bal, locale)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load to wallet — full/partial confirmation modal */}
      <Dialog open={loadCard !== null} onOpenChange={(v) => !v && closeLoad()}>
        <DialogContent className="max-w-sm">
          {loadCard && !done && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="size-5" />
                  {t("loadToMyWallet")}
                </DialogTitle>
                <DialogDescription>
                  {t("chooseHowMuchOfThis")}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Thumb id={loadCard.id} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {fill("fromSender", {
                      name: loadCard.purchasedBy ?? t("someone"),
                    })}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {loadCard.code}
                  </p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatMoney(cardBal, locale)}
                </p>
              </div>

              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as "full" | "partial")}
                className="gap-2"
              >
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3">
                  <RadioGroupItem value="full" />
                  <span className="text-sm font-medium">
                    {fill("loadFullBalance", {
                      amount: formatMoney(cardBal, locale),
                    })}
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3">
                  <RadioGroupItem value="partial" className="mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <span className="text-sm font-medium">
                      {t("loadPartialAmount")}
                    </span>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={cardBal}
                        step="0.01"
                        className="pl-7"
                        value={partialAmount}
                        onFocus={() => setMode("partial")}
                        onChange={(e) => {
                          setMode("partial");
                          setPartialAmount(e.target.value);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    {mode === "partial" && partialNum > cardBal && (
                      <p className="text-destructive text-xs">
                        {fill("maxIs", {
                          amount: formatMoney(cardBal, locale),
                        })}
                      </p>
                    )}
                  </div>
                </label>
              </RadioGroup>

              {/* Before / after wallet preview */}
              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">{t("yourWallet")}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {formatMoney(walletBalance, locale)}
                  <ArrowRight className="text-muted-foreground size-3.5" />
                  <span className="text-green-600">
                    {formatMoney(
                      walletBalance + (canConfirm ? amountToLoad : 0),
                      locale,
                    )}
                  </span>
                </span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeLoad}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleConfirm} disabled={!canConfirm}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("loading")}
                    </>
                  ) : (
                    t("confirmLoad")
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
          {loadCard && done && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {t("addedToYourWallet")}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {rich(t("nowAvailableToSpend"), {
                    amount: (
                      <span className="font-medium text-green-600">
                        {formatMoney(loadedAmount, locale)}
                      </span>
                    ),
                    balance: (
                      <span className="text-foreground font-medium">
                        {formatMoney(walletBalance, locale)}
                      </span>
                    ),
                  })}
                </p>
              </div>
              <Button className="w-full" onClick={closeLoad}>
                {t("done")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
