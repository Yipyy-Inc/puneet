/**
 * Payment Security Utilities
 * 
 * Functions for masking card details and security checks
 */

/**
 * Mask card number - show only last 4 digits
 */
export function maskCardNumber(cardNumber: string | undefined | null): string {
  if (!cardNumber) return "****";
  
  const cleaned = cardNumber.replace(/\s/g, "");
  if (cleaned.length < 4) return "****";
  
  const last4 = cleaned.slice(-4);
  return `****${last4}`;
}

/**
 * Format card number for display (masked)
 */
export function formatCardNumberForDisplay(cardNumber: string | undefined | null): string {
  if (!cardNumber) return "**** **** **** ****";
  
  const cleaned = cardNumber.replace(/\s/g, "");
  if (cleaned.length < 4) return "**** **** **** ****";
  
  const last4 = cleaned.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Check if user can see full card details (admin/owner only)
 */
export function canViewFullCardDetails(role: string): boolean {
  return role === "owner" || role === "manager";
}
