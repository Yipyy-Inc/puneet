"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  X,
  Pencil,
  Percent,
  DollarSign,
  FileText,
  Lock,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types/booking";
import type { Client } from "@/types/client";
import { canEditInvoice } from "@/types/booking";
import { InvoiceActivityLog } from "@/components/bookings/InvoiceActivityLog";
import { AutoAppliedBenefits } from "@/components/bookings/AutoAppliedBenefits";
import { CareCompletionInlineBanner } from "@/components/bookings/CareCompletionWarning";
import type { PendingCareItem } from "@/lib/care-completion";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    badgeClass: string;
    bannerClass: string;
  }
> = {
  estimate: {
    label: "Estimate",
    badgeClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    bannerClass: "bg-zinc-100 text-zinc-600",
  },
  open: {
    label: "Open",
    badgeClass: "border-amber-300 bg-amber-100 text-amber-800",
    bannerClass: "bg-amber-50 text-amber-700",
  },
  closed: {
    label: "Closed",
    badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-800",
    bannerClass: "bg-emerald-50 text-emerald-700",
  },
};

function fmt(n: number): string {
  return n.toFixed(2);
}

export function InvoicePanel({
  invoice,
  client,
  pendingCare,
  hasCriticalCare,
}: {
  invoice: Invoice;
  client?: Pick<Client, "membership" | "packages" | "storeCredit"> | null;
  pendingCare?: PendingCareItem[];
  hasCriticalCare?: boolean;
}) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.estimate;
  const canEditBase = canEditInvoice(invoice.status, "base");
  const canEditAddon = canEditInvoice(invoice.status, "addon");
  const isClosed = invoice.status === "closed";
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStaff, setEditStaff] = useState("");
  const [overrideRows, setOverrideRows] = useState<Set<number>>(new Set());

  const isItemBase = (type: string | undefined) =>
    type == null || type === "service";

  const canEditItemAt = (idx: number, type: string | undefined): boolean => {
    if (isClosed) return false;
    if (isItemBase(type)) {
      return canEditBase || overrideRows.has(idx);
    }
    return canEditAddon;
  };

  const grantOverride = (idx: number, itemName: string) => {
    setOverrideRows((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    toast.success(`Manager override granted — "${itemName}" unlocked`);
  };

  return (
    <Card className="sticky top-20 overflow-hidden">
      {/* Status banner */}
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium",
          status.bannerClass,
        )}
      >
        {invoice.status === "estimate" && (
          <>
            <FileText className="size-3.5" />
            <span>Price Estimate — Not yet billed</span>
          </>
        )}
        {invoice.status === "open" && (
          <>
            <Clock className="size-3.5" />
            <span>Invoice Open — Service in progress, base prices locked</span>
          </>
        )}
        {invoice.status === "closed" && (
          <>
            <Lock className="size-3.5" />
            <span>Invoice Closed — Locked. Use refund for adjustments.</span>
          </>
        )}
      </div>

      <CardHeader className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">#{invoice.id}</p>
            <p className="text-muted-foreground text-xs">
              {invoice.items.length} item{invoice.items.length !== 1 ? "s" : ""}
              {invoice.fees.length > 0 &&
                ` · ${invoice.fees.length} fee${invoice.fees.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "px-2.5 py-0.5 text-[11px] font-semibold tracking-wide capitalize",
              status.badgeClass,
            )}
          >
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Care-completion warning — visible when meals/meds are pending today */}
        {pendingCare && pendingCare.length > 0 && (
          <CareCompletionInlineBanner
            pending={pendingCare}
            hasCritical={hasCriticalCare ?? false}
          />
        )}

        {/* Items */}
        {invoice.items.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Services
              </p>
              {invoice.status !== "closed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-6 gap-1 px-1.5 text-[10px]"
                  onClick={() => setAddingItem(true)}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {invoice.items.map((item, i) =>
                editingIndex === i ? (
                  <div
                    key={i}
                    className="animate-in fade-in bg-muted/20 -mx-2 space-y-2 rounded-md border border-dashed px-2 py-2 duration-150"
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Service name"
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Price"
                        className="h-7 w-20 text-xs"
                        min={0}
                        step={0.01}
                      />
                      <Input
                        value={editStaff}
                        onChange={(e) => setEditStaff(e.target.value)}
                        placeholder="Staff name"
                        className="h-7 flex-1 text-xs"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          toast.success(
                            `Updated "${editName}" — $${editPrice}${editStaff ? ` · ${editStaff}` : ""}`,
                          );
                          setEditingIndex(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => setEditingIndex(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="group hover:bg-muted/40 -mx-2 flex items-start justify-between rounded-md px-2 py-1.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{item.name}</p>
                      <p className="text-muted-foreground text-xs">
                        ${fmt(item.unitPrice)} x {item.quantity}
                        {item.staffName && (
                          <span className="ml-1">· {item.staffName}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-[tabular-nums] text-sm">
                        ${fmt(item.price)}
                      </span>
                      {canEditItemAt(i, item.type) ? (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded-sm"
                            onClick={() => {
                              setEditingIndex(i);
                              setEditName(item.name);
                              setEditPrice(String(item.price));
                              setEditStaff(item.staffName ?? "");
                            }}
                            title="Edit"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            className="text-muted-foreground hover:text-destructive flex size-5 items-center justify-center rounded-sm"
                            onClick={() =>
                              toast.success(
                                `"${item.name}" removed from invoice`,
                              )
                            }
                            title="Delete"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : !isClosed && isItemBase(item.type) ? (
                        <button
                          className="text-muted-foreground hover:text-amber-600 flex size-5 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => grantOverride(i, item.name)}
                          title="Locked — click for manager override"
                        >
                          <Lock className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Add item inline */}
        {addingItem && (
          <div className="space-y-2 rounded-lg border border-dashed p-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Service name..."
              className="h-7 text-xs"
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="Price"
                type="number"
                className="h-7 w-20 text-xs"
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  toast.success(`Added "${newItemName}" — $${newItemPrice}`);
                  setAddingItem(false);
                  setNewItemName("");
                  setNewItemPrice("");
                }}
                disabled={!newItemName || !newItemPrice}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setAddingItem(false);
                  setNewItemName("");
                  setNewItemPrice("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Fees */}
        {invoice.fees.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Fees
            </p>
            <div className="space-y-1.5">
              {invoice.fees.map((fee, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{fee.name}</span>
                  <span className="font-[tabular-nums]">${fmt(fee.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Summary */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-[tabular-nums]">
              ${fmt(invoice.subtotal)}
            </span>
          </div>
          {/* Itemized discounts or single discount */}
          {invoice.discounts && invoice.discounts.length > 0
            ? invoice.discounts.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-[tabular-nums] text-emerald-600">
                    -${fmt(d.price)}
                  </span>
                </div>
              ))
            : invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Discount
                    {invoice.discountLabel ? ` (${invoice.discountLabel})` : ""}
                  </span>
                  <span className="font-[tabular-nums] text-emerald-600">
                    -${fmt(invoice.discount)}
                  </span>
                </div>
              )}
          {/* Membership indicator */}
          {invoice.membershipApplied && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Membership: {invoice.membershipApplied}
              </span>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700"
              >
                Applied
              </Badge>
            </div>
          )}
          {/* Multi-tax breakdown or single tax */}
          {invoice.taxes && invoice.taxes.length > 0
            ? invoice.taxes.map((tax, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tax.name} ({parseFloat((tax.rate * 100).toFixed(4))}%)
                  </span>
                  <span className="font-[tabular-nums]">
                    ${fmt(tax.amount)}
                  </span>
                </div>
              ))
            : invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({parseFloat((invoice.taxRate * 100).toFixed(4))}%)
                  </span>
                  <span className="font-[tabular-nums]">
                    ${fmt(invoice.taxAmount)}
                  </span>
                </div>
              )}
          {/* Tip */}
          {invoice.tipTotal && invoice.tipTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tip</span>
              <span className="font-[tabular-nums]">
                ${fmt(invoice.tipTotal)}
              </span>
            </div>
          )}
          {/* Package credits */}
          {invoice.packageCreditsUsed && invoice.packageCreditsUsed > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Package credits used
              </span>
              <span className="font-[tabular-nums]">
                {invoice.packageCreditsUsed}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="font-[tabular-nums]">${fmt(invoice.total)}</span>
          </div>
        </div>

        {/* Deposit section */}
        {((invoice.depositRequired ?? 0) > 0 ||
          invoice.depositCollected > 0) && (
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Deposit
            </p>
            <div className="space-y-1.5 text-sm">
              {(invoice.depositRequired ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Required
                    {invoice.depositRuleLabel && (
                      <span className="text-muted-foreground/70 ml-1.5 text-[10px]">
                        · {invoice.depositRuleLabel}
                      </span>
                    )}
                  </span>
                  <span className="font-[tabular-nums]">
                    ${fmt(invoice.depositRequired ?? 0)}
                  </span>
                </div>
              )}
              {invoice.depositCollected > 0 ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-[tabular-nums] text-emerald-700">
                      ${fmt(invoice.depositCollected)}
                    </span>
                  </div>
                  {(invoice.depositCollectedBy ||
                    invoice.depositCollectedAt) && (
                    <p className="text-muted-foreground/80 mt-0.5 pl-0 text-[11px]">
                      {invoice.depositCollectedBy && (
                        <>by {invoice.depositCollectedBy}</>
                      )}
                      {invoice.depositCollectedAt && (
                        <>
                          {invoice.depositCollectedBy ? " on " : "on "}
                          {new Date(
                            invoice.depositCollectedAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                (invoice.depositRequired ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-[tabular-nums] text-amber-700">
                      Not yet collected
                    </span>
                  </div>
                )
              )}
              <Separator className="my-1.5" />
              <div
                className={cn(
                  "flex items-center justify-between font-medium",
                  invoice.remainingDue > 0
                    ? "text-destructive"
                    : "text-emerald-700",
                )}
              >
                <span>Remaining</span>
                <span className="font-[tabular-nums]">
                  ${fmt(invoice.remainingDue)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Remaining due — fallback when no deposit context */}
        {(invoice.depositRequired ?? 0) === 0 &&
          invoice.depositCollected === 0 &&
          invoice.remainingDue > 0 && (
            <div className="text-destructive flex items-center justify-between text-sm font-medium">
              <span>Remaining due</span>
              <span className="font-[tabular-nums]">
                ${fmt(invoice.remainingDue)}
              </span>
            </div>
          )}

        {/* Auto-applied benefits — engine evaluates eligibility, banner shows savings,
            staff can toggle individual benefits off if needed */}
        <AutoAppliedBenefits client={client ?? null} invoice={invoice} />

        {/* Actions (for non-closed invoices) */}
        {invoice.status !== "closed" && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                    >
                      <Percent className="size-3" />
                      Discount
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-52">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Apply Discount</p>
                      <Input
                        placeholder="Amount or %"
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="Reason (e.g. Loyalty 10%)"
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-7 w-full text-xs"
                        onClick={() => toast.success("Discount applied")}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() => {
                    setAddingItem(true);
                    setNewItemName("");
                    setNewItemPrice("");
                  }}
                >
                  <DollarSign className="size-3" />
                  Add Fee
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() => {
                    setAddingItem(true);
                    setNewItemName("");
                    setNewItemPrice("");
                  }}
                >
                  <Plus className="size-3" />
                  Add Product
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                    >
                      <DollarSign className="size-3" />
                      Add Tip
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-52">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Add Tip to Invoice</p>
                      <div className="flex gap-1.5">
                        {[5, 10, 15, 20].map((amt) => (
                          <button
                            key={amt}
                            onClick={() =>
                              toast.success(`$${amt} tip added to invoice`)
                            }
                            className="hover:bg-foreground hover:text-background flex-1 rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-all"
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Custom amount"
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            if (val)
                              toast.success(`$${val} tip added to invoice`);
                          }
                        }}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        Add tip before checkout for cash/check payments
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() =>
                    toast.success("Store credit applied to invoice")
                  }
                >
                  Use Store Credit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() =>
                    toast.success("Membership discount applied — 15% off")
                  }
                >
                  Redeem Membership
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Closed invoice note */}
        {invoice.status === "closed" && (
          <>
            <Separator />
            <p className="text-muted-foreground text-center text-[10px]">
              Invoice closed — use action bar for receipt and tip split
            </p>
          </>
        )}

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                Payment History
              </p>
              <div className="space-y-1.5">
                {invoice.payments.map((p, i) => {
                  const kindLabel =
                    p.kind === "prepayment"
                      ? "Prepayment"
                      : p.kind === "deposit"
                        ? "Deposit"
                        : p.kind === "final"
                          ? "Final payment"
                          : null;
                  const kindBadgeClass =
                    p.kind === "prepayment"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : p.kind === "deposit"
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-zinc-300 bg-zinc-100 text-zinc-700";
                  return (
                    <div
                      key={i}
                      className="bg-muted/20 flex items-center justify-between rounded-md border px-2.5 py-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium capitalize">
                            {p.method}
                          </p>
                          {kindLabel && (
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0 text-[9px] font-semibold tracking-wide uppercase",
                                kindBadgeClass,
                              )}
                            >
                              {kindLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          {new Date(p.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {p.collectedBy && ` · by ${p.collectedBy}`}
                          {p.transactionId && ` · ${p.transactionId}`}
                        </p>
                      </div>
                      <span className="font-[tabular-nums] text-sm font-semibold">
                        ${fmt(p.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Invoice audit trail — full timestamped log with snapshot viewer */}
        <Separator />
        <InvoiceActivityLog invoice={invoice} />
      </CardContent>
    </Card>
  );
}
