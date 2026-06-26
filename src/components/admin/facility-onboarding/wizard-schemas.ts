import { z } from "zod";

const isNonNegativeNumber = (v: string) =>
  v.trim() !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0;

// Step 1 — Business Information
export const businessInfoSchema = z
  .object({
    legalName: z.string().trim().min(1, "Legal name is required"),
    displayName: z.string().trim().min(1, "Display name is required"),
    address: z.string().trim().min(1, "Address is required"),
    city: z.string().trim().min(1, "City is required"),
    province: z.string().trim().min(1, "Province is required"),
    postalCode: z.string().trim().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
    timeZone: z.string().min(1, "Time zone is required"),
    phone: z.string().trim().min(7, "Enter a valid phone number"),
    website: z.string().trim(),
    businessTypes: z
      .array(z.string())
      .min(1, "Select at least one business type"),
    referralSource: z.string().min(1, "Please choose an option"),
  })
  .superRefine((val, ctx) => {
    if (val.website && !/^https?:\/\/.+\..+/.test(val.website)) {
      ctx.addIssue({
        code: "custom",
        message: "Use a full URL (https://…)",
        path: ["website"],
      });
    }
  });

// Step 2 — Plan & Trial
export const planTrialSchema = z
  .object({
    tierId: z.string().min(1, "Select a plan tier"),
    billingCycle: z.enum(["monthly", "annual"]),
    trialEnabled: z.boolean(),
    trialEndDate: z.string(),
    promoCode: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.trialEnabled && !val.trialEndDate) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a trial end date",
        path: ["trialEndDate"],
      });
    }
  });

// Step 3 — Services & Pricing
export const servicesPricingSchema = z
  .object({
    services: z.record(
      z.string(),
      z.object({
        enabled: z.boolean(),
        basePrice: z.string(),
        additionalAnimalFee: z.string(),
      }),
    ),
    taxRate: z.string(),
  })
  .superRefine((val, ctx) => {
    const enabled = Object.entries(val.services).filter(([, v]) => v.enabled);
    if (enabled.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enable and price at least one service",
        path: ["services"],
      });
    }
    for (const [id, v] of enabled) {
      if (!isNonNegativeNumber(v.basePrice)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a base price",
          path: ["services", id, "basePrice"],
        });
      }
      if (
        v.additionalAnimalFee.trim() !== "" &&
        Number.isNaN(Number(v.additionalAnimalFee))
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid fee",
          path: ["services", id, "additionalAnimalFee"],
        });
      }
    }
    if (val.taxRate.trim() !== "" && Number.isNaN(Number(val.taxRate))) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid tax rate",
        path: ["taxRate"],
      });
    }
  });

// Step 4 — Operating Configuration
export const operatingSchema = z
  .object({
    schedule: z.record(
      z.string(),
      z.object({
        open: z.boolean(),
        openTime: z.string(),
        closeTime: z.string(),
      }),
    ),
    checkInTime: z.string().min(1, "Required"),
    checkOutTime: z.string().min(1, "Required"),
    bookingCutoff: z.string().min(1, "Required"),
    depositEnabled: z.boolean(),
    depositPercent: z.string(),
  })
  .superRefine((val, ctx) => {
    const anyOpen = Object.values(val.schedule).some((d) => d.open);
    if (!anyOpen) {
      ctx.addIssue({
        code: "custom",
        message: "Mark at least one day as open",
        path: ["schedule"],
      });
    }
    for (const [day, d] of Object.entries(val.schedule)) {
      if (d.open && d.openTime && d.closeTime && d.openTime >= d.closeTime) {
        ctx.addIssue({
          code: "custom",
          message: "Close must be after open",
          path: ["schedule", day, "closeTime"],
        });
      }
    }
    if (val.depositEnabled) {
      const n = Number(val.depositPercent);
      if (
        val.depositPercent.trim() === "" ||
        Number.isNaN(n) ||
        n <= 0 ||
        n > 100
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a percentage between 1 and 100",
          path: ["depositPercent"],
        });
      }
    }
  });

// Step 5 — Primary Admin Account
export const primaryAdminSchema = z.object({
  adminFirstName: z.string().trim().min(1, "First name is required"),
  adminLastName: z.string().trim().min(1, "Last name is required"),
  adminEmail: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address",
    ),
});
