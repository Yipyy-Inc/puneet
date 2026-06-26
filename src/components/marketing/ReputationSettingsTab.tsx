"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Settings2,
  Users,
  Info,
  Send,
} from "lucide-react";
import { useReputation } from "@/hooks/use-reputation";
import { initialStep, describeMinutes } from "@/lib/reputation/trigger-engine";
import { buildReviewPath } from "@/lib/reputation/review-link";
import { ReputationChannelFlowBuilder } from "@/components/marketing/ReputationChannelFlowBuilder";
import { ReputationSequenceBuilder } from "@/components/marketing/ReputationSequenceBuilder";
import { ReputationEscalationRouting } from "@/components/marketing/ReputationEscalationRouting";
import type {
  ReputationSettings,
  ReputationTriggerConfig,
  ReputationNotifyOn,
  ReputationRating,
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
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
            <Icon className="text-primary h-4 w-4" />
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
    <label className="group flex cursor-pointer items-start gap-3">
      <div
        className="relative mt-0.5 shrink-0"
        onClick={() => onChange(!checked)}
      >
        <div
          className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
        />
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
      <div>
        <p className="text-sm/none font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        )}
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
    <div className="flex items-center justify-between border-b py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${trigger.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
        />
        <div>
          <p className="text-sm font-medium">{trigger.label}</p>
          {trigger.serviceType === "custom" && (
            <Badge variant="secondary" className="mt-0.5 h-4 text-xs">
              Custom Service
            </Badge>
          )}
        </div>
      </div>
      <Toggle checked={trigger.enabled} onChange={onChange} label="" />
    </div>
  );
}

const NOTIFY_OPTIONS: { value: ReputationNotifyOn; label: string }[] = [
  { value: "all", label: "All reviews" },
  { value: "under_3_stars", label: "Under 3 stars only" },
  { value: "5_stars_only", label: "5-star reviews only" },
  { value: "mention_only", label: "When mentioned by name" },
];

/** Parse a number input, falling back (and clamping) so a cleared field can't store NaN. */
function safeInt(
  value: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

export function ReputationSettingsTab() {
  const { settings: initial, updateSettings } = useReputation();
  const [settings, setSettings] = useState<ReputationSettings | null>(null);
  const [saved, setSaved] = useState(false);

  const s: ReputationSettings = settings ?? initial;

  function update<K extends keyof ReputationSettings>(
    key: K,
    value: ReputationSettings[K],
  ) {
    setSettings((prev) => ({ ...(prev ?? s), [key]: value }));
    setSaved(false);
  }

  function patchDraft(patch: Partial<ReputationSettings>) {
    setSettings((prev) => ({ ...(prev ?? s), ...patch }));
    setSaved(false);
  }

  function updateTrigger(event: string, enabled: boolean) {
    update(
      "triggers",
      s.triggers.map((t) => (t.event === event ? { ...t, enabled } : t)),
    );
  }

  function save() {
    updateSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5">
      {/* Automation pipeline — Step 1 trigger preview + test */}
      <AutomationPipelineCard settings={s} />

      {/* Master toggle */}
      <Card
        className={`${s.enabled ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/10" : "border-dashed"}`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
              >
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Reputation Booster</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {s.enabled
                    ? "Active — review requests are being sent automatically"
                    : "Inactive — no review requests are being sent"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={s.enabled ? "default" : "secondary"}
                className={
                  s.enabled ? "border-0 bg-emerald-100 text-emerald-700" : ""
                }
              >
                {s.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Toggle
                checked={s.enabled}
                onChange={(v) => update("enabled", v)}
                label=""
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Section
        title="Trigger Events"
        description="Choose which events automatically send a review request to the client."
        icon={Zap}
      >
        <div>
          {s.triggers.map((t) => (
            <TriggerRow
              key={t.event}
              trigger={t}
              onChange={(enabled) => updateTrigger(t.event, enabled)}
            />
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Custom services you create will appear automatically in this list
            once configured in the Services module.
          </p>
        </div>
      </Section>

      {/* Outreach sequence (multi-step) */}
      <Section
        title="Send Sequence"
        description="Build a multi-step outreach: an initial send plus backup reminders that only fire if the client hasn't responded."
        icon={Clock}
      >
        <div className="space-y-4">
          <ReputationSequenceBuilder
            steps={
              s.outreachSequence && s.outreachSequence.length > 0
                ? s.outreachSequence
                : [
                    {
                      id: "seq-initial",
                      channel: "sms",
                      delayMinutes: 60,
                      onlyIfNoResponse: false,
                    },
                  ]
            }
            onChange={(steps) => update("outreachSequence", steps)}
          />

          <div className="space-y-1.5">
            <Label className="text-sm">Daily send limit per client</Label>
            <Select
              value={String(s.dailySendLimitPerClient)}
              onValueChange={(v) =>
                update("dailySendLimitPerClient", parseInt(v))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 per day (recommended)</SelectItem>
                <SelectItem value="2">2 per day</SelectItem>
                <SelectItem value="3">3 per day</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              If a client completes multiple services on the same day, only one
              review request is sent.
            </p>
          </div>
        </div>
      </Section>

      {/* Channels */}
      <Section
        title="Delivery Channels"
        description="Choose how review requests are delivered to clients."
        icon={MessageSquare}
      >
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

      {/* Review routing mode */}
      <Section
        title="Review Routing"
        description="Decide how clients are guided after they rate their visit."
        icon={Shield}
      >
        <div className="space-y-2">
          <Label className="text-sm">Interception threshold</Label>
          <p className="text-muted-foreground text-xs">
            Reviews at or above this score are treated as public-ready; below it
            they&apos;re intercepted for private follow-up.
          </p>
          <div className="flex gap-1.5">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update("happyThreshold", n as ReputationRating)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  s.happyThreshold === n
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {n}★ &amp; up public
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Currently: {s.happyThreshold}★ and up are public-ready;{" "}
            {s.happyThreshold - 1}★ and below stay private.
          </p>
        </div>

        <Toggle
          checked={(s.feedbackRouting ?? "open") === "gated"}
          onChange={(v) => update("feedbackRouting", v ? "gated" : "open")}
          label="Gate public reviews by rating"
          description="When on, only clients at or above your happy threshold are shown public review links; lower ratings are intercepted privately."
        />
        {(s.feedbackRouting ?? "open") === "gated" ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Heads up: selectively asking only happy clients for public reviews
              (&ldquo;review gating&rdquo;) may violate the FTC Act and Google /
              Yelp policies — they can remove your reviews. Most businesses
              should keep this off.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Open routing (recommended): every client is invited to review
              publicly and privately. You still catch unhappy clients — low
              ratings alert your manager — without hiding the public option.
            </p>
          </div>
        )}
      </Section>

      {/* Multi-platform channel manager (drag-and-drop) */}
      <Section
        title="Channel Manager"
        description="Add, reorder, or disable your public review channels. Drag to set priority — the top enabled channel is offered first in the survey."
        icon={Globe}
      >
        <ReputationChannelFlowBuilder value={s} onChange={patchDraft} />
      </Section>

      {/* Protection rules */}
      <Section
        title="Protection Rules"
        description="Block review requests when certain conditions are present — prevents tone-deaf outreach."
        icon={Shield}
      >
        <div className="space-y-3">
          <Toggle
            checked={s.protectionRules.blockOnCancelled}
            onChange={(v) =>
              update("protectionRules", {
                ...s.protectionRules,
                blockOnCancelled: v,
              })
            }
            label="Block on cancelled bookings"
          />
          <Toggle
            checked={s.protectionRules.blockOnRefundInProgress}
            onChange={(v) =>
              update("protectionRules", {
                ...s.protectionRules,
                blockOnRefundInProgress: v,
              })
            }
            label="Block when refund is in progress"
          />
          <Toggle
            checked={s.protectionRules.blockOnCriticalIncident}
            onChange={(v) =>
              update("protectionRules", {
                ...s.protectionRules,
                blockOnCriticalIncident: v,
              })
            }
            label="Block when booking has a critical incident"
          />
          <Toggle
            checked={s.protectionRules.blockOnOptOut}
            onChange={(v) =>
              update("protectionRules", {
                ...s.protectionRules,
                blockOnOptOut: v,
              })
            }
            label="Block for clients who opted out"
          />
          <Toggle
            checked={s.protectionRules.blockOnOpenDispute}
            onChange={(v) =>
              update("protectionRules", {
                ...s.protectionRules,
                blockOnOpenDispute: v,
              })
            }
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
                onChange={(e) =>
                  update("protectionRules", {
                    ...s.protectionRules,
                    cooldownDays: safeInt(
                      e.target.value,
                      s.protectionRules.cooldownDays,
                      1,
                      365,
                    ),
                  })
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                days between requests to the same client
              </span>
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
                onChange={(e) =>
                  update(
                    "negativePauseDays",
                    safeInt(e.target.value, s.negativePauseDays, 1, 90),
                  )
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                pause all requests after a negative rating
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Escalation routing */}
      <Section
        title="Escalation Routing"
        description="Route negative reviews to the right person by service. Assign one or several people — everyone assigned gets the alert and a follow-up task."
        icon={Users}
      >
        <ReputationEscalationRouting
          routes={s.escalationRoutes ?? []}
          onChange={(routes) => update("escalationRoutes", routes)}
        />
      </Section>

      {/* Reminders */}
      <Section
        title="Smart Reminders"
        description="One gentle nudge for happy clients who rated but never clicked through to post publicly. (No-response reminders are configured in the Send Sequence above.)"
        icon={Bell}
      >
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Happy-but-silent follow-up</p>
            <Toggle
              checked={s.reminders.happyNoClickReminderEnabled}
              onChange={(v) =>
                update("reminders", {
                  ...s.reminders,
                  happyNoClickReminderEnabled: v,
                })
              }
              label="Remind happy clients who haven't clicked a review link"
              description="One gentle nudge — never more than once"
            />
            {s.reminders.happyNoClickReminderEnabled && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Send after (hours)
                </Label>
                <Input
                  type="number"
                  min={24}
                  max={120}
                  value={s.reminders.happyNoClickReminderHours}
                  onChange={(e) =>
                    update("reminders", {
                      ...s.reminders,
                      happyNoClickReminderHours: safeInt(
                        e.target.value,
                        s.reminders.happyNoClickReminderHours,
                        24,
                        120,
                      ),
                    })
                  }
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
            <div
              key={sn.staffId}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="from-primary/20 to-primary/40 text-primary flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold">
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
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFY_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-xs"
                    >
                      {o.label}
                    </SelectItem>
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
            onChange={(e) =>
              update(
                "managerAlertEmails",
                e.target.value.split(",").map((x) => x.trim()),
              )
            }
            placeholder="manager@yourbusiness.com"
          />
          <p className="text-muted-foreground text-xs">
            Immediate alerts are sent here for 1–2 star ratings. Separate
            multiple addresses with commas.
          </p>
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

// ─── Automation pipeline (Step 1) ─────────────────────────────────────────────

function AutomationPipelineCard({
  settings,
}: {
  settings: ReputationSettings;
}) {
  const { recordCheckout, runtimeRequests } = useReputation();

  const step = initialStep(settings);
  const channel = step.channel;
  const scheduledCount = runtimeRequests.filter(
    (r) => r.status === "scheduled",
  ).length;

  function runTest() {
    const enabledTrigger = settings.triggers.find((t) => t.enabled);
    // Synthetic client id so repeated tests aren't blocked by cooldown.
    const syntheticId = -Math.floor(Date.now() / 1000);
    const result = recordCheckout({
      bookingId: 90000 + (syntheticId % 1000),
      clientId: syntheticId,
      clientName: "Test Client",
      petName: "Buddy (test)",
      service: enabledTrigger?.event.replace(/_.*/, "") ?? "boarding",
      serviceLabel: enabledTrigger?.label ?? "Boarding Checkout",
      triggerEvent: enabledTrigger?.event ?? "boarding_checkout",
      checkoutAt: new Date().toISOString(),
    });

    if (!result.allowed) {
      toast.error("Review request not scheduled", {
        description: result.reason,
      });
      return;
    }

    const req = result.request;
    const openSurvey = req
      ? {
          label: "Open survey",
          onClick: () => window.open(buildReviewPath(req.id), "_blank"),
        }
      : undefined;
    if (req?.status === "sent") {
      toast.success("Test review request sent", {
        description: `Sent immediately via ${req.channel.toUpperCase()} — open the survey link the client would receive.`,
        action: openSurvey,
      });
    } else if (req?.scheduledSendAt) {
      toast.success("Test review request scheduled", {
        description: `Will send ${describeMinutes(step.delayMinutes)} (${new Date(
          req.scheduledSendAt,
        ).toLocaleTimeString("en-CA", {
          hour: "2-digit",
          minute: "2-digit",
        })}) via ${req.channel.toUpperCase()}. Preview the client's survey:`,
        action: openSurvey,
      });
    }
  }

  const steps = [
    {
      label: "Checkout",
      sub: "Pet marked checked out (T0)",
      icon: CheckCircle2,
    },
    {
      label: "Delay (Δt)",
      sub: describeMinutes(step.delayMinutes),
      icon: Clock,
    },
    {
      label: "Send",
      sub: channel ? `via ${channel.toUpperCase()}` : "no channel enabled",
      icon: channel === "sms" ? Smartphone : Mail,
    },
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Automated Post-Service Trigger
        </CardTitle>
        <CardDescription>
          When a pet is checked out, a review request is scheduled automatically
          and sent after the configured delay on the client&apos;s channel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1.5">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center gap-1.5">
              <div className="bg-background flex-1 rounded-xl border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-sm/none font-medium">{step.label}</p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {step.sub}
                    </p>
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <span className="text-muted-foreground shrink-0">→</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {settings.enabled ? (
              <>
                <span className="font-medium text-emerald-600">Live</span> —{" "}
                {scheduledCount > 0
                  ? `${scheduledCount} request${scheduledCount > 1 ? "s" : ""} scheduled and awaiting send.`
                  : "real checkouts will schedule requests here."}
              </>
            ) : (
              <span className="text-muted-foreground">
                Paused — enable Reputation Booster below to activate.
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={runTest}
            disabled={!settings.enabled}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" /> Send test review request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
