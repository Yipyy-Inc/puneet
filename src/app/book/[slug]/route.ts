import { NextResponse, type NextRequest } from "next/server";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { getBrandingBySlug } from "@/lib/api/facility-branding";

// ============================================================================
// /book/<slug> — a short link to a facility's booking form.
//
// It rendered LocationBookingPage: the demo facility's fixture locations,
// matched by a short code, with a booking form that wrote nowhere. A link
// printed on a flyer led to a business that did not exist.
//
// A facility's customers book at the facility's own address, signed in as
// that facility's client, so this sends them there. Signing in, or joining if
// they are not a client yet, happens on the way — the portal already does
// both. A slug that names no facility is a 404, not a guess.
//
// A route, not a page: a page's redirect() inside the app's streamed layout
// arrives as a client-side hop with a 200, which a link checker, a mail
// client's preview or a QR scanner reads as "this is the page".
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const branding = await getBrandingBySlug(slug);
  if (!branding) {
    return NextResponse.json({ error: "No such facility." }, { status: 404 });
  }

  const origin =
    facilityCustomerOrigin(slug, process.env.NEXT_PUBLIC_APP_DOMAIN) ??
    // No app domain (a local run): the same path on this host.
    request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/customer/bookings/new`, 307);
}
