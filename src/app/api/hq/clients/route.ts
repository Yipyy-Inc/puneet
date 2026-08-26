import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { NO_LOYALTY_PROGRAM } from "@/lib/settings/loyalty";
import type { FacilityLoyaltyConfig } from "@/types/loyalty";

// ============================================================================
// Cross-location client value — lifetime, derived from bookings.location_id.
//
// No time window, unlike `/api/facility/reports`: this screen has no period
// picker, and every figure (first/last visit, total spend) is lifetime by
// design. See the migration header on `hq_client_network_value` for why this
// is a separate RPC rather than a branch on `facility_report_dataset`.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const active = await activeAdminFacility();
  if (active.kind === "none") {
    return NextResponse.json(
      { error: "Only an owner or administrator can see this." },
      { status: 403 },
    );
  }
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      { error: "Open the facility you mean at its own address." },
      { status: 409 },
    );
  }

  // The figures here are revenue and spend, same gate as the regular reports.
  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's figures." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("hq_client_network_value", {
    p_facility_id: active.facility.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not read this facility's clients." },
      { status: 502 },
    );
  }

  // Tier NAMES and colours are the facility's own — resolved here, once, so
  // the screen never has to fall back to a hardcoded bronze/silver/gold/
  // platinum four that may not match what this facility actually configured.
  const { data: settingRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", active.facility.id)
    .eq("domain", "loyalty_config")
    .maybeSingle();

  const config = {
    ...NO_LOYALTY_PROGRAM,
    ...((settingRow as { value?: Record<string, unknown> } | null)?.value ??
      {}),
    facilityId: 0,
  } as unknown as FacilityLoyaltyConfig;

  const tiers =
    config.tiersEnabled === false
      ? []
      : (config.tierDefinitions ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          icon: t.icon,
        }));

  // null when RLS refused every row — the client renders an empty screen
  // rather than the last facility's numbers.
  return NextResponse.json({ clients: data ?? [], tiers });
}
