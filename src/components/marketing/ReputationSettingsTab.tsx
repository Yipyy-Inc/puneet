"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Clock,
  Bell,
  Globe,
  Zap,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Users,
  Star,
  Info,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import type {
  ReputationSettings,
  ReputationTriggerConfig,
  ReputationNotifyOn,
  ReputationDelay,
} from "@/types/reputation";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0" onClick={() => onChange(!checked)}>
        <div className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`} />
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <div>
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </label>
  );
}

// ─── Trigger row ──────────────────────────────────────────────────────────────

function TriggerRow({
  trigger,
  onChange,
}: {
  trigger: ReputationTriggerConfig;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${trigger.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
        <div>
          <p className="text-sm font-medium">{trigger.label}</p>
          {trigger.serviceType === "custom" && (
            <Badge variant="secondary" className="text-xs mt-0.5 h-4">Custom Service</Badge>
          )}
        </div>
      </div>
      <Toggle checked={trigger.enabled} onChange={onChange} label="" />
    </div>
  );
}

const DELAY_OPTIONS: { value: ReputationDelay; label: string }[] = [
  { value: "immediate", label: "Immediately" },
  { value: "30min", label: "30 minutes after" },
  { value: "1hour", label: "1 hour after (recommended)" },
  { value: "3hours", label: "3 hours after (recommended)" },
  { value: "24hours", label: "24 hours after" },
  { value: "custom", label: "Custom interval" },
];

const NOTIFY_OPTIONS: { value: ReputationNotifyOn; label: string }[] = [
  { value: "all", label: "All reviews" },
  { value: "under_3_stars", label: "Under 3 stars only" },
  { value: "5_stars_only", label: "5-star reviews only" },
  { value: "mention_only", label: "When mentioned by name" },
];

// ─── Settings tab ─────────────────────────────────────────────────────────────

export function ReputationSettingsTab() {
  const { data: initial } = useQuery(reputationQueries.settings());
  const [settings, setSettings] = useState<ReputationSettings | null>(null);
  const [saved, setSaved] = useState(false);

  const s: ReputationSettings | null = settings ?? initial ?? null;

  if (!s) return null;

  function update<K extends keyof ReputationSettings>(key: K, value: ReputationSettings[K]) {
    setSettings((prev) => ({ ...(prev ?? s!), [key]: value }));
    setSaved(false);
  }

  function updateTrigger(event: string, enabled: boolean) {
    update("triggers", s!.triggers.map((t) => (t.event === event ? { ...t, enabled } : t)));
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5">

      {/* Master toggle */}
      <Card className={`${s.enabled ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-dashed"}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Reputation Booster</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.enabled ? "Active — review requests are being sent automatically" : "Inactive — no review requests are being sent"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={s.enabled ? "default" : "secondary"} className={s.enabled ? "bg-emerald-100 text-emerald-700 border-0" : ""}>
                {s.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Toggle checked={s.enabled} onChange={(v) => update("enabled", v)} label="" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Section title="Trigger Events" description="Choose which events automatically send a review request to the client." icon={Zap}>
        <div>
          {s.triggers.map((t) => (
            <TriggerRow key={t.event} trigger={t} onChange={(enabled) => updateTrigger(t.event, enabled)} />
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
          <p className="text-xs text-blue-700 dark:text-blue-300">Custom services you create will appear automatically in this list once configured in the Services module.</p>
        </div>
      </Section>

      {/* Timing */}
      <Section title="Send Timing" description="When should the review request go out after the trigger event fires?" icon={Clock}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Send Delay</Label>
            <Select value={s.delay} onValueChange={(v) => update("delay", v as ReputationDelay)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {s.delay === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-sm">Custom delay (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={s.customDelayMinutes ?? 90}
                onChange={(e) => update("customDelayMinutes", parseInt(e.target.value))}
                className="w-36"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Daily send limit per client</Label>
            <Select value={String(s.dailySendLimitPerClient)} onValueChange={(v) => update("dailySendLimitPerClient", parseInt(v))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 per day (recommended)</SelectItem>
                <SelectItem value="2">2 per day</SelectItem>
                <SelectItem value="3">3 per day</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">If a client completes multiple services on the same day, only one review request is sent.</p>
          </div>
        </div>
      </Section>

      {/* Channels */}
      <Section title="Delivery Channels" description="Choose how review requests are delivered to clients." icon={MessageSquare}>
        <div className="space-y-3">
          <Toggle
            checked={s.channels.sms}
            onChange={(v) => update("channels", { ...s.channels, sms: v })}
            label="SMS"
            description="Send via text message — highest open rate"
          />
          <Toggle
            checked={s.channels.email}
            onChange={(v) => update("channels", { ...s.channels, email: v })}
            label="Email"
            description="Send via email — great for clients who prefer inbox communication"
          />
        </div>
      </Section>

      {/* Review platforms */}
      <Section title="Review Platforms" description="Link your public review pages. Happy clients (4–5 stars) will be directed here." icon={Globe}>
        <div className="space-y-5">
          {(["google", "facebook", "yelp"] as const).map((platform) => {
            const cfg = s.reviewPlatforms[platform];
            const icons: Record<string, string> = { google: "G", facebook: "f", yelp: "Y" };
            const colors: Record<string, string> = {
              google: "text-blue-600 bg-blue-50",
              facebook: "text-indigo-600 bg-indigo-50",
              yelp: "text-red-600 bg-red-50",
            };
            return (
              <div key={platform} className={`rounded-xl border p-4 space-y-3 ${!cfg.enabled ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${colors[platform]}`}>
                      {icons[platform]}
                    </div>
                    <p className="font-semibold capitalize">{platform}</p>
                    {cfg.reviewCount && (
                      <span className="text-xs text-muted-foreground">{cfg.reviewCount} reviews · {cfg.avgRating}★</span>
                    )}
                  </div>
                  <Toggle
                    checked={cfg.enabled}
                    onChange={(v) => update("reviewPlatforms", { ...s.reviewPlatforms, [platform]: { ...cfg, enabled: v } })}
                    label=""
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Direct review page URL</Label>
                  <Input
                    placeholder={`https://${platform === "google" ? "g.page/r/your-business/review" : platform === "facebook" ? "facebook.com/yourpage/reviews" : "yelp.com/biz/your-business"}`}
                    value={cfg.url}
                    onChange={(e) => update("reviewPlatforms", { ...s.reviewPlatforms, [platform]: { ...cfg, url: e.target.value } })}
                    className="text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Protection rules */}
      <Section title="Protection Rules" description="Block review requests when certain conditions are present — prevents tone-deaf outreach." icon={Shield}>
        <div className="space-y-3">
          <Toggle
            checked={s.protectionRules.blockOnCancelled}
            onChange={(v) => update("protectionRules", { ...s.protectionRules, blockOnCancelled: v })}
            label="Block on cancelled bookings"
          />
          <Toggle
            checked={s.protectionRules.blockOnRefundInProgress}
            onChange={(v) => update("protectionRules", { ...s.protectionRules, blockOnRefundInProgress: v })}
            label="Block when refund is in progress"
          />
          <Toggle
            checked={s.protectionRules.blockOnCriticalIncident}
            onChange={(v) => update("protectionRules", { ...s.protectionRules, blockOnCriticalIncident: v })}
            label="Block when booking has a critical incident"
          />
          <Toggle
            checked={s.protectionRules.blockOnOptOut}
            onChange={(v) => update("protectionRules", { ...s.protectionRules, blockOnOptOut: v })}
            label="Block for clients who opted out"
          />
          <Toggle
            checked={s.protectionRules.blockOnOpenDispute}
            onChange={(v) => update("protectionRules", { ...s.protectionRules, blockOnOpenDispute: v })}
            label="Block when client has an open dispute"
          />

          <div className="space-y-1.5 pt-2">
            <Label className="text-sm">Client cooldown period (days)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={s.protectionRules.cooldownDays}
                onChange={(e) => update("protectionRules", { ...s.protectionRules, cooldownDays: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days between requests to the same client</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Negative feedback pause (days)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={90}
                value={s.negativePauseDays}
                onChange={(e) => update("negativePauseDays", parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">pause all requests after a negative rating</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Reminders */}
      <Section title="Smart Reminders" description="Configure follow-up messages for clients who don't respond or haven't clicked a review link." icon={Bell}>
        <div className="space-y-5">
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-semibold">No-response reminders</p>
            <Toggle
              checked={s.reminders.noResponseReminderEnabled}
              onChange={(v) => update("reminders", { ...s.reminders, noResponseReminderEnabled: v })}
              label="Send reminder if no response"
              description="Triggered when the client hasn't rated after the first request"
            />
            {s.reminders.noResponseReminderEnabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Reminder 1 after (hours)</Label>
                    <Input
                      type="number"
                      min={12}
                      max={72}
                      value={s.reminders.noResponseReminder1Hours}
                      onChange={(e) => update("reminders", { ...s.reminders, noResponseReminder1Hours: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Reminder 2 after (hours)</Label>
                    <Input
                      type="number"
                      min={24}
                      max={120}
                      value={s.reminders.noResponseReminder2Hours}
                      onChange={(e) => update("reminders", { ...s.reminders, noResponseReminder2Hours: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Max reminders allowed</Label>
                  <Select
                    value={String(s.reminders.maxReminders)}
                    onValueChange={(v) => update("reminders", { ...s.reminders, maxReminders: parseInt(v) as 0 | 1 | 2 })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="1">1 reminder</SelectItem>
                      <SelectItem value="2">2 reminders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-semibold">Happy-but-silent follow-up</p>
            <Toggle
              checked={s.reminders.happyNoClickReminderEnabled}
              onChange={(v) => update("reminders", { ...s.reminders, happyNoClickReminderEnabled: v })}
              label="Remind happy clients who haven't clicked a review link"
              description="One gentle nudge — never more than once"
            />
            {s.reminders.happyNoClickReminderEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Send after (hours)</Label>
                <Input
                  type="number"
                  min={24}
                  max={120}
                  value={s.reminders.happyNoClickReminderHours}
                  onChange={(e) => update("reminders", { ...s.reminders, happyNoClickReminderHours: parseInt(e.target.value) })}
                  className="w-36"
                />
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Staff notifications */}
      <Section
        title="Staff Notifications"
        description="Control what each team member is notified about when reviews arrive."
        icon={Users}
      >
        <div className="space-y-3">
          {s.staffNotifications.map((sn, idx) => (
            <div key={sn.staffId} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                  {sn.staffName.charAt(0)}
                </div>
                <p className="text-sm font-medium">{sn.staffName}</p>
              </div>
              <Select
                value={sn.notifyOn}
                onValueChange={(v) => {
                  const updated = [...s.staffNotifications];
                  updated[idx] = { ...sn, notifyOn: v as ReputationNotifyOn };
                  update("staffNotifications", updated);
                }}
              >
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Manager alert email(s)</Label>
          <Input
            value={s.managerAlertEmails.join(", ")}
            onChange={(e) => update("managerAlertEmails", e.target.value.split(",").map((x) => x.trim()))}
            placeholder="manager@yourbusiness.com"
          />
          <p className="text-xs text-muted-foreground">Immediate alerts are sent here for 1–2 star ratings. Separate multiple addresses with commas.</p>
        </div>
      </Section>

      {/* Save button */}
      <div className="flex justify-end gap-3 pt-2">
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Settings saved
          </div>
        )}
        <Button onClick={save} className="gap-2">
          <Settings2 className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
