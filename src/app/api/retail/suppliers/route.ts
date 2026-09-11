import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  rowToSupplier,
  supplierToColumns,
  type RetailSupplierRow,
} from "@/lib/api/mappers/retail";
import type { Supplier } from "@/types/retail";

// The facility's suppliers (retail_suppliers, 20260911180840). The Orders
// tab's supplier list was `suppliers` from @/data/retail and its Save did
// nothing. retail_manage_suppliers decides who writes.

export const dynamic = "force-dynamic";

const SELECT =
  "id, name, contact_name, email, phone, is_active, detail, created_at";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("retail_suppliers")
    .select(SELECT)
    .match(inFacility(scope))
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as RetailSupplierRow[]).map(rowToSupplier),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request
    .json()
    .catch(() => null)) as Partial<Supplier> | null;
  if (!input?.name?.trim()) {
    return NextResponse.json(
      { error: "A supplier needs a name." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_suppliers")
    .insert({
      facility_id: facility.facilityId,
      ...supplierToColumns(input),
    } as never)
    .select(SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage suppliers at this facility.",
      duplicate: "That supplier already exists.",
    });
  }
  return NextResponse.json(
    rowToSupplier(data as unknown as RetailSupplierRow),
    { status: 201 },
  );
}
