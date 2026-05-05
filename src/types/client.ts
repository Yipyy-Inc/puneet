import { z } from "zod";

import type { Pet } from "@/types/pet";

// ============================================================================
// Client Schema
// ============================================================================

export const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
});

export const additionalContactTagSchema = z.enum([
  "pickup",
  "dropoff",
  "emergency",
]);

export const additionalContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship: z.string().default(""),
  phone: z.string(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional(),
  tags: z.array(additionalContactTagSchema).default([]),
});

export const membershipSchema = z.object({
  plan: z.string(),
  status: z.enum(["active", "expired", "cancelled"]),
  startDate: z.string(),
  expiryDate: z.string(),
  benefits: z.object({
    discountPercent: z.number().optional(),
    includedServices: z
      .array(z.object({ moduleId: z.string(), quantity: z.number() }))
      .optional(),
    freeAddOns: z.array(z.string()).optional(),
  }),
});
export type Membership = z.infer<typeof membershipSchema>;

export const packageSchema = z.object({
  id: z.string(),
  name: z.string(),
  moduleId: z.string(),
  totalCredits: z.number(),
  usedCredits: z.number(),
  remainingCredits: z.number(),
  purchaseDate: z.string(),
  expiryDate: z.string().optional(),
  pricePerCredit: z.number(),
});
export type ClientPackage = z.infer<typeof packageSchema>;

export const storeCreditTransactionSchema = z.object({
  date: z.string(),
  amount: z.number(),
  type: z.enum(["added", "redeemed", "expired"]),
  source: z.string(),
  bookingId: z.number().optional(),
});

export const storeCreditSchema = z.object({
  balance: z.number(),
  transactions: z.array(storeCreditTransactionSchema),
});
export type StoreCredit = z.infer<typeof storeCreditSchema>;

// ============================================================================
// Customer Settings (managed from facility-side client file or customer portal)
// ============================================================================

export const customerSettingsSchema = z.object({
  enableThankYouEmails: z.boolean().default(true),
  enableReminderEmails: z.boolean().default(true),
  enableOngoingScheduleReminderEmails: z.boolean().default(true),
  applyPassesByDefault: z.boolean().default(true),
  copyAdditionalContactOnBookingConfirmations: z.boolean().default(true),
  copyAdditionalContactOnSystemEmails: z.boolean().default(true),
  preferredLanguage: z.string().default("en"),
  /**
   * Allow this customer to instabook daycare instead of submitting a request.
   * When true, the customer's daycare bookings skip the booking-requests queue
   * and are auto-confirmed (room/section assigned automatically).
   */
  instabookDaycare: z.boolean().default(false),
  /** Same as instabookDaycare but for boarding stays. */
  instabookBoarding: z.boolean().default(false),
  /** Same as instabookDaycare but for grooming. */
  instabookGrooming: z.boolean().default(false),
  /**
   * Auto-tipping for this customer. When enabled, the configured tip is
   * applied automatically at checkout (when a card is on file) instead of
   * showing the tip prompt. Customers manage this from their portal; staff
   * can toggle it on the client file when the customer asks.
   */
  autoTip: z
    .object({
      enabled: z.boolean().default(false),
      type: z.enum(["percentage", "fixed"]).default("percentage"),
      value: z.number().nonnegative().default(20),
    })
    .default({ enabled: false, type: "percentage", value: 20 }),
});
export type CustomerSettings = z.infer<typeof customerSettingsSchema>;
export type CustomerAutoTip = CustomerSettings["autoTip"];

export const defaultCustomerSettings: CustomerSettings = {
  enableThankYouEmails: true,
  enableReminderEmails: true,
  enableOngoingScheduleReminderEmails: true,
  applyPassesByDefault: true,
  copyAdditionalContactOnBookingConfirmations: true,
  copyAdditionalContactOnSystemEmails: true,
  preferredLanguage: "en",
  instabookDaycare: false,
  instabookBoarding: false,
  instabookGrooming: false,
  autoTip: { enabled: false, type: "percentage", value: 20 },
};

export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  preferredLanguage: z.string().optional(),
  status: z.string(),
  facility: z.string(),
  imageUrl: z.string().optional(),
  pets: z.custom<Pet[]>(),
  address: addressSchema.optional(),
  additionalContacts: z.array(additionalContactSchema).default([]),
  membership: membershipSchema.optional(),
  packages: z.array(packageSchema).optional(),
  storeCredit: storeCreditSchema.optional(),
  customerSettings: customerSettingsSchema.optional(),
  // When true, the facility has blocked this client. Blocked clients cannot
  // send messages to the facility, are excluded from marketing campaigns,
  // reminders, and automations. The profile (history, pets, bookings) is
  // preserved for reference.
  isBlocked: z.boolean().optional(),
  blockedAt: z.string().optional(),
  blockedReason: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;
export type Address = z.infer<typeof addressSchema>;
export type AdditionalContact = z.infer<typeof additionalContactSchema>;
export type AdditionalContactTag = z.infer<typeof additionalContactTagSchema>;

export const ADDITIONAL_CONTACT_TAG_LABELS: Record<
  AdditionalContactTag,
  string
> = {
  pickup: "Pickup",
  dropoff: "Drop-off",
  emergency: "Emergency",
};

export const ADDITIONAL_CONTACT_TAGS: AdditionalContactTag[] = [
  "pickup",
  "dropoff",
  "emergency",
];

// ============================================================================
// Auth Form Schemas
// ============================================================================

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    preferredLanguage: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupFormData = z.infer<typeof signupFormSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ============================================================================
// Edit Schema
// ============================================================================

export const editClientSchema = clientSchema.partial().omit({ id: true });
export type EditClientData = z.infer<typeof editClientSchema>;
