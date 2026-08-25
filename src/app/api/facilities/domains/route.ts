import { NextResponse } from "next/server";

import { attachedProjectHosts } from "@/lib/facility-domains";
import { getViewer } from "@/lib/auth/viewer";

// ============================================================================
// Which hosts are actually attached to the project — asked once, for the whole
// facilities list.
//
// The per-facility answer already exists at /api/facilities/[id]/domain and is
// what the detail screen uses. This exists because the LIST needs the same
// answer for every row at once, and calling that route per row would be one
// Vercel round trip per facility.
//
// ── IT RETURNS HOSTS, NOT A VERDICT ───────────────────────────────────────
//
// The comparison — is `<slug>.<appDomain>` in this list — is done by the
// caller, which already holds every facility's slug. Doing it here would mean
// re-reading the facility table to answer a question about somebody else's
// system, and would make this route go stale in a different way than the
// detail route does.
//
// Nothing is cached, for the reason facilityDomainStatus gives: a stored flag
// is a claim about Vercel's state that is wrong the moment anyone edits the
// project by hand.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may list web addresses." },
      { status: 403 },
    );
  }

  // 200 even when Vercel is unreachable or unconfigured. "We could not check"
  // is a real answer the list must be able to render as itself — turning it
  // into a 500 would make the whole table look broken because an optional
  // integration was unavailable.
  return NextResponse.json(await attachedProjectHosts());
}
