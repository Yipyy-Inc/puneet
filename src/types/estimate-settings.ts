/**
 * Per-facility estimate defaults (Spec Part 9.3).
 *
 * These back the Estimate Settings UI (Area 8) and are read by:
 *  - the create wizard (expiry prefill via `defaultExpiryDays`),
 *  - the estimate number generator (`estimateNumberPrefix` + `minDigits`),
 *  - the accept / convert flows (`acceptanceRequiresDeposit`,
 *    `autoConvertOnAccept`, `allowCustomerAcceptance`, magic-link + welcome email).
 */
export interface EstimateSettings {
  /** Days added to "today" to prefill an estimate's expiry in the create wizard. */
  defaultExpiryDays: number;
  /** Require a deposit to be collected when an estimate is accepted. */
  requireDepositOnAccept: boolean;
  /** Prefix for generated estimate numbers, e.g. "E" -> "E10001". */
  estimateNumberPrefix: string;
  /** Minimum number of digits in the numeric part (zero-padded). */
  minDigits: number;
  /** Whether to warn (customer + staff) before an estimate expires. */
  expiryWarningEnabled: boolean;
  /** Hours before expiry to send the warning. */
  expiryWarningHoursBefore: number;
  /** Automatically convert an estimate into a booking the moment it's accepted. */
  autoConvertOnAccept: boolean;
  /** How long a customer's magic link stays valid, in hours. */
  magicLinkExpiryHours: number;
  /** Send a welcome email when an account is auto-created from an estimate. */
  sendWelcomeEmail: boolean;
  /** Allow the customer to accept the estimate themselves (vs. staff-only). */
  allowCustomerAcceptance: boolean;
  /** Require a deposit as part of customer self-acceptance. */
  acceptanceRequiresDeposit: boolean;
}
