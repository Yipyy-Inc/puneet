import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import type { ApplicationStatus } from "@/lib/merchant-application/application";
import {
  canMoveTo,
  reviewDecisionSchema,
} from "@/lib/merchant-application/review";

// ============================================================================
// One application, as the person deciding it sees it — and the decision itself.
//
// ── WHAT IT DOES NOT RETURN, AND WHY THAT IS A PROBLEM ────────────────────
//
// Not the national identity numbers, and not the bank account number. They are
// in Vault, and `read_boarding_secret` is granted to `service_role` ALONE with
// no permission check inside it — the grant is the entire boundary, which is
// the correct shape for a definer function and means there is no platform-admin
// path to the values today. Nothing in `src/` calls it.
//
// So this screen can decide an application but cannot yet hand the numbers to
// an acquirer, which is a real gap in the workflow rather than a deliberate
// restriction. It is stated on the screen and in the debt map instead of being
// quietly worked around, because the way to work around it — a service_role
// route that decrypts an identity number on request — needs an audit trail
// designed for it, and this repo's audit log is written by triggers only.
//
// ── THE DECISION IS AN UPDATE, SO IT COUNTS ROWS ──────────────────────────
//
// An RLS-refused UPDATE affects zero rows and returns SUCCESS. A reviewer who
// pressed Approve and was refused would see "Approved" over an application that
// had not moved. `deniedIfUntouched` is what turns that back into a 403, and
// `bun run check:rls-writes` is what keeps it there.
//
// ── AND THE MACHINE IS ASKED BEFORE THE DATABASE IS ───────────────────────
//
// The trigger lets a platform admin move any status to any other. That is right
// for a boundary and wrong for a workflow: it would happily approve something
// already rejected. `canMoveTo` is checked here, against the status read in the
// same request, so the answer is a sentence rather than a silent nonsense.
// ============================================================================

const BUCKET = "merchant-applications";
const SIGNED_URL_TTL_SECONDS = 300;

const DETAIL_SELECT =
  "id, facility_id, status, status_detail, external_reference, legal_name, trading_name, business_structure, tax_id, incorporated_on, address_line1, address_line2, city, region, postal_code, country, business_phone, business_email, website, estimated_monthly_volume_cents, average_ticket_cents, highest_ticket_cents, card_not_present_percent, refund_policy, bank_account_name, bank_last4, signed_name, signed_terms, signed_at, submitted_at, decided_at, purged_at, created_at, facilities(name, slug)";

async function requirePlatformAdmin() {
  const viewer = await getViewer();
  if (viewer.source !== "session") {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  if (!viewer.isPlatformAdmin) {
    return {
      error: NextResponse.json(
        { error: "Only Yipyy staff can open the review queue." },
        { status: 403 },
      ),
    };
  }
  return { supabase: await createServerClient() };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePlatformAdmin();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;
  const { supabase } = gate;

  const { data: row, error } = await supabase
    .from("merchant_applications")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // No row and no error is RLS refusing, not a missing application — but the
  // caller cannot tell the two apart and should not be told which, so both are
  // 404.
  if (!row) {
    return NextResponse.json(
      { error: "No such application." },
      { status: 404 },
    );
  }

  const application = row as unknown as Record<string, unknown> & {
    facilities: { name: string | null; slug: string | null } | null;
  };

  const [{ data: principalRows }, { data: documentRows }] = await Promise.all([
    supabase
      .from("merchant_application_principals")
      .select(
        "id, full_name, title, ownership_percent, date_of_birth, email, phone, address_line1, address_line2, city, region, postal_code, country, is_control_person, national_id_last4",
      )
      .eq("application_id", id)
      .order("created_at"),
    supabase
      .from("merchant_application_documents")
      .select(
        "id, doc_type, principal_id, file_name, content_type, size_bytes, storage_path, uploaded_at, purged_at",
      )
      .eq("application_id", id)
      .order("uploaded_at"),
  ]);

  const documents = await Promise.all(
    (documentRows ?? []).map(async (doc) => {
      const purged = (doc.purged_at as string | null) ?? null;
      // A purged row keeps its name as proof the document WAS supplied, but the
      // object behind it is gone. Signing a URL for it would produce a link
      // that 404s, which reads as a bug rather than as "we deleted this on
      // purpose".
      const signed = purged
        ? null
        : await supabase.storage
            .from(BUCKET)
            .createSignedUrl(
              doc.storage_path as string,
              SIGNED_URL_TTL_SECONDS,
            );
      return {
        id: doc.id as string,
        docType: doc.doc_type as string,
        principalId: (doc.principal_id as string | null) ?? null,
        fileName: doc.file_name as string,
        contentType: doc.content_type as string,
        sizeBytes: Number(doc.size_bytes),
        uploadedAt: doc.uploaded_at as string,
        purgedAt: purged,
        url: signed?.data?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({
    application: {
      id: application.id as string,
      facilityId: application.facility_id as string,
      facilityName: application.facilities?.name ?? null,
      facilitySlug: application.facilities?.slug ?? null,
      status: application.status as ApplicationStatus,
      statusDetail: (application.status_detail as string | null) ?? null,
      externalReference:
        (application.external_reference as string | null) ?? null,
      legalName: (application.legal_name as string | null) ?? null,
      tradingName: (application.trading_name as string | null) ?? null,
      businessStructure:
        (application.business_structure as string | null) ?? null,
      taxId: (application.tax_id as string | null) ?? null,
      incorporatedOn: (application.incorporated_on as string | null) ?? null,
      addressLine1: (application.address_line1 as string | null) ?? null,
      addressLine2: (application.address_line2 as string | null) ?? null,
      city: (application.city as string | null) ?? null,
      region: (application.region as string | null) ?? null,
      postalCode: (application.postal_code as string | null) ?? null,
      country: (application.country as string | null) ?? null,
      businessPhone: (application.business_phone as string | null) ?? null,
      businessEmail: (application.business_email as string | null) ?? null,
      website: (application.website as string | null) ?? null,
      estimatedMonthlyVolumeCents:
        (application.estimated_monthly_volume_cents as number | null) ?? null,
      averageTicketCents:
        (application.average_ticket_cents as number | null) ?? null,
      highestTicketCents:
        (application.highest_ticket_cents as number | null) ?? null,
      cardNotPresentPercent:
        (application.card_not_present_percent as number | null) ?? null,
      refundPolicy: (application.refund_policy as string | null) ?? null,
      bankAccountName: (application.bank_account_name as string | null) ?? null,
      bankLast4: (application.bank_last4 as string | null) ?? null,
      signedName: (application.signed_name as string | null) ?? null,
      signedTerms: (application.signed_terms as string | null) ?? null,
      signedAt: (application.signed_at as string | null) ?? null,
      submittedAt: (application.submitted_at as string | null) ?? null,
      decidedAt: (application.decided_at as string | null) ?? null,
      purgedAt: (application.purged_at as string | null) ?? null,
      createdAt: application.created_at as string,
      principals: (principalRows ?? []).map((p) => ({
        id: p.id as string,
        fullName: (p.full_name as string | null) ?? "",
        title: (p.title as string | null) ?? "",
        ownershipPercent: Number(p.ownership_percent ?? 0),
        dateOfBirth: (p.date_of_birth as string | null) ?? "",
        email: (p.email as string | null) ?? "",
        phone: (p.phone as string | null) ?? "",
        addressLine1: (p.address_line1 as string | null) ?? "",
        addressLine2: (p.address_line2 as string | null) ?? "",
        city: (p.city as string | null) ?? "",
        region: (p.region as string | null) ?? "",
        postalCode: (p.postal_code as string | null) ?? "",
        country: (p.country as string | null) ?? "",
        isControlPerson: p.is_control_person === true,
        nationalIdLast4: (p.national_id_last4 as string | null) ?? null,
      })),
      documents,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePlatformAdmin();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;
  const { supabase } = gate;

  const parsed = reviewDecisionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the decision." },
      { status: 422 },
    );
  }

  const { data: current } = await supabase
    .from("merchant_applications")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json(
      { error: "No such application." },
      { status: 404 },
    );
  }

  const from = current.status as ApplicationStatus;
  if (!canMoveTo(from, parsed.data.status)) {
    return NextResponse.json(
      {
        error: `An application that is ${from.replace(/_/g, " ")} cannot be moved to ${parsed.data.status.replace(/_/g, " ")}.`,
      },
      { status: 409 },
    );
  }

  const decided =
    parsed.data.status === "approved" || parsed.data.status === "rejected";

  const patch: Record<string, unknown> = {
    status: parsed.data.status,
    // Written unconditionally, including to null. A `more_info_needed` note left
    // standing under a later Approve would tell the facility their approved
    // application still needs something.
    status_detail: parsed.data.detail?.trim() || null,
    decided_at: decided ? new Date().toISOString() : null,
  };
  if (parsed.data.reference !== undefined) {
    patch.external_reference = parsed.data.reference.trim() || null;
  }

  const { data: updated, error } = await supabase
    .from("merchant_applications")
    .update(patch as never)
    .eq("id", id)
    // Optimistic concurrency: two reviewers with the queue open both press a
    // button, and without this the second one silently overwrites the first's
    // decision. The loser gets the 409 above's sibling — a refusal naming what
    // changed underneath them.
    .eq("status", from)
    .select("id, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const refused = deniedIfUntouched(
    updated,
    "That decision was not recorded — either somebody else moved this application first, or your account may no longer review them. Reload and look again.",
  );
  if (refused) return refused;

  return NextResponse.json({ status: parsed.data.status });
}
