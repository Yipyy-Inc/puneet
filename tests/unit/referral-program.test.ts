import { describe, expect, test } from "bun:test";

import {
  referralRewardFullText,
  referralRewardText,
} from "@/lib/loyalty/referral-program";
import type { ReferralRewardConfig } from "@/types/loyalty";

// The referral reward, as the customer's "Refer a friend" page words it (§5q).
//
// English is pinned too: the facility's wizard preview and a facility's own
// share template still read it, and they must not move because the customer's
// page learned French.

const NBSP = " ";

const config = (over: Partial<ReferralRewardConfig>): ReferralRewardConfig =>
  ({
    rewardType: "credit",
    rewardValue: 25,
    appliesToServiceTypes: null,
    expiresAfterDays: null,
    ...over,
  }) as ReferralRewardConfig;

describe("referralRewardText", () => {
  test("English is what it always was", () => {
    expect(referralRewardText("credit", 25)).toBe("$25 account credit");
    expect(referralRewardText("discount_pct", 10)).toBe("10% off");
    expect(referralRewardText("points", 100)).toBe("100 points");
    expect(referralRewardText("freebie", "Nail Trim")).toBe("Free Nail Trim");
  });

  test("French puts the amount after the noun, with a space before $ and %", () => {
    expect(referralRewardText("credit", 25, "fr")).toBe(
      `25${NBSP}$ de crédit au compte`,
    );
    expect(referralRewardText("gift_card", 50, "fr")).toBe(
      `carte-cadeau de 50${NBSP}$`,
    );
    expect(referralRewardText("discount_pct", 10, "fr")).toMatch(
      /^10[  ]% de rabais$/,
    );
    expect(referralRewardText("freebie", "", "fr")).toBe("Article gratuit");
  });
});

describe("referralRewardFullText", () => {
  test("English scope and expiry are unchanged", () => {
    expect(
      referralRewardFullText(
        config({ appliesToServiceTypes: ["grooming"], expiresAfterDays: 30 }),
      ),
    ).toBe("$25 account credit · grooming only · expires in 30 days");
  });

  test("French names the services and the expiry in French", () => {
    expect(
      referralRewardFullText(
        config({
          appliesToServiceTypes: ["grooming", "daycare"],
          expiresAfterDays: 30,
        }),
        "fr",
      ),
    ).toBe(
      `25${NBSP}$ de crédit au compte · toilettage et garderie seulement · expire dans 30 jours`,
    );
  });
});
