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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { useModulesConfig } from "@/hooks/use-modules-config";
import type { ModuleConfig } from "@/data/modules-config";

export default function BoardingSettingsPage() {
  const { configs, updateConfig } = useModulesConfig();
  const [formData, setFormData] = useState<ModuleConfig>(configs.boarding);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);

  const updateFormData = (updates: Partial<ModuleConfig>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    updateConfig("boarding", newData);
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
    updateConfig("boarding", newData);
  };

  const handleCancel = (section: string) => {
    setFormData(configs.boarding);
    updateConfig("boarding", configs.boarding);
    if (section === "basic") setIsEditingBasic(false);
    if (section === "pricing") setIsEditingPricing(false);
    if (section === "media") setIsEditingMedia(false);
    if (section === "evaluation") setIsEditingEvaluation(false);
  };

  const handleSave = (section: string) => {
    toast.success("Settings saved successfully");
    if (section === "basic") setIsEditingBasic(false);
    if (section === "pricing") setIsEditingPricing(false);
    if (section === "media") setIsEditingMedia(false);
    if (section === "evaluation") setIsEditingEvaluation(false);
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
                  placeholder="e.g., Cozy Kennels Boarding"
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
                  placeholder="e.g., Boarding Management"
                  disabled={!isEditingBasic}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input
                value={formData.slogan}
                onChange={(e) => updateFormData({ slogan: e.target.value })}
                placeholder="e.g., Your Pet's Home Away From Home"
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
                placeholder="Describe the boarding service..."
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
                  Base price for the boarding service
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
                  Banner image for the boarding service
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
                  placeholder="e.g., /services/boarding.jpg"
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
                  Configure evaluation requirements for boarding
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
                  Require evaluation for boarding bookings
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
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Internal Name (Staff-Facing)</Label>
                    <Input
                      value={formData.settings.evaluation.internalName}
                      onChange={(e) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          internalName: e.target.value,
                        })
                      }
                      placeholder="e.g., Boarding Evaluation"
                      disabled={!isEditingEvaluation}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer-Facing Name</Label>
                    <Input
                      value={formData.settings.evaluation.customerName}
                      onChange={(e) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          customerName: e.target.value,
                        })
                      }
                      placeholder="e.g., Pet Evaluation"
                      disabled={!isEditingEvaluation}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.settings.evaluation.description}
                    onChange={(e) =>
                      updateNested("settings", "evaluation", {
                        ...formData.settings.evaluation,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Describe the evaluation process..."
                    disabled={!isEditingEvaluation}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.settings.evaluation.price}
                      onChange={(e) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0 for free"
                      disabled={!isEditingEvaluation}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={formData.settings.evaluation.duration}
                      onValueChange={(
                        value: "half-day" | "full-day" | "custom",
                      ) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          duration: value,
                        })
                      }
                      disabled={!isEditingEvaluation}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="half-day">Half-Day</SelectItem>
                        <SelectItem value="full-day">Full-Day</SelectItem>
                        <SelectItem value="custom">Custom Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.settings.evaluation.duration === "custom" && (
                  <div className="space-y-2">
                    <Label>Custom Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.settings.evaluation.customHours || ""}
                      onChange={(e) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          customHours: parseFloat(e.target.value) || undefined,
                        })
                      }
                      placeholder="e.g., 2.5"
                      disabled={!isEditingEvaluation}
                      className="w-32"
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Taxable</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply tax to evaluation price
                    </p>
                  </div>
                  <Switch
                    checked={formData.settings.evaluation.taxSettings.taxable}
                    onCheckedChange={(checked) =>
                      updateNested("settings", "evaluation", {
                        ...formData.settings.evaluation,
                        taxSettings: {
                          ...formData.settings.evaluation.taxSettings,
                          taxable: checked,
                        },
                      })
                    }
                    disabled={!isEditingEvaluation}
                  />
                </div>
                {formData.settings.evaluation.taxSettings.taxable && (
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        formData.settings.evaluation.taxSettings.taxRate || ""
                      }
                      onChange={(e) =>
                        updateNested("settings", "evaluation", {
                          ...formData.settings.evaluation,
                          taxSettings: {
                            ...formData.settings.evaluation.taxSettings,
                            taxRate: parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                      placeholder="e.g., 8.25"
                      disabled={!isEditingEvaluation}
                      className="w-32"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
