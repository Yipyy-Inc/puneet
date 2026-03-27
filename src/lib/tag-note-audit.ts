/**
 * Tag & Notes audit log.
 * Every tag/note operation is logged for compliance:
 * - Tag CRUD (created, updated, deleted)
 * - Tag assignment/unassignment
 * - Note CRUD (created, updated, deleted)
 * - Note pin/unpin
 * - Visibility changes
 */

import type { FacilityRole } from "@/lib/role-utils";

// Types re-exported from @/types/tags (single source of truth)
export type {
  TagNoteAuditAction,
  TagNoteAuditEntry,
  TagNoteAuditFilters,
} from "@/types/tags";
import type { TagNoteAuditEntry } from "@/types/tags";

// ========================================
// IN-MEMORY LOG
// ========================================

const auditLog: TagNoteAuditEntry[] = [];

function nextId(): string {
  return `tna-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function log(
  entry: Omit<TagNoteAuditEntry, "id" | "timestamp">,
): TagNoteAuditEntry {
  const full: TagNoteAuditEntry = {
    ...entry,
    id: nextId(),
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

// ========================================
// TAG CONVENIENCE LOGGERS
// ========================================

export function logTagCreated(params: {
  facilityId: number;
  tagId: string;
  tagName: string;
  tagType: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "tag_created",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    metadata: { tagName: params.tagName, tagType: params.tagType },
  });
}

export function logTagUpdated(params: {
  facilityId: number;
  tagId: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
  changes: { field: string; oldValue: string; newValue: string }[];
}): TagNoteAuditEntry {
  return log({
    action: "tag_updated",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    changes: params.changes,
  });
}

export function logTagDeleted(params: {
  facilityId: number;
  tagId: string;
  tagName: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "tag_deleted",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    metadata: { tagName: params.tagName },
  });
}

export function logTagAssigned(params: {
  facilityId: number;
  tagId: string;
  targetType: "pet" | "customer" | "booking";
  targetId: number;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "tag_assigned",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    targetType: params.targetType,
    targetId: params.targetId,
  });
}

export function logTagUnassigned(params: {
  facilityId: number;
  tagId: string;
  targetType: "pet" | "customer" | "booking";
  targetId: number;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "tag_unassigned",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    targetType: params.targetType,
    targetId: params.targetId,
  });
}

export function logTagVisibilityChanged(params: {
  facilityId: number;
  tagId: string;
  oldVisibility: string;
  newVisibility: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "tag_visibility_changed",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "tag",
    entityId: params.tagId,
    changes: [
      {
        field: "visibility",
        oldValue: params.oldVisibility,
        newValue: params.newVisibility,
      },
    ],
  });
}

// ========================================
// NOTE CONVENIENCE LOGGERS
// ========================================

export function logNoteCreated(params: {
  facilityId: number;
  noteId: string;
  category: string;
  targetId: number;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "note_created",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "note",
    entityId: params.noteId,
    targetType: params.category as TagNoteAuditEntry["targetType"],
    targetId: params.targetId,
  });
}

export function logNoteUpdated(params: {
  facilityId: number;
  noteId: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
  changes: { field: string; oldValue: string; newValue: string }[];
}): TagNoteAuditEntry {
  return log({
    action: "note_updated",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "note",
    entityId: params.noteId,
    changes: params.changes,
  });
}

export function logNoteDeleted(params: {
  facilityId: number;
  noteId: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "note_deleted",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "note",
    entityId: params.noteId,
  });
}

export function logNotePinToggled(params: {
  facilityId: number;
  noteId: string;
  pinned: boolean;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: params.pinned ? "note_pinned" : "note_unpinned",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "note",
    entityId: params.noteId,
  });
}

export function logNoteVisibilityChanged(params: {
  facilityId: number;
  noteId: string;
  oldVisibility: string;
  newVisibility: string;
  actorId: number;
  actorName: string;
  actorRole?: FacilityRole;
}): TagNoteAuditEntry {
  return log({
    action: "note_visibility_changed",
    facilityId: params.facilityId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorType: "staff",
    actorRole: params.actorRole,
    entityType: "note",
    entityId: params.noteId,
    changes: [
      {
        field: "visibility",
        oldValue: params.oldVisibility,
        newValue: params.newVisibility,
      },
    ],
  });
}

// ========================================
// QUERY
// ========================================

import type { TagNoteAuditFilters } from "@/types/tags";

export function getTagNoteAuditLog(
  filters?: TagNoteAuditFilters,
): TagNoteAuditEntry[] {
  let list = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  if (filters?.facilityId != null)
    list = list.filter((e) => e.facilityId === filters.facilityId);
  if (filters?.entityType)
    list = list.filter((e) => e.entityType === filters.entityType);
  if (filters?.entityId)
    list = list.filter((e) => e.entityId === filters.entityId);
  if (filters?.action) list = list.filter((e) => e.action === filters.action);
  if (filters?.targetType)
    list = list.filter((e) => e.targetType === filters.targetType);
  if (filters?.targetId != null)
    list = list.filter((e) => e.targetId === filters.targetId);
  if (filters?.from) list = list.filter((e) => e.timestamp >= filters.from!);
  if (filters?.to) list = list.filter((e) => e.timestamp <= filters.to!);
  return list;
}
