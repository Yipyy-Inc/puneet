import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// Whether this facility takes customers who arrive on their own.
//
// Spec 002 phase 5 added `allow_customer_signup` (default FALSE) and
// `set_customer_signup`, and nothing called either — so the answer was "no"
// for every facility on the platform with no way to change it. The /join
// screen would have refused everyone.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// getFacilityContext(), i.e. the caller's membership, which is what
// check:facility-from-session enforces. Taking it from the request here would
// let a facility admin open ANOTHER business's client list to public
// registration — a change to somebody else's front door.
//
// `set_customer_signup` re-checks `settings_general` at that facility in the
// database, so this is the second lock rather than the only one.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getFacilityContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 401 });
  }

  const supabase = await createServerClient();
  // The slug comes back too, so the screen can show the actual address a
  // customer would arrive at rather than describing one in the abstract.
  const { data, error } = await supabase
    .from("facilities")
    .select("slug, allow_customer_signup")
    .eq("id", context.facilityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    facilityName: context.name,
    slug: data?.slug ?? null,
    appDomain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? null,
    allowCustomerSignup: data?.allow_customer_signup === true,
  });
}

const Input = z.object({ allowCustomerSignup: z.boolean() });

export async function PUT(request: NextRequest) {
  const context = await getFacilityContext().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 401 });
  }

  const parsed = Input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Send allowCustomerSignup as true or false." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("set_customer_signup", {
    p_facility_id: context.facilityId,
    p_enabled: parsed.data.allowCustomerSignup,
  });

  if (error) {
    // 42501 is the function refusing somebody without settings_general. That
    // is a permission answer, not a server fault, and saying so lets the screen
    // explain rather than apologise.
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 500 },
    );
  }

  return NextResponse.json({ allowCustomerSignup: data === true });
}
