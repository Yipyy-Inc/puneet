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
  YipyyGoConfig,
  MedicationFeeConfig,
  MedicationFeeBilling,
  TipPopupConfig,
  TipPopupPreset,
  ConfirmationEmailConfig,
} from "@/types/yipyygo";
import {
  defaultMedicationFeeConfig,
  defaultTipPopupConfig,
  defaultConfirmationEmailConfig,
} from "@/data/yipyygo-config";

interface FeesAndMessagingSectionProps {
  config: YipyyGoConfig;
  onConfigChange: (updates: Partial<YipyyGoConfig>) => void;
}

const BILLING_LABELS: Record<MedicationFeeBilling, string> = {
  per_dose: "Per dose administered",
  per_day: "Per day",
  per_stay: "Per stay (flat)",
};

export function FeesAndMessagingSection({
  config,
  onConfigChange,
}: FeesAndMessagingSectionProps) {
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
        { id, label: "Custom", type: "percentage", value: 15 },
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
              <CardTitle>Medication administration fee</CardTitle>
              <CardDescription>
                Charged automatically when the customer adds medications during
                Express Check-in.
              </CardDescription>
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
                <Label>Billing</Label>
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
                    {Object.entries(BILLING_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-fee-label">Label shown to customer</Label>
              <Input
                id="med-fee-label"
                value={medFee.label ?? ""}
                onChange={(e) => updateMedFee({ label: e.target.value })}
                placeholder="Medication administration fee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-fee-desc">Description (optional)</Label>
              <Textarea
                id="med-fee-desc"
                value={medFee.description ?? ""}
                onChange={(e) => updateMedFee({ description: e.target.value })}
                placeholder="Applied daily when our team administers medication during the stay."
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
              <CardTitle>End-of-flow tip prompt</CardTitle>
              <CardDescription>
                Shown as a popup right before the customer saves the Express
                Check-in.
              </CardDescription>
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
              <Label htmlFor="tip-title">Popup title</Label>
              <Input
                id="tip-title"
                value={tipPopup.title}
                onChange={(e) => updateTipPopup({ title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tip-message">Message from facility</Label>
              <Textarea
                id="tip-message"
                value={tipPopup.message}
                onChange={(e) => updateTipPopup({ message: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tip applies to</Label>
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
                    <SelectItem value="stay_total">Full stay total</SelectItem>
                    <SelectItem value="selected_services">
                      Services only (excludes add-ons)
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
                    Allow custom amount
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="tip-skip"
                    checked={tipPopup.allowSkip}
                    onCheckedChange={(v) => updateTipPopup({ allowSkip: v })}
                  />
                  <Label htmlFor="tip-skip" className="cursor-pointer">
                    Allow skip
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tip presets</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPreset}
                >
                  <Plus className="mr-1 size-4" /> Add preset
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
                      placeholder="Label"
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
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed $</SelectItem>
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
              <CardTitle>Confirmation email</CardTitle>
              <CardDescription>
                Sent to the customer after they submit the Express Check-in.
                Use <code>{"{petName}"}</code> and <code>{"{date}"}</code> as
                tokens.
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
              <Label htmlFor="conf-subject">Subject</Label>
              <Input
                id="conf-subject"
                value={confirmation.subject}
                onChange={(e) =>
                  updateConfirmation({ subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf-message">Message</Label>
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
