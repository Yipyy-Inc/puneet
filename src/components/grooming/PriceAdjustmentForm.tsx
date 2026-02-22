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
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  DollarSign,
  X,
  Bell,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { PriceAdjustment, PriceAdjustmentReason } from "@/data/grooming";

interface PriceAdjustmentFormProps {
  appointmentId: string;
  petName: string;
  basePrice: number;
  currentTotal: number;
  adjustments: PriceAdjustment[];
  onAddAdjustment: (adjustment: Omit<PriceAdjustment, "id" | "addedAt">) => void;
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
  appointmentId,
  petName,
  basePrice,
  currentTotal,
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

  const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
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
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Charge
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Base Price</p>
              <p className="font-medium text-lg">${basePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Adjustments</p>
              <p className="font-medium text-lg">
                {totalAdjustments > 0 ? "+" : ""}${totalAdjustments.toFixed(2)}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground font-medium">Total Price</p>
                <p className="font-bold text-xl">
                  ${newTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Adjustment Form */}
        {isAdding && !readOnly && (
          <div className="p-4 rounded-lg border-2 border-dashed space-y-4">
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
                        <div className="text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason?.defaultAmount && (
                <p className="text-xs text-muted-foreground">
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

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div className="space-y-0.5">
                <Label htmlFor="notify-customer" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notify Customer
                </Label>
                <p className="text-xs text-muted-foreground">
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
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {reasonData?.label || adjustment.customReason}
                        </Badge>
                        <span className="font-semibold text-lg">
                          +${adjustment.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {adjustment.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          Added by {adjustment.addedBy} on{" "}
                          {new Date(adjustment.addedAt).toLocaleString()}
                        </span>
                        {adjustment.customerNotified ? (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
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
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adjustments.length === 0 && !isAdding && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No price adjustments added yet
          </div>
        )}

        {/* Warning if total changed significantly */}
        {totalAdjustments > 0 && totalAdjustments > basePrice * 0.3 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
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
