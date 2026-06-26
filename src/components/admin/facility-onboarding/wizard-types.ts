// Aggregate draft model for the Facility Onboarding Wizard. The parent holds
// one of these as the single source of truth so wizard state persists across
// Back/Forward navigation; each step edits a slice of it.

export type BusinessTypeId =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "veterinary"
  | "retail";

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type BillingCycle = "monthly" | "annual";

export interface ServicePricingEntry {
  enabled: boolean;
  basePrice: string;
  additionalAnimalFee: string;
}

export interface DayHours {
  open: boolean;
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
}

export interface FacilityDraft {
  // Step 1 — Business Information
  legalName: string;
  displayName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  timeZone: string;
  phone: string;
  website: string;
  businessTypes: string[];
  referralSource: string;

  // Step 2 — Plan & Trial
  tierId: string;
  billingCycle: BillingCycle;
  trialEnabled: boolean;
  trialEndDate: string; // "YYYY-MM-DD"
  promoCode: string;

  // Step 3 — Services & Pricing
  services: Record<string, ServicePricingEntry>;
  taxRate: string;

  // Step 4 — Operating Configuration
  schedule: Record<string, DayHours>;
  checkInTime: string;
  checkOutTime: string;
  bookingCutoff: string;
  depositEnabled: boolean;
  depositPercent: string;

  // Step 5 — Primary Admin Account
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

/** Shared props for each editable wizard step (1–5). */
export interface StepProps {
  draft: FacilityDraft;
  /** Commit this step's values into the draft and advance. */
  onNext: (values: Partial<FacilityDraft>) => void;
  /** Commit current values (no validation) and go back. Absent on step 1. */
  onBack?: (values: Partial<FacilityDraft>) => void;
  /** Close the wizard. */
  onCancel: () => void;
}
