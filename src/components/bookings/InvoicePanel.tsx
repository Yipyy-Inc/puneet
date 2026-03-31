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
import { Receipt, Plus, X, Pencil, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/types/booking";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  estimate: { label: "Estimate", variant: "outline" },
  open: { label: "Open", variant: "secondary" },
  closed: { label: "Closed", variant: "default" },
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
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Invoice
            </span>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-muted-foreground text-xs">{invoice.id}</p>
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
                    className="animate-in fade-in -mx-2 space-y-2 rounded-md border border-dashed bg-muted/20 px-2 py-2 duration-150"
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
                    className="group -mx-2 flex items-start justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
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
                      <span className="text-sm font-[tabular-nums]">
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
                    toast.success(
                      "Membership discount applied — 15% off",
                    )
                  }
                >
                  Redeem Membership
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                Payments
              </p>
              <div className="space-y-1.5">
                {invoice.payments.map((p, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground flex justify-between text-xs"
                  >
                    <span>
                      {p.date} · {p.method}
                    </span>
                    <span className="font-[tabular-nums]">
                      ${fmt(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
