"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Heart } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import type { TipAttribution, TipConfig } from "@/types/facility";
import { TipTierEditor } from "./tips/TipTierEditor";
import { CloverTipPanel } from "./tips/CloverTipPanel";
import { TipAttributionCard } from "./tips/TipAttributionCard";

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

// ── Main component ─────────────────────────────────────────────────────────────

export function TipSettings() {
  const { tipConfig, updateTipConfig, tipAttribution, updateTipAttribution } =
    useSettings();
  const [local, setLocal] = useState<TipConfig>(tipConfig);
  const [attribution, setAttribution] =
    useState<TipAttribution>(tipAttribution);
  const [isEditing, setIsEditing] = useState(false);
  // ── THE TICKET EVERY PREVIEW IS DRAWN AGAINST ──────────────────────────
  //
  // $60 because that is roughly a full groom, and because a preview needs a
  // concrete number to be worth anything. Editable, so a facility whose
  // average stay is $400 can see what 18% does there — the whole reason a
  // percentage needs previewing is that its meaning changes with the bill.
  const [preview, setPreview] = useState(60);

  const handleSave = () => {
    // Two domains, saved together because one Save button edits both. They stay
    // separate ROWS — see the comment on `updateTipAttribution`.
    updateTipConfig(local);
    updateTipAttribution(attribution);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocal(tipConfig);
    setAttribution(tipAttribution);
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
                <TipTierEditor
                  tier={local.general}
                  disabled={!isEditing}
                  previewSubtotal={preview}
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
                  <TipTierEditor
                    tier={local.smart.belowThreshold}
                    disabled={!isEditing}
                    previewSubtotal={preview}
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
                  <TipTierEditor
                    tier={local.smart.aboveThreshold}
                    disabled={!isEditing}
                    previewSubtotal={preview}
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

            {/* ── The ticket the previews are drawn against ──────────── */}
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Label className="text-xs font-medium">
                Preview amounts on a
              </Label>
              <div className="relative w-24">
                <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min={1}
                  step={5}
                  value={preview}
                  className="h-8 pl-6 text-sm"
                  onChange={(e) =>
                    setPreview(Math.max(1, parseFloat(e.target.value) || 1))
                  }
                />
              </div>
              <span className="text-muted-foreground text-xs">
                ticket. Changes nothing a customer sees — it only decides what
                the figures above are worked out on.
              </span>
            </div>

            {/* ── What else the customer is offered ──────────────────────
                Both used to be drawn unconditionally by TipSelector, so a
                facility could not turn either off. */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Custom tip</p>
                  <p className="text-muted-foreground text-xs">
                    Let customers type their own amount.
                  </p>
                </div>
                <Switch
                  checked={local.customTip ?? true}
                  disabled={!isEditing}
                  onCheckedChange={(v) => setLocal({ ...local, customTip: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Round up</p>
                  <p className="text-muted-foreground text-xs">
                    Offer to round the bill up to the next dollar. Hidden when
                    the total is already whole.
                  </p>
                </div>
                <Switch
                  checked={local.roundUp ?? true}
                  disabled={!isEditing}
                  onCheckedChange={(v) => setLocal({ ...local, roundUp: v })}
                />
              </div>
              <p className="text-muted-foreground text-[11px]">
                Neither applies to the card reader: Clover always offers a
                custom tip and a no-tip button of its own.
              </p>
            </div>

            <CloverTipPanel config={local} previewSubtotal={preview} />

            {/* ── Card 2: who the tip belongs to ───────────────────── */}
            <TipAttributionCard
              value={attribution}
              onChange={setAttribution}
              disabled={!isEditing}
            />

            {/* ── Post-checkout tip reminder ─────────────────────────────
                The fields that used to live here — delay, channels, headline,
                body — were saved to `tip_config.reminder` and read by nothing.
                A tip reminder is a message, and messages now have somewhere to
                live: a template, a rule, a delivery log, a suppression list,
                and an audit trail a facility can produce. Two places
                describing one message is how one of them goes stale, and it
                would be the one nobody could prove they had sent. */}
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-start gap-2">
                <Bell className="text-primary mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Post check-out tip reminder
                  </p>
                  <p className="text-muted-foreground text-xs/relaxed">
                    Ask for a tip a few hours after the pet goes home, when
                    appreciation is highest. This is an automation: choose
                    <span className="font-medium"> Check-Out</span>, set how
                    long to wait, and pick the{" "}
                    <span className="font-medium">Tip Reminder</span> template.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/facility/dashboard/automations">
                  Set it up in Automations
                </Link>
              </Button>
              <p className="text-muted-foreground text-[11px]/relaxed">
                Every message sent that way is recorded — what was sent, to
                whom, and when — and anyone who has unsubscribed is skipped.
              </p>
            </div>

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
                        {/* Same as the reminder above: `reportCardPrompt` is
                            saved and read by nothing. */}
                        <p className="mt-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
                          Not showing yet. These settings are saved, but report
                          cards do not carry the tip ask.
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
                      <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2">
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
