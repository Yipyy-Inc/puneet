import { facilities } from "@/data/facilities";
import type { RecentCall } from "@/types/dialer";

// Seed for the Dialer "Recent Contacts" list — the most recently called
// facilities, using real facility names + contact numbers. minutesAgo offsets
// are relative to "now" so the "called X ago" labels stay fresh instead of
// drifting into a fixed past date.

interface RecentSeed {
  facilityId: number;
  minutesAgo: number;
}

const SEED: RecentSeed[] = [
  { facilityId: 1, minutesAgo: 8 },
  { facilityId: 3, minutesAgo: 52 },
  { facilityId: 5, minutesAgo: 140 },
  { facilityId: 2, minutesAgo: 320 },
  { facilityId: 7, minutesAgo: 1290 },
];

function facilityPhone(f: unknown): string {
  // Same contact→owner fallback as lookupFacilityByPhone in support-calls.ts.
  const fac = f as {
    contact?: { phone?: string };
    owner?: { phone?: string };
  };
  return fac?.contact?.phone ?? fac?.owner?.phone ?? "";
}

export function buildRecentCalls(nowMs: number): RecentCall[] {
  return SEED.map((s) => {
    const f = facilities.find((x) => x.id === s.facilityId);
    return {
      id: `rc-${s.facilityId}`,
      facilityId: s.facilityId,
      facilityName: f?.name ?? `Facility #${s.facilityId}`,
      number: facilityPhone(f),
      at: new Date(nowMs - s.minutesAgo * 60_000).toISOString(),
    };
  });
}
