/**
 * Removes what `run.ts` seeded — and only that — from "Paws & Co — Demo".
 *
 *   bun scripts/demo-seed/teardown.ts --rollback   delete, report, roll back
 *   bun scripts/demo-seed/teardown.ts              delete
 *
 * "What was seeded" is a `demoSeedKey` in `details` (clients, pets, bookings)
 * or a `demo-pawsco-…` / seeded legacy id (staff, rooms, grooming menu). A
 * client the client created, and a booking he made, carry neither and stay.
 * Rows that HANG OFF a seeded booking, pet or client — a payment, a care-log
 * entry, a line item he added to a seeded booking — go with it, found from
 * the database's own foreign keys rather than a list that goes stale.
 *
 * Runs as the connection's owner, not through RLS, because bookings have no
 * DELETE policy at all (a booking is cancelled, not deleted). Every statement
 * is therefore scoped by the demo facility id AND the seed marker, and the
 * facility row is re-checked by id and slug first.
 */
import { SQL, type TransactionSQL } from "bun";
import {
  DEMO_FACILITY_ID,
  DEMO_FACILITY_SLUG,
  SEED_AUTHOR,
  SEED_PREFIX,
} from "./config";
import {
  CATEGORIES,
  DEPARTMENTS,
  GIFT_CARDS,
  INCIDENTS,
  NOTES,
  POSITIONS,
  RETAIL_PURCHASE_ORDER,
  TRAINING_SERIES,
} from "./data";

const ROLLBACK = process.argv.includes("--rollback");
class Rollback extends Error {}

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("SUPABASE_DB_URL is not set.");
const sql = new SQL(url);
const removed: Record<string, number> = {};
const kept: string[] = [];

/** A uuid[] parameter: the driver sends a JS array as a bare comma list. */
const pgArray = (ids: string[]) => `{${ids.join(",")}}`;
/** A text[] literal whose elements may hold commas, quotes or spaces. */
const pgTextArray = (items: string[]) =>
  `{${items.map((v) => `"${v.replace(/[\\"]/g, (c) => `\\${c}`)}"`).join(",")}}`;

type Tx = TransactionSQL;

/** Delete every row, in any table, whose foreign key points at `ids` in `parent`. */
async function deleteChildren(
  tx: Tx,
  parent: string,
  ids: string[],
  depth = 0,
) {
  if (ids.length === 0 || depth > 3) return;
  const refs = await tx`
    select c.conrelid::regclass::text as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = ${parent}::regclass
       and array_length(c.conkey, 1) = 1`;
  for (const { tbl, col } of refs) {
    if (tbl === parent) continue;
    // Grandchildren first, when the child has its own id column.
    const [hasId] = await tx`
      select 1 from information_schema.columns
       where table_schema || '.' || table_name = ${tbl.includes(".") ? tbl : `public.${tbl}`}
         and column_name = 'id'`;
    if (hasId) {
      const childIds = (
        await tx.unsafe(
          `select id::text from ${tbl} where ${col} = any($1::uuid[])`,
          [pgArray(ids)],
        )
      ).map((r: { id: string }) => r.id);
      await deleteChildren(tx, tbl, childIds, depth + 1);
    }
    const res = await tx.unsafe(
      `delete from ${tbl} where ${col} = any($1::uuid[])`,
      [pgArray(ids)],
    );
    if (res.count) removed[tbl] = (removed[tbl] ?? 0) + res.count;
  }
}

try {
  await sql.begin(async (tx) => {
    const [facility] = await tx`
      select slug from public.facilities where id = ${DEMO_FACILITY_ID}`;
    if (!facility || facility.slug !== DEMO_FACILITY_SLUG) {
      throw new Error(
        `Facility ${DEMO_FACILITY_ID} is not ${DEMO_FACILITY_SLUG}. Refusing.`,
      );
    }

    // ── Notes and incidents the seed wrote ────────────────────────────────
    // Neither has a foreign key to what it is about (notes are polymorphic;
    // incidents keep pets in an array), so deleting a seeded pet would leave
    // them behind. Matched by their exact seeded words, never by facility
    // alone: the client's own notes and incidents stay.
    const notes = await tx`
      delete from public.notes
       where facility_id = ${DEMO_FACILITY_ID}
         and content = any(${pgTextArray(NOTES.map((n) => n.content))}::text[])`;
    if (notes.count) removed["public.notes"] = notes.count;
    const incidents = await tx`
      select id, ref from public.incidents
       where facility_id = ${DEMO_FACILITY_ID}
         and title = any(${pgTextArray(INCIDENTS.map((i) => i.title))}::text[])`;
    for (const inc of incidents) {
      const tasks = await tx`
        delete from public.facility_tasks
         where facility_id = ${DEMO_FACILITY_ID}
           and source = 'manual' and source_ref like ${`incident:${inc.ref}:%`}`;
      if (tasks.count)
        removed["public.facility_tasks"] =
          (removed["public.facility_tasks"] ?? 0) + tasks.count;
    }
    if (incidents.length) {
      const gone = await tx`
        delete from public.incidents
         where id = any(${pgArray(incidents.map((i: { id: string }) => i.id))}::uuid[])`;
      removed["public.incidents"] = gone.count;
    }

    const seeded = async (table: string): Promise<string[]> =>
      (
        await tx.unsafe(
          `select id::text from public.${table}
            where facility_id = $1 and details->>'demoSeedKey' like $2`,
          [DEMO_FACILITY_ID, `${SEED_PREFIX}-%`],
        )
      ).map((r: { id: string }) => r.id);

    // ── Estimates and vaccination records the seed wrote ────────────────────
    // An estimate carries its seed key in the first entry of its history (the
    // table has no details column); a guest estimate hangs off no seeded row,
    // so it is found here or not at all. A vaccination record the seed wrote
    // names the seed as its author.
    const estimatesGone = await tx`
      delete from public.estimates
       where facility_id = ${DEMO_FACILITY_ID}
         and activity_log->0->>'seedKey' like ${`${SEED_PREFIX}-%`}`;
    if (estimatesGone.count) removed["public.estimates"] = estimatesGone.count;
    const vaccinationsGone = await tx`
      delete from public.pet_vaccinations
       where facility_id = ${DEMO_FACILITY_ID} and created_by = ${SEED_AUTHOR}`;
    if (vaccinationsGone.count)
      removed["public.pet_vaccinations"] = vaccinationsGone.count;

    // ── Training the seed created ───────────────────────────────────────────
    // A series is found by its seeded name. The bookings its enrolments made
    // carry no seed key — enroll_in_training_series wrote them — and
    // `training_series_session_id` is ON DELETE SET NULL, so deleting the
    // series would orphan them rather than remove them. They go first,
    // unless a payment is on one (payments are append-only).
    const seriesIds = (
      await tx`
        select id::text from public.training_series
         where facility_id = ${DEMO_FACILITY_ID}
           and name = any(${pgTextArray(TRAINING_SERIES.map((s) => s.name))}::text[])`
    ).map((r: { id: string }) => r.id);
    if (seriesIds.length) {
      const trainingBookings = (
        await tx.unsafe(
          `select b.id::text from public.bookings b
             join public.training_series_sessions s on s.id = b.training_series_session_id
            where s.series_id = any($1::uuid[])
              and not exists (select 1 from public.payments p where p.booking_id = b.id)`,
          [pgArray(seriesIds)],
        )
      ).map((r: { id: string }) => r.id);
      await deleteChildren(tx, "public.bookings", trainingBookings);
      const tb = await tx.unsafe(
        `delete from public.bookings where id = any($1::uuid[])`,
        [pgArray(trainingBookings)],
      );
      if (tb.count)
        removed["public.bookings"] =
          (removed["public.bookings"] ?? 0) + tb.count;
      const ts = await tx.unsafe(
        `delete from public.training_series where id = any($1::uuid[])
            and not exists (
              select 1 from public.bookings b
                join public.training_series_sessions s on s.id = b.training_series_session_id
               where s.series_id = training_series.id)`,
        [pgArray(seriesIds)],
      );
      if (ts.count) removed["public.training_series"] = ts.count;
    }

    // ── Memberships the seed wrote ──────────────────────────────────────────
    // Found by the seed key in the subscription's `detail` and the plan's
    // `plan`. A client the client put on a seeded plan keeps their row: the
    // plan goes (plan_id is ON DELETE SET NULL) and they stay on its name.
    const membersGone = await tx`
      delete from public.customer_memberships
       where facility_id = ${DEMO_FACILITY_ID}
         and detail->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (membersGone.count)
      removed["public.customer_memberships"] = membersGone.count;
    const plansGone = await tx`
      delete from public.membership_plans
       where facility_id = ${DEMO_FACILITY_ID}
         and plan->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (plansGone.count) removed["public.membership_plans"] = plansGone.count;
    // A seeded promo code; its uses keep their code (promo_code_id SET NULL).
    const promosGone = await tx`
      delete from public.promo_codes
       where facility_id = ${DEMO_FACILITY_ID}
         and detail->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (promosGone.count) removed["public.promo_codes"] = promosGone.count;
    // The seeded shelf: the open order (by its notes), the suppliers and the
    // products by their seed key. A product's stock ledger goes with it; a
    // sale the client rang up keeps its lines (they are copied onto the sale).
    const posGone = await tx`
      delete from public.retail_purchase_orders
       where facility_id = ${DEMO_FACILITY_ID}
         and notes = ${RETAIL_PURCHASE_ORDER.notes}`;
    if (posGone.count) removed["public.retail_purchase_orders"] = posGone.count;
    const suppliersGone = await tx`
      delete from public.retail_suppliers
       where facility_id = ${DEMO_FACILITY_ID}
         and detail->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (suppliersGone.count)
      removed["public.retail_suppliers"] = suppliersGone.count;
    const productsGone = await tx`
      delete from public.retail_products
       where facility_id = ${DEMO_FACILITY_ID}
         and detail->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (productsGone.count)
      removed["public.retail_products"] = productsGone.count;

    // ── Packages the seed sold, and the bundles it created ─────────────────
    // A seeded sale by its legacy id, with its pool and pass entries (neither
    // is money-guarded; the sale's PAYMENT stays, below). A seeded bundle goes
    // only when no customer package points at it — one the client sold
    // himself keeps it — and its lines first, which reference it.
    const soldIds = (
      await tx`
        select id::text from public.customer_packages
         where facility_id = ${DEMO_FACILITY_ID}
           and legacy_id like ${`${SEED_PREFIX}-cpkg-%`}`
    ).map((r: { id: string }) => r.id);
    await deleteChildren(tx, "public.customer_packages", soldIds);
    const soldGone = await tx.unsafe(
      `delete from public.customer_packages where id = any($1::uuid[])`,
      [pgArray(soldIds)],
    );
    if (soldGone.count) removed["public.customer_packages"] = soldGone.count;
    const bundleIds = (
      await tx`
        select p.id::text from public.prepaid_packages p
         where p.facility_id = ${DEMO_FACILITY_ID}
           and p.legacy_id like ${`${SEED_PREFIX}-pkg-%`}
           and not exists (
             select 1 from public.customer_packages cp where cp.package_id = p.id)`
    ).map((r: { id: string }) => r.id);
    await deleteChildren(tx, "public.prepaid_packages", bundleIds);
    const bundlesGone = await tx.unsafe(
      `delete from public.prepaid_packages where id = any($1::uuid[])`,
      [pgArray(bundleIds)],
    );
    if (bundlesGone.count)
      removed["public.prepaid_packages"] = bundlesGone.count;

    // ── Report cards, gift cards and the schedule ─────────────────────────
    // A seeded report card by the key in its `input` (sent ones too: this
    // runs as the owner). A seeded gift card by its code, ledger first — the
    // ledger refuses UPDATE, not DELETE. Shifts in the seeded departments
    // held by seeded staff or nobody (the client's own shifts stay), then the
    // department memberships, pay, positions and departments nothing else
    // uses. Deleting a shift writes an audit_log row; that log is permanent.
    const todosGone = await tx`
      delete from public.facility_tasks
       where facility_id = ${DEMO_FACILITY_ID}
         and source = 'manual' and source_ref like ${`${SEED_PREFIX}-todo-%`}`;
    if (todosGone.count)
      removed["public.facility_tasks"] =
        (removed["public.facility_tasks"] ?? 0) + todosGone.count;
    const cardsGone = await tx`
      delete from public.report_cards
       where facility_id = ${DEMO_FACILITY_ID}
         and input->>'demoSeedKey' like ${`${SEED_PREFIX}-%`}`;
    if (cardsGone.count) removed["public.report_cards"] = cardsGone.count;
    const giftIds = (
      await tx`
        select id::text from public.gift_cards
         where facility_id = ${DEMO_FACILITY_ID}
           and code = any(${pgTextArray(GIFT_CARDS.map((g) => g.code))}::text[])`
    ).map((r: { id: string }) => r.id);
    await deleteChildren(tx, "public.gift_cards", giftIds);
    const giftsGone = await tx.unsafe(
      `delete from public.gift_cards where id = any($1::uuid[])`,
      [pgArray(giftIds)],
    );
    if (giftsGone.count) removed["public.gift_cards"] = giftsGone.count;
    const deptIds = (
      await tx`
        select id::text from public.facility_departments
         where facility_id = ${DEMO_FACILITY_ID}
           and name = any(${pgTextArray(DEPARTMENTS.map((d) => d.name))}::text[])`
    ).map((r: { id: string }) => r.id);
    if (deptIds.length) {
      const shiftsGone = await tx.unsafe(
        `delete from public.staff_shifts
          where department_id = any($1::uuid[])
            and (staff_id is null or staff_id in (
              select id from public.staff
               where facility_id = $2 and legacy_id like $3))`,
        [pgArray(deptIds), DEMO_FACILITY_ID, `${SEED_PREFIX}-staff-%`],
      );
      if (shiftsGone.count) removed["public.staff_shifts"] = shiftsGone.count;
      const membersGone = await tx.unsafe(
        `delete from public.staff_departments
          where department_id = any($1::uuid[])
            and staff_id in (select id from public.staff
                              where facility_id = $2 and legacy_id like $3)`,
        [pgArray(deptIds), DEMO_FACILITY_ID, `${SEED_PREFIX}-staff-%`],
      );
      if (membersGone.count)
        removed["public.staff_departments"] = membersGone.count;
      const freePositions = (
        await tx.unsafe(
          `select p.id::text from public.facility_positions p
            where p.department_id = any($1::uuid[])
              and p.name = any($2::text[])
              and not exists (select 1 from public.staff_shifts s where s.position_id = p.id)`,
          [pgArray(deptIds), pgTextArray(POSITIONS.map((p) => p.name))],
        )
      ).map((r: { id: string }) => r.id);
      await tx.unsafe(
        `delete from public.facility_position_pay where position_id = any($1::uuid[])`,
        [pgArray(freePositions)],
      );
      const positionsGone = await tx.unsafe(
        `delete from public.facility_positions where id = any($1::uuid[])`,
        [pgArray(freePositions)],
      );
      if (positionsGone.count)
        removed["public.facility_positions"] = positionsGone.count;
      const deptsGone = await tx.unsafe(
        `delete from public.facility_departments d
          where d.id = any($1::uuid[])
            and not exists (select 1 from public.facility_positions p where p.department_id = d.id)
            and not exists (select 1 from public.staff_shifts s where s.department_id = d.id)
            and not exists (select 1 from public.staff_departments sd where sd.department_id = d.id)`,
        [pgArray(deptIds)],
      );
      if (deptsGone.count)
        removed["public.facility_departments"] = deptsGone.count;
    }

    // ── MONEY STAYS ─────────────────────────────────────────────────────────
    // `payments` is append-only (`prevent_money_mutation` refuses DELETE even
    // for the owner), and that is a guard to respect, not to route around. So
    // this removes what `purge_e2e_bookings` would: money-free rows. A PAID
    // seeded visit stays, with the client and pet it belongs to; a seeded pet
    // or client that one of the client's OWN bookings uses stays too.
    const idsOf = (rows: { id: string }[]) => rows.map((r) => r.id);
    const bookingIds = await seeded("bookings");
    const paid = idsOf(
      await tx.unsafe(
        `select distinct booking_id::text as id from public.payments
          where booking_id = any($1::uuid[])`,
        [pgArray(bookingIds)],
      ),
    );
    const deletable = bookingIds.filter((id) => !paid.includes(id));
    await deleteChildren(tx, "public.bookings", deletable);
    const gone = await tx.unsafe(
      `delete from public.bookings where id = any($1::uuid[])`,
      [pgArray(deletable)],
    );
    if (gone.count)
      removed["public.bookings"] =
        (removed["public.bookings"] ?? 0) + gone.count;

    const pets = idsOf(
      await tx.unsafe(
        `select id::text from public.pets
          where id = any($1::uuid[])
            and not exists (select 1 from public.booking_pets bp where bp.pet_id = pets.id)`,
        [pgArray(await seeded("pets"))],
      ),
    );
    await deleteChildren(tx, "public.pets", pets);
    const petsGone = await tx.unsafe(
      `delete from public.pets where id = any($1::uuid[])`,
      [pgArray(pets)],
    );
    if (petsGone.count) removed["public.pets"] = petsGone.count;

    const clients = idsOf(
      await tx.unsafe(
        `select id::text from public.clients c
          where c.id = any($1::uuid[])
            and not exists (select 1 from public.bookings b where b.client_id = c.id)
            and not exists (select 1 from public.payments p where p.client_id = c.id)
            -- Store credit is append-only too (prevent_money_mutation).
            and not exists (select 1 from public.store_credit_entries s where s.client_id = c.id)
            and not exists (select 1 from public.pets p where p.client_id = c.id)`,
        [pgArray(await seeded("clients"))],
      ),
    );
    await deleteChildren(tx, "public.clients", clients);
    const clientsGone = await tx.unsafe(
      `delete from public.clients where id = any($1::uuid[])`,
      [pgArray(clients)],
    );
    if (clientsGone.count) removed["public.clients"] = clientsGone.count;

    kept.push(
      `${paid.length} paid seeded booking(s), with their payments, clients and pets — payments are append-only`,
    );

    // ── Configuration goes only when nothing uses it ────────────────────────
    // A room, a grooming service or a station is referenced by the visits
    // that stay (the paid ones above, and anything the client booked), and
    // deleting it would cascade into THEIR stays and appointments. So each is
    // removed only if no row anywhere still points at it.
    const unreferenced = async (parent: string, ids: string[]) => {
      if (ids.length === 0) return ids;
      const refs = await tx`
        select c.conrelid::regclass::text as tbl, a.attname as col
          from pg_constraint c
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
         where c.contype = 'f' and c.confrelid = ${parent}::regclass
           and array_length(c.conkey, 1) = 1`;
      let free = ids;
      for (const { tbl, col } of refs) {
        const used = idsOf(
          await tx.unsafe(
            `select distinct ${col}::text as id from ${tbl} where ${col} = any($1::uuid[])`,
            [pgArray(free)],
          ),
        );
        free = free.filter((id) => !used.includes(id));
      }
      return free;
    };

    const byLegacy = async (table: string, where: string, param: string) => {
      const ids = idsOf(
        await tx.unsafe(
          `select id::text from public.${table} where facility_id = $1 and ${where}`,
          [DEMO_FACILITY_ID, param],
        ),
      );
      const free = await unreferenced(`public.${table}`, ids);
      const res = await tx.unsafe(
        `delete from public.${table} where id = any($1::uuid[])`,
        [pgArray(free)],
      );
      if (res.count)
        removed[`public.${table}`] =
          (removed[`public.${table}`] ?? 0) + res.count;
      if (free.length < ids.length) {
        kept.push(
          `${ids.length - free.length} seeded ${table} row(s) still in use`,
        );
      }
    };

    await byLegacy("staff", "legacy_id like $2", `${SEED_PREFIX}-staff-%`);
    await byLegacy(
      "task_templates",
      "legacy_id like $2",
      `${SEED_PREFIX}-task-%`,
    );
    await byLegacy(
      "grooming_add_ons",
      "legacy_id like $2",
      `${SEED_PREFIX}-addon-%`,
    );
    await byLegacy(
      "grooming_services",
      "legacy_id like $2",
      `${SEED_PREFIX}-groom-%`,
    );
    await byLegacy(
      "grooming_stations",
      "legacy_id like $2",
      `${SEED_PREFIX}-station-%`,
    );
    for (const c of CATEGORIES) {
      await byLegacy("facility_rooms", "legacy_id like $2", `${c.legacyId}-%`);
      await byLegacy("room_categories", "legacy_id = $2", c.legacyId);
    }

    // The per-location daycare price stays: it is configuration, the client
    // may well have changed it, and a facility with no price is a broken one.

    if (ROLLBACK) throw new Rollback();
  });
  console.log("removed:");
} catch (error) {
  if (!(error instanceof Rollback)) {
    await sql.close();
    throw error;
  }
  console.log("removed, then ROLLED BACK (--rollback):");
}
for (const [t, n] of Object.entries(removed))
  console.log(`  ${t.padEnd(40)} ${n}`);
if (Object.keys(removed).length === 0)
  console.log("  nothing seeded to remove");
for (const k of kept) console.log(`kept: ${k}`);
await sql.close();
