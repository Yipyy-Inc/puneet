"use client";

import { useState } from "react";
import Image from "next/image";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { useModulesConfig } from "@/hooks/use-modules-config";
import type { ModuleConfig } from "@/data/modules-config";

export default function DaycareSettingsPage() {
  const { configs, updateConfig } = useModulesConfig();
  const [formData, setFormData] = useState<ModuleConfig>(configs.daycare);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const updateFormData = (updates: Partial<ModuleConfig>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    updateConfig("daycare", newData);
  };

  const updateNested = <T extends keyof ModuleConfig>(
    key: T,
    nestedKey: string,
    value: unknown,
  ) => {
    const newData = {
      ...formData,
      [key]: {
        ...(formData[key] as Record<string, unknown>),
        [nestedKey]: value,
      },
    };
    setFormData(newData);
    updateConfig("daycare", newData);
  };

  const handleCancel = (section: string) => {
    setFormData(configs.daycare);
    updateConfig("daycare", configs.daycare);
    if (section === "basic") setIsEditingBasic(false);
    if (section === "pricing") setIsEditingPricing(false);
    if (section === "media") setIsEditingMedia(false);
    if (section === "evaluation") setIsEditingEvaluation(false);
    if (section === "status") setIsEditingStatus(false);
  };

  const handleSave = (section: string) => {
    toast.success("Settings saved successfully");
    if (section === "basic") setIsEditingBasic(false);
    if (section === "pricing") setIsEditingPricing(false);
    if (section === "media") setIsEditingMedia(false);
    if (section === "evaluation") setIsEditingEvaluation(false);
    if (section === "status") setIsEditingStatus(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Daycare Module Settings
        </h2>
        <p className="text-muted-foreground">
          Configure the daycare module configuration
        </p>
      </div>

      <div className="grid gap-6">
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
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("basic")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingBasic(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
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

        {/* Pricing */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Base price for the daycare service
                </CardDescription>
              </div>
              {isEditingPricing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel("pricing")}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("pricing")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingPricing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Base Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) =>
                  updateFormData({ basePrice: parseFloat(e.target.value) || 0 })
                }
                className="w-32"
                disabled={!isEditingPricing}
              />
            </div>
          </CardContent>
        </Card>

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
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("media")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMedia(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
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
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
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
                  <p className="text-xs text-muted-foreground">
                    Image preview - actual display may vary
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evaluation Settings</CardTitle>
                <CardDescription>
                  Configure evaluation requirements for daycare
                </CardDescription>
              </div>
              {isEditingEvaluation ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel("evaluation")}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("evaluation")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingEvaluation(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Evaluation</Label>
                <p className="text-sm text-muted-foreground">
                  Require evaluation for daycare bookings
                </p>
              </div>
              <Switch
                checked={formData.settings.evaluation.enabled}
                onCheckedChange={(checked) =>
                  updateNested("settings", "evaluation", {
                    ...formData.settings.evaluation,
                    enabled: checked,
                  })
                }
                disabled={!isEditingEvaluation}
              />
            </div>
            {formData.settings.evaluation.enabled && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Optional Evaluation</Label>
                    <p className="text-sm text-muted-foreground">
                      Make evaluation optional for clients
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.evaluation.optional || false}
                    onCheckedChange={(checked) =>
                      updateNested("settings", "evaluation", {
                        ...formData.settings.evaluation,
                        optional: checked,
                      })
                    }
                    disabled={!isEditingEvaluation}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status</CardTitle>
                <CardDescription>
                  Enable or disable the daycare module
                </CardDescription>
              </div>
              {isEditingStatus ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel("status")}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave("status")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingStatus(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Disabled</Label>
                <p className="text-sm text-muted-foreground">
                  Disable the daycare service
                </p>
              </div>
              <Switch
                checked={formData.status.disabled}
                onCheckedChange={(checked) =>
                  updateNested("status", "disabled", checked)
                }
                disabled={!isEditingStatus}
              />
            </div>
            {formData.status.disabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={formData.status.reason || ""}
                    onChange={(e) =>
                      updateNested(
                        "status",
                        "reason",
                        e.target.value || undefined,
                      )
                    }
                    rows={2}
                    placeholder="Reason for disabling..."
                    disabled={!isEditingStatus}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
