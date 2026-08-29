import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { readRebookConfig } from "@/lib/rebook/config";
import { createServerClient } from "@/lib/supabase/server";
import type {
  ClientRebookPreferences,
  ClientServiceRebook,
} from "@/types/rebook";

// ============================================================================
// How often THIS client comes back, and whether to chase them.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `clientServicePreferences` and `clientRebookOptOuts` in
// src/data/rebook-reminders.ts: two hand-written arrays keyed by fixture client
// ids, edited into a `useState` on the client file and gone on reload. The
// section has offered "override the default frequency for this client" since it
// was built.
//
// ── THREE NUMBERS, AND THEY MEAN DIFFERENT THINGS ─────────────────────────
//
//   default   the facility's interval for the service (`rebook_config`)
//   override  what somebody set for this client, or null
//   observed  the average gap between their actual completed visits
//
// The third is the interesting one and it is DERIVED, never stored: it is the
// evidence for or against the first two. A dog booked in every 19 days against
// a 28-day default is the case for an override, and a stored copy of that
// average would be wrong the day after the next visit.
//
// ── THE OPT-OUT IS THE FACILITY'S NOTE, NOT THE CUSTOMER'S ────────────────
//
// `message_suppressions` is the customer's own decision, keyed by address, and
// stops every marketing message from every source. This is "she books when she
// books, do not chase her" — rebook reminders only. Both are enforced; neither
// replaces the other, and this route deliberately cannot write the other one.
// ============================================================================

export const dynamic = "force-dynamic";

interface PrefRow {
  service: string | null;
  frequency_days: number | null;
  reminders_enabled: boolean;
  reason: string | null;
}

/** The client's uuid, from the app-facing numeric ref, scoped to the session. */
async function resolveClient(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  ref: string,
): Promise<string | null> {
  const numeric = Number(ref);
  if (!Number.isFinite(numeric)) return null;
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", numeric)
    .eq("facility_id", facilityId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
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

  const { ref } = await params;
  const supabase = await createServerClient();
  const clientId = await resolveClient(supabase, context.facilityId, ref);
  if (!clientId) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const [{ config }, { data: prefs }, { data: visits }] = await Promise.all([
    readRebookConfig(supabase, context.facilityId),
    supabase
      .from("client_rebook_preferences")
      .select("service, frequency_days, reminders_enabled, reason")
      .eq("facility_id", context.facilityId)
      .eq("client_id", clientId),
    // Their completed visits, oldest first, for the observed interval. Only
    // this client's own history, so it is bounded by how often they come.
    supabase
      .from("bookings")
      .select("service, start_at")
      .eq("facility_id", context.facilityId)
      .eq("client_id", clientId)
      .eq("status", "completed")
      .not("service", "is", null)
      .order("start_at", { ascending: true }),
  ]);

  const rows = (prefs ?? []) as PrefRow[];
  const byService = new Map(
    rows.filter((r) => r.service !== null).map((r) => [r.service as string, r]),
  );
  const wholeClient = rows.find((r) => r.service === null);

  const history = new Map<string, string[]>();
  for (const v of (visits ?? []) as { service: string; start_at: string }[]) {
    const list = history.get(v.service) ?? [];
    list.push(v.start_at);
    history.set(v.service, list);
  }

  // Every service the facility has configured, plus any the client has been
  // seen for. A client who only ever boards should not be offered a grooming
  // override they will never use — but if they HAVE been groomed once, the
  // service belongs on their file.
  const services = [
    ...new Set([...Object.keys(config.services), ...history.keys()]),
  ].sort();

  const payload: ClientRebookPreferences = {
    remindersEnabled: wholeClient?.reminders_enabled ?? true,
    optOutReason: wholeClient?.reason ?? null,
    services: services.map((service): ClientServiceRebook => {
      const pref = byService.get(service);
      const defaultDays = config.services[service]?.frequencyDays ?? null;
      const overrideDays = pref?.frequency_days ?? null;
      const dates = history.get(service) ?? [];
      return {
        service,
        defaultDays,
        overrideDays,
        effectiveDays: overrideDays ?? defaultDays,
        source: overrideDays === null ? "default" : "override",
        remindersEnabled: pref?.reminders_enabled ?? true,
        reason: pref?.reason ?? null,
        completedVisits: dates.length,
        observedDays: averageGapDays(dates),
      };
    }),
  };
  return NextResponse.json(payload);
}

/**
 * The average gap between visits, or null when there is nothing to average.
 *
 * ONE visit is not a frequency, and saying "every 0 days" or silently showing
 * the default as though it were observed would both be worse than an empty
 * cell. The screen says "not enough visits yet".
 */
function averageGapDays(dates: string[]): number | null {
  if (dates.length < 2) return null;
  let total = 0;
  for (let i = 1; i < dates.length; i += 1) {
    total += new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime();
  }
  return Math.round(total / (dates.length - 1) / 86_400_000) || null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
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

  const { ref } = await params;
  const body = (await request.json().catch(() => null)) as {
    /** Null means the whole client — the master opt-out. */
    service?: string | null;
    frequencyDays?: number | null;
    remindersEnabled?: boolean;
    reason?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const frequencyDays = body.frequencyDays ?? null;
  if (
    frequencyDays !== null &&
    (!Number.isInteger(frequencyDays) ||
      frequencyDays < 1 ||
      frequencyDays > 3650)
  ) {
    return NextResponse.json(
      { error: "An interval is a whole number of days, between 1 and 3650." },
      { status: 400 },
    );
  }

  const service = body.service?.trim() || null;
  // A frequency for "every service" is meaningless: the facility's intervals
  // differ per service, so one number across all of them would silently make a
  // daycare client's grooming due on the daycare cycle.
  if (service === null && frequencyDays !== null) {
    return NextResponse.json(
      { error: "An interval belongs to one service, not to every service." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const clientId = await resolveClient(supabase, context.facilityId, ref);
  if (!clientId) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("client_rebook_preferences")
    .upsert(
      {
        facility_id: context.facilityId,
        client_id: clientId,
        service,
        frequency_days: frequencyDays,
        reminders_enabled: body.remindersEnabled ?? true,
        reason: body.reason?.trim() || null,
        updated_by: viewer.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "facility_id,client_id,service" },
    )
    .select("service");

  if (error) {
    return writeFailure(error, {
      denied:
        "Changing a client's rebook settings needs permission to edit clients.",
      duplicate: "That preference is already recorded.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to change this client's rebook settings.",
  );
  if (denied) return denied;

  return NextResponse.json({ service });
}
