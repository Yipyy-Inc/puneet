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

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "outline" | "secondary" | "default" | "destructive";
    color: string;
    bg: string;
  }
> = {
  estimate: {
    label: "Estimate",
    variant: "outline",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
  },
  open: {
    label: "Open",
    variant: "secondary",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  closed: {
    label: "Closed",
    variant: "default",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

function fmt(n: number): string {
  return n.toFixed(2);
}

export function InvoicePanel({ invoice }: { invoice: Invoice }) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.estimate;
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStaff, setEditStaff] = useState("");

  return (
    <Card className="sticky top-20 overflow-hidden">
      {/* Status banner */}
      <div
        className={cn(
          "px-4 py-2 text-center text-xs font-medium",
          status.bg,
          status.color,
        )}
      >
        {invoice.status === "estimate" && (
          <span className="flex items-center justify-center gap-1.5">
            <FileText className="size-3.5" />
            Price Estimate — Not yet billed
          </span>
        )}
        {invoice.status === "open" && (
          <span className="flex items-center justify-center gap-1.5">
            <Clock className="size-3.5" />
            Invoice Open — Payment pending
          </span>
        )}
        {invoice.status === "closed" && (
          <span className="flex items-center justify-center gap-1.5">
            <Lock className="size-3.5" />
            Invoice Closed — Paid in full
          </span>
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
          <Badge variant={status.variant} className="capitalize">
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                      {invoice.status !== "closed" && (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded"
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
                            className="text-muted-foreground hover:text-destructive flex size-5 items-center justify-center rounded"
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
                      )}
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
                    {tax.name} (
                    {(tax.rate * 100).toFixed(tax.rate < 0.1 ? 1 : 3)}
                    %)
                  </span>
                  <span className="font-[tabular-nums]">
                    ${fmt(tax.amount)}
                  </span>
                </div>
              ))
            : invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(invoice.taxRate * 100).toFixed(1)}%)
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
          {invoice.depositCollected > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit collected</span>
              <span className="font-[tabular-nums]">
                -${fmt(invoice.depositCollected)}
              </span>
            </div>
          )}
          {invoice.remainingDue > 0 && (
            <div className="text-destructive flex justify-between font-medium">
              <span>Remaining due</span>
              <span className="font-[tabular-nums]">
                ${fmt(invoice.remainingDue)}
              </span>
            </div>
          )}
        </div>

        {/* Auto-detected benefits */}
        {invoice.status !== "closed" && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Available Benefits
            </p>
            {/* Package credits available */}
            {invoice.packageCreditsUsed == null && (
              <button
                onClick={() =>
                  toast.success(
                    "Package credit applied — deducted from balance",
                  )
                }
                className="flex w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-left transition-all hover:bg-emerald-100"
              >
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-emerald-800">
                    Package Credit
                  </p>
                  <p className="text-[10px] text-emerald-600">
                    Client may have eligible package credits
                  </p>
                </div>
                <span className="text-[10px] font-medium text-emerald-700">
                  Apply →
                </span>
              </button>
            )}
            {/* Membership discount */}
            {!invoice.membershipApplied && (
              <button
                onClick={() =>
                  toast.success("Membership discount auto-applied")
                }
                className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-left transition-all hover:bg-blue-100"
              >
                <div className="size-1.5 shrink-0 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-800">
                    Membership Discount
                  </p>
                  <p className="text-[10px] text-blue-600">
                    Check for active membership benefits
                  </p>
                </div>
                <span className="text-[10px] font-medium text-blue-700">
                  Apply →
                </span>
              </button>
            )}
            {/* Applied benefits labels */}
            {invoice.membershipApplied && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-700">
                  ✓ {invoice.membershipApplied}
                </span>
              </div>
            )}
            {invoice.packageCreditsUsed != null &&
              invoice.packageCreditsUsed > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                  <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-700">
                    ✓ Package Credit Used ({invoice.packageCreditsUsed})
                  </span>
                </div>
              )}
            <p className="text-muted-foreground text-[9px] italic">
              Order: Package → Membership → Discount → Store Credit → Tax
            </p>
          </div>
        )}

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

        {/* Deposit tracker */}
        {invoice.depositCollected > 0 && (
          <>
            <Separator />
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800">
                  Deposit Collected
                </span>
                <span className="font-[tabular-nums] text-sm font-semibold text-emerald-700">
                  ${fmt(invoice.depositCollected)}
                </span>
              </div>
              {invoice.remainingDue > 0 && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-emerald-600">
                    Remaining Balance
                  </span>
                  <span className="font-[tabular-nums] text-xs font-medium text-amber-600">
                    ${fmt(invoice.remainingDue)}
                  </span>
                </div>
              )}
            </div>
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
                {invoice.payments.map((p, i) => (
                  <div
                    key={i}
                    className="bg-muted/20 flex items-center justify-between rounded-md border px-2.5 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium capitalize">
                        {p.method}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {p.transactionId && ` · ${p.transactionId}`}
                      </p>
                    </div>
                    <span className="font-[tabular-nums] text-sm font-semibold">
                      ${fmt(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Invoice audit trail */}
        <Separator />
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            Invoice Activity
          </p>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-muted-foreground flex items-center gap-2">
              <div className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
              Invoice created
            </div>
            {invoice.depositCollected > 0 && (
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="size-1.5 shrink-0 rounded-full bg-blue-400" />
                Deposit of ${fmt(invoice.depositCollected)} collected
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="size-1.5 shrink-0 rounded-full bg-amber-400" />
                Discount applied: ${fmt(invoice.discount)}
              </div>
            )}
            {invoice.payments.map((p, i) => (
              <div
                key={i}
                className="text-muted-foreground flex items-center gap-2"
              >
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                Payment of ${fmt(p.amount)} via {p.method}
              </div>
            ))}
            {invoice.status === "closed" && (
              <div className="flex items-center gap-2 font-medium text-emerald-600">
                <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                Invoice closed — paid in full
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
