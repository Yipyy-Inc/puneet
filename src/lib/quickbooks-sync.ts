/**
 * QuickBooks sync — mocked for now.
 * When backend is built, replace the mock functions with real API calls.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type QBSyncAction =
  | "invoice_created"
  | "payment_synced"
  | "deposit_synced"
  | "refund_synced"
  | "line_item_added"
  | "sync_failed"
  | "manual_resync";

export type QBSyncStatus = "not_synced" | "pending" | "synced" | "failed";

export interface QBSyncHistoryEntry {
  action: QBSyncAction;
  timestamp: string;
  amount?: number;
  quickbooksRefId?: string;
  error?: string;
  triggeredBy?: string;
}

export interface QuickBooksSync {
  status: QBSyncStatus;
  quickbooksInvoiceId?: string;
  quickbooksCustomerId?: string;
  lastSyncAt?: string;
  error?: string;
  history: QBSyncHistoryEntry[];
}

export interface QBInvoiceData {
  invoiceId: string;
  bookingId: number;
  clientName: string;
  clientEmail: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  depositAmount?: number;
  refundAmount?: number;
}

export interface QBSyncResult {
  success: boolean;
  syncedAt: string;
  quickbooksInvoiceId?: string;
  quickbooksPaymentId?: string;
  error?: string;
}

// ── Mock sync functions ──────────────────────────────────────────────────────

let _counter = 9000;
function nextId(prefix: string) {
  _counter += 1;
  return `${prefix}-${_counter}`;
}

/**
 * Mock: push a payment to QuickBooks.
 * Simulates a ~500ms network call, succeeds 95% of the time.
 */
export async function syncPaymentToQuickBooks(
  data: QBInvoiceData,
): Promise<QBSyncResult> {
  await new Promise((r) => setTimeout(r, 500));

  // Simulate occasional failure (5%)
  if (Math.random() < 0.05) {
    return {
      success: false,
      syncedAt: new Date().toISOString(),
      error: "QuickBooks API timeout — please retry",
    };
  }

  return {
    success: true,
    syncedAt: new Date().toISOString(),
    quickbooksInvoiceId: data.invoiceId.replace("INV-", "QB-INV-"),
    quickbooksPaymentId: nextId("QB-PMT"),
  };
}

/**
 * Mock: push a refund to QuickBooks.
 */
export async function syncRefundToQuickBooks(
  data: QBInvoiceData,
): Promise<QBSyncResult> {
  await new Promise((r) => setTimeout(r, 400));

  return {
    success: true,
    syncedAt: new Date().toISOString(),
    quickbooksInvoiceId: data.invoiceId.replace("INV-", "QB-INV-"),
    quickbooksPaymentId: nextId("QB-REF"),
  };
}

/**
 * Mock: manual resync — always succeeds.
 */
export async function resyncToQuickBooks(
  data: QBInvoiceData,
): Promise<QBSyncResult> {
  await new Promise((r) => setTimeout(r, 600));

  return {
    success: true,
    syncedAt: new Date().toISOString(),
    quickbooksInvoiceId: data.invoiceId.replace("INV-", "QB-INV-"),
    quickbooksPaymentId: nextId("QB-PMT"),
  };
}
