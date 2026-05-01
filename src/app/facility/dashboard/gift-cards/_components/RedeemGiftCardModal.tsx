"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Search,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards } from "@/data/gift-cards";
import { clients } from "@/data/clients";

interface RedeemGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  onSuccess?: (cardCode: string, amount: number) => void;
}

type LookupState = "idle" | "searching" | "found" | "not_found" | "invalid";

export function RedeemGiftCardModal({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: RedeemGiftCardModalProps) {
  const [cardCode, setCardCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [foundCard, setFoundCard] = useState<(typeof giftCards)[0] | null>(null);
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSearch = async () => {
    if (!cardCode.trim()) return;
    setLookupState("searching");
    await new Promise((r) => setTimeout(r, 800));
    const card = giftCards.find(
      (gc) =>
        gc.facilityId === facilityId &&
        gc.code.toLowerCase() === cardCode.trim().toLowerCase(),
    );
    if (!card) {
      setLookupState("not_found");
      setFoundCard(null);
      return;
    }
    if (card.status !== "active") {
      setLookupState("invalid");
      setFoundCard(card);
      return;
    }
    setFoundCard(card);
    setRedeemAmount(card.currentBalance);
    setLookupState("found");
  };

  const requiresPin = (foundCard?.currentBalance ?? 0) >= 200;
  const canRedeem =
    lookupState === "found" &&
    redeemAmount > 0 &&
    redeemAmount <= (foundCard?.currentBalance ?? 0) &&
    (!requiresPin || pin.length === 4);

  const handleRedeem = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onSuccess?.(cardCode, redeemAmount);
      handleClose();
    }, 1800);
  };

  const handleClose = () => {
    if (loading) return;
    setCardCode("");
    setLookupState("idle");
    setFoundCard(null);
    setRedeemAmount(0);
    setPin("");
    setDone(false);
    onOpenChange(false);
  };

  const recipientClient = foundCard?.purchasedByClientId
    ? clients.find((c) => c.id === foundCard.purchasedByClientId)
    : null;

  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Redeemed successfully!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                <span className="text-green-600 font-medium">${redeemAmount.toFixed(2)}</span>{" "}
                has been added to the customer&apos;s wallet.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Redeem Gift Card to Wallet
          </DialogTitle>
          <DialogDescription>
            Enter the card number or scan the barcode to load balance into the
            customer&apos;s wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Card lookup */}
          <div className="space-y-1.5">
            <Label>Card Number or Barcode</Label>
            <div className="flex gap-2">
              <Input
                value={cardCode}
                onChange={(e) => {
                  setCardCode(e.target.value.toUpperCase());
                  setLookupState("idle");
                  setFoundCard(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="GIFT-PAWS-2024-001"
                className="font-mono"
              />
              <Button
                onClick={handleSearch}
                disabled={lookupState === "searching" || !cardCode.trim()}
                className="shrink-0"
              >
                {lookupState === "searching" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Not found */}
          {lookupState === "not_found" && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="size-4 shrink-0" />
              No gift card found with that code. Please check and try again.
            </div>
          )}

          {/* Invalid status */}
          {lookupState === "invalid" && foundCard && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertCircle className="size-4 shrink-0" />
              This card cannot be redeemed — status:{" "}
              <span className="font-semibold capitalize">{foundCard.status}</span>
            </div>
          )}

          {/* Card found */}
          {lookupState === "found" && foundCard && (
            <div className="space-y-4">
              {/* Card details */}
              <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:from-violet-950/30 dark:to-purple-950/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gift className="text-primary size-4" />
                      <span className="font-mono text-sm font-semibold">
                        {foundCard.code}
                      </span>
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Active
                      </Badge>
                    </div>
                    {(foundCard.recipientName || recipientClient) && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {foundCard.recipientName
                          ? `For ${foundCard.recipientName}`
                          : `Client: ${recipientClient?.name}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${foundCard.currentBalance.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">available</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Initial:</span>{" "}
                    <span className="font-medium">${foundCard.initialAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="capitalize font-medium">{foundCard.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires:</span>{" "}
                    <span className="font-medium">
                      {foundCard.neverExpires
                        ? "Never"
                        : foundCard.expiryDate
                          ? new Date(foundCard.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transactions:</span>{" "}
                    <span className="font-medium">{foundCard.transactionHistory.length}</span>
                  </div>
                </div>
              </div>

              {/* Amount selector */}
              <div className="space-y-3">
                <Label>Amount to Redeem into Wallet</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">$0</span>
                    <span
                      className={cn(
                        "font-bold text-lg",
                        redeemAmount === foundCard.currentBalance
                          ? "text-green-600"
                          : "text-primary",
                      )}
                    >
                      ${redeemAmount.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      ${foundCard.currentBalance.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={foundCard.currentBalance}
                    step={1}
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(parseFloat(e.target.value))}
                    className="accent-primary w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setRedeemAmount(Math.floor(foundCard.currentBalance / 2))
                    }
                  >
                    Half
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setRedeemAmount(foundCard.currentBalance)}
                  >
                    Full Balance
                  </Button>
                </div>
              </div>

              {/* PIN requirement */}
              {requiresPin && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    🔐 PIN Required
                    <span className="text-muted-foreground text-xs font-normal">
                      (cards ≥ $200 require a 4-digit PIN)
                    </span>
                  </Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="font-mono tracking-widest"
                  />
                </div>
              )}

              {/* Preview */}
              {redeemAmount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <Gift className="text-muted-foreground size-4 shrink-0" />
                  <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  <Wallet className="text-primary size-4 shrink-0" />
                  <span className="flex-1">
                    <span className="font-semibold text-green-600">
                      ${redeemAmount.toFixed(2)}
                    </span>{" "}
                    will be added to customer wallet
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRedeem}
            disabled={!canRedeem || loading}
            className="min-w-28"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redeeming…
              </>
            ) : (
              <>
                <Wallet className="mr-2 size-4" />
                Redeem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
