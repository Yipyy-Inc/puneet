import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import {
  GIFT_CARD_PAGE_SORTS,
  likePattern,
  parseGiftCardPageParams,
} from "@/lib/api/gift-card-page-params";
import { CARD_SELECT, toCardRow } from "@/lib/api/mappers/gift-card";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// One page of the facility's gift cards, searched, filtered and sorted here.
//
// The gift-cards screen loaded every card the facility had ever issued and did
// all of that in the browser. Measured 2026-09-17 on the e2e facility: 6,022
// cards, 3,467 KB, 5.5 s. Cards are never deleted — `gift_cards` has no DELETE
// policy, deliberately, because a bearer instrument is voided rather than
// erased — so that list only grows, forever, at every facility.
//
// ── SCOPE ─────────────────────────────────────────────────────────────────
//
// The facility on screen (`activeFacilityIdForStaff`), then RLS, which requires
// financial_manage_gift_cards. For a platform admin or somebody in two
// facilities RLS admits them all, so the facility is named rather than left to
// it — a merged page belongs to nobody.
//
// ── SEARCHING A BEARER INSTRUMENT ─────────────────────────────────────────
//
// `q` matches part of a code, a recipient's name or their email, which is what
// the box on screen has always done. The wildcards inside `q` are escaped by
// `likePattern`: `%` and `_` left live would let somebody match a code they do
// not know one character at a time, and a gift card code is money.
//
// The EXACT-code counter lookup is not this route — that is
// `/api/gift-cards?code=`, which returns one row and answers "no such card"
// identically for a code belonging to another facility.
// ============================================================================

export const dynamic = "force-dynamic";

export interface GiftCardPagePayload {
  cards: ReturnType<typeof toCardRow>[];
  /** Every card matching the filters, not just the ones on this page. */
  total: number;
}

const EMPTY: GiftCardPagePayload = { cards: [], total: 0 };

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  // An empty page rather than a 404: no facility on screen means no cards, and
  // that is a fact rather than a failure.
  if (!scope) return NextResponse.json(EMPTY);

  const params = parseGiftCardPageParams(new URL(request.url).searchParams);
  const supabase = await createServerClient();

  let query = supabase
    .from("gift_cards")
    .select(CARD_SELECT, { count: "exact" })
    .eq("facility_id", scope);

  if (params.status) query = query.eq("status", params.status);
  if (params.kind) query = query.eq("kind", params.kind);
  if (params.q) {
    const pattern = likePattern(params.q);
    query = query.or(
      `code.ilike.${pattern},recipient_name.ilike.${pattern},recipient_email.ilike.${pattern}`,
    );
  }

  // Newest first unless the table asked otherwise. `issued_at` and not
  // `created_at`: the screen's "Issued" column is the former, and a table whose
  // arrow sorts by a column it is not showing is worse than one that cannot
  // sort at all.
  const column = params.sort ? GIFT_CARD_PAGE_SORTS[params.sort] : "issued_at";
  query = query.order(column, { ascending: params.dir === "asc" });

  const from = (params.page - 1) * params.pageSize;
  const { data, error, count } = await query.range(
    from,
    from + params.pageSize - 1,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  return NextResponse.json({
    cards: (data ?? []).map((row) => toCardRow(row as never, now)),
    total: count ?? 0,
  } satisfies GiftCardPagePayload);
}
