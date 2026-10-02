"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useSaveFacilitySetting } from "@/lib/api/facility-settings";
import { fill } from "@/lib/medications/dose";
import {
  requirementWrites,
  sameServices,
  type EvaluatedModule,
} from "@/lib/evaluations/requirement";
import { minutesOf } from "@/lib/bookings/wizard/time-windows";
import { offerModeOf } from "@/lib/evaluations/schedule";
import {
  autoConfirmsService,
  type BookingApproval,
} from "@/lib/settings/booking-approval";
import {
  ensureAllServiceRules,
  type DepositConfig,
} from "@/lib/settings/deposits";
import type { SettingDomain } from "@/lib/settings/domains";
import type { DepositRule } from "@/types/deposit-rules";
import {
  evaluationConfigSchema,
  type EvaluationConfig,
  type FacilityBookingFlowConfig,
  type ModuleConfig,
} from "@/types/facility";

// ============================================================================
// Settings › Services › Evaluations — the client's setup page (2026-10-02).
//
// One page, one Save, four settings it writes:
//
//   evaluation_config   how evaluations are offered (STEP 1–3)
//   booking_flow        "Services that need an evaluation first", made the
//                       whole rule (lib/evaluations/requirement.ts) — and any
//                       module still demanding one the chips no longer ask for
//   booking_approval    "Staff approve each request" / "Confirm instantly"
//   deposit_rules       "Take a deposit when booking": full price or 50%
//
// Each is written only when it changed, in that order; a part that fails stays
// changed and is named in the toast, as on Feeding & medications.
// ============================================================================

export type DepositPercent = 100 | 50;

export interface EvaluationSetupDraft {
  config: EvaluationConfig;
  /** The services that need an evaluation first. */
  chips: string[];
  /** "Confirm instantly". */
  autoConfirm: boolean;
  deposit: { enabled: boolean; percent: DepositPercent };
}

export interface EvaluationSetupSources {
  config: EvaluationConfig;
  flow: FacilityBookingFlowConfig;
  approval: BookingApproval;
  deposits: DepositConfig;
  modules: Partial<Record<EvaluatedModule, ModuleConfig>>;
  /** What is enforced today — where the chips start. */
  requiredNow: string[];
}

const EVALUATION = "evaluation";

function evaluationRule(deposits: DepositConfig): DepositRule | undefined {
  return deposits.rules.find(
    (rule) => rule.scope === "service" && rule.serviceType === EVALUATION,
  );
}

function depositOf(deposits: DepositConfig): EvaluationSetupDraft["deposit"] {
  const rule = evaluationRule(deposits);
  const percent: DepositPercent =
    rule?.amountType === "percentage" && rule.amount === 50 ? 50 : 100;
  return { enabled: !!rule?.enabled && (rule.amount ?? 0) > 0, percent };
}

function draftOf(sources: EvaluationSetupSources): EvaluationSetupDraft {
  return {
    config: sources.config,
    chips: sources.requiredNow,
    autoConfirm: autoConfirmsService(sources.approval, EVALUATION),
    deposit: depositOf(sources.deposits),
  };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** What stops the draft being saved, as a key of the page's words. */
export function setupProblem(config: EvaluationConfig): string | null {
  const mode = offerModeOf(config);
  const schedule = config.schedule;
  if (mode !== "any" && (schedule.allowedDays ?? []).length === 0) {
    return "invalidDays";
  }
  if (mode === "slots" && schedule.fixedStartTimes.length === 0) {
    return "invalidSlots";
  }
  if (mode === "window") {
    if (schedule.timeWindows.length === 0) return "invalidWindows";
    const broken = schedule.timeWindows.some((w) => {
      const start = minutesOf(w.startTime);
      const end = minutesOf(w.endTime);
      return !w.label.trim() || start === null || end === null || end <= start;
    });
    if (broken) return "invalidWindows";
  }
  if (mode === "any" || mode === "days") {
    const start = minutesOf(schedule.openRange?.start ?? "08:00");
    const end = minutesOf(schedule.openRange?.end ?? "18:00");
    if (start === null || end === null || end <= start) return "invalidRange";
  }
  if ((schedule.capacityPerSlot ?? 1) < 1) return "invalidCapacity";
  if (!((schedule.defaultDurationMinutes ?? 0) > 0)) return "invalidLength";
  if (!(config.price >= 0)) return "invalidPrice";
  return evaluationConfigSchema.safeParse(config).success
    ? null
    : "invalidConfig";
}

type Patch<T> = Partial<T> | ((current: T) => Partial<T>);

export interface EvaluationSetup {
  draft: EvaluationSetupDraft;
  setConfig: (patch: Patch<EvaluationConfig>) => void;
  setSchedule: (patch: Patch<EvaluationConfig["schedule"]>) => void;
  setChips: (chips: string[]) => void;
  setAutoConfirm: (on: boolean) => void;
  setDeposit: (patch: Partial<EvaluationSetupDraft["deposit"]>) => void;
  dirty: boolean;
  saving: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

export function useEvaluationSetup(
  sources: EvaluationSetupSources,
  t: (key: string) => string,
): EvaluationSetup {
  const mutation = useSaveFacilitySetting();
  const [saved, setSaved] = useState(sources);
  const [baseline, setBaseline] = useState<EvaluationSetupDraft>(() =>
    draftOf(sources),
  );
  const [draft, setDraft] = useState<EvaluationSetupDraft>(() =>
    draftOf(sources),
  );
  const [saving, setSaving] = useState(false);

  const configChanged = !same(draft.config, baseline.config);
  const chipsChanged = !sameServices(draft.chips, baseline.chips);
  const approvalChanged = draft.autoConfirm !== baseline.autoConfirm;
  const depositChanged = !same(draft.deposit, baseline.deposit);
  const dirty =
    configChanged || chipsChanged || approvalChanged || depositChanged;

  const setConfig = (patch: Patch<EvaluationConfig>) =>
    setDraft((current) => ({
      ...current,
      config: {
        ...current.config,
        ...(typeof patch === "function" ? patch(current.config) : patch),
      },
    }));
  const setSchedule = (patch: Patch<EvaluationConfig["schedule"]>) =>
    setConfig((config) => ({
      schedule: {
        ...config.schedule,
        ...(typeof patch === "function" ? patch(config.schedule) : patch),
      },
    }));

  const write = async <T>(domain: SettingDomain, value: T): Promise<T> => {
    const response = await mutation.mutateAsync({ domain, value });
    return response.value as T;
  };

  const save = async () => {
    const problem = configChanged ? setupProblem(draft.config) : null;
    if (problem) {
      toast.error(t(problem));
      return;
    }
    setSaving(true);
    const failed: string[] = [];
    let next = saved;
    let nextBaseline = baseline;

    if (configChanged) {
      try {
        const stored = await write("evaluation_config", draft.config);
        next = { ...next, config: stored };
        nextBaseline = { ...nextBaseline, config: stored };
      } catch (error) {
        failed.push(reason(t("partSchedule"), error));
      }
    }

    // The chips are the whole rule once saved — written whenever they
    // changed, or whenever another setting still disagrees with them.
    const writes = requirementWrites({
      chips: draft.chips,
      flow: next.flow,
      modules: next.modules,
    });
    if (
      chipsChanged ||
      !same(writes.flow, next.flow) ||
      writes.modules.length > 0
    ) {
      try {
        const flow = await write("booking_flow", writes.flow);
        const modules = { ...next.modules };
        for (const { service, config } of writes.modules) {
          modules[service] = await write(`${service}_config`, config);
        }
        next = { ...next, flow, modules };
        nextBaseline = { ...nextBaseline, chips: draft.chips };
      } catch (error) {
        failed.push(reason(t("partServices"), error));
      }
    }

    if (approvalChanged) {
      try {
        const approval = await write("booking_approval", {
          ...next.approval,
          autoConfirm: {
            ...next.approval.autoConfirm,
            [EVALUATION]: draft.autoConfirm,
          },
        });
        next = { ...next, approval };
        nextBaseline = { ...nextBaseline, autoConfirm: draft.autoConfirm };
      } catch (error) {
        failed.push(reason(t("partApproval"), error));
      }
    }

    if (depositChanged) {
      try {
        const existing = evaluationRule(next.deposits);
        const rule: DepositRule = {
          id: existing?.id ?? "deposit-evaluation",
          scope: "service",
          serviceType: EVALUATION,
          amountType: "percentage",
          amount: draft.deposit.percent,
          enabled: draft.deposit.enabled,
          label: storedRuleLabel(draft.deposit),
        };
        const rules = existing
          ? next.deposits.rules.map((r) => (r === existing ? rule : r))
          : [...next.deposits.rules, rule];
        const deposits = await write("deposit_rules", {
          ...next.deposits,
          rules: ensureAllServiceRules(rules),
        });
        next = { ...next, deposits };
        nextBaseline = { ...nextBaseline, deposit: draft.deposit };
      } catch (error) {
        failed.push(reason(t("partDeposit"), error));
      }
    }

    setSaved(next);
    setBaseline(nextBaseline);
    setSaving(false);
    if (failed.length > 0) {
      toast.error(fill(t("notSaved"), { parts: failed.join(" · ") }));
    } else {
      toast.success(t("saved"));
    }
  };

  return {
    draft,
    setConfig,
    setSchedule,
    setChips: (chips) => setDraft((current) => ({ ...current, chips })),
    setAutoConfirm: (on) =>
      setDraft((current) => ({ ...current, autoConfirm: on })),
    setDeposit: (patch) =>
      setDraft((current) => ({
        ...current,
        deposit: { ...current.deposit, ...patch },
      })),
    dirty,
    saving,
    save,
    discard: () => setDraft(baseline),
  };
}

/**
 * The rule's stored label — the same English DepositRulesSettings'
 * formatRuleLabel stores, read back by six screens; not interface copy.
 */
function storedRuleLabel(deposit: EvaluationSetupDraft["deposit"]): string {
  if (!deposit.enabled || deposit.percent <= 0) {
    // french-ok: stored in rule.label, not rendered (formatRuleLabel)
    return "Evaluation — no deposit";
  }
  // french-ok: stored in rule.label, not rendered (formatRuleLabel)
  return `Evaluation — ${deposit.percent}% deposit`;
}

function reason(part: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return message ? `${part} (${message})` : part;
}
