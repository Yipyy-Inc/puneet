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
  DAYCARE_RATES,
  ESTIMATES,
  STORE_CREDIT,
  VACCINATIONS,
  FACILITY_PROFILE,
  GROOMING_ADD_ONS,
  GROOMING_SERVICES,
  GROOMING_STATIONS,
  GROOMING_STYLISTS,
  INCIDENTS,
  MEMBERS,
  MEMBERSHIP_PLANS,
  NOTES,
  PETS,
  STAFF,
  TASK_TEMPLATES,
  TRAINER_LEGACY_ID,
  TRAINING_PROGRAMS,
  TRAINING_SERIES,
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
/** A text[] literal: the driver sends a JS array as a bare comma list. */
const pgTextArray = (items: string[]) =>
  `{${items.map((v) => `"${v.replace(/[\\"]/g, (c) => `\\${c}`)}"`).join(",")}}`;

const shiftDay = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Validate before touching anything ─────────────────────────────────────
for (const c of CLIENTS)
  assertSafeContact(c.key, c.client.email!, c.client.phone);
for (const s of STAFF) assertSafeContact(s.legacyId, s.email);
for (const e of ESTIMATES)
  if (e.guest) assertSafeContact(e.key, e.guest.email, e.guest.phone);
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

    // ── The grooming team: a profile and a working week per groomer ──────
    for (const g of GROOMING_STYLISTS) {
      const [staff] = await tx`
        select id from public.staff
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${g.staffLegacyId}`;
      if (!staff) continue;
      const [profile] = await tx`
        select 1 from public.grooming_stylist_profiles where staff_id = ${staff.id}`;
      if (!profile) {
        await tx`
          insert into public.grooming_stylist_profiles
            (facility_id, legacy_id, staff_id, specializations, certifications,
             years_experience, bio, visible_online, calendar_color, skill_level,
             can_handle_matted, can_handle_anxious)
          values
            (${DEMO_FACILITY_ID}, ${g.legacyId}, ${staff.id},
             ${pgTextArray(g.specializations)}::text[],
             ${pgTextArray(g.certifications)}::text[],
             ${g.years}, ${g.bio}, true, ${g.color}, ${g.skill},
             ${g.matted}, ${g.anxious})`;
        count("grooming profiles");
      }
      for (const day of g.days) {
        const added = await tx`
          insert into public.grooming_stylist_availability
            (facility_id, staff_id, day_of_week, start_time, end_time, is_available)
          values (${DEMO_FACILITY_ID}, ${staff.id}, ${day}, ${g.start}, ${g.end}, true)
          on conflict (staff_id, day_of_week, start_time) do nothing
          returning id`;
        if (added.length) count("groomer hours");
      }
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

    // ── Daycare rates (the Rates screen) ──────────────────────────────────
    const [haveRates] = await tx`
      select 1 from public.facility_settings
       where facility_id = ${DEMO_FACILITY_ID} and domain = 'daycare_rates'`;
    if (!haveRates) {
      await tx`
        insert into public.facility_settings (facility_id, domain, value)
        values (${DEMO_FACILITY_ID}, 'daycare_rates', ${{ rates: DAYCARE_RATES }}::jsonb)`;
      count("daycare rates");
    }

    // ── Training programs (the training Rates tab) ────────────────────────
    const [havePrograms] = await tx`
      select 1 from public.facility_settings
       where facility_id = ${DEMO_FACILITY_ID} and domain = 'training_programs'`;
    if (!havePrograms) {
      await tx`
        insert into public.facility_settings (facility_id, domain, value)
        values (${DEMO_FACILITY_ID}, 'training_programs', ${{ programs: TRAINING_PROGRAMS }}::jsonb)`;
      count("training programs");
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

    // ── Each groom is WITH its groomer ──────────────────────────────────
    // The calendar columns and a groomer's queue read `assigned_staff_id`;
    // the plan names the groomer, so the id is filled from the name.
    const assigned = await tx`
      update public.bookings b
         set assigned_staff_id = s.id
        from public.staff s
       where b.facility_id = ${DEMO_FACILITY_ID}
         and b.service = 'grooming'
         and b.assigned_staff_id is null
         and b.details ? 'demoSeedKey'
         and s.facility_id = ${DEMO_FACILITY_ID}
         and b.assigned_staff_name = s.first_name || ' ' || s.last_name
      returning b.id`;
    if (assigned.length)
      summary["grooms given their groomer"] = assigned.length;

    // ── Training: the classes, who is in them, and what was held ─────────
    //
    // Through the app's own RPCs: create_training_series writes a series and
    // every session; enroll_in_training_series books each dog into the
    // sessions still ahead. Sessions already past are booked here the same
    // way (create_booking, linked to the session), marked held, and the dogs
    // checked in and out — the history the Students tab and the calendar show.
    const [trainer] = await tx`
      select id from public.staff
       where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${TRAINER_LEGACY_ID}`;
    for (const spec of TRAINING_SERIES) {
      // The first session: this week's (or startWeeks away) `day`.
      const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
      const startDate = shiftDay(
        today,
        spec.day - todayDow + spec.startWeeks * 7,
      );
      let [series] = await tx`
        select id from public.training_series
         where facility_id = ${DEMO_FACILITY_ID} and name = ${spec.name}`;
      if (!series) {
        [series] = await tx`
          select (s).id as id from public.create_training_series(
            ${DEMO_FACILITY_ID}, ${spec.name}, ${spec.day}::smallint,
            ${spec.time}::time, ${spec.duration}, ${startDate}::date,
            ${spec.sessions}, ${spec.capacity}, ${spec.price},
            ${location.id}, ${trainer?.id ?? null}, ${spec.course}) s`;
        count("training series");
      }
      const perSession = money(spec.price / spec.sessions);
      const everyone = [
        ...spec.pets.map((name) => ({ name, waitlist: false })),
        ...(spec.waitlist ?? []).map((name) => ({ name, waitlist: true })),
      ];
      for (const { name, waitlist } of everyone) {
        const pet = PETS.find((p) => p.pet.name === name);
        if (!pet) throw new Error(`No seeded pet named ${name}`);
        const petId = petIds.get(pet.key)!;
        const clientId = clientIds.get(pet.ownerKey)!;
        const [already] = await tx`
          select 1 from public.training_series_enrollments
           where series_id = ${series.id} and pet_id = ${petId}
             and status <> 'cancelled'`;
        if (!already) {
          await tx`
            select public.enroll_in_training_series(
              ${series.id}, ${petId}, ${clientId}, ${waitlist})`;
          count(waitlist ? "training waitlist" : "training enrolments");
        }
        if (waitlist) continue;

        // The sessions already past: booked, attended, held.
        const past = await tx`
          select id, start_at, end_at from public.training_series_sessions
           where series_id = ${series.id} and start_at < now()
           order by session_number`;
        for (const session of past) {
          const [booked] = await tx`
            select b.id from public.bookings b
              join public.booking_pets bp on bp.booking_id = b.id
             where b.training_series_session_id = ${session.id}
               and bp.pet_id = ${petId}`;
          if (booked) continue;
          const [created] = await tx`
            select booking_id from public.create_booking(
              ${{
                facility_id: DEMO_FACILITY_ID,
                location_id: location.id,
                client_id: clientId,
                service: "training",
                service_type: spec.course,
                status: "completed",
                start_at: session.start_at,
                end_at: session.end_at,
                assigned_staff_id: trainer?.id ?? null,
                base_price: perSession,
                total_cost: perSession,
                training_series_session_id: session.id,
                details: { demoSeedKey: `${spec.name}:${session.id}:${name}` },
              }}::jsonb,
              ${`{${petId}}`}::uuid[])`;
          await tx`
            insert into public.training_attendance
              (booking_id, facility_id, checked_in_at, checked_out_at,
               session_notes, author_name)
            values
              (${created.booking_id}, ${DEMO_FACILITY_ID}, ${session.start_at},
               ${session.end_at}, ${"Good focus; practised sit-stay and loose-leash walking."},
               ${SEED_AUTHOR})`;
          count("training sessions attended");
        }
        await tx`
          update public.training_series_sessions set status = 'completed'
           where series_id = ${series.id} and start_at < now()
             and status = 'scheduled'`;
      }
    }

    // ── What staff logged during the stays ──────────────────────────────
    // The guest journal is built from `care_log_entries`, the same rows the
    // booking page's feeding and medication panels write — so seeded stays
    // get the meals, doses and potty breaks a shift would have recorded,
    // keyed exactly as the panels key them. Days before today in full; today
    // only up to breakfast. One row per task per day (the table's own rule),
    // so a second run adds nothing.
    for (const b of plan) {
      if (b.booking.service !== "boarding" || !b.arrived) continue;
      const [row] = await tx`
        select id from public.bookings
         where facility_id = ${DEMO_FACILITY_ID} and details->>'demoSeedKey' = ${b.key}`;
      if (!row) continue;
      const petId = petIds.get(b.petKeys[0])!;
      const petName = PETS.find((p) => p.key === b.petKeys[0])!.pet.name!;
      const feedId = `feed-${petName.toLowerCase()}`;
      const last = b.departed ? b.booking.endDate! : today;
      const staff = String(b.booking.assignedStaff ?? SEED_AUTHOR);

      for (
        let d = b.booking.startDate!, i = 0;
        d <= last;
        d = shiftDay(d, 1), i++
      ) {
        const isToday = d === today;
        const firstNight = i === 0;
        const entries: [string, string, string, string, string | null][] = [
          // [task_key, task_type, executed_at, outcome, notes]
          ...(firstNight
            ? []
            : ([
                [
                  `sched-${feedId}-am`,
                  "feeding",
                  "07:45",
                  i % 5 === 3 ? "ate_most" : "ate_all",
                  null,
                ],
                ["potty-am", "potty", "07:00", "both", null],
              ] as [string, string, string, string, string | null][])),
          ...(isToday
            ? []
            : ([
                ["potty-midday", "potty", "12:30", "pee", null],
                [
                  `sched-${feedId}-pm`,
                  "feeding",
                  "17:45",
                  firstNight ? "ate_some" : "ate_all",
                  firstNight
                    ? "Settling in — picked at dinner the first night."
                    : null,
                ],
                ["potty-pm", "potty", "21:00", "both", null],
              ] as [string, string, string, string, string | null][])),
        ];
        if (petName === "Maple") {
          if (!firstNight)
            entries.push([
              "med-maple-vetmedin#08:00",
              "medication",
              "08:05",
              "given",
              "In a pill pocket.",
            ]);
          if (!isToday)
            entries.push([
              "med-maple-vetmedin#20:00",
              "medication",
              "20:05",
              "given",
              null,
            ]);
        }
        for (const [taskKey, taskType, at, outcome, notes] of entries) {
          const res = await tx`
            insert into public.care_log_entries
              (facility_id, booking_id, pet_id, task_key, task_type,
               occurred_on, executed_at, served_at, outcome, notes,
               recorded_by_name, details)
            values
              (${DEMO_FACILITY_ID}, ${row.id}, ${petId}, ${taskKey}, ${taskType},
               ${d}, ${at}, ${taskType === "feeding" ? at : null}, ${outcome},
               ${notes}, ${staff}, '{}'::jsonb)
            on conflict (booking_id, task_key, occurred_on) do nothing
            returning id`;
          if (res.length) count("care log entries");
        }
      }
    }

    // ── The facility's routine ─────────────────────────────────────────
    for (const [i, t] of TASK_TEMPLATES.entries()) {
      const [exists] = await tx`
        select 1 from public.task_templates
         where facility_id = ${DEMO_FACILITY_ID} and legacy_id = ${t.legacyId}`;
      if (exists) continue;
      await tx`
        insert into public.task_templates
          (facility_id, legacy_id, module_id, name, description, category,
           timing_type, timing_offset_minutes, duration_minutes, assign_to,
           is_required, auto_create, recurring_frequency, recurring_times,
           sort_order, created_by)
        values
          (${DEMO_FACILITY_ID}, ${t.legacyId}, ${t.moduleId}, ${t.name},
           ${t.description}, ${t.category}, ${t.timingType},
           ${t.offsetMinutes ?? null}, ${t.durationMinutes}, 'booking_staff',
           ${t.isRequired}, true, ${t.recurringTimes ? "daily" : null},
           ${t.recurringTimes ? `{${t.recurringTimes.join(",")}}` : null}::text[],
           ${i + 1}, ${SEED_ACTOR_SUB})`;
      count("task templates");
    }

    // ── Notes staff have written ────────────────────────────────────────
    const petByName = (name: string) => PETS.find((p) => p.pet.name === name)!;
    for (const n of NOTES) {
      const entityId =
        "pet" in n.about
          ? petIds.get(petByName(n.about.pet).key)!
          : clientIds.get(
              CLIENTS.find(
                (c) => c.client.name === (n.about as { client: string }).client,
              )!.key,
            )!;
      const category = "pet" in n.about ? "pet" : "customer";
      const [exists] = await tx`
        select 1 from public.notes
         where entity_id = ${entityId} and content = ${n.content}`;
      if (exists) continue;
      await tx`
        insert into public.notes
          (facility_id, category, sub_type, entity_id, content, visibility,
           is_pinned, created_by_name)
        values
          (${DEMO_FACILITY_ID}, ${category}, ${n.subType ?? null}, ${entityId},
           ${n.content}, ${n.shared ? "shared_with_customer" : "internal"},
           ${n.pinned ?? false}, ${n.author})`;
      count("notes");
    }

    // ── Incidents on record, and the follow-up one of them left ───────────
    for (const inc of INCIDENTS) {
      const [exists] = await tx`
        select 1 from public.incidents
         where facility_id = ${DEMO_FACILITY_ID} and title = ${inc.title}`;
      if (exists) continue;
      const pet = petByName(inc.pet);
      const petRowId = petIds.get(pet.key)!;
      const clientRowId = clientIds.get(pet.ownerKey)!;
      const occurred = new Date(Date.now() - inc.daysAgo * 86_400_000);
      occurred.setUTCHours(19, 40, 0, 0);
      const reported = new Date(occurred.getTime() + 20 * 60_000);
      const done = inc.status === "resolved" || inc.status === "closed";
      const [row] = await tx`
        insert into public.incidents
          (facility_id, location_id, client_id, kind, severity, status, title,
           description, internal_notes, client_notes, pet_ids, occurred_at,
           reported_at, reported_by, resolved_at, resolved_by,
           owner_notified_at, owner_notified_by)
        values
          (${DEMO_FACILITY_ID}, ${location.id}, ${clientRowId}, ${inc.kind},
           ${inc.severity}, ${inc.status}, ${inc.title}, ${inc.description},
           ${inc.internalNotes}, ${inc.clientNotes}, ${`{${petRowId}}`}::uuid[],
           ${occurred.toISOString()}, ${reported.toISOString()}, ${SEED_ACTOR_SUB},
           ${done ? new Date(reported.getTime() + 86_400_000).toISOString() : null},
           ${done ? SEED_ACTOR_SUB : null},
           ${inc.ownerTold ? reported.toISOString() : null},
           ${inc.ownerTold ? SEED_ACTOR_SUB : null})
        returning ref`;
      count("incidents");
      if (inc.followUp) {
        const due = new Date(
          reported.getTime() + inc.followUp.dueInDays * 86_400_000,
        );
        await tx`
          insert into public.facility_tasks
            (facility_id, title, description, category, priority, status,
             due_at, source, source_ref, metadata, created_by)
          values
            (${DEMO_FACILITY_ID}, ${`${inc.followUp.title} — ${inc.pet}`},
             ${inc.followUp.description}, 'follow_up',
             ${inc.severity === "high" || inc.severity === "critical" ? "high" : "medium"},
             'pending', ${due.toISOString()}, 'manual',
             ${`incident:${row.ref}:1`},
             ${{
               incidentRef: Number(row.ref),
               followUp: {
                 title: `${inc.followUp.title} — ${inc.pet}`,
                 description: inc.followUp.description,
                 assignedTo: "",
                 dueDate: due.toISOString(),
                 contactMethod: "phone",
                 stepOrder: 1,
                 conversationLog: [],
                 attemptCount: 0,
                 escalated: false,
               },
             }}::jsonb, ${SEED_ACTOR_SUB})`;
        count("incident follow-ups");
      }
    }

    // ── Vaccination records ──────────────────────────────────────────────
    // Reviewed by the manager, on the day after they were given.
    for (const v of VACCINATIONS) {
      const petRowId = petIds.get(petByName(v.pet).key)!;
      const [exists] = await tx`
        select 1 from public.pet_vaccinations
         where pet_id = ${petRowId} and vaccine_name = ${v.vaccine}`;
      if (exists) continue;
      const given = shiftDay(today, -v.givenDaysAgo);
      const reviewed = v.status !== "pending_review";
      await tx`
        insert into public.pet_vaccinations
          (pet_id, facility_id, vaccine_name, administered_on, expires_on,
           veterinarian_name, veterinary_clinic, status, reviewed_by,
           reviewed_at, review_reason, created_by)
        values
          (${petRowId}, ${DEMO_FACILITY_ID}, ${v.vaccine}, ${given},
           ${v.expiresInDays === null ? null : shiftDay(today, v.expiresInDays)},
           ${v.vet}, ${v.clinic}, ${v.status},
           ${reviewed ? "Valérie Lacroix" : null},
           ${reviewed ? `${shiftDay(given, 1)}T14:00:00Z` : null},
           ${v.reason ?? null}, ${SEED_AUTHOR})`;
      count("vaccinations");
    }

    // ── Estimates, one in every state ────────────────────────────────────
    // Numbered by the table's own trigger (E10001…), so they read exactly as
    // the app's would. The seed key rides in the first history entry — the
    // table has no details column — which is how teardown finds them.
    const daysAgoIso = (days: number, hour = 15) => {
      const d = new Date(Date.now() - days * 86_400_000);
      d.setUTCHours(hour, 0, 0, 0);
      return d.toISOString();
    };
    const plusDays = (iso: string, days: number) =>
      new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
    for (const e of ESTIMATES) {
      const [exists] = await tx`
        select 1 from public.estimates
         where facility_id = ${DEMO_FACILITY_ID}
           and activity_log->0->>'seedKey' = ${e.key}`;
      if (exists) continue;

      const seedClient = e.client === undefined ? null : CLIENTS[e.client];
      const clientRowId = seedClient ? clientIds.get(seedClient.key)! : null;
      const ownPets = seedClient
        ? PETS.filter((p) => p.ownerKey === seedClient.key).slice(0, 1)
        : [];
      const petRowIds = ownPets.map((p) => petIds.get(p.key)!);

      const lines = e.lines.map((l) => ({
        ...l,
        total: money(l.amount * l.quantity),
      }));
      const subtotal = money(lines.reduce((sum, l) => sum + l.total, 0));
      const discount = money(e.discount ?? 0);
      const taxAmount = money((subtotal - discount) * TAX_RATE);
      const total = money(subtotal - discount + taxAmount);

      const start = shiftDay(today, e.startInDays);
      const end = e.nights ? shiftDay(start, e.nights) : start;
      const author = "Valérie Lacroix";
      const created = daysAgoIso((e.sentDaysAgo ?? 1) + 1, 13);
      const sent =
        e.sentDaysAgo !== undefined ? daysAgoIso(e.sentDaysAgo) : null;
      const expires = sent ? plusDays(sent, 30) : null;
      const who = seedClient?.client.name ?? e.guest?.name ?? "Customer";

      const log: Record<string, unknown>[] = [
        { at: created, type: "created", actor: author, seedKey: e.key },
      ];
      if (sent) log.push({ at: sent, type: "sent", actor: author });
      const viewed =
        sent &&
        e.state !== "draft" &&
        e.state !== "sent" &&
        e.state !== "expired"
          ? plusDays(sent, 1)
          : null;
      if (viewed) log.push({ at: viewed, type: "viewed", actor: who });

      let converted: { id: string; ref: number } | null = null;
      if (e.state === "converted" && clientRowId) {
        const [b] = await tx`
          select id, ref from public.bookings
           where client_id = ${clientRowId} and start_at > now()
           order by start_at limit 1`;
        converted = b ? { id: b.id, ref: Number(b.ref) } : null;
      }

      const status =
        e.state === "viewed" || e.state === "expired"
          ? "sent"
          : e.state === "converted" && !converted
            ? "accepted"
            : e.state;
      const acceptedAt =
        e.state === "accepted" || e.state === "converted"
          ? plusDays(sent!, 2)
          : null;
      if (acceptedAt)
        log.push({
          at: acceptedAt,
          type: "accepted",
          actor: author,
          detail: `on behalf of ${who}, by phone`,
        });
      const declinedAt = e.state === "declined" ? plusDays(sent!, 3) : null;
      if (declinedAt)
        log.push({
          at: declinedAt,
          type: "declined",
          actor: who,
          detail: e.declineReason,
        });
      const convertedAt = converted ? plusDays(acceptedAt!, 1) : null;
      if (converted)
        log.push({
          at: convertedAt,
          type: "converted",
          actor: author,
          detail: `#${converted.ref}`,
        });

      await tx`
        insert into public.estimates
          (facility_id, client_id, guest, pet_ids, service, service_type,
           start_date, end_date, check_in_time, check_out_time, room_type,
           line_items, subtotal, discount, discount_reason, tax_rate,
           tax_amount, total, deposit_required, status, public_note,
           internal_note, sent_at, sent_via, viewed_at, expires_at,
           accepted_at, accepted_by, accepted_on_behalf, declined_at,
           decline_reason, converted_booking_id, converted_at, activity_log,
           created_by, created_by_name)
        values
          (${DEMO_FACILITY_ID}, ${clientRowId},
           ${e.guest ?? null}::jsonb, ${`{${petRowIds.join(",")}}`}::uuid[],
           ${e.service}, ${e.serviceType ?? null}, ${start}, ${end},
           ${e.service === "boarding" ? "15:00" : "08:00"},
           ${e.service === "boarding" ? "11:00" : "17:00"},
           ${e.service === "boarding" ? (e.serviceType ?? null) : null},
           ${lines}::jsonb, ${subtotal}, ${discount}, ${e.discountReason ?? null},
           ${TAX_RATE}, ${taxAmount}, ${total}, ${e.deposit ?? null}, ${status},
           ${e.publicNote ?? null}, ${e.internalNote ?? null}, ${sent},
           ${sent ? "link" : null}, ${viewed},
           ${e.state === "expired" ? plusDays(sent!, 30) : expires},
           ${acceptedAt}, ${acceptedAt ? author : null}, ${Boolean(acceptedAt)},
           ${declinedAt}, ${e.declineReason ?? null}, ${converted?.id ?? null},
           ${convertedAt}, ${log}::jsonb, ${SEED_ACTOR_SUB}, ${author})`;
      count("estimates");
    }

    // ── Store credit on two accounts ─────────────────────────────────────
    for (const sc of STORE_CREDIT) {
      const clientRowId = clientIds.get(CLIENTS[sc.client].key)!;
      const [exists] = await tx`
        select 1 from public.store_credit_entries
         where client_id = ${clientRowId} and note = ${sc.note}`;
      if (exists) continue;
      await tx`
        insert into public.store_credit_entries
          (facility_id, client_id, amount, reason, note, author_name, created_at)
        values
          (${DEMO_FACILITY_ID}, ${clientRowId}, ${sc.amount}, ${sc.reason},
           ${sc.note}, 'Valérie Lacroix', ${daysAgoIso(sc.daysAgo)})`;
      count("store credit entries");
    }

    // ── Membership plans, and who is on them ─────────────────────────────
    // The plan's editor shape rides in `plan` (as the Plans tab writes it);
    // each carries its seed key there, and a subscription in `detail`.
    const planIds = new Map<string, string>();
    for (const [i, p] of MEMBERSHIP_PLANS.entries()) {
      const [exists] = await tx`
        select id from public.membership_plans
         where facility_id = ${DEMO_FACILITY_ID} and plan->>'demoSeedKey' = ${p.key}`;
      if (exists) {
        planIds.set(p.key, exists.id);
        continue;
      }
      const tail = {
        demoSeedKey: p.key,
        tierLabel: p.tierLabel,
        description: p.description,
        quarterlyPrice: p.quarterlyPrice,
        annualPrice: p.annualPrice,
        credits: p.credits,
        perks: p.perks,
        applicableServices: p.applicableServices,
        isPopular: p.isPopular,
        taxAmount: 0,
        discountRules: [],
        includedItems: [],
        availableOnline: true,
        gracePeriodDays: 7,
        cancellationPolicy: "end_of_cycle",
        badgeColor: "#1668E3",
      };
      const [created] = await tx`
        insert into public.membership_plans
          (facility_id, name, billing_cycle, monthly_price, discount_percent,
           plan, sort_order)
        values
          (${DEMO_FACILITY_ID}, ${p.name}, ${p.billingCycle}, ${p.monthlyPrice},
           ${p.discountPercentage}, ${tail}::jsonb, ${i})
        returning id`;
      planIds.set(p.key, created.id);
      count("membership plans");
    }
    const cycleMonths = (cycle: string) => (cycle === "quarterly" ? 3 : 1);
    const addMonths = (iso: string, n: number) => {
      const d = new Date(`${iso}T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + n);
      return d.toISOString().slice(0, 10);
    };
    for (const m of MEMBERS) {
      const clientRowId = clientIds.get(CLIENTS[m.client].key)!;
      const [exists] = await tx`
        select 1 from public.customer_memberships
         where client_id = ${clientRowId} and detail->>'demoSeedKey' = ${m.key}`;
      if (exists) continue;
      const p = MEMBERSHIP_PLANS.find((x) => x.key === m.plan)!;
      const startsOn = shiftDay(today, -m.startedDaysAgo);
      // The next cycle after today, counted from the start.
      let next = startsOn;
      while (next <= today) next = addMonths(next, cycleMonths(p.billingCycle));
      const price =
        p.billingCycle === "quarterly" ? p.quarterlyPrice : p.monthlyPrice;
      const log: {
        id: string;
        type: string;
        date: string;
        description: string;
      }[] = [
        {
          id: `${m.key}-created`,
          type: "created",
          date: daysAgoIso(m.startedDaysAgo),
          description: `Joined ${p.name}`,
        },
      ];
      if (m.status === "paused") {
        log.push({
          id: `${m.key}-paused`,
          type: "paused",
          date: daysAgoIso(m.changedDaysAgo ?? 0),
          description: "Paused until restarted by hand",
        });
      }
      if (m.status === "cancelled") {
        log.push({
          id: `${m.key}-cancelled`,
          type: "cancelled",
          date: daysAgoIso(m.changedDaysAgo ?? 0),
          description: "Cancelled — moving out of town",
        });
      }
      const detail = {
        demoSeedKey: m.key,
        creditsTotal: p.credits,
        creditsRemaining: Math.max(0, p.credits - (m.client % 3)),
        autoRenew: m.status === "active",
        activityLog: log,
        ...(m.status === "paused"
          ? {
              pauseDetails: {
                mode: "manual",
                pausedAt: daysAgoIso(m.changedDaysAgo ?? 0),
              },
            }
          : {}),
        ...(m.status === "cancelled"
          ? { cancelReason: "Moving out of town" }
          : {}),
      };
      const endsOn =
        m.status === "cancelled"
          ? shiftDay(today, -(m.changedDaysAgo ?? 0) + 20)
          : null;
      await tx`
        insert into public.customer_memberships
          (facility_id, client_id, plan_id, plan_name, status, starts_on,
           ends_on, billing_cycle, price, discount_percent, next_billing_on,
           detail, created_at)
        values
          (${DEMO_FACILITY_ID}, ${clientRowId}, ${planIds.get(p.key)!}, ${p.name},
           ${m.status}, ${startsOn}, ${endsOn}, ${p.billingCycle}, ${price},
           ${p.discountPercentage}, ${m.status === "cancelled" ? null : next},
           ${detail}::jsonb, ${daysAgoIso(m.startedDaysAgo)})`;
      count("memberships");
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
