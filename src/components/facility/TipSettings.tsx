"use client";

import { useState } from "react";
import {
  DollarSign,
  Percent,
  Star,
  MessageSquare,
  Bell,
  FileText,
  Clock,
  Mail,
  Smartphone,
  Heart,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import type { TipConfig, TipOption, TipTierConfig } from "@/types/facility";

// Defaults used when an older tipConfig (without reminder/reportCardPrompt) is loaded.
const DEFAULT_REMINDER = {
  enabled: true,
  delayHours: 3,
  channels: { email: true, sms: false, push: true },
  subject: "Thanks for trusting us with {petName} 🐾",
  messageHeadline: "Your care team would love your thanks",
  messageBody:
    "{petName} just went home after a wonderful visit. If the team made {petName}'s day brighter, you can leave them a tip in one tap — 100% goes directly to the staff who looked after {petName}.",
  includeReportCard: true,
} as const;

const DEFAULT_REPORT_CARD_PROMPT = {
  enabled: true,
  headline: "Loved the care {petName} received?",
  subcopy:
    "Tip the team that made today special. Tips are split evenly and go 100% to the staff.",
  onlyOnPositiveFeedback: false,
} as const;

// ── Tier editor: 3 options + preferred selector ───────────────────────────────

function TierEditor({
  tier,
  onChange,
  disabled,
}: {
  tier: TipTierConfig;
  onChange: (next: TipTierConfig) => void;
  disabled: boolean;
}) {
  const setOption = (idx: number, next: TipOption) => {
    const options = [...tier.options] as TipTierConfig["options"];
    options[idx] = next;
    onChange({ ...tier, options });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {tier.options.map((opt, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Option {idx + 1}
              </span>
              {tier.preferredIndex === idx && (
                <Badge variant="secondary" className="gap-0.5 text-[9px]">
                  <Star className="size-2" /> Preferred
                </Badge>
              )}
            </div>
            {/* Type toggle */}
            <div className="flex overflow-hidden rounded-md border text-xs">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOption(idx, { ...opt, type: "percentage" })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 py-1 transition-colors",
                  opt.type === "percentage"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <Percent className="size-3" /> %
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOption(idx, { ...opt, type: "fixed" })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 py-1 transition-colors",
                  opt.type === "fixed"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <DollarSign className="size-3" /> $
              </button>
            </div>
            {/* Value input */}
            <Input
              type="number"
              min={0}
              max={opt.type === "percentage" ? 100 : 9999}
              step={opt.type === "percentage" ? 1 : 0.5}
              value={opt.value}
              disabled={disabled}
              className="h-8 text-sm"
              onChange={(e) =>
                setOption(idx, {
                  ...opt,
                  value: parseFloat(e.target.value) || 0,
                })
              }
            />
            {/* Label input */}
            <Input
              type="text"
              placeholder="e.g. Good job"
              value={opt.label ?? ""}
              disabled={disabled}
              maxLength={32}
              className="h-8 text-xs"
              onChange={(e) =>
                setOption(idx, {
                  ...opt,
                  label: e.target.value || undefined,
                })
              }
            />
            {/* Preview pill */}
            <div className="bg-muted flex h-7 items-center justify-center rounded-md px-2">
              <span className="truncate text-[11px] font-medium">
                {opt.type === "percentage" ? `${opt.value}%` : `$${opt.value}`}
                {opt.label ? ` · ${opt.label}` : ""}
              </span>
            </div>
            {/* Mark as preferred */}
            {!disabled && tier.preferredIndex !== idx && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...tier,
                    preferredIndex: idx as 0 | 1 | 2,
                  })
                }
                className="text-muted-foreground hover:text-primary w-full text-center text-[10px] underline"
              >
                Set as preferred
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Section label hint */}
      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <MessageSquare className="size-3" />
        The label is shown to customers alongside the tip amount (e.g.&nbsp;
        <span className="font-medium">20% · Fantastic job</span>).
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TipSettings() {
  const { tipConfig, updateTipConfig } = useSettings();
  const [local, setLocal] = useState<TipConfig>(tipConfig);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateTipConfig(local);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocal(tipConfig);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Tip Settings</p>
          <p className="text-muted-foreground text-xs">
            Configure tip options shown when confirming a booking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Enable / disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable tipping</p>
            <p className="text-muted-foreground text-xs">
              Show tip selection on the booking confirmation step
            </p>
          </div>
          <Switch
            checked={local.enabled}
            disabled={!isEditing}
            onCheckedChange={(v) => setLocal({ ...local, enabled: v })}
          />
        </div>

        {local.enabled && (
          <>
            {/* Mode selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tip mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "general" })}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    local.mode === "general"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">General</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    One set of tip options for all transactions
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "smart" })}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    local.mode === "smart"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">Smart Tips</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Different options based on ticket amount
                  </p>
                </button>
              </div>
            </div>

            {/* General mode */}
            {local.mode === "general" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tip options</Label>
                <TierEditor
                  tier={local.general}
                  disabled={!isEditing}
                  onChange={(tier) => setLocal({ ...local, general: tier })}
                />
              </div>
            )}

            {/* Smart Tips mode */}
            {local.mode === "smart" && (
              <div className="space-y-5">
                {/* Threshold */}
                <div className="flex items-center gap-3">
                  <Label className="shrink-0 text-sm font-medium">
                    Threshold — if ticket is less than
                  </Label>
                  <div className="relative w-28">
                    <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={local.smart.thresholdAmount}
                      disabled={!isEditing}
                      className="h-8 pl-6 text-sm"
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          smart: {
                            ...local.smart,
                            thresholdAmount: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    use fixed amounts; otherwise use percentages
                  </span>
                </div>

                {/* Below threshold */}
                <div className="rounded-lg border p-3">
                  <p className="mb-3 text-xs font-semibold">
                    Below ${local.smart.thresholdAmount} — Fixed amounts
                  </p>
                  <TierEditor
                    tier={local.smart.belowThreshold}
                    disabled={!isEditing}
                    onChange={(tier) =>
                      setLocal({
                        ...local,
                        smart: { ...local.smart, belowThreshold: tier },
                      })
                    }
                  />
                </div>

                {/* Above threshold */}
                <div className="rounded-lg border p-3">
                  <p className="mb-3 text-xs font-semibold">
                    ${local.smart.thresholdAmount}+ — Percentages
                  </p>
                  <TierEditor
                    tier={local.smart.aboveThreshold}
                    disabled={!isEditing}
                    onChange={(tier) =>
                      setLocal({
                        ...local,
                        smart: { ...local.smart, aboveThreshold: tier },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* ── Post-stay tip reminder ─────────────────────────────── */}
            {(() => {
              const reminder = local.reminder ?? DEFAULT_REMINDER;
              const updateReminder = (
                patch: Partial<typeof reminder>,
              ) =>
                setLocal({
                  ...local,
                  reminder: { ...reminder, ...patch },
                });
              const updateChannels = (
                patch: Partial<typeof reminder.channels>,
              ) =>
                setLocal({
                  ...local,
                  reminder: {
                    ...reminder,
                    channels: { ...reminder.channels, ...patch },
                  },
                });
              return (
                <div className="space-y-3 rounded-xl border border-dashed p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2">
                      <Bell className="text-primary mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">
                          Post check-out tip reminder
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Send a friendly ask after the pet goes home — when
                          appreciation is highest.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={reminder.enabled}
                      disabled={!isEditing}
                      onCheckedChange={(v) => updateReminder({ enabled: v })}
                    />
                  </div>

                  {reminder.enabled && (
                    <div className="space-y-3 pt-1">
                      {/* Delay */}
                      <div className="flex items-center gap-3">
                        <Clock className="text-muted-foreground size-3.5" />
                        <Label className="shrink-0 text-xs font-medium">
                          Send after
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={168}
                          step={1}
                          value={reminder.delayHours}
                          disabled={!isEditing}
                          className="h-8 w-20 text-sm"
                          onChange={(e) =>
                            updateReminder({
                              delayHours: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <span className="text-muted-foreground text-xs">
                          hours after check-out
                        </span>
                      </div>

                      {/* Channels */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Channels</Label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() =>
                              updateChannels({ email: !reminder.channels.email })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                              reminder.channels.email
                                ? "border-primary bg-primary/10 text-primary"
                                : "text-muted-foreground",
                              !isEditing && "cursor-default",
                            )}
                          >
                            <Mail className="size-3" /> Email
                          </button>
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() =>
                              updateChannels({ sms: !reminder.channels.sms })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                              reminder.channels.sms
                                ? "border-primary bg-primary/10 text-primary"
                                : "text-muted-foreground",
                              !isEditing && "cursor-default",
                            )}
                          >
                            <Smartphone className="size-3" /> SMS
                          </button>
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() =>
                              updateChannels({ push: !reminder.channels.push })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                              reminder.channels.push
                                ? "border-primary bg-primary/10 text-primary"
                                : "text-muted-foreground",
                              !isEditing && "cursor-default",
                            )}
                          >
                            <Bell className="size-3" /> Push
                          </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Email subject
                        </Label>
                        <Input
                          value={reminder.subject}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                          onChange={(e) =>
                            updateReminder({ subject: e.target.value })
                          }
                        />
                      </div>

                      {/* Headline */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Headline</Label>
                        <Input
                          value={reminder.messageHeadline}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                          onChange={(e) =>
                            updateReminder({
                              messageHeadline: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Body */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Message</Label>
                        <Textarea
                          rows={3}
                          value={reminder.messageBody}
                          disabled={!isEditing}
                          className="text-sm"
                          onChange={(e) =>
                            updateReminder({ messageBody: e.target.value })
                          }
                        />
                        <p className="text-muted-foreground text-[10px]">
                          Use{" "}
                          <code className="bg-muted rounded px-1">
                            {"{petName}"}
                          </code>{" "}
                          or{" "}
                          <code className="bg-muted rounded px-1">
                            {"{clientName}"}
                          </code>{" "}
                          to personalize.
                        </p>
                      </div>

                      {/* Attach report card */}
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="text-muted-foreground size-3.5" />
                          <span className="text-xs font-medium">
                            Include the pet's report card
                          </span>
                        </div>
                        <Switch
                          checked={reminder.includeReportCard}
                          disabled={!isEditing}
                          onCheckedChange={(v) =>
                            updateReminder({ includeReportCard: v })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Report card tip prompt ─────────────────────────────── */}
            {(() => {
              const prompt =
                local.reportCardPrompt ?? DEFAULT_REPORT_CARD_PROMPT;
              const updatePrompt = (patch: Partial<typeof prompt>) =>
                setLocal({
                  ...local,
                  reportCardPrompt: { ...prompt, ...patch },
                });
              return (
                <div className="space-y-3 rounded-xl border border-dashed p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2">
                      <Heart className="text-primary mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">
                          Tip ask on report cards
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Add a gentle tip prompt to the daily report card sent
                          to clients.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={prompt.enabled}
                      disabled={!isEditing}
                      onCheckedChange={(v) => updatePrompt({ enabled: v })}
                    />
                  </div>

                  {prompt.enabled && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Headline</Label>
                        <Input
                          value={prompt.headline}
                          disabled={!isEditing}
                          className="h-8 text-sm"
                          onChange={(e) =>
                            updatePrompt({ headline: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Subcopy</Label>
                        <Textarea
                          rows={2}
                          value={prompt.subcopy}
                          disabled={!isEditing}
                          className="text-sm"
                          onChange={(e) =>
                            updatePrompt({ subcopy: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <span className="text-xs font-medium">
                          Only show on 5-star / happy report cards
                        </span>
                        <Switch
                          checked={prompt.onlyOnPositiveFeedback}
                          disabled={!isEditing}
                          onCheckedChange={(v) =>
                            updatePrompt({ onlyOnPositiveFeedback: v })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
