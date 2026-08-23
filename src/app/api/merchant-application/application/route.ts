import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import {
  bankingStepSchema,
  businessStepSchema,
  isEditable,
  type ApplicationStatus,
  type MerchantApplication,
} from "@/lib/merchant-application/application";

// ============================================================================
// The facility's own merchant application: read it, start it, save a step.
//
// ── WHY IT IS ONE ROUTE AND NOT FIVE ──────────────────────────────────────
//
// There is at most one live application per facility — a partial unique index
// enforces it — so "the application" is a singular noun and does not need an id
// in the path. A route per wizard step would be five files agreeing about the
// same row.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// Never the request. This row holds a legal name, a tax number and the people
// who own the business; a caller who could name the facility could read another
// company's incorporation details. `check:facility-from-session` fails the
// build on the other shape.
//
// ── AND THE SECRETS ARE NOT HERE ──────────────────────────────────────────
//
// No national id, no bank account number. They have their own route, they go
// straight into Vault, and nothing they touch is cached or echoed back. If a
// field for one ever appears in this file it is a mistake — see the banner on
// lib/boarding/application.ts.
// ============================================================================

export const dynamic = "force-dynamic";

/** One string literal: supabase-js infers the row type from it. */
const APPLICATION_SELECT =
  "id, status, status_detail, external_reference, legal_name, trading_name, business_structure, tax_id, incorporated_on, address_line1, address_line2, city, region, postal_code, country, business_phone, business_email, website, mcc, estimated_monthly_volume_cents, average_ticket_cents, highest_ticket_cents, card_not_present_percent, refund_policy, bank_account_name, bank_last4, signed_name, signed_at, submitted_at, decided_at, purged_at";

interface AppRow {
  id: string;
  status: string;
  status_detail: string | null;
  external_reference: string | null;
  legal_name: string | null;
  trading_name: string | null;
  business_structure: string | null;
  tax_id: string | null;
  incorporated_on: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  business_phone: string | null;
  business_email: string | null;
  website: string | null;
  mcc: string | null;
  estimated_monthly_volume_cents: number | null;
  average_ticket_cents: number | null;
  highest_ticket_cents: number | null;
  card_not_present_percent: number | null;
  refund_policy: string | null;
  bank_account_name: string | null;
  bank_last4: string | null;
  signed_name: string | null;
  signed_at: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  purged_at: string | null;
}

/** Empty string rather than null, because a controlled input cannot hold null. */
const str = (value: string | null) => value ?? "";

function toApplication(
  row: AppRow,
  principals: MerchantApplication["principals"],
  documents: MerchantApplication["documents"],
): MerchantApplication {
  return {
    id: row.id,
    status: row.status as ApplicationStatus,
    statusDetail: row.status_detail,
    externalReference: row.external_reference,
    business: {
      legalName: str(row.legal_name),
      tradingName: str(row.trading_name),
      businessStructure:
        (row.business_structure as "corporation" | undefined) ?? undefined,
      taxId: str(row.tax_id),
      incorporatedOn: str(row.incorporated_on),
      addressLine1: str(row.address_line1),
      addressLine2: str(row.address_line2),
      city: str(row.city),
      region: str(row.region),
      postalCode: str(row.postal_code),
      country: str(row.country),
      businessPhone: str(row.business_phone),
      businessEmail: str(row.business_email),
      website: str(row.website),
    },
    banking: {
      bankAccountName: str(row.bank_account_name),
      estimatedMonthlyVolumeCents:
        row.estimated_monthly_volume_cents ?? undefined,
      averageTicketCents: row.average_ticket_cents ?? undefined,
      highestTicketCents: row.highest_ticket_cents ?? undefined,
      cardNotPresentPercent: row.card_not_present_percent ?? undefined,
      refundPolicy: str(row.refund_policy),
      bankLast4: row.bank_last4,
    },
    principals,
    documents,
    signedName: row.signed_name,
    signedAt: row.signed_at,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    purgedAt: row.purged_at,
  };
}

/** The caller, or a response saying why not. */
async function requireAdminFacility() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  const active = await activeAdminFacility();
  if (active.kind === "ambiguous") {
    return {
      error: NextResponse.json(
        {
          error:
            "You administer more than one facility. Open the one you mean at its own address.",
        },
        { status: 409 },
      ),
    };
  }
  if (active.kind !== "resolved") {
    return {
      error: NextResponse.json(
        { error: "Only an owner or administrator can apply for Yipyy Pay." },
        { status: 403 },
      ),
    };
  }
  return { facility: active.facility, viewer };
}

export async function GET() {
  const resolved = await requireAdminFacility();
  if ("error" in resolved) return resolved.error;

  const supabase = await createServerClient();

  // The live one. `withdrawn` and `rejected` are kept as records but are not
  // "the application" — a facility that withdrew and started again should not
  // be shown the one they abandoned.
  const { data: row, error } = await supabase
    .from("merchant_applications")
    .select(APPLICATION_SELECT)
    .eq("facility_id", resolved.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ application: null });
  }

  const typed = row as unknown as AppRow;

  const { data: principalRows } = await supabase
    .from("merchant_application_principals")
    .select(
      "id, full_name, title, ownership_percent, date_of_birth, email, phone, address_line1, address_line2, city, region, postal_code, country, is_control_person, national_id_last4",
    )
    .eq("application_id", typed.id)
    .order("created_at");

  const { data: documentRows } = await supabase
    .from("merchant_application_documents")
    .select(
      "id, doc_type, principal_id, file_name, content_type, size_bytes, uploaded_at, purged_at",
    )
    .eq("application_id", typed.id)
    .order("uploaded_at");

  return NextResponse.json({
    application: toApplication(
      typed,
      (principalRows ?? []).map((p) => ({
        id: p.id as string,
        fullName: str(p.full_name as string | null),
        title: str(p.title as string | null),
        ownershipPercent: Number(p.ownership_percent ?? 0),
        dateOfBirth: str(p.date_of_birth as string | null),
        email: str(p.email as string | null),
        phone: str(p.phone as string | null),
        addressLine1: str(p.address_line1 as string | null),
        addressLine2: str(p.address_line2 as string | null),
        city: str(p.city as string | null),
        region: str(p.region as string | null),
        postalCode: str(p.postal_code as string | null),
        country: str(p.country as string | null),
        isControlPerson: p.is_control_person === true,
        nationalIdLast4: (p.national_id_last4 as string | null) ?? null,
      })),
      (documentRows ?? []).map((d) => ({
        id: d.id as string,
        docType:
          d.doc_type as MerchantApplication["documents"][number]["docType"],
        principalId: (d.principal_id as string | null) ?? null,
        fileName: d.file_name as string,
        contentType: d.content_type as string,
        sizeBytes: Number(d.size_bytes),
        uploadedAt: d.uploaded_at as string,
        purgedAt: (d.purged_at as string | null) ?? null,
      })),
    ),
  });
}

/** Start one. Idempotent: a facility that already has a live one gets it back. */
export async function POST() {
  const resolved = await requireAdminFacility();
  if ("error" in resolved) return resolved.error;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("merchant_applications")
    .insert({
      facility_id: resolved.facility.id,
      // Who may edit the principals and the documents later. The policies key
      // on this, so it is the submitter's identity rather than a display name.
      created_by: resolved.viewer.userId,
      // Sensible starting points a facility can change, not assertions: the
      // business name Yipyy already holds, and its country.
      legal_name: resolved.facility.name,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 is the partial unique index: they already have a live one. That is
    // not a failure, it is the idempotent answer.
    if (error.code === "23505") {
      return GET();
    }
    return writeFailure(error, {
      duplicate: "You already have an application in progress.",
      denied: "Only an owner or administrator can apply for Yipyy Pay.",
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

interface PatchBody {
  step?: unknown;
  values?: unknown;
}

/**
 * Save one step.
 *
 * Per step rather than whole-application, because a five-step form that
 * validated everything on every save would refuse to store step 1 until step 4
 * was filled in — see the banner on lib/boarding/application.ts.
 */
export async function PATCH(request: NextRequest) {
  const resolved = await requireAdminFacility();
  if ("error" in resolved) return resolved.error;

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  const step = typeof body?.step === "string" ? body.step : "";

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("merchant_applications")
    .select("id, status")
    .eq("facility_id", resolved.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "There is no application to save." },
      { status: 404 },
    );
  }

  // A submitted application is frozen. Said here as well as in RLS because the
  // person deserves a sentence rather than a silent no-op.
  if (!isEditable(existing.status as ApplicationStatus)) {
    return NextResponse.json(
      {
        error:
          "This application has been submitted and can no longer be changed.",
      },
      { status: 409 },
    );
  }

  let patch: Record<string, unknown>;

  if (step === "business") {
    const parsed = businessStepSchema.safeParse(body?.values);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Check the details." },
        { status: 422 },
      );
    }
    const v = parsed.data;
    patch = {
      legal_name: v.legalName,
      trading_name: v.tradingName || null,
      business_structure: v.businessStructure,
      tax_id: v.taxId,
      incorporated_on: v.incorporatedOn || null,
      address_line1: v.addressLine1,
      address_line2: v.addressLine2 || null,
      city: v.city,
      region: v.region,
      postal_code: v.postalCode,
      country: v.country,
      business_phone: v.businessPhone,
      business_email: v.businessEmail,
      website: v.website || null,
    };
  } else if (step === "banking") {
    const parsed = bankingStepSchema.safeParse(body?.values);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Check the details." },
        { status: 422 },
      );
    }
    const v = parsed.data;
    patch = {
      bank_account_name: v.bankAccountName,
      estimated_monthly_volume_cents: v.estimatedMonthlyVolumeCents,
      average_ticket_cents: v.averageTicketCents,
      highest_ticket_cents: v.highestTicketCents,
      card_not_present_percent: v.cardNotPresentPercent,
      refund_policy: v.refundPolicy,
    };
  } else {
    return NextResponse.json(
      { error: `Unknown step: ${step || "(none)"}` },
      { status: 422 },
    );
  }

  const { data: written, error } = await supabase
    .from("merchant_applications")
    .update(patch as never)
    .eq("id", existing.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "",
      denied: "You do not have permission to change this application.",
    });
  }

  // An UPDATE refused by its `using` clause affects zero rows and answers
  // success — which would report "Saved" over a row that never moved.
  const denied = deniedIfUntouched(
    written,
    "You do not have permission to change this application.",
  );
  if (denied) return denied;

  return NextResponse.json({ ok: true });
}
