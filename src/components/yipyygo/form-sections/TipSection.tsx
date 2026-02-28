"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import type { YipyyGoFormData, TipSelection } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface TipSectionProps {
  formData: YipyyGoFormData;
  updateFormData: (updates: Partial<YipyyGoFormData>) => void;
  booking: any;
  pet: any;
  customer: any;
  config: YipyyGoConfig | null;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLastSection: boolean;
}

const TIP_PERCENTAGES = [10, 15, 20, 25];

export function TipSection({
  formData,
  updateFormData,
  booking,
  onNext,
  onBack,
  isLastSection,
}: TipSectionProps) {
  const tip = formData.tip || {
    type: "percentage",
    percentage: 15,
    appliesTo: "stay_total",
  };

  const stayTotal = booking?.totalCost || 0;

  const calculateTipAmount = () => {
    if (tip.type === "percentage") {
      return (stayTotal * (tip.percentage || 0)) / 100;
    }
    return tip.customAmount || 0;
  };

  const tipAmount = calculateTipAmount();

  const handleUpdate = (updates: Partial<TipSelection>) => {
    updateFormData({
      tip: { ...tip, ...updates },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tip (Optional)</CardTitle>
        <CardDescription>
          Show appreciation to the staff caring for {formData.petName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tip Presets</Label>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PERCENTAGES.map((percent) => (
              <Button
                key={percent}
                variant={tip.type === "percentage" && tip.percentage === percent ? "default" : "outline"}
                onClick={() => handleUpdate({ type: "percentage", percentage: percent })}
                className="w-full"
              >
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Custom Amount</Label>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={tip.type === "custom" ? tip.customAmount || "" : ""}
              onChange={(e) =>
                handleUpdate({
                  type: "custom",
                  customAmount: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="Enter custom amount"
            />
            <Button
              variant={tip.type === "custom" ? "default" : "outline"}
              onClick={() => handleUpdate({ type: "custom", customAmount: 0 })}
            >
              Custom
            </Button>
          </div>
        </div>

        {tipAmount > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tip Amount:</span>
              <span className="text-lg font-bold">
                <DollarSign className="inline h-4 w-4" />
                {tipAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Applies to: {tip.appliesTo === "stay_total" ? "Stay Total" : "Selected Services"}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>
            {isLastSection ? "Review" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
