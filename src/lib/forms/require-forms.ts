import { NextResponse } from "next/server";

import {
  FORM_OVERRIDE_REASON_REQUIRED,
  type MissingForm,
} from "@/lib/forms/requirements";
import type { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The forms a facility requires before approval or check-in, asked by the
// route that makes that change.
//
// The database answers (public.booking_missing_forms, under the caller's own
// RLS). A form set to warn never stops anything. For a form set to block, staff
// either give a reason, saved by public.record_form_requirement_override with
// who gave it, or get 422 with the missing forms and the code the screens act
// on. Before booking is enforced inside create_booking instead.
// ============================================================================

export type FormStage = "before_approval" | "before_checkin";

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

type UntypedRpc = (
  fn: "booking_missing_forms" | "record_form_requirement_override",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

/** A refusal to return, or null when the change may go ahead. */
export async function requireForms(
  supabase: ServerClient,
  bookingId: string,
  stage: FormStage,
  reason: string | undefined,
): Promise<NextResponse | null> {
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

  const asked = await rpc("booking_missing_forms", {
    p_booking_id: bookingId,
    p_stage: stage,
  });
  if (asked.error) {
    return NextResponse.json({ error: asked.error.message }, { status: 500 });
  }

  const missing = ((asked.data ?? []) as MissingForm[]).filter(
    (form) => form.enforcement === "block",
  );
  if (missing.length === 0) return null;

  const why = reason?.trim();
  if (!why) {
    const names = [...new Set(missing.map((form) => form.form_name))].join(
      ", ",
    );
    return NextResponse.json(
      {
        error: `Say why this goes ahead without ${names}.`,
        code: FORM_OVERRIDE_REASON_REQUIRED,
        missing,
      },
      { status: 422 },
    );
  }

  const saved = await rpc("record_form_requirement_override", {
    p_booking_id: bookingId,
    p_stage: stage,
    p_reason: why,
  });
  if (saved.error) {
    const denied = saved.error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "Not allowed to go ahead without the required forms."
          : saved.error.message,
      },
      { status: denied ? 403 : 422 },
    );
  }
  return null;
}
