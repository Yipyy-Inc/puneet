import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildFacilityExport,
  exportFilename,
  facilityExportSummary,
} from "@/lib/api/facility-export";

// ============================================================================
// A facility's whole record, as a file.
//
// Two answers from one route because they are two views of one act:
//
//   ?summary=1   what the export WOULD contain — row counts per dataset
//   (no query)   the ZIP itself
//
// ── THE DOWNLOAD IS RECORDED; THE PREVIEW IS NOT ──────────────────────────
//
// Counting rows is an ordinary read. Producing the file is the platform's most
// sensitive act — a portability file is also the entire customer list — so the
// download calls record_facility_export and the preview does not. Recording
// both would make the audit trail noisy in exactly the way that gets it
// ignored.
//
// The recording happens AFTER the file is built and BEFORE it is returned. If
// the export fails there is nothing to record; if the recording fails the
// download is refused, because an unrecorded export of personal data is the
// thing the entry exists to prevent.
// ============================================================================

export const dynamic = "force-dynamic";

async function requirePlatformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may export a facility's data." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id } = await params;

  if (request.nextUrl.searchParams.get("summary")) {
    try {
      return NextResponse.json({ datasets: await facilityExportSummary(id) });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not read what this facility holds.",
        },
        { status: 500 },
      );
    }
  }

  const supabase = await createServerClient();

  const facility = await supabase
    .from("facilities")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (facility.error || !facility.data) {
    return NextResponse.json({ error: "No such facility." }, { status: 404 });
  }

  let built;
  try {
    built = await buildFacilityExport(id);
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

  const recorded = await supabase.rpc("record_facility_export", {
    p_facility_id: id,
    p_datasets: built.datasets.map((dataset) => dataset.key),
    p_row_count: built.totalRows,
  });

  if (recorded.error) {
    // Deliberately fatal. The alternative is handing over every customer's
    // contact details with no record that it happened.
    return NextResponse.json(
      {
        error:
          "The export could not be recorded in the audit trail, so it was not produced.",
      },
      { status: recorded.error.code === "42501" ? 403 : 500 },
    );
  }

  return new Response(built.zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFilename(facility.data.slug)}"`,
      // Personal data must not sit in a shared cache.
      "Cache-Control": "no-store, private",
    },
  });
}
