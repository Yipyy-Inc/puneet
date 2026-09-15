import { NextResponse, type NextRequest } from "next/server";

import { resolvePetNames } from "@/lib/api/form-pets";
import {
  SUBMISSION_SELECT,
  toSubmissionRow,
  type SubmissionRecord,
  type SubmissionRow,
} from "@/lib/api/mappers/form";
import type { MissingForm } from "@/lib/forms/requirements";
import { FORM_REQUIREMENT_SERVICES } from "@/lib/settings/form-settings";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// One pet's forms, as its owner sees them.
//
// The customer pet page listed facility 11's fixture forms and called every
// "pet" form the owner had not filled in on this browser "required". Now:
//
//   required     what the database says is still missing for this pet, asked
//                through `client_missing_forms` for every standard service at
//                the two stages a customer can act on (before booking, before
//                check-in) — the same reader the booking and check-in gates use
//   forms        the facility's published forms, through `forms_read`
//   submissions  this pet's own submissions, through `form_submissions_read`
//
// Everything is read under the caller's own RLS through the pet row, so a ref
// that is not theirs is a 404 and there is no facility in the request to get
// wrong (same shape as /api/customer/facility).
// ============================================================================

export const dynamic = "force-dynamic";

export interface PetRequiredForm {
  formId: string;
  name: string;
  slug: string;
  /** "block" when any service refuses without it, otherwise "warn". */
  enforcement: "block" | "warn";
  services: string[];
}

export interface PetFormsPayload {
  required: PetRequiredForm[];
  forms: { id: string; name: string; slug: string; type: string }[];
  submissions: SubmissionRow[];
}

const CUSTOMER_STAGES = ["before_booking", "before_checkin"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isInteger(numericRef)) {
    return NextResponse.json({ error: "Invalid pet id." }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, client_id, facility_id")
    .eq("ref", numericRef)
    .maybeSingle();
  if (petError) {
    return NextResponse.json({ error: petError.message }, { status: 500 });
  }
  if (!pet?.client_id) {
    return NextResponse.json({ error: "Pet not found." }, { status: 404 });
  }

  const askMissing = supabase.rpc.bind(supabase) as unknown as (
    fn: "client_missing_forms",
    args: {
      p_client_id: string;
      p_pet_ids: string[];
      p_service: string;
      p_stage: string;
    },
  ) => PromiseLike<{
    data: MissingForm[] | null;
    error: { message: string } | null;
  }>;

  const asks = FORM_REQUIREMENT_SERVICES.flatMap((service) =>
    CUSTOMER_STAGES.map(async (stage) => {
      const { data, error } = await askMissing("client_missing_forms", {
        p_client_id: pet.client_id as string,
        p_pet_ids: [pet.id],
        p_service: service,
        p_stage: stage,
      });
      if (error) throw new Error(error.message);
      return { service, missing: data ?? [] };
    }),
  );

  const [answers, formsResult, submissionsResult] = await Promise.all([
    Promise.all(asks).catch((failure: Error) => failure),
    supabase
      .from("forms")
      .select("id, name, slug, type")
      .eq("facility_id", pet.facility_id)
      .eq("status", "published")
      .order("name"),
    supabase
      .from("form_submissions")
      .select(SUBMISSION_SELECT)
      .eq("pet_id", pet.id)
      .order("submitted_at", { ascending: false })
      .limit(100),
  ]);

  if (answers instanceof Error) {
    return NextResponse.json({ error: answers.message }, { status: 500 });
  }
  if (formsResult.error || submissionsResult.error) {
    const message =
      formsResult.error?.message ?? submissionsResult.error?.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // One entry per form, however many services and stages ask for it.
  const byForm = new Map<string, PetRequiredForm>();
  for (const { service, missing } of answers) {
    for (const form of missing) {
      const entry = byForm.get(form.form_id) ?? {
        formId: form.form_id,
        name: form.form_name,
        slug: form.form_slug,
        enforcement: "warn" as const,
        services: [],
      };
      if (form.enforcement === "block") entry.enforcement = "block";
      if (!entry.services.includes(service)) entry.services.push(service);
      byForm.set(form.form_id, entry);
    }
  }

  const rows = (submissionsResult.data ?? []) as unknown as SubmissionRecord[];
  const petNames = await resolvePetNames(supabase, rows);

  const payload: PetFormsPayload = {
    required: [...byForm.values()].sort((a, b) => a.name.localeCompare(b.name)),
    forms: (formsResult.data ?? []) as PetFormsPayload["forms"],
    submissions: rows.map((row) => toSubmissionRow(row, petNames)),
  };
  return NextResponse.json(payload);
}
