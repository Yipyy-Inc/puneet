"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Gift,
  Search,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  QrCode,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards, customerWallets } from "@/data/gift-cards";
import Link from "next/link";

const MOCK_CLIENT_ID = 15;
const FACILITY_ID = 11;

type Step = "lookup" | "amount" | "pin" | "confirm" | "done";

export function RedeemFlow() {
  const [cardCode, setCardCode] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "searching" | "found" | "error">("idle");
  const [foundCard, setFoundCard] = useState<(typeof giftCards)[0] | null>(null);
  const [step, setStep] = useState<Step>("lookup");
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [newWalletBalance, setNewWalletBalance] = useState(0);

  const wallet = customerWallets.find(
    (w) => w.clientId === MOCK_CLIENT_ID && w.facilityId === FACILITY_ID,
  );

  const requiresPin = (foundCard?.currentBalance ?? 0) >= 200;

  const handleLookup = async () => {
    if (!cardCode.trim()) return;
    setLookupState("searching");
    setErrorMsg("");
    await new Promise((r) => setTimeout(r, 900));

    const card = giftCards.find(
      (gc) =>
        gc.facilityId === FACILITY_ID &&
        gc.code.toLowerCase() === cardCode.trim().toLowerCase(),
    );

    if (!card) {
      setLookupState("error");
      setErrorMsg("No gift card found with that code. Please check and try again.");
      return;
    }
    if (card.status !== "active") {
      setLookupState("error");
      setErrorMsg(
        `This gift card cannot be redeemed — it is ${card.status}.`,
      );
      return;
    }
    setFoundCard(card);
    setRedeemAmount(card.currentBalance);
    setLookupState("found");
    setStep("amount");
  };

  const handlePinVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    if (pin !== "1234") {
      setPinError("Incorrect PIN. Please try again.");
      return;
    }
    setPinError("");
    setStep("confirm");
  };

  const handleRedeem = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const currentBalance = wallet?.balance ?? 0;
    setNewWalletBalance(currentBalance + redeemAmount);
    setLoading(false);
    setStep("done");
  };

  return (
    <div className="space-y-5">
      {/* Current wallet balance */}
      {wallet && (
        <Card className="bg-gradient-to-r from-violet-600 to-purple-700 text-white border-none">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="size-5 opacity-80" />
                <div>
                  <p className="text-xs opacity-70">Current Wallet Balance</p>
                  <p className="text-2xl font-bold">${wallet.balance.toFixed(2)}</p>
                </div>
              </div>
              <Link href="/customer/wallet">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/20 text-xs"
                >
                  View Wallet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Lookup */}
      {step === "lookup" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium">
              <QrCode className="size-4" />
              Gift Card Code
            </Label>
            <div className="flex gap-2">
              <Input
                value={cardCode}
                onChange={(e) => {
                  setCardCode(e.target.value.toUpperCase());
                  setLookupState("idle");
                  setErrorMsg("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="GIFT-2024-XXXXXX"
                className="font-mono"
              />
              <Button
                onClick={handleLookup}
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
            <p className="text-muted-foreground text-xs">
              You can find the card code in your gift card email or on the
              physical card
            </p>
          </div>

          {lookupState === "error" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Step: Amount */}
      {step === "amount" && foundCard && (
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:from-violet-950/30 dark:to-purple-950/30 border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Gift className="text-primary size-4" />
                  <span className="font-mono text-sm font-semibold">
                    ****{foundCard.code.slice(-6)}
                  </span>
                  <Badge variant="default" className="bg-green-500 text-xs">
                    Active
                  </Badge>
                </div>
                {foundCard.message && (
                  <p className="text-muted-foreground mt-1 text-xs italic">
                    &quot;{foundCard.message}&quot;
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
          </div>

          <div className="space-y-3">
            <Label className="font-medium">How much would you like to add to your wallet?</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">$0</span>
                <span
                  className={cn(
                    "text-xl font-bold",
                    redeemAmount === foundCard.currentBalance
                      ? "text-green-600"
                      : "text-primary",
                  )}
                >
                  ${redeemAmount.toFixed(2)}
                </span>
                <span className="text-muted-foreground text-sm">
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
                  setRedeemAmount(
                    parseFloat((foundCard.currentBalance / 2).toFixed(2)),
                  )
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

          {redeemAmount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <Gift className="text-muted-foreground size-4 shrink-0" />
              <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
              <Wallet className="text-primary size-4 shrink-0" />
              <span className="flex-1">
                <span className="font-semibold text-green-600">
                  ${redeemAmount.toFixed(2)}
                </span>{" "}
                will be added to your wallet
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("lookup");
                setFoundCard(null);
                setLookupState("idle");
              }}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={redeemAmount === 0}
              onClick={() =>
                requiresPin ? setStep("pin") : setStep("confirm")
              }
            >
              {requiresPin ? (
                <>
                  <Lock className="mr-2 size-4" />
                  Continue to PIN
                </>
              ) : (
                "Review & Confirm"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: PIN */}
      {step === "pin" && foundCard && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="size-7 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold">PIN Required</p>
              <p className="text-muted-foreground text-sm">
                This card requires a PIN for redemptions. Enter the 4-digit PIN
                associated with this card.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>4-Digit PIN</Label>
            <Input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              placeholder="••••"
              className="text-center font-mono text-2xl tracking-[0.5em]"
              inputMode="numeric"
            />
            {pinError && (
              <p className="text-destructive text-sm">{pinError}</p>
            )}
            <p className="text-muted-foreground text-xs">
              Hint: use 1234 for this demo
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep("amount")}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={pin.length < 4 || loading}
              onClick={handlePinVerify}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify PIN"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && foundCard && (
        <div className="space-y-4">
          <h3 className="font-semibold">Confirm Redemption</h3>

          <Card>
            <CardContent className="space-y-3 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Card Code</span>
                <span className="font-mono font-medium">****{foundCard.code.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount to Redeem</span>
                <span className="font-semibold text-green-600">
                  ${redeemAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining on Card</span>
                <span className="font-medium">
                  ${(foundCard.currentBalance - redeemAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">New Wallet Balance</span>
                <span className="font-bold text-green-600">
                  ${((wallet?.balance ?? 0) + redeemAmount).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep(requiresPin ? "pin" : "amount")}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={loading}
              onClick={handleRedeem}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Redeeming…
                </>
              ) : (
                <>
                  <Wallet className="mr-2 size-4" />
                  Confirm & Add to Wallet
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="size-9 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold">Added to your wallet!</p>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="font-semibold text-green-600">
                ${redeemAmount.toFixed(2)}
              </span>{" "}
              is now in your wallet and ready to use at checkout.
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-8 py-4 text-white">
            <p className="text-xs opacity-70">New Wallet Balance</p>
            <p className="text-3xl font-bold">${newWalletBalance.toFixed(2)}</p>
          </div>
          <div className="flex w-full gap-2">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/customer/gift-cards/redeem">Redeem Another</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/customer/wallet">View Wallet</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
