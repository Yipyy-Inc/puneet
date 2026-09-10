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
import { DEMO_FACILITY_ID, DEMO_FACILITY_SLUG, SEED_PREFIX } from "./config";
import { CATEGORIES } from "./data";

const ROLLBACK = process.argv.includes("--rollback");
class Rollback extends Error {}

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("SUPABASE_DB_URL is not set.");
const sql = new SQL(url);
const removed: Record<string, number> = {};
const kept: string[] = [];

/** A uuid[] parameter: the driver sends a JS array as a bare comma list. */
const pgArray = (ids: string[]) => `{${ids.join(",")}}`;

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

    const seeded = async (table: string): Promise<string[]> =>
      (
        await tx.unsafe(
          `select id::text from public.${table}
            where facility_id = $1 and details->>'demoSeedKey' like $2`,
          [DEMO_FACILITY_ID, `${SEED_PREFIX}-%`],
        )
      ).map((r: { id: string }) => r.id);

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
    if (gone.count) removed["public.bookings"] = gone.count;

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
