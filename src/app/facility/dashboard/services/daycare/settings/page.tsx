"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Save, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import { MaxPetsPerStaffCard } from "@/components/smart-insights/MaxPetsPerStaffCard";
import { DropOffHoursCard } from "@/components/facility/services/drop-off-hours-card";
import type { ModuleConfig } from "@/types/facility";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

export default function DaycareSettingsPage() {
  const settingsPath = useSettingsHref();
  const et = useSettingsText().section("evaluations");
  const { daycare, updateDaycare } = useSettings();
  const [formData, setFormData] = useState<ModuleConfig>(daycare);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);

  const updateFormData = (updates: Partial<ModuleConfig>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    updateDaycare(newData);
  };

  const handleCancel = (section: string) => {
    setFormData(daycare);
    updateDaycare(daycare);
    if (section === "basic") setIsEditingBasic(false);
    if (section === "media") setIsEditingMedia(false);
  };

  const handleSave = (section: string) => {
    toast.success("Settings saved successfully");
    if (section === "basic") setIsEditingBasic(false);
    if (section === "media") setIsEditingMedia(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Client and staff facing names, slogan, and description
                </CardDescription>
              </div>
              {isEditingBasic ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel("basic")}
                  >
                    <X className="mr-2 size-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("basic")}>
                    <Save className="mr-2 size-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingBasic(true)}
                >
                  <Edit className="mr-2 size-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Facing Name</Label>
                <Input
                  value={formData.clientFacingName}
                  onChange={(e) =>
                    updateFormData({ clientFacingName: e.target.value })
                  }
                  placeholder="e.g., Happy Paws Daycare"
                  disabled={!isEditingBasic}
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Facing Name</Label>
                <Input
                  value={formData.staffFacingName}
                  onChange={(e) =>
                    updateFormData({ staffFacingName: e.target.value })
                  }
                  placeholder="e.g., Daycare Management"
                  disabled={!isEditingBasic}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input
                value={formData.slogan}
                onChange={(e) => updateFormData({ slogan: e.target.value })}
                placeholder="e.g., Where Every Paw Feels at Home"
                disabled={!isEditingBasic}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  updateFormData({ description: e.target.value })
                }
                rows={4}
                placeholder="Describe the daycare service..."
                disabled={!isEditingBasic}
              />
            </div>
          </CardContent>
        </Card>

        {/* A "Pricing — Base price for the daycare service" card stood here,
            one number for the whole service, defaulting to a fixture's. What a
            daycare costs is set in Daycare → Rates, per rate card,
            and the booking wizard reads it there. */}

        {/* Media */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Media</CardTitle>
                <CardDescription>
                  Banner image for the daycare service
                </CardDescription>
              </div>
              {isEditingMedia ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel("media")}
                  >
                    <X className="mr-2 size-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("media")}>
                    <Save className="mr-2 size-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMedia(true)}
                >
                  <Edit className="mr-2 size-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Banner Image URL</Label>
                <Input
                  value={formData.bannerImage || ""}
                  onChange={(e) =>
                    updateFormData({ bannerImage: e.target.value || undefined })
                  }
                  placeholder="e.g., /services/daycare.jpg"
                  disabled={!isEditingMedia}
                />
              </div>
              {formData.bannerImage && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="bg-muted relative h-48 w-full overflow-hidden rounded-lg border">
                    <Image
                      src={formData.bannerImage}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Image preview - actual display may vary
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Whether daycare needs an evaluation first lives on the evaluation
            setup page since 2026-10-02 — one rule (lib/evaluations/
            requirement.ts). This card was a second editor of it. */}
        <Card>
          <CardHeader>
            <CardTitle>{et("moduleCardTitle")}</CardTitle>
            <CardDescription>
              {et("moduleCardText")}{" "}
              <Link
                href={settingsPath("evaluations")}
                className="text-primary font-semibold"
              >
                {et("moduleCardLink")}
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* What the booking wizard offers for drop-off and pick-up, per
            day type (the client, 2026-10-01). */}
        <DropOffHoursCard service="daycare" />

        <MaxPetsPerStaffCard service="daycare" />
      </div>
    </div>
  );
}
