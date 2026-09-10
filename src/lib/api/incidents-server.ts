import "server-only";

import type { createServerClient } from "@/lib/supabase/server";
import {
  rowToIncident,
  type IncidentRow,
  type PetRef,
  type StaffName,
} from "@/lib/api/mappers/incident";
import type { Incident } from "@/types/incidents";

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

/** `.in()` puts every id in the URL; past ~150 uuids the request is refused. */
const BATCH = 150;

async function inBatches<T>(
  ids: string[],
  read: (slice: string[]) => PromiseLike<{ data: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data } = await read(ids.slice(i, i + BATCH));
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

/**
 * Incident rows as the screens read them: pet uuids become refs and names,
 * staff uuids become names. Both reads pass through RLS, so a pet the caller
 * cannot see is left out rather than shown as a bare number.
 */
export async function hydrateIncidents(
  supabase: Supabase,
  rows: IncidentRow[],
): Promise<Incident[]> {
  const petIds = [...new Set(rows.flatMap((r) => r.pet_ids))];
  const staffIds = [...new Set(rows.flatMap((r) => r.staff_ids ?? []))];

  const [pets, staff] = await Promise.all([
    inBatches<PetRef>(petIds, (slice) =>
      supabase.from("pets").select("id, ref, name").in("id", slice),
    ),
    inBatches<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>(staffIds, (slice) =>
      supabase
        .from("staff")
        .select("id, first_name, last_name")
        .in("id", slice),
    ),
  ]);

  const petMap = new Map(pets.map((p) => [p.id, p]));
  const staffMap = new Map<string, StaffName>(
    staff.map((s) => [
      s.id,
      {
        id: s.id,
        name: [s.first_name, s.last_name].filter(Boolean).join(" "),
      },
    ]),
  );
  return rows.map((row) => rowToIncident(row, petMap, staffMap));
}
