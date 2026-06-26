// New-facility onboarding checklist — 7 guided setup steps.
//
// This is the single source of truth for the step definitions + their target
// routes. The live per-step status is held by the facility-onboarding store
// (src/lib/facility-onboarding-store.ts) so the facility page, the persistent
// dashboard banner, and the admin Facility-Profile setup card all reflect the
// same progress. Like the rest of the facility portal, this is locked to
// facility 11 (the single signed-in facility); the store keys + channel are
// scoped to that id and would need parameterizing to support more facilities.

import type {
  OnboardingStepDef,
  OnboardingStepStatus,
} from "@/types/facility-onboarding";

export const ONBOARDING_FACILITY_ID = 11;

export const onboardingSteps: OnboardingStepDef[] = [
  {
    id: "business-profile",
    order: 1,
    title: "Complete business profile",
    description:
      "Add your logo, a short description, and your business address so clients recognize you.",
    route: "/facility/dashboard/settings?section=business",
    cta: "Complete profile",
  },
  {
    id: "services-pricing",
    order: 2,
    title: "Set up services & pricing",
    description:
      "Choose the services you offer and set their prices so clients can book.",
    route: "/facility/dashboard/services/boarding/rates",
    cta: "Set up services",
  },
  {
    id: "operating-hours",
    order: 3,
    title: "Configure operating hours",
    description:
      "Tell us when you're open so bookings only land in available time slots.",
    route: "/facility/dashboard/settings?section=business",
    cta: "Set hours",
  },
  {
    id: "first-staff",
    order: 4,
    title: "Add your first staff member",
    description: "Invite a team member and assign their role and permissions.",
    route: "/facility/dashboard/staff",
    cta: "Add staff",
  },
  {
    id: "payment-method",
    order: 5,
    title: "Connect a payment method",
    description:
      "Connect a card so you can accept payments and pay your subscription.",
    route: "/facility/dashboard/billing/payment-settings",
    cta: "Connect payment",
  },
  {
    id: "first-booking",
    order: 6,
    title: "Make your first booking",
    description:
      "Create a test booking to see the full reservation flow end to end.",
    route: "/facility/dashboard/bookings",
    cta: "Create booking",
  },
  {
    id: "customer-portal",
    order: 7,
    title: "Set up your customer portal",
    description:
      "Publish your booking URL and branding so clients can book online.",
    route: "/facility/dashboard/online-booking",
    cta: "Set up portal",
  },
];

export const ONBOARDING_TOTAL_STEPS = onboardingSteps.length;

/** Steps that must be Complete before the banner can be dismissed. */
export const ONBOARDING_DISMISS_THRESHOLD = 5;

/**
 * Seed state for a new facility mid-onboarding: 3 complete, 2 in progress, 2
 * not started. In production each status would be derived from real setup
 * completion; it is seeded here so all three statuses are visible and the
 * dismiss threshold (5 complete) is reached by completing a couple more steps.
 */
export const defaultOnboardingStatuses: Record<string, OnboardingStepStatus> = {
  "business-profile": "complete",
  "services-pricing": "in_progress",
  "operating-hours": "not_started",
  "first-staff": "complete",
  "payment-method": "complete",
  "first-booking": "in_progress",
  "customer-portal": "not_started",
};
