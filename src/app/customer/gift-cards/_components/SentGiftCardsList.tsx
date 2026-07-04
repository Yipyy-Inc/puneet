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
import {
  Send,
  Search,
  MoreHorizontal,
  Eye,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards } from "@/data/gift-cards";
import type { GiftCard } from "@/types/payments";
import { EmptyState, STATUS_META, Thumb, fmtDate } from "./gift-card-list-shared";

type SortKey = "newest" | "oldest" | "highest" | "lowest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
];

interface SentGiftCardsListProps {
  facilityId: number;
  customerId: number;
  onSendFirst?: () => void;
}

export function SentGiftCardsList({
  facilityId,
  customerId,
  onSendFirst,
}: SentGiftCardsListProps) {
  const sent = useMemo(
    () =>
      giftCards.filter(
        (gc) =>
          gc.facilityId === facilityId && gc.purchasedByClientId === customerId,
      ),
    [facilityId, customerId],
  );

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [detailCard, setDetailCard] = useState<GiftCard | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sent.filter(
          (gc) =>
            (gc.recipientName ?? "").toLowerCase().includes(q) ||
            (gc.recipientEmail ?? "").toLowerCase().includes(q),
        )
      : sent;
    const byDate = (gc: GiftCard) => new Date(gc.purchaseDate).getTime();
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

  const handleResend = (gc: GiftCard) => {
    setResentIds((prev) => new Set(prev).add(gc.id));
    toast.success(`Gift card resent to ${gc.recipientEmail ?? "recipient"}.`);
  };

  // True empty (nothing ever sent) → CTA to Tab 1.
  if (sent.length === 0) {
    return (
      <EmptyState
        icon={<Send className="size-6" />}
        text="You haven't sent any gift cards yet."
        action={
          onSendFirst && (
            <Button onClick={onSendFirst} className="gap-1.5">
              <Send className="size-4" />
              Send your first gift card
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
            placeholder="Search by recipient name"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No cards match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((gc) => {
            const checked = checkedIds.has(gc.id);
            const isPhysical = gc.type === "physical";
            return (
              <div key={gc.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <Thumb id={gc.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      To {gc.recipientName ?? gc.recipientEmail ?? "Recipient"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      Sent {fmtDate(gc.purchaseDate)}
                      <Badge
                        className={cn(
                          "text-[10px]",
                          STATUS_META[gc.status].className,
                        )}
                      >
                        {STATUS_META[gc.status].label}
                      </Badge>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      ${gc.initialAmount.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ${gc.currentBalance.toFixed(2)} left
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label="Card actions"
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
                              Resend email
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56 text-xs">
                            Physical cards cannot be resent by email.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <DropdownMenuItem
                          disabled={resentIds.has(gc.id)}
                          onSelect={() => handleResend(gc)}
                        >
                          <Send className="size-4" />
                          {resentIds.has(gc.id)
                            ? "Email resent"
                            : "Resend email"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setDetailCard(gc)}>
                        <Eye className="size-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleChecked(gc.id);
                        }}
                      >
                        <DollarSign className="size-4" />
                        {checked ? "Hide balance" : "Check balance"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {checked && (
                  <p className="text-muted-foreground mt-2 pl-15 text-xs">
                    Current balance:{" "}
                    <span className="text-foreground font-medium">
                      ${gc.currentBalance.toFixed(2)}
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
                    Card to{" "}
                    {detailCard.recipientName ??
                      detailCard.recipientEmail ??
                      "Recipient"}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Code" value={detailCard.code} mono />
                <Detail
                  label="Status"
                  value={STATUS_META[detailCard.status].label}
                />
                <Detail
                  label="Original amount"
                  value={`$${detailCard.initialAmount.toFixed(2)}`}
                />
                <Detail
                  label="Remaining"
                  value={`$${detailCard.currentBalance.toFixed(2)}`}
                />
                <Detail label="Sent" value={fmtDate(detailCard.purchaseDate)} />
                <Detail
                  label="Expires"
                  value={
                    detailCard.neverExpires
                      ? "Never"
                      : fmtDate(detailCard.expiryDate)
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Transaction history</p>
                {detailCard.transactionHistory.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No transactions yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {detailCard.transactionHistory.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-medium capitalize">{t.type}</p>
                          <p className="text-muted-foreground">
                            {fmtDate(t.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-semibold",
                              t.type === "redemption"
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {t.type === "redemption" ? "−" : "+"}$
                            {Math.abs(t.amount).toFixed(2)}
                          </p>
                          <p className="text-muted-foreground">
                            Bal ${t.balanceAfter.toFixed(2)}
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
