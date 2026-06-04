"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type {
  Badge,
  BadgeCriteriaType,
  BadgeRewardType,
  Tier,
} from "@/types/loyalty";
import { badgeConditionText } from "@/lib/loyalty/badge-summary";

const ICON_PRESETS = ["⭐", "🏆", "💎", "🎖️", "🥇", "🔥", "❤️", "🐾", "🎉", "👑"];

const CONDITION_OPTIONS: { key: BadgeCriteriaType; label: string }[] = [
  { key: "bookings_count", label: "Completed N bookings" },
  { key: "total_spent", label: "Spent $N total" },
  { key: "consecutive_months", label: "Booked N consecutive months" },
  { key: "referrals", label: "Referred N friends" },
  { key: "first_booking", label: "First booking" },
  { key: "reached_tier", label: "Reached a tier" },
];

type RewardKey =
  | "points"
  | "credit"
  | "gift_card"
  | "discount_pct"
  | "discount_fixed"
  | "free_service";

const REWARD_OPTIONS: { key: RewardKey; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "credit", label: "Account Credit ($)" },
  { key: "gift_card", label: "Gift Card ($)" },
  { key: "discount_pct", label: "Percentage Discount" },
  { key: "discount_fixed", label: "Fixed Discount" },
  { key: "free_service", label: "Free Service" },
];

function rewardKey(t: BadgeRewardType): RewardKey {
  if (t === "discount") return "discount_pct";
  if (t === "freebie") return "free_service";
  return t;
}

function rewardValueLabel(k: RewardKey): string {
  switch (k) {
    case "points":
      return "Points";
    case "credit":
      return "Credit ($)";
    case "gift_card":
      return "Value ($)";
    case "discount_pct":
      return "Percent (%)";
    case "discount_fixed":
      return "Amount ($)";
    case "free_service":
      return "Service";
  }
}

function conditionNeedsNumber(t: BadgeCriteriaType): boolean {
  return (
    t === "bookings_count" ||
    t === "total_spent" ||
    t === "consecutive_months" ||
    t === "referrals" ||
    t === "reviews"
  );
}

function conditionValueLabel(t: BadgeCriteriaType): string {
  switch (t) {
    case "bookings_count":
      return "Bookings";
    case "total_spent":
      return "Amount ($)";
    case "consecutive_months":
      return "Months";
    case "referrals":
      return "Friends";
    case "reviews":
      return "Reviews";
    default:
      return "";
  }
}

function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function BadgesWizardStep({
  value,
  onChange,
  tiers,
}: {
  value: Badge[];
  onChange: (v: Badge[]) => void;
  tiers: Tier[];
}) {
  const updateBadge = (index: number, next: Badge) =>
    onChange(value.map((b, i) => (i === index ? next : b)));

  const removeBadge = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  const addBadge = () => {
    const nextN = value.reduce((max, b) => {
      const m = /^badge-w(\d+)$/.exec(b.id);
      return m ? Math.max(max, Number(m[1]) + 1) : max;
    }, 0);
    const fresh: Badge = {
      id: `badge-w${nextN}`,
      name: "New Badge",
      description: "",
      icon: "⭐",
      criteria: { type: "bookings_count", threshold: 10 },
      reward: { type: "points", value: 100 },
      enabled: true,
    };
    onChange([
      ...value,
      { ...fresh, description: badgeConditionText(fresh) },
    ]);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Badges are one-time milestone rewards. Customise the examples below, or
        add your own.
      </p>

      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No badges yet. Add a badge to reward a milestone.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {value.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            tiers={tiers}
            onChange={(next) => updateBadge(index, next)}
            onRemove={() => removeBadge(index)}
          />
        ))}
      </div>

      <Button variant="outline" onClick={addBadge} className="w-full">
        <Plus className="mr-2 size-4" /> Add badge
      </Button>
    </div>
  );
}

function BadgeCard({
  badge,
  tiers,
  onChange,
  onRemove,
}: {
  badge: Badge;
  tiers: Tier[];
  onChange: (b: Badge) => void;
  onRemove: () => void;
}) {
  const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const reward = badge.reward ?? { type: "points" as BadgeRewardType, value: 0 };
  const rKey = rewardKey(reward.type);
  const rewardIsText = rKey === "free_service";

  // Re-derive description from the condition on every change.
  const emit = (next: Badge) => {
    const tierName = next.criteria.tierId
      ? tiers.find((t) => t.id === next.criteria.tierId)?.name
      : undefined;
    onChange({ ...next, description: badgeConditionText(next, tierName) });
  };

  const changeCondition = (type: BadgeCriteriaType) => {
    // Preserve the existing threshold across type switches so a round-trip
    // (e.g. bookings → first_booking → bookings) doesn't discard the user's
    // number. threshold is ignored by first_booking/reached_tier anyway.
    let criteria: Badge["criteria"];
    if (type === "reached_tier") {
      criteria = {
        ...badge.criteria,
        type,
        tierId: badge.criteria.tierId ?? sortedTiers[0]?.id,
      };
    } else if (type === "first_booking") {
      criteria = { ...badge.criteria, type, tierId: undefined };
    } else {
      criteria = {
        ...badge.criteria,
        type,
        tierId: undefined,
        threshold: badge.criteria.threshold || 10,
      };
    }
    emit({ ...badge, criteria });
  };

  const changeReward = (key: RewardKey) => {
    const value =
      key === "free_service"
        ? typeof reward.value === "string"
          ? reward.value
          : ""
        : typeof reward.value === "number"
          ? reward.value
          : 10;
    emit({ ...badge, reward: { type: key, value } });
  };

  return (
    <Card
      data-disabled={badge.enabled === false ? "true" : undefined}
      className="data-[disabled=true]:opacity-60"
    >
      <CardContent className="space-y-3 pt-5">
        {/* Icon + name + enable */}
        <div className="flex items-start gap-3">
          <span
            className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-xl"
            aria-hidden="true"
          >
            {badge.icon || "⭐"}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <Input
              value={badge.name}
              onChange={(e) => emit({ ...badge, name: e.target.value })}
              placeholder="Badge name"
              className="h-8 font-medium"
            />
            <p className="text-muted-foreground truncate text-xs">
              {badge.description || "—"}
            </p>
          </div>
          <Switch
            checked={badge.enabled !== false}
            onCheckedChange={(checked) => emit({ ...badge, enabled: checked })}
            aria-label="Badge enabled"
          />
        </div>

        {/* Icon picker */}
        <div className="flex flex-wrap items-center gap-1">
          {ICON_PRESETS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={`Use icon ${icon}`}
              onClick={() => emit({ ...badge, icon })}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-base transition-all hover:scale-105",
                badge.icon === icon
                  ? "border-primary ring-primary/30 ring-2"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span aria-hidden="true">{icon}</span>
            </button>
          ))}
          <Input
            value={badge.icon}
            onChange={(e) =>
              emit({ ...badge, icon: e.target.value.slice(0, 4) })
            }
            className="h-7 w-12 text-center"
            aria-label="Custom icon"
          />
        </div>

        {/* Condition */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Condition</Label>
            <Select value={badge.criteria.type} onValueChange={changeCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {badge.criteria.type === "reached_tier"
                ? "Tier"
                : conditionValueLabel(badge.criteria.type) || "—"}
            </Label>
            {badge.criteria.type === "reached_tier" ? (
              sortedTiers.length > 0 ? (
                <Select
                  value={badge.criteria.tierId ?? sortedTiers[0]?.id}
                  onValueChange={(v) =>
                    emit({
                      ...badge,
                      criteria: { ...badge.criteria, tierId: v },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedTiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-muted-foreground py-2 text-xs">
                  Add tiers first
                </p>
              )
            ) : conditionNeedsNumber(badge.criteria.type) ? (
              <Input
                type="number"
                value={badge.criteria.threshold}
                onChange={(e) =>
                  emit({
                    ...badge,
                    criteria: {
                      ...badge.criteria,
                      threshold: requiredNumber(e.target.value),
                    },
                  })
                }
              />
            ) : (
              <div className="text-muted-foreground flex h-9 items-center text-sm">
                No value
              </div>
            )}
          </div>
        </div>

        {/* Reward */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Reward</Label>
            <Select value={rKey} onValueChange={changeReward}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_OPTIONS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{rewardValueLabel(rKey)}</Label>
            <Input
              type={rewardIsText ? "text" : "number"}
              value={
                rewardIsText
                  ? typeof reward.value === "string"
                    ? reward.value
                    : ""
                  : typeof reward.value === "number"
                    ? reward.value
                    : ""
              }
              onChange={(e) =>
                emit({
                  ...badge,
                  reward: {
                    type: reward.type,
                    value: rewardIsText
                      ? e.target.value
                      : requiredNumber(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove badge"
            onClick={onRemove}
          >
            <Trash2 className="text-destructive mr-1 size-4" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
