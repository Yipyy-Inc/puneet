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
import type { YipyyGoFormData, BelongingItem } from "@/data/yipyygo-forms";
import type { YipyyGoConfig } from "@/data/yipyygo-config";

interface BelongingsSectionProps {
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

const BELONGING_TYPES: { value: BelongingItem["type"]; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "treats", label: "Treats" },
  { value: "bedding", label: "Bedding" },
  { value: "toys", label: "Toys" },
  { value: "crate", label: "Crate" },
  { value: "leash_collar", label: "Leash/Collar" },
  { value: "medication_bag", label: "Medication Bag" },
  { value: "other", label: "Other" },
];

export function BelongingsSection({
  formData,
  updateFormData,
  config,
  onNext,
  onBack,
  isLastSection,
}: BelongingsSectionProps) {
  const [otherNote, setOtherNote] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);

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
        <CardTitle>Belongings</CardTitle>
        <CardDescription>
          Tap to add what you’re bringing — no typing needed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chips: one-tap add/remove */}
        <div className="flex flex-wrap gap-2">
          {BELONGING_TYPES.map(({ value, label }) => {
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
                {label}
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
                placeholder="e.g., Blanket, special toy"
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
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Selected items with optional qty */}
        {formData.belongings.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Bringing</Label>
            <ul className="space-y-2">
              {formData.belongings.map((item) => (
                <li
                  key={item.id}
                  className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-medium">
                      {BELONGING_TYPES.find((t) => t.value === item.type)
                        ?.label ?? item.type}
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
                      placeholder="Qty"
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

        {config?.formTemplate.features.photoUploads && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Photo of labeled bags (optional)
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
                  alt="Belongings"
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
            Back
          </Button>
          <Button onClick={onNext}>{isLastSection ? "Review" : "Next"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
