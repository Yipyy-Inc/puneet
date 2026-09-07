"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  MedicationFeeConfig,
  MedicationFeeBilling,
  TipPopupConfig,
  TipPopupPreset,
  ConfirmationEmailConfig,
} from "@/types/yipyygo";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";
import {
  defaultMedicationFeeConfig,
  defaultTipPopupConfig,
  defaultConfirmationEmailConfig,
} from "@/data/yipyygo-config";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

interface FeesAndMessagingSectionProps {
  config: YipyyGoSettings;
  onConfigChange: (updates: Partial<YipyyGoSettings>) => void;
}

const BILLING_KEYS: Record<MedicationFeeBilling, string> = {
  per_dose: "billingPerDose",
  per_day: "billingPerDay",
  per_stay: "billingPerStay",
};

export function FeesAndMessagingSection({
  config,
  onConfigChange,
}: FeesAndMessagingSectionProps) {
  const t = useSettingsText().section("yipyygo");
  const medFee: MedicationFeeConfig =
    config.medicationFee ?? defaultMedicationFeeConfig;
  const tipPopup: TipPopupConfig = config.tipPopup ?? defaultTipPopupConfig;
  const confirmation: ConfirmationEmailConfig =
    config.confirmationEmail ?? defaultConfirmationEmailConfig;

  const updateMedFee = (updates: Partial<MedicationFeeConfig>) => {
    onConfigChange({ medicationFee: { ...medFee, ...updates } });
  };

  const updateTipPopup = (updates: Partial<TipPopupConfig>) => {
    onConfigChange({ tipPopup: { ...tipPopup, ...updates } });
  };

  const updateConfirmation = (updates: Partial<ConfirmationEmailConfig>) => {
    onConfigChange({ confirmationEmail: { ...confirmation, ...updates } });
  };

  const updatePreset = (index: number, updates: Partial<TipPopupPreset>) => {
    const presets = tipPopup.presets.map((p, i) =>
      i === index ? { ...p, ...updates } : p,
    );
    updateTipPopup({ presets });
  };

  const addPreset = () => {
    const id = `tip-${Date.now()}`;
    updateTipPopup({
      presets: [
        ...tipPopup.presets,
        { id, label: t("presetNewLabel"), type: "percentage", value: 15 },
      ],
    });
  };

  const removePreset = (index: number) => {
    updateTipPopup({
      presets: tipPopup.presets.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {/* Medication fee */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t("medFeeTitle")}</CardTitle>
              <CardDescription>{t("medFeeHelp")}</CardDescription>
            </div>
            <Switch
              checked={medFee.enabled}
              onCheckedChange={(enabled) => updateMedFee({ enabled })}
            />
          </div>
        </CardHeader>
        {medFee.enabled && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="med-fee-amount">Amount ($)</Label>
                <Input
                  id="med-fee-amount"
                  type="number"
                  min={0}
                  step={0.5}
                  value={medFee.amount}
                  onChange={(e) =>
                    updateMedFee({ amount: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("billing")}</Label>
                <Select
                  value={medFee.billing}
                  onValueChange={(billing) =>
                    updateMedFee({ billing: billing as MedicationFeeBilling })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BILLING_KEYS).map(([value, key]) => (
                      <SelectItem key={value} value={value}>
                        {t(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-fee-label">{t("labelShownToCustomer")}</Label>
              <Input
                id="med-fee-label"
                value={medFee.label ?? ""}
                onChange={(e) => updateMedFee({ label: e.target.value })}
                placeholder={t("medFeeTitle")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-fee-desc">{t("descriptionOptional")}</Label>
              <Textarea
                id="med-fee-desc"
                value={medFee.description ?? ""}
                onChange={(e) => updateMedFee({ description: e.target.value })}
                placeholder={t("medFeeDescPlaceholder")}
                rows={2}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tip popup */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t("tipPopupTitle")}</CardTitle>
              <CardDescription>{t("tipPopupHelp")}</CardDescription>
            </div>
            <Switch
              checked={tipPopup.enabled}
              onCheckedChange={(enabled) => updateTipPopup({ enabled })}
            />
          </div>
        </CardHeader>
        {tipPopup.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tip-title">{t("popupTitle")}</Label>
              <Input
                id="tip-title"
                value={tipPopup.title}
                onChange={(e) => updateTipPopup({ title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tip-message">{t("messageFromFacility")}</Label>
              <Textarea
                id="tip-message"
                value={tipPopup.message}
                onChange={(e) => updateTipPopup({ message: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("tipAppliesTo")}</Label>
                <Select
                  value={tipPopup.appliesTo}
                  onValueChange={(v) =>
                    updateTipPopup({
                      appliesTo: v as TipPopupConfig["appliesTo"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stay_total">
                      {t("tipStayTotal")}
                    </SelectItem>
                    <SelectItem value="selected_services">
                      {t("tipServicesOnly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="tip-custom"
                    checked={tipPopup.allowCustomAmount}
                    onCheckedChange={(v) =>
                      updateTipPopup({ allowCustomAmount: v })
                    }
                  />
                  <Label htmlFor="tip-custom" className="cursor-pointer">
                    {t("allowCustomAmount")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="tip-skip"
                    checked={tipPopup.allowSkip}
                    onCheckedChange={(v) => updateTipPopup({ allowSkip: v })}
                  />
                  <Label htmlFor="tip-skip" className="cursor-pointer">
                    {t("allowSkip")}
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("tipPresets")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPreset}
                >
                  <Plus className="mr-1 size-4" /> {t("addPreset")}
                </Button>
              </div>
              <div className="space-y-2">
                {tipPopup.presets.map((p, i) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
                  >
                    <Input
                      value={p.label}
                      onChange={(e) =>
                        updatePreset(i, { label: e.target.value })
                      }
                      placeholder={t("presetLabel")}
                    />
                    <Select
                      value={p.type}
                      onValueChange={(v) =>
                        updatePreset(i, {
                          type: v as TipPopupPreset["type"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          {t("presetPercentage")}
                        </SelectItem>
                        <SelectItem value="fixed">
                          {t("presetFixed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      value={p.value}
                      onChange={(e) =>
                        updatePreset(i, {
                          value: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePreset(i)}
                      aria-label={t("removePreset")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Confirmation email */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{t("confirmationTitle")}</CardTitle>
              <CardDescription>
                {/* The two tokens are matched against the record, not read, so
                    they stay literal in both languages — only the sentence
                    around them moves. */}
                <InterpolatedText
                  template={t("confirmationHelp")}
                  placeholder="{tokens}"
                >
                  <>
                    <code>{"{petName}"}</code> / <code>{"{date}"}</code>
                  </>
                </InterpolatedText>
              </CardDescription>
            </div>
            <Switch
              checked={confirmation.enabled}
              onCheckedChange={(enabled) => updateConfirmation({ enabled })}
            />
          </div>
        </CardHeader>
        {confirmation.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conf-subject">{t("subject")}</Label>
              <Input
                id="conf-subject"
                value={confirmation.subject}
                onChange={(e) =>
                  updateConfirmation({ subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf-message">{t("message")}</Label>
              <Textarea
                id="conf-message"
                value={confirmation.message}
                onChange={(e) =>
                  updateConfirmation({ message: e.target.value })
                }
                rows={4}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
