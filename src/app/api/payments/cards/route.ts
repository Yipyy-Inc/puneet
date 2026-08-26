import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { vaultCard } from "@/lib/clover/vault";

// ============================================================================
// The cards a customer has agreed we may charge again.
//
// ── THE ROW IS WRITTEN AS THE CALLER, ON PURPOSE ──────────────────────────
//
// Not with the service role. `saved_cards` has an insert policy admitting the
// cardholder or somebody holding `financial_take_payment` at that facility, and
// writing as the caller is what makes that policy the authorisation — rather
// than a check in this file that a reviewer looking at permissions would never
// find. The same reasoning `attach_unattached_payment` records for being
// `security invoker`.
//
// ── CONSENT IS RECORDED, NOT ASSUMED ──────────────────────────────────────
//
// Clover requires explicit cardholder consent before storing a credential, so
// the body must carry it and the row records WHEN and BY WHOM. A request
// without it is refused here — before the card is vaulted at Clover, so we do
// not create a stored credential we would then have to go and delete.
//
// ── AND THE CARD IS VAULTED BEFORE THE ROW EXISTS ─────────────────────────
//
// If Clover refuses, there is no row: a `saved_cards` entry with no credential
// behind it is a card the customer can select and nobody can charge. The
// reverse order — row first, vault second — would leave exactly that on a
// failure, and this table has no DELETE grant to clean it up with.
// ============================================================================

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  /** The `clv_` token the browser produced. Never a card number. */
  source: z.string().min(8).max(200),
  clientId: z.string().uuid(),
  /**
   * The cardholder's explicit agreement. Not a default, not inferred from the
   * request having been made — see the banner.
   */
  consent: z.literal(true),
});

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const clientId = request.nextUrl.searchParams.get("clientId");

  // No facility filter and no permission check in this file. `saved_cards_read`
  // admits the cardholder, a platform admin, or staff holding
  // `financial_view_amounts` at the card's own facility — so a caller who
  // should see nothing gets an empty list, which is the same answer as a
  // customer who has saved no cards. That is deliberate: the list must not
  // reveal that somebody else's cards exist.
  let query = supabase
    .from("saved_cards")
    .select(
      "id, client_id, facility_id, card_brand, card_last4, exp_month, exp_year, consent_at, created_at",
    )
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Saved cards could not be read." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    cards: (data ?? []).map((card) => ({
      id: card.id,
      clientId: card.client_id,
      brand: card.card_brand,
      last4: card.card_last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      // A card with no consent cannot be charged. Reported so a screen can say
      // why rather than offering a card that will be refused.
      chargeable: card.consent_at !== null,
      savedAt: card.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // facility-from-request-ok: the facility comes from the session, never the
  // body. A caller who could name it could store a card against somebody
  // else's merchant account.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "A card, a customer and the cardholder's explicit consent are all required.",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  // Read the customer first — for their email, which Clover wants on the
  // customer record, and to confirm the caller can see them at all. RLS answers
  // both questions in one read.
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("id", parsed.data.clientId)
    .eq("facility_id", context.facilityId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: "That customer could not be found." },
      { status: 404 },
    );
  }

  const vaulted = await vaultCard({
    facilityId: context.facilityId,
    source: parsed.data.source,
    email: client.email,
    firstName: client.name,
  });

  if (!vaulted.ok) {
    // `not_enabled` is the merchant account, not a bug and not the customer's
    // card. It is passed through verbatim so the screen can say which.
    return NextResponse.json(
      { error: vaulted.message, code: vaulted.code },
      { status: vaulted.code === "not_enabled" ? 409 : 502 },
    );
  }

  const { data: saved, error } = await supabase
    .from("saved_cards")
    .insert({
      facility_id: context.facilityId,
      client_id: client.id,
      processor: "clover",
      processor_customer_id: vaulted.customerId,
      processor_card_id: vaulted.cardId,
      card_brand: vaulted.brand,
      card_last4: vaulted.last4,
      exp_month: vaulted.expMonth,
      exp_year: vaulted.expYear,
      consent_at: new Date().toISOString(),
      consent_by: viewer.email ?? viewer.userId,
      created_by: viewer.userId,
    })
    .select("id, card_brand, card_last4, exp_month, exp_year")
    .single();

  if (error || !saved) {
    // The card IS vaulted at Clover and we failed to write it down. Say so
    // rather than "could not save card": the customer may see it on a
    // statement-adjacent screen at Clover, and a second attempt will produce
    // the same card id, which the partial unique index treats as one card.
    return NextResponse.json(
      {
        error:
          "The card was stored at the processor but could not be recorded here. Try again — it will not be stored twice.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    card: {
      id: saved.id,
      brand: saved.card_brand,
      last4: saved.card_last4,
      expMonth: saved.exp_month,
      expYear: saved.exp_year,
      chargeable: true,
    },
  });
}
