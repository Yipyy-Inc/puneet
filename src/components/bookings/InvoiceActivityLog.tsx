"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  Check,
  CreditCard,
  DollarSign,
  Eye,
  FileEdit,
  FileMinus,
  FilePlus,
  History,
  Lock,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Invoice,
  InvoiceAuditEventType,
  InvoiceSnapshot,
} from "@/types/booking";

interface InvoiceActivityLogProps {
  invoice: Invoice;
}

const TYPE_META: Record<
  InvoiceAuditEventType,
  { Icon: typeof FilePlus; tone: string; bg: string; label: string }
> = {
  invoice_created: {
    Icon: FilePlus,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Created",
  },
  estimate_sent: {
    Icon: Receipt,
    tone: "text-blue-700",
    bg: "bg-blue-100",
    label: "Estimate sent",
  },
  deposit_collected: {
    Icon: ShieldCheck,
    tone: "text-blue-700",
    bg: "bg-blue-100",
    label: "Deposit",
  },
  deposit_refunded: {
    Icon: RotateCcw,
    tone: "text-rose-700",
    bg: "bg-rose-100",
    label: "Deposit refund",
  },
  item_added: {
    Icon: Plus,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Item added",
  },
  item_edited: {
    Icon: FileEdit,
    tone: "text-amber-700",
    bg: "bg-amber-100",
    label: "Item edited",
  },
  item_removed: {
    Icon: Trash2,
    tone: "text-rose-700",
    bg: "bg-rose-100",
    label: "Item removed",
  },
  fee_added: {
    Icon: DollarSign,
    tone: "text-amber-700",
    bg: "bg-amber-100",
    label: "Fee added",
  },
  fee_removed: {
    Icon: FileMinus,
    tone: "text-rose-700",
    bg: "bg-rose-100",
    label: "Fee removed",
  },
  discount_applied: {
    Icon: Percent,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Discount",
  },
  discount_removed: {
    Icon: X,
    tone: "text-rose-700",
    bg: "bg-rose-100",
    label: "Discount removed",
  },
  tax_changed: {
    Icon: Percent,
    tone: "text-zinc-700",
    bg: "bg-zinc-100",
    label: "Tax changed",
  },
  tip_added: {
    Icon: DollarSign,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Tip",
  },
  prepayment_collected: {
    Icon: CreditCard,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Prepayment",
  },
  payment_processed: {
    Icon: Banknote,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Payment",
  },
  manager_override: {
    Icon: Lock,
    tone: "text-amber-700",
    bg: "bg-amber-100",
    label: "Override",
  },
  status_changed: {
    Icon: FileEdit,
    tone: "text-blue-700",
    bg: "bg-blue-100",
    label: "Status",
  },
  invoice_closed: {
    Icon: Check,
    tone: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Closed",
  },
  refund_issued: {
    Icon: RotateCcw,
    tone: "text-rose-700",
    bg: "bg-rose-100",
    label: "Refund",
  },
};

function fmt(n: number | undefined): string {
  return (n ?? 0).toFixed(2);
}

function formatTimestamp(ts: string): {
  date: string;
  time: string;
  full: string;
} {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase(),
    full: d.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export function InvoiceActivityLog({ invoice }: InvoiceActivityLogProps) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const events = useMemo(() => {
    const trail = invoice.auditTrail ?? [];
    return [...trail].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [invoice.auditTrail]);

  const openEvent = events.find((e) => e.id === openEventId) ?? null;

  if (events.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
          <History className="size-3.5" />
          Invoice Activity
        </p>
        <div className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center text-[11px]">
          No activity recorded yet
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <History className="size-3.5" />
            Invoice Activity
          </p>
          <span className="text-muted-foreground/70 text-[10px]">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="relative pl-4">
          {/* Vertical timeline rail */}
          <div className="bg-border absolute inset-y-2 left-[7px] w-px" />
          <ol className="space-y-2.5">
            {events.map((event) => {
              const meta = TYPE_META[event.type] ?? TYPE_META.status_changed;
              const { date, time, full } = formatTimestamp(event.timestamp);
              const Icon = meta.Icon;
              return (
                <li key={event.id} className="relative">
                  {/* Dot */}
                  <span
                    className={cn(
                      "absolute -left-4 top-1.5 flex size-4 items-center justify-center rounded-full ring-2 ring-background",
                      meta.bg,
                    )}
                  >
                    <Icon className={cn("size-2.5", meta.tone)} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenEventId(event.id)}
                    className="hover:bg-muted/60 group -mx-1 block w-[calc(100%+0.5rem)] rounded-md px-1.5 py-1 text-left transition-colors"
                    title={`View invoice as of ${full}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-foreground text-[12px] leading-snug">
                        {event.description}
                        {event.amount !== undefined && (
                          <span className="ml-1 font-semibold font-[tabular-nums]">
                            ${fmt(event.amount)}
                          </span>
                        )}
                      </p>
                      <Eye className="text-muted-foreground/40 group-hover:text-foreground mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[10.5px]">
                      <span className="font-medium">{event.staffName}</span>
                      <span className="mx-1">·</span>
                      <span className="font-[tabular-nums]">
                        {date}, {time}
                      </span>
                      {event.note && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="italic">{event.note}</span>
                        </>
                      )}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <Dialog
        open={openEventId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenEventId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-4" />
              Invoice as of this change
            </DialogTitle>
            <DialogDescription>
              {openEvent && (
                <>
                  <span className="font-medium text-foreground">
                    {openEvent.description}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {openEvent.staffName} ·{" "}
                    {formatTimestamp(openEvent.timestamp).full}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {openEvent && (
            <SnapshotView
              snapshot={openEvent.snapshot as InvoiceSnapshot}
              invoiceId={invoice.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function statusBadgeClass(status: string): string {
  if (status === "closed")
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  if (status === "open")
    return "border-amber-300 bg-amber-100 text-amber-800";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
}

function SnapshotView({
  snapshot,
  invoiceId,
}: {
  snapshot: InvoiceSnapshot;
  invoiceId: string;
}) {
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <p className="text-sm font-semibold">#{invoiceId}</p>
          <p className="text-muted-foreground text-[11px]">
            {snapshot.items.length} item
            {snapshot.items.length !== 1 ? "s" : ""}
            {snapshot.fees.length > 0 &&
              ` · ${snapshot.fees.length} fee${snapshot.fees.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold capitalize",
            statusBadgeClass(snapshot.status),
          )}
        >
          {snapshot.status}
        </Badge>
      </div>

      {snapshot.items.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
            Services
          </p>
          <div className="space-y-1">
            {snapshot.items.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p>{item.name}</p>
                  <p className="text-muted-foreground text-[10.5px]">
                    ${fmt(item.unitPrice)} × {item.quantity}
                    {item.staffName && ` · ${item.staffName}`}
                  </p>
                </div>
                <span className="font-[tabular-nums]">${fmt(item.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.fees.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
            Fees
          </p>
          <div className="space-y-1">
            {snapshot.fees.map((fee, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{fee.name}</span>
                <span className="font-[tabular-nums]">${fmt(fee.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1 border-t pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-[tabular-nums]">${fmt(snapshot.subtotal)}</span>
        </div>
        {snapshot.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>
              Discount
              {snapshot.discountLabel ? ` (${snapshot.discountLabel})` : ""}
            </span>
            <span className="font-[tabular-nums]">
              -${fmt(snapshot.discount)}
            </span>
          </div>
        )}
        {snapshot.taxes && snapshot.taxes.length > 0
          ? snapshot.taxes.map((t, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">
                  {t.name} ({(t.rate * 100).toFixed(t.rate < 0.1 ? 1 : 3)}%)
                </span>
                <span className="font-[tabular-nums]">${fmt(t.amount)}</span>
              </div>
            ))
          : snapshot.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-[tabular-nums]">
                  ${fmt(snapshot.taxAmount)}
                </span>
              </div>
            )}
        {snapshot.tipTotal !== undefined && snapshot.tipTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tip</span>
            <span className="font-[tabular-nums]">${fmt(snapshot.tipTotal)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span className="font-[tabular-nums]">${fmt(snapshot.total)}</span>
        </div>
        {snapshot.depositCollected > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit collected</span>
            <span className="font-[tabular-nums] text-emerald-700">
              -${fmt(snapshot.depositCollected)}
            </span>
          </div>
        )}
        {snapshot.remainingDue > 0 && (
          <div className="text-destructive flex justify-between font-medium">
            <span>Remaining due</span>
            <span className="font-[tabular-nums]">
              ${fmt(snapshot.remainingDue)}
            </span>
          </div>
        )}
      </div>

      {snapshot.payments.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
            Payments at this point
          </p>
          <div className="space-y-1">
            {snapshot.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="capitalize">
                  {p.method}
                  {p.kind && (
                    <span className="text-muted-foreground/80 ml-1.5">
                      · {p.kind}
                    </span>
                  )}
                  {p.collectedBy && (
                    <span className="text-muted-foreground/80 ml-1.5">
                      by {p.collectedBy}
                    </span>
                  )}
                </span>
                <span className="font-[tabular-nums]">${fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
