import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// The facility's own branding — read and save.
//
// Spec 002 phase 3.3. Phase 3 gave a facility a face and a branded login page;
// this is how its owner actually sets one.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// getFacilityContext(), i.e. the caller's membership. Never from the request,
// which is what check:facility-from-session enforces. It matters more here than
// most places: without it, a facility admin could point another tenant's login
// page at an image of their choosing — a defacement of somebody else's
// shopfront, on the one screen their customers trust.
//
// RLS refuses that anyway (facility_branding_insert/update require
// settings_general AT THAT FACILITY), so this is the second lock, not the only
// one.
//
// ── THE LOGO IS UPLOADED DIRECTLY, NOT THROUGH HERE ───────────────────────
//
// The browser writes to the `facility-logos` bucket with its own Clerk-bound
// client, so the same RLS decides it: the path must start with a facility the
// caller holds settings_general on, and Storage enforces the 2 MB cap and the
// png/jpeg/webp allow-list on its side. Proxying the bytes through this route
// would add a multipart hop and a second size limit to keep in sync, and would
// not make anything safer.
//
// What this route does own is the URL that ends up on the login page — because
// that is the part a caller could otherwise point at another facility's row.
// ============================================================================

export const dynamic = "force-dynamic";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Mirrors the CHECK constraints; the database is the enforcement. */
const hexColor = z
  .string()
  .trim()
  .regex(HEX, "Use a colour like #7C3AED.")
  .nullable()
  .or(z.literal("").transform(() => null));

const BrandingInput = z.object({
  logoUrl: z
    .url()
    .nullable()
    .or(z.literal("").transform(() => null)),
  wordmarkUrl: z
    .url()
    .nullable()
    .or(z.literal("").transform(() => null)),
  primaryColor: hexColor,
  accentColor: hexColor,
  tagline: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .or(z.literal("").transform(() => null)),
  supportEmail: z
    .email()
    .nullable()
    .or(z.literal("").transform(() => null)),
  supportPhone: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export async function GET() {
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_branding")
    .select(
      "logo_url, wordmark_url, primary_color, accent_color, tagline, support_email, support_phone",
    )
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A facility with no branding row yet is the normal state on the day it is
  // provisioned, not an error — so this answers with empty fields rather than
  // 404, and the form renders ready to fill in.
  return NextResponse.json({
    facilityId: context.facilityId,
    facilityName: context.name,
    logoUrl: data?.logo_url ?? null,
    wordmarkUrl: data?.wordmark_url ?? null,
    primaryColor: data?.primary_color ?? null,
    accentColor: data?.accent_color ?? null,
    tagline: data?.tagline ?? null,
    supportEmail: data?.support_email ?? null,
    supportPhone: data?.support_phone ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const parsed = BrandingInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid branding." },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const { data, error } = await supabaseUpsert(context.facilityId, input);

  if (error) {
    return writeFailure(error, {
      denied: "You do not have permission to change this facility's branding.",
      duplicate: "",
    });
  }

  return NextResponse.json(data);

  async function supabaseUpsert(
    facilityId: string,
    values: z.infer<typeof BrandingInput>,
  ) {
    const supabase = await createServerClient();
    // Upsert rather than insert-or-update: the row may not exist yet, and
    // asking first would be a read the policy has to allow for no reason.
    return supabase
      .from("facility_branding")
      .upsert(
        {
          facility_id: facilityId,
          logo_url: values.logoUrl,
          wordmark_url: values.wordmarkUrl,
          primary_color: values.primaryColor,
          accent_color: values.accentColor,
          tagline: values.tagline,
          support_email: values.supportEmail,
          support_phone: values.supportPhone,
        } as never,
        { onConflict: "facility_id" },
      )
      .select(
        "logo_url, wordmark_url, primary_color, accent_color, tagline, support_email, support_phone",
      )
      .single()
      .then(({ data: row, error: caught }) => ({
        data: row
          ? {
              logoUrl: row.logo_url,
              wordmarkUrl: row.wordmark_url,
              primaryColor: row.primary_color,
              accentColor: row.accent_color,
              tagline: row.tagline,
              supportEmail: row.support_email,
              supportPhone: row.support_phone,
            }
          : null,
        error: caught as PostgrestError | null,
      }));
  }
}
