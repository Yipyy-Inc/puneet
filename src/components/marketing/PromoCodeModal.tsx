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
import { Tag } from "lucide-react";
import { toast } from "sonner";

import { useSavePromoCode } from "@/lib/api/promo-codes";
import { formatWeekday } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { MarketingPromoCode } from "@/types/marketing";

interface PromoCodeModalProps {
  /** The code being edited; absent for a new one. */
  code?: MarketingPromoCode | null;
  onClose: () => void;
}

// ── A CODE IS SAVED, AND WHAT IT PROMISES IS WHAT THE BILL CHECKS ─────────
//
// Save was `console.log("Saving promo code:", formData)`. It writes
// `promo_codes` now (20260911173538), and each field is one the checkout's
// `redeem_promo_code` enforces: the dates, the limits, first visit only, the
// days of the week, the service. Two fields that promised more than that are
// gone — "Auto-apply" (nothing applies a code on its own) and a free-text
// "Service name" for a free service, which a bill could never match; a free
// service is now one of the services the facility runs.
const SERVICES = ["boarding", "daycare", "grooming", "training"] as const;

export function PromoCodeModal({ code, onClose }: PromoCodeModalProps) {
  const { t, fill, locale } = useStaffText("promoCodes");
  const save = useSavePromoCode();
  const [formData, setFormData] = useState(() => ({
    code: code?.code ?? "",
    description: code?.description ?? "",
    type: (code?.type ?? "percentage") as
      | "percentage"
      | "fixed"
      | "free_service",
    value: code ? String(code.value) : "",
    minPurchase: code?.minPurchase ? String(code.minPurchase) : "",
    maxDiscount: code?.maxDiscount ? String(code.maxDiscount) : "",
    validFrom: code?.validFrom ?? "",
    validUntil: code?.validUntil ?? "",
    usageLimit: code?.usageLimit ? String(code.usageLimit) : "",
    perCustomerLimit: code?.perCustomerLimit
      ? String(code.perCustomerLimit)
      : "",
    appliesTo:
      code && code.type !== "free_service"
        ? (code.applicableServices?.[0] ?? "all")
        : "all",
    firstTimeCustomer: code?.conditions?.firstTimeCustomer ?? false,
    specificDays: code?.conditions?.specificDays ?? ([] as string[]),
  }));

  const generateCode = () => {
    const code =
      "PROMO" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData({ ...formData, code });
  };

  const optionalNumber = (v: string) => (v.trim() ? Number(v) : undefined);
  const handleSave = () => {
    const payload: Partial<MarketingPromoCode> = {
      code: formData.code,
      description: formData.description,
      type: formData.type,
      value:
        formData.type === "free_service"
          ? formData.value
          : Number(formData.value),
      minPurchase: optionalNumber(formData.minPurchase),
      maxDiscount:
        formData.type === "percentage"
          ? optionalNumber(formData.maxDiscount)
          : undefined,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      usageLimit: optionalNumber(formData.usageLimit),
      perCustomerLimit: optionalNumber(formData.perCustomerLimit),
      applicableServices:
        formData.type === "free_service" || formData.appliesTo === "all"
          ? []
          : [formData.appliesTo],
      autoApply: false,
      conditions: {
        firstTimeCustomer: formData.firstTimeCustomer,
        specificDays: formData.specificDays,
      },
    };
    save.mutate(
      { id: code?.id, code: payload },
      {
        onSuccess: (saved) => {
          toast.success(
            fill(code ? "updated" : "created", { code: saved.code }),
          );
          onClose();
        },
        onError: (error) =>
          toast.error(t("notSaved"), {
            description: error instanceof Error ? error.message : undefined,
          }),
      },
    );
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
        <DialogTitle>{code ? t("editTitle") : "Create Promo Code"}</DialogTitle>
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
              onValueChange={(value: "percentage" | "fixed" | "free_service") =>
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
              {formData.type === "free_service" && t("freeService")}
            </Label>
            {formData.type === "free_service" ? (
              <Select
                value={formData.value}
                onValueChange={(value) => setFormData({ ...formData, value })}
              >
                <SelectTrigger id="value">
                  <SelectValue placeholder={t("pickService")} />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`service_${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                type="number"
                min={0}
              />
            )}
          </div>
        </div>

        {formData.type !== "free_service" && (
          <div className="space-y-2">
            <Label htmlFor="appliesTo">{t("appliesTo")}</Label>
            <Select
              value={formData.appliesTo}
              onValueChange={(appliesTo) =>
                setFormData({ ...formData, appliesTo })
              }
            >
              <SelectTrigger id="appliesTo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allServices")}</SelectItem>
                <SelectItem value="retail">{t("service_retail")}</SelectItem>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`service_${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Optional Limits */}
        <Card>
          <CardContent className="space-y-4 pt-6">
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
          <CardContent className="space-y-4 pt-6">
            <Label className="text-base">{t("conditions")}</Label>

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
                className="cursor-pointer text-sm/none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                    className="cursor-pointer"
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
                    {formatWeekday((daysOfWeek.indexOf(day) + 1) % 7, locale)}
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
            save.isPending ||
            !formData.code ||
            !formData.value ||
            !formData.validFrom ||
            !formData.validUntil
          }
        >
          <Tag className="mr-2 size-4" />
          {code ? t("saveChanges") : "Create Promo Code"}
        </Button>
      </DialogFooter>
    </>
  );
}
