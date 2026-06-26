import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Tags,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  BusinessTypeId,
  FacilityDraft,
  ServicePricingEntry,
  Weekday,
} from "./wizard-types";

export const BUSINESS_TYPES: { id: BusinessTypeId; label: string }[] = [
  { id: "boarding", label: "Boarding" },
  { id: "daycare", label: "Daycare" },
  { id: "grooming", label: "Grooming" },
  { id: "training", label: "Training" },
  { id: "veterinary", label: "Veterinary" },
  { id: "retail", label: "Retail" },
];

// Services priced in Step 3 mirror the business types.
export const SERVICES = BUSINESS_TYPES;

export const WEEKDAYS: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const COUNTRIES = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
];

export const TIME_ZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Australia/Sydney",
];

export const REFERRAL_SOURCES = [
  "Google Search",
  "Referral from a colleague",
  "Social media",
  "Industry trade show",
  "Existing Yipyy customer",
  "Other",
];

export interface StepMeta {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
}

export const STEP_META: StepMeta[] = [
  {
    id: "business",
    title: "Business Information",
    summary: "Legal & display name, address, contact, and business types.",
    icon: Building2,
  },
  {
    id: "plan",
    title: "Plan & Trial",
    summary: "Tier, billing cycle, trial window, and promo code.",
    icon: CreditCard,
  },
  {
    id: "services",
    title: "Services & Pricing",
    summary: "Per-service base price, additional-animal fee, and tax.",
    icon: Tags,
  },
  {
    id: "operating",
    title: "Operating Configuration",
    summary: "Weekly hours, check-in/out, booking cut-off, and deposits.",
    icon: Clock,
  },
  {
    id: "admin",
    title: "Primary Admin Account",
    summary: "Owner login — a welcome link is sent on creation.",
    icon: UserCog,
  },
  {
    id: "review",
    title: "Review & Create",
    summary: "Confirm everything, then create the facility.",
    icon: CheckCircle2,
  },
];

function emptyServicePricing(): Record<string, ServicePricingEntry> {
  const entries = BUSINESS_TYPES.map((b) => [
    b.id,
    { enabled: false, basePrice: "", additionalAnimalFee: "" },
  ]);
  return Object.fromEntries(entries) as Record<string, ServicePricingEntry>;
}

function defaultSchedule() {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      {
        open: day !== "Sunday",
        openTime: day === "Saturday" ? "09:00" : "08:00",
        closeTime: day === "Saturday" ? "17:00" : "18:00",
      },
    ]),
  ) as FacilityDraft["schedule"];
}

/** Default trial end date = today + 14 days, as "YYYY-MM-DD". */
function defaultTrialEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function createDefaultDraft(): FacilityDraft {
  return {
    legalName: "",
    displayName: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "CA",
    timeZone: "America/Toronto",
    phone: "",
    website: "",
    businessTypes: [],
    referralSource: "",

    tierId: "",
    billingCycle: "monthly",
    trialEnabled: true,
    trialEndDate: defaultTrialEnd(),
    promoCode: "",

    services: emptyServicePricing(),
    taxRate: "",

    schedule: defaultSchedule(),
    checkInTime: "08:00",
    checkOutTime: "18:00",
    bookingCutoff: "18:00",
    depositEnabled: false,
    depositPercent: "",

    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
  };
}
