import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  PREPAID_PACKAGE_SELECT,
  packageAppId,
  rowToPrepaidPackage,
  type PackagePricing,
  type PrepaidPackageRow,
} from "@/lib/api/mappers/prepaid-packages";

// ============================================================================
// The prepaid-package catalogue: list, create, edit, retire.
//
// ── THE DERIVED FIGURES ARE NEVER ACCEPTED ─────────────────────────────────
//
// A caller sends `packagePrice` and the lines. `regularPrice`, `savings`,
// `savingsPercentage` and `purchaseCount` are read from
// `prepaid_package_pricing` and are not columns anybody can write
// (20260806320000, Decision 1). The editor computes them for its own preview,
// which is fine — what matters is that its preview never becomes the record.
//
// ── THE LINES ARE REPLACED WHOLE ───────────────────────────────────────────
//
// The editor hands back the bundle it wants, not a diff. Delete-then-insert
// inside the same request keeps that honest; the unique constraint on
// (package_id, service_id) is what stops a bundle listing one service twice.
//
// It is NOT one transaction, and that is a real limitation rather than an
// oversight: PostgREST gives no multi-statement transaction, and unlike the
// payment path there is nothing here worth an RPC — a half-applied bundle edit
// is visible on the very screen that made it, where a half-applied payment is
// money that silently disappears. Stated so the next person can decide it needs
// one rather than discover the gap.
//
// ── THIS IS THE GROOMING VIEW OF A SHARED TABLE ────────────────────────────
//
// `prepaid_packages` now holds the portal's daycare, boarding and training
// packages too (20260806440000). This route is the GROOMING screen's, so it
// returns only packages whose pools are all grooming — otherwise the grooming
// manager opens Packages and finds a Daycare 20-Pack they cannot price, in a
// screen whose editor only offers grooming services.
//
// Filtered AFTER the read rather than in the query, because "every line is
// grooming" is a condition on the whole set of lines and PostgREST's embedded
// filters narrow the embed instead: `prepaid_package_lines.module=eq.grooming`
// would return the Weekend Getaway with its boarding pool quietly missing,
// which is worse than either including it or excluding it.
// ============================================================================

export const dynamic = "force-dynamic";

interface LineInput {
  serviceId?: string;
  serviceName?: string;
  quantity?: number;
  pricePerSession?: number;
}

interface PackageInput {
  name?: string;
  description?: string;
  packagePrice?: number;
  validityDays?: number;
  status?: string;
  isPopular?: boolean;
  services?: LineInput[];
  policy?: {
    allowRefundUnused?: boolean;
    refundPerUnusedPass?: number | null;
    allowStoreCreditOnCancel?: boolean;
    allowTransfer?: boolean;
    allowExtension?: boolean;
    maxExtensionDays?: number;
    extensionFee?: number;
    policyNotes?: string | null;
  };
}

async function pricingById(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<Map<string, PackagePricing>> {
  const { data } = await supabase
    .from("prepaid_package_pricing")
    .select("id, regular_price, savings, savings_percentage, purchase_count");
  const map = new Map<string, PackagePricing>();
  for (const row of (data ?? []) as unknown as (PackagePricing & {
    id: string;
  })[]) {
    map.set(row.id, row);
  }
  return map;
}

/** Shared shape-check. The database enforces the same rules; this names the
 *  field so the editor can point at it. */
function validate(input: PackageInput): string | null {
  if (!input.name?.trim()) return "A package needs a name.";
  if (!input.services?.length) return "Add at least one service.";
  if (!Number.isFinite(input.packagePrice) || input.packagePrice! < 0) {
    return "The package price must be a number.";
  }
  if (!Number.isFinite(input.validityDays) || input.validityDays! <= 0) {
    return "Validity must be a positive number of days.";
  }
  for (const line of input.services) {
    if (!line.serviceId || !line.serviceName) return "A service is missing.";
    if (!Number.isFinite(line.quantity) || line.quantity! <= 0) {
      return `How many ${line.serviceName} sessions?`;
    }
  }
  const p = input.policy;
  if (p && !p.allowRefundUnused && p.refundPerUnusedPass != null) {
    return "A refund amount needs refunds to be allowed.";
  }
  if (p && !p.allowExtension && (p.maxExtensionDays || p.extensionFee)) {
    return "An extension window or fee needs extensions to be allowed.";
  }
  return null;
}

function toRow(input: PackageInput, facilityId: string) {
  const p = input.policy ?? {};
  return {
    facility_id: facilityId,
    name: input.name!.trim(),
    description: input.description?.trim() ?? "",
    package_price: input.packagePrice,
    validity_days: input.validityDays,
    status: input.status ?? "active",
    is_popular: input.isPopular ?? false,
    allow_refund_unused: p.allowRefundUnused ?? false,
    refund_per_unused_pass: p.refundPerUnusedPass ?? null,
    allow_store_credit_on_cancel: p.allowStoreCreditOnCancel ?? true,
    allow_transfer: p.allowTransfer ?? false,
    allow_extension: p.allowExtension ?? true,
    max_extension_days: p.maxExtensionDays ?? 30,
    extension_fee: p.extensionFee ?? 0,
    policy_notes: p.policyNotes ?? null,
    // `regular_price`, `savings`, `savings_percentage` and `purchase_count`
    // are deliberately absent — they are not columns.
  };
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("prepaid_packages")
    .select(PREPAID_PACKAGE_SELECT)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pricing = await pricingById(supabase);
  const rows = (data ?? []) as unknown as (PrepaidPackageRow & {
    id: string;
  })[];
  const groomingOnly = rows.filter((row) => {
    const lines = row.prepaid_package_lines ?? [];
    return lines.length > 0 && lines.every((l) => l.module === "grooming");
  });

  return NextResponse.json(
    groomingOnly.map((row) => rowToPrepaidPackage(row, pricing.get(row.id))),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as PackageInput | null;
  const problem = input ? validate(input) : "Nothing to save.";
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data: created, error } = await supabase
    .from("prepaid_packages")
    .insert(toRow(input!, context.facilityId) as never)
    .select("id, legacy_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage packages at this facility.",
      duplicate: "A package with that id already exists.",
    });
  }

  const packageId = (created as { id: string }).id;
  const { error: lineError } = await supabase
    .from("prepaid_package_lines")
    .insert(
      input!.services!.map((l) => ({
        package_id: packageId,
        service_id: l.serviceId,
        service_name: l.serviceName,
        quantity: l.quantity,
        price_per_session: l.pricePerSession ?? 0,
        // This screen prices grooming and nothing else; its editor offers only
        // grooming services. The column has no default (20260806420000)
        // precisely so a caller that does not know must say so here.
        module: "grooming",
      })) as never,
    );

  if (lineError) {
    // Compensation: a bundle with no contents is not a bundle, and the pricing
    // view would report it as free.
    // rls-write-ok: compensation inside an error path. The response is
    // already a failure; a refusal here changes nothing the caller sees.
    await supabase.from("prepaid_packages").delete().eq("id", packageId);
    return writeFailure(lineError, {
      denied: "Not allowed to manage packages at this facility.",
      duplicate: "That bundle lists the same service twice.",
    });
  }

  return NextResponse.json(
    { id: packageAppId(created as never) },
    { status: 201 },
  );
}
