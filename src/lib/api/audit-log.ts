// Audit Trail data access — WRITE-ONCE, APPEND-ONLY, IMMUTABLE.
//
// The audit trail is read-only for every role: existing entries can never be
// edited or deleted. This module is the single sanctioned access path and
// intentionally exposes ONLY a read (snapshot) and an append. There is no
// update or delete function, by design.
//
// This is the application-layer mirror of the database-level guarantee in
// supabase/migrations/20260625000000_audit_log_append_only.sql, where a trigger
// blocks UPDATE/DELETE/TRUNCATE on public.audit_log for every role.

import { auditLogs as seedAuditLogs } from "@/data/system-administration";

// The data file does not export its AuditLog interface, so derive the element
// type from the (frozen) seed array.
export type AuditLogEntry = (typeof seedAuditLogs)[number];

// Runtime-appended entries — the ONLY permitted write. Each is frozen on
// insert; nothing ever updates or removes an entry from this buffer.
const appended: AuditLogEntry[] = [];

/**
 * Read an immutable snapshot of the audit trail. Returns a fresh mutable COPY
 * so callers can sort/filter freely without touching the frozen source — the
 * underlying entries themselves are frozen and can never be changed.
 */
export function getAuditLogs(): AuditLogEntry[] {
  return [...seedAuditLogs, ...appended];
}

/**
 * Append a new audit entry. This is the ONLY mutation the audit trail permits.
 * The entry is deep-frozen so it, too, becomes immutable once recorded.
 */
export function appendAuditLog(entry: AuditLogEntry): AuditLogEntry {
  const frozen = Object.freeze({
    ...entry,
    changes: Object.freeze(entry.changes.map((c) => Object.freeze({ ...c }))),
  }) as AuditLogEntry;
  appended.push(frozen);
  return frozen;
}

// TanStack Query factory (read-only). No mutation queries exist for the audit
// trail — appending is a side-effect of audited actions, never a user edit.
export const auditLogQueries = {
  all: () => ({
    queryKey: ["audit-logs"] as const,
    queryFn: async (): Promise<AuditLogEntry[]> => getAuditLogs(),
  }),
};
