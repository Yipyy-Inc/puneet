import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// A customer registering at the facility whose page they are on.
//
// Spec 002 phase 5. `link_client_record` could only ever CLAIM a record a
// facility had already created; nothing could create one for somebody arriving
// at a facility for the first time, because until now there was one facility
// and everyone was already in it.
//
// ── THE FACILITY COMES FROM THE HOSTNAME, NOT THE BODY ────────────────────
//
// `x-facility-slug`, stamped by proxy.ts from the Host header and overwritten
// unconditionally so a client cannot supply its own. Registering is the one
// customer action that NAMES a facility, which makes it the one place this
// could have gone wrong — a facility id in the request body would let anyone
// insert themselves into any facility's client list.
//
// It is still not the security boundary. `register_client` re-reads the slug,
// the email comes off the caller's verified profile rather than the request,
// and `allow_customer_signup` decides the rest — all in the database.
//
// ── WHAT THE CALLER MAY STATE ─────────────────────────────────────────────
//
// Their name and phone number. Not their email: who they are comes from the
// session, so a caller cannot register a record against somebody else's
// address and inherit whatever that facility had waiting for it.
// ============================================================================

export const dynamic = "force-dynamic";

const RegisterInput = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  phone: z.string().trim().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const slug = (await headers()).get("x-facility-slug");
  if (!slug) {
    // The apex has no facility to register at, and guessing one would be the
    // whole defect this route exists to avoid.
    return NextResponse.json(
      { error: "Open your facility's own web address to register." },
      { status: 400 },
    );
  }

  const parsed = RegisterInput.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("register_client", {
    p_facility_slug: slug,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? null,
  });

  if (error) {
    // 42501 here is "this facility does not accept online registration", which
    // is a business decision rather than a permission failure on the caller's
    // part — so the function's own sentence is worth more than a generic one.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P0002") {
      return NextResponse.json({ error: "No such facility." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { clientId: data, facilitySlug: slug },
    { status: 201 },
  );
}
