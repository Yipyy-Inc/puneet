"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Switch } from "@/components/ui/switch";
import type { MedDayRule } from "@/types/base";

import { SetupCard } from "./setup-card";

// ============================================================================
// MORE OPTIONS: what the client's page leaves out and the steps still need —
// which "Which days?" choices an overnight stay offers, and the parts of the
// step a facility can leave off. One card at the end of each tab.
// ============================================================================

const DAY_RULE_KEY: Record<MedDayRule, string> = {
  every_day: "medsDaysEveryDay",
  except_checkout: "medsDaysExceptCheckout",
  certain_dates: "medsDaysCertain",
};

export function MoreOptionsCard<Part extends string>({
  id,
  rules,
  dayRules,
  onDayRules,
  parts,
  partKey,
  show,
  onShow,
  changed,
  onReset,
  t,
  bt,
}: {
  id: string;
  /** Every "Which days?" choice, in the step's order. */
  rules: readonly MedDayRule[];
  dayRules: readonly MedDayRule[];
  onDayRules: (rules: MedDayRule[]) => void;
  parts: readonly Part[];
  partKey: Record<Part, string>;
  show: Record<Part, boolean>;
  onShow: (show: Record<Part, boolean>) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
  /** The booking form's words, for its "Which days?" choices. */
  bt: (key: string) => string;
}) {
  const toggle = (rule: MedDayRule) =>
    onDayRules(
      dayRules.includes(rule)
        ? dayRules.filter((candidate) => candidate !== rule)
        : rules.filter(
            (candidate) => candidate === rule || dayRules.includes(candidate),
          ),
    );

  return (
    <SetupCard
      id={id}
      title={t("moreTitle")}
      help={t("moreHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex min-w-0 flex-col gap-2.5 px-5 py-4 sm:px-6">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            id={`${id}-days`}
            className="text-body-ink text-[15px] font-medium"
          >
            {t("daysTitle")}
          </span>
          <span className="text-ink-tertiary text-[13px]">{t("daysHelp")}</span>
        </span>
        <div
          role="group"
          aria-labelledby={`${id}-days`}
          className="flex flex-wrap gap-2"
        >
          {rules.map((rule) => (
            <ChoicePill
              key={rule}
              type="checkbox"
              value={rule}
              checked={dayRules.includes(rule)}
              onChange={() => toggle(rule)}
            >
              {bt(DAY_RULE_KEY[rule])}
            </ChoicePill>
          ))}
        </div>
        {dayRules.length === 0 ? (
          <p className="text-bad text-[13px]">{t("invalidDays")}</p>
        ) : null}
      </div>
      <div className="border-line flex min-w-0 flex-col gap-2.5 border-t px-5 py-4 sm:px-6">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-ink text-[15px] font-medium">
            {t("partsTitle")}
          </span>
          <span className="text-ink-tertiary text-[13px]">
            {t("partsHelp")}
          </span>
        </span>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {parts.map((part) => (
            <li key={part}>
              <label className="text-body-ink flex cursor-pointer items-center gap-3 py-1.5 text-[15px]">
                <Switch
                  checked={show[part]}
                  onCheckedChange={(on) => onShow({ ...show, [part]: on })}
                />
                {t(partKey[part])}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </SetupCard>
  );
}
