"use client";

import { useState } from "react";
import { Users2, RotateCcw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_CATEGORY_KEYS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_ROLE_DEFAULTS,
  type NotificationRoleKey,
} from "@/data/notification-role-defaults";
import {
  useRoleDefaultOverrides,
  useEffectiveRoleCategories,
  setRoleDefaultCategory,
  resetRoleDefault,
} from "@/lib/notification-role-defaults-store";

const ROLE_KEYS = Object.keys(
  NOTIFICATION_ROLE_DEFAULTS,
) as NotificationRoleKey[];

/**
 * Facility-level notification role defaults (spec Table 51). An admin picks a
 * role and chooses which categories new accounts of that role start with. These
 * seed each staff member's personal preferences (Part 5), which then override
 * the defaults per-user.
 */
export function NotificationRoleDefaults() {
  const [role, setRole] = useState<NotificationRoleKey>("front_desk");
  const overrides = useRoleDefaultOverrides();
  const enabled = useEffectiveRoleCategories(role);
  const enabledSet = new Set(enabled);
  const isOverridden = role in overrides;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="size-5" />
          Notification Role Defaults
        </CardTitle>
        <CardDescription>
          What each role&rsquo;s notifications start with. New staff accounts
          are seeded from these; individuals can customize their own preferences
          afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={role}
            onValueChange={(v) => setRole(v as NotificationRoleKey)}
          >
            <SelectTrigger className="w-[240px]" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {NOTIFICATION_ROLE_DEFAULTS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => resetRoleDefault(role)}
            >
              <RotateCcw className="size-3.5" />
              Reset to default
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          {NOTIFICATION_ROLE_DEFAULTS[role].description}
        </p>

        <div className="divide-y overflow-hidden rounded-lg border">
          {NOTIFICATION_CATEGORY_KEYS.map((cat) => (
            <div
              key={cat}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm">
                {NOTIFICATION_CATEGORY_LABELS[cat]}
              </span>
              <Switch
                checked={enabledSet.has(cat)}
                onCheckedChange={(v) => setRoleDefaultCategory(role, cat, v)}
                aria-label={NOTIFICATION_CATEGORY_LABELS[cat]}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
