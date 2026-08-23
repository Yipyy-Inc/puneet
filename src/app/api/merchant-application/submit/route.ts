import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/viewer";
import { boardingSubmitter } from "@/lib/merchant-application/submitter";
import {
  attestationSchema,
  isEditable,
  REQUIRED_DOCUMENT_TYPES,
  type ApplicationStatus,
} from "@/lib/merchant-application/application";

// ============================================================================
// Submitting: the one irreversible step.
//
// ── IT IS CHECKED HERE, NOT ONLY IN THE BROWSER ───────────────────────────
//
// The wizard will not enable its own button until every step is complete, and
// that is a courtesy rather than a control. This route re-derives completeness
// from the rows, because an application that reaches underwriting missing a
// document comes back rejected days later, and the facility is told the delay
// is theirs.
//
// ── THE STATUS MOVES AS service_role, DELIBERATELY ────────────────────────
//
// A trigger refuses any status change from the applicant except withdrawing
// their own draft — a facility that could mark itself approved would send the
// app connecting to an account nobody opened. So the move to `submitted` is
// made by the admin client, AFTER this route has authorised the caller against
// the session.
//
// ── AND THE ORDER IS: FREEZE, THEN HAND OVER ──────────────────────────────
//
// Status first, submitter second. If the submitter throws, the status is rolled
// back to what it was — an application that says `submitted` and reached
// nowhere is the exact state the seam exists to prevent. There is no distributed
// transaction available here, so the compensating write is explicit and is the
// thing to check first if this ever misbehaves.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const active = await activeAdminFacility();
  if (active.kind !== "resolved") {
    return NextResponse.json(
      {
        error:
          active.kind === "ambiguous"
            ? "You administer more than one facility. Open the one you mean at its own address."
            : "Only an owner or administrator can submit this application.",
      },
      { status: active.kind === "ambiguous" ? 409 : 403 },
    );
  }

  const parsed = attestationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: application } = await supabase
    .from("merchant_applications")
    .select(
      "id, status, legal_name, tax_id, address_line1, city, region, postal_code, country, business_phone, business_email, bank_account_name, bank_last4, refund_policy, estimated_monthly_volume_cents",
    )
    .eq("facility_id", active.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { error: "There is no application to submit." },
      { status: 404 },
    );
  }

  if (!isEditable(application.status as ApplicationStatus)) {
    return NextResponse.json(
      { error: "This application has already been submitted." },
      { status: 409 },
    );
  }

  // ── Completeness, re-derived from the rows ──────────────────────────────

  const missing: string[] = [];

  const requiredBusiness: [string, unknown][] = [
    ["your legal business name", application.legal_name],
    ["your tax number", application.tax_id],
    ["your business address", application.address_line1],
    ["your business phone", application.business_phone],
    ["your business email", application.business_email],
  ];
  for (const [label, value] of requiredBusiness) {
    if (!value) missing.push(label);
  }

  if (!application.bank_last4 || !application.bank_account_name) {
    missing.push("your bank account");
  }
  if (!application.refund_policy) missing.push("your refund policy");

  const { data: principals } = await supabase
    .from("merchant_application_principals")
    .select("id, ownership_percent, is_control_person, national_id_last4")
    .eq("application_id", application.id);

  const owners = principals ?? [];
  if (owners.length === 0) {
    missing.push("at least one owner");
  } else {
    if (owners.filter((p) => p.is_control_person === true).length !== 1) {
      missing.push("exactly one person marked as controlling the business");
    }
    if (owners.some((p) => !p.national_id_last4)) {
      missing.push("an identity number for every owner");
    }
    const total = owners.reduce(
      (sum, p) => sum + Number(p.ownership_percent ?? 0),
      0,
    );
    if (total > 100) {
      missing.push("ownership percentages that add up to 100% or less");
    }
  }

  const { data: documents } = await supabase
    .from("merchant_application_documents")
    .select("doc_type, purged_at")
    .eq("application_id", application.id);

  const supplied = new Set(
    (documents ?? []).filter((d) => !d.purged_at).map((d) => d.doc_type),
  );
  const missingDocs = REQUIRED_DOCUMENT_TYPES.filter((t) => !supplied.has(t));
  if (missingDocs.length > 0) {
    missing.push(`${missingDocs.length} required document(s)`);
  }

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `This application is missing ${missing.join(", ")}.`,
        missing,
      },
      { status: 422 },
    );
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "Submitting is not configured on this deployment. Contact Yipyy support.",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const submittedAt = new Date().toISOString();

  // ── Freeze ──────────────────────────────────────────────────────────────
  //
  // `.eq("status", application.status)` is optimistic concurrency, not decoration.
  // Two people pressing Submit at once both pass every check above — the reads
  // are not locked — and without this both would reach the submitter and the
  // application would be handed over twice. The second UPDATE matches zero rows
  // because the first already moved the status, and the row count is the only
  // way to know that happened.
  const { data: frozen, error: freezeError } = await admin
    .from("merchant_applications")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      signed_name: parsed.data.signedName,
      signed_title: parsed.data.signedTitle,
      // The text as it was shown, copied rather than pointed at — the reason
      // staff_signatures gives at length. A signature against a mutable
      // document proves only that somebody clicked near a row that has since
      // changed.
      signed_terms: ATTESTATION_TEXT,
      signed_at: submittedAt,
      signed_ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      signed_by: viewer.userId,
    } as never)
    .eq("id", application.id)
    .eq("status", application.status)
    .select("id");

  if (freezeError) {
    return NextResponse.json({ error: freezeError.message }, { status: 500 });
  }

  // Zero rows: somebody else submitted between the check and here. Not an
  // error to the person — their application IS submitted — but this request
  // must not go on to hand it over a second time.
  if (!frozen || frozen.length === 0) {
    return NextResponse.json(
      {
        status: "submitted",
        detail: "This application has already been submitted.",
        destination: boardingSubmitter().name,
      },
      { status: 200 },
    );
  }

  // ── Hand over ───────────────────────────────────────────────────────────
  const submitter = boardingSubmitter();
  try {
    const decision = await submitter.submit(application.id);

    // rls-write-ok: runs as service_role, which bypasses RLS entirely, and the
    // row is known to exist because the freeze above matched it. A zero-row
    // result here would mean the row was deleted mid-request, which nothing can
    // do — there is no DELETE policy on this table for anyone.
    await admin
      .from("merchant_applications")
      .update({
        status: decision.status,
        external_reference: decision.reference,
        status_detail: decision.detail,
      } as never)
      .eq("id", application.id);

    return NextResponse.json({
      status: decision.status,
      detail: decision.detail,
      destination: submitter.name,
    });
  } catch (error) {
    // The compensating write. Without it the application says `submitted`,
    // is frozen against further editing, and nothing anywhere has it.
    // rls-write-ok: the compensating write, as service_role, against a row the
    // freeze just matched. If this one silently failed the application would be
    // stuck frozen with nothing holding it — which is why the catch re-reads
    // nothing and reports failure rather than success either way.
    await admin
      .from("merchant_applications")
      .update({
        status: application.status,
        submitted_at: null,
        signed_at: null,
      } as never)
      .eq("id", application.id);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Your application could not be submitted. Nothing was changed — please try again.",
      },
      { status: 502 },
    );
  }
}

/**
 * What the person actually agreed to.
 *
 * A constant rather than a row, and copied onto the application at signing, so
 * that editing this file later cannot change what somebody is recorded as
 * having accepted.
 */
const ATTESTATION_TEXT = [
  "I confirm that the information in this application is true and complete, and that I am authorised to submit it on behalf of the business named.",
  "I understand that Yipyy will pass this information, including identity documents, to the payment provider that will open and hold the merchant account, and that the provider will decide whether to approve it.",
  "I understand that Yipyy stores this information only until the account is open, and deletes the identity documents and identity numbers once it is.",
].join("\n\n");
