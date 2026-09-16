"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Loader2, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards, physicalCardBatches } from "@/data/gift-cards";
import { FIXTURE_DATA_FACILITY_ID } from "@/data/facilities";
import type { GiftCard } from "@/types/payments";

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
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

type LookupState = "idle" | "searching" | "found" | "not_found";

interface PublicCheckBalanceProps {
  brandName: string;
  logoUrl?: string;
  primaryColor: string;
}

export function PublicCheckBalance({
  brandName,
  logoUrl,
  primaryColor,
}: PublicCheckBalanceProps) {
  const [cardCode, setCardCode] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [foundCard, setFoundCard] = useState<GiftCard | null>(null);

  const handleSearch = async () => {
    if (!cardCode.trim()) return;
    setLookupState("searching");
    await new Promise((r) => setTimeout(r, 700));
    const q = cardCode.trim().toLowerCase();

    // Fixture cards only — see the page's header. The facility is no longer a
    // number here (it is a uuid resolved from the slug), so a real facility's
    // cards are not in this array and the search answers "not found". That is
    // the designed answer, not a gap being papered over: a code belonging to
    // another facility and a code nobody has must look identical, or the page
    // becomes a way to hunt for live cards.
    let card =
      giftCards.find(
        (gc) =>
          gc.facilityId === FIXTURE_DATA_FACILITY_ID &&
          (gc.code.toLowerCase() === q || gc.cardNumber?.toLowerCase() === q),
      ) ?? null;

    // Resolve a printed physical card number/barcode to its activated gift card.
    if (!card) {
      const physical = physicalCardBatches
        .filter((b) => b.facilityId === FIXTURE_DATA_FACILITY_ID)
        .flatMap((b) => b.cards)
        .find(
          (c) =>
            c.cardNumber.toLowerCase() === q || c.barcode.toLowerCase() === q,
        );
      if (physical?.giftCardId) {
        card = giftCards.find((gc) => gc.id === physical.giftCardId) ?? null;
      }
    }

    setFoundCard(card);
    setLookupState(card ? "found" : "not_found");
  };

  const isActive = foundCard?.status === "active";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-4">
      {/* Facility branding */}
      <div className="flex flex-col items-center gap-2">
        {logoUrl ? (
          <div
            role="img"
            aria-label={brandName}
            className="h-12 w-44 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${logoUrl})` }}
          />
        ) : (
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
            {brandName}
          </p>
        )}
      </div>

      <div className="bg-background w-full rounded-2xl border p-6 shadow-sm">
        <div className="mb-4 text-center">
          <div
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Gift className="size-6" />
          </div>
          <h1 className="text-lg font-semibold">
            Check your gift card balance
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your code below to see what&apos;s left on your card.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public-card-code">Enter your gift card code</Label>
          <div className="flex gap-2">
            <Input
              id="public-card-code"
              value={cardCode}
              onChange={(e) => {
                setCardCode(e.target.value.toUpperCase());
                setLookupState("idle");
                setFoundCard(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="GIFT-XXXX-XXXX"
              className="font-mono"
              autoFocus
            />
            <Button
              onClick={handleSearch}
              disabled={lookupState === "searching" || !cardCode.trim()}
              className="shrink-0 gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              {lookupState === "searching" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Check Balance
            </Button>
          </div>
        </div>

        {lookupState === "not_found" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="size-4 shrink-0" />
            We couldn&apos;t find a gift card with that code. Please check and
            try again.
          </div>
        )}

        {lookupState === "found" && foundCard && (
          <div className="mt-4 rounded-xl border p-4 text-center">
            <Badge
              className={cn("text-xs", STATUS_META[foundCard.status].className)}
            >
              {STATUS_META[foundCard.status].label}
            </Badge>
            <p
              className={cn(
                "mt-2 text-4xl font-bold",
                isActive && foundCard.currentBalance > 0
                  ? "text-green-600"
                  : "text-muted-foreground",
              )}
            >
              ${foundCard.currentBalance.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-xs">current balance</p>
            <p className="text-muted-foreground mt-3 border-t pt-3 text-sm">
              {foundCard.neverExpires
                ? "No expiry"
                : `Expires ${fmtDate(foundCard.expiryDate)}`}
            </p>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        {brandName} · Gift card balance checker
      </p>
    </div>
  );
}
