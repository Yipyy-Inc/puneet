import type { createServerClient } from "@/lib/supabase/server";
import {
  ESTIMATE_SELECT,
  rowToEstimate,
  type EstimateRow,
  type PetLookup,
} from "@/lib/api/mappers/estimate";
import type { Estimate } from "@/types/booking";

// ============================================================================
// Read estimates and hydrate their pets, for the three estimate routes.
//
// `pet_ids` is a uuid array, which PostgREST cannot embed through, so the pets
// are fetched in one second query for every estimate on the page — never one
// per estimate. The read is RLS-scoped like the first: a pet the caller may
// not see simply does not appear on the estimate.
// ============================================================================

type Supabase = Awaited<ReturnType<typeof createServerClient>>;
/**
 * The filters the three routes apply — stated structurally, because the
 * generated builder type does not survive being passed through a callback.
 */
export interface EstimateQuery {
  eq(column: string, value: unknown): EstimateQuery;
  neq(column: string, value: unknown): EstimateQuery;
  match(query: Record<string, unknown>): EstimateQuery;
  order(
    column: string,
    options: { ascending: boolean },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export async function loadEstimates(
  supabase: Supabase,
  refine: (query: EstimateQuery) => EstimateQuery,
): Promise<{ data: Estimate[]; error: string | null }> {
  const base = supabase.from("estimates").select(ESTIMATE_SELECT);
  const { data, error } = await refine(base as unknown as EstimateQuery).order(
    "created_at",
    { ascending: false },
  );
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as unknown as EstimateRow[];
  const petIds = [...new Set(rows.flatMap((r) => r.pet_ids ?? []))];
  const pets: PetLookup = new Map();
  if (petIds.length > 0) {
    const { data: petRows } = await supabase
      .from("pets")
      .select("id, ref, name")
      .in("id", petIds);
    for (const p of (petRows ?? []) as {
      id: string;
      ref: number;
      name: string;
    }[]) {
      pets.set(p.id, { ref: p.ref, name: p.name });
    }
  }

  const now = Date.now();
  return {
    data: rows.map((row) => rowToEstimate(row, pets, now)),
    error: null,
  };
}
