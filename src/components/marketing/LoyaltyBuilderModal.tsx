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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Plus,
  Trash2,
  Star,
  Clock,
  Layers,
  LayoutList,
  Target,
  Settings2,
} from "lucide-react";
import {
  BOOKABLE_SERVICE_TYPES,
  type PointsEarningMethod,
} from "@/data/facility-loyalty-config";

interface LoyaltyBuilderModalProps {
  onClose: () => void;
}

const serviceTypes = BOOKABLE_SERVICE_TYPES;

const earningMethodLabels: Record<PointsEarningMethod, string> = {
  per_dollar: "Per Dollar Spent",
  per_booking: "Per Booking",
  per_service_type: "Per Service Type",
  per_visit_count: "Per Visit Count (Milestones)",
  hybrid: "Hybrid (Multiple Methods)",
};

interface TierBenefit {
  type: string;
  value: string;
  description: string;
}

interface TierConfig {
  id: string;
  name: string;
  displayName: string;
  minPoints: string;
  maxPoints: string;
  color: string;
  earningMultiplier: string;
  discountPercentage: string;
  benefits: TierBenefit[];
}

interface ServicePointRule {
  serviceType: string;
  points: string;
}

interface VisitMilestone {
  visitCount: string;
  bonusPoints: string;
  description: string;
}

function ServicePointRulesList({
  rules,
  onUpdate,
  onRemove,
  onAdd,
  pointsPlaceholder = "Points",
  addLabel = "Add Rule",
}: {
  rules: ServicePointRule[];
  onUpdate: (
    index: number,
    field: keyof ServicePointRule,
    value: string,
  ) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  pointsPlaceholder?: string;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-3 items-end gap-2">
          <Select
            value={rule.serviceType}
            onValueChange={(v) => onUpdate(i, "serviceType", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={rule.points}
            onChange={(e) => onUpdate(i, "points", e.target.value)}
            placeholder={pointsPlaceholder}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove rule"
            onClick={() => onRemove(i)}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1 size-4" /> {addLabel}
      </Button>
    </div>
  );
}

export function LoyaltyBuilderModal({ onClose }: LoyaltyBuilderModalProps) {
  const [formData, setFormData] = useState({
    // Earning Rules
    earningMethod: "per_dollar" as PointsEarningMethod,
    perDollarBasePoints: "1",
    perDollarMinPurchase: "",
    perDollarMaxPoints: "",
    perBookingBasePoints: "50",
    servicePointRules: [
      { serviceType: "grooming", points: "50" },
      { serviceType: "daycare", points: "30" },
    ] as ServicePointRule[],
    visitMilestones: [
      { visitCount: "10", bonusPoints: "100", description: "10th Visit Bonus" },
    ] as VisitMilestone[],
    hybridCombination: "add" as "add" | "max" | "weighted",
    // Tiers
    tiers: [
      {
        id: "1",
        name: "Bronze",
        displayName: "Bronze Member",
        minPoints: "0",
        maxPoints: "500",
        color: "#CD7F32",
        earningMultiplier: "1",
        discountPercentage: "0",
        benefits: [],
      },
      {
        id: "2",
        name: "Silver",
        displayName: "Silver Member",
        minPoints: "500",
        maxPoints: "1500",
        color: "#C0C0C0",
        earningMultiplier: "1.25",
        discountPercentage: "5",
        benefits: [],
      },
      {
        id: "3",
        name: "Gold",
        displayName: "Gold Member",
        minPoints: "1500",
        maxPoints: "3000",
        color: "#FFD700",
        earningMultiplier: "1.5",
        discountPercentage: "10",
        benefits: [],
      },
      {
        id: "4",
        name: "Platinum",
        displayName: "Platinum VIP",
        minPoints: "3000",
        maxPoints: "",
        color: "#E5E4E2",
        earningMultiplier: "2",
        discountPercentage: "15",
        benefits: [],
      },
    ] as TierConfig[],
    // Expiration
    expirationEnabled: true,
    expirationType: "time_based" as
      | "none"
      | "time_based"
      | "activity_based"
      | "tier_based",
    timeBasedMonths: "12",
    timeBasedPolicy: "fifo" as "fifo" | "lifo" | "proportional",
    activityInactiveMonths: "6",
    activityResetOnActivity: true,
    warningsEnabled: true,
    warnDaysBefore: "30,14,7",
    warnEmail: true,
    warnSms: false,
    warnPortal: true,
    // Discount Stacking
    stackingEnabled: false,
    stackingBehavior: "best_discount_only",
    tierStackEnabled: false,
    tierStackPriority: "first" as "first" | "last" | "custom",
    pointsRedemptionWithDiscounts: false,
    pointsRedemptionWithPromos: false,
    pointsRedemptionPriority: "before_discounts" as
      | "before_discounts"
      | "after_discounts",
    // Points Scope
    scopeType: "both" as "services_only" | "retail_only" | "both",
    eligibleServiceTypes: [
      "grooming",
      "daycare",
      "boarding",
      "training",
    ] as string[],
    minServiceAmount: "",
    excludeSaleItems: false,
    minRetailPurchase: "",
    excludeGiftCards: true,
    excludePackages: false,
    excludeMemberships: false,
    // General
    pointsName: "Points",
    pointsValue: "5",
    minRedemption: "100",
    maxRedemption: "",
    allowPartialRedemption: true,
    showOnReceipt: true,
    showInPortal: true,
    allowTransfer: false,
  });

  const update = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log("Saving loyalty config:", formData);
    onClose();
  };

  // Tier helpers
  const addTier = () => {
    update("tiers", [
      ...formData.tiers,
      {
        id: Date.now().toString(),
        name: "",
        displayName: "",
        minPoints: "",
        maxPoints: "",
        color: "#6366F1",
        earningMultiplier: "1",
        discountPercentage: "0",
        benefits: [],
      },
    ]);
  };

  const updateTier = (
    index: number,
    field: keyof TierConfig,
    value: string,
  ) => {
    const updated = [...formData.tiers];
    updated[index] = { ...updated[index], [field]: value };
    update("tiers", updated);
  };

  const removeTier = (index: number) => {
    update(
      "tiers",
      formData.tiers.filter((_, i) => i !== index),
    );
  };

  const addTierBenefit = (tierIndex: number) => {
    const updated = [...formData.tiers];
    updated[tierIndex] = {
      ...updated[tierIndex],
      benefits: [
        ...updated[tierIndex].benefits,
        { type: "discount", value: "", description: "" },
      ],
    };
    update("tiers", updated);
  };

  const updateTierBenefit = (
    tierIndex: number,
    benefitIndex: number,
    field: keyof TierBenefit,
    value: string,
  ) => {
    const updated = [...formData.tiers];
    const benefits = [...updated[tierIndex].benefits];
    benefits[benefitIndex] = { ...benefits[benefitIndex], [field]: value };
    updated[tierIndex] = { ...updated[tierIndex], benefits };
    update("tiers", updated);
  };

  const removeTierBenefit = (tierIndex: number, benefitIndex: number) => {
    const updated = [...formData.tiers];
    updated[tierIndex] = {
      ...updated[tierIndex],
      benefits: updated[tierIndex].benefits.filter(
        (_, i) => i !== benefitIndex,
      ),
    };
    update("tiers", updated);
  };

  // Service point rule helpers
  const addServicePointRule = () => {
    update("servicePointRules", [
      ...formData.servicePointRules,
      { serviceType: "", points: "" },
    ]);
  };

  const updateServicePointRule = (
    index: number,
    field: keyof ServicePointRule,
    value: string,
  ) => {
    const updated = [...formData.servicePointRules];
    updated[index] = { ...updated[index], [field]: value };
    update("servicePointRules", updated);
  };

  const removeServicePointRule = (index: number) => {
    update(
      "servicePointRules",
      formData.servicePointRules.filter((_, i) => i !== index),
    );
  };

  // Visit milestone helpers
  const addVisitMilestone = () => {
    update("visitMilestones", [
      ...formData.visitMilestones,
      { visitCount: "", bonusPoints: "", description: "" },
    ]);
  };

  const updateVisitMilestone = (
    index: number,
    field: keyof VisitMilestone,
    value: string,
  ) => {
    const updated = [...formData.visitMilestones];
    updated[index] = { ...updated[index], [field]: value };
    update("visitMilestones", updated);
  };

  const removeVisitMilestone = (index: number) => {
    update(
      "visitMilestones",
      formData.visitMilestones.filter((_, i) => i !== index),
    );
  };

  const toggleEligibleService = (service: string) => {
    update(
      "eligibleServiceTypes",
      formData.eligibleServiceTypes.includes(service)
        ? formData.eligibleServiceTypes.filter((s) => s !== service)
        : [...formData.eligibleServiceTypes, service],
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Award className="size-5" />
          Loyalty Program Builder
        </DialogTitle>
        <DialogDescription>
          Configure earning rules, tiers, expiration, and rewards
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="earning" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="earning" className="text-xs">
            <Star className="mr-1 size-3" />
            Earning
          </TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs">
            <Layers className="mr-1 size-3" />
            Tiers
          </TabsTrigger>
          <TabsTrigger value="expiration" className="text-xs">
            <Clock className="mr-1 size-3" />
            Expiration
          </TabsTrigger>
          <TabsTrigger value="stacking" className="text-xs">
            <LayoutList className="mr-1 size-3" />
            Stacking
          </TabsTrigger>
          <TabsTrigger value="scope" className="text-xs">
            <Target className="mr-1 size-3" />
            Scope
          </TabsTrigger>
          <TabsTrigger value="general" className="text-xs">
            <Settings2 className="mr-1 size-3" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Earning Rules */}
        <TabsContent
          value="earning"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          <div className="space-y-2">
            <Label>Earning Method</Label>
            <Select
              value={formData.earningMethod}
              onValueChange={(value: PointsEarningMethod) =>
                update("earningMethod", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(earningMethodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.earningMethod === "per_dollar" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Per Dollar Configuration</Label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Base Points per $1</Label>
                    <Input
                      type="number"
                      value={formData.perDollarBasePoints}
                      onChange={(e) =>
                        update("perDollarBasePoints", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Purchase ($)</Label>
                    <Input
                      type="number"
                      value={formData.perDollarMinPurchase}
                      onChange={(e) =>
                        update("perDollarMinPurchase", e.target.value)
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Points per Transaction</Label>
                    <Input
                      type="number"
                      value={formData.perDollarMaxPoints}
                      onChange={(e) =>
                        update("perDollarMaxPoints", e.target.value)
                      }
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.earningMethod === "per_booking" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Per Booking Configuration</Label>
                <div className="space-y-2">
                  <Label>Base Points per Booking</Label>
                  <Input
                    type="number"
                    value={formData.perBookingBasePoints}
                    onChange={(e) =>
                      update("perBookingBasePoints", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service-Specific Overrides</Label>
                  <ServicePointRulesList
                    rules={formData.servicePointRules}
                    onUpdate={updateServicePointRule}
                    onRemove={removeServicePointRule}
                    onAdd={addServicePointRule}
                    pointsPlaceholder="Points"
                    addLabel="Add Override"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {formData.earningMethod === "per_service_type" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">
                  Service Points Configuration
                </Label>
                <ServicePointRulesList
                  rules={formData.servicePointRules}
                  onUpdate={updateServicePointRule}
                  onRemove={removeServicePointRule}
                  onAdd={addServicePointRule}
                  pointsPlaceholder="Points per visit"
                  addLabel="Add Service Rule"
                />
              </CardContent>
            </Card>
          )}

          {formData.earningMethod === "per_visit_count" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Visit Milestones</Label>
                {formData.visitMilestones.map((milestone, i) => (
                  <div key={i} className="grid grid-cols-4 items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Visit #</Label>
                      <Input
                        type="number"
                        value={milestone.visitCount}
                        onChange={(e) =>
                          updateVisitMilestone(i, "visitCount", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bonus Points</Label>
                      <Input
                        type="number"
                        value={milestone.bonusPoints}
                        onChange={(e) =>
                          updateVisitMilestone(i, "bonusPoints", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={milestone.description}
                        onChange={(e) =>
                          updateVisitMilestone(i, "description", e.target.value)
                        }
                        placeholder="e.g., 10th Visit = Free!"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove milestone"
                      onClick={() => removeVisitMilestone(i)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addVisitMilestone}>
                  <Plus className="mr-1 size-4" /> Add Milestone
                </Button>
              </CardContent>
            </Card>
          )}

          {formData.earningMethod === "hybrid" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Hybrid Configuration</Label>
                <p className="text-muted-foreground text-sm">
                  Combines per-dollar and per-booking earning rules together.
                </p>
                <div className="space-y-2">
                  <Label>Combination Method</Label>
                  <Select
                    value={formData.hybridCombination}
                    onValueChange={(v: "add" | "max" | "weighted") =>
                      update("hybridCombination", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">
                        Add All (sum points from each method)
                      </SelectItem>
                      <SelectItem value="max">
                        Best Result (use highest earning method)
                      </SelectItem>
                      <SelectItem value="weighted">
                        Weighted (apply custom weights)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Per Dollar: Base Points</Label>
                    <Input
                      type="number"
                      value={formData.perDollarBasePoints}
                      onChange={(e) =>
                        update("perDollarBasePoints", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Booking: Base Points</Label>
                    <Input
                      type="number"
                      value={formData.perBookingBasePoints}
                      onChange={(e) =>
                        update("perBookingBasePoints", e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Tiers */}
        <TabsContent
          value="tiers"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          {formData.tiers.map((tier, tierIndex) => (
            <Card key={tier.id} className="relative">
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove tier"
                  onClick={() => removeTier(tierIndex)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-2">
                  <div
                    className="size-4 rounded-full border"
                    style={{ backgroundColor: tier.color }}
                    aria-hidden="true"
                  />
                  <Label className="text-base">{tier.name || "New Tier"}</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={tier.name}
                      onChange={(e) =>
                        updateTier(tierIndex, "name", e.target.value)
                      }
                      placeholder="e.g., Gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={tier.displayName}
                      onChange={(e) =>
                        updateTier(tierIndex, "displayName", e.target.value)
                      }
                      placeholder="e.g., Gold Member"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Min Points</Label>
                    <Input
                      type="number"
                      value={tier.minPoints}
                      onChange={(e) =>
                        updateTier(tierIndex, "minPoints", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Points</Label>
                    <Input
                      type="number"
                      value={tier.maxPoints}
                      onChange={(e) =>
                        updateTier(tierIndex, "maxPoints", e.target.value)
                      }
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tier.color}
                        onChange={(e) =>
                          updateTier(tierIndex, "color", e.target.value)
                        }
                        className="font-mono"
                      />
                      <div
                        className="size-10 shrink-0 rounded-sm border"
                        style={{ backgroundColor: tier.color }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Earning Multiplier</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={tier.earningMultiplier}
                      onChange={(e) =>
                        updateTier(
                          tierIndex,
                          "earningMultiplier",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      value={tier.discountPercentage}
                      onChange={(e) =>
                        updateTier(
                          tierIndex,
                          "discountPercentage",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <Label>Benefits</Label>
                  {tier.benefits.map((benefit, benefitIndex) => (
                    <div
                      key={benefitIndex}
                      className="grid grid-cols-4 items-end gap-2"
                    >
                      <Select
                        value={benefit.type}
                        onValueChange={(v) =>
                          updateTierBenefit(tierIndex, benefitIndex, "type", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="bonus_points">
                            Bonus Points
                          </SelectItem>
                          <SelectItem value="free_service">
                            Free Service
                          </SelectItem>
                          <SelectItem value="priority">
                            Priority Access
                          </SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={benefit.value}
                        onChange={(e) =>
                          updateTierBenefit(
                            tierIndex,
                            benefitIndex,
                            "value",
                            e.target.value,
                          )
                        }
                        placeholder="Value"
                      />
                      <Input
                        value={benefit.description}
                        onChange={(e) =>
                          updateTierBenefit(
                            tierIndex,
                            benefitIndex,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Description"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove benefit"
                        onClick={() =>
                          removeTierBenefit(tierIndex, benefitIndex)
                        }
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTierBenefit(tierIndex)}
                  >
                    <Plus className="mr-1 size-4" /> Add Benefit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addTier} className="w-full">
            <Plus className="mr-2 size-4" /> Add Tier
          </Button>
        </TabsContent>

        {/* Tab 3: Expiration */}
        <TabsContent
          value="expiration"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Points Expiration</Label>
              <p className="text-muted-foreground text-sm">
                Set when earned points expire
              </p>
            </div>
            <Switch
              id="expirationEnabled"
              checked={formData.expirationEnabled}
              onCheckedChange={(checked) =>
                update("expirationEnabled", checked)
              }
            />
          </div>

          {formData.expirationEnabled && (
            <>
              <div className="space-y-2">
                <Label>Expiration Type</Label>
                <Select
                  value={formData.expirationType}
                  onValueChange={(
                    v: "none" | "time_based" | "activity_based" | "tier_based",
                  ) => update("expirationType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Expiration</SelectItem>
                    <SelectItem value="time_based">Time-Based</SelectItem>
                    <SelectItem value="activity_based">
                      Activity-Based
                    </SelectItem>
                    <SelectItem value="tier_based">Tier-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.expirationType === "time_based" && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <Label className="text-base">Time-Based Expiration</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expiration (Months)</Label>
                        <Input
                          type="number"
                          value={formData.timeBasedMonths}
                          onChange={(e) =>
                            update("timeBasedMonths", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiration Policy</Label>
                        <Select
                          value={formData.timeBasedPolicy}
                          onValueChange={(
                            v: "fifo" | "lifo" | "proportional",
                          ) => update("timeBasedPolicy", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fifo">
                              FIFO (Oldest First)
                            </SelectItem>
                            <SelectItem value="lifo">
                              LIFO (Newest First)
                            </SelectItem>
                            <SelectItem value="proportional">
                              Proportional
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.expirationType === "activity_based" && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <Label className="text-base">
                      Activity-Based Expiration
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expire After Inactive (Months)</Label>
                        <Input
                          type="number"
                          value={formData.activityInactiveMonths}
                          onChange={(e) =>
                            update("activityInactiveMonths", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2 self-end pb-2">
                        <Switch
                          id="activityResetOnActivity"
                          checked={formData.activityResetOnActivity}
                          onCheckedChange={(checked) =>
                            update("activityResetOnActivity", checked)
                          }
                        />
                        <Label htmlFor="activityResetOnActivity">
                          Reset Timer on Activity
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Warning Notifications</Label>
                    <Switch
                      checked={formData.warningsEnabled}
                      onCheckedChange={(checked) =>
                        update("warningsEnabled", checked)
                      }
                    />
                  </div>
                  {formData.warningsEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Warn Days Before Expiration</Label>
                        <Input
                          value={formData.warnDaysBefore}
                          onChange={(e) =>
                            update("warnDaysBefore", e.target.value)
                          }
                          placeholder="e.g., 30,14,7"
                        />
                        <p className="text-muted-foreground text-xs">
                          Comma-separated list of days
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="warnEmail"
                            checked={formData.warnEmail}
                            onCheckedChange={(checked) =>
                              update("warnEmail", checked)
                            }
                          />
                          <Label htmlFor="warnEmail">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="warnSms"
                            checked={formData.warnSms}
                            onCheckedChange={(checked) =>
                              update("warnSms", checked)
                            }
                          />
                          <Label htmlFor="warnSms">SMS</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="warnPortal"
                            checked={formData.warnPortal}
                            onCheckedChange={(checked) =>
                              update("warnPortal", checked)
                            }
                          />
                          <Label htmlFor="warnPortal">Customer Portal</Label>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 4: Discount Stacking */}
        <TabsContent
          value="stacking"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Discount Stacking Rules</Label>
              <p className="text-muted-foreground text-sm">
                Control how loyalty discounts combine with other offers
              </p>
            </div>
            <Switch
              id="stackingEnabled"
              checked={formData.stackingEnabled}
              onCheckedChange={(checked) => update("stackingEnabled", checked)}
            />
          </div>

          {formData.stackingEnabled && (
            <>
              <div className="space-y-2">
                <Label>Stacking Behavior</Label>
                <Select
                  value={formData.stackingBehavior}
                  onValueChange={(v) => update("stackingBehavior", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_stacking">No Stacking</SelectItem>
                    <SelectItem value="stack_with_promos">
                      Stack with Promo Codes Only
                    </SelectItem>
                    <SelectItem value="stack_with_member">
                      Stack with Member Discounts Only
                    </SelectItem>
                    <SelectItem value="stack_all">
                      Stack All Discounts
                    </SelectItem>
                    <SelectItem value="best_discount_only">
                      Best Discount Only
                    </SelectItem>
                    <SelectItem value="custom">Custom Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Label className="text-base">Tier Discount Stacking</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="tierStackEnabled"
                      checked={formData.tierStackEnabled}
                      onCheckedChange={(checked) =>
                        update("tierStackEnabled", checked)
                      }
                    />
                    <Label htmlFor="tierStackEnabled">
                      Allow Tier Discounts to Stack with Other Discounts
                    </Label>
                  </div>
                  {formData.tierStackEnabled && (
                    <div className="space-y-2">
                      <Label>Tier Discount Priority</Label>
                      <Select
                        value={formData.tierStackPriority}
                        onValueChange={(v: "first" | "last" | "custom") =>
                          update("tierStackPriority", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">Apply First</SelectItem>
                          <SelectItem value="last">Apply Last</SelectItem>
                          <SelectItem value="custom">Custom Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Label className="text-base">
                    Points Redemption Stacking
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="pointsWithDiscounts"
                        checked={formData.pointsRedemptionWithDiscounts}
                        onCheckedChange={(checked) =>
                          update("pointsRedemptionWithDiscounts", checked)
                        }
                      />
                      <Label htmlFor="pointsWithDiscounts">
                        Can Use with Discounts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="pointsWithPromos"
                        checked={formData.pointsRedemptionWithPromos}
                        onCheckedChange={(checked) =>
                          update("pointsRedemptionWithPromos", checked)
                        }
                      />
                      <Label htmlFor="pointsWithPromos">
                        Can Use with Promo Codes
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Redemption Priority</Label>
                    <Select
                      value={formData.pointsRedemptionPriority}
                      onValueChange={(
                        v: "before_discounts" | "after_discounts",
                      ) => update("pointsRedemptionPriority", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before_discounts">
                          Apply Before Other Discounts
                        </SelectItem>
                        <SelectItem value="after_discounts">
                          Apply After Other Discounts
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 5: Points Scope */}
        <TabsContent
          value="scope"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          <div className="space-y-2">
            <Label>Points Earning Scope</Label>
            <Select
              value={formData.scopeType}
              onValueChange={(v: "services_only" | "retail_only" | "both") =>
                update("scopeType", v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="services_only">Services Only</SelectItem>
                <SelectItem value="retail_only">Retail Only</SelectItem>
                <SelectItem value="both">Both Services & Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.scopeType === "services_only" ||
            formData.scopeType === "both") && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Service Rules</Label>
                <div className="space-y-2">
                  <Label>Eligible Service Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {serviceTypes.map((service) => (
                      <Badge
                        key={service}
                        variant={
                          formData.eligibleServiceTypes.includes(service)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer capitalize"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleEligibleService(service)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleEligibleService(service);
                          }
                        }}
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Service Amount ($)</Label>
                  <Input
                    type="number"
                    value={formData.minServiceAmount}
                    onChange={(e) => update("minServiceAmount", e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {(formData.scopeType === "retail_only" ||
            formData.scopeType === "both") && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Retail Rules</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="excludeSaleItems"
                    checked={formData.excludeSaleItems}
                    onCheckedChange={(checked) =>
                      update("excludeSaleItems", checked)
                    }
                  />
                  <Label htmlFor="excludeSaleItems">Exclude Sale Items</Label>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Purchase Amount ($)</Label>
                  <Input
                    type="number"
                    value={formData.minRetailPurchase}
                    onChange={(e) =>
                      update("minRetailPurchase", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-3 pt-6">
              <Label className="text-base">Exclusions</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="excludeGiftCards"
                    checked={formData.excludeGiftCards}
                    onCheckedChange={(checked) =>
                      update("excludeGiftCards", checked)
                    }
                  />
                  <Label htmlFor="excludeGiftCards">Exclude Gift Cards</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="excludePackages"
                    checked={formData.excludePackages}
                    onCheckedChange={(checked) =>
                      update("excludePackages", checked)
                    }
                  />
                  <Label htmlFor="excludePackages">Exclude Packages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="excludeMemberships"
                    checked={formData.excludeMemberships}
                    onCheckedChange={(checked) =>
                      update("excludeMemberships", checked)
                    }
                  />
                  <Label htmlFor="excludeMemberships">
                    Exclude Memberships
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: General Settings */}
        <TabsContent
          value="general"
          className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
        >
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Label className="text-base">Points Configuration</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Points Name</Label>
                  <Input
                    value={formData.pointsName}
                    onChange={(e) => update("pointsName", e.target.value)}
                    placeholder="e.g., Points, Stars, Paw Points"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points Value (100 pts = $?)</Label>
                  <Input
                    type="number"
                    value={formData.pointsValue}
                    onChange={(e) => update("pointsValue", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Redemption Points</Label>
                  <Input
                    type="number"
                    value={formData.minRedemption}
                    onChange={(e) => update("minRedemption", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Redemption per Transaction</Label>
                  <Input
                    type="number"
                    value={formData.maxRedemption}
                    onChange={(e) => update("maxRedemption", e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-6">
              <Label className="text-base">Display & Behavior</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowPartialRedemption"
                    checked={formData.allowPartialRedemption}
                    onCheckedChange={(checked) =>
                      update("allowPartialRedemption", checked)
                    }
                  />
                  <Label htmlFor="allowPartialRedemption">
                    Allow Partial Redemption
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showOnReceipt"
                    checked={formData.showOnReceipt}
                    onCheckedChange={(checked) =>
                      update("showOnReceipt", checked)
                    }
                  />
                  <Label htmlFor="showOnReceipt">Show Points on Receipt</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showInPortal"
                    checked={formData.showInPortal}
                    onCheckedChange={(checked) =>
                      update("showInPortal", checked)
                    }
                  />
                  <Label htmlFor="showInPortal">Show in Customer Portal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowTransfer"
                    checked={formData.allowTransfer}
                    onCheckedChange={(checked) =>
                      update("allowTransfer", checked)
                    }
                  />
                  <Label htmlFor="allowTransfer">Allow Points Transfer</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <Label className="text-base">Preview</Label>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  Earning:{" "}
                  <span className="font-medium">
                    {formData.earningMethod === "per_dollar"
                      ? `${formData.perDollarBasePoints} ${formData.pointsName.toLowerCase()} per $1 spent`
                      : formData.earningMethod === "per_booking"
                        ? `${formData.perBookingBasePoints} ${formData.pointsName.toLowerCase()} per booking`
                        : earningMethodLabels[formData.earningMethod]}
                  </span>
                </p>
                <p>
                  Value:{" "}
                  <span className="font-medium">
                    100 {formData.pointsName.toLowerCase()} = $
                    {formData.pointsValue}
                  </span>
                </p>
                <p>
                  Min Redemption:{" "}
                  <span className="font-medium">
                    {formData.minRedemption} {formData.pointsName.toLowerCase()}
                  </span>
                </p>
                <p>
                  Tiers:{" "}
                  <span className="font-medium">
                    {formData.tiers.length} configured
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Award className="mr-2 size-4" />
          Save Configuration
        </Button>
      </DialogFooter>
    </>
  );
}
