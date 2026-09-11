"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types/payments";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

interface PayNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  amountDue: number;
  savedCards: PaymentMethod[];
}

type PayMode = "saved" | "new";

export function PayNowModal({
  open,
  onOpenChange,
  invoiceNumber,
  amountDue,
  savedCards,
}: PayNowModalProps) {
  const { t, fill, locale } = useCustomerText("billing");
  const amountText = formatMoney(amountDue, locale);
  const defaultCardId =
    savedCards.find((c) => c.isDefault)?.id ?? savedCards[0]?.id ?? "";
  const [selectedCardId, setSelectedCardId] = useState(defaultCardId);
  const [mode, setMode] = useState<PayMode>(
    savedCards.length > 0 ? "saved" : "new",
  );
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handlePay = () => {
    setSubmitting(true);
    setTimeout(() => {
      const card =
        mode === "saved"
          ? savedCards.find((c) => c.id === selectedCardId)
          : null;
      const last4 =
        mode === "saved" ? card?.cardLast4 : newCardNumber.slice(-4) || "0000";
      const brand =
        mode === "saved" ? card?.cardBrand?.toUpperCase() : t("cardFallback");
      toast.success(
        fill("paymentProcessedToast", {
          amount: amountText,
          invoice: invoiceNumber,
        }),
        {
          description: fill("paymentChargedToast", {
            card: `${brand} •••• ${last4}`,
          }),
        },
      );
      setSubmitting(false);
      onOpenChange(false);
    }, 600);
  };

  const newCardValid =
    newCardNumber.replace(/\s/g, "").length >= 13 &&
    /^\d{2}\/\d{2}$/.test(newCardExpiry) &&
    newCardCvc.length >= 3 &&
    newCardName.trim().length > 0;

  const canPay =
    (mode === "saved" && selectedCardId.length > 0) ||
    (mode === "new" && newCardValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-emerald-600" />
            {t("securePayment")}
          </DialogTitle>
          <DialogDescription>
            {rich(t("payingInvoice"), {
              invoice: <span className="font-medium">{invoiceNumber}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="text-muted-foreground text-sm">
              {t("amountDue")}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {amountText}
            </span>
          </div>

          {savedCards.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("saved")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  mode === "saved"
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <CreditCard className="size-3.5" />
                {t("savedCard")}
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  mode === "new"
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Plus className="size-3.5" />
                {t("newCard")}
              </button>
            </div>
          )}

          {mode === "saved" && savedCards.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">{t("chooseSavedCard")}</Label>
              {savedCards.map((card) => (
                <label
                  key={card.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                    selectedCardId === card.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedCardId === card.id}
                    onChange={() => setSelectedCardId(card.id)}
                    className="accent-primary"
                  />
                  <CreditCard className="text-muted-foreground size-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {card.cardBrand?.toUpperCase()} •••• {card.cardLast4}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {fill("cardExpires", {
                        month: String(card.cardExpMonth ?? "").padStart(2, "0"),
                        year: String(card.cardExpYear ?? ""),
                      })}
                      {card.isDefault && ` · ${t("defaultCard")}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t("cardholderName")}</Label>
                <Input
                  className="mt-1"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder={t("nameOnCard")}
                />
              </div>
              <div>
                <Label className="text-xs">{t("cardNumber")}</Label>
                <Input
                  className="mt-1 font-mono"
                  value={newCardNumber}
                  onChange={(e) =>
                    setNewCardNumber(
                      e.target.value
                        .replace(/[^\d]/g, "")
                        .replace(/(\d{4})(?=\d)/g, "$1 ")
                        .slice(0, 19),
                    )
                  }
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t("expiry")}</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={newCardExpiry}
                    onChange={(e) => {
                      const cleaned = e.target.value
                        .replace(/[^\d]/g, "")
                        .slice(0, 4);
                      const formatted =
                        cleaned.length > 2
                          ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
                          : cleaned;
                      setNewCardExpiry(formatted);
                    }}
                    placeholder={t("expiryPlaceholder")}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-xs">CVC</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={newCardCvc}
                    onChange={(e) =>
                      setNewCardCvc(
                        e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                      )
                    }
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="accent-primary"
                />
                {t("saveCardForLater")}
              </label>
            </div>
          )}

          <p className="text-muted-foreground flex items-center gap-1.5 text-[10.5px]">
            <Lock className="size-3" />
            {t("securelyProcessed")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handlePay}
            disabled={!canPay || submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting
              ? t("processing")
              : fill("payAmount", { amount: amountText })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
