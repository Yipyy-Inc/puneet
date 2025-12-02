"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { loyaltySettings } from "@/data/marketing";
import { Award, Settings } from "lucide-react";

interface LoyaltySettingsModalProps {
  onClose: () => void;
}

export function LoyaltySettingsModal({ onClose }: LoyaltySettingsModalProps) {
  const [formData, setFormData] = useState({
    enabled: loyaltySettings.enabled,
    pointsPerDollar: loyaltySettings.pointsPerDollar,
    pointsValue: loyaltySettings.pointsValue,
    expirationMonths: loyaltySettings.expirationMonths || 12,
  });

  const handleSave = () => {
    console.log("Saving loyalty settings:", formData);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Loyalty Program Settings</DialogTitle>
        <DialogDescription>
          Configure points, rewards, and tier rules
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Enable/Disable */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enabled: checked as boolean })
            }
          />
          <label
            htmlFor="enabled"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Enable loyalty program
          </label>
        </div>

        {formData.enabled && (
          <>
            {/* Points Configuration */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base">Points Configuration</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsPerDollar">
                      Points Per Dollar Spent
                    </Label>
                    <Input
                      id="pointsPerDollar"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={formData.pointsPerDollar}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pointsPerDollar: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., 1 = earn 1 point per $1 spent
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointsValue">100 Points Value ($)</Label>
                    <Input
                      id="pointsValue"
                      type="number"
                      min="1"
                      value={formData.pointsValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pointsValue: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., 5 = 100 points = $5 discount
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Points Expiration (months)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    min="1"
                    value={formData.expirationMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expirationMonths: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Points will expire after this many months of inactivity
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base mb-4 block">Preview</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Customer spends $100</span>
                    <span className="font-semibold">
                      Earns {100 * formData.pointsPerDollar} points
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Customer has 100 points</span>
                    <span className="font-semibold">
                      Worth ${formData.pointsValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Points expire after</span>
                    <span className="font-semibold">
                      {formData.expirationMonths} months
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier Management Info */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base mb-2 block">Loyalty Tiers</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Current tiers: {loyaltySettings.tiers.length} (Bronze, Silver,
                  Gold, Platinum)
                </p>
                <div className="space-y-2">
                  {loyaltySettings.tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                        <span className="font-medium">{tier.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({tier.minPoints}+ pts)
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {tier.discountPercentage}% off
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Tier customization coming soon
                </p>
              </CardContent>
            </Card>

            {/* Auto-Reward Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <Label className="text-base">Auto-Reward</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Points are automatically earned with each paid booking.
                      Customers can redeem points at checkout for discounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Settings className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </DialogFooter>
    </>
  );
}
