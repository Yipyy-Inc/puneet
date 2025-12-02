"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, X } from "lucide-react";
import { clients } from "@/data/clients";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  prefilledClient?: number;
  bookingId?: number;
  onSuccess?: (invoice: Record<string, unknown>) => void;
}

export function CreateInvoiceModal({
  open,
  onOpenChange,
  facilityId,
  prefilledClient,
  bookingId,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [selectedClient, setSelectedClient] = useState(prefilledClient || 0);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, taxable: true },
  ]);
  const [taxRate, setTaxRate] = useState(8);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "fixed",
  );
  const [discountReason, setDiscountReason] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<
    "weekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [notes, setNotes] = useState("");

  const facilityClients = clients.filter((c) => c.id >= 15);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxable: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number | boolean,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxableAmount = items
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const discountAmount =
    discountType === "percentage" ? (subtotal * discount) / 100 : discount;
  const total = subtotal + taxAmount - discountAmount;

  const handleSubmit = () => {
    if (!selectedClient) {
      alert("Please select a client");
      return;
    }
    if (!dueDate) {
      alert("Please select a due date");
      return;
    }
    if (items.some((item) => !item.description.trim() || item.unitPrice <= 0)) {
      alert("Please fill in all invoice items");
      return;
    }

    const invoiceId = crypto.randomUUID();
    const invoiceNum = invoiceId.substring(0, 4).toUpperCase();
    const invoice = {
      id: `inv-${invoiceId}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${invoiceNum}`,
      facilityId,
      clientId: selectedClient,
      bookingId,
      status: "draft" as const,
      dueDate,
      issuedDate: new Date().toISOString().split("T")[0],
      items: items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      })),
      subtotal,
      tax: taxAmount,
      taxRate,
      discount: discountAmount,
      discountType: discountAmount > 0 ? discountType : undefined,
      discountReason: discountReason || undefined,
      total,
      amountPaid: 0,
      amountDue: total,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      nextInvoiceDate: isRecurring
        ? calculateNextInvoiceDate(dueDate, recurringFrequency)
        : undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      createdBy: "Current User",
      createdById: 1,
      reminderCount: 0,
    };

    console.log("Invoice created:", invoice);

    if (onSuccess) {
      onSuccess(invoice);
    }

    onOpenChange(false);
  };

  const calculateNextInvoiceDate = (startDate: string, frequency: string) => {
    const date = new Date(startDate);
    switch (frequency) {
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split("T")[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Create a new invoice for a customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedClient.toString()}
                onValueChange={(value) => setSelectedClient(parseInt(value))}
                disabled={!!prefilledClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {facilityClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-date">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <Checkbox
                          checked={item.taxable}
                          onCheckedChange={(checked) =>
                            updateItem(item.id, "taxable", !!checked)
                          }
                        />
                        <span className="text-sm">Tax</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
                <Select
                  value={discountType}
                  onValueChange={(v) =>
                    setDiscountType(v as "percentage" | "fixed")
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">$</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {discount > 0 && (
            <div className="space-y-2">
              <Label htmlFor="discount-reason">Discount Reason</Label>
              <Input
                id="discount-reason"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g., Loyal customer discount"
              />
            </div>
          )}

          {/* Recurring */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(!!checked)}
              />
              <Label htmlFor="recurring">Recurring Invoice</Label>
            </div>
            {isRecurring && (
              <Select
                value={recurringFrequency}
                onValueChange={(v) =>
                  setRecurringFrequency(
                    v as "weekly" | "monthly" | "quarterly" | "yearly",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={2}
            />
          </div>

          {/* Total Summary */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Discount:</span>
                    <span className="font-medium">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Tax ({taxRate}%):</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">Total:</span>
                  <span className="text-2xl font-bold">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
