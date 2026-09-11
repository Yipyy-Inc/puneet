import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  rowToSupplier,
  supplierToColumns,
  type RetailSupplierRow,
} from "@/lib/api/mappers/retail";
import type { Supplier } from "@/types/retail";

// One supplier: edit it or delete it. A purchase order keeps the supplier's
// name when the supplier goes (supplier_id is ON DELETE SET NULL).

export const dynamic = "force-dynamic";

const SELECT =
  "id, name, contact_name, email, phone, is_active, detail, created_at";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const input = (await request
    .json()
    .catch(() => null)) as Partial<Supplier> | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_suppliers")
    .update(supplierToColumns(input) as never)
    .eq("id", id)
    .select(SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage suppliers at this facility.",
      duplicate: "That supplier already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this supplier.",
  );
  if (denied) return denied;
  return NextResponse.json(
    rowToSupplier((data as unknown as RetailSupplierRow[])[0]),
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_suppliers")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this supplier.",
      duplicate: "That supplier cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to delete this supplier.",
  );
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
