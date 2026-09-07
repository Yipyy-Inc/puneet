"use client";

import { useSettingsText } from "@/lib/settings/use-settings-text";

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
  NOTIFICATION_ROLE_DEFAULTS,
  type NotificationCategoryKey,
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
 * The fixture's `label` and `description` are English, and this screen renders
 * them straight — so a French admin read every role and every category in
 * English while the section reported converted. The gate cannot see it: the
 * strings live in `src/data`, which no extractor reads.
 *
 * The fixture keeps the ENABLED CATEGORIES, which is the part that is data.
 * The words come from the catalogue, keyed off the fixture's own key so the
 * two cannot drift apart silently — a new role fails typecheck here.
 */
const ROLE_TEXT: Record<NotificationRoleKey, { label: string; help: string }> =
  {
    owner: { label: "roleOwner", help: "roleOwnerHelp" },
    manager: { label: "roleManager", help: "roleManagerHelp" },
    front_desk: { label: "roleFrontDesk", help: "roleFrontDeskHelp" },
    groomer: { label: "roleGroomer", help: "roleGroomerHelp" },
    trainer: { label: "roleTrainer", help: "roleTrainerHelp" },
    kennel_tech: { label: "roleKennelTech", help: "roleKennelTechHelp" },
    driver: { label: "roleDriver", help: "roleDriverHelp" },
  };

const CATEGORY_TEXT: Record<NotificationCategoryKey, string> = {
  customers: "catCustomers",
  boarding: "catBoarding",
  daycare: "catDaycare",
  grooming: "catGrooming",
  training: "catTraining",
  tasks: "catTasks",
  schedule: "catSchedule",
  forms: "catForms",
  yipyygo: "catYipyygo",
};

/**
 * Facility-level notification role defaults (spec Table 51). An admin picks a
 * role and chooses which categories new accounts of that role start with. These
 * seed each staff member's personal preferences (Part 5), which then override
 * the defaults per-user.
 */
export function NotificationRoleDefaults() {
  const t = useSettingsText().section("notifications");
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
          {t("roleDefaults")}
        </CardTitle>
        <CardDescription>{t("roleDefaultsHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={role}
            onValueChange={(v) => setRole(v as NotificationRoleKey)}
          >
            <SelectTrigger className="min-w-[240px]" aria-label={t("role")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(ROLE_TEXT[k].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-[13.5px]"
              onClick={() => resetRoleDefault(role)}
            >
              <RotateCcw className="size-3.5" />
              {t("resetToDefault")}
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          {t(ROLE_TEXT[role].help)}
        </p>

        <div className="divide-y overflow-hidden rounded-lg border">
          {NOTIFICATION_CATEGORY_KEYS.map((cat) => (
            <div
              key={cat}
              // §5m / §5n: rows are 48 at balanced density and roomy wins below
              // 1024px. Measured at 599px these were 41px, which cannot
              // contain the 48px tap target §6 rule 7 requires of the switch
              // inside them — the overlay had to bleed into the row above.
              className="flex min-h-12 items-center justify-between px-4 py-2.5 max-lg:min-h-14"
            >
              <span className="text-sm">{t(CATEGORY_TEXT[cat])}</span>
              <Switch
                checked={enabledSet.has(cat)}
                onCheckedChange={(v) => setRoleDefaultCategory(role, cat, v)}
                aria-label={t(CATEGORY_TEXT[cat])}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
