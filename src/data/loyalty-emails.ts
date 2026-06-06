/**
 * Mock loyalty email outbox. In production these would be queued to a real
 * transactional-email provider; here we record them in memory so the "sent via
 * email" channel is observable and testable. The portal-notification channel is
 * handled separately by the customer notifications store.
 */

export interface LoyaltyEmail {
  id: string;
  facilityId: number;
  customerId: number;
  to: string;
  subject: string;
  body: string;
  /** Template key, e.g. "loyalty_welcome". */
  template: string;
  sentAt: string;
}

export const loyaltyEmailOutbox: LoyaltyEmail[] = [];

let emailSeq = 0;

/** "Send" a loyalty email — appends to the mock outbox and returns the record. */
export function sendLoyaltyEmail(input: {
  facilityId: number;
  customerId: number;
  to: string;
  subject: string;
  body: string;
  template: string;
  sentAt: string;
}): LoyaltyEmail {
  emailSeq += 1;
  const email: LoyaltyEmail = {
    id: `email-${input.template}-${input.facilityId}-${input.customerId}-${emailSeq}`,
    ...input,
  };
  loyaltyEmailOutbox.push(email);
  return email;
}

export function getLoyaltyEmailsByCustomer(
  facilityId: number,
  customerId: number,
): LoyaltyEmail[] {
  return loyaltyEmailOutbox.filter(
    (e) => e.facilityId === facilityId && e.customerId === customerId,
  );
}
