"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BelongingItem, YipyyGoFormSectionProps } from "@/types/yipyygo";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import { useShellText } from "@/lib/shell/use-shell-text";

type BelongingsSectionProps = YipyyGoFormSectionProps;

// An item's name, by CATALOGUE KEY; the value stored is `value`.
const BELONGING_TYPES: { value: BelongingItem["type"]; labelKey: string }[] = [
  { value: "food", labelKey: "belongFood" },
  { value: "treats", labelKey: "belongTreats" },
  { value: "bedding", labelKey: "belongBedding" },
  { value: "toys", labelKey: "belongToys" },
  { value: "crate", labelKey: "belongCrate" },
  { value: "leash_collar", labelKey: "belongLeashCollar" },
  { value: "medication_bag", labelKey: "belongMedicationBag" },
  { value: "other", labelKey: "other" },
];

export function BelongingsSection({
  formData,
  updateFormData,
  config,
  booking,
  onNext,
  onBack,
  isLastSection,
}: BelongingsSectionProps) {
  const t = useShellText("yipyygo");
  const [otherNote, setOtherNote] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const effectiveTemplate = config
    ? getFormTemplateForService(config, booking.service ?? "")
    : null;

  const _selectedTypes = new Set(formData.belongings.map((b) => b.type));

  const toggleBelonging = (type: BelongingItem["type"]) => {
    if (type === "other") {
      const hasOther = formData.belongings.some((b) => b.type === "other");
      if (hasOther) {
        updateFormData({
          belongings: formData.belongings.filter((b) => b.type !== "other"),
        });
        setShowOtherInput(false);
      } else {
        setShowOtherInput(true);
      }
      return;
    }
    const existing = formData.belongings.find((b) => b.type === type);
    if (existing) {
      updateFormData({
        belongings: formData.belongings.filter((b) => b.id !== existing.id),
      });
    } else {
      const item: BelongingItem = {
        id: `item-${crypto.randomUUID()}`,
        type,
      };
      updateFormData({ belongings: [...formData.belongings, item] });
    }
  };

  const handleAddOther = () => {
    if (!otherNote.trim()) return;
    const item: BelongingItem = {
      id: `item-${crypto.randomUUID()}`,
      type: "other",
      notes: otherNote.trim(),
    };
    updateFormData({ belongings: [...formData.belongings, item] });
    setOtherNote("");
  };

  const handleRemoveItem = (id: string) => {
    const item = formData.belongings.find((b) => b.id === id);
    const otherCount = formData.belongings.filter(
      (b) => b.type === "other",
    ).length;
    updateFormData({
      belongings: formData.belongings.filter((b) => b.id !== id),
    });
    if (item?.type === "other" && otherCount <= 1) setShowOtherInput(false);
  };

  const handleUpdateQuantity = (id: string, quantity: number | undefined) => {
    updateFormData({
      belongings: formData.belongings.map((b) =>
        b.id === id
          ? { ...b, quantity: quantity && quantity > 0 ? quantity : undefined }
          : b,
      ),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("belongings")}</CardTitle>
        <CardDescription>{t("tapToAddWhatYou")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chips: one-tap add/remove */}
        <div className="flex flex-wrap gap-2">
          {BELONGING_TYPES.map(({ value, labelKey }) => {
            const isSelected =
              value === "other"
                ? showOtherInput ||
                  formData.belongings.some((b) => b.type === "other")
                : formData.belongings.some((b) => b.type === value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleBelonging(value)}
                className={cn(
                  `inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors`,
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : `border-input bg-background hover:bg-accent hover:text-accent-foreground`,
                )}
              >
                {t(labelKey)}
                {value === "other" &&
                  formData.belongings.some((b) => b.type === "other") && (
                    <span className="bg-background/20 rounded-full px-1.5 text-xs">
                      {
                        formData.belongings.filter((b) => b.type === "other")
                          .length
                      }
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        {/* Other – optional short note */}
        {(showOtherInput ||
          formData.belongings.some((b) => b.type === "other")) && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Other (describe)</Label>
            <div className="flex gap-2">
              <Input
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder={t("eGBlanketSpecialToy")}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddOther())
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOther}
                disabled={!otherNote.trim()}
              >
                {t("add")}
              </Button>
            </div>
          </div>
        )}

        {/* Selected items with optional qty */}
        {formData.belongings.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t("bringing")}</Label>
            <ul className="space-y-2">
              {formData.belongings.map((item) => (
                <li
                  key={item.id}
                  className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-medium">
                      {(() => {
                        const type = BELONGING_TYPES.find(
                          (entry) => entry.value === item.type,
                        );
                        return type ? t(type.labelKey) : item.type;
                      })()}
                    </span>
                    {item.notes && item.type === "other" && (
                      <span className="text-muted-foreground truncate">
                        — {item.notes}
                      </span>
                    )}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        handleUpdateQuantity(
                          item.id,
                          e.target.value
                            ? parseInt(e.target.value, 10)
                            : undefined,
                        )
                      }
                      placeholder={t("qty")}
                      className="bg-background w-14 rounded-sm border px-2 py-1 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {effectiveTemplate?.features.photoUploads && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t("photoOfLabeledBagsOptional")}
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  updateFormData({
                    belongingsPhotoUrl: URL.createObjectURL(file),
                  });
              }}
            />
            {formData.belongingsPhotoUrl && (
              <div className="relative size-32 overflow-hidden rounded-lg border">
                <Image
                  src={formData.belongingsPhotoUrl}
                  alt={t("belongings")}
                  width={128}
                  height={128}
                  className="size-full object-cover"
                  unoptimized
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 size-6"
                  onClick={() =>
                    updateFormData({ belongingsPhotoUrl: undefined })
                  }
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}
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
