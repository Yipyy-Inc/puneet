import { z } from "zod";

export const prepaidPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  serviceId: z.string(), // e.g. "grooming", "daycare"
  totalPasses: z.number(), // e.g. 5, 10
  expirationDays: z.number().optional(), // e.g. 365 (valid for 1 year)
  isActive: z.boolean().default(true),
});

export type PrepaidPackage = z.infer<typeof prepaidPackageSchema>;

export const packageRedemptionSchema = z.object({
  id: z.string(),
  date: z.string(),
  bookingId: z.number().optional(),
  petId: z.number().optional(),
  petName: z.string().optional(),
  serviceLabel: z.string(),
  passNumber: z.number(),
});

export type PackageRedemption = z.infer<typeof packageRedemptionSchema>;

export const customerPackageSchema = z.object({
  id: z.string(),
  customerId: z.number(),
  packageId: z.string(),
  purchasedAt: z.string(),
  expiresAt: z.string().optional(),
  passesTotal: z.number(),
  passesUsed: z.number(),
  status: z.enum(["active", "exhausted", "expired"]),
  redemptions: z.array(packageRedemptionSchema).default([]),
});

export type CustomerPackage = z.infer<typeof customerPackageSchema>;
