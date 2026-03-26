"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Languages,
  PenTool,
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import type {
  FormScoringConfig,
  FormScoringRule,
  SupportedFormLocale,
  FormPaymentBlockConfig,
} from "@/data/forms-phase2-types";

// ─── types ────────────────────────────────────────────

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  labelI18n?: Partial<Record<SupportedFormLocale, string>>;
  placeholderI18n?: Partial<Record<SupportedFormLocale, string>>;
  paymentConfig?: FormPaymentBlockConfig;
}

interface Phase2SettingsProps {
  questions: FormQuestion[];
  scoring: FormScoringConfig;
  onScoringChange: (config: FormScoringConfig) => void;
  i18nEnabled: boolean;
  onI18nEnabledChange: (enabled: boolean) => void;
  onQuestionI18nChange: (questionId: string, locale: SupportedFormLocale, label: string) => void;
  esignEnabled: boolean;
  onEsignEnabledChange: (enabled: boolean) => void;
  paymentBlockEnabled: boolean;
  onPaymentBlockEnabledChange: (enabled: boolean) => void;
}

// ─── helpers ──────────────────────────────────────────

function newRuleId(): string {
  return `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

// ─── component ────────────────────────────────────────

export function FormPhase2Settings({
  questions,
  scoring,
  onScoringChange,
  i18nEnabled,
  onI18nEnabledChange,
  onQuestionI18nChange,
  esignEnabled,
  onEsignEnabledChange,
  paymentBlockEnabled,
  onPaymentBlockEnabledChange,
}: Phase2SettingsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggle = (section: string) =>
    setExpandedSection((prev) => (prev === section ? null : section));

  // Scoring helpers
  const updateScoring = (patch: Partial<FormScoringConfig>) =>
    onScoringChange({ ...scoring, ...patch });

  const addRule = () => {
    const rule: FormScoringRule = {
      id: newRuleId(),
      sourceFieldId: questions[0]?.id ?? "",
      conditionOperator: "eq",
      conditionValue: "",
      points: 10,
    };
    updateScoring({ rules: [...(scoring.rules ?? []), rule] });
  };

  const updateRule = (id: string, patch: Partial<FormScoringRule>) => {
    updateScoring({
      rules: (scoring.rules ?? []).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    });
  };

  const removeRule = (id: string) => {
    updateScoring({ rules: (scoring.rules ?? []).filter((r) => r.id !== id) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Advanced (Phase 2)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Scoring, multi-language, e-signatures, and payment blocks.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* ─── Scoring ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggle("scoring")}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-indigo-50">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Scoring & Intake Decisions</p>
              <p className="text-xs text-muted-foreground">Approve / deny / needs review based on answers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scoring.enabled && (
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-0">
                {scoring.rules?.length ?? 0} rules
              </Badge>
            )}
            <Switch
              checked={scoring.enabled}
              onCheckedChange={(v) => updateScoring({ enabled: v })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {expandedSection === "scoring" && scoring.enabled && (
          <div className="ml-12 space-y-4 pb-4">
            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Approve above (points)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1"
                  value={scoring.thresholds?.approveAbove ?? 80}
                  onChange={(e) =>
                    updateScoring({
                      thresholds: {
                        ...scoring.thresholds,
                        approveAbove: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Needs review above (points)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1"
                  value={scoring.thresholds?.needsReviewAbove ?? 50}
                  onChange={(e) =>
                    updateScoring({
                      thresholds: {
                        ...scoring.thresholds,
                        needsReviewAbove: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Below the &ldquo;needs review&rdquo; threshold = denied.
            </p>

            {/* Scoring rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Scoring Rules</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addRule}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add rule
                </Button>
              </div>
              {(scoring.rules ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No scoring rules yet. Add one to start scoring submissions.</p>
              )}
              {(scoring.rules ?? []).map((rule) => (
                <div key={rule.id} className="rounded-lg border p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">
                      When answer matches → award points
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={rule.sourceFieldId ?? ""}
                    onValueChange={(v) => updateRule(rule.id, { sourceFieldId: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {questions.map((q) => (
                        <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={rule.conditionOperator ?? "eq"}
                      onValueChange={(v) => updateRule(rule.id, { conditionOperator: v as FormScoringRule["conditionOperator"] })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">equals</SelectItem>
                        <SelectItem value="neq">not equals</SelectItem>
                        <SelectItem value="contains">contains</SelectItem>
                        <SelectItem value="in">in list</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Value"
                      value={String(rule.conditionValue ?? "")}
                      onChange={(e) => updateRule(rule.id, { conditionValue: e.target.value })}
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={rule.points}
                        onChange={(e) => updateRule(rule.id, { points: Number(e.target.value) })}
                      />
                      <span className="text-muted-foreground shrink-0">pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* ─── Multi-language ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggle("i18n")}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-sky-50">
              <Languages className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Multi-Language (EN / FR)</p>
              <p className="text-xs text-muted-foreground">Add French translations per question</p>
            </div>
          </div>
          <Switch
            checked={i18nEnabled}
            onCheckedChange={onI18nEnabledChange}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {expandedSection === "i18n" && i18nEnabled && (
          <div className="ml-12 space-y-3 pb-4">
            <p className="text-xs text-muted-foreground">
              Customers can switch between English and French when filling out the form. Add French labels below.
            </p>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Add questions first.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border p-3 space-y-1.5">
                    <p className="text-xs font-medium">{q.label}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">FR</Badge>
                      <Input
                        className="h-7 text-xs"
                        placeholder={`French: ${q.label}`}
                        value={q.labelI18n?.fr ?? ""}
                        onChange={(e) => onQuestionI18nChange(q.id, "fr", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* ─── E-sign ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggle("esign")}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-emerald-50">
              <PenTool className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium">E-Signatures</p>
              <p className="text-xs text-muted-foreground">Capture timestamp, IP, device on signature fields</p>
            </div>
          </div>
          <Switch
            checked={esignEnabled}
            onCheckedChange={onEsignEnabledChange}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {expandedSection === "esign" && esignEnabled && (
          <div className="ml-12 space-y-2 pb-4">
            <p className="text-xs text-muted-foreground">
              When enabled, every signature field on this form will automatically capture:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Timestamp (UTC)", desc: "Exact time of signing" },
                { label: "IP Address", desc: "Signer's network address" },
                { label: "User Agent", desc: "Browser / device info" },
                { label: "Timezone", desc: "Signer's local timezone" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-2.5">
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Agreement text shown to the signer is snapshotted with each signature for compliance audit.
            </p>
          </div>
        )}

        <Separator />

        {/* ─── Payment Block ─── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggle("payment")}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-violet-50">
              <CreditCard className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Payment Block</p>
              <p className="text-xs text-muted-foreground">Capture card details within the form</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" />
              Planned
            </Badge>
            <Switch
              checked={paymentBlockEnabled}
              onCheckedChange={onPaymentBlockEnabledChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {expandedSection === "payment" && (
          <div className="ml-12 space-y-2 pb-4">
            {!paymentBlockEnabled ? (
              <p className="text-xs text-muted-foreground italic">
                Enable the toggle to configure payment capture.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Payment capture will be available once the payments module supports tokenization.
                  Configuration is saved for when it goes live.
                </p>
                <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 p-4 text-center">
                  <CreditCard className="h-6 w-6 text-violet-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-violet-700">Tokenized card capture</p>
                  <p className="text-[10px] text-violet-500 mt-1">
                    PCI-compliant • Authorize-only or full capture • Amount configurable per form
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
