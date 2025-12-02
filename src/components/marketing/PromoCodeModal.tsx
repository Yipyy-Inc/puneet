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
import { Badge } from "@/components/ui/badge";
import { Tag, Calendar } from "lucide-react";

interface PromoCodeModalProps {
  onClose: () => void;
}

export function PromoCodeModal({ onClose }: PromoCodeModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "percentage" as "percentage" | "fixed" | "free_service",
    value: "",
    minPurchase: "",
    maxDiscount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    perCustomerLimit: "",
    autoApply: false,
    firstTimeCustomer: false,
    specificDays: [] as string[],
  });

  const generateCode = () => {
    const code =
      "PROMO" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code });
  };

  const handleSave = () => {
    console.log("Saving promo code:", formData);
    onClose();
  };

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Promo Code</DialogTitle>
        <DialogDescription>
          Set up discount codes and special offers
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Promo Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Promo Code *</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., SUMMER25"
              className="font-mono"
            />
            <Button onClick={generateCode} variant="outline">
              Generate
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Brief description of this promo..."
            rows={2}
          />
        </div>

        {/* Discount Type & Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Discount Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Off</SelectItem>
                <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                <SelectItem value="free_service">Free Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              {formData.type === "percentage" && "Percentage (%)"}
              {formData.type === "fixed" && "Amount ($)"}
              {formData.type === "free_service" && "Service Name"}
            </Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              placeholder={
                formData.type === "free_service" ? "e.g., Nail Trim" : ""
              }
              type={formData.type !== "free_service" ? "number" : "text"}
            />
          </div>
        </div>

        {/* Optional Limits */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base">Optional Limits</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    setFormData({ ...formData, minPurchase: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              {formData.type === "percentage" && (
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Max Discount ($)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscount: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Total Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: e.target.value })
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
                <Input
                  id="perCustomerLimit"
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perCustomerLimit: e.target.value,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valid Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valid From *</Label>
            <Input
              id="validFrom"
              type="date"
              value={formData.validFrom}
              onChange={(e) =>
                setFormData({ ...formData, validFrom: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid Until *</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) =>
                setFormData({ ...formData, validUntil: e.target.value })
              }
            />
          </div>
        </div>

        {/* Conditions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base">Conditions (Auto-Apply Rules)</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoApply"
                checked={formData.autoApply}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoApply: checked as boolean })
                }
              />
              <label
                htmlFor="autoApply"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Auto-apply this promo code when conditions are met
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="firstTimeCustomer"
                checked={formData.firstTimeCustomer}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    firstTimeCustomer: checked as boolean,
                  })
                }
              />
              <label
                htmlFor="firstTimeCustomer"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                First-time customers only
              </label>
            </div>

            <div className="space-y-2">
              <Label>Specific Days (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <Badge
                    key={day}
                    variant={
                      formData.specificDays.includes(day)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      if (formData.specificDays.includes(day)) {
                        setFormData({
                          ...formData,
                          specificDays: formData.specificDays.filter(
                            (d) => d !== day,
                          ),
                        });
                      } else {
                        setFormData({
                          ...formData,
                          specificDays: [...formData.specificDays, day],
                        });
                      }
                    }}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            !formData.code ||
            !formData.value ||
            !formData.validFrom ||
            !formData.validUntil
          }
        >
          <Tag className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>
      </DialogFooter>
    </>
  );
}
