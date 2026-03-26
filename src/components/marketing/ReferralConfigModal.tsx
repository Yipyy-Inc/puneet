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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Gift, UserPlus, Target, Link2 } from "lucide-react";
import {
  BOOKABLE_SERVICE_TYPES,
  type ReferralRewardType,
  type ReferralTriggerType,
} from "@/data/facility-loyalty-config";

interface ReferralConfigModalProps {
  onClose: () => void;
}

const rewardTypeLabels: Record<ReferralRewardType, string> = {
  points: "Points",
  credit: "Account Credit ($)",
  discount: "Discount (%)",
  free_service: "Free Service",
  gift_card: "Gift Card",
  free_add_on: "Free Add-On",
  discount_code: "Discount Code",
};

const triggerTypeLabels: Record<ReferralTriggerType, string> = {
  after_first_booking: "After First Completed Booking",
  after_first_payment: "After First Invoice Payment",
  after_total_reaches: "After Booking Total Reaches $X",
  after_n_visits: "After N Visits",
};

const serviceTypes = BOOKABLE_SERVICE_TYPES;

function getValueLabel(type: ReferralRewardType): string {
  switch (type) {
    case "points":
      return "Points Amount";
    case "credit":
    case "gift_card":
      return "Dollar Amount ($)";
    case "discount":
    case "discount_code":
      return "Discount (%)";
    case "free_service":
    case "free_add_on":
      return "Service Name";
  }
}

function getValueType(type: ReferralRewardType): string {
  switch (type) {
    case "free_service":
    case "free_add_on":
      return "text";
    default:
      return "number";
  }
}

function RewardConfigCard({
  icon: Icon,
  title,
  description,
  rewardType,
  rewardValue,
  rewardDescription,
  onRewardTypeChange,
  onRewardValueChange,
  onRewardDescriptionChange,
  valuePlaceholder,
  descriptionPlaceholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  rewardType: ReferralRewardType;
  rewardValue: string;
  rewardDescription: string;
  onRewardTypeChange: (value: ReferralRewardType) => void;
  onRewardValueChange: (value: string) => void;
  onRewardDescriptionChange: (value: string) => void;
  valuePlaceholder: string;
  descriptionPlaceholder: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <Icon className="text-primary size-4" />
          <Label className="text-base">{title}</Label>
        </div>
        <p className="text-muted-foreground -mt-2 text-sm">{description}</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Reward Type</Label>
            <Select value={rewardType} onValueChange={onRewardTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(rewardTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{getValueLabel(rewardType)}</Label>
            <Input
              type={getValueType(rewardType)}
              value={rewardValue}
              onChange={(e) => onRewardValueChange(e.target.value)}
              placeholder={
                getValueType(rewardType) === "text"
                  ? valuePlaceholder
                  : "e.g., 25"
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={rewardDescription}
              onChange={(e) => onRewardDescriptionChange(e.target.value)}
              placeholder={descriptionPlaceholder}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReferralConfigModal({ onClose }: ReferralConfigModalProps) {
  const [formData, setFormData] = useState({
    enabled: true,
    // Referrer reward
    referrerRewardType: "credit" as ReferralRewardType,
    referrerRewardValue: "25",
    referrerRewardDescription: "$25 credit for referring a friend",
    // Referee reward
    refereeRewardType: "discount" as ReferralRewardType,
    refereeRewardValue: "10",
    refereeRewardDescription: "10% off first booking",
    // Trigger conditions
    triggerType: "after_first_booking" as ReferralTriggerType,
    triggerThreshold: "",
    triggerServiceTypes: [] as string[],
    // Requirements
    minimumPurchase: "",
    firstBookingOnly: true,
    requirementServiceTypes: [] as string[],
    // Tracking
    referralCodeLength: "8",
    customCodePrefix: "",
    expirationDays: "90",
  });

  const handleSave = () => {
    console.log("Saving referral config:", formData);
    onClose();
  };

  const toggleServiceType = (
    field: "triggerServiceTypes" | "requirementServiceTypes",
    service: string,
  ) => {
    const current = formData[field];
    setFormData({
      ...formData,
      [field]: current.includes(service)
        ? current.filter((s) => s !== service)
        : [...current, service],
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Referral Program Settings
        </DialogTitle>
        <DialogDescription>
          Configure referral rewards, trigger conditions, and tracking
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[65vh] space-y-6 overflow-y-auto py-4 pr-2">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Referral Program</Label>
            <p className="text-muted-foreground text-sm">
              Allow customers to refer friends and earn rewards
            </p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enabled: checked })
            }
          />
        </div>

        {formData.enabled && (
          <>
            <RewardConfigCard
              icon={Gift}
              title="Referrer Reward"
              description="What the existing customer earns for referring a friend"
              rewardType={formData.referrerRewardType}
              rewardValue={formData.referrerRewardValue}
              rewardDescription={formData.referrerRewardDescription}
              onRewardTypeChange={(value) =>
                setFormData({ ...formData, referrerRewardType: value })
              }
              onRewardValueChange={(value) =>
                setFormData({ ...formData, referrerRewardValue: value })
              }
              onRewardDescriptionChange={(value) =>
                setFormData({ ...formData, referrerRewardDescription: value })
              }
              valuePlaceholder="e.g., Free Grooming"
              descriptionPlaceholder="e.g., $25 credit for referring a friend"
            />

            <RewardConfigCard
              icon={UserPlus}
              title="Referee Reward"
              description="What the new customer receives when referred"
              rewardType={formData.refereeRewardType}
              rewardValue={formData.refereeRewardValue}
              rewardDescription={formData.refereeRewardDescription}
              onRewardTypeChange={(value) =>
                setFormData({ ...formData, refereeRewardType: value })
              }
              onRewardValueChange={(value) =>
                setFormData({ ...formData, refereeRewardValue: value })
              }
              onRewardDescriptionChange={(value) =>
                setFormData({ ...formData, refereeRewardDescription: value })
              }
              valuePlaceholder="e.g., Free Bath"
              descriptionPlaceholder="e.g., 10% off first booking"
            />

            {/* Trigger Conditions */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-2">
                  <Target className="text-primary size-4" />
                  <Label className="text-base">Trigger Conditions</Label>
                </div>
                <p className="text-muted-foreground -mt-2 text-sm">
                  When should the referral reward be issued?
                </p>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(value: ReferralTriggerType) =>
                      setFormData({ ...formData, triggerType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(triggerTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.triggerType === "after_total_reaches" && (
                  <div className="space-y-2">
                    <Label>Booking Total Threshold ($)</Label>
                    <Input
                      type="number"
                      value={formData.triggerThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          triggerThreshold: e.target.value,
                        })
                      }
                      placeholder="e.g., 100"
                    />
                  </div>
                )}

                {formData.triggerType === "after_n_visits" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Number of Visits Required</Label>
                      <Input
                        type="number"
                        value={formData.triggerThreshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            triggerThreshold: e.target.value,
                          })
                        }
                        placeholder="e.g., 3"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Applicable Service Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {serviceTypes.map((service) => (
                          <Badge
                            key={service}
                            variant={
                              formData.triggerServiceTypes.includes(service)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer capitalize"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              toggleServiceType("triggerServiceTypes", service)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleServiceType(
                                  "triggerServiceTypes",
                                  service,
                                );
                              }
                            }}
                          >
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Requirements</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Purchase ($)</Label>
                    <Input
                      type="number"
                      value={formData.minimumPurchase}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minimumPurchase: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex items-center space-x-2 self-end pb-2">
                    <Switch
                      id="firstBookingOnly"
                      checked={formData.firstBookingOnly}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, firstBookingOnly: checked })
                      }
                    />
                    <Label htmlFor="firstBookingOnly">First Booking Only</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Eligible Service Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {serviceTypes.map((service) => (
                      <Badge
                        key={service}
                        variant={
                          formData.requirementServiceTypes.includes(service)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer capitalize"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          toggleServiceType("requirementServiceTypes", service)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleServiceType(
                              "requirementServiceTypes",
                              service,
                            );
                          }
                        }}
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Leave empty to allow all service types
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Settings */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-2">
                  <Link2 className="text-primary size-4" />
                  <Label className="text-base">Tracking Settings</Label>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Code Length</Label>
                    <Input
                      type="number"
                      value={formData.referralCodeLength}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referralCodeLength: e.target.value,
                        })
                      }
                      min={4}
                      max={12}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Prefix</Label>
                    <Input
                      value={formData.customCodePrefix}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customCodePrefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g., DGV"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration (Days)</Label>
                    <Input
                      type="number"
                      value={formData.expirationDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expirationDays: e.target.value,
                        })
                      }
                      placeholder="e.g., 90"
                    />
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
          <Settings className="mr-2 size-4" />
          Save Settings
        </Button>
      </DialogFooter>
    </>
  );
}
