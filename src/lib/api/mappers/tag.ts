import { z } from "zod";

import type { TablesInsert, TablesUpdate } from "@/types/database";

import type { Tag, TagAssignment, TagType } from "@/types/tags";
import {
  tagPriorityEnum,
  tagScopeEnum,
  tagTypeEnum,
  tagVisibilityEnum,
} from "@/types/tags";

// ============================================================================
// public.facility_tags / public.facility_tag_assignments <-> the app's Tag.
//
// ── THE ONE TRANSLATION THAT MATTERS ──────────────────────────────────────
//
// `facility_tag_assignments.entity_id` is a uuid. Every screen that renders a
// tag holds a NUMBER — `pet.id`, `client.id`, `booking.id` — because the
// mock-era types identify a pet by its `ref`, and 20 call sites pass one.
//
// So the route resolves ref <-> uuid and the components never learn the
// difference. Doing it the other way round — teaching 20 call sites about
// uuids — is the same change spread over 20 files, and `useAssignedClientRefs`
// already records what happens when the two id spaces meet by accident: a
// scoped viewer saw zero clients because nothing ever matched.
//
// The ref is a LABEL here, never a scope. Nothing is authorised by it: the
// route resolves it through a table RLS has already filtered, so naming
// somebody else's pet resolves to nothing rather than to their tags.
// ============================================================================

export const TAG_SELECT =
  "id, facility_id, entity_type, name, color, icon, description, priority, visibility, scope, location_ids, is_active, created_by, created_at, updated_at";

export const TAG_ASSIGNMENT_SELECT =
  "id, tag_id, entity_type, entity_id, facility_id, assigned_by, assigned_at, expires_at, notes";

export interface TagRow {
  id: string;
  facility_id: string;
  entity_type: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  priority: string;
  visibility: string;
  scope: string;
  location_ids: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagAssignmentRow {
  id: string;
  tag_id: string;
  entity_type: string;
  entity_id: string;
  facility_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  notes: string | null;
}

/**
 * The glyph a tag falls back to.
 *
 * `facility_tags.icon` is nullable and `resolveIcon` needs a name. `Tag` is on
 * the §5b1 map for exactly this meaning, so a tag with no chosen glyph reads as
 * a tag rather than as a missing image.
 */
const DEFAULT_TAG_ICON = "Tag";

export function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    type: tagTypeEnum.catch("pet").parse(row.entity_type),
    name: row.name,
    color: row.color,
    icon: row.icon ?? DEFAULT_TAG_ICON,
    description: row.description ?? undefined,
    priority: tagPriorityEnum.catch("informational").parse(row.priority),
    visibility: tagVisibilityEnum.catch("internal").parse(row.visibility),
    scope: tagScopeEnum.catch("global").parse(row.scope),
    locationIds: row.location_ids ?? undefined,
    facilityId: row.facility_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at,
  };
}

/**
 * An assignment row, with its target's uuid already translated to the ref the
 * screens hold. A row whose target could not be resolved is DROPPED by the
 * caller rather than given a ref of 0 — see the route.
 */
export function rowToTagAssignment(
  row: TagAssignmentRow,
  entityRef: number,
): TagAssignment {
  return {
    id: row.id,
    tagId: row.tag_id,
    entityType: tagTypeEnum.catch("pet").parse(row.entity_type),
    entityId: entityRef,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

/** Which table a tag type's `entity_id` points at. */
export const TAG_ENTITY_TABLE: Record<
  TagType,
  "pets" | "clients" | "bookings"
> = {
  pet: "pets",
  customer: "clients",
  booking: "bookings",
};

const hexColor = /^#[0-9a-fA-F]{6}$/;

/**
 * What a person may set on a tag.
 *
 * `facilityId`, `createdBy` and the timestamps are stamped by the route and the
 * database — a request that names them is naming something it does not decide.
 */
export const tagWriteSchema = z.object({
  type: tagTypeEnum,
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(hexColor, "A colour is a six-digit hex value."),
  icon: z.string().trim().min(1).max(60),
  description: z.string().trim().max(280).optional(),
  priority: tagPriorityEnum,
  visibility: tagVisibilityEnum,
  scope: tagScopeEnum,
  locationIds: z.array(z.string().uuid()).default([]),
});
export type TagWrite = z.infer<typeof tagWriteSchema>;

/** An edit may change everything except which kind of thing the tag is for. */
export const tagPatchSchema = tagWriteSchema
  .omit({ type: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });
export type TagPatch = z.infer<typeof tagPatchSchema>;

export const tagAssignmentWriteSchema = z.object({
  tagId: z.string().uuid(),
  entityType: tagTypeEnum,
  /** The target's `ref` — what the screens hold. Resolved to a uuid by the route. */
  entityRef: z.number().int().positive(),
});
export type TagAssignmentWrite = z.infer<typeof tagAssignmentWriteSchema>;

export function tagWriteToInsert(
  write: TagWrite,
  facilityId: string,
  profileId: string,
): TablesInsert<"facility_tags"> {
  return {
    facility_id: facilityId,
    entity_type: write.type,
    name: write.name,
    color: write.color,
    icon: write.icon,
    description: write.description ?? null,
    priority: write.priority,
    visibility: write.visibility,
    scope: write.scope,
    location_ids: write.scope === "location_specific" ? write.locationIds : [],
    created_by: profileId,
  };
}

/**
 * An assignment insert, minus the facility.
 *
 * `facility_id` is NOT NULL with no default, so the generated type demands it —
 * but nothing here is allowed to supply it. The
 * `facility_tag_assignments_set_facility` trigger copies it from the tag before
 * the row lands, which is the whole reason an assignment cannot be pointed at
 * one facility's tag and another's pet. Stamping it from the session here would
 * be a second opinion the trigger would then overwrite.
 */
export type TagAssignmentInsert = Omit<
  TablesInsert<"facility_tag_assignments">,
  "facility_id"
>;

export function tagPatchToUpdate(
  patch: TagPatch,
): TablesUpdate<"facility_tags"> {
  const update: TablesUpdate<"facility_tags"> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.icon !== undefined) update.icon = patch.icon;
  if (patch.description !== undefined)
    update.description = patch.description || null;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.scope !== undefined) {
    update.scope = patch.scope;
    if (patch.scope === "global") update.location_ids = [];
  }
  if (patch.locationIds !== undefined && patch.scope !== "global")
    update.location_ids = patch.locationIds;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  return update;
}
