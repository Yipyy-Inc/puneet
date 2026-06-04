"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift, UserPlus, Target, Link2 } from "lucide-react";
import type {
  ReferralProgramConfig,
  ReferralRewardType,
  ReferralTriggerType,
} from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";

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

const DEFAULT_REFERRAL: ReferralProgramConfig = {
  enabled: true,
  referrerReward: {
    type: "credit",
    value: 25,
    description: "$25 credit for referring a friend",
  },
  refereeReward: {
    type: "discount",
    value: 10,
    description: "10% off first booking",
  },
  tracking: { referralCodeLength: 8 },
};

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

function isTextReward(type: ReferralRewardType): boolean {
  return type === "free_service" || type === "free_add_on";
}

type RewardField = "referrerReward" | "refereeReward";

function RewardCard({
  icon: Icon,
  title,
  description,
  field,
  cfg,
  onChange,
  valuePlaceholder,
  descriptionPlaceholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  field: RewardField;
  cfg: ReferralProgramConfig;
  onChange: (v: ReferralProgramConfig) => void;
  valuePlaceholder: string;
  descriptionPlaceholder: string;
}) {
  const reward = cfg[field];
  const isText = isTextReward(reward.type);

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
            <Select
              value={reward.type}
              onValueChange={(value: ReferralRewardType) =>
                onChange({
                  ...cfg,
                  [field]: {
                    ...reward,
                    type: value,
                    value: isTextReward(value) ? "" : 0,
                  },
                })
              }
            >
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
            <Label>{getValueLabel(reward.type)}</Label>
            <Input
              type={isText ? "text" : "number"}
              value={String(reward.value)}
              onChange={(e) =>
                onChange({
                  ...cfg,
                  [field]: {
                    ...reward,
                    value: isText ? e.target.value : Number(e.target.value),
                  },
                })
              }
              placeholder={isText ? valuePlaceholder : "e.g., 25"}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={reward.description}
              onChange={(e) =>
                onChange({
                  ...cfg,
                  [field]: { ...reward, description: e.target.value },
                })
              }
              placeholder={descriptionPlaceholder}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReferralProgramEditor({
  value,
  onChange,
}: {
  value: ReferralProgramConfig | undefined;
  onChange: (v: ReferralProgramConfig | undefined) => void;
}) {
  const isOn = Boolean(value && value.enabled);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange(value ? { ...value, enabled: true } : DEFAULT_REFERRAL);
    } else {
      onChange(
        value
          ? { ...value, enabled: false }
          : { ...DEFAULT_REFERRAL, enabled: false },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Referral Program</Label>
          <p className="text-muted-foreground text-sm">
            Allow customers to refer friends and earn rewards
          </p>
        </div>
        <Switch checked={isOn} onCheckedChange={handleToggle} />
      </div>

      {value && value.enabled && (
        <ReferralProgramFields cfg={value} onChange={onChange} />
      )}
    </div>
  );
}

function ReferralProgramFields({
  cfg,
  onChange,
}: {
  cfg: ReferralProgramConfig;
  onChange: (v: ReferralProgramConfig) => void;
}) {
  const trigger = cfg.triggerCondition;
  const triggerType: ReferralTriggerType =
    trigger?.type ?? "after_first_booking";
  const showThreshold =
    triggerType === "after_total_reaches" || triggerType === "after_n_visits";
  const requirements = cfg.requirements;
  const tracking = cfg.tracking;

  return (
    <>
      <RewardCard
        icon={Gift}
        title="Referrer Reward"
        description="What the existing customer earns for referring a friend"
        field="referrerReward"
        cfg={cfg}
        onChange={onChange}
        valuePlaceholder="e.g., Free Grooming"
        descriptionPlaceholder="e.g., $25 credit for referring a friend"
      />

      <RewardCard
        icon={UserPlus}
        title="Referee Reward"
        description="What the new customer receives when referred"
        field="refereeReward"
        cfg={cfg}
        onChange={onChange}
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
              value={triggerType}
              onValueChange={(v: ReferralTriggerType) =>
                onChange({
                  ...cfg,
                  triggerCondition: { ...cfg.triggerCondition, type: v },
                })
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

          {showThreshold && (
            <div className="space-y-2">
              <Label>
                {triggerType === "after_total_reaches"
                  ? "Booking Total Threshold ($)"
                  : "Number of Visits Required"}
              </Label>
              <Input
                type="number"
                value={trigger?.threshold ?? ""}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    triggerCondition: {
                      ...cfg.triggerCondition,
                      type: triggerType,
                      threshold:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    },
                  })
                }
                placeholder={
                  triggerType === "after_total_reaches" ? "e.g., 100" : "e.g., 3"
                }
              />
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
                value={requirements?.minimumPurchase ?? ""}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    requirements: {
                      ...cfg.requirements,
                      minimumPurchase:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    },
                  })
                }
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center space-x-2 self-end pb-2">
              <Switch
                id="firstBookingOnly"
                checked={requirements?.firstBookingOnly ?? false}
                onCheckedChange={(checked) =>
                  onChange({
                    ...cfg,
                    requirements: {
                      ...cfg.requirements,
                      firstBookingOnly: checked,
                    },
                  })
                }
              />
              <Label htmlFor="firstBookingOnly">First Booking Only</Label>
            </div>
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
                min={4}
                max={12}
                value={tracking?.referralCodeLength ?? 8}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    tracking: {
                      ...cfg.tracking,
                      referralCodeLength:
                        e.target.value === "" ? 8 : Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Custom Prefix</Label>
              <Input
                value={tracking?.customCodePrefix ?? ""}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    tracking: {
                      ...cfg.tracking,
                      referralCodeLength: tracking?.referralCodeLength ?? 8,
                      customCodePrefix:
                        e.target.value === ""
                          ? undefined
                          : e.target.value.toUpperCase(),
                    },
                  })
                }
                placeholder="e.g., DGV"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiration (Days)</Label>
              <Input
                type="number"
                value={tracking?.expirationDays ?? ""}
                onChange={(e) =>
                  onChange({
                    ...cfg,
                    tracking: {
                      ...cfg.tracking,
                      referralCodeLength: tracking?.referralCodeLength ?? 8,
                      expirationDays:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    },
                  })
                }
                placeholder="e.g., 90"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {BOOKABLE_SERVICE_TYPES.map((service) => (
              <Badge key={service} variant="outline" className="capitalize">
                {service}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
