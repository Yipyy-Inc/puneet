import { createClient } from "@supabase/supabase-js";

// ============================================================================
// After a run, the test facility's staff notices from that run are removed.
//
// ── WHY ONE SWEEP AND NOT EACH SPEC ───────────────────────────────────────
//
// A notice is written as a side effect of other writes: a form submitted, leave
// requested, a customer booking, a swap, a vaccination filed for review, an
// incident. The specs that make those remove their own records, not the notices
// the records caused, and a spec written tomorrow will not know to either. One
// full run left 108 rows behind (2026-09-15). The notification spec itself
// still cleans its own; this is the net under everything else.
//
// ── WHAT IT TOUCHES ───────────────────────────────────────────────────────
//
// Only `staff_notifications`, only at the test facility, and only rows created
// since this run started. A CI run that overlaps this one may lose notices it
// has not asserted yet — rare, since GitHub holds one run per branch.
//
// It never fails the run: a sweep that cannot connect warns and returns.
//
// ── AND BEFORE A RUN, A CRASHED RUN'S AGREEMENTS ARE RETIRED (2026-10-02) ──
//
// `waivers.spec` retires the waivers it published, by id, in its afterAll. A
// run that dies first leaves them ACTIVE — three from 2026-09-11 were still
// live in production three weeks later, so in every copy of it, CI's too —
// and then every client of the test facility has an agreement to sign. Since
// the booking form became the client's flow, staff booking such a client make
// it "Pending — awaiting agreements", so every spec that books through the
// form read a pending booking where it expected a confirmed one.
//
// Only ACTIVE `[e2e]` waivers: the leftovers and nothing else. The whole
// history is long — the reason waivers.spec stopped sweeping it.
// ============================================================================

const TEST_FACILITY_SLUG = "yipyy-demo-facility";

async function retireLeftoverWaivers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data: facility } = await db
      .from("facilities")
      .select("id")
      .eq("slug", TEST_FACILITY_SLUG)
      .maybeSingle();
    if (!facility) return;
    const { data, error } = await db
      .from("waivers")
      .update({ active: false })
      .eq("facility_id", (facility as { id: string }).id)
      .eq("active", true)
      .like("name", "[e2e]%")
      .select("id");
    if (error) throw new Error(error.message);
    if (data?.length) {
      console.log(`waiver sweep: ${data.length} leftover agreement(s) retired`);
    }
  } catch (e) {
    console.warn(
      `waiver sweep failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export default async function notificationSweep() {
  const startedAt = new Date().toISOString();
  await retireLeftoverWaivers();

  return async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn("notification sweep skipped: no service-role credentials");
      return;
    }
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data: facility } = await db
        .from("facilities")
        .select("id")
        .eq("slug", TEST_FACILITY_SLUG)
        .maybeSingle();
      if (!facility) return;
      const { count, error } = await db
        .from("staff_notifications")
        .delete({ count: "exact" })
        .eq("facility_id", (facility as { id: string }).id)
        .gte("created_at", startedAt);
      if (error) throw new Error(error.message);
      console.log(`notification sweep: ${count ?? 0} notice(s) removed`);
    } catch (e) {
      console.warn(
        `notification sweep failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };
}
