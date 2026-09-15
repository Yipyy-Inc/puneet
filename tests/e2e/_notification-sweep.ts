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
// ============================================================================

const TEST_FACILITY_SLUG = "yipyy-demo-facility";

export default async function notificationSweep() {
  const startedAt = new Date().toISOString();

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
