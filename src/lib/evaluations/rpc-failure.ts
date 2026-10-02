import "server-only";

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// An evaluation function's refusal, as an answer (20261002195001). Each one
// raises a sentence for a person and a hint the screen can act on:
//
//   42501                         not part of your role here       403
//   P0002 evaluation_not_found    no such evaluation or pet        404
//   55000 evaluation_state        already sent, not in review …    409
//   23514 evaluation_incomplete   required answers missing         422
//   22023 evaluation_invalid      a value in a shape it never is   422
//   23503                         a pet that is not on the booking 400
// ============================================================================

const STATUS: Record<string, number> = {
  "42501": 403,
  P0002: 404,
  "55000": 409,
  "23514": 422,
  "22023": 422,
  "23503": 400,
};

export function evaluationFailure(error: PostgrestError): NextResponse {
  const status = STATUS[error.code] ?? 500;
  const message = error.message?.trim() ?? "";
  // Postgres's own wording names a constraint or a policy; ours is a sentence.
  const fromPostgres = /violates|row-level security|permission denied/.test(
    message,
  );
  return NextResponse.json(
    {
      error:
        status === 500 || fromPostgres || !message
          ? "That evaluation could not be saved."
          : message,
      reason: error.hint || null,
    },
    { status },
  );
}
