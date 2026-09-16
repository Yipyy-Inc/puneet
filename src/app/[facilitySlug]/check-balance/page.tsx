import type { Metadata } from "next";

import { getBrandingBySlug } from "@/lib/api/facility-branding";

import { PublicCheckBalance } from "./_components/PublicCheckBalance";

// ============================================================================
// "How much is left on this card?", asked by somebody holding one.
//
// ── IT NAMED THE WRONG BUSINESS TO EVERY VISITOR ──────────────────────────
//
// Until 2026-09-16 this awaited `params` and threw the slug away
// (`await params; // mock resolves to FACILITY_ID`), pinning the name, logo and
// brand colour to fixture facility 11 — "Example Pet Care Facility". So a
// customer who followed a link from their own groomer was shown a business that
// does not exist, on a page asking them to type a number off a gift card. That
// is the same defect walking CUJ-20 found in the customer portal on 2026-08-19,
// left behind here because nothing links to this route and nobody opened it.
//
// The slug resolves the facility now, exactly as the reviews wall beside it
// does, through the same SECURITY DEFINER projection.
//
// ── AN UNKNOWN SLUG STILL RENDERS ─────────────────────────────────────────
//
// Copied from `../reviews/page.tsx` deliberately, for its reason as well as its
// shape: a 404 here would turn the route into a way to ask which businesses are
// on Yipyy.
//
// ── THE LOOKUP ITSELF IS STILL THE FIXTURE ────────────────────────────────
//
// `/api/gift-cards?code=` is the real "check balance", and it requires a
// viewer — it is the counter's question, asked by staff. Answering it for a
// signed-out stranger needs an endpoint that does not exist yet, and a public
// balance lookup on a bearer instrument is a rate-limiting and enumeration
// decision, not a mapping change. So this page searches the fixture, finds
// nothing for a real facility, and says so — which is the answer the design
// already calls for, since a code belonging to another facility and a code
// nobody has must be indistinguishable. Debt map.
// ============================================================================

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ facilitySlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facilitySlug } = await params;
  const branding = await getBrandingBySlug(facilitySlug);

  if (!branding)
    return { title: "Check a gift card", robots: { index: false } };

  return {
    title: `Check a gift card · ${branding.name}`,
    robots: { index: false, follow: true },
  };
}

export default async function PublicCheckBalancePage({ params }: Props) {
  const { facilitySlug } = await params;
  const branding = await getBrandingBySlug(facilitySlug);

  return (
    <PublicCheckBalance
      // "this business" is the neutral wording that stays true when no facility
      // answers to the slug — the same choice the reviews wall makes.
      brandName={branding?.name ?? "this business"}
      logoUrl={branding?.logoUrl ?? undefined}
      primaryColor={branding?.primaryColor ?? "#1668E3"}
    />
  );
}
