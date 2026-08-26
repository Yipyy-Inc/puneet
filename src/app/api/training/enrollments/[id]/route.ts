import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

export const dynamic = "force-dynamic";

/**
 * Withdraw from a series. `withdraw_from_training_series` cancels the
 * enrollment and every still-upcoming booking it produced -- past/completed
 * sessions are left alone. RLS (training_series_enrollments_update) is what
 * actually decides who may call this: staff with create_bookings/
 * training_manage_programs, or the client who owns the enrollment.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("withdraw_from_training_series", {
    p_enrollment_id: id,
  });

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this enrollment.",
      duplicate: "",
    });
  }

  return NextResponse.json({ ok: true });
}
