// Seed data for the synthesized active trials + this-quarter outcomes used by
// `buildTrials`. New prospective facilities (not the existing paid tenants), so
// the trials list is its own cohort.

export const TRIAL_EXPIRY_TEMPLATE_ID = "tmpl-trial-expiry";

interface TrialSeed {
  facilityName: string;
  tierId: string;
  plan: string;
  adminName: string;
  adminEmail: string;
  /** Days until trial end (≤ 0 = already expired / read-only). */
  daysRemaining: number;
}

export const TRIAL_SEEDS: TrialSeed[] = [
  {
    facilityName: "Bark Avenue Pet Resort",
    tierId: "tier-pro",
    plan: "Pack Leader",
    adminName: "Maya Robles",
    adminEmail: "maya@barkavenue.com",
    daysRemaining: 1,
  },
  {
    facilityName: "The Dapper Dog Spa",
    tierId: "tier-beginner",
    plan: "Puppy",
    adminName: "Theo Nguyen",
    adminEmail: "theo@dapperdog.com",
    daysRemaining: 2,
  },
  {
    facilityName: "Whiskers & Wags Daycare",
    tierId: "tier-pro",
    plan: "Pack Leader",
    adminName: "Priya Shah",
    adminEmail: "priya@whiskerswags.com",
    daysRemaining: 4,
  },
  {
    facilityName: "Cozy Critters Boarding",
    tierId: "tier-beginner",
    plan: "Puppy",
    adminName: "Liam Carter",
    adminEmail: "liam@cozycritters.com",
    daysRemaining: 6,
  },
  {
    facilityName: "Pawsitive Vibes Grooming",
    tierId: "tier-enterprise",
    plan: "Alpha Enterprise",
    adminName: "Sofia Marín",
    adminEmail: "sofia@pawsitivevibes.com",
    daysRemaining: 7,
  },
  {
    facilityName: "Fetch & Fun Playcare",
    tierId: "tier-pro",
    plan: "Pack Leader",
    adminName: "Daniel Okafor",
    adminEmail: "daniel@fetchfun.com",
    daysRemaining: 11,
  },
  {
    facilityName: "Noble Paws Veterinary",
    tierId: "tier-enterprise",
    plan: "Alpha Enterprise",
    adminName: "Hannah Weiss",
    adminEmail: "hannah@noblepaws.com",
    daysRemaining: 16,
  },
  {
    facilityName: "Urban Tails Kennel",
    tierId: "tier-beginner",
    plan: "Puppy",
    adminName: "Marcus Lee",
    adminEmail: "marcus@urbantails.com",
    daysRemaining: 23,
  },
  {
    facilityName: "Snuggle Snouts Sitting",
    tierId: "tier-beginner",
    plan: "Puppy",
    adminName: "Elena Petrova",
    adminEmail: "elena@snugglesnouts.com",
    daysRemaining: -1,
  },
];

/** Outcomes of trials that ended recently (drives conversion-rate this quarter). */
export const QUARTER_OUTCOMES: ("converted" | "expired" | "cancelled")[] = [
  "converted",
  "converted",
  "expired",
  "converted",
  "converted",
  "cancelled",
  "converted",
  "converted",
  "expired",
  "converted",
  "cancelled",
  "converted",
];
