import { featureFlags, type FeatureFlag } from "@/data/system-administration";

// The platform Global Flags view = the real feature flags plus a few more
// deterministic platform-wide flags so the console reflects a realistic surface.
const extraFlags: FeatureFlag[] = [
  {
    id: "flag-101",
    name: "Self-Serve Onboarding",
    key: "feature.self_serve_onboarding",
    description: "Let new facilities complete setup without a CSM.",
    enabled: true,
    rolloutPercentage: 100,
    createdBy: "Product Manager",
    createdAt: "2026-01-10",
    lastModified: "2026-05-10",
  },
  {
    id: "flag-102",
    name: "Gift Card Redemption v2",
    key: "feature.gift_card_v2",
    description: "Redesigned gift-card redemption flow.",
    enabled: true,
    rolloutPercentage: 75,
    createdBy: "Payments Team",
    createdAt: "2026-03-01",
    lastModified: "2026-06-01",
  },
  {
    id: "flag-103",
    name: "Two-Factor Enforcement",
    key: "feature.2fa_enforcement",
    description: "Require two-factor authentication for all facility admins.",
    enabled: false,
    rolloutPercentage: 0,
    createdBy: "Security Lead",
    createdAt: "2026-02-15",
    lastModified: "2026-04-15",
  },
  {
    id: "flag-104",
    name: "Reputation Booster",
    key: "feature.reputation_booster",
    description: "Automated review interception and routing.",
    enabled: true,
    rolloutPercentage: 60,
    createdBy: "Growth Team",
    createdAt: "2026-04-01",
    lastModified: "2026-06-12",
  },
  {
    id: "flag-105",
    name: "AI Call Summaries",
    key: "feature.ai_call_summaries",
    description: "Auto-summarize inbound calls in the call log.",
    enabled: false,
    rolloutPercentage: 25,
    targetFacilities: ["fac-001"],
    createdBy: "AI Team",
    createdAt: "2026-05-20",
    lastModified: "2026-06-20",
  },
];

export const platformFeatureFlags: FeatureFlag[] = [
  ...featureFlags,
  ...extraFlags,
];
