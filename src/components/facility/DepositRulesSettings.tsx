"use client";

import { useMemo, useState } from "react";
import {
  DollarSign,
  Percent,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import { ensureAllServiceRules } from "@/lib/settings/deposits";
import {
  useDepositRules,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { TriangleAlert } from "lucide-react";
import type {
  DepositAmountType,
  DepositRule,
  DepositRuleSet,
  DepositRefundPolicy,
  DepositRefundType,
} from "@/types/deposit-rules";
import { SERVICE_TYPES_FOR_DEPOSITS } from "@/types/deposit-rules";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * The catalogue key for each service type.
 *
 * SERVICE_LABELS below is still what `formatRuleLabel` uses, because that
 * function's output is STORED (see the note on it). This map is for the words
 * a person reads on this screen, which are not stored anywhere.
 */
const SERVICE_TEXT: Record<string, string> = {
  boarding: "svcBoarding",
  daycare: "svcDaycare",
  grooming: "svcGrooming",
  training: "svcTraining",
  vet: "svcVet",
  retail: "svcRetail",
};

const SERVICE_LABELS: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
};

// ── WHY THIS ONE STAYS IN ENGLISH ─────────────────────────────────────────
//
// `label` is not interface copy. It is DERIVED here and then PERSISTED into
// the saved deposit_rules value, and six other screens read it back —
// including CustomerDepositPanel, which shows it to the customer. Translating
// it would freeze whichever language the admin's browser happened to be in
// into a field a French customer and an English colleague both read.
//
// The real fix is to stop storing a display string and derive it at render,
// which is a change across seven call sites and a settings value. Recorded in
// the debt map rather than half-done here.
// french-ok: a stored value read by six other screens, not interface copy
function formatRuleLabel(rule: DepositRule): string {
  if (rule.scope === "service") {
    // french-ok: stored, not rendered — see the note on this function
    const service = SERVICE_LABELS[rule.serviceType ?? ""] ?? "Service";
    if (!rule.enabled || rule.amount <= 0) return `${service} — no deposit`;
    return rule.amountType === "percentage"
      ? `${service} — ${rule.amount}% deposit`
      : `${service} — $${rule.amount.toFixed(2)} deposit`;
  }
  if (!rule.enabled || rule.amount <= 0) {
    return "Booking value threshold — disabled";
  }
  const amount =
    rule.amountType === "percentage"
      ? `${rule.amount}%`
      : `$${rule.amount.toFixed(2)}`;
  // french-ok: stored, not rendered — see the note on this function
  return `Bookings over ${(rule.minBookingValue ?? 0).toFixed(0)} — ${amount} deposit`;
}

// ── NOTHING RENDERS UNTIL THE TERMS HAVE ARRIVED ──────────────────────────
//
// Same split, and the same reason, as PricingRulesSettings. The editor below
// seeds `useState` from what it is handed, and a `useState` initialiser runs
// ONCE — so mounting it against the fallback and letting the query land after
// would show a facility no deposit rules whatever it had saved, and the first
// keystroke would report that emptiness back as the new value. Opening this
// page would erase the business's terms.
//
// The old version had the same shape with localStorage underneath and a
// `hasMounted` flag to hide the flash. A flag hides the flash; it does not stop
// the write.
export function DepositRulesSettings() {
  const { rules, refundPolicy, configured, isPending } = useDepositRules();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <DepositRulesEditor
      key={configured ? "stored" : "default"}
      initialRules={rules}
      initialRefundPolicy={refundPolicy}
      configured={configured}
    />
  );
}

function DepositRulesEditor({
  initialRules,
  initialRefundPolicy,
  configured,
}: {
  initialRules: DepositRuleSet;
  initialRefundPolicy: DepositRefundPolicy;
  configured: boolean;
}) {
  const t = useSettingsText().section("deposit-rules");
  const saveSetting = useSaveFacilitySetting();
  const [rules, setRules] = useState<DepositRuleSet>(() =>
    ensureAllServiceRules(initialRules),
  );
  const [refundPolicy, setRefundPolicy] =
    useState<DepositRefundPolicy>(initialRefundPolicy);
  const [dirty, setDirty] = useState(false);

  // Free-cancellation window from Business Settings — the deposit refund policy
  // references this so the two don't contradict each other.
  const freeCancellationHours =
    facilityConfig.bookingRules.cancellationPolicies.freeCancellationHours;

  // One domain, written whole. The API stores `value jsonb` per
  // (facility_id, domain), so a partial write is not a thing that exists here.
  const persist = (
    nextRules: DepositRuleSet,
    nextPolicy: DepositRefundPolicy,
    message: string,
  ) => {
    saveSetting.mutate(
      {
        domain: "deposit_rules",
        value: { rules: nextRules, refundPolicy: nextPolicy },
      },
      {
        onSuccess: () => toast.success(message),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("notSaved")),
      },
    );
  };

  const updateRefundPolicy = (patch: Partial<DepositRefundPolicy>) => {
    setRefundPolicy((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const serviceRules = useMemo(
    () =>
      SERVICE_TYPES_FOR_DEPOSITS.map(
        (s) =>
          rules.find(
            (r) => r.scope === "service" && r.serviceType === s,
          ) as DepositRule,
      ),
    [rules],
  );

  const thresholdRule = useMemo(
    () => rules.find((r) => r.scope === "booking_value"),
    [rules],
  );

  // Live, in-progress edit (e.g. typing in the amount field) — updates local
  // state only. It does NOT persist; the row commits on focus-out via
  // commitRule, so the global Save button stays reserved for the refund policy.
  const updateRule = (id: string, patch: Partial<DepositRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.label = formatRuleLabel(next);
        return next;
      }),
    );
  };

  // Persist a single rule immediately (focus-out / toggle / dropdown change),
  // computing the next set from current state so the just-typed value is saved.
  const commitRule = (
    id: string,
    patch: Partial<DepositRule>,
    message: string,
  ) => {
    const next = rules.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      updated.label = formatRuleLabel(updated);
      return updated;
    });
    setRules(next);
    persist(next, refundPolicy, message);
  };

  const handleSave = () => {
    persist(rules, refundPolicy, t("depositRulesSaved"));
    setDirty(false);
  };

  return (
    <div className="space-y-6">
      {/* "No deposit" and "not set up yet" look identical on screen, and one of
          them is a decision. Worth saying out loud here because the fallback is
          empty on purpose: the fixture used to ship 30% on boarding and $25 on
          grooming, and any browser that had never opened this screen collected
          them — terms no business ever agreed to. §6 rule 2: a status is its
          glyph, its word, its ink and a hairline of that same ink. */}
      {!configured && (
        <div className="border-warning/40 bg-card flex items-start gap-2 rounded-xl border p-3">
          <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-warning text-[13.5px]">{t("noTermsYet")}</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty} className="shrink-0">
          {dirty ? t("saveChanges") : t("savedState")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-amber-500" />
            {t("perServiceRules")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceRules.map((rule) => (
            <ServiceRuleRow
              key={rule.id}
              rule={rule}
              onChange={(patch) => updateRule(rule.id, patch)}
              onCommit={(patch, message) => commitRule(rule.id, patch, message)}
            />
          ))}
        </CardContent>
      </Card>

      {thresholdRule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4 text-emerald-600" />
              {t("bookingValueThreshold")}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("thresholdHelp")}
            </p>
          </CardHeader>
          <CardContent>
            <ThresholdRuleRow
              rule={thresholdRule}
              onChange={(patch) => updateRule(thresholdRule.id, patch)}
              onCommit={(patch, message) =>
                commitRule(thresholdRule.id, patch, message)
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4 text-sky-600" />
            {t("refundPolicy")}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            {/* One sentence, two emphasised values. Split on each placeholder
                in turn rather than assembled from five JSX fragments — French
                does not order the clause the way English does. §5q. */}
            {t("cancellationNote")
              .split("{policy}")
              .flatMap((part, index) =>
                index === 0
                  ? [part]
                  : [
                      <span
                        key="policy"
                        className="text-foreground font-medium"
                      >
                        {t("cancellationPolicy")}
                      </span>,
                      part,
                    ],
              )
              .flatMap((part, index) =>
                typeof part !== "string"
                  ? [part]
                  : part.split("{hours}").flatMap((bit, i) =>
                      i === 0
                        ? [bit]
                        : [
                            <span
                              key={`hours-${index}`}
                              className="text-foreground font-medium"
                            >
                              {t("hoursCount").replace(
                                "{count}",
                                String(freeCancellationHours),
                              )}
                            </span>,
                            bit,
                          ],
                    ),
              )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("ifCancelled")}</p>
          <RadioGroup
            value={refundPolicy.type}
            onValueChange={(v) =>
              updateRefundPolicy({ type: v as DepositRefundType })
            }
            className="space-y-2"
          >
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="full_before_window" id="refund-full" />
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <span className="text-sm">{t("fullRefundBefore")}</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={refundPolicy.refundBeforeHours}
                  disabled={refundPolicy.type !== "full_before_window"}
                  onChange={(e) =>
                    updateRefundPolicy({
                      refundBeforeHours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-8 w-20 text-right font-[tabular-nums]"
                />
                <span className="text-sm">{t("wordHours")}</span>
              </div>
            </label>
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="non_refundable" id="refund-none" />
              <span className="text-sm">{t("nonRefundable")}</span>
            </label>
            <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors">
              <RadioGroupItem value="credit" id="refund-credit" />
              <span className="text-sm">{t("appliedAsCredit")}</span>
            </label>
          </RadioGroup>

          {refundPolicy.type === "full_before_window" &&
            refundPolicy.refundBeforeHours !== freeCancellationHours && (
              <div className="flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex-1">
                  {t("windowConflict")
                    .replace("{refund}", String(refundPolicy.refundBeforeHours))
                    .replace("{policy}", String(freeCancellationHours))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 shrink-0 border-amber-300 bg-white px-2 text-[11px] text-amber-800"
                  onClick={() =>
                    updateRefundPolicy({
                      refundBeforeHours: freeCancellationHours,
                    })
                  }
                >
                  {t("matchTo").replace(
                    "{hours}",
                    String(freeCancellationHours),
                  )}
                </Button>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceRuleRow({
  rule,
  onChange,
  onCommit,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
  onCommit: (patch: Partial<DepositRule>, message: string) => void;
}) {
  const t = useSettingsText().section("deposit-rules");
  const service = rule.serviceType ?? "";
  const serviceLabel = SERVICE_TEXT[service]
    ? t(SERVICE_TEXT[service])
    : service;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        rule.enabled ? "bg-card" : "bg-muted/30",
      )}
    >
      <Switch
        checked={rule.enabled}
        onCheckedChange={(enabled) =>
          onCommit(
            { enabled },
            (enabled ? t("toastEnabled") : t("toastDisabled")).replace(
              "{service}",
              serviceLabel,
            ),
          )
        }
      />
      <div className="min-w-[120px] flex-1">
        <p className="text-sm font-medium">{serviceLabel}</p>
        <p className="text-muted-foreground text-[11px]">
          {rule.enabled ? rule.label : t("disabledNoDeposit")}
        </p>
      </div>
      <AmountTypeSelect
        value={rule.amountType}
        disabled={!rule.enabled}
        onChange={(amountType) =>
          onCommit(
            { amountType },
            t("toastTypeUpdated").replace("{service}", serviceLabel),
          )
        }
      />
      <div className="flex items-center gap-1.5">
        {rule.amountType === "percentage" ? (
          <Percent className="text-muted-foreground size-3.5" />
        ) : (
          <DollarSign className="text-muted-foreground size-3.5" />
        )}
        <Input
          type="number"
          min={0}
          step={rule.amountType === "percentage" ? 1 : 0.01}
          value={rule.amount}
          disabled={!rule.enabled}
          onChange={(e) =>
            onChange({ amount: parseFloat(e.target.value) || 0 })
          }
          onBlur={() => onCommit({}, `${serviceLabel} deposit updated`)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-8 w-20 text-right font-[tabular-nums]"
        />
      </div>
    </div>
  );
}

function ThresholdRuleRow({
  rule,
  onChange,
  onCommit,
}: {
  rule: DepositRule;
  onChange: (patch: Partial<DepositRule>) => void;
  onCommit: (patch: Partial<DepositRule>, message: string) => void;
}) {
  const t = useSettingsText().section("deposit-rules");
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-4 transition-colors",
        rule.enabled ? "bg-card" : "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <Switch
          checked={rule.enabled}
          onCheckedChange={(enabled) =>
            onCommit(
              { enabled },
              enabled
                ? t("toastHighValueEnabled")
                : t("toastHighValueDisabled"),
            )
          }
        />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("highValueDeposit")}</p>
          <p className="text-muted-foreground text-[11px]">
            {rule.enabled ? rule.label : t("disabled")}
          </p>
        </div>
        {rule.enabled && (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800"
          >
            {t("active")}
          </Badge>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            {t("triggeredWhenTotal")}
          </Label>
          <div className="mt-1 flex items-center gap-1.5">
            <DollarSign className="text-muted-foreground size-3.5" />
            <Input
              type="number"
              min={0}
              step={1}
              value={rule.minBookingValue ?? 0}
              disabled={!rule.enabled}
              onChange={(e) =>
                onChange({ minBookingValue: parseFloat(e.target.value) || 0 })
              }
              onBlur={() => onCommit({}, t("toastThresholdUpdated"))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            {t("depositType")}
          </Label>
          <div className="mt-1">
            <AmountTypeSelect
              value={rule.amountType}
              disabled={!rule.enabled}
              onChange={(amountType) =>
                onCommit({ amountType }, t("toastDepositTypeUpdated"))
              }
              className="w-full"
            />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            {t("depositAmount")}
          </Label>
          <div className="mt-1 flex items-center gap-1.5">
            {rule.amountType === "percentage" ? (
              <Percent className="text-muted-foreground size-3.5" />
            ) : (
              <DollarSign className="text-muted-foreground size-3.5" />
            )}
            <Input
              type="number"
              min={0}
              step={rule.amountType === "percentage" ? 1 : 0.01}
              value={rule.amount}
              disabled={!rule.enabled}
              onChange={(e) =>
                onChange({ amount: parseFloat(e.target.value) || 0 })
              }
              onBlur={() => onCommit({}, t("toastAmountUpdated"))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-8 font-[tabular-nums]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountTypeSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: DepositAmountType;
  disabled?: boolean;
  onChange: (value: DepositAmountType) => void;
  className?: string;
}) {
  const t = useSettingsText().section("deposit-rules");
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(v as DepositAmountType)}
    >
      <SelectTrigger className={cn("h-8 w-[120px] text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="percentage">{t("percentOfTotal")}</SelectItem>
        <SelectItem value="fixed">{t("flatAmount")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
