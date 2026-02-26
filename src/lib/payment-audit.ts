/**
 * Payment Audit Logging
 * 
 * Functions for logging payment-related actions for audit trail
 */

export type AuditActionType = 
  | "payment_capture"
  | "refund"
  | "void"
  | "method_override"
  | "manual_card_entry"
  | "card_saved"
  | "card_deleted";

export interface PaymentAuditLog {
  id: string;
  facilityId: number;
  action: AuditActionType;
  transactionId?: string;
  transactionNumber?: string;
  amount?: number;
  paymentMethod?: string;
  originalPaymentMethod?: string;
  overrideMethod?: string;
  processorTransactionId?: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  customerId?: string;
  customerName?: string;
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory storage for audit logs (in production, this would be a database)
let auditLogs: PaymentAuditLog[] = [];

/**
 * Create an audit log entry
 */
export function logPaymentAction(
  action: AuditActionType,
  data: {
    facilityId: number;
    transactionId?: string;
    transactionNumber?: string;
    amount?: number;
    paymentMethod?: string;
    originalPaymentMethod?: string;
    overrideMethod?: string;
    processorTransactionId?: string;
    staffId: string;
    staffName: string;
    staffRole: string;
    customerId?: string;
    customerName?: string;
    reason?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }
): PaymentAuditLog {
  const log: PaymentAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    facilityId: data.facilityId,
    action,
    transactionId: data.transactionId,
    transactionNumber: data.transactionNumber,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    originalPaymentMethod: data.originalPaymentMethod,
    overrideMethod: data.overrideMethod,
    processorTransactionId: data.processorTransactionId,
    staffId: data.staffId,
    staffName: data.staffName,
    staffRole: data.staffRole,
    customerId: data.customerId,
    customerName: data.customerName,
    reason: data.reason,
    notes: data.notes,
    metadata: data.metadata,
    timestamp: new Date().toISOString(),
    ipAddress: typeof window !== "undefined" ? "client-ip" : undefined, // TODO: Get actual IP
    userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
  };

  auditLogs.push(log);
  
  // In production, this would save to a database
  // For now, we'll keep it in memory and optionally persist to localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("payment_audit_logs");
      const existing = stored ? JSON.parse(stored) : [];
      existing.push(log);
      // Keep only last 1000 logs in localStorage
      const recent = existing.slice(-1000);
      localStorage.setItem("payment_audit_logs", JSON.stringify(recent));
    } catch (error) {
      console.error("Failed to save audit log to localStorage", error);
    }
  }

  return log;
}

/**
 * Get audit logs for a facility
 */
export function getAuditLogs(
  facilityId: number,
  filters?: {
    action?: AuditActionType;
    startDate?: Date;
    endDate?: Date;
    staffId?: string;
    transactionId?: string;
  }
): PaymentAuditLog[] {
  let logs = auditLogs.filter((log) => log.facilityId === facilityId);

  // Load from localStorage if available
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("payment_audit_logs");
      if (stored) {
        const storedLogs = JSON.parse(stored) as PaymentAuditLog[];
        logs = [...logs, ...storedLogs].filter((log) => log.facilityId === facilityId);
        // Remove duplicates
        const uniqueLogs = Array.from(
          new Map(logs.map((log) => [log.id, log])).values()
        );
        logs = uniqueLogs;
      }
    } catch (error) {
      console.error("Failed to load audit logs from localStorage", error);
    }
  }

  // Apply filters
  if (filters) {
    if (filters.action) {
      logs = logs.filter((log) => log.action === filters.action);
    }
    if (filters.startDate) {
      logs = logs.filter(
        (log) => new Date(log.timestamp) >= filters.startDate!
      );
    }
    if (filters.endDate) {
      logs = logs.filter(
        (log) => new Date(log.timestamp) <= filters.endDate!
      );
    }
    if (filters.staffId) {
      logs = logs.filter((log) => log.staffId === filters.staffId);
    }
    if (filters.transactionId) {
      logs = logs.filter((log) => log.transactionId === filters.transactionId);
    }
  }

  // Sort by timestamp (newest first)
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get audit logs for a specific transaction
 */
export function getTransactionAuditLogs(transactionId: string): PaymentAuditLog[] {
  return getAuditLogs(0, { transactionId }).filter(
    (log) => log.transactionId === transactionId
  );
}
