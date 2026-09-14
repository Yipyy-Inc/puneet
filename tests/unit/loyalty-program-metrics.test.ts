import { describe, expect, test } from "bun:test";

import { computeProgramPerformanceFromLedger } from "@/lib/loyalty/program-metrics";

const NOW = "2026-09-14T12:00:00.000Z";

describe("computeProgramPerformanceFromLedger", () => {
  test("retention from the booking summary splits members from everyone else", () => {
    const perf = computeProgramPerformanceFromLedger({
      accounts: [{ clientRef: 1 }, { clientRef: 2 }],
      vouchers: [],
      bookings: [],
      retention: new Map([
        [1, true],
        [2, false],
        [3, true],
        [4, true],
        [5, false],
        [6, true],
      ]),
      now: NOW,
    });
    expect(perf.memberRetention).toBe(0.5);
    expect(perf.nonMemberRetention).toBe(0.75);
    expect(perf.totalMembers).toBe(2);
  });

  test("a percentage voucher is priced from the booking it was spent on", () => {
    const perf = computeProgramPerformanceFromLedger({
      accounts: [{ clientRef: 1 }],
      vouchers: [
        {
          rewardType: "discount_pct",
          rewardValue: 10,
          effectiveStatus: "used",
          usedAt: "2026-09-02T15:00:00.000Z",
          usedOnBookingRef: 500,
          clientRef: 1,
        },
      ],
      bookings: [{ id: 500, clientId: 1, totalCost: 80 }],
      retention: new Map(),
      now: NOW,
    });
    expect(perf.revenueRetained).toBe(8);
    expect(perf.membersRedeemed).toBe(1);
    expect(perf.unvaluedRewards).toBe(0);
  });

  test("without a summary, retention is still worked out from the bookings", () => {
    const perf = computeProgramPerformanceFromLedger({
      accounts: [{ clientRef: 1 }],
      vouchers: [],
      bookings: [
        { id: 1, clientId: 1, startDate: "2026-06-01" },
        { id: 2, clientId: 1, startDate: "2026-06-20" },
      ],
      now: NOW,
    });
    expect(perf.memberRetention).toBe(1);
  });
});
