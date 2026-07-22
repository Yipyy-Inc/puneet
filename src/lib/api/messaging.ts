import { threadMeta } from "@/data/messaging";
import { facilityStaff } from "@/data/facility-staff";
import type { ThreadMeta } from "@/types/messaging";

// ============================================================================
// Section 8B — inbox scoping (assigned_only)
//
// When messages_view_inbox resolves to assigned_only, the inbox shows only the
// threads the viewer is a PARTICIPANT of — here, the threads assigned to them.
// Enforcement lives in this data helper (not cosmetic filtering).
//
// The mock threadMeta links a thread to a staff member by `assignedTo`, which
// may be an fs-* id or a display name — this resolves both. There is no
// /employee inbox route yet (spec Part 5 / the Inbox nav section land later),
// so this is the forward-compatible enforcement point: the same shared inbox
// component calls scopeThreadsToStaff(threads, useAssignedScope("messages_view_inbox")),
// admin passing no scope and seeing every thread.
// ============================================================================

const NAME_TO_ID = new Map<string, string>(
  facilityStaff.map((s) => [`${s.firstName} ${s.lastName}`, s.id]),
);

/** Resolve a thread's `assignedTo` (fs-* id or display name) to an fs-* id. */
function assigneeStaffId(assignedTo: string | undefined): string | undefined {
  if (!assignedTo) return undefined;
  return assignedTo.startsWith("fs-") ? assignedTo : NAME_TO_ID.get(assignedTo);
}

/** Thread ids the viewer participates in (assigned to them) — 8B. */
export function assignedThreadIds(staffId: string): Set<string> {
  const ids = new Set<string>();
  for (const t of threadMeta) {
    if (assigneeStaffId(t.assignedTo) === staffId) ids.add(t.threadId);
  }
  return ids;
}

/** Filter threads to those the viewer participates in (8B data-layer scope). */
export function scopeThreadsToStaff(
  list: ThreadMeta[],
  staffId: string,
): ThreadMeta[] {
  return list.filter((t) => assigneeStaffId(t.assignedTo) === staffId);
}

/** Is `thread` in `staffId`'s participant set? (URL-fetch 403 check.) */
export function isThreadAssignedTo(
  thread: ThreadMeta,
  staffId: string,
): boolean {
  return assigneeStaffId(thread.assignedTo) === staffId;
}
