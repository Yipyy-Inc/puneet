import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { NO_TAX, taxConfigSchema } from "@/lib/settings/tax";

// ============================================================================
// The facility a CUSTOMER is a client of, as it appears on their documents.
//
// ── WHY THIS IS NOT /api/facility/profile ─────────────────────────────────
//
// That route resolves the facility through `getFacilityContext()`, which reads
// the caller's MEMBERSHIP. A customer has none, and that function falls back to
// the demo facility for a caller without one — so pointing the customer portal
// at it would have printed a different business's name, address and tax
// registration number on a pet owner's invoice, confidently.
//
// The facility comes through the CLIENT ROW instead, the same way
// `facilityContextForClient()` does it: read `clients` filtered to the caller's
// own record and follow the foreign key. Somebody naming a client id that is
// not theirs gets nothing back, because RLS refuses the client row first.
//
// ── AND WHY IT RETURNS ONLY WHAT GOES ON PAPER ────────────────────────────
//
// Name, address, contact, logo, and the tax registration numbers. Not the
// facility's settings, not its rates, not anything a customer would not already
// be holding on a receipt. `facility_settings_read` restricts a client to the
// domains in `private.customer_visible_setting_domains()`, which `tax_config`
// joined in 20260819180000 for exactly this document.
// ============================================================================

export const dynamic = "force-dynamic";

export interface CustomerFacility {
  name: string;
  logoUrl: string | null;
  street: string | null;
  cityLine: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxRegistrations: { id: string; label: string; value: string }[];
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  // Through the client row, never around it. RLS scopes `clients` to the
  // caller's own record, so this cannot reach a facility they have no
  // relationship with — there is no id in the request to get wrong.
  const { data: client } = await supabase
    .from("clients")
    .select(
      "facility_id, facilities ( name, phone, email, website, logo_url, address )",
    )
    .limit(1)
    .maybeSingle();

  const facility = client?.facilities as
    | {
        name: string;
        phone: string | null;
        email: string | null;
        website: string | null;
        logo_url: string | null;
        address: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
        } | null;
      }
    | null
    | undefined;

  if (!facility || !client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { data: settingRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", client.facility_id)
    .eq("domain", "tax_config")
    .maybeSingle();

  // Parsed rather than cast: a row written by an older shape must not reach a
  // document, and an unreadable config means no registration line rather than a
  // failed request.
  const parsed = taxConfigSchema.safeParse(settingRow?.value);
  const tax = parsed.success ? parsed.data : NO_TAX;

  const address = facility.address;
  const cityLine = [address?.city, address?.state, address?.zipCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const body: CustomerFacility = {
    name: facility.name,
    logoUrl: facility.logo_url || null,
    street: address?.street?.trim() || null,
    cityLine: cityLine || null,
    phone: facility.phone,
    email: facility.email,
    website: facility.website,
    taxRegistrations: tax.showRegistrationOnInvoice
      ? tax.taxes
          .filter((entry) => entry.enabled && entry.registrationNumber.trim())
          .map((entry) => ({
            id: entry.id,
            label: `${entry.name} Number`,
            value: entry.registrationNumber,
          }))
      : [],
  };

  return NextResponse.json(body);
}
