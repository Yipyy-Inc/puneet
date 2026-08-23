import "server-only";

import type { createServerClient } from "@/lib/supabase/server";
import type { SubmissionRecord } from "@/lib/api/mappers/form";

type Client = Awaited<ReturnType<typeof createServerClient>>;

// ============================================================================
// Pet names for a page of submissions.
//
// ── WHY NOT AN EMBED ──────────────────────────────────────────────────────
//
// `form_submissions.pet_id` carries no foreign key, deliberately: a pet may be
// removed and the answers still have to be readable. PostgREST embeds only what
// a constraint describes, so `pets:pet_id(name)` does not merely come back
// empty — it fails the entire select with "Could not find a relationship", and
// takes down every route that shares the select string. That is how one added
// column broke submitting a form.
//
// One extra query for the whole page, keyed by the ids actually present, is the
// same shape `refsForBookings` uses on the gift-card ledger for the same
// reason. A pet that has since been removed simply has no name here.
// ============================================================================

export async function resolvePetNames(
  supabase: Client,
  rows: Pick<SubmissionRecord, "pet_id">[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.map((r) => r.pet_id).filter((id): id is string => !!id)),
  ];
  if (ids.length === 0) return new Map();

  const { data } = await supabase.from("pets").select("id, name").in("id", ids);

  return new Map(
    ((data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  );
}
