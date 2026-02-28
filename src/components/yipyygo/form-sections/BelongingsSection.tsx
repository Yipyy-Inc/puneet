"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload, X } from "lucide-react";
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

const BELONGING_TYPES = [
  { value: "food", label: "Food" },
  { value: "treats", label: "Treats" },
  { value: "bedding", label: "Bedding" },
  { value: "toys", label: "Toys" },
  { value: "crate", label: "Crate" },
  { value: "leash_collar", label: "Leash/Collar" },
  { value: "medication_bag", label: "Medication Bag" },
  { value: "other", label: "Other" },
] as const;

export function BelongingsSection({
  formData,
  updateFormData,
  config,
  onNext,
  onBack,
  isLastSection,
}: BelongingsSectionProps) {
  const [newItem, setNewItem] = useState<Partial<BelongingItem>>({
    type: "food",
  });

  const handleAddItem = () => {
    if (!newItem.type) return;
    
    const item: BelongingItem = {
      id: `item-${Date.now()}`,
      type: newItem.type as BelongingItem["type"],
      quantity: newItem.quantity,
      notes: newItem.notes,
    };
    
    updateFormData({
      belongings: [...formData.belongings, item],
    });
    
    setNewItem({ type: "food" });
  };

  const handleRemoveItem = (id: string) => {
    updateFormData({
      belongings: formData.belongings.filter((item) => item.id !== id),
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<BelongingItem>) => {
    updateFormData({
      belongings: formData.belongings.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const handlePhotoUpload = (id: string, file: File) => {
    // In production, upload to storage and get URL
    const photoUrl = URL.createObjectURL(file);
    handleUpdateItem(id, { photoUrl });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Belongings</CardTitle>
        <CardDescription>
          Check off items you're bringing and optionally upload photos of labeled bags
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Items */}
        {formData.belongings.length > 0 && (
          <div className="space-y-3">
            {formData.belongings.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {BELONGING_TYPES.find((t) => t.value === item.type)?.label}
                    </span>
                    {item.quantity && (
                      <span className="text-sm text-muted-foreground">
                        (Qty: {item.quantity})
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}
                  {item.photoUrl && (
                    <div className="relative w-24 h-24 border rounded">
                      <img
                        src={item.photoUrl}
                        alt="Belonging photo"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Item */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <select
                className="w-full h-10 px-3 border rounded-md"
                value={newItem.type}
                onChange={(e) =>
                  setNewItem({ ...newItem, type: e.target.value as any })
                }
              >
                {BELONGING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Quantity (optional)</Label>
              <Input
                type="number"
                min="1"
                value={newItem.quantity || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    quantity: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="e.g., 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={newItem.notes || ""}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="e.g., Blue bag"
              />
            </div>
          </div>
          
          {config?.formTemplate.features.photoUploads && (
            <div className="space-y-2">
              <Label>Photo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewItem({ ...newItem, photoUrl: URL.createObjectURL(file) });
                  }
                }}
              />
            </div>
          )}
          
          <Button onClick={handleAddItem} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Photo Upload for All Belongings */}
        {config?.formTemplate.features.photoUploads && (
          <div className="space-y-2">
            <Label>Upload Photo of All Belongings / Labeled Bags (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  updateFormData({
                    belongingsPhotoUrl: URL.createObjectURL(file),
                  });
                }
              }}
            />
            {formData.belongingsPhotoUrl && (
              <div className="relative w-48 h-48 border rounded">
                <img
                  src={formData.belongingsPhotoUrl}
                  alt="Belongings photo"
                  className="w-full h-full object-cover rounded"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => updateFormData({ belongingsPhotoUrl: undefined })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
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
