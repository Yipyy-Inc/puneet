"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Gift,
  Search,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  User,
  Check,
  X,
  Camera,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  giftCards,
  customerWallets,
  physicalCardBatches,
} from "@/data/gift-cards";
import { clients } from "@/data/clients";
import { useLocationContext } from "@/hooks/use-location-context";
import { canRedeemGiftCard } from "@/lib/hq/redemption";
import { deriveLocationId } from "@/data/locations";
import type { GiftCard } from "@/types/payments";

const CameraScanner = dynamic(
  () =>
    import("@/components/retail/CameraScanner").then((m) => m.CameraScanner),
  { ssr: false },
);

export interface RedeemToWalletResult {
  cardCode: string;
  cardId: string;
  amount: number;
  clientId: number;
  walletId: string | null;
}

interface RedeemGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  onSuccess?: (result: RedeemToWalletResult) => void;
  /** Cards to look up — pass the page's session-overridden list so a drained
   *  card reflects its current balance. Defaults to the raw mock data. */
  cards?: GiftCard[];
}

type LookupState = "idle" | "searching" | "found" | "not_found" | "invalid";

const STEP_LABELS = ["Find Customer", "Scan Card", "Confirm"] as const;

export function RedeemGiftCardModal({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
  cards = giftCards,
}: RedeemGiftCardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Step 1 — destination customer
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  // Step 2 — gift card lookup
  const [cardCode, setCardCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [foundCard, setFoundCard] = useState<GiftCard | null>(null);
  const [foundExpired, setFoundExpired] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Step 3 — load
  const [loadMode, setLoadMode] = useState<"full" | "partial">("full");
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { currentLocation, settings, locations, isMultiLocation } =
    useLocationContext();

  const facilityClients = clients.filter((c) => c.id >= 15);
  const selectedClient = facilityClients.find((c) => c.id === selectedClientId);
  const selectedWallet = customerWallets.find(
    (w) => w.clientId === selectedClientId && w.facilityId === facilityId,
  );
  const walletBalance = selectedWallet?.balance ?? 0;

  const customerMatches = (() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return facilityClients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  })();

  // Derive the gift card's origin location (until the data model carries it)
  const giftCardOrigin = foundCard ? deriveLocationId(foundCard.id) : null;
  const giftCardOriginLocation = giftCardOrigin
    ? locations.find((l) => l.id === giftCardOrigin)
    : null;
  const crossLocationCheck =
    foundCard && currentLocation && giftCardOrigin
      ? canRedeemGiftCard({
          redemptionLocationId: currentLocation.id,
          originLocationId: giftCardOrigin,
          settings,
        })
      : { allowed: true, reason: null };

  const handleSearch = async () => {
    if (!cardCode.trim()) return;
    setLookupState("searching");
    await new Promise((r) => setTimeout(r, 800));
    const q = cardCode.trim().toLowerCase();

    // Match a digital code / POS card number, else resolve a printed physical
    // card number or barcode to its activated gift card.
    let card =
      cards.find(
        (gc) =>
          gc.facilityId === facilityId &&
          (gc.code.toLowerCase() === q || gc.cardNumber?.toLowerCase() === q),
      ) ?? null;
    if (!card) {
      const physical = physicalCardBatches
        .filter((b) => b.facilityId === facilityId)
        .flatMap((b) => b.cards)
        .find(
          (c) =>
            c.cardNumber.toLowerCase() === q || c.barcode.toLowerCase() === q,
        );
      if (physical?.giftCardId) {
        card = cards.find((gc) => gc.id === physical.giftCardId) ?? null;
      }
    }

    if (!card) {
      setLookupState("not_found");
      setFoundCard(null);
      setFoundExpired(false);
      return;
    }
    // Block on a non-active status OR a passed expiry date (status may be stale).
    const expiredByDate =
      !card.neverExpires &&
      !!card.expiryDate &&
      new Date(`${card.expiryDate}T23:59:59`).getTime() < Date.now();
    if (card.status !== "active" || expiredByDate) {
      setFoundCard(card);
      setFoundExpired(expiredByDate);
      setLookupState("invalid");
      return;
    }
    setFoundCard(card);
    setFoundExpired(false);
    setRedeemAmount(card.currentBalance);
    setLoadMode("full");
    setLookupState("found");
  };

  const requiresPin = (foundCard?.currentBalance ?? 0) >= 200;
  const cardValid = lookupState === "found" && crossLocationCheck.allowed;
  const canRedeem =
    selectedClientId != null &&
    cardValid &&
    redeemAmount > 0 &&
    redeemAmount <= (foundCard?.currentBalance ?? 0) &&
    (!requiresPin || pin.length === 4);

  const handleRedeem = async () => {
    if (!foundCard || selectedClientId == null) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    onSuccess?.({
      cardCode: foundCard.code,
      cardId: foundCard.id,
      amount: redeemAmount,
      clientId: selectedClientId,
      walletId: selectedWallet?.id ?? null,
    });
    setLoading(false);
    setDone(true);
  };

  const handleClose = () => {
    if (loading) return;
    setStep(1);
    setCustomerQuery("");
    setShowCustomerResults(false);
    setSelectedClientId(null);
    setCardCode("");
    setLookupState("idle");
    setFoundCard(null);
    setFoundExpired(false);
    setCameraOpen(false);
    setLoadMode("full");
    setRedeemAmount(0);
    setPin("");
    setDone(false);
    onOpenChange(false);
  };

  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Loaded to wallet!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                <span className="font-medium text-green-600">
                  ${redeemAmount.toFixed(2)}
                </span>{" "}
                added to {selectedClient?.name ?? "the customer"}&apos;s wallet.
                New balance:{" "}
                <span className="text-foreground font-medium">
                  ${(walletBalance + redeemAmount).toFixed(2)}
                </span>
                .
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Shared customer search/autocomplete control.
  const customerSearchControl = selectedClient ? (
    <div className="border-primary/40 bg-primary/5 flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2">
        <Check className="text-primary size-4 shrink-0" />
        <span>
          <span className="font-medium">{selectedClient.name}</span>
          <span className="text-muted-foreground">
            {" "}
            · Wallet balance:{" "}
            <span className="text-foreground font-medium">
              ${walletBalance.toFixed(2)}
            </span>
          </span>
          <span className="text-muted-foreground block text-xs">
            {selectedClient.email}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => setSelectedClientId(null)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
        <span className="sr-only">Clear selected customer</span>
      </button>
    </div>
  ) : (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        className="pl-9"
        value={customerQuery}
        onChange={(e) => {
          setCustomerQuery(e.target.value);
          setShowCustomerResults(true);
        }}
        onFocus={() => setShowCustomerResults(true)}
        placeholder="Search by name, email, or phone…"
        autoFocus
      />
      {showCustomerResults && customerQuery.trim() && (
        <div className="bg-popover absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border shadow-md">
          {customerMatches.length > 0 ? (
            customerMatches.map((c) => {
              const wallet = customerWallets.find(
                (w) => w.clientId === c.id && w.facilityId === facilityId,
              );
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setCustomerQuery("");
                    setShowCustomerResults(false);
                  }}
                  className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {c.email}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Wallet ${(wallet?.balance ?? 0).toFixed(2)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              No matching customers.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Redeem Gift Card to Wallet
            </DialogTitle>
            <DialogDescription>
              Choose the customer, scan the gift card, then load its balance
              into their wallet.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    step === i + 1
                      ? "bg-primary text-primary-foreground"
                      : step > i + 1
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span
                  className={cn(
                    step === i + 1 ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            ))}
          </div>

          <div className="min-h-[280px]">
            {/* Step 1 — Find Customer */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-center text-base font-medium">
                  Who should receive this gift card balance?
                </p>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <User className="size-4" />
                    Customer
                  </Label>
                  {customerSearchControl}
                  <p className="text-muted-foreground text-xs">
                    Search the facility&apos;s customers by name, email, or
                    phone.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2 — Scan Card */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-center text-base font-medium">
                  Scan or enter the gift card code.
                </p>
                <div className="space-y-1.5">
                  <Label>Card Number or Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      value={cardCode}
                      onChange={(e) => {
                        setCardCode(e.target.value.toUpperCase());
                        setLookupState("idle");
                        setFoundCard(null);
                        setFoundExpired(false);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Scan or type the card number"
                      className="font-mono"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => setCameraOpen(true)}
                    >
                      <Camera className="size-4" />
                      Scan
                    </Button>
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

                {lookupState === "not_found" && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="size-4 shrink-0" />
                    No gift card found with that code. Please check and try
                    again.
                  </div>
                )}

                {lookupState === "invalid" && foundCard && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="size-4 shrink-0" />
                    This card is{" "}
                    <span className="font-semibold capitalize">
                      {foundExpired ? "expired" : foundCard.status}
                    </span>{" "}
                    and can&apos;t be loaded to a wallet.
                  </div>
                )}

                {lookupState === "found" && foundCard && (
                  <>
                    {isMultiLocation &&
                      giftCardOriginLocation &&
                      currentLocation &&
                      giftCardOriginLocation.id !== currentLocation.id && (
                        <div
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs",
                            crossLocationCheck.allowed
                              ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-900/20 dark:text-sky-300"
                              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-300",
                          )}
                        >
                          <AlertCircle className="mt-0.5 size-4 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold">
                              {crossLocationCheck.allowed
                                ? `Cross-location redemption — purchased at ${giftCardOriginLocation.name}`
                                : `Blocked — purchased at ${giftCardOriginLocation.name}`}
                            </p>
                            {crossLocationCheck.reason && (
                              <p className="mt-0.5">
                                {crossLocationCheck.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    <div className="rounded-xl border bg-linear-to-r from-violet-50 to-purple-50 p-4 dark:from-violet-950/30 dark:to-purple-950/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Gift className="text-primary size-4" />
                            <span className="font-mono text-sm font-semibold">
                              •••• {foundCard.code.slice(-4)}
                            </span>
                            <Badge
                              variant="default"
                              className="bg-green-500 text-xs"
                            >
                              Active
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${foundCard.currentBalance.toFixed(2)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            available
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Type:</span>{" "}
                          <span className="font-medium">
                            {foundCard.type === "physical"
                              ? "Physical"
                              : "Digital"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expiry:</span>{" "}
                          <span className="font-medium">
                            {foundCard.neverExpires
                              ? "No expiry"
                              : foundCard.expiryDate
                                ? new Date(
                                    foundCard.expiryDate,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3 — Confirm Load */}
            {step === 3 && foundCard && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  How much do you want to load?
                </Label>

                <RadioGroup
                  value={loadMode}
                  onValueChange={(v) => {
                    const m = v as "full" | "partial";
                    setLoadMode(m);
                    if (m === "full") setRedeemAmount(foundCard.currentBalance);
                  }}
                >
                  <label
                    htmlFor="load-full"
                    data-active={loadMode === "full"}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem value="full" id="load-full" />
                    <span className="text-sm font-medium">
                      Full balance — load ${foundCard.currentBalance.toFixed(2)}
                    </span>
                  </label>

                  <label
                    htmlFor="load-partial"
                    data-active={loadMode === "partial"}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem
                      value="partial"
                      id="load-partial"
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-2">
                      <span className="text-sm font-medium">
                        Partial amount
                      </span>
                      {loadMode === "partial" && (
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={foundCard.currentBalance}
                            step={1}
                            className="pl-7"
                            value={redeemAmount || ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setRedeemAmount(
                                Math.min(v, foundCard.currentBalance),
                              );
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </RadioGroup>

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
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="••••"
                      className="font-mono tracking-widest"
                    />
                  </div>
                )}

                {/* Before / after summary */}
                <div className="bg-muted/50 space-y-2 rounded-xl p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Gift className="size-3.5" />
                      Card balance
                    </span>
                    <span className="font-medium">
                      ${foundCard.currentBalance.toFixed(2)}
                      <ArrowRight className="mx-1 inline size-3.5" />$
                      {(foundCard.currentBalance - redeemAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="size-3.5" />
                      {selectedClient?.name}&apos;s wallet
                    </span>
                    <span className="font-medium">
                      ${walletBalance.toFixed(2)}
                      <ArrowRight className="mx-1 inline size-3.5" />
                      <span className="font-bold text-green-600">
                        ${(walletBalance + redeemAmount).toFixed(2)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {step > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 ? selectedClientId == null : !cardValid}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleRedeem}
                  disabled={!canRedeem || loading}
                  className="min-w-28"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 size-4" />
                      Load to Wallet
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="flex flex-col gap-0 p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none sm:max-w-sm">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="size-5" />
              Scan Gift Card
            </DialogTitle>
            <DialogDescription>
              Point your camera at the card&apos;s barcode or QR code
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-5 pb-5">
            {cameraOpen && (
              <CameraScanner
                onScan={(code) => {
                  setCardCode(code.toUpperCase());
                  setLookupState("idle");
                  setFoundCard(null);
                  setFoundExpired(false);
                  setCameraOpen(false);
                }}
              />
            )}
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setCameraOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
