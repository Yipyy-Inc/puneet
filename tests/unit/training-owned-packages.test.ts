import { describe, expect, test } from "bun:test";

import type { CustomerPackageRecord } from "@/data/customer-packages";
import { trainingPackageRows } from "@/lib/training-owned-packages";

// The trainer profile's package chips and panel read these rows from what a
// household really owns (/api/packages/owned). Pure, so pinned here.

function record(
  overrides: Partial<CustomerPackageRecord> & {
    lines?: { moduleId: string; total: number; used: number }[];
  },
): CustomerPackageRecord {
  const { lines = [], ...rest } = overrides;
  return {
    id: "pkg",
    customerId: 15,
    packageId: "catalogue",
    packageName: "Puppy 6-pack",
    purchasedAt: "2026-08-01T12:00:00Z",
    passesTotal: 0,
    passesUsed: 0,
    status: "active",
    redemptions: [],
    passes: lines.map((l, i) => ({
      moduleId: l.moduleId,
      packageId: `line-${i}`,
      serviceName: l.moduleId,
      totalPasses: l.total,
      usedPasses: l.used,
    })),
    ...rest,
  };
}

const TODAY = "2026-09-12";

describe("trainingPackageRows", () => {
  test("keeps only active packages that carry training passes", () => {
    const rows = trainingPackageRows(
      [
        record({
          id: "groom",
          lines: [{ moduleId: "grooming", total: 5, used: 1 }],
        }),
        record({
          id: "spent",
          status: "exhausted",
          lines: [{ moduleId: "training", total: 4, used: 4 }],
        }),
        record({
          id: "train",
          lines: [{ moduleId: "training", total: 6, used: 2 }],
        }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual(["train"]);
    expect(rows[0]).toMatchObject({
      total: 6,
      used: 2,
      remaining: 4,
      progressPct: 67,
      exhausted: false,
      lowBalance: false,
    });
  });

  test("counts only the training lines of a mixed package", () => {
    const [row] = trainingPackageRows(
      [
        record({
          lines: [
            { moduleId: "training", total: 4, used: 3 },
            { moduleId: "daycare", total: 10, used: 0 },
          ],
        }),
      ],
      TODAY,
    );
    expect(row).toMatchObject({ total: 4, remaining: 1, lowBalance: true });
  });

  test("an empty training line is out of sessions, not low", () => {
    const [row] = trainingPackageRows(
      [record({ lines: [{ moduleId: "training", total: 3, used: 3 }] })],
      TODAY,
    );
    expect(row).toMatchObject({
      remaining: 0,
      exhausted: true,
      lowBalance: false,
    });
  });

  test("expiring soon is within two weeks, and never after it has passed", () => {
    const rows = trainingPackageRows(
      [
        record({
          id: "soon",
          expiresAt: "2026-09-20",
          lines: [{ moduleId: "training", total: 6, used: 0 }],
        }),
        record({
          id: "later",
          expiresAt: "2026-12-01",
          lines: [{ moduleId: "training", total: 6, used: 0 }],
        }),
        record({
          id: "past",
          expiresAt: "2026-09-01",
          lines: [{ moduleId: "training", total: 6, used: 0 }],
        }),
      ],
      TODAY,
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.expiringSoon]));
    expect(byId).toEqual({ soon: true, later: false, past: false });
  });

  test("the ones needing action come first, then the newest", () => {
    const rows = trainingPackageRows(
      [
        record({
          id: "old-fine",
          purchasedAt: "2026-06-01T00:00:00Z",
          lines: [{ moduleId: "training", total: 6, used: 1 }],
        }),
        record({
          id: "new-fine",
          purchasedAt: "2026-09-01T00:00:00Z",
          lines: [{ moduleId: "training", total: 6, used: 1 }],
        }),
        record({
          id: "low",
          purchasedAt: "2026-05-01T00:00:00Z",
          lines: [{ moduleId: "training", total: 6, used: 5 }],
        }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual(["low", "new-fine", "old-fine"]);
  });
});
