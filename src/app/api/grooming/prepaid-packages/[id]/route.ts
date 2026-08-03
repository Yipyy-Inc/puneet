import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// One prepaid package: edit it, retire it.
//
// ADDRESSED BY THE APP ID — `legacy_id` when the row has one, the uuid
// otherwise — the same rule the mapper applies on the way out.
//
// DELETE IS A REAL DELETE, and it is safe because purchases do not depend on
// it: `customer_packages` snapshots the name and price it was sold under and
// its FK is `on delete set null` (20260806320000). Retiring a package removes
// it from the menu without touching a single sale — which is the whole reason
// the purchase snapshots its terms.
//
// The pass ledger is untouched either way: it hangs off the PURCHASE, not the
// catalogue entry, so passes somebody paid for survive the menu changing.
// ============================================================================

export const dynamic = "force-dynamic";

async function resolvePackage(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appId: string,
): Promise<string | null> {
  const byLegacy = await supabase
    .from("prepaid_packages")
    .select("id")
    .eq("legacy_id", appId)
    .maybeSingle();
  if (byLegacy.data) return byLegacy.data.id as string;

  if (!/^[0-9a-f-]{36}$/i.test(appId)) return null;
  const byId = await supabase
    .from("prepaid_packages")
    .select("id")
    .eq("id", appId)
    .maybeSingle();
  return (byId.data?.id as string | undefined) ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: appId } = await params;
  const input = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    packagePrice?: number;
    validityDays?: number;
    status?: string;
    isPopular?: boolean;
    services?: {
      serviceId?: string;
      serviceName?: string;
      quantity?: number;
      pricePerSession?: number;
    }[];
    policy?: Record<string, unknown>;
  } | null;

  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const packageId = await resolvePackage(supabase, appId);
  if (!packageId) {
    return NextResponse.json({ error: "No such package." }, { status: 404 });
  }

  const p = (input.policy ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const put = (column: string, value: unknown) => {
    if (value !== undefined) patch[column] = value;
  };
  put("name", input.name?.trim());
  put("description", input.description?.trim());
  put("package_price", input.packagePrice);
  put("validity_days", input.validityDays);
  put("status", input.status);
  put("is_popular", input.isPopular);
  put("allow_refund_unused", p.allowRefundUnused);
  put("refund_per_unused_pass", p.refundPerUnusedPass ?? null);
  put("allow_store_credit_on_cancel", p.allowStoreCreditOnCancel);
  put("allow_transfer", p.allowTransfer);
  put("allow_extension", p.allowExtension);
  put("max_extension_days", p.maxExtensionDays);
  put("extension_fee", p.extensionFee);
  put("policy_notes", p.policyNotes ?? null);

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("prepaid_packages")
      .update(patch as never)
      .eq("id", packageId);
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to manage packages at this facility.",
        duplicate: "A package with that id already exists.",
      });
    }
  }

  // The bundle is replaced whole — see the collection route's header for why
  // that is delete-then-insert and what it costs.
  if (input.services) {
    if (input.services.length === 0) {
      return NextResponse.json(
        { error: "A package needs at least one service." },
        { status: 422 },
      );
    }
    await supabase
      .from("prepaid_package_lines")
      .delete()
      .eq("package_id", packageId);
    const { error: lineError } = await supabase
      .from("prepaid_package_lines")
      .insert(
        input.services.map((l) => ({
          package_id: packageId,
          service_id: l.serviceId,
          service_name: l.serviceName,
          quantity: l.quantity,
          price_per_session: l.pricePerSession ?? 0,
        })) as never,
      );
    if (lineError) {
      return writeFailure(lineError, {
        denied: "Not allowed to manage packages at this facility.",
        duplicate: "That bundle lists the same service twice.",
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: appId } = await params;
  const supabase = await createServerClient();
  const packageId = await resolvePackage(supabase, appId);
  if (!packageId) {
    return NextResponse.json({ error: "No such package." }, { status: 404 });
  }

  const { error } = await supabase
    .from("prepaid_packages")
    .delete()
    .eq("id", packageId);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to retire packages at this facility.",
      duplicate: "",
    });
  }

  return new NextResponse(null, { status: 204 });
}
