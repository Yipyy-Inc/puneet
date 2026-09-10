import { describe, expect, test } from "bun:test";

import { earnRuleCustomerSummary } from "@/lib/loyalty/earn-rule-summary";
import type { EarnRule } from "@/types/loyalty";

// The customer's "How points are earned" list, in both languages (§5q).
//
// The French is its own grammar, not the English fragments translated, so it
// is worth pinning: an amount after its noun, a NON-BREAKING space before the
// dollar sign, and a service named in parentheses rather than inflected.

const NBSP = " ";

const rule = (over: Partial<EarnRule>): EarnRule =>
  ({
    id: "r1",
    name: "Rule",
    enabled: true,
    status: "active",
    rewardType: "points",
    rewardValue: 10,
    triggerType: "spend_amount",
    triggerValue: 1,
    appliesToServiceTypes: null,
    scheduleType: "always",
    scheduleConfig: null,
    ...over,
  }) as unknown as EarnRule;

describe("earnRuleCustomerSummary", () => {
  test("English is unchanged by the French path", () => {
    expect(earnRuleCustomerSummary(rule({}))).toBe(
      "Earn 10 points per $1 spent (all year)",
    );
  });

  test("French spend rule", () => {
    expect(earnRuleCustomerSummary(rule({}), "fr")).toBe(
      `Obtenez 10 points par tranche de 1${NBSP}$ dépensé (toute l’année)`,
    );
  });

  test("French credit puts the amount first, behind a non-breaking space", () => {
    expect(
      earnRuleCustomerSummary(
        rule({
          rewardType: "credit",
          rewardValue: 25,
          triggerType: "birthday",
        }),
        "fr",
      ),
    ).toBe(`Obtenez 25${NBSP}$ de crédit à votre anniversaire (toute l’année)`);
  });

  test("French weekdays and a single service", () => {
    expect(
      earnRuleCustomerSummary(
        rule({
          triggerType: "service_type",
          appliesToServiceTypes: ["daycare"],
          scheduleType: "recurring_days",
          scheduleConfig: { daysOfWeek: [2, 1] },
        } as Partial<EarnRule>),
        "fr",
      ),
    ).toContain("lundi et mardi");
  });
});
