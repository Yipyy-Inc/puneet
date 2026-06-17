"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Gift,
  User,
  Mail,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Ban,
  Clock,
  Eye,
  EyeOff,
  CalendarPlus,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GiftCard, GiftCardTransaction } from "@/types/payments";
import { clients } from "@/data/clients";
import { giftCardSettings, giftCardAuditLogs } from "@/data/gift-cards";

// Acting staff member (mock — no auth context yet; matches the gift card audit log staff).
const CURRENT_STAFF = "Sarah Johnson";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  redeemed: { label: "Fully Redeemed", variant: "secondary" },
  expired: { label: "Expired", variant: "destructive" },
  cancelled: { label: "Voided", variant: "destructive" },
};

const txConfig = {
  purchase: {
    icon: ArrowUpRight,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    label: "Issued",
  },
  redemption: {
    icon: ArrowDownRight,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    label: "Redeemed",
  },
  refund: {
    icon: RotateCcw,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    label: "Refunded",
  },
};

// Non-financial staff actions logged into the card's history timeline.
type DrawerEventType = "reveal" | "resend" | "extend_expiry" | "adjust_balance";

const eventMeta: Record<
  DrawerEventType,
  { icon: typeof Eye; label: string; color: string; bg: string }
> = {
  reveal: {
    icon: Eye,
    label: "Card Number Revealed",
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-900/40",
  },
  resend: {
    icon: Mail,
    label: "Email Resent",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  extend_expiry: {
    icon: CalendarPlus,
    label: "Expiry Extended",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  adjust_balance: {
    icon: SlidersHorizontal,
    label: "Balance Adjusted",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
};

// Icon+label action button; wraps in a tooltip when disabled (disabled buttons
// don't emit hover events, so the span captures it).
function DrawerActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  disabledTooltip,
  destructive,
  className,
}: {
  icon: typeof Mail;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
  destructive?: boolean;
  className?: string;
}) {
  const button = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "gap-1.5",
        destructive &&
          "border-destructive text-destructive hover:bg-destructive/10",
        className,
      )}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );

  if (disabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn("inline-flex", className)}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

const VOID_REASONS = [
  { value: "customer_request", label: "Customer Request" },
  { value: "duplicate", label: "Duplicate Card" },
  { value: "fraud", label: "Fraud" },
  { value: "error", label: "Error" },
  { value: "other", label: "Other" },
];

export interface VoidOptions {
  reason: string;
  notes: string;
  issueReplacement: boolean;
  replacementValue: number;
}

interface GiftCardDetailSheetProps {
  card: GiftCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoid?: (card: GiftCard, options: VoidOptions) => void;
}

export function GiftCardDetailSheet({
  card,
  open,
  onOpenChange,
  onVoid,
}: GiftCardDetailSheetProps) {
  // Which card's full number is revealed (null = masked). Deriving `revealed`
  // from this means switching cards re-masks automatically.
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  // Staff-action audit entries, keyed by card id so each card keeps its own log.
  const [cardEvents, setCardEvents] = useState<
    Record<
      string,
      { id: string; timestamp: string; by: string; type: DrawerEventType; detail?: string }[]
    >
  >({});

  // Void confirmation dialog.
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidNotes, setVoidNotes] = useState("");
  const [voidAndReplace, setVoidAndReplace] = useState(false);
  // Extend Expiry dialog.
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  // Adjust Balance dialog.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDirection, setAdjustDirection] = useState<"add" | "subtract">("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  // Local session overrides so Extend/Adjust update the drawer live (no backend).
  const [overrides, setOverrides] = useState<
    Record<
      string,
      Partial<Pick<GiftCard, "currentBalance" | "expiryDate" | "neverExpires">>
    >
  >({});

  // Auto-hide the full code 5 seconds after it's revealed.
  useEffect(() => {
    if (revealedCardId === null) return;
    const t = setTimeout(() => setRevealedCardId(null), 5000);
    return () => clearTimeout(t);
  }, [revealedCardId]);

  if (!card) return null;

  const revealed = revealedCardId === card.id;
  const statusCfg = statusConfig[card.status] ?? statusConfig.active;
  const purchaser = card.purchasedByClientId
    ? clients.find((c) => c.id === card.purchasedByClientId)
    : null;
  // Recipient has no client id on the card; resolve by email, then name.
  const recipientClient = card.recipientEmail
    ? clients.find(
        (c) => c.email?.toLowerCase() === card.recipientEmail?.toLowerCase(),
      )
    : card.recipientName
      ? clients.find(
          (c) => c.name.toLowerCase() === card.recipientName?.toLowerCase(),
        )
      : undefined;

  // Render a customer name as a link to their profile (new tab) when known.
  const customerNameNode = (
    clientId: number | null | undefined,
    name: string,
  ) =>
    clientId != null ? (
      <Link
        href={`/facility/dashboard/clients/${clientId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary inline-flex items-center gap-1 hover:underline"
      >
        {name}
        <ExternalLink className="size-3 shrink-0" />
      </Link>
    ) : (
      name
    );

  // Effective values reflect any session adjustments made in this drawer.
  const ov = overrides[card.id] ?? {};
  const balance = ov.currentBalance ?? card.currentBalance;
  const expiryDate = ov.expiryDate ?? card.expiryDate;
  const neverExpires = ov.neverExpires ?? card.neverExpires;

  // Extend Expiry is only available when the facility has expiry enabled.
  const expiryEnabled =
    giftCardSettings.find((s) => s.facilityId === card.facilityId)
      ?.expiryEnabled ?? false;

  const usedAmount = card.initialAmount - balance;
  const remainingPct =
    card.initialAmount > 0 ? (balance / card.initialAmount) * 100 : 0;
  // Green when >50% remains, amber 25–50%, red below 25%.
  const balanceBarColor =
    remainingPct > 50
      ? "bg-emerald-400"
      : remainingPct >= 25
        ? "bg-amber-400"
        : "bg-red-400";

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const maskCode = (code: string) => {
    const parts = code.split("-");
    if (parts.length < 2) return `****${code.slice(-4)}`;
    return parts.slice(0, -1).join("-") + "-****";
  };

  const events = cardEvents[card.id] ?? [];

  const logEvent = (type: DrawerEventType, detail?: string) => {
    setCardEvents((prev) => ({
      ...prev,
      [card.id]: [
        ...(prev[card.id] ?? []),
        {
          id: `evt-${type}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          by: CURRENT_STAFF,
          type,
          detail,
        },
      ],
    }));
  };

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleReveal = () => {
    setRevealedCardId(card.id);
    logEvent("reveal");
  };

  const handleResend = () => {
    const to = card.recipientEmail ?? card.recipientName ?? "the recipient";
    logEvent("resend", `Sent to ${to}`);
    alert(`Gift card ${card.code} email resent to ${to}.`);
  };

  // Presets extend from whichever is later: the current expiry or today,
  // so "extend" always moves the date forward.
  const setExtendPreset = (months: number) => {
    const now = new Date();
    const base =
      expiryDate && new Date(expiryDate) > now ? new Date(expiryDate) : now;
    base.setMonth(base.getMonth() + months);
    setExtendDate(base.toISOString().split("T")[0]);
  };

  const openExtend = () => {
    setExtendPreset(12);
    setExtendOpen(true);
  };

  const handleExtendConfirm = () => {
    if (!extendDate) return;
    const formatted = fmtDay(new Date(`${extendDate}T00:00:00`));
    setOverrides((prev) => ({
      ...prev,
      [card.id]: {
        ...prev[card.id],
        expiryDate: extendDate,
        neverExpires: false,
      },
    }));
    logEvent("extend_expiry", `New expiry: ${formatted}`);
    setExtendOpen(false);
    alert(`Expiry for ${card.code} extended to ${formatted}.`);
  };

  const openAdjust = () => {
    setAdjustDirection("add");
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const adjustValue = parseFloat(adjustAmount) || 0;
  const adjustSigned = adjustDirection === "add" ? adjustValue : -adjustValue;
  const adjustNewBalance = balance + adjustSigned;
  const adjustValid =
    adjustValue > 0 && adjustNewBalance >= 0 && adjustReason.trim() !== "";

  const handleAdjustConfirm = () => {
    if (!adjustValid) return;
    const sign = adjustSigned >= 0 ? "+" : "−";
    const detail = `${sign}$${Math.abs(adjustSigned).toFixed(2)}${
      adjustReason ? ` — ${adjustReason}` : ""
    } (new balance $${adjustNewBalance.toFixed(2)})`;
    setOverrides((prev) => ({
      ...prev,
      [card.id]: { ...prev[card.id], currentBalance: adjustNewBalance },
    }));
    logEvent("adjust_balance", detail);
    setAdjustOpen(false);
    alert(
      `Balance for ${card.code} adjusted ${sign}$${Math.abs(adjustSigned).toFixed(2)}. New balance: $${adjustNewBalance.toFixed(2)}.`,
    );
  };

  const closeVoid = () => {
    setVoidConfirmOpen(false);
    setVoidReason("");
    setVoidNotes("");
    setVoidAndReplace(false);
  };

  const handleVoidConfirm = () => {
    if (!voidReason) return;
    const reasonLabel =
      VOID_REASONS.find((r) => r.value === voidReason)?.label ?? voidReason;
    onVoid?.(card, {
      reason: reasonLabel,
      notes: voidNotes.trim(),
      issueReplacement: voidAndReplace,
      replacementValue: card.initialAmount,
    });
    closeVoid();
  };

  // Context shown after the bold event label (uses the note, else a default).
  const txContext = (tx: GiftCardTransaction) => {
    if (tx.notes) return tx.notes;
    if (tx.type === "purchase")
      return card.type === "online" ? "Online Purchase" : "In-store Activation";
    if (tx.type === "redemption") return "Redeemed to wallet";
    return "Refunded to customer";
  };

  // Who performed it — matched from the facility audit log, else derived.
  const txSource = (tx: GiftCardTransaction) => {
    const by = giftCardAuditLogs.find(
      (l) => l.giftCardId === card.id && l.timestamp === tx.timestamp,
    )?.performedBy;
    if (by) return by === "Online Purchase" ? "Online" : by;
    return tx.type === "purchase" && card.type === "online" ? "Online" : "System";
  };

  // Transaction history merged with staff-action audit entries, newest first.
  const timeline = [
    ...card.transactionHistory.map((tx) => ({
      kind: "tx" as const,
      key: tx.id,
      timestamp: tx.timestamp,
      tx,
    })),
    ...events.map((e) => ({
      kind: "event" as const,
      key: e.id,
      timestamp: e.timestamp,
      event: e,
    })),
  ].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Gift Card Details
          </SheetTitle>
          <SheetDescription>
            Full audit trail and balance information
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto py-4">
          {/* Balance card */}
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Remaining Balance</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">
                  ${balance.toFixed(2)}
                </p>
                <div className="mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      balanceBarColor,
                    )}
                    style={{ width: `${remainingPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs opacity-70">
                  ${usedAmount.toFixed(2)} used
                </p>
              </div>
              <Badge
                className={cn(
                  "border-white/30 bg-white/20 text-white hover:bg-white/30",
                  card.status === "active" && "bg-green-500/80",
                  card.status === "expired" && "bg-red-500/80",
                  card.status === "cancelled" && "bg-gray-500/80",
                )}
              >
                {statusCfg.label}
              </Badge>
            </div>

            <div className="mt-4 border-t border-white/20 pt-3">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "font-mono text-sm",
                    revealed ? "opacity-90" : "opacity-60",
                  )}
                >
                  {revealed ? card.code : maskCode(card.code)}
                </p>
                <button
                  type="button"
                  onClick={revealed ? () => setRevealedCardId(null) : handleReveal}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-medium text-white/90 transition-colors hover:bg-white/25"
                  title={
                    revealed
                      ? "Hide card number"
                      : "Reveal full card number (logged)"
                  }
                >
                  {revealed ? (
                    <EyeOff className="size-3" />
                  ) : (
                    <Eye className="size-3" />
                  )}
                  {revealed ? "Hide" : "Reveal"}
                </button>
              </div>
              <p className="mt-0.5 text-xs opacity-50 capitalize">
                {card.type} card ·{" "}
                {neverExpires
                  ? "Never expires"
                  : expiryDate
                    ? `Expires ${new Date(expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          {card.status === "active" && (
            <div className="flex flex-wrap items-center gap-2">
              <DrawerActionButton
                icon={Mail}
                label="Resend Email"
                onClick={handleResend}
                disabled={card.type !== "online"}
                disabledTooltip="Not available for physical cards"
              />
              <DrawerActionButton
                icon={CalendarPlus}
                label="Extend Expiry"
                onClick={openExtend}
                disabled={!expiryEnabled}
                disabledTooltip="Expiry is turned off in gift card Settings"
              />
              <DrawerActionButton
                icon={SlidersHorizontal}
                label="Adjust Balance"
                onClick={openAdjust}
              />
              {onVoid && (
                <DrawerActionButton
                  icon={Ban}
                  label="Void Card"
                  destructive
                  className="ml-auto"
                  onClick={() => setVoidConfirmOpen(true)}
                />
              )}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {card.purchasedBy && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-3" />
                  Purchased By
                </div>
                <p className="mt-1 font-medium">
                  {customerNameNode(card.purchasedByClientId, card.purchasedBy)}
                </p>
                {purchaser?.email && (
                  <p className="text-muted-foreground text-xs">{purchaser.email}</p>
                )}
              </div>
            )}

            {card.recipientName && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-3" />
                  Recipient
                </div>
                <p className="mt-1 font-medium">
                  {customerNameNode(recipientClient?.id, card.recipientName)}
                </p>
                {card.recipientEmail && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Mail className="size-3" />
                    {card.recipientEmail}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Calendar className="size-3" />
                Issued
              </div>
              <p className="mt-1 text-sm font-medium">
                {new Date(card.purchaseDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {card.lastUsedAt && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="size-3" />
                  Last Used
                </div>
                <p className="mt-1 text-sm font-medium">
                  {new Date(card.lastUsedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {card.message && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                <MessageSquare className="size-3" />
                Gift Message
              </div>
              <p className="italic">&quot;{card.message}&quot;</p>
            </div>
          )}

          <Separator />

          {/* Transaction history */}
          <div>
            <h4 className="mb-3 font-semibold">Transaction History</h4>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {timeline.map((item) => {
                  if (item.kind === "event") {
                    const meta = eventMeta[item.event.type];
                    const EventIcon = meta.icon;
                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "flex items-start gap-3 rounded-lg p-3",
                          meta.bg,
                        )}
                      >
                        <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-white dark:bg-black/20">
                          <EventIcon className={cn("size-3.5", meta.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">
                            {meta.label}
                          </span>
                          {item.event.detail && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {item.event.detail}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {formatDate(item.timestamp)} · by {item.event.by}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  const tx = item.tx;
                  const cfg = txConfig[tx.type] ?? txConfig.purchase;
                  const Icon = cfg.icon;
                  const isDebit = tx.type !== "purchase";
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-start gap-3 rounded-lg p-3",
                        cfg.bg,
                      )}
                    >
                      <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-white dark:bg-black/20">
                        <Icon className={cn("size-3.5", cfg.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm">
                            <span className="font-semibold">{cfg.label}</span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {txContext(tx)}
                            </span>
                          </p>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                "text-sm font-bold",
                                isDebit ? "text-red-600" : "text-green-600",
                              )}
                            >
                              {isDebit ? "−" : "+"}${tx.amount.toFixed(2)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Bal: ${tx.balanceAfter.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDate(tx.timestamp)} · {txSource(tx)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </SheetContent>
    </Sheet>

      {/* Extend Expiry dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Expiry</DialogTitle>
            <DialogDescription>
              {neverExpires
                ? "This card never expires — set a new expiry date below."
                : `Current expiry: ${expiryDate ? fmtDay(new Date(expiryDate)) : "—"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExtendPreset(3)}
              >
                +3 months
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExtendPreset(6)}
              >
                +6 months
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExtendPreset(12)}
              >
                +1 year
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>New expiry date</Label>
              <DatePicker
                value={extendDate}
                onValueChange={(v) => setExtendDate(v)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendConfirm} disabled={!extendDate}>
              Extend Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Current balance: ${balance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustDirection === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustDirection("add")}
              >
                Add
              </Button>
              <Button
                type="button"
                variant={adjustDirection === "subtract" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdjustDirection("subtract")}
              >
                Subtract
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-amount">Amount</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="adjust-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. goodwill credit (required)"
              />
            </div>
            {adjustValue > 0 && (
              <div className="bg-muted/40 rounded-lg border p-2.5 text-sm">
                New balance:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    adjustNewBalance < 0 ? "text-red-600" : "text-foreground",
                  )}
                >
                  ${adjustNewBalance.toFixed(2)}
                </span>
                {adjustNewBalance < 0 && (
                  <span className="text-red-600"> — cannot go below $0</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustConfirm} disabled={!adjustValid}>
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void confirmation */}
      <Dialog
        open={voidConfirmOpen}
        onOpenChange={(v) => (v ? setVoidConfirmOpen(true) : closeVoid())}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Ban className="size-5" />
              Void Gift Card
            </DialogTitle>
            <DialogDescription>
              This permanently deactivates the card and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Card details + balance at risk */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">
                  {card.code}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {card.type === "online" ? "Digital" : "Physical"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Issued {fmtDay(new Date(card.purchaseDate))}
              </p>
              <div className="mt-2 flex items-center justify-between rounded-md bg-red-50 px-2.5 py-1.5 dark:bg-red-950/30">
                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                  Balance that will be lost
                </span>
                <span className="font-bold text-red-700 dark:text-red-300">
                  ${balance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Reason (required) */}
            <div className="space-y-1.5">
              <Label>
                Reason for void <span className="text-destructive">*</span>
              </Label>
              <Select value={voidReason} onValueChange={setVoidReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {VOID_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="void-notes">Notes (optional)</Label>
              <Textarea
                id="void-notes"
                rows={2}
                value={voidNotes}
                onChange={(e) => setVoidNotes(e.target.value)}
                placeholder="Add any additional context…"
              />
            </div>

            {/* Void and issue replacement */}
            <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors">
              <Checkbox
                checked={voidAndReplace}
                onCheckedChange={(c) => setVoidAndReplace(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Void and issue replacement</span>
                <span className="text-muted-foreground block text-xs">
                  Immediately start a new Digital gift card pre-filled with the
                  original ${card.initialAmount.toFixed(2)}.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeVoid}>
              Cancel
            </Button>
            <Button
              onClick={handleVoidConfirm}
              disabled={!voidReason}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
