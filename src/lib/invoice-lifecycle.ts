/**
 * Invoice lifecycle management.
 *
 * Lifecycle: estimate → open → closed
 * Side paths: any → void (cancellation), closed → refunded
 */

import type { Invoice } from "@/types/booking";

// Extended status includes void/refunded for lifecycle management
type InvoiceLifecycleStatus = "estimate" | "open" | "closed" | "void" | "refunded";

// ============================================================================
// Deposit Rules
// ============================================================================

export interface DepositRule {
  enabled: boolean;
  type: "fixed" | "percentage";
  value: number;
  chargeAt: "booking_creation" | "before_checkin" | "manual";
  requiredBeforeCheckin: boolean;
}

export function calculateDepositAmount(
  rule: DepositRule,
  invoiceTotal: number,
): number {
  if (!rule.enabled) return 0;
  if (rule.type === "fixed") return rule.value;
  return Math.round(invoiceTotal * (rule.value / 100) * 100) / 100;
}

// ============================================================================
// Status transitions
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  estimate: ["open", "void"],
  open: ["closed", "void"],
  closed: ["refunded"],
  void: [],
  refunded: [],
};

export function canTransition(
  from: InvoiceLifecycleStatus,
  to: InvoiceLifecycleStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionInvoice(
  invoice: Invoice,
  to: InvoiceLifecycleStatus,
): Invoice {
  if (!canTransition(invoice.status, to)) {
    throw new Error(
      `Cannot transition invoice from ${invoice.status} to ${to}`,
    );
  }
  return { ...invoice, status: to as Invoice["status"] };
}

// ============================================================================
// Edit permissions per status
// ============================================================================

export interface InvoiceEditPermissions {
  items: boolean;
  prices: boolean;
  staff: boolean;
  discounts: boolean;
  tips: boolean;
  addItems: boolean;
  removeItems: boolean;
  addExtraCharge: boolean;
  refund: boolean;
}

export function getEditPermissions(
  status: InvoiceLifecycleStatus | string,
): InvoiceEditPermissions {
  switch (status) {
    case "estimate":
      return {
        items: true,
        prices: true,
        staff: true,
        discounts: true,
        tips: false,
        addItems: true,
        removeItems: true,
        addExtraCharge: false,
        refund: false,
      };
    case "open":
      return {
        items: true,
        prices: true,
        staff: true,
        discounts: true,
        tips: true,
        addItems: true,
        removeItems: true,
        addExtraCharge: false,
        refund: false,
      };
    case "closed":
      return {
        items: false,
        prices: false,
        staff: true,
        discounts: false,
        tips: true,
        addItems: false,
        removeItems: false,
        addExtraCharge: true,
        refund: true,
      };
    case "void":
    case "refunded":
    default:
      return {
        items: false,
        prices: false,
        staff: false,
        discounts: false,
        tips: false,
        addItems: false,
        removeItems: false,
        addExtraCharge: false,
        refund: false,
      };
  }
}

// ============================================================================
// Payment methods
// ============================================================================

export type PaymentMethod =
  | "card_on_file"
  | "cash"
  | "terminal"
  | "e_transfer"
  | "store_credit"
  | "custom";

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: string;
}[] = [
  { value: "card_on_file", label: "Card on File", icon: "CreditCard" },
  { value: "cash", label: "Cash", icon: "Banknote" },
  { value: "terminal", label: "Terminal", icon: "Smartphone" },
  { value: "e_transfer", label: "E-Transfer", icon: "ArrowLeftRight" },
  { value: "store_credit", label: "Store Credit", icon: "Wallet" },
  { value: "custom", label: "Custom", icon: "MoreHorizontal" },
];

// ============================================================================
// Tip split calculation
// ============================================================================

export interface TipSplitEntry {
  staffName: string;
  serviceValue: number;
  tipAmount: number;
  percentage: number;
}

export function calculateTipSplit(
  method: "by_service" | "equal" | "custom_percent" | "custom_amount",
  totalTip: number,
  staffServices: { staffName: string; serviceValue: number }[],
  customValues?: Record<string, number>,
): TipSplitEntry[] {
  if (staffServices.length === 0) return [];

  switch (method) {
    case "by_service": {
      const totalValue = staffServices.reduce(
        (s, e) => s + e.serviceValue,
        0,
      );
      return staffServices.map((s) => {
        const pct = totalValue > 0 ? s.serviceValue / totalValue : 0;
        return {
          staffName: s.staffName,
          serviceValue: s.serviceValue,
          tipAmount: Math.round(totalTip * pct * 100) / 100,
          percentage: Math.round(pct * 1000) / 10,
        };
      });
    }
    case "equal": {
      const each =
        Math.round((totalTip / staffServices.length) * 100) / 100;
      return staffServices.map((s) => ({
        staffName: s.staffName,
        serviceValue: s.serviceValue,
        tipAmount: each,
        percentage: Math.round((1 / staffServices.length) * 1000) / 10,
      }));
    }
    case "custom_percent":
    case "custom_amount": {
      return staffServices.map((s) => {
        const val = customValues?.[s.staffName] ?? 0;
        const amt =
          method === "custom_percent"
            ? Math.round(totalTip * (val / 100) * 100) / 100
            : val;
        return {
          staffName: s.staffName,
          serviceValue: s.serviceValue,
          tipAmount: amt,
          percentage:
            totalTip > 0 ? Math.round((amt / totalTip) * 1000) / 10 : 0,
        };
      });
    }
  }
}

// ============================================================================
// Cash change calculation
// ============================================================================

export function calculateChange(
  amountDue: number,
  amountCollected: number,
): { change: number; isOverpayment: boolean } {
  const change = Math.round((amountCollected - amountDue) * 100) / 100;
  return { change: Math.max(0, change), isOverpayment: change > 0 };
}
