"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, X, Bell, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { PriceAdjustment, PriceAdjustmentReason } from "@/data/grooming";

interface PriceAdjustmentFormProps {
  appointmentId: string;
  petName: string;
  basePrice: number;
  currentTotal: number;
  adjustments: PriceAdjustment[];
  onAddAdjustment: (
    adjustment: Omit<PriceAdjustment, "id" | "addedAt">,
  ) => void;
  onRemoveAdjustment: (adjustmentId: string) => void;
  readOnly?: boolean;
}

const ADJUSTMENT_REASONS: Array<{
  value: PriceAdjustmentReason;
  label: string;
  description: string;
  defaultAmount?: number;
}> = [
  {
    value: "matting-fee",
    label: "Matting Fee",
    description: "Additional charge for severe matting requiring extra time",
    defaultAmount: 25,
  },
  {
    value: "de-shedding-upgrade",
    label: "De-shedding Upgrade",
    description: "Upgrade to de-shedding treatment",
    defaultAmount: 20,
  },
  {
    value: "extra-brushing-time",
    label: "Extra Brushing Time",
    description: "Additional time required for thorough brushing",
    defaultAmount: 15,
  },
  {
    value: "behavioral-handling",
    label: "Behavioral Handling",
    description: "Extra time and care for anxious or difficult pets",
    defaultAmount: 30,
  },
  {
    value: "extra-time-required",
    label: "Extra Time Required",
    description: "Appointment took longer than scheduled",
    defaultAmount: 20,
  },
  {
    value: "product-upgrade",
    label: "Product Upgrade",
    description: "Upgrade to premium products",
    defaultAmount: 15,
  },
  {
    value: "special-treatment",
    label: "Special Treatment",
    description: "Additional special treatments or services",
    defaultAmount: 25,
  },
  {
    value: "other",
    label: "Other",
    description: "Custom charge reason",
  },
];

export function PriceAdjustmentForm({
  appointmentId: _appointmentId,
  petName,
  basePrice,
  currentTotal: _currentTotal,
  adjustments,
  onAddAdjustment,
  onRemoveAdjustment,
  readOnly = false,
}: PriceAdjustmentFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [reason, setReason] = useState<PriceAdjustmentReason>("matting-fee");
  const [customReason, setCustomReason] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const selectedReason = ADJUSTMENT_REASONS.find((r) => r.value === reason);

  const handleReasonChange = (newReason: PriceAdjustmentReason) => {
    setReason(newReason);
    const reasonData = ADJUSTMENT_REASONS.find((r) => r.value === newReason);
    if (reasonData?.defaultAmount) {
      setAmount(reasonData.defaultAmount);
    } else {
      setAmount(0);
    }
    if (newReason !== "other") {
      setCustomReason("");
    }
  };

  const handleAdd = () => {
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (reason === "other" && !customReason.trim()) {
      toast.error("Please provide a reason for custom charge");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    onAddAdjustment({
      amount,
      reason,
      customReason: reason === "other" ? customReason : undefined,
      description,
      addedBy: "Current Groomer", // In real app, get from auth context
      customerNotified: notifyCustomer,
    });

    // Reset form
    setReason("matting-fee");
    setCustomReason("");
    setAmount(0);
    setDescription("");
    setNotifyCustomer(true);
    setIsAdding(false);

    toast.success("Price adjustment added", {
      description: notifyCustomer
        ? "Customer will be notified of the charge"
        : "Customer notification skipped",
    });
  };

  const totalAdjustments = adjustments.reduce(
    (sum, adj) => sum + adj.amount,
    0,
  );
  const newTotal = basePrice + totalAdjustments;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Price Adjustments
          </div>
          {!readOnly && (
            <Button
              size="sm"
              onClick={() => setIsAdding(!isAdding)}
              variant={isAdding ? "outline" : "default"}
            >
              {isAdding ? (
                <>
                  <X className="mr-1 size-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="mr-1 size-4" />
                  Add Charge
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Base Price</p>
              <p className="text-lg font-medium">${basePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Adjustments</p>
              <p className="text-lg font-medium">
                {totalAdjustments > 0 ? "+" : ""}${totalAdjustments.toFixed(2)}
              </p>
            </div>
            <div className="col-span-2 border-t pt-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground font-medium">Total Price</p>
                <p className="text-xl font-bold">${newTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Adjustment Form */}
        {isAdding && !readOnly && (
          <div className="space-y-4 rounded-lg border-2 border-dashed p-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Charge Reason *</Label>
              <Select value={reason} onValueChange={handleReasonChange}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason?.defaultAmount && (
                <p className="text-muted-foreground text-xs">
                  Suggested amount: ${selectedReason.defaultAmount}
                </p>
              )}
            </div>

            {reason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Custom Reason *</Label>
                <Input
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom charge reason"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why this charge is being added..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="space-y-0.5">
                <Label
                  htmlFor="notify-customer"
                  className="flex items-center gap-2"
                >
                  <Bell className="size-4" />
                  Notify Customer
                </Label>
                <p className="text-muted-foreground text-xs">
                  Send notification about this charge to {petName}&apos;s owner
                </p>
              </div>
              <Switch
                id="notify-customer"
                checked={notifyCustomer}
                onCheckedChange={setNotifyCustomer}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Add Charge</Button>
            </div>
          </div>
        )}

        {/* Existing Adjustments */}
        {adjustments.length > 0 && (
          <div className="space-y-2">
            <Label>Applied Adjustments</Label>
            <div className="space-y-2">
              {adjustments.map((adjustment) => {
                const reasonData = ADJUSTMENT_REASONS.find(
                  (r) => r.value === adjustment.reason,
                );
                return (
                  <div
                    key={adjustment.id}
                    className="bg-card flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline">
                          {reasonData?.label || adjustment.customReason}
                        </Badge>
                        <span className="text-lg font-semibold">
                          +${adjustment.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {adjustment.description}
                      </p>
                      <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                        <span>
                          Added by {adjustment.addedBy} on{" "}
                          {new Date(adjustment.addedAt).toLocaleString()}
                        </span>
                        {adjustment.customerNotified ? (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="mr-1 h-3 w-3" />
                            Customer Notified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No Notification
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveAdjustment(adjustment.id)}
                        className="ml-2"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adjustments.length === 0 && !isAdding && (
          <div className="text-muted-foreground py-6 text-center text-sm">
            No price adjustments added yet
          </div>
        )}

        {/* Warning if total changed significantly */}
        {totalAdjustments > 0 && totalAdjustments > basePrice * 0.3 && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
            <AlertCircle className="mt-0.5 size-4 text-yellow-600" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Total adjustments exceed 30% of base price. Ensure customer is
              aware of additional charges.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
