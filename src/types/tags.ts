/**
 * Tag & Notes domain types.
 * Single source of truth — data files re-export from here.
 */

import { z } from "zod";

// ========================================
// TAG ENUMS & SCHEMAS
// ========================================

export const tagTypeEnum = z.enum(["pet", "customer", "booking"]);
export type TagType = z.infer<typeof tagTypeEnum>;

export const tagPriorityEnum = z.enum(["informational", "warning", "critical"]);
export type TagPriority = z.infer<typeof tagPriorityEnum>;

export const tagVisibilityEnum = z.enum(["internal", "client_visible"]);
export type TagVisibility = z.infer<typeof tagVisibilityEnum>;

export const tagScopeEnum = z.enum(["global", "location_specific"]);
export type TagScope = z.infer<typeof tagScopeEnum>;

export const tagSchema = z.object({
  id: z.string(),
  type: tagTypeEnum,
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  description: z.string().optional(),
  priority: tagPriorityEnum,
  visibility: tagVisibilityEnum,
  scope: tagScopeEnum,
  locationIds: z.array(z.string()).optional(),
  facilityId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
  createdById: z.number(),
  updatedAt: z.string().optional(),
});
export type Tag = z.infer<typeof tagSchema>;

export const tagAssignmentSchema = z.object({
  id: z.string(),
  tagId: z.string(),
  entityType: tagTypeEnum,
  entityId: z.number(),
  assignedAt: z.string(),
  assignedBy: z.string(),
  assignedById: z.number(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});
export type TagAssignment = z.infer<typeof tagAssignmentSchema>;

// ========================================
// NOTE ENUMS & SCHEMAS
// ========================================

export const noteCategoryEnum = z.enum([
  "pet",
  "customer",
  "booking",
  "incident",
  "internal_staff",
]);
export type NoteCategory = z.infer<typeof noteCategoryEnum>;

export const petNoteSubTypeEnum = z.enum([
  "general",
  "behavior",
  "medical",
  "feeding",
]);
export type PetNoteSubType = z.infer<typeof petNoteSubTypeEnum>;

export const noteVisibilityEnum = z.enum(["internal", "shared_with_customer"]);
export type NoteVisibility = z.infer<typeof noteVisibilityEnum>;

export const noteEditSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  previousContent: z.string(),
  newContent: z.string(),
  editedAt: z.string(),
  editedBy: z.string(),
  editedById: z.number(),
});
export type NoteEdit = z.infer<typeof noteEditSchema>;

export const noteSchema = z.object({
  id: z.string(),
  category: noteCategoryEnum,
  subType: petNoteSubTypeEnum.optional(),
  entityId: z.number(),
  facilityId: z.number(),
  content: z.string(),
  visibility: noteVisibilityEnum,
  isPinned: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
  createdById: z.number(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedById: z.number().optional(),
  editHistory: z.array(noteEditSchema),
});
export type Note = z.infer<typeof noteSchema>;

// ========================================
// SETTINGS & AUTOMATION
// ========================================

// NoteRolePermissions uses FacilityRole from role-utils — keep as interface
export interface NoteRolePermissions {
  view: string[];
  create: string[];
  edit: string[];
  delete: string[];
}

export interface TagNoteSettings {
  facilityId: number;
  tagSettings: {
    petTagsEnabled: boolean;
    customerTagsEnabled: boolean;
    bookingTagsEnabled: boolean;
    defaultVisibility: TagVisibility;
    defaultScope: TagScope;
  };
  noteSettings: {
    rolePermissions: Record<NoteCategory, NoteRolePermissions>;
    defaultVisibility: NoteVisibility;
  };
  automationRules: AutomationRule[];
}

export const automationRuleSchema = z.object({
  id: z.string(),
  tagId: z.string(),
  triggerType: z.enum(["on_assign", "on_remove"]),
  actionType: z.enum(["add_task", "send_notification", "add_note"]),
  actionConfig: z.record(z.string(), z.unknown()),
  isActive: z.boolean(),
});
export type AutomationRule = z.infer<typeof automationRuleSchema>;

// ========================================
// LEGACY TAG TYPES (backward compat)
// ========================================

export interface LegacyPetTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface LegacyPetTagAssignment {
  petId: number;
  tagId: string;
  assignedAt: string;
  assignedBy: string;
}

// ========================================
// AUDIT TYPES
// ========================================

export const tagNoteAuditActionEnum = z.enum([
  "tag_created",
  "tag_updated",
  "tag_deleted",
  "tag_assigned",
  "tag_unassigned",
  "note_created",
  "note_updated",
  "note_deleted",
  "note_pinned",
  "note_unpinned",
  "note_visibility_changed",
  "tag_visibility_changed",
]);
export type TagNoteAuditAction = z.infer<typeof tagNoteAuditActionEnum>;

export interface TagNoteAuditEntry {
  id: string;
  timestamp: string;
  action: TagNoteAuditAction;
  facilityId: number;
  actorId: number | string;
  actorName: string;
  actorType: "staff" | "system";
  actorRole?: string;
  entityType: "tag" | "note";
  entityId: string;
  targetType?: "pet" | "customer" | "booking" | "incident" | "internal_staff";
  targetId?: number;
  changes?: { field: string; oldValue: string; newValue: string }[];
  metadata?: Record<string, unknown>;
}

export interface TagNoteAuditFilters {
  facilityId?: number;
  entityType?: "tag" | "note";
  entityId?: string;
  action?: TagNoteAuditAction;
  targetType?: string;
  targetId?: number;
  from?: string;
  to?: string;
}
