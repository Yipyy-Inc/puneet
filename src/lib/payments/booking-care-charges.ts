import "server-only";

import { callerLocale } from "@/lib/i18n/caller-locale";
import type { AppLocale } from "@/lib/language-settings";
import {
  careChargeLines,
  type CareChargeLine,
  type CarePart,
} from "@/lib/medications/charges";
import { providedLineName } from "@/lib/medications/describe";
import { round2 } from "@/lib/medications/dose";
import { stayOf } from "@/lib/medications/schedule";
import { groupOf, requestParts } from "@/lib/payments/booking-service-charges";
import {
  careFeesSchema,
  NO_CARE_FEES,
  type CareFees,
} from "@/lib/settings/care-fees";
import {
  feedingInstructionsSchema,
  SHIPPED_FEEDING_INSTRUCTIONS,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import {
  medicationInstructionsSchema,
  SHIPPED_MEDICATION_INSTRUCTIONS,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import { shellText } from "@/lib/shell/text";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";

// ============================================================================
// PUTTING A BOOKING'S CARE CHARGES ON ITS BILL (2026-10-01).
//
// The medication fee and the daycare meals fee (Settings → Booking rules), and
// what the facility supplies to give a medication with — pill pockets, cheese
// — priced per dose or per day (Settings → Care tasks). They were folded into
// `total_cost` by the booking form, so no invoice showed them and a customer's
// request carrying one never matched the server's price and never confirmed
// itself. They are `fee` lines now, worked out by `careChargeLines`, the
// function the form quotes them with, from the facility's settings and the
// booking's own medications, days and pets — never from a number the request
// sent.
//
// ── A REQUEST IS PRICED, NOT SKIPPED ──────────────────────────────────────
//
// The service charges wait for a request to be approved, because a percentage
// of the $0 the integrity trigger gives a customer's request would be $0 for
// ever. Nothing here is a percentage of anything: every charge is a count
// times a price in the settings. So a request's lines are written when it is
// made, and the bill the customer sees owes them from the start.
//
// ── ONCE PER REQUEST, AND PER BOOKING ─────────────────────────────────────
//
// One request is several bookings — a daycare day each, a boarding room each
// — and each carries the whole medication list. The once-per-request fees go
// on its first open booking; what is supplied is counted per booking, over its
// own days (on the facility's calendar) and its own pets' medications, so the
// parts add up to the form's figure. A medication for a pet on none of them
// counts on the first.
//
// Each booking is read from its OWN `details` (2026-10-01): an edit is saved
// on one booking of a request, so the others may not carry it yet, and the
// first booking's list is not the request's. House food (Settings → Care
// tasks) is counted per booking like what is supplied for a medication.
//
// ── AN EDIT MOVES WHAT THE EDIT CHANGED ───────────────────────────────────
//
// A staff edit is worked out from the booking as it was and as it is
// (`snapshotCareCharges` before the write, then `{ before }` here): a charge
// the edit added is written, one it changed is updated, one it took away is
// removed. A line nobody's edit touched is left as it is — so one staff took
// off at the till is not brought back by a later change of times, and a
// booking made before these lines existed is not charged for them now. A
// customer's own later edit never re-prices (the routes call this for staff).
//
// ── NOT ON A BOOKING WHOSE CHARGES WERE STATED ────────────────────────────
//
// A booking made from an estimate carries the estimate's charges as quoted
// (`service_charges_included`), the care ones with them. Nothing is added.
//
// ── IT NEVER FAILS THE BOOKING ────────────────────────────────────────────
//
// Like the tax stamp and the service charges: a count back, failures
// swallowed. A booking missing a pill-pocket line is put right at the till; a
// booking that was not made because a setting could not be read is not.
// ============================================================================

/** A booking that is over: its bill is what it was. */
const CLOSED_STATUSES = new Set([
  "completed",
  "cancelled",
  "declined",
  "no_show",
]);

const COLUMNS =
  "id, ref, facility_id, client_id, service, status, start_at, end_at, taxable, details, service_charges_included, facilities(timezone), clients(preferred_language), booking_pets(pets(ref))";

interface CareRow {
  id: string;
  ref: number;
  facility_id: string;
  client_id: string;
  service: string;
  status: string;
  start_at: string;
  end_at: string;
  taxable: boolean | null;
  details: Record<string, unknown> | null;
  service_charges_included: boolean | null;
  facilities: { timezone: string | null } | null;
  clients: { preferred_language: string | null } | null;
  booking_pets: { pets: { ref: number } | null }[] | null;
}

/** One line as the bill stores it. */
interface PlannedLine {
  feeId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxable: boolean;
}

/**
 * A request's care lines as worked out at one moment: booking id → fee id →
 * line. Taken before a staff edit, so the edit's own effect can be told apart
 * from what anybody did at the till.
 */
export type CareChargeSnapshot = Map<string, Map<string, PlannedLine>>;

type Admin = ReturnType<typeof createAdminClient>;

interface FacilityCare {
  fees: CareFees;
  settings: MedicationInstructions;
  feeding: FeedingInstructions;
}

/**
 * What a staff edit is about to change, worked out from the booking as it is
 * before the write. `null` when it cannot be (no server key, a read failed) —
 * and then the edit changes no care line.
 */
export async function snapshotCareCharges(
  bookingId: string,
): Promise<CareChargeSnapshot | null> {
  if (!hasServiceRoleKey()) return null;
  try {
    const admin = createAdminClient();
    const named = await readBookings(admin, [bookingId]);
    if (named.length === 0) return null;
    return await planRequest(admin, named[0], new Map(), await callerLocale());
  } catch {
    return null;
  }
}

/**
 * Write the care lines of the named bookings' requests.
 *
 * `"initial"` — a booking just made, or a request just approved: every line
 * that is missing is written, and a line already there is left as it is.
 * `{ before }` — a staff edit: only what the edit changed moves.
 */
export async function applyBookingCareCharges(
  bookingIds: string[],
  mode: "initial" | { before: CareChargeSnapshot | null },
): Promise<number> {
  if (bookingIds.length === 0 || !hasServiceRoleKey()) return 0;
  if (mode !== "initial" && mode.before === null) return 0;

  try {
    const admin = createAdminClient();
    const given = await readBookings(admin, bookingIds);

    // Each request once, however many of its bookings were named.
    const requests = new Map<string, CareRow>();
    for (const row of given) {
      const group = groupOf(row);
      requests.set(group ? `${row.facility_id}:${group}` : row.id, row);
    }

    const careByFacility = new Map<string, FacilityCare>();
    const fallback = await callerLocale();
    let written = 0;

    for (const named of requests.values()) {
      const after = await planRequest(admin, named, careByFacility, fallback);
      if (mode === "initial") {
        written += await insertMissing(admin, named.facility_id, after);
      } else {
        written += await reconcile(
          admin,
          named.facility_id,
          mode.before ?? new Map(),
          after,
        );
      }
    }
    return written;
  } catch {
    // Deliberately silent, like the service charges beside it.
    return 0;
  }
}

// ── WORKING THEM OUT ──────────────────────────────────────────────────────

async function readBookings(admin: Admin, ids: string[]): Promise<CareRow[]> {
  const { data } = await admin.from("bookings").select(COLUMNS).in("id", ids);
  return (data ?? []) as unknown as CareRow[];
}

async function planRequest(
  admin: Admin,
  named: CareRow,
  careByFacility: Map<string, FacilityCare>,
  fallback: AppLocale,
): Promise<CareChargeSnapshot> {
  const planned: CareChargeSnapshot = new Map();
  const parts = await requestParts<CareRow>(admin, named, COLUMNS);
  // An estimate stated this booking's charges, all of them.
  if (parts.some((part) => part.service_charges_included === true)) {
    return planned;
  }
  const open = parts.filter((part) => !CLOSED_STATUSES.has(part.status));
  if (open.length === 0) return planned;

  const first = open[0];
  if (!careByFacility.has(first.facility_id)) {
    careByFacility.set(
      first.facility_id,
      await readFacilityCare(admin, first.facility_id),
    );
  }
  const care = careByFacility.get(first.facility_id) as FacilityCare;

  const petsOf = (part: CareRow) =>
    new Set(
      (part.booking_pets ?? [])
        .map((link) => link.pets?.ref)
        .filter((ref): ref is number => typeof ref === "number"),
    );
  const partPets = open.map(petsOf);
  const anywhere = new Set(partPets.flatMap((pets) => [...pets]));

  const careParts: CarePart[] = open.map((part, index) => {
    const timeZone = part.facilities?.timezone ?? DEFAULT_TIMEZONE;
    return {
      stay: stayOf({
        overnight: part.service === "boarding",
        start: wallClockParts(part.start_at, timeZone).date,
        end: wallClockParts(part.end_at, timeZone).date,
      }),
      // Its own pets' medications, from its own record; one for a pet on no
      // booking of the request, or for no pet, counts once, on the first.
      medications: medicationsOf(part.details).filter((item) =>
        item.petId !== undefined && anywhere.has(item.petId)
          ? partPets[index].has(item.petId)
          : index === 0,
      ),
      // Its own pets' feeding plans. A plan with no pet is the one pet's of an
      // older single-pet booking, fed on every booking of the request; one for
      // a pet on none of them counts on the first.
      feeding: feedingOf(part.details).filter((item) =>
        item.petId === undefined
          ? true
          : anywhere.has(item.petId)
            ? partPets[index].has(item.petId)
            : index === 0,
      ),
    };
  });

  const lines = careChargeLines({
    fees: care.fees,
    settings: care.settings,
    feedingSettings: care.feeding,
    service: first.service,
    parts: careParts,
  });

  const locale = localeOf(first.clients?.preferred_language, fallback);
  const t = (key: string) => shellText(locale, "booking", key);
  lines.forEach((partLines, index) => {
    const part = open[index];
    const byFee = new Map<string, PlannedLine>();
    for (const line of partLines) {
      if (line.quantity <= 0 || line.unitPrice <= 0) continue;
      byFee.set(line.feeId, {
        feeId: line.feeId,
        name: lineName(t, line),
        unitPrice: round2(line.unitPrice),
        quantity: line.quantity,
        // What is supplied is goods, taxed like every extra; the fees sat in
        // the service's price until now, so they follow the service's tax.
        taxable: line.taxedAs === "goods" ? true : part.taxable !== false,
      });
    }
    planned.set(part.id, byFee);
  });
  return planned;
}

function lineName(t: (key: string) => string, line: CareChargeLine): string {
  if (line.kind === "medication_fee") return t("feeMedicationAdmin");
  if (line.kind === "meals") return t("feeDaycareFeeding");
  // The facility's own name for its house food, as its settings say it.
  if (line.kind === "house_food") return line.label || t("feedHouseFood");
  return providedLineName(t, line.method ?? "");
}

/** The booking's medications, as far as they can be read. */
function medicationsOf(
  details: Record<string, unknown> | null,
): MedicationItem[] {
  const list = (details ?? {})["medications"];
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item): item is MedicationItem =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string",
  );
}

/** The booking's feeding schedule, as far as it can be read. */
function feedingOf(
  details: Record<string, unknown> | null,
): FeedingScheduleItem[] {
  const list = (details ?? {})["feedingSchedule"];
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item): item is FeedingScheduleItem =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      Array.isArray((item as { occasions?: unknown }).occasions),
  );
}

/** The facility's care fees, medication and feeding settings, or what ships. */
async function readFacilityCare(
  admin: Admin,
  facilityId: string,
): Promise<FacilityCare> {
  const { data } = await admin
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", facilityId)
    .in("domain", [
      "care_fees",
      "medication_instructions",
      "feeding_instructions",
    ]);
  const rows = (data ?? []) as Array<{ domain: string; value: unknown }>;
  const valueOf = (domain: string) =>
    rows.find((row) => row.domain === domain)?.value;

  // A stored value that no longer parses counts as unset, as it does for
  // every screen (lib/settings/from-rows.ts): no fee, nothing supplied.
  const fees = careFeesSchema.safeParse(valueOf("care_fees"));
  const settings = medicationInstructionsSchema.safeParse(
    valueOf("medication_instructions"),
  );
  const feeding = feedingInstructionsSchema.safeParse(
    valueOf("feeding_instructions"),
  );
  return {
    fees: fees.success ? fees.data : NO_CARE_FEES,
    settings: settings.success
      ? settings.data
      : SHIPPED_MEDICATION_INSTRUCTIONS,
    feeding: feeding.success ? feeding.data : SHIPPED_FEEDING_INSTRUCTIONS,
  };
}

/**
 * The line's words in the client's language when the client record says one
 * — it is their bill — and otherwise in the language of whoever made the
 * booking.
 */
function localeOf(
  preferred: string | null | undefined,
  fallback: AppLocale,
): AppLocale {
  if (preferred?.startsWith("fr")) return "fr";
  if (preferred?.startsWith("en")) return "en";
  return fallback;
}

// ── WRITING THEM ──────────────────────────────────────────────────────────

function rowOf(bookingId: string, facilityId: string, line: PlannedLine) {
  // The same keys on every row: a bulk insert sends the union of them, and a
  // key one row lacks would be written as null on it rather than defaulted.
  return {
    booking_id: bookingId,
    facility_id: facilityId,
    kind: "fee",
    name: line.name,
    unit_price: line.unitPrice,
    quantity: line.quantity,
    fee_id: line.feeId,
    taxable: line.taxable,
    pet_id: null,
    author_name: "Care instructions",
  };
}

async function insert(
  admin: Admin,
  rows: ReturnType<typeof rowOf>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  // `ignoreDuplicates` on `(booking_id, fee_id)`: a create, an approval and a
  // retried request may all try the same line, and only the first may cost
  // anything — and a line already there keeps its name and its price.
  const { data } = await admin
    .from("booking_line_items")
    .upsert(rows as never, {
      onConflict: "booking_id,fee_id",
      ignoreDuplicates: true,
    })
    .select("id");
  return (data ?? []).length;
}

async function insertMissing(
  admin: Admin,
  facilityId: string,
  planned: CareChargeSnapshot,
): Promise<number> {
  const rows = [...planned].flatMap(([bookingId, lines]) =>
    [...lines.values()].map((line) => rowOf(bookingId, facilityId, line)),
  );
  return insert(admin, rows);
}

async function reconcile(
  admin: Admin,
  facilityId: string,
  before: CareChargeSnapshot,
  after: CareChargeSnapshot,
): Promise<number> {
  let moved = 0;
  const added: ReturnType<typeof rowOf>[] = [];
  const bookingIds = new Set([...before.keys(), ...after.keys()]);

  for (const bookingId of bookingIds) {
    const was = before.get(bookingId) ?? new Map<string, PlannedLine>();
    const now = after.get(bookingId) ?? new Map<string, PlannedLine>();

    for (const [feeId, line] of now) {
      const old = was.get(feeId);
      if (!old) {
        added.push(rowOf(bookingId, facilityId, line));
        continue;
      }
      if (
        old.quantity === line.quantity &&
        old.unitPrice === line.unitPrice &&
        old.taxable === line.taxable
      ) {
        continue;
      }
      // The line as the edit changed it — if it is still there. One staff
      // removed at the till matches nothing and stays removed. Its name is
      // the one it was written with.
      const { data } = await admin
        .from("booking_line_items")
        .update({
          unit_price: line.unitPrice,
          quantity: line.quantity,
          taxable: line.taxable,
        } as never)
        .eq("booking_id", bookingId)
        .eq("fee_id", feeId)
        .select("id");
      moved += (data ?? []).length;
    }

    for (const feeId of was.keys()) {
      if (now.has(feeId)) continue;
      const { data } = await admin
        .from("booking_line_items")
        .delete()
        .eq("booking_id", bookingId)
        .eq("fee_id", feeId)
        .select("id");
      moved += (data ?? []).length;
    }
  }

  return moved + (await insert(admin, added));
}
