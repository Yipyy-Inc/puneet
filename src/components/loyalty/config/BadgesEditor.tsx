"use client";

import { useRef } from "react";
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
import { Plus, Trash2, Award } from "lucide-react";
import type {
  Badge,
  BadgeCriteriaType,
  BadgeRewardType,
} from "@/types/loyalty";

const CRITERIA_OPTIONS: { value: BadgeCriteriaType; label: string }[] = [
  { value: "bookings_count", label: "Bookings Count" },
  { value: "total_spent", label: "Total Spent ($)" },
  { value: "consecutive_months", label: "Consecutive Months" },
  { value: "referrals", label: "Referrals" },
  { value: "reviews", label: "Reviews" },
];

const REWARD_OPTIONS: { value: BadgeRewardType; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "points", label: "Points" },
  { value: "freebie", label: "Freebie" },
];

interface BadgesEditorProps {
  value: Badge[];
  onChange: (v: Badge[]) => void;
}

export function BadgesEditor({ value, onChange }: BadgesEditorProps) {
  const counter = useRef(0);

  const updateBadge = (index: number, patch: Partial<Badge>) => {
    const next = value.map((badge, i) =>
      i === index ? { ...badge, ...patch } : badge,
    );
    onChange(next);
  };

  const removeBadge = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addBadge = () => {
    const newBadge: Badge = {
      id: `badge-${Date.now()}-${counter.current++}`,
      name: "",
      description: "",
      icon: "star",
      criteria: { type: "bookings_count", threshold: 0 },
    };
    onChange([...value, newBadge]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {value.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onPatch={(patch) => updateBadge(index, patch)}
            onRemove={() => removeBadge(index)}
          />
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addBadge}>
        <Plus className="size-4" />
        Add Badge
      </Button>
    </div>
  );
}

interface BadgeCardProps {
  badge: Badge;
  onPatch: (patch: Partial<Badge>) => void;
  onRemove: () => void;
}

function BadgeCard({ badge, onPatch, onRemove }: BadgeCardProps) {
  const rewardEnabled = badge.reward !== undefined;

  const toggleReward = (enabled: boolean) => {
    if (enabled) {
      onPatch({ reward: { type: "discount", value: 0 } });
    } else {
      onPatch({ reward: undefined });
    }
  };

  const updateRewardType = (type: BadgeRewardType) => {
    const current = badge.reward;
    const value =
      type === "freebie"
        ? typeof current?.value === "string"
          ? current.value
          : ""
        : typeof current?.value === "number"
          ? current.value
          : 0;
    onPatch({ reward: { type, value } });
  };

  const updateRewardValue = (raw: string) => {
    if (!badge.reward) return;
    const value =
      badge.reward.type === "freebie" ? raw : raw === "" ? 0 : Number(raw);
    onPatch({ reward: { type: badge.reward.type, value } });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Award className="size-4" />
            Badge
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove badge"
            onClick={onRemove}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Icon</Label>
            <Input
              value={badge.icon}
              placeholder="star"
              onChange={(e) => onPatch({ icon: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={badge.name}
              placeholder="Loyal Customer"
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={badge.description}
            placeholder="Describe how this badge is earned"
            onChange={(e) => onPatch({ description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Criteria</Label>
            <Select
              value={badge.criteria.type}
              onValueChange={(v) =>
                onPatch({
                  criteria: {
                    ...badge.criteria,
                    type: v as BadgeCriteriaType,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITERIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Threshold</Label>
            <Input
              type="number"
              value={badge.criteria.threshold}
              onChange={(e) =>
                onPatch({
                  criteria: {
                    ...badge.criteria,
                    threshold:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor={`reward-${badge.id}`}>Award a reward</Label>
          <Switch
            id={`reward-${badge.id}`}
            checked={rewardEnabled}
            onCheckedChange={toggleReward}
          />
        </div>

        {badge.reward ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reward Type</Label>
              <Select
                value={badge.reward.type}
                onValueChange={(v) => updateRewardType(v as BadgeRewardType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type={badge.reward.type === "freebie" ? "text" : "number"}
                value={badge.reward.value}
                placeholder={
                  badge.reward.type === "freebie" ? "Free nail trim" : "0"
                }
                onChange={(e) => updateRewardValue(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
