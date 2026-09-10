/**
 * Fills the demo facility "Paws & Co — Demo" with a realistic six weeks.
 *
 *   bun scripts/demo-seed/run.ts --dry-run    validate and print the plan
 *   bun scripts/demo-seed/run.ts --rollback   write everything, then roll back
 *   bun scripts/demo-seed/run.ts              write it
 *
 * ── WHY IT LOOKS LIKE THIS ─────────────────────────────────────────────────
 *
 * Staging and local both write the PRODUCTION database. So:
 *
 *  - One transaction. A failure halfway leaves nothing behind.
 *  - It acts as the platform TEST admin, with `role authenticated` and JWT
 *    claims, so every row passes the same RLS and the same RPCs the app uses
 *    (`create_booking` writes the stay, the grooming appointment and the
 *    booking's pets exactly as the booking screen would). Never the database
 *    owner, and never the client's own account.
 *  - Rows are built by the app's own mappers (`clientToRow`, `petToRow`,
 *    `bookingToRow`), so a seeded booking is the shape a created one is.
 *  - Idempotent: every row carries a `demoSeedKey` (or a `demo-pawsco-…`
 *    legacy id) and a second run skips what exists. `teardown.ts` removes
 *    exactly those rows and nothing the client created.
 *  - It refuses to start unless the facility row matches BOTH the id and the
 *    slug in config.ts, and refuses any contact that is not `.invalid`/555.
 *
 * Needs SUPABASE_DB_URL (a direct connection), like `bun run test:sql`.
 */
import { SQL } from "bun";
import { bookingToRow } from "../../src/lib/api/mappers/booking";
import { clientToRow, petToRow } from "../../src/lib/api/mappers/client";
import {
  DEMO_FACILITY_ID,
  DEMO_FACILITY_SLUG,
  DEMO_TIMEZONE,
  REFUSED_SLUGS,
  SEED_ACTOR_SUB,
  SEED_AUTHOR,
  TAX_RATE,
} from "./config";
import {
  CATEGORIES,
  CLIENTS,
  DAYCARE_PRICE,
  FACILITY_PROFILE,
  GROOMING_ADD_ONS,
  GROOMING_SERVICES,
  GROOMING_STATIONS,
  PETS,
  STAFF,
} from "./data";
import { planBookings } from "./bookings";
import { assertSafeContact } from "./safety";

const DRY_RUN = process.argv.includes("--dry-run");
const ROLLBACK = process.argv.includes("--rollback");

class Rollback extends Error {}

/** Today on the facility's wall clock — not the machine's, not UTC. */
function facilityToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEMO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const money = (n: number) => Math.round(n * 100) / 100;

// ── Validate before touching anything ─────────────────────────────────────
for (const c of CLIENTS)
  assertSafeContact(c.key, c.client.email!, c.client.phone);
for (const s of STAFF) assertSafeContact(s.legacyId, s.email);
assertSafeContact("facility", FACILITY_PROFILE.email, FACILITY_PROFILE.phone);
if (REFUSED_SLUGS.includes(DEMO_FACILITY_SLUG)) {
  throw new Error(`Refusing to seed ${DEMO_FACILITY_SLUG}.`);
}

const today = facilityToday();
const plan = planBookings(today);

console.log(`facility   ${DEMO_FACILITY_SLUG} (${DEMO_FACILITY_ID})`);
console.log(`today      ${today} (${DEMO_TIMEZONE})`);
console.log(
  `plan       ${STAFF.length} staff, ${CATEGORIES.length} room categories, ` +
    `${GROOMING_SERVICES.length} grooming services, ${CLIENTS.length} clients, ` +
    `${PETS.length} pets, ${plan.length} bookings ` +
    `(${plan.filter((b) => b.payment).length} paid)`,
);
if (DRY_RUN) process.exit(0);

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("SUPABASE_DB_URL is not set.");
const sql = new SQL(url);

const summary: Record<string, number> = {};
const count = (what: string) => (summary[what] = (summary[what] ?? 0) + 1);

try {
  await sql.begin(async (tx) => {
    // ── The facility is the one we think it is ────────────────────────────
    const [facility] = await tx`
      select id, slug, timezone from public.facilities where id = ${DEMO_FACILITY_ID}`;
    if (!facility || facility.slug !== DEMO_FACILITY_SLUG) {
      throw new Error(
        `Facility ${DEMO_FACILITY_ID} is ${facility ? `"${facility.slug}"` : "missing"}, not ${DEMO_FACILITY_SLUG}. Refusing.`,
      );
    }
    const [location] = await tx`
      select id from public.locations
       where facility_id = ${DEMO_FACILITY_ID} and is_primary limit 1`;

    // ── Act as the platform test admin, through RLS ───────────────────────
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({
      sub: SEED_ACTOR_SUB,
      role: "authenticated",
    })}, true)`;
    await tx.unsafe("set local role authenticated");

    // ── The business profile: only what is still empty ─────────────────────
    // Without a city the dashboard's weather card has nothing to ask about,
    // and the invoice and receipt have no address. Fills gaps only — whatever
    // the client has typed in Settings → Business stays.
    const profile = await tx`
      update public.facilities set
        email = coalesce(nullif(email, ''), ${FACILITY_PROFILE.email}),
        phone = coalesce(nullif(phone, ''), ${FACILITY_PROFILE.phone}),
        description = coalesce(nullif(description, ''), ${FACILITY_PROFILE.description}),
        address = case
          when address is null or coalesce(address->>'city', '') = ''
          then ${FACILITY_PROFILE.address}::jsonb
          else address end
      where id = ${DEMO_FACILITY_ID}
        and (coalesce(email, '') = '' or coalesce(phone, '') = ''
             or coalesce(description, '') = ''
             or address is null or coalesce(address->>'city', '') = '')
      returning id`;
    if (profile.length) count("business profile");

    // ── Staff (roster only) ───────────────────────────────────────────────
    for (const s of STAFF) {
      const [exists] =
        await tx`select 1 from public.staff where legacy_id = ${s.legacyId}`;
      if (exists) continue;
      await tx`
        insert into public.staff
          (facility_id, legacy_id, first_name, last_name, email, job_title,
           primary_role, status, show_on_calendar)
        values
          (${DEMO_FACILITY_ID}, ${s.legacyId}, ${s.first}, ${s.last}, ${s.email},
           ${s.jobTitle}, ${s.role}::public.facility_staff_role, 'active', true)`;
      count("staff");
    }

    // ── Rooms and daycare areas ───────────────────────────────────────────
    for (const [i, c] of CATEGORIES.entries()) {
      let [cat] = await tx`
        select id from public.room_categories
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${c.legacyId}`;
      if (!cat) {
        [cat] = await tx`
          insert into public.room_categories
            (facility_id, legacy_id, service, name, description, color,
             sort_order, default_capacity, default_base_price, active,
             visible_to_clients, rules)
          values
            (${DEMO_FACILITY_ID}, ${c.legacyId}, ${c.service}, ${c.name},
             ${c.description}, ${c.color}, ${i + 1}, ${c.capacity}, ${c.price},
             true, true, '[]'::jsonb)
          returning id`;
        count("room categories");
      }
      for (let u = 1; u <= c.units; u++) {
        const legacyId = `${c.legacyId}-${String(u).padStart(2, "0")}`;
        const [room] = await tx`
          select 1 from public.facility_rooms
           where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${legacyId}`;
        if (room) continue;
        await tx`
          insert into public.facility_rooms
            (facility_id, category_id, legacy_id, name, active, sort_order, capacity)
          values
            (${DEMO_FACILITY_ID}, ${cat.id}, ${legacyId},
             ${c.units === 1 ? c.name : `${c.name} ${String(u).padStart(2, "0")}`},
             true, ${u}, ${c.capacity})`;
        count("rooms");
      }
    }

    // ── Daycare price, per location ───────────────────────────────────────
    const locations = await tx`
      select id from public.locations where facility_id = ${DEMO_FACILITY_ID}`;
    for (const l of locations) {
      const [price] = await tx`
        select 1 from public.daycare_location_prices
         where facility_id = ${DEMO_FACILITY_ID} and location_id = ${l.id}`;
      if (price) continue;
      await tx`
        insert into public.daycare_location_prices (facility_id, location_id, base_price)
        values (${DEMO_FACILITY_ID}, ${l.id}, ${DAYCARE_PRICE})`;
      count("daycare prices");
    }

    // ── Grooming menu ─────────────────────────────────────────────────────
    for (const [i, g] of GROOMING_SERVICES.entries()) {
      const [exists] = await tx`
        select 1 from public.grooming_services
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${g.legacyId}`;
      if (exists) continue;
      await tx`
        insert into public.grooming_services
          (facility_id, legacy_id, name, description, base_price, duration_min,
           is_active, is_popular, display_order)
        values
          (${DEMO_FACILITY_ID}, ${g.legacyId}, ${g.name}, ${g.description},
           ${g.price}, ${g.duration}, true, ${g.popular}, ${i + 1})`;
      count("grooming services");
    }
    for (const [i, a] of GROOMING_ADD_ONS.entries()) {
      const [exists] = await tx`
        select 1 from public.grooming_add_ons
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${a.legacyId}`;
      if (exists) continue;
      await tx`
        insert into public.grooming_add_ons
          (facility_id, legacy_id, name, price, duration_min, is_active, display_order)
        values
          (${DEMO_FACILITY_ID}, ${a.legacyId}, ${a.name}, ${a.price}, ${a.duration}, true, ${i + 1})`;
      count("grooming add-ons");
    }
    for (const [i, s] of GROOMING_STATIONS.entries()) {
      const [exists] = await tx`
        select 1 from public.grooming_stations
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${s.legacyId}`;
      if (exists) continue;
      await tx`
        insert into public.grooming_stations
          (facility_id, legacy_id, name, type, active, status, display_order)
        values
          (${DEMO_FACILITY_ID}, ${s.legacyId}, ${s.name}, ${s.type}, true, 'available', ${i + 1})`;
      count("grooming stations");
    }

    // ── Clients ───────────────────────────────────────────────────────────
    const clientIds = new Map<string, string>();
    for (const c of CLIENTS) {
      const [exists] = await tx`
        select id from public.clients
         where facility_id = ${DEMO_FACILITY_ID} and details->>'demoSeedKey' = ${c.key}`;
      if (exists) {
        clientIds.set(c.key, exists.id);
        continue;
      }
      const row = clientToRow(
        { ...c.client, demoSeedKey: c.key } as Parameters<
          typeof clientToRow
        >[0],
        { facilityId: DEMO_FACILITY_ID },
      );
      const [created] =
        await tx`insert into public.clients ${tx(row)} returning id`;
      clientIds.set(c.key, created.id);
      count("clients");
    }

    // ── Pets ──────────────────────────────────────────────────────────────
    const petIds = new Map<string, string>();
    for (const p of PETS) {
      const [exists] = await tx`
        select id from public.pets
         where facility_id = ${DEMO_FACILITY_ID} and details->>'demoSeedKey' = ${p.key}`;
      if (exists) {
        petIds.set(p.key, exists.id);
        continue;
      }
      const row = petToRow(
        { ...p.pet, demoSeedKey: p.key } as Parameters<typeof petToRow>[0],
        { clientId: clientIds.get(p.ownerKey)! },
      );
      const [created] =
        await tx`insert into public.pets ${tx(row)} returning id`;
      petIds.set(p.key, created.id);
      count("pets");
    }

    // ── Bookings, through create_booking ──────────────────────────────────
    for (const b of plan) {
      const [exists] = await tx`
        select id from public.bookings
         where facility_id = ${DEMO_FACILITY_ID} and details->>'demoSeedKey' = ${b.key}`;
      if (exists) continue;

      const clientRowId = clientIds.get(b.clientKey)!;
      const row = bookingToRow(
        { ...b.booking, demoSeedKey: b.key } as Parameters<
          typeof bookingToRow
        >[0],
        {
          facilityId: DEMO_FACILITY_ID,
          clientRowId,
          locationId: location.id,
          timeZone: facility.timezone ?? DEMO_TIMEZONE,
        },
      );
      const pets = `{${b.petKeys.map((k) => petIds.get(k)!).join(",")}}`;
      // Objects, not JSON strings: the driver serialises an object for a
      // jsonb parameter, and a pre-stringified one arrives as a jsonb STRING.
      const grooming = b.grooming
        ? {
            serviceId: b.grooming.serviceId,
            addOnIds: [],
            stationId: b.grooming.stationId,
          }
        : null;
      const boarding = b.boarding ? { roomId: b.boarding.roomId } : null;

      const [created] = await tx`
        select booking_id from public.create_booking(
          ${row}::jsonb, ${pets}::uuid[],
          ${grooming}::jsonb, ${boarding}::jsonb)`;
      const bookingId = created.booking_id as string;
      count(`${b.booking.service} bookings`);

      const startAt = row.start_at as string;
      const endAt = row.end_at as string;

      // What the door saw.
      if (b.arrived && b.booking.service === "boarding") {
        await tx`
          update public.boarding_stays
             set checked_in_at = ${startAt},
                 checked_out_at = ${b.departed ? endAt : null}
           where booking_id = ${bookingId}`;
      }
      if (b.arrived && b.booking.service === "daycare") {
        await tx`
          insert into public.daycare_attendance
            (booking_id, facility_id, checked_in_at, checked_out_at, rate_type, author_name)
          values
            (${bookingId}, ${DEMO_FACILITY_ID}, ${startAt},
             ${b.departed ? endAt : null}, 'full_day', ${SEED_AUTHOR})`;
      }
      if (b.arrived && b.booking.service === "grooming") {
        await tx`
          update public.grooming_appointments
             set check_in_at = ${startAt},
                 check_out_at = ${b.departed ? endAt : null}
           where booking_id = ${bookingId}`;
      }

      // Paid on the day it ended. Inserted rather than sent through
      // record_payment, which stamps `now()` and would put six weeks of
      // revenue on today's report. Same shape record_payment writes.
      if (b.payment) {
        const subtotal = money(Number(row.total_cost ?? 0));
        const tax = money(subtotal * TAX_RATE);
        const total = money(subtotal + tax);
        await tx`
          insert into public.payments
            (facility_id, booking_id, client_id, method, subtotal, tax, tip,
             store_credit_applied, package_pass_applied, loyalty_discount_applied,
             amount_charged, grand_total, cash_received, receipt_channels,
             author_name, note, created_at)
          values
            (${DEMO_FACILITY_ID}, ${bookingId}, ${clientRowId}, ${b.payment},
             ${subtotal}, ${tax}, 0, 0, 0, 0, ${total}, ${total},
             ${b.payment === "cash" ? Math.ceil(total) : null}, '{}',
             ${SEED_AUTHOR}, null, ${endAt})`;
        count("payments");
      }
    }

    if (ROLLBACK) {
      // What actually landed, before it is undone: every jsonb column an
      // OBJECT (a driver that pre-stringifies stores a jsonb string, which
      // every mapper then reads as empty), and the ledger paying what it should.
      const [shape] = await tx`
        select
          (select count(*) from public.clients
            where facility_id = ${DEMO_FACILITY_ID}
              and (jsonb_typeof(details) <> 'object' or jsonb_typeof(address) <> 'object')) as bad_clients,
          (select count(*) from public.pets
            where facility_id = ${DEMO_FACILITY_ID} and jsonb_typeof(details) <> 'object') as bad_pets,
          (select count(*) from public.bookings
            where facility_id = ${DEMO_FACILITY_ID} and jsonb_typeof(details) <> 'object') as bad_bookings,
          (select count(*) from public.bookings
            where facility_id = ${DEMO_FACILITY_ID} and payment_status = 'paid') as paid_bookings,
          (select count(*) from public.bookings
            where facility_id = ${DEMO_FACILITY_ID} and details ? 'feedingSchedule') as with_feeding`;
      console.log("\nshape check:", shape);
      throw new Rollback();
    }
  });
  console.log("\nwritten:");
} catch (error) {
  if (!(error instanceof Rollback)) {
    await sql.close();
    throw error;
  }
  console.log("\nwritten, then ROLLED BACK (--rollback):");
}

for (const [what, n] of Object.entries(summary)) {
  console.log(`  ${what.padEnd(20)} ${n}`);
}
if (Object.keys(summary).length === 0)
  console.log("  nothing new — already seeded");
await sql.close();
