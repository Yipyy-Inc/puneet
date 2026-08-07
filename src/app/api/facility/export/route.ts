import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildFacilityExport,
  exportFilename,
  facilityExportSummary,
} from "@/lib/api/facility-export";

// ============================================================================
// A facility owner exporting their OWN data.
//
// ── THE BUG THIS REPLACES ─────────────────────────────────────────────────
//
// /facility/account/export passed `defaultFacilityId={11}` — a literal, from
// the mock era — into a component that reads src/data/*. So every owner who
// asked for a copy of their data received facility 11's fictional records.
// Not an empty file: somebody else's file, labelled as theirs, on the screen
// that answers a portability request.
//
// ── NO ID IN THE PATH, ON PURPOSE ─────────────────────────────────────────
//
// The superadmin route takes /api/facilities/[id]/export because a platform
// admin legitimately exports any facility. This one takes nothing: the facility
// comes from the viewer's membership and there is no parameter to tamper with.
// That is the same rule check:facility-from-session enforces across the API,
// and here it is also the fix — a route that accepted an id would be one typo
// away from reinstating the bug in a more dangerous form.
//
// An owner with several facilities gets the first membership, matching how
// every other facility screen resolves "your facility" today. When the portal
// grows a facility switcher this reads it instead.
//
// ── OWNERS, NOT ANY MEMBER ────────────────────────────────────────────────
//
// The page sits behind requireFacilityOwner, and that guard reads the
// `facility_role` COOKIE — which viewer.ts names as client-writable from
// devtools and part of the legacy scheme it replaced. It steers the UI; it does
// not hold anything shut. So the check below is not belt-and-braces, it is the
// gate: the role comes from facility_memberships, and RLS refuses again on
// every table the export reads.
// ============================================================================

export const dynamic = "force-dynamic";

const OWNER_ROLES = new Set(["owner", "admin"]);

async function resolveOwnFacility() {
  const viewer = await getViewer().catch(() => null);

  if (!viewer || viewer.source !== "session") {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const membership = viewer.memberships.find((m) => OWNER_ROLES.has(m.role));

  if (!membership) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only an owner or administrator of a facility may export its data.",
        },
        { status: 403 },
      ),
    };
  }

  return { facilityId: membership.facilityId };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveOwnFacility();
  if (resolved.error) return resolved.error;
  const facilityId = resolved.facilityId!;

  if (request.nextUrl.searchParams.get("summary")) {
    try {
      return NextResponse.json({
        datasets: await facilityExportSummary(facilityId),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not read what your facility holds.",
        },
        { status: 500 },
      );
    }
  }

  const supabase = await createServerClient();

  const facility = await supabase
    .from("facilities")
    .select("slug")
    .eq("id", facilityId)
    .maybeSingle();

  if (facility.error || !facility.data) {
    return NextResponse.json({ error: "No such facility." }, { status: 404 });
  }

  let built;
  try {
    built = await buildFacilityExport(facilityId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the export.",
      },
      { status: 500 },
    );
  }

  // Not recorded in the audit trail, unlike the superadmin route. That entry
  // exists to answer "who at Yipyy took a copy of this facility's customers".
  // A facility exporting its own records is not that question, and logging it
  // at High severity would bury the one that is.

  return new Response(built.zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFilename(facility.data.slug)}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
