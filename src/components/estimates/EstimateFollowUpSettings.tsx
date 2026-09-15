"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  FOLLOW_UP_MERGE_TAGS,
  type EstimateFollowUps,
  type FollowUpChannel,
  type FollowUpRule,
} from "@/lib/settings/estimate-follow-ups";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// Estimate follow-up reminders, saved for the facility and sent.
//
// This card kept its settings in localStorage and nothing sent them. It now
// edits the `estimate_follow_ups` domain, and the messaging tick queues what
// it asks for (lib/estimates/follow-up-tick.ts). Off until a facility turns it
// on and saves.
//
// Gone from the old card, each for a reason:
// - its own expiry block, a second copy of the defaults card's expiry days,
//   whose "expired estimate action" nothing ever read;
// - "stop following up when", because every reminder now stops when the
//   estimate is accepted, declined, converted or expires, or the customer books
//   anything since — a reminder after any of those was never a choice;
// - the preview, which filled the message with an invented customer.
// ============================================================================

type RuleKey = "notViewed" | "viewed";

interface RuleDraft {
  enabled: boolean;
  delayDays: string;
  channel: FollowUpChannel;
  maxFollowUps: string;
  emailMessage: string;
  smsMessage: string;
}

interface Draft {
  enabled: boolean;
  notViewed: RuleDraft;
  viewed: RuleDraft;
}

function ruleDraft(rule: FollowUpRule): RuleDraft {
  return {
    ...rule,
    delayDays: String(rule.delayDays),
    maxFollowUps: String(rule.maxFollowUps),
  };
}

function draftFrom(value: EstimateFollowUps): Draft {
  return {
    enabled: value.enabled,
    notViewed: ruleDraft(value.notViewed),
    viewed: ruleDraft(value.viewed),
  };
}

function wholeIn(raw: string, min: number, max: number): boolean {
  const value = Number(raw);
  return (
    raw.trim() !== "" && Number.isInteger(value) && value >= min && value <= max
  );
}

/** The catalogue key of each problem with a rule, or none. */
function ruleProblems(rule: RuleDraft) {
  return {
    delay: wholeIn(rule.delayDays, 1, 14) ? null : "delayInvalid",
    max: wholeIn(rule.maxFollowUps, 1, 10) ? null : "maxInvalid",
    email: rule.emailMessage.length > 2000 ? "emailTooLong" : null,
    sms: rule.smsMessage.length > 320 ? "smsTooLong" : null,
  };
}

function toRule(rule: RuleDraft): FollowUpRule {
  return {
    enabled: rule.enabled,
    delayDays: Number(rule.delayDays),
    channel: rule.channel,
    maxFollowUps: Number(rule.maxFollowUps),
    emailMessage: rule.emailMessage,
    smsMessage: rule.smsMessage,
  };
}

export function EstimateFollowUpSettings() {
  const t = useSettingsText().section("estimate-settings");
  const { settings, isPending, error } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const stored = settings.estimate_follow_ups;

  // The server's value is the truth; state holds only what was edited since it
  // arrived, so the disabled fallback shown while loading is never latched.
  const [draft, setDraft] = useState<Draft | null>(null);
  const form = draft ?? draftFrom(stored.value);
  const update = (changes: Partial<Draft>) =>
    setDraft((prev) => ({ ...(prev ?? draftFrom(stored.value)), ...changes }));
  const updateRule = (key: RuleKey, changes: Partial<RuleDraft>) =>
    update({ [key]: { ...form[key], ...changes } });

  // Checked whether or not a rule is on: the stored value must parse either way.
  const blocked = [form.notViewed, form.viewed].some((rule) =>
    Object.values(ruleProblems(rule)).some(Boolean),
  );

  const handleSave = async () => {
    if (blocked) return;
    try {
      await saveSetting.mutateAsync({
        domain: "estimate_follow_ups",
        value: {
          enabled: form.enabled,
          notViewed: toRule(form.notViewed),
          viewed: toRule(form.viewed),
        } satisfies EstimateFollowUps,
      });
      setDraft(null);
      toast.success(t("followUpsSaved"));
    } catch (cause) {
      toast.error(t("followUpsFailed"), {
        description: cause instanceof Error ? cause.message : undefined,
      });
    }
  };

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error) {
    return (
      <Card>
        <CardContent className="text-destructive p-6 text-sm">
          {t("followUpsFailed")}
        </CardContent>
      </Card>
    );
  }

  const tags = FOLLOW_UP_MERGE_TAGS.map((tag) => `{{${tag}}}`).join(", ");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              {t("followUpTitle")}
            </CardTitle>
            <CardDescription>{t("followUpHelp")}</CardDescription>
          </div>
          <Switch
            id="follow-ups-enabled"
            aria-label={t("enableFollowUps")}
            checked={form.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {form.enabled ? (
          <>
            <RuleEditor
              id="not_viewed"
              icon={<Eye className="size-4" />}
              title={t("notViewedTitle")}
              help={t("notViewedHelp")}
              delayLabel={t("delayNotViewed")}
              standardEmail={t("defaultNotViewedEmail")}
              standardSms={t("defaultNotViewedSms")}
              rule={form.notViewed}
              onChange={(changes) => updateRule("notViewed", changes)}
              t={t}
            />
            <RuleEditor
              id="viewed"
              icon={<CheckCircle className="size-4" />}
              title={t("viewedTitle")}
              help={t("viewedHelp")}
              delayLabel={t("delayViewed")}
              standardEmail={t("defaultViewedEmail")}
              standardSms={t("defaultViewedSms")}
              rule={form.viewed}
              onChange={(changes) => updateRule("viewed", changes)}
              t={t}
            />
            <p className="text-muted-foreground text-sm">
              {t("mergeTags").replace("{tags}", tags)}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t("followUpsOff")}</p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={blocked || saveSetting.isPending}
          >
            {saveSetting.isPending ? t("saving") : t("saveFollowUps")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleEditor({
  id,
  icon,
  title,
  help,
  delayLabel,
  standardEmail,
  standardSms,
  rule,
  onChange,
  t,
}: {
  id: "not_viewed" | "viewed";
  icon: React.ReactNode;
  title: string;
  help: string;
  delayLabel: string;
  standardEmail: string;
  standardSms: string;
  rule: RuleDraft;
  onChange: (changes: Partial<RuleDraft>) => void;
  t: (key: string) => string;
}) {
  const problems = ruleProblems(rule);
  const field = (name: string) => `follow-up-${id}-${name}`;

  return (
    <section className="space-y-4 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 font-semibold">
            {icon}
            {title}
          </p>
          <p className="text-muted-foreground text-sm">{help}</p>
        </div>
        <Switch
          id={field("enabled")}
          aria-label={title}
          checked={rule.enabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
        />
      </div>

      {rule.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor={field("delay")}>{delayLabel}</Label>
              <Input
                id={field("delay")}
                inputMode="numeric"
                value={rule.delayDays}
                aria-invalid={Boolean(problems.delay)}
                onChange={(event) =>
                  onChange({ delayDays: event.target.value })
                }
              />
              {problems.delay ? (
                <p className="text-destructive text-sm">{t(problems.delay)}</p>
              ) : null}
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={field("channel")}>{t("channel")}</Label>
              <Select
                value={rule.channel}
                onValueChange={(channel) =>
                  onChange({ channel: channel as FollowUpChannel })
                }
              >
                <SelectTrigger id={field("channel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">{t("channelEmail")}</SelectItem>
                  <SelectItem value="sms">{t("channelSms")}</SelectItem>
                  <SelectItem value="both">{t("channelBoth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={field("max")}>{t("maxFollowUps")}</Label>
              <Input
                id={field("max")}
                inputMode="numeric"
                value={rule.maxFollowUps}
                aria-invalid={Boolean(problems.max)}
                onChange={(event) =>
                  onChange({ maxFollowUps: event.target.value })
                }
              />
              {problems.max ? (
                <p className="text-destructive text-sm">{t(problems.max)}</p>
              ) : null}
            </div>
          </div>

          {rule.channel !== "sms" ? (
            <div className="space-y-2">
              <Label htmlFor={field("email")}>{t("emailMessage")}</Label>
              <Textarea
                id={field("email")}
                rows={4}
                value={rule.emailMessage}
                placeholder={standardEmail}
                aria-invalid={Boolean(problems.email)}
                onChange={(event) =>
                  onChange({ emailMessage: event.target.value })
                }
              />
              {problems.email ? (
                <p className="text-destructive text-sm">{t(problems.email)}</p>
              ) : null}
            </div>
          ) : null}

          {rule.channel !== "email" ? (
            <div className="space-y-2">
              <Label htmlFor={field("sms")}>{t("smsMessage")}</Label>
              <Textarea
                id={field("sms")}
                rows={2}
                value={rule.smsMessage}
                placeholder={standardSms}
                aria-invalid={Boolean(problems.sms)}
                onChange={(event) =>
                  onChange({ smsMessage: event.target.value })
                }
              />
              {problems.sms ? (
                <p className="text-destructive text-sm">{t(problems.sms)}</p>
              ) : null}
            </div>
          ) : null}

          <p className="text-muted-foreground text-sm">
            {t("standardMessageHelp")}
          </p>
        </>
      ) : null}
    </section>
  );
}
