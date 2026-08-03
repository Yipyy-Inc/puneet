import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  SERVICE_PACKAGE_SELECT,
  rowToServicePackage,
  type ServicePackagePricing,
  type ServicePackageRow,
} from "@/lib/api/mappers/service-packages";

// ============================================================================
// The whole package catalogue, every module — what the customer portal sells.
//
// ── WHY THIS IS NOT `/api/grooming/prepaid-packages` ──────────────────────
//
// Same table, different question. That route answers "what can the grooming
// manager price?" and filters to grooming-only bundles, because its editor
// offers only grooming services. This one answers "what can a customer buy?",
// which is all of it — including the Weekend Getaway, whose pools span two
// counters and which therefore belongs to neither module's admin screen.
//
// READ-ONLY, on purpose. A customer portal has no business creating catalogue
// entries; the two write paths are the facility's editor and, for buying,
// `/api/packages/owned`.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("prepaid_packages")
    .select(SERVICE_PACKAGE_SELECT)
    .order("popularity_rank", { ascending: true, nullsFirst: false })
    .order("package_price", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pricingRows } = await supabase
    .from("prepaid_package_pricing")
    .select("id, regular_price, savings, savings_percentage, purchase_count");

  const pricing = new Map<string, ServicePackagePricing>();
  for (const row of (pricingRows ?? []) as unknown as (ServicePackagePricing & {
    id: string;
  })[]) {
    pricing.set(row.id, row);
  }

  const rows = (data ?? []) as unknown as (ServicePackageRow & {
    id: string;
  })[];

  // A package with no pools would price as free and grant nothing. The editor
  // refuses to save one; this refuses to sell one.
  return NextResponse.json(
    rows
      .filter((row) => (row.prepaid_package_lines ?? []).length > 0)
      .map((row) => rowToServicePackage(row, pricing.get(row.id))),
  );
}
