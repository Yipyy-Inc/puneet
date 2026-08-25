import { z } from "zod";

import type { Database } from "@/types/database";
import {
  LOCATION_CAPACITY_KEYS,
  LOCATION_STATUSES,
  type FacilityLocation,
  type LocationAddress,
  type LocationCapacityKey,
  type LocationStatus,
} from "@/types/location";

// ============================================================================
// public.locations <-> FacilityLocation, in one place.
//
// Two routes read this table — the list and the single-branch write — and a
// mapping duplicated across them is a mapping that eventually disagrees with
// itself. Same reason `toAuditLogEntry` lives in one file.
// ============================================================================

/**
 * The columns, plus the count of bookings that name this branch.
 *
 * `bookings(count)` works because `bookings_location_id_fkey` exists; PostgREST
 * resolves the relationship by that constraint. It is a to-MANY embed, so it
 * comes back as an ARRAY of one `{count}` object — reading it as an object is
 * the mistake that made a report-card screen render empty for a week (see the
 * `!inner` entry in the debt map). `bookingCountOf` below does the unwrapping.
 */
export const LOCATION_SELECT =
  "id, name, short_code, address, email, phone, status, is_primary, timezone, capacity, color, created_at, updated_at, bookings(count)";

export interface LocationRow {
  id: string;
  name: string;
  short_code: string | null;
  address: unknown;
  email: string | null;
  phone: string | null;
  status: string;
  is_primary: boolean;
  timezone: string | null;
  capacity: unknown;
  color: string | null;
  created_at: string;
  updated_at: string;
  bookings?: { count: number }[] | null;
}

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

// Every key optional: an absent key is "no stated limit", which is not zero.
// `z.record` makes them all required, so the shape is spelled out — and the
// `satisfies` below fails the build if it ever drifts from
// LOCATION_CAPACITY_KEYS, which is what the UI iterates.
const headcount = z.number().int().min(0).max(100_000).optional();
const capacitySchema = z.object({
  daycare: headcount,
  boarding: headcount,
  grooming: headcount,
  training: headcount,
});

const _capacityKeysAgree =
  LOCATION_CAPACITY_KEYS satisfies readonly (keyof z.infer<
    typeof capacitySchema
  >)[];
void _capacityKeysAgree;

function addressOf(value: unknown): LocationAddress | null {
  const parsed = addressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function capacityOf(
  value: unknown,
): Partial<Record<LocationCapacityKey, number>> {
  const parsed = capacitySchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

/** See LOCATION_SELECT: a to-many embed is an array, even when it holds one row. */
function bookingCountOf(rows: { count: number }[] | null | undefined): number {
  return rows?.[0]?.count ?? 0;
}

export function rowToLocation(row: LocationRow): FacilityLocation {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    address: addressOf(row.address),
    email: row.email,
    phone: row.phone,
    // Safe cast: `locations_status_check` is a CHECK constraint, so a value
    // outside the union cannot exist to be read.
    status: row.status as LocationStatus,
    isPrimary: row.is_primary,
    timezone: row.timezone,
    capacity: capacityOf(row.capacity),
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingCount: bookingCountOf(row.bookings),
  };
}

// ── What a caller may send ────────────────────────────────────────────────
//
// `facility_id` is absent from both schemas ON PURPOSE. It comes from the
// session (`check:facility-from-session`), and a caller who could name it would
// be choosing which business to write into.

export const newLocationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  shortCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, digits and dashes only.")
    .optional(),
  address: addressSchema.optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(LOCATION_STATUSES).default("active"),
  isPrimary: z.boolean().default(false),
  timezone: z.string().trim().max(64).optional(),
  capacity: capacitySchema.optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "A hex colour, like #2563eb.")
    .optional(),
});

export type NewLocationInput = z.infer<typeof newLocationSchema>;

/**
 * A patch, where every field is optional but `undefined` and `null` differ.
 *
 * `.nullable()` on the optional fields is what lets a branch have its address
 * or short code CLEARED. Without it "remove the code I typed by mistake" has no
 * representation, and the screen would have to send an empty string that the
 * unique index then treats as a real value.
 */
export const locationPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  shortCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, digits and dashes only.")
    .nullable()
    .optional(),
  address: addressSchema.nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: z.enum(LOCATION_STATUSES).optional(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().trim().max(64).nullable().optional(),
  capacity: capacitySchema.optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "A hex colour, like #2563eb.")
    .nullable()
    .optional(),
});

export type LocationPatchInput = z.infer<typeof locationPatchSchema>;

type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];

export function newLocationToInsert(
  input: NewLocationInput,
  facilityId: string,
): LocationInsert {
  return {
    facility_id: facilityId,
    name: input.name,
    short_code: input.shortCode ?? null,
    address: input.address ?? null,
    // An empty email is no email. Storing "" would fail every later read that
    // tests for a value rather than for emptiness.
    email: input.email ? input.email : null,
    phone: input.phone || null,
    status: input.status,
    is_primary: input.isPrimary,
    timezone: input.timezone || null,
    capacity: input.capacity ?? {},
    color: input.color ?? null,
  };
}

/**
 * Only the keys the caller actually sent.
 *
 * A patch built by spreading every field would overwrite untouched columns with
 * `undefined`, and PostgREST would write nulls over them.
 */
export function locationPatchToUpdate(
  input: LocationPatchInput,
): LocationUpdate {
  const update: LocationUpdate = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.shortCode !== undefined) update.short_code = input.shortCode;
  if (input.address !== undefined) update.address = input.address;
  if (input.email !== undefined) update.email = input.email || null;
  if (input.phone !== undefined) update.phone = input.phone || null;
  if (input.status !== undefined) update.status = input.status;
  if (input.isPrimary !== undefined) update.is_primary = input.isPrimary;
  if (input.timezone !== undefined) update.timezone = input.timezone || null;
  if (input.capacity !== undefined) update.capacity = input.capacity;
  if (input.color !== undefined) update.color = input.color;
  return update;
}
