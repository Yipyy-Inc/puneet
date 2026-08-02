/**
 * Maps the mock data in src/data onto rows for clients / pets / bookings.
 *
 * Shared by both seeding paths so they cannot drift:
 *   generate-operational-seed.ts  -> a .sql file, for review and portability
 *   apply-operational-seed.ts     -> applies it directly via the API
 *
 * ── Two defects in the source data, resolved deliberately ──────────────────
 *
 * 1. DUPLICATE PET IDS. Three pets share ids with others (50: Daisy and Luna;
 *    51: Max, Mochi and Coco). In the mock world `pets.find(p => p.id === 51)`
 *    already returns whichever comes first, so those lookups are silently
 *    wrong today. `ref` is unique, so the database refuses to represent the
 *    ambiguity at all.
 *
 *    Resolution: a booking resolves its pet through (clientId, petId), not
 *    petId alone — a booking knows whose pet it is, which makes the reference
 *    unambiguous. The first owner by client id keeps the original ref; later
 *    duplicates get fresh refs above PET_REF_OFFSET. Every remap is reported.
 *
 * 2. BOOKINGS THAT CROSS TENANTS. Every booking says facilityId 11, but their
 *    clients belong to three different mock facilities. That cannot be
 *    represented once clients are facility-scoped rows.
 *
 *    Resolution: seed the demo tenant only. A client is included if it belongs
 *    to the demo facility OR has a booking there; the strays are pulled in and
 *    reported, because their bookings are the stronger signal about which
 *    business they actually deal with.
 */

import { clients } from "../../src/data/clients";
import { bookings } from "../../src/data/bookings";
import { facilityStaff } from "../../src/data/facility-staff";
import type { Booking } from "../../src/types/booking";
import type { Client } from "../../src/types/client";
import type { Pet } from "../../src/types/pet";
import type { StaffProfile } from "../../src/types/facility-staff";
import { instantFromWallClock } from "../../src/lib/time/facility-time";

export const DEMO_FACILITY_LEGACY_ID = "11";
const DEMO_FACILITY_NAME = "Example Pet Care Facility";
/** Fresh refs for de-duplicated pets start here, clear of every mock id. */
const PET_REF_OFFSET = 9000;

/**
 * Deterministic uuids, so both seeding paths agree and re-runs upsert rather
 * than duplicate.
 *
 * The per-table prefix must be a HEX digit — the obvious 'p' for pets is not,
 * and Postgres rejects the whole value ("invalid input syntax for type uuid").
 * Clients slipped through only because 'c' happens to be hex. 'a' is taken by
 * the org/facility/location fixtures in dev-accounts.sql.
 */
const TABLE_PREFIX = { client: "c", pet: "d", booking: "b" } as const;

export const uuidFor = (table: keyof typeof TABLE_PREFIX, ref: number) =>
  `${TABLE_PREFIX[table]}0000000-0000-4000-8000-${ref.toString(16).padStart(12, "0")}`;

/** Drop the keys hoisted into columns; the rest becomes `details`. */
function omit<T extends object>(
  source: T,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    if (!keys.includes(k) && v !== undefined) out[k] = v;
  }
  return out;
}

export type ClientRow = Record<string, unknown>;
export type PetRow = Record<string, unknown>;
export type BookingRow = Record<string, unknown>;
export type StaffRow = Record<string, unknown>;

export type SeedRows = {
  clients: ClientRow[];
  pets: PetRow[];
  bookings: BookingRow[];
  bookingPets: { booking_id: string; pet_id: string }[];
  staff: StaffRow[];
  pulledIn: Client[];
  remaps: string[];
  skippedBookings: number;
};

export function buildSeedRows(opts: {
  facilityId: string;
  locationId: string | null;
  /** The facility's IANA zone — mock times are its wall clock, not UTC. */
  timeZone: string;
}): SeedRows {
  const clientsById = new Map<number, Client>(clients.map((c) => [c.id, c]));
  const bookingClientIds = new Set(bookings.map((b) => b.clientId));

  const included = clients.filter(
    (c) => c.facility === DEMO_FACILITY_NAME || bookingClientIds.has(c.id),
  );
  const pulledIn = included.filter((c) => c.facility !== DEMO_FACILITY_NAME);

  // ── Pet refs, de-duplicated ───────────────────────────────────────────────
  type SeededPet = { pet: Pet; owner: Client; ref: number };
  const petsByClient = new Map<number, SeededPet[]>();
  const usedRefs = new Set<number>();
  const remaps: string[] = [];
  let nextSpareRef = PET_REF_OFFSET;

  for (const owner of [...included].sort((a, b) => a.id - b.id)) {
    const list: SeededPet[] = [];
    for (const pet of owner.pets ?? []) {
      let ref = pet.id;
      if (usedRefs.has(ref)) {
        ref = ++nextSpareRef;
        remaps.push(
          `pet ${pet.id} "${pet.name}" (owner ${owner.id} ${owner.name}) -> ref ${ref}`,
        );
      }
      usedRefs.add(ref);
      list.push({ pet, owner, ref });
    }
    petsByClient.set(owner.id, list);
  }

  /** A booking's pets resolve through its OWNER, which removes the ambiguity. */
  function resolvePetRefs(booking: Booking): number[] {
    const wanted = Array.isArray(booking.petId)
      ? booking.petId
      : [booking.petId];
    const owned = petsByClient.get(booking.clientId) ?? [];
    return wanted
      .filter((id): id is number => id != null)
      .map((id) => owned.find((p) => p.pet.id === id)?.ref)
      .filter((ref): ref is number => ref !== undefined);
  }

  // ── Rows ──────────────────────────────────────────────────────────────────
  const clientRows: ClientRow[] = included.map((c) => ({
    id: uuidFor("client", c.id),
    ref: c.id,
    facility_id: opts.facilityId,
    name: c.name,
    email: c.email,
    phone: c.phone ?? null,
    status: c.status,
    preferred_language: c.preferredLanguage ?? null,
    image_url: c.imageUrl ?? null,
    address: c.address ?? null,
    is_blocked: c.isBlocked ?? false,
    blocked_at: c.blockedAt ?? null,
    blocked_reason: c.blockedReason ?? null,
    last_visit_date: c.lastVisitDate ?? null,
    outstanding_balance: c.outstandingBalance ?? 0,
    no_show_count: c.noShowCount ?? 0,
    details: omit(c, [
      "id",
      "name",
      "email",
      "phone",
      "status",
      "facility",
      "imageUrl",
      "preferredLanguage",
      "address",
      "pets",
      "isBlocked",
      "blockedAt",
      "blockedReason",
      "lastVisitDate",
      "outstandingBalance",
      "noShowCount",
    ]),
  }));

  const petRows: PetRow[] = [...petsByClient.values()]
    .flat()
    .map(({ pet, owner, ref }) => ({
      id: uuidFor("pet", ref),
      ref,
      client_id: uuidFor("client", owner.id),
      // Overwritten by the pets_set_facility trigger; sent so the NOT NULL
      // column is satisfied on insert.
      facility_id: opts.facilityId,
      name: pet.name,
      species: pet.type || "dog",
      breed: pet.breed ?? null,
      age_years: pet.age ?? null,
      date_of_birth: pet.dateOfBirth ?? null,
      weight: pet.weight ?? null,
      color: pet.color ?? null,
      microchip: pet.microchip ?? null,
      allergies: pet.allergies ?? null,
      special_needs: pet.specialNeeds ?? null,
      sex: pet.sex ?? null,
      spayed_neutered: pet.spayedNeutered ?? null,
      coat_type: pet.coatType ?? null,
      energy_level: pet.energyLevel ?? null,
      status: pet.petStatus ?? "active",
      image_url: pet.imageUrl ?? null,
      details: omit(pet, [
        "id",
        "name",
        "type",
        "breed",
        "age",
        "dateOfBirth",
        "weight",
        "color",
        "microchip",
        "allergies",
        "specialNeeds",
        "sex",
        "spayedNeutered",
        "coatType",
        "energyLevel",
        "petStatus",
        "imageUrl",
      ]),
    }));

  // ── Staff ─────────────────────────────────────────────────────────────────
  // Deterministic uuid from the mock's string id, so both seed paths agree and
  // bookings can point at a staff row without a lookup.
  const staffUuid = (legacyId: string) => {
    let hash = 0;
    for (const ch of legacyId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return `f0000000-0000-4000-8000-${hash.toString(16).padStart(12, "0")}`;
  };

  const staffRows: StaffRow[] = facilityStaff.map((p: StaffProfile) => ({
    id: staffUuid(p.id),
    facility_id: opts.facilityId,
    legacy_id: p.id,
    first_name: p.firstName,
    last_name: p.lastName,
    email: p.email,
    phone: p.phone ?? null,
    job_title: p.jobTitle ?? null,
    avatar_url: p.avatarUrl ?? null,
    color_hex: p.colorHex ?? null,
    primary_role: p.primaryRole,
    additional_roles: p.additionalRoles ?? [],
    service_assignments: p.serviceAssignments ?? [],
    status: p.status,
    status_changed_at: p.statusChangedAt ?? null,
    status_reason: p.statusReason ?? null,
    status_note: p.statusNote ?? null,
    show_on_calendar: p.showOnCalendar ?? true,
    last_active: p.lastActive ?? null,
    details: omit(p, [
      "id",
      "firstName",
      "lastName",
      "email",
      "phone",
      "jobTitle",
      "avatarUrl",
      "colorHex",
      "primaryRole",
      "additionalRoles",
      "serviceAssignments",
      "status",
      "statusChangedAt",
      "statusReason",
      "statusNote",
      "showOnCalendar",
      "lastActive",
    ]),
  }));

  /**
   * Bookings name their staff member as a display string. Where that string
   * matches a real staff record, point the booking at it — which is what
   * finally replaces src/lib/api/booking.ts inventing an assignment by
   * rotating bookings across a staff pool.
   *
   * Unmatched names keep assigned_staff_name and a null id, honestly: "we do
   * not know who served this" beats a plausible guess.
   */
  const staffByName = new Map<string, string>(
    facilityStaff.map((p) => [`${p.firstName} ${p.lastName}`, staffUuid(p.id)]),
  );

  const bookingRows: BookingRow[] = [];
  const bookingPets: { booking_id: string; pet_id: string }[] = [];
  let skippedBookings = 0;

  for (const b of bookings) {
    if (!clientsById.has(b.clientId)) {
      skippedBookings++;
      continue;
    }
    bookingRows.push({
      id: uuidFor("booking", b.id),
      ref: b.id,
      facility_id: opts.facilityId,
      location_id: opts.locationId,
      client_id: uuidFor("client", b.clientId),
      service: b.service,
      service_type: b.serviceType ?? null,
      status: b.status,
      payment_status: b.paymentStatus,
      start_at: instantFromWallClock(
        b.startDate,
        b.checkInTime ?? "00:00",
        opts.timeZone,
      ),
      end_at: instantFromWallClock(
        b.endDate,
        b.checkOutTime ?? b.checkInTime ?? "23:59",
        opts.timeZone,
      ),
      assigned_staff_name: b.assignedStaff ?? null,
      assigned_staff_id:
        staffByName.get(b.assignedStaff ?? b.stylistPreference ?? "") ?? null,
      base_price: b.basePrice ?? 0,
      discount: b.discount ?? 0,
      total_cost: b.totalCost ?? 0,
      tip_amount: b.tipAmount ?? null,
      special_requests: b.specialRequests ?? null,
      details: omit(b, [
        "id",
        "clientId",
        "petId",
        "facilityId",
        "service",
        "serviceType",
        "status",
        "paymentStatus",
        "startDate",
        "endDate",
        "basePrice",
        "discount",
        "totalCost",
        "tipAmount",
        "specialRequests",
        "assignedStaff",
      ]),
    });

    for (const ref of resolvePetRefs(b)) {
      bookingPets.push({
        booking_id: uuidFor("booking", b.id),
        pet_id: uuidFor("pet", ref),
      });
    }
  }

  return {
    clients: clientRows,
    pets: petRows,
    bookings: bookingRows,
    bookingPets,
    staff: staffRows,
    pulledIn,
    remaps,
    skippedBookings,
  };
}

export function reportAnomalies(rows: SeedRows): void {
  if (rows.pulledIn.length) {
    console.log(
      `\npulled into the demo facility (their bookings are here, the mock files them elsewhere):`,
    );
    for (const c of rows.pulledIn) {
      console.log(`  ${c.id} ${c.name} — mock facility "${c.facility}"`);
    }
  }
  if (rows.remaps.length) {
    console.log(`\nre-referenced duplicate pet ids:`);
    for (const line of rows.remaps) console.log(`  ${line}`);
  }
}
