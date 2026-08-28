import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { DismissResult } from "@/types/rebook";

// ============================================================================
// "Stop showing me this one."
//
// ── IT IS NOT A DELETE, AND IT IS NOT FOREVER ─────────────────────────────
//
// A dismissal is a row with a timestamp, and `lapsed_clients()` compares it
// against the client's LAST VISIT rather than expiring it on a timer. So:
//
//   dismissed, never returns   -> stays hidden, which is what was meant
//   dismissed, comes back,
//   lapses again months later  -> reappears, with no cleanup job
//
// A boolean flag on the client would have needed somebody to remember to clear
// it, and nobody ever does. This has nothing to remember.
//
// ── PER SERVICE, NOT PER CLIENT ───────────────────────────────────────────
//
// Dismissing somebody from the grooming list must not hide them from the
// boarding one. They are different conversations that happen to be with the
// same person, and a facility that grooms weekly and boards twice a year would
// otherwise lose the second one entirely.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    clientId?: string;
    service?: string;
    reason?: string;
    note?: string;
  } | null;

  const clientId = body?.clientId;
  const service = body?.service?.trim();
  if (!clientId || !service) {
    return NextResponse.json(
      { error: "A dismissal needs a client and a service." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // The FACILITY comes from the session. The client is checked against it
  // through the RLS client, so a request naming somebody else's client gets a
  // 404 rather than a row written into this facility's dismissals.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("facility_id", context.facilityId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  // Upsert, so dismissing twice moves the timestamp rather than raising or
  // leaving two rows that disagree about who did it.
  const { data, error } = await supabase
    .from("rebook_dismissals")
    .upsert(
      {
        facility_id: context.facilityId,
        client_id: clientId,
        service,
        reason: body?.reason ?? null,
        note: body?.note ?? null,
        dismissed_by: viewer.userId,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "facility_id,client_id,service" },
    )
    .select("client_id, service");

  if (error) {
    return writeFailure(error, {
      denied: "Dismissing a client needs permission to manage automations.",
      duplicate: "That client is already dismissed for this service.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to dismiss this client.",
  );
  if (denied) return denied;

  const result: DismissResult = { clientId, service };
  return NextResponse.json(result);
}

/** Put somebody back on the list. */
export async function DELETE(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const params = new URL(request.url).searchParams;
  const clientId = params.get("clientId");
  const service = params.get("service");
  if (!clientId || !service) {
    return NextResponse.json(
      { error: "Which dismissal should be lifted?" },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // Asked BEFORE the delete so the two answers stay apart. Without it, "there
  // was nothing to lift" and "you may not lift it" both arrive as zero rows,
  // and `deniedIfUntouched` would tell somebody they lacked permission for a
  // dismissal that had already gone.
  const { data: existing } = await supabase
    .from("rebook_dismissals")
    .select("id")
    .eq("facility_id", context.facilityId)
    .eq("client_id", clientId)
    .eq("service", service)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json(
      { error: "That client is not dismissed." },
      { status: 404 },
    );
  }

  // rls-write-ok: a refused delete cannot pass silently here. The row was just
  // proven to exist, so zero rows back can only be a refusal — which is what
  // `deniedIfUntouched` turns into a 403.
  const { data, error } = await supabase
    .from("rebook_dismissals")
    .delete()
    .eq("facility_id", context.facilityId)
    .eq("client_id", clientId)
    .eq("service", service)
    .select("client_id, service");

  if (error) {
    return writeFailure(error, {
      denied: "Lifting a dismissal needs permission to manage automations.",
      duplicate: "That dismissal could not be lifted.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to lift this dismissal.",
  );
  if (denied) return denied;

  const result: DismissResult = { clientId, service };
  return NextResponse.json(result);
}
