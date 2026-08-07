import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { listFacilitiesForAdmin } from "@/lib/api/admin-facilities";
import { attachFacilityDomain } from "@/lib/vercel/domains";
import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// Creating a facility — the act that turns Yipyy into a platform.
//
// Spec 002 phase 1. `/dashboard/facilities/new` collected six steps of data and
// its handleComplete was `console.log(...)` and a redirect. A superadmin could
// finish the wizard and get back a list that did not contain their facility.
//
// ── ONE CALL, NOT SIX ─────────────────────────────────────────────────────
//
// Everything happens inside `provision_facility` (20260807200000): org,
// facility, primary location, the owner's staff row and the membership grant,
// in one transaction. A half-created facility is a support ticket that reads as
// corruption, and Postgres already gives all-or-nothing for free.
//
// ── WHAT THIS ROUTE ADDS ON TOP ───────────────────────────────────────────
//
// Shape and language. The function raises 23514 for a reserved slug, which is
// correct and unreadable; a superadmin needs "that address is reserved". Zod
// rejects nonsense before it reaches Postgres, and the slug is checked for
// availability first so the common failure is a sentence rather than a code.
//
// ── WHAT IT DOES NOT ADD: PERMISSION ──────────────────────────────────────
//
// The `isPlatformAdmin` check below is a courtesy — a clear 403 instead of a
// database error. It is NOT the boundary. `provision_facility` guards itself as
// its first statement, because it is SECURITY DEFINER and therefore runs around
// RLS; deleting this check would change the error message and nothing else.
// supabase/tests/facility-provisioning.sql P2 asserts that directly.
//
// ── NO PASSWORD ───────────────────────────────────────────────────────────
//
// Spec 002 D3: the owner is invited and sets their own password, so nobody at
// Yipyy ever holds a credential for a customer's business. The wizard's
// password fields — left over from the rejected design — are gone with this
// change rather than left inert, because a form that collects a password and
// discards it is a lie told to a superadmin.
//
// Phase 2 sends the Clerk invitation. Until then the grant is recorded, and
// claimed the moment that person signs up.
// ============================================================================

export const dynamic = "force-dynamic";

/**
 * A DNS label, because spec 002 D2 puts every facility on its own subdomain.
 * Mirrors `facilities_slug_is_a_dns_label`; the database is the enforcement,
 * this is the readable error.
 */
const SLUG = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;

const ProvisionInput = z.object({
  /**
   * Minted by the caller so a double-click, a retried fetch or a redeployed
   * function cannot create two businesses. Required rather than defaulted: a
   * server-generated id would be different on every retry, which is the exact
   * failure this prevents.
   */
  requestId: z.uuid(),
  name: z.string().trim().min(1, "A facility name is required."),
  slug: z.string().trim().toLowerCase().optional(),
  timezone: z.string().trim().min(1).default("America/Toronto"),
  ownerName: z.string().trim().min(1, "The owner's name is required."),
  ownerEmail: z.email("A valid owner email address is required."),
  ownerPhone: z.string().trim().optional(),
  contactEmail: z.email().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  locations: z.array(z.object({ name: z.string().trim().min(1) })).default([]),
  /** Boarding, daycare, grooming… The list renders these as badges. */
  businessTypes: z.array(z.string().trim().min(1)).default([]),
});

/** "Pawradise Resort" → "pawradise-resort". */
function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      // \p{M} is the Unicode Mark category — every combining mark, not just the
      // 0300-036F block. Written as a property escape so the source stays ASCII:
      // a literal range here is invisible in an editor and dies to a copy-paste.
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "")
  );
}

/**
 * Every facility on the platform, for the superadmin's list.
 *
 * Platform-admin only, and RLS says so too — a facility owner who finds this
 * URL gets their own facility back at most, not the directory.
 */
export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may list facilities." },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json(await listFacilitiesForAdmin());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may create a facility." },
      { status: 403 },
    );
  }

  const parsed = ProvisionInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid facility details." },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const slug = input.slug?.trim() || slugify(input.name);

  // A name with no Latin characters at all — "日本ペット" — slugifies to nothing.
  // Saying `"" cannot be a web address` would be true and useless; the fix is
  // for the superadmin to supply one, so say that.
  if (!slug) {
    return NextResponse.json(
      {
        error: `A web address could not be made from "${input.name}". Enter one directly.`,
      },
      { status: 422 },
    );
  }

  if (!SLUG.test(slug)) {
    return NextResponse.json(
      {
        error: `"${slug}" cannot be a web address. Use lowercase letters, numbers and hyphens.`,
      },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Asked before provisioning so the common failure is a sentence rather than
  // a 23505 raised four inserts deep. This is NOT the uniqueness guarantee —
  // two superadmins racing would both pass here and the unique index would
  // still decide. That case is handled below.
  const { data: taken } = await supabase
    .from("facilities")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (taken) {
    return NextResponse.json(
      { error: `"${slug}" is already taken. Try "${slug}-2" or another name.` },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.rpc("provision_facility", {
    p_request_id: input.requestId,
    p_name: input.name,
    p_slug: slug,
    p_timezone: input.timezone,
    p_owner_name: input.ownerName,
    p_owner_email: input.ownerEmail,
    p_owner_phone: input.ownerPhone ?? null,
    p_contact_email: input.contactEmail || null,
    p_contact_phone: input.contactPhone ?? null,
    p_website: input.website ?? null,
    p_locations: input.locations,
    p_business_types: input.businessTypes,
  });

  if (error) {
    // 23514 is the slug check constraint. Postgres names the constraint it
    // broke, which tells a superadmin nothing, so the two cases are separated
    // here — reserved and malformed are different mistakes with different
    // fixes.
    if (error.code === "23514") {
      return NextResponse.json(
        {
          error: error.message?.includes("not_reserved")
            ? `"${slug}" is reserved by the platform. Choose another web address.`
            : `"${slug}" cannot be a web address. Use lowercase letters, numbers and hyphens.`,
        },
        { status: 422 },
      );
    }
    return writeFailure(error as PostgrestError, {
      denied: "Only a platform administrator may create a facility.",
      duplicate: `"${slug}" is already taken. Try another web address.`,
    });
  }

  const result = data as { replayed?: boolean; facilityId?: string } | null;

  // ── The invitation, AFTER the transaction has committed ──────────────────
  //
  // Order matters and only in this direction. An email about a facility whose
  // insert then rolled back is unrecoverable — the owner clicks into nothing
  // and nobody knows. A facility whose email failed is one click from fixed,
  // and the GET below tells a superadmin which facilities are in that state.
  //
  // So a failed send does not fail the request: the facility is real, the
  // grant is real, and `invite` reports honestly what happened to the email.
  //
  // Skipped on a replay. Retrying a request must not re-send an email the
  // owner already has.
  // ── The subdomain, also after the commit, and also non-fatal ─────────────
  //
  // Spec 002 D2 gives every facility its own host. Doing it here rather than
  // leaving it to a superadmin is the difference between "provisioning is one
  // action" and "provisioning is one action plus a note to open Vercel".
  //
  // Attempted on a REPLAY too, unlike the invitation: attaching a domain that
  // is already attached is a no-op that Vercel reports as 409, whereas sending
  // an email twice is a second email. Retrying an idempotent thing is how a
  // half-finished provisioning gets finished.
  const domain = result?.facilityId
    ? await attachFacilityDomain(slug)
    : { attached: false as const, host: null, reason: "No facility created." };

  if (!domain.attached) {
    console.error(`Subdomain for "${slug}" not attached: ${domain.reason}`);
  }

  let invite: unknown = null;
  if (result?.facilityId && !result.replayed) {
    // link-origin-ok: this is not a link anyone sees — it is this server
    // calling its own invite route, so it must resolve to the host actually
    // serving this request. The URL that ends up IN the email is derived from
    // the facility's slug inside that route (lib/public-origin.ts).
    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      new URL(request.url).origin;

    invite = await fetch(
      `${origin}/api/facilities/${result.facilityId}/invite-owner`,
      {
        method: "POST",
        headers: {
          // The caller's session, forwarded — the invite route checks
          // is_platform_admin against it, and this must not become a way to
          // send an invitation without one.
          cookie: request.headers.get("cookie") ?? "",
        },
      },
    )
      .then((response) => response.json())
      .catch((caught) => {
        console.error("Owner invitation could not be sent:", caught);
        return { sent: false, reason: "send_failed" };
      });
  }

  // A replay is not a creation. 200 rather than 201 so a retried request is
  // honestly reported as "this already existed" instead of claiming to have
  // made a second facility.
  return NextResponse.json(
    { ...result, invite, domain },
    { status: result?.replayed ? 200 : 201 },
  );
}
