// Facility lifecycle population for the churn / retention report.
//
// The live platform only carries ~11 current facilities (and no cancelled
// subscriptions), which is far too thin to compute a 12-month churn trend or
// cohort-retention curves. Following the same "derive from real entities +
// deterministic synthesis" workaround used by the platform dashboard, this
// module models a realistic customer base: a seeded, fully deterministic set
// of facility lifecycles (join month, churn month, tier, MRR) plus the real
// facilities folded in. Every report metric is then COMPUTED from this
// population in @/lib/api/churn — nothing in the report is hard-coded.
//
// Deterministic by construction: a fixed seed PRNG + a fixed reference month,
// so server and client render identical values (no hydration drift).

export interface FacilityLifecycle {
  id: string;
  name: string;
  /** Subscription tier name (e.g. "Pack Leader"). */
  tier: string;
  /** Display plan (Basic / Premium / Enterprise). */
  plan: string;
  /** Monthly recurring revenue for this facility, in USD. */
  mrr: number;
  /** ISO date the facility joined. */
  joinedAt: string;
  /** ISO date the facility churned, or null if still active. */
  churnedAt: string | null;
  /** Churn reason, or null if still active. */
  reason: string | null;
  /** Extra MRR gained over its lifetime from upgrades/add-ons (expansion). */
  expansionMrr: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The report's fixed "today" — keeps the whole report deterministic. */
export const REFERENCE_DATE = "2026-06-24";
/** Month-index (year*12 + month0) of the reference date. June 2026. */
export const REFERENCE_MI = 2026 * 12 + 5;

export function miToLabel(mi: number): string {
  return `${MONTHS[((mi % 12) + 12) % 12]} ${Math.floor(mi / 12)}`;
}

export function dateToMI(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
}

function miToDate(mi: number, day: number): string {
  const y = Math.floor(mi / 12);
  const m = (mi % 12) + 1;
  const d = Math.min(Math.max(day, 1), 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Deterministic PRNG (mulberry32) — no Math.random, stable across renders.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TierSpec {
  name: string;
  plan: string;
  mrr: number;
  weight: number;
  monthlyChurn: number;
}

// Tier monthly prices mirror src/data/subscription-tiers.ts.
const TIERS: TierSpec[] = [
  { name: "Puppy", plan: "Basic", mrr: 29, weight: 0.42, monthlyChurn: 0.045 },
  {
    name: "Pack Leader",
    plan: "Premium",
    mrr: 79,
    weight: 0.34,
    monthlyChurn: 0.03,
  },
  {
    name: "Alpha Enterprise",
    plan: "Enterprise",
    mrr: 199,
    weight: 0.14,
    monthlyChurn: 0.017,
  },
  {
    name: "Custom Enterprise",
    plan: "Enterprise",
    mrr: 149,
    weight: 0.1,
    monthlyChurn: 0.022,
  },
];

const REASONS = [
  "Price / budget",
  "Switched to competitor",
  "Closed business",
  "Missing features",
  "Poor support experience",
  "Low product usage",
  "Merged / acquired",
  "Billing dispute",
];

const PREFIX = [
  "Happy",
  "Furry",
  "Paws",
  "Whisker",
  "Cozy",
  "Loyal",
  "Golden",
  "Urban",
  "Sunny",
  "Maple",
  "Harbor",
  "Cedar",
  "Willow",
  "Riverside",
  "Northgate",
  "Bayview",
  "Summit",
  "Meadow",
  "Pine",
  "Coastal",
  "Bluebell",
  "Foxtail",
  "Hilltop",
  "Brookside",
  "Gentle",
  "Posh",
  "Wagging",
  "Brave",
];

const SUFFIX = [
  "Paws Resort",
  "Grooming Co.",
  "Boarding",
  "Daycare",
  "Vet Clinic",
  "Pet Spa",
  "Kennels",
  "Animal Care",
  "Pet Lodge",
  "Doggie Den",
  "Critter Care",
  "Pet Retreat",
  "Tails Inn",
  "Companions",
];

function pickTier(r: number): TierSpec {
  let acc = 0;
  for (const t of TIERS) {
    acc += t.weight;
    if (r <= acc) return t;
  }
  return TIERS[0];
}

function generate(): FacilityLifecycle[] {
  const rand = mulberry32(20260624);
  const out: FacilityLifecycle[] = [];
  const COUNT = 320;
  const SPAN = 30; // months of history before the reference month

  for (let i = 0; i < COUNT; i++) {
    const joinMonthsAgo = Math.floor(rand() * SPAN); // 0..29
    const joinMI = REFERENCE_MI - joinMonthsAgo;
    const tier = pickTier(rand());

    // Simulate a monthly churn hazard across the facility's observed tenure.
    let churnMI: number | null = null;
    let reason: string | null = null;
    for (let k = 1; k <= joinMonthsAgo; k++) {
      if (rand() < tier.monthlyChurn) {
        churnMI = joinMI + k;
        reason = REASONS[Math.floor(rand() * REASONS.length)];
        break;
      }
    }

    // Retained facilities can expand (upgrades / add-ons).
    let expansionMrr = 0;
    if (churnMI === null && rand() < 0.24) {
      expansionMrr = Math.round(tier.mrr * (0.15 + rand() * 0.5));
    }

    out.push({
      id: `fl-${String(i + 1).padStart(3, "0")}`,
      name: `${PREFIX[(i * 3 + 7) % PREFIX.length]} ${SUFFIX[(i * 5 + 3) % SUFFIX.length]}`,
      tier: tier.name,
      plan: tier.plan,
      mrr: tier.mrr,
      joinedAt: miToDate(joinMI, 1 + (i % 27)),
      churnedAt:
        churnMI === null ? null : miToDate(churnMI, 1 + ((i * 2) % 27)),
      reason,
      expansionMrr,
    });
  }

  return out;
}

// The 11 real facilities, folded in so the report reflects the live tenants.
// Inactive ones are treated as churned at their subscription end date.
const PLAN_TO_TIER: Record<string, { tier: string; mrr: number }> = {
  Basic: { tier: "Puppy", mrr: 29 },
  Premium: { tier: "Pack Leader", mrr: 79 },
  Enterprise: { tier: "Alpha Enterprise", mrr: 199 },
};

const REAL: {
  id: number;
  name: string;
  plan: string;
  joined: string;
  end: string;
  inactive: boolean;
}[] = [
  {
    id: 1,
    name: "Paws & Play Daycare",
    plan: "Premium",
    joined: "2025-06-15",
    end: "2026-06-15",
    inactive: false,
  },
  {
    id: 2,
    name: "Furry Friends Grooming",
    plan: "Basic",
    joined: "2025-08-22",
    end: "2026-08-22",
    inactive: false,
  },
  {
    id: 3,
    name: "Happy Tails Boarding",
    plan: "Enterprise",
    joined: "2025-03-10",
    end: "2026-03-10",
    inactive: true,
  },
  {
    id: 4,
    name: "Pet Paradise Vet",
    plan: "Premium",
    joined: "2025-11-05",
    end: "2026-11-05",
    inactive: false,
  },
  {
    id: 5,
    name: "Whisker Wonderland",
    plan: "Basic",
    joined: "2025-09-18",
    end: "2026-09-18",
    inactive: false,
  },
  {
    id: 6,
    name: "Pet Groomers Paradise",
    plan: "Premium",
    joined: "2025-07-12",
    end: "2026-07-12",
    inactive: false,
  },
  {
    id: 7,
    name: "Animal Care Center",
    plan: "Basic",
    joined: "2025-10-05",
    end: "2026-10-05",
    inactive: false,
  },
  {
    id: 8,
    name: "Feline Friends",
    plan: "Enterprise",
    joined: "2025-02-20",
    end: "2026-02-20",
    inactive: true,
  },
  {
    id: 9,
    name: "Doggy Day Spa",
    plan: "Premium",
    joined: "2025-12-01",
    end: "2026-12-01",
    inactive: false,
  },
  {
    id: 10,
    name: "Exotic Pets Hub",
    plan: "Basic",
    joined: "2025-05-15",
    end: "2026-05-15",
    inactive: false,
  },
  {
    id: 11,
    name: "Example Pet Care Facility",
    plan: "Basic",
    joined: "2025-01-01",
    end: "2026-01-01",
    inactive: false,
  },
];

function realLifecycles(): FacilityLifecycle[] {
  return REAL.map((f) => {
    const t = PLAN_TO_TIER[f.plan] ?? PLAN_TO_TIER.Basic;
    return {
      id: `real-${f.id}`,
      name: f.name,
      tier: t.tier,
      plan: f.plan,
      mrr: t.mrr,
      joinedAt: f.joined,
      churnedAt: f.inactive ? f.end : null,
      reason: f.inactive ? "Did not renew" : null,
      expansionMrr: 0,
    };
  });
}

export const facilityLifecycles: FacilityLifecycle[] = [
  ...realLifecycles(),
  ...generate(),
];
