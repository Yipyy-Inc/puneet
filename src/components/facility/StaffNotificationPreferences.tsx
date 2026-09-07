"use client";

import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Bed,
  PawPrint,
  Scissors,
  GraduationCap,
  ListChecks,
  CalendarClock,
  FileText,
  CheckCircle,
  Puzzle,
  AlertTriangle,
  Lock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  useStaffNotificationPrefs,
  setStaffChannel,
  setStaffCategoryPref,
  setStaffUrgentOverride,
  DEFAULT_CATEGORY_PREF,
  type ChannelPrefs,
} from "@/lib/staff-notification-prefs-store";
import { useSettingsText } from "@/lib/settings/use-settings-text";

interface StaticCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  iconClass: string;
}

const STATIC_CATEGORIES: StaticCategory[] = [
  {
    id: "customers",
    label: "catCustomers",
    icon: Users,
    iconClass: "text-blue-600",
  },
  {
    id: "boarding",
    label: "catBoarding",
    icon: Bed,
    iconClass: "text-blue-600",
  },
  {
    id: "daycare",
    label: "catDaycare",
    icon: PawPrint,
    iconClass: "text-blue-600",
  },
  {
    id: "grooming",
    label: "catGrooming",
    icon: Scissors,
    iconClass: "text-blue-600",
  },
  {
    id: "training",
    label: "catTraining",
    icon: GraduationCap,
    iconClass: "text-blue-600",
  },
  {
    id: "tasks",
    label: "catTasks",
    icon: ListChecks,
    iconClass: "text-amber-600",
  },
  {
    id: "schedule",
    label: "catSchedule",
    icon: CalendarClock,
    iconClass: "text-blue-600",
  },
  {
    id: "forms",
    label: "catForms",
    icon: FileText,
    iconClass: "text-blue-600",
  },
  {
    id: "yipyygo",
    label: "catYipyygo",
    icon: CheckCircle,
    iconClass: "text-green-600",
  },
];

// Safety-critical, always delivered in-app, cannot be muted (spec Table 49).
const MANDATORY_ALWAYS_ON: { label: string; description: string }[] = [
  { label: "mandatoryRedFlag", description: "mandatoryRedFlagHelp" },
  { label: "mandatoryIncident", description: "mandatoryIncidentHelp" },
  { label: "mandatoryFull", description: "mandatoryFullHelp" },
  { label: "mandatoryMaintenance", description: "mandatoryMaintenanceHelp" },
];

// User-toggleable urgent overrides — ON by default (spec Table 47).
const URGENT_OVERRIDES: { key: string; label: string; description: string }[] =
  [
    {
      key: "task_overdue",
      label: "urgentTaskOverdue",
      description: "urgentTaskOverdueHelp",
    },
  ];

const CHANNELS: {
  key: keyof ChannelPrefs;
  label: string;
  icon: React.ElementType;
  hint: string;
}[] = [
  {
    key: "email",
    label: "channelEmail",
    icon: Mail,
    hint: "channelEmailHint",
  },
  // french-ok: SMS is the same three letters in both languages
  { key: "sms", label: "SMS", icon: MessageSquare, hint: "channelSmsHint" },
  {
    key: "push",
    label: "channelPush",
    icon: Smartphone,
    hint: "channelPushHint",
  },
];

/**
 * Per-user staff notification preferences (spec Part 6). Renders the logged-in
 * staff member's own preferences by default; pass a `staffId` + `readOnly` to
 * let an admin VIEW another member's choices without editing (Table 48).
 */
export function StaffNotificationPreferences({
  staffId,
  staffName,
  readOnly = false,
}: {
  staffId?: string;
  staffName?: string;
  readOnly?: boolean;
}) {
  const t = useSettingsText().section("my-notifications");
  const { user } = useCurrentUser();
  const id = staffId ?? user.id;
  const prefs = useStaffNotificationPrefs(id);
  const { modules } = useCustomServices();
  const locked = readOnly;

  const categories: StaticCategory[] = [
    ...STATIC_CATEGORIES,
    ...modules
      .filter((m) => m.status === "active")
      .map((m) => ({
        id: m.slug,
        label: m.name,
        icon: Puzzle,
        iconClass: "text-purple-600",
      })),
  ];

  return (
    <div className="space-y-6">
      {locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {t("viewingFor").replace("{name}", staffName ?? t("thisStaffMember"))}
        </div>
      )}

      {/* Section 1 — Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            {t("deliveryChannels")}
          </CardTitle>
          <CardDescription>{t("deliveryChannelsHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* In-App — always on, locked */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell className="text-muted-foreground size-4" />
              <div>
                <p className="text-sm font-medium">{t("inApp")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("inAppHelp")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="text-muted-foreground size-3.5" />
              <Switch checked disabled aria-label={t("inAppAlwaysOn")} />
            </div>
          </div>

          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <div
                key={ch.key}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="text-muted-foreground size-4" />
                  <div>
                    <p className="text-sm font-medium">{t(ch.label)}</p>
                    <p className="text-muted-foreground text-xs">
                      {t(ch.hint)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.channels[ch.key]}
                  disabled={locked}
                  onCheckedChange={(v) => setStaffChannel(id, ch.key, v)}
                  aria-label={t(ch.label)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section 2 — Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5" />
            {t("categoriesTitle")}
          </CardTitle>
          <CardDescription>{t("categoriesHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Column header (desktop) */}
          <div className="text-muted-foreground hidden grid-cols-[1fr_repeat(3,4.5rem)] gap-2 border-b px-4 py-2 text-[11px] font-medium sm:grid">
            <span />
            <span className="text-center">{t("inApp")}</span>
            <span className="text-center">{t("channelEmail")}</span>
            {/* french-ok: SMS is the same three letters in both languages */}
            <span className="text-center">SMS</span>
          </div>
          <div className="divide-y">
            {categories.map((cat) => {
              const state = prefs.categories[cat.id] ?? DEFAULT_CATEGORY_PREF;
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_repeat(3,4.5rem)]"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg",
                        cat.iconClass,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm font-medium">{t(cat.label)}</p>
                  </div>
                  <div className="flex items-center gap-6 sm:contents">
                    <ToggleCell
                      label={t("inApp")}
                      checked={state.inApp}
                      disabled={locked}
                      onChange={(v) =>
                        setStaffCategoryPref(id, cat.id, { inApp: v })
                      }
                    />
                    <ToggleCell
                      label={t("channelEmail")}
                      checked={state.email && prefs.channels.email}
                      disabled={locked || !prefs.channels.email}
                      onChange={(v) =>
                        setStaffCategoryPref(id, cat.id, { email: v })
                      }
                    />
                    <ToggleCell
                      label="SMS"
                      checked={state.sms && prefs.channels.sms}
                      disabled={locked || !prefs.channels.sms}
                      onChange={(v) =>
                        setStaffCategoryPref(id, cat.id, { sms: v })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Urgent Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            {t("urgentTitle")}
          </CardTitle>
          <CardDescription>{t("urgentHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Always on — locked (Table 49). */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t("alwaysDelivered")}
            </p>
            {MANDATORY_ALWAYS_ON.map((o) => (
              <div
                key={o.label}
                className="bg-muted/30 flex items-start gap-3 rounded-lg border border-dashed p-3"
              >
                <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(o.label)}</p>
                  <p className="text-muted-foreground text-xs">
                    {t(o.description)}
                  </p>
                </div>
                <Checkbox
                  checked
                  disabled
                  aria-label={t("alwaysOnSuffix").replace(
                    "{label}",
                    t(o.label),
                  )}
                  className="mt-0.5"
                />
              </div>
            ))}
            <p className="text-muted-foreground text-xs">
              {t("alwaysArriveNote")}
            </p>
          </div>

          {/* Recommended — on by default, can be disabled (Table 47). */}
          {URGENT_OVERRIDES.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {t("recommendedOnByDefault")}
              </p>
              {URGENT_OVERRIDES.map((o) => (
                <UrgentOverrideRow
                  key={o.key}
                  label={t(o.label)}
                  description={t(o.description)}
                  checked={prefs.urgentOverrides[o.key] ?? true}
                  disabled={locked}
                  onChange={(v) => setStaffUrgentOverride(id, o.key, v)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleCell({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:flex-col sm:justify-center sm:gap-0">
      <span className="text-muted-foreground text-xs sm:hidden">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

function UrgentOverrideRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useSettingsText().section("my-notifications");
  const id = `urgent-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="rounded-lg border p-3">
      <label htmlFor={id} className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onChange(v === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("alwaysNotifyMe")}
        </span>
      </label>
      {!checked && (
        <p className="mt-2 flex items-center gap-1.5 pl-7 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          {t("turningOffWarning")}
        </p>
      )}
    </div>
  );
}
