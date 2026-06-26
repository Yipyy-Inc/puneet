"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyDiscount } from "@/lib/credits-store";
import { FacilityPicker } from "./facility-picker";
import {
  DISCOUNT_DURATIONS,
  DISCOUNT_REASONS,
  formatMoney,
} from "./credit-utils";

export function ApplyDiscountModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [valueType, setValueType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [duration, setDuration] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const valueNum = Number(value);
  const valid =
    facilityId !== null &&
    valueNum > 0 &&
    (valueType !== "percent" || valueNum <= 100) &&
    duration !== "" &&
    reason !== "";

  const summary =
    valueType === "percent"
      ? `${valueNum || 0}% off`
      : `${formatMoney(valueNum || 0)} off`;

  const reset = () => {
    setFacilityId(null);
    setFacilityName("");
    setValueType("percent");
    setValue("");
    setDuration("");
    setReason("");
    setNote("");
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = () => {
    if (!valid || facilityId === null) return;
    applyDiscount({
      facilityId,
      facilityName,
      valueType,
      value: valueNum,
      duration,
      reason,
      note,
    });
    toast.success(`${summary} discount applied to ${facilityName}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Apply a recurring discount to a facility&apos;s subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Facility</Label>
            <FacilityPicker
              value={facilityId}
              onChange={(id, name) => {
                setFacilityId(id);
                setFacilityName(name);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Discount type</Label>
            <RadioGroup
              value={valueType}
              onValueChange={(v) => setValueType(v as "percent" | "fixed")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percent" id="dt-percent" />
                <Label htmlFor="dt-percent" className="font-normal">
                  Percentage (%)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed" id="dt-fixed" />
                <Label htmlFor="dt-fixed" className="font-normal">
                  Fixed amount ($)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount-value">
                {valueType === "percent" ? "Percentage" : "Amount (USD)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                max={valueType === "percent" ? "100" : undefined}
                step={valueType === "percent" ? "1" : "0.01"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={valueType === "percent" ? "e.g. 15" : "0.00"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DISCOUNT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discount-note">Internal note (optional)</Label>
            <Textarea
              id="discount-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context for the audit trail…"
              rows={3}
            />
          </div>

          {valid && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-700 dark:text-violet-300">
              Applying <span className="font-semibold">{summary}</span> to{" "}
              <span className="font-semibold">{facilityName}</span> for{" "}
              <span className="font-semibold">{duration}</span>.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid}
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
