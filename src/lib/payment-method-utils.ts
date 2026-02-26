/**
 * Payment Method Utilities
 * 
 * Helper functions for formatting and displaying payment methods
 */

import { PaymentMethod, Transaction } from "@/data/retail";
import { Smartphone, Printer, CreditCard, Banknote, Wallet, Gift } from "lucide-react";

export interface PaymentMethodInfo {
  label: string;
  icon: typeof Smartphone;
  transactionId?: string;
  processor?: string;
}

/**
 * Get formatted payment method label with transaction ID
 */
export function getPaymentMethodLabel(
  transaction: Transaction
): PaymentMethodInfo {
  const method = transaction.paymentMethod;
  const payments = transaction.payments || [];
  
  // Handle split payments
  if (method === "split" && payments.length > 0) {
    const methods = payments.map(p => getSinglePaymentMethodLabel(p.method, transaction)).join(" + ");
    return {
      label: `Split: ${methods}`,
      icon: CreditCard,
    };
  }
  
  return getSinglePaymentMethodLabel(method, transaction);
}

/**
 * Get formatted label for a single payment method
 */
function getSinglePaymentMethodLabel(
  method: PaymentMethod,
  transaction: Transaction
): PaymentMethodInfo {
  // Check for Yipyy Pay (iPhone)
  if (transaction.yipyyPayTransactionId) {
    return {
      label: "Card (Pay with iPhone)",
      icon: Smartphone,
      transactionId: transaction.yipyyPayTransactionId,
      processor: "Yipyy Pay",
    };
  }
  
  // Check for Clover Terminal
  if (transaction.cloverTransactionId) {
    return {
      label: "Card (Clover Terminal)",
      icon: Printer,
      transactionId: transaction.cloverTransactionId,
      processor: "Clover / Fiserv",
    };
  }
  
  // Check for Fiserv (online/saved card)
  if (transaction.fiservTransactionId && !transaction.yipyyPayTransactionId && !transaction.cloverTransactionId) {
    return {
      label: "Online Card (Saved)",
      icon: CreditCard,
      transactionId: transaction.fiservTransactionId,
      processor: "Fiserv",
    };
  }
  
  // Standard payment methods
  switch (method) {
    case "cash":
      return {
        label: "Cash",
        icon: Banknote,
      };
    case "store_credit":
      return {
        label: "Store Credit",
        icon: Wallet,
      };
    case "gift_card":
      return {
        label: "Gift Card",
        icon: Gift,
      };
    case "credit":
    case "debit":
      return {
        label: method === "credit" ? "Credit Card" : "Debit Card",
        icon: CreditCard,
        transactionId: transaction.fiservTransactionId,
        processor: "Fiserv",
      };
    default:
      return {
        label: method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        icon: CreditCard,
      };
  }
}

/**
 * Format transaction timestamp
 */
export function formatTransactionTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get location name from location ID
 */
export function getLocationName(locationId?: string): string {
  if (!locationId) return "Main Location";
  
  // TODO: Get from actual location data
  // For now, return a default
  return locationId === "loc-001" ? "Main Facility - Downtown" : 
         locationId === "loc-002" ? "Branch - North Beach" : 
         locationId || "Main Location";
}
