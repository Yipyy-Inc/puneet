import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorNames } from "@/lib/api/mappers/offboarding";

// ============================================================================
// uuid → display name, for the "who did this" columns.
//
// `completed_by`, `uploaded_by` and `signed_by` all reference auth.users, which
// PostgREST cannot embed. So the id and the name are two queries by
// construction, and this is the second one — batched, never per row.
//
// RLS IS THE FILTER, deliberately. `profiles_read` lets a caller see profiles
// of people who share one of their facilities, so an id that resolves to
// nothing simply does not appear in the map, and the mapper renders no name
// rather than a uuid. That is the correct outcome for someone the caller is not
// entitled to identify — it is not an error to handle.
// ============================================================================

export async function resolveActorNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<ActorNames> {
  if (ids.length === 0) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  const names: ActorNames = {};
  for (const row of data ?? []) {
    // An empty full_name is treated as absent — the UI would render "by " with
    // nothing after it, which reads as a bug rather than as missing data.
    if (row.full_name) names[row.id as string] = row.full_name as string;
  }
  return names;
}
