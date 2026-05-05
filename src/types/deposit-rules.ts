import { z } from "zod";

export const depositAmountTypeEnum = z.enum(["percentage", "fixed"]);
export type DepositAmountType = z.infer<typeof depositAmountTypeEnum>;

export const depositRuleScopeEnum = z.enum(["service", "booking_value"]);
export type DepositRuleScope = z.infer<typeof depositRuleScopeEnum>;

export const depositRuleSchema = z.object({
  id: z.string(),
  scope: depositRuleScopeEnum,
  serviceType: z.string().optional(),
  amountType: depositAmountTypeEnum,
  amount: z.number(),
  minBookingValue: z.number().optional(),
  enabled: z.boolean(),
  label: z.string(),
});
export type DepositRule = z.infer<typeof depositRuleSchema>;

export type DepositRuleSet = DepositRule[];

export const SERVICE_TYPES_FOR_DEPOSITS = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "vet",
  "retail",
] as const;
export type DepositServiceType = (typeof SERVICE_TYPES_FOR_DEPOSITS)[number];
