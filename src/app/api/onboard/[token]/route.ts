import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The hire's side. Unauthenticated, token-bearing, and RPC-only.
//
// Every call here is `.rpc(...)`. There is no `.from("onboarding_instances")`
// anywhere in this file and there cannot be one that works: the anon role has
// no policy on those tables (20260803180000). That is the design — a policy of
// the shape "anon may read where token = ?" is a table-scan oracle, and the
// only safe shape is a function that takes the token as an argument, hashes it,
// and hits a unique index.
//
// The client is the ordinary cookie-bound one, NOT a second anon factory: a
// hire opening this link from an email has no session, so that client already
// IS anon. Adding a separate always-anon client would be a second way to say
// the same thing, and the wrong one to reach for by accident.
//
// THE TOKEN IS IN THE PATH, not a query string or a body. It still ends up in
// the browser's history and possibly a proxy log — which is what expiry,
// single-use-on-submit, and reissue-on-resend are for. The alternative (POST a
// token to a bare URL) breaks the one thing this link must do: be openable from
// an email on a phone.
//
// EVERY FAILURE IS THE SAME 404. Expired, spent, already activated, never
// existed — a caller guessing tokens learns nothing from the difference, and
// the RPC does not tell this route which case it hit either.
// ============================================================================

export const dynamic = "force-dynamic";

const NOT_FOUND = { error: "This onboarding link is not valid." };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("onboarding_by_token", {
    p_token: token,
  });

  if (error || !data) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = (await request.json()) as {
    action?: "save-section" | "submit" | "account-complete";
    taskId?: string;
    sectionType?: string;
    data?: Record<string, unknown>;
    status?: "not_started" | "in_progress" | "complete";
  };

  const supabase = await createServerClient();

  switch (body.action) {
    case "save-section": {
      if (!body.taskId || !body.sectionType) {
        return NextResponse.json(
          { error: "A task and a section type are required." },
          { status: 422 },
        );
      }
      const { data, error } = await supabase.rpc("save_onboarding_section", {
        p_token: token,
        p_task_key: body.taskId,
        p_section_type: body.sectionType,
        p_data: (body.data ?? {}) as never,
        p_status: body.status ?? "in_progress",
      });
      // The RPC returns false for every refusal without saying which. Passing
      // that through as one 404 keeps it that way.
      if (error || data !== true) {
        return NextResponse.json(NOT_FOUND, { status: 404 });
      }
      break;
    }

    case "submit": {
      const { data, error } = await supabase.rpc("submit_onboarding", {
        p_token: token,
      });
      if (error || data !== true) {
        return NextResponse.json(NOT_FOUND, { status: 404 });
      }
      // Deliberately does NOT re-read: submitting spends the token, so the very
      // next `onboarding_by_token` returns null. Returning `{ submitted: true }`
      // is the honest answer; re-reading would 404 and look like a failure.
      return NextResponse.json({ submitted: true });
    }

    case "account-complete": {
      const { data, error } = await supabase.rpc(
        "set_onboarding_account_complete",
        { p_token: token },
      );
      if (error || data !== true) {
        return NextResponse.json(NOT_FOUND, { status: 404 });
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: refreshed } = await supabase.rpc("onboarding_by_token", {
    p_token: token,
  });
  if (!refreshed) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
  return NextResponse.json(refreshed);
}
