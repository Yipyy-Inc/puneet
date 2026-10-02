import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { facilityCustomerLinkOrigin } from "@/lib/public-origin";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Send a client the link to sign the facility's agreements (the booking
// wizard's Confirm, the client's mock, 2026-10-02: "Email signing link /
// Text signing link").
//
// The link opens /agreements/{token} — no account, no sign-in: the token is
// the client's, minted here, hashed into `waiver_signing_links` and never
// stored (20261002123123). It covers the agreements this client still has to
// sign for the service, frozen as they are now, so what they sign is what
// staff saw.
//
// Staff who may edit clients send it: RLS on `waiver_signing_links` decides,
// and a refused insert is a 403. The message goes through the one sender and
// asks the opt-out list first — transactional, so only a STOP stops it.
// ============================================================================

export const dynamic = "force-dynamic";

const LINK_DAYS = 14;

const inputSchema = z.object({
  /** The client's ref. */
  clientRef: z.number().int().positive(),
  /** Which service's agreements; absent is every one that applies to all. */
  service: z.string().trim().min(1).max(60).optional(),
  channel: z.enum(["email", "sms"]),
});

interface WaiverRow {
  id: string;
  name: string;
  services: string[] | null;
}

function applies(services: string[] | null, service: string | undefined) {
  return (
    !services ||
    services.length === 0 ||
    services.includes("general") ||
    (!!service && services.includes(service))
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 403 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Which client, and by email or by SMS?" },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, phone, preferred_language")
    .eq("facility_id", context.facilityId)
    .eq("ref", input.clientRef)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  // What is left to sign: the facility's agreements that apply, less the ones
  // this client holds a signature of that is neither revoked nor expired.
  const [{ data: waiverRows }, { data: signatureRows }] = await Promise.all([
    supabase
      .from("waivers")
      .select("id, name, services")
      .eq("facility_id", context.facilityId)
      .eq("active", true)
      .eq("requires_signature", true),
    supabase
      .from("waiver_signatures")
      .select("waiver_id, revoked_at, expires_at")
      .eq("client_id", client.id),
  ]);
  const now = Date.now();
  const signed = new Set(
    (signatureRows ?? [])
      .filter(
        (s) =>
          s.waiver_id &&
          !s.revoked_at &&
          (!s.expires_at || new Date(s.expires_at).getTime() > now),
      )
      .map((s) => s.waiver_id as string),
  );
  const pending = ((waiverRows ?? []) as WaiverRow[]).filter(
    (w) => applies(w.services, input.service) && !signed.has(w.id),
  );
  if (pending.length === 0) {
    return NextResponse.json(
      { error: "Nothing is left for this client to sign." },
      { status: 409 },
    );
  }

  const address =
    input.channel === "email" ? client.email?.trim() : client.phone?.trim();
  if (!address) {
    return NextResponse.json({
      sent: false,
      detail:
        input.channel === "email"
          ? "This client has no email address on file."
          : "This client has no phone number on file.",
    });
  }
  const suppression = await isSuppressed(
    supabase as unknown as SupabaseClient,
    {
      facilityId: context.facilityId,
      channel: input.channel,
      address,
      isTransactional: true,
    },
  );
  if (suppression.suppressed) {
    return NextResponse.json({
      sent: false,
      detail:
        suppression.reason === "invalid_address"
          ? "The address on file is not one a message can be sent to."
          : "This client has opted out of these messages.",
    });
  }

  // 256 bits from the OS, base64url so a phone's link detector keeps it
  // whole; only its sha256 is stored (lib/reputation/token.ts, same reasons).
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const { error: linkError } = await supabase
    .from("waiver_signing_links")
    .insert({
      facility_id: context.facilityId,
      client_id: client.id,
      token_hash: `\\x${hash}`,
      waiver_ids: pending.map((w) => w.id),
      service: input.service ?? null,
      channel: input.channel,
      sent_to: address,
      created_by: user.id,
      expires_at: new Date(now + LINK_DAYS * 86_400_000).toISOString(),
    });
  if (linkError) {
    const denied = linkError.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "Not allowed to send this client's agreements."
          : linkError.message,
      },
      { status: denied ? 403 : 500 },
    );
  }

  const { data: facility } = await supabase
    .from("facilities")
    .select("name, slug")
    .eq("id", context.facilityId)
    .maybeSingle();
  const link = `${facilityCustomerLinkOrigin(
    facility?.slug,
    request,
  )}/agreements/${token}`;

  const result = await deliver(input.channel, address, {
    french: Boolean(client.preferred_language?.startsWith("fr")),
    firstName: client.name.split(/\s+/)[0] ?? client.name,
    facilityName: facility?.name ?? "",
    names: pending.map((w) => w.name),
    link,
  });
  return NextResponse.json({ ...result, to: address });
}

/** The message, in the client's language: what to sign, and where. */
function deliver(
  channel: "email" | "sms",
  address: string,
  m: {
    french: boolean;
    firstName: string;
    facilityName: string;
    names: string[];
    link: string;
  },
) {
  const NB = " ";
  const list = m.names.join(", ");
  const subject = m.french
    ? `${m.facilityName}${NB}: ententes à signer`
    : `${m.facilityName}: agreements to sign`;
  const text = m.french
    ? `Bonjour ${m.firstName}, ${m.facilityName} a besoin de votre signature${NB}: ${list}. Signez en ligne${NB}: ${m.link}`
    : `Hi ${m.firstName}, ${m.facilityName} needs your signature on: ${list}. Sign online: ${m.link}`;

  if (channel === "sms") return sendSms({ to: address, body: text });

  const html = `<p>${escapeHtml(text.split(m.link)[0])}<a href="${escapeHtml(
    m.link,
  )}">${escapeHtml(m.link)}</a></p>`;
  return sendEmail({ to: address, subject, text, html });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
