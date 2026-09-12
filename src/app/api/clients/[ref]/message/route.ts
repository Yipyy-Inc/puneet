import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import { sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// One message, from a member of staff, to one client — by email or SMS.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// The calendar drawer had two message boxes ("Send reminder SMS", and a
// composer with "Running 10 minutes behind" shortcuts) whose Send pushed onto
// an in-memory array and toasted "SMS sent — to Jamie · (514) 555-0198".
// Nothing left the browser. There was no endpoint for a person to send a
// person a message; the automations send, and they are rules.
//
// ── IT SENDS THROUGH THE ONE SENDER ───────────────────────────────────────
//
// `lib/messaging/send`: staging refuses (it shares production's database),
// an unconfigured provider refuses, and each says so. The answer is
// `{ sent, detail }` either way — "not sent, and why" is a normal outcome the
// screen reports, never an error it hides.
//
// ── AND THE OPT-OUT LIST DECIDES FIRST ────────────────────────────────────
//
// A message a person types is not transactional: a client who opted out of
// either scope is not messaged. That is the stricter reading, and the one a
// CASL complaint would be judged by.
// ============================================================================

export const dynamic = "force-dynamic";

const MAX_BODY = 1600;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 403 });
  }
  if (!holds(await myPermissions(), "communicate_clients")) {
    return NextResponse.json(
      { error: "Not allowed to message clients at this facility." },
      { status: 403 },
    );
  }

  const input = (await request.json().catch(() => null)) as {
    channel?: string;
    body?: string;
    subject?: string;
  } | null;
  const channel = input?.channel;
  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json(
      { error: "Send by email or by SMS." },
      { status: 422 },
    );
  }
  const body = input?.body?.trim() ?? "";
  if (!body || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `A message needs between 1 and ${MAX_BODY} characters.` },
      { status: 422 },
    );
  }

  const { ref } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, phone, facilities ( name )")
    .eq("ref", Number(ref))
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  const client = data as unknown as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    facilities: { name: string } | null;
  } | null;
  if (!client) {
    return NextResponse.json(
      { error: "That client does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const address = channel === "email" ? client.email : client.phone;
  if (!address?.trim()) {
    return NextResponse.json({
      sent: false,
      detail:
        channel === "email"
          ? "This client has no email address on file."
          : "This client has no phone number on file.",
    });
  }

  const suppression = await isSuppressed(
    supabase as unknown as SupabaseClient,
    {
      facilityId: context.facilityId,
      channel,
      address,
      isTransactional: false,
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

  if (channel === "sms") {
    return NextResponse.json(await sendSms({ to: address, body }));
  }

  const facilityName = client.facilities?.name ?? "";
  const subject = input?.subject?.trim() || facilityName;
  return NextResponse.json(
    await sendEmail({
      to: address,
      subject,
      text: body,
      html: `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`,
    }),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
