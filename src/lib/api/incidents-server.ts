import "server-only";

import type { createServerClient } from "@/lib/supabase/server";
import {
  rowToIncident,
  type IncidentRow,
  type PetRef,
  type StaffName,
} from "@/lib/api/mappers/incident";
import {
  INCIDENT_CARE_ITEM_SELECT,
  INCIDENT_CARE_LOG_SELECT,
  toIncidentCare,
  type IncidentCareItemRow,
  type IncidentCareLogRow,
} from "@/lib/api/mappers/incident-care";
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
  const incidentIds = rows.map((r) => r.id);
  const staffIds = [...new Set(rows.flatMap((r) => r.staff_ids ?? []))];

  // In-stay care passes through RLS too: an owner reads none of it, and a
  // caretaker with view_pet_records reads what they are to give.
  const [pets, staff, careItems, careLogs] = await Promise.all([
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
    inBatches<IncidentCareItemRow>(incidentIds, (slice) =>
      supabase
        .from("incident_care_items")
        .select(INCIDENT_CARE_ITEM_SELECT)
        .in("incident_id", slice)
        .order("created_at", { ascending: true }),
    ),
    inBatches<IncidentCareLogRow>(incidentIds, (slice) =>
      supabase
        .from("incident_care_logs")
        .select(INCIDENT_CARE_LOG_SELECT)
        .in("incident_id", slice)
        .order("logged_at", { ascending: true }),
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
  return rows.map((row) =>
    rowToIncident(
      row,
      petMap,
      staffMap,
      toIncidentCare(
        String(row.ref),
        careItems.filter((i) => i.incident_id === row.id),
        careLogs.filter((l) => l.incident_id === row.id),
      ),
    ),
  );
}
