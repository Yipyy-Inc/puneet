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
import {
  Search,
  CircleDollarSign,
  AlertCircle,
  Loader2,
  Smartphone,
  QrCode,
  Camera,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards, physicalCardBatches } from "@/data/gift-cards";
import { clients } from "@/data/clients";
import type { GiftCard } from "@/types/payments";

const CameraScanner = dynamic(
  () =>
    import("@/components/retail/CameraScanner").then((m) => m.CameraScanner),
  { ssr: false },
);

interface CheckBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
}

type LookupState =
  | "idle"
  | "searching"
  | "found"
  | "not_found"
  | "inactive_blank";

const STATUS_META: Record<
  GiftCard["status"],
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-green-500 text-white" },
  redeemed: { label: "Fully Redeemed", className: "bg-blue-500 text-white" },
  expired: { label: "Expired", className: "bg-red-500 text-white" },
  cancelled: { label: "Voided", className: "bg-gray-500 text-white" },
};

const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export function CheckBalanceModal({
  open,
  onOpenChange,
  facilityId,
}: CheckBalanceModalProps) {
  const [cardCode, setCardCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [foundCard, setFoundCard] = useState<GiftCard | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleSearch = async () => {
    if (!cardCode.trim()) return;
    setLookupState("searching");
    await new Promise((r) => setTimeout(r, 600));
    const q = cardCode.trim().toLowerCase();

    // 1. Direct gift-card match by code or POS card number.
    let card =
      giftCards.find(
        (gc) =>
          gc.facilityId === facilityId &&
          (gc.code.toLowerCase() === q || gc.cardNumber?.toLowerCase() === q),
      ) ?? null;

    // 2. Otherwise match a printed physical card number / barcode in inventory,
    //    then resolve the linked gift card if the card has been activated.
    if (!card) {
      const physical = physicalCardBatches
        .filter((b) => b.facilityId === facilityId)
        .flatMap((b) => b.cards)
        .find(
          (c) =>
            c.cardNumber.toLowerCase() === q || c.barcode.toLowerCase() === q,
        );
      if (physical?.giftCardId) {
        card = giftCards.find((gc) => gc.id === physical.giftCardId) ?? null;
      } else if (physical) {
        // Blank stock that hasn't been sold/activated — no balance to show.
        setFoundCard(null);
        setLookupState("inactive_blank");
        return;
      }
    }

    if (!card) {
      setFoundCard(null);
      setLookupState("not_found");
      return;
    }
    setFoundCard(card);
    setLookupState("found");
  };

  const resetLookup = () => {
    setLookupState("idle");
    setFoundCard(null);
  };

  const handleClose = () => {
    setCardCode("");
    setCameraOpen(false);
    resetLookup();
    onOpenChange(false);
  };

  const owner = foundCard?.purchasedByClientId
    ? clients.find((c) => c.id === foundCard.purchasedByClientId)
    : null;
  const isActive = foundCard?.status === "active";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="size-5" />
              Check Gift Card Balance
            </DialogTitle>
            <DialogDescription>
              Look up any card&apos;s current balance and status — this is
              read-only and makes no changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Card lookup */}
            <div className="space-y-1.5">
              <Label>Card Number or Barcode</Label>
              <div className="flex gap-2">
                <Input
                  value={cardCode}
                  onChange={(e) => {
                    setCardCode(e.target.value.toUpperCase());
                    resetLookup();
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

            {/* Not found */}
            {lookupState === "not_found" && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="size-4 shrink-0" />
                No gift card found with that code. Please check and try again.
              </div>
            )}

            {/* Found a blank physical card that hasn't been activated */}
            {lookupState === "inactive_blank" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0" />
                This card is in inventory but hasn&apos;t been activated yet —
                no balance has been loaded.
              </div>
            )}

            {/* Result */}
            {lookupState === "found" && foundCard && (
              <div className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {foundCard.type === "online" ? (
                        <Smartphone className="text-muted-foreground size-4 shrink-0" />
                      ) : (
                        <QrCode className="text-muted-foreground size-4 shrink-0" />
                      )}
                      <span className="truncate font-mono text-sm font-semibold">
                        {foundCard.code}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "mt-1.5 text-xs",
                        STATUS_META[foundCard.status].className,
                      )}
                    >
                      {STATUS_META[foundCard.status].label}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        isActive && foundCard.currentBalance > 0
                          ? "text-green-600"
                          : "text-muted-foreground",
                      )}
                    >
                      ${foundCard.currentBalance.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      current balance
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">
                      Initial value:
                    </span>{" "}
                    <span className="font-medium">
                      ${foundCard.initialAmount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="font-medium">
                      {foundCard.type === "online" ? "Digital" : "Physical"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires:</span>{" "}
                    <span className="font-medium">
                      {foundCard.neverExpires
                        ? "Never"
                        : fmtDate(foundCard.expiryDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last used:</span>{" "}
                    <span className="font-medium">
                      {fmtDate(foundCard.lastUsedAt)}
                    </span>
                  </div>
                  {(foundCard.recipientName || owner) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Holder:</span>{" "}
                      <span className="font-medium">
                        {foundCard.recipientName ?? owner?.name}
                      </span>
                    </div>
                  )}
                </div>

                {!isActive && (
                  <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                    <AlertCircle className="size-3.5 shrink-0" />
                    {foundCard.status === "redeemed"
                      ? "This card has been fully redeemed."
                      : foundCard.status === "expired"
                        ? "This card has expired and can no longer be redeemed."
                        : "This card has been voided."}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="flex flex-col gap-0 p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-0 max-sm:rounded-none sm:max-w-sm">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="size-5" />
              Scan Card
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
                  resetLookup();
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
