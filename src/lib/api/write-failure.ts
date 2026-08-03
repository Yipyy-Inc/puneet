import "server-only";

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// Turning a Postgres refusal into an answer a person can act on.
//
// Shared by the client and pet routes because they refuse for the same reasons
// and there is no version of this worth writing twice.
//
// 42501 is BOTH an RLS refusal and the errcode the write-integrity triggers
// raise (20260803090000), which is deliberate: from the caller's side "you may
// not touch this row" and "you may not move it to another facility" are the
// same class of answer, and the trigger's own message says which.
// ============================================================================

export function writeFailure(
  error: PostgrestError,
  context: { duplicate: string; denied: string },
): NextResponse {
  if (error.code === "42501") {
    // The trigger writes for a person; RLS does not. Prefer the specific one.
    const message = error.message?.trim();
    return NextResponse.json(
      {
        error:
          message && !message.includes("row-level security")
            ? message
            : context.denied,
      },
      { status: 403 },
    );
  }
  if (error.code === "23505") {
    return NextResponse.json({ error: context.duplicate }, { status: 409 });
  }
  if (error.code === "23503") {
    return NextResponse.json(
      { error: "That record refers to something that does not exist." },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}
