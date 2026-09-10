"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import type { YipyyGoAddOn, YipyyGoFormSectionProps } from "@/types/yipyygo";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatMoney } from "@/lib/i18n/format";

type AddOnsSectionProps = YipyyGoFormSectionProps;

// Mock add-ons - in production, these would come from facility config
const AVAILABLE_ADD_ONS: YipyyGoAddOn[] = [
  {
    id: "extra-playtime",
    name: "Extra Playtime",
    description: "Additional 30 minutes of play", // french-ok: stand-in for facility-configured service text (debt map)
    price: 15,
    selected: false,
  },
  {
    id: "enrichment",
    name: "Enrichment Activities",
    description: "Puzzle toys and mental stimulation", // french-ok: stand-in for facility-configured service text
    price: 20,
    selected: false,
  },
  {
    id: "grooming-addon",
    name: "Grooming Add-on",
    description: "Bath and brush during stay", // french-ok: stand-in for facility-configured service text
    price: 35,
    selected: false,
  },
  {
    id: "massage",
    name: "Massage Therapy",
    description: "15-minute relaxation massage",
    price: 25,
    selected: false,
  },
  {
    id: "video-call",
    name: "Video Call",
    description: "15-minute video call with your pet",
    price: 10,
    selected: false,
  },
];

export function AddOnsSection({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLastSection,
}: AddOnsSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  // Initialize add-ons if not set
  const addOns =
    formData.addOns.length > 0
      ? formData.addOns
      : AVAILABLE_ADD_ONS.map((ao) => ({ ...ao, selected: false }));

  const handleToggleAddOn = (id: string) => {
    const updated = addOns.map((ao) =>
      ao.id === id
        ? {
            ...ao,
            selected: !ao.selected,
            quantity: ao.selected ? undefined : 1,
          }
        : ao,
    );
    updateFormData({ addOns: updated });
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    const updated = addOns.map((ao) =>
      ao.id === id
        ? { ...ao, quantity: quantity > 0 ? quantity : undefined }
        : ao,
    );
    updateFormData({ addOns: updated });
  };

  const totalAddOnsPrice = addOns
    .filter((ao) => ao.selected)
    .reduce((sum, ao) => sum + ao.price * (ao.quantity || 1), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("addOnsTitle")}</CardTitle>
        <CardDescription>
          {t("enhanceStay").replace("{pet}", formData.petName)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {addOns.map((addOn) => (
          <div
            key={addOn.id}
            className={`flex items-start gap-3 rounded-lg border p-4 ${addOn.selected ? "border-primary bg-primary/5" : ""} `}
          >
            <Checkbox
              checked={addOn.selected}
              onCheckedChange={() => handleToggleAddOn(addOn.id)}
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <Label
                    className="cursor-pointer text-base font-medium"
                    onClick={() => handleToggleAddOn(addOn.id)}
                  >
                    {addOn.name}
                  </Label>
                  {addOn.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {addOn.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatMoney(addOn.price, locale)}
                  </p>
                </div>
              </div>
              {addOn.selected && (
                <div className="mt-3 flex items-center gap-2">
                  <Label className="text-sm">{t("quantity")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={addOn.quantity || 1}
                    onChange={(e) =>
                      handleQuantityChange(
                        addOn.id,
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">
                    = {formatMoney((addOn.quantity || 1) * addOn.price, locale)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {totalAddOnsPrice > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("totalAddOns")}</span>
              <span className="text-lg font-bold">
                <DollarSign className="inline size-4" />
                {totalAddOnsPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("theseWillBeAddedTo")}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onNext}>
            {isLastSection ? t("review") : t("next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
