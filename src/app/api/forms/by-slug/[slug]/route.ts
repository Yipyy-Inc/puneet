import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  FORM_SELECT,
  VERSION_SELECT,
  toFormRow,
  type FormRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// ============================================================================
// A published form, by the address a customer was sent.
//
// `/forms/[slug]` read `src/data/forms` and filed answers into a fixture that
// did not outlive a refresh, so a facility could ask a customer for a form and
// never receive it. This is its read; `/api/forms/[id]/submit` is its write.
//
// ── SIGNED IN, AND RLS DECIDES WHICH FORMS ARE VISIBLE ────────────────────
//
// `forms_read` admits a published form to members of its facility and to that
// facility's clients. A slug is unique per facility, not across them, so when
// two businesses share one this picks the facility the caller is a client of,
// and says so rather than guessing when there is none.
//
// ── AND THE CUSTOMER'S OWN PETS COME WITH IT ──────────────────────────────
//
// A per-pet form asks which pets it is for. Those are the signed-in person's
// own client record's pets at that facility, read under their own RLS.
// ============================================================================

export const dynamic = "force-dynamic";

export interface PublicFormResponse {
  form: FormRow;
  pets: { ref: number; name: string; species: string }[];
  /** The caller's own client number at the form's facility, when they have one. */
  clientRef: number | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: formRows, error } = await supabase
    .from("forms")
    .select(`${FORM_SELECT}, facility_id`)
    .eq("slug", slug)
    .eq("status", "published")
    .limit(20);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const forms = (formRows ?? []) as unknown as Tables<"forms">[];
  if (forms.length === 0) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  const { data: ownRows } = viewer.userId
    ? await supabase
        .from("clients")
        .select("id, ref, facility_id")
        .eq("profile_id", viewer.userId)
    : { data: [] };
  const own = (ownRows ?? []) as {
    id: string;
    ref: number;
    facility_id: string;
  }[];

  const form =
    forms.length === 1
      ? forms[0]
      : forms.find((f) => own.some((c) => c.facility_id === f.facility_id));
  if (!form) {
    return NextResponse.json(
      {
        error:
          "More than one business uses this form address. Open the form from your account.",
      },
      { status: 409 },
    );
  }
  const client = own.find((c) => c.facility_id === form.facility_id) ?? null;

  const { data: versionRows } = await supabase
    .from("form_versions")
    .select(VERSION_SELECT)
    .eq("form_id", form.id)
    .not("published_at", "is", null)
    .order("version_number", { ascending: false })
    .limit(1);

  let pets: PublicFormResponse["pets"] = [];
  if (client) {
    const { data: petRows } = await supabase
      .from("pets")
      .select("ref, name, species")
      .eq("client_id", client.id)
      .order("name");
    pets = (petRows ?? []) as PublicFormResponse["pets"];
  }

  const result: PublicFormResponse = {
    form: toFormRow(
      form,
      (versionRows ?? []) as unknown as Tables<"form_versions">[],
    ),
    pets,
    clientRef: client?.ref ?? null,
  };
  return NextResponse.json(result);
}
