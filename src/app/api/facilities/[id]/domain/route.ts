import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityForAdmin } from "@/lib/api/admin-facilities";
import {
  attachFacilityDomain,
  facilityDomainStatus,
} from "@/lib/vercel/domains";

// ============================================================================
// Is this facility's own web address live, and attach it if not.
//
// Provisioning already attaches the subdomain, so this is for the facilities
// that existed BEFORE it did — and for the case the attach failed at creation
// time, which is deliberately non-fatal there because the facility itself is
// already committed.
//
// GET asks Vercel each time rather than reading a stored flag: a column would
// be a claim about somebody else's system, and it goes stale the moment anyone
// edits the project by hand.
// ============================================================================

export const dynamic = "force-dynamic";

/** The slug comes from the FACILITY ROW, never from the caller. */
async function slugFor(id: string): Promise<string | null> {
  const facility = await getFacilityForAdmin(id);
  return facility?.slug ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may check a web address." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const slug = await slugFor(id);
  if (!slug) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  return NextResponse.json(await facilityDomainStatus(slug));
}

/**
 * Attach it. Idempotent — Vercel reports an already-attached host as 409 and
 * that is reported here as success, because the desired state is reached.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may attach a web address." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const slug = await slugFor(id);
  if (!slug) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const result = await attachFacilityDomain(slug);
  return NextResponse.json(result, { status: result.attached ? 200 : 502 });
}
