"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DollarSign, Percent, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
} from "@/types/deposit-rules";
import { SERVICE_TYPES_FOR_DEPOSITS } from "@/types/deposit-rules";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { SETTINGS_CARD_GRID } from "@/components/ui/settings-card-grid";

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
    // french-ok: stored in `rule.label`, not rendered — see the note above
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
  // The employee shell renders this same component; an absolute /facility/…
  // href is a silent redirect to the schedule for anyone who is not a
  // facility admin, so the portal has to come from the pathname.
  const settingsPath = useSettingsHref();
  const saveSetting = useSaveFacilitySetting();
  const [rules, setRules] = useState<DepositRuleSet>(() =>
    ensureAllServiceRules(initialRules),
  );
  // NOT state, and no longer edited here — but still written on every save.
  // `deposit_rules` is one jsonb document, so a save that dropped this key
  // would erase the facility's refund terms as a side effect of changing a
  // deposit percentage. It rides along verbatim until the facility writes a
  // cancellation policy, which supersedes it.
  const refundPolicy = initialRefundPolicy;

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

  return (
    <div className={SETTINGS_CARD_GRID}>
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
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      {/* ── THE REFUND POLICY LEFT THIS SCREEN ──────────────────────────
          A radio group here decided what happened to a deposit on
          cancellation — full refund before N hours, non-refundable, or store
          credit — and it was the SECOND live shape for that, against
          `booking_rules`' own notice window. The screen knew: it carried a
          warning when the two disagreed and a "match it" button to copy one
          into the other. A button that papers over a contradiction is a sign
          the contradiction should not exist.

          Both are now the FALLBACK that `private.cancellation_terms` reads
          when a facility has written no policy, and the cancellation screen
          seeds itself from them. The stored value is untouched — every save
          below still writes it back verbatim — it simply stopped being
          editable in two places.

          The Save button went with it. It was enabled only by `dirty`, and
          only the refund policy ever set `dirty`; every deposit rule here
          commits on focus-out. Leaving it would have left a control that can
          never enable. */}
      <div className="bg-muted/30 rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {t("refundsMovedNote")}{" "}
          <Link
            href={settingsPath("cancellation-policies")}
            className="text-primary font-medium hover:underline"
          >
            {t("refundsMovedLink")}
          </Link>
        </p>
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
          onBlur={() =>
            onCommit(
              {},
              t("toastServiceAmountUpdated").replace("{service}", serviceLabel),
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-8 w-20 text-right tabular-nums"
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
              className="h-8 tabular-nums"
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
              className="h-8 tabular-nums"
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
