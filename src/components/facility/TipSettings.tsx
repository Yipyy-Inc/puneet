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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";
import { formatMoney } from "@/lib/i18n/format";

// `DEFAULT_REMINDER` stood here with eight lines of customer-facing copy and no
// reader: the reminder's fields moved to Automations (see the note on the
// reminder card below) and nothing has referenced it since. Deleted rather than
// translated — a default nobody applies is not a default.

// ── Main component ─────────────────────────────────────────────────────────────

export function TipSettings() {
  const { locale, section } = useSettingsText();
  const t = section("tips");
  const { tipConfig, updateTipConfig, tipAttribution, updateTipAttribution } =
    useSettings();

  // The shipped report-card prompt. Built here rather than at module scope so
  // a facility starting fresh gets it in their own language; once they edit it
  // the stored copy wins, as it should — it is their message to their clients.
  const defaultReportCardPrompt = {
    enabled: true,
    headline: t("defaultHeadline"),
    subcopy: t("defaultSubcopy"),
    onlyOnPositiveFeedback: false,
  };
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
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-muted-foreground text-xs">{t("intro")}</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleSave}>
                {t("save")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {t("edit")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Enable / disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("enableTipping")}</p>
            <p className="text-muted-foreground text-xs">
              {t("enableTippingHelp")}
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
              <Label className="text-sm font-medium">{t("tipMode")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "general" })}
                  className={cn(
                    "flex min-h-10 items-center rounded-lg border p-3 text-left text-sm transition-colors max-lg:min-h-12",
                    local.mode === "general"
                      ? "border-primary font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">{t("modeGeneral")}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("modeGeneralHelp")}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "smart" })}
                  className={cn(
                    "flex min-h-10 items-center rounded-lg border p-3 text-left text-sm transition-colors max-lg:min-h-12",
                    local.mode === "smart"
                      ? "border-primary font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">{t("modeSmart")}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("modeSmartHelp")}
                  </p>
                </button>
              </div>
            </div>

            {/* General mode */}
            {local.mode === "general" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("tipOptions")}</Label>
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
                    {t("threshold")}
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
                      className="pl-6 text-sm"
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
                    {t("thresholdSuffix")}
                  </span>
                </div>

                {/* Below threshold */}
                <div className="rounded-lg border p-3">
                  <p className="mb-3 text-xs font-semibold">
                    {t("belowThreshold").replace(
                      "{amount}",
                      formatMoney(local.smart.thresholdAmount, locale),
                    )}
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
                    {t("aboveThreshold").replace(
                      "{amount}",
                      formatMoney(local.smart.thresholdAmount, locale),
                    )}
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
              <Label className="text-xs font-medium">{t("previewOn")}</Label>
              <div className="relative w-24">
                <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min={1}
                  step={5}
                  value={preview}
                  className="pl-6 text-sm"
                  onChange={(e) =>
                    setPreview(Math.max(1, parseFloat(e.target.value) || 1))
                  }
                />
              </div>
              <span className="text-muted-foreground text-xs">
                {t("previewHelp")}
              </span>
            </div>

            {/* ── What else the customer is offered ──────────────────────
                Both used to be drawn unconditionally by TipSelector, so a
                facility could not turn either off. */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("customTip")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("customTipHelp")}
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
                  <p className="text-sm font-medium">{t("roundUp")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("roundUpHelp")}
                  </p>
                </div>
                <Switch
                  checked={local.roundUp ?? true}
                  disabled={!isEditing}
                  onCheckedChange={(v) => setLocal({ ...local, roundUp: v })}
                />
              </div>
              <p className="text-muted-foreground text-[11px]">
                {t("readerNote")}
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
                  <p className="text-sm font-semibold">{t("reminderTitle")}</p>
                  <p className="text-muted-foreground text-xs/relaxed">
                    <InterpolatedText
                      template={t("reminderHelp").replace(
                        "{trigger}",
                        t("reminderTrigger"),
                      )}
                      placeholder="{template}"
                    >
                      <span className="font-medium">
                        {t("reminderTemplate")}
                      </span>
                    </InterpolatedText>
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/facility/dashboard/automations">
                  {t("setUpInAutomations")}
                </Link>
              </Button>
              <p className="text-muted-foreground text-[11px]/relaxed">
                {t("reminderAudit")}
              </p>
            </div>

            {/* ── Report card tip prompt ─────────────────────────────── */}
            {(() => {
              const prompt = local.reportCardPrompt ?? defaultReportCardPrompt;
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
                          {t("reportCardTitle")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t("reportCardHelp")}
                        </p>
                        {/* Same as the reminder above: `reportCardPrompt` is
                            saved and read by nothing. */}
                        <p className="mt-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
                          {t("reportCardNotLive")}
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
                        <Label className="text-xs font-medium">
                          {t("headline")}
                        </Label>
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
                        <Label className="text-xs font-medium">
                          {t("subcopy")}
                        </Label>
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
                          {t("onlyPositive")}
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
