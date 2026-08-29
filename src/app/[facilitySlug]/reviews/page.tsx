import type { Metadata } from "next";

import { getBrandingBySlug } from "@/lib/api/facility-branding";
import { getPublishedReviews } from "@/lib/api/published-reviews";

import { PublicReviewWall } from "./_components/PublicReviewWall";

// ============================================================================
// The page the Booking-page-reviews tab actually publishes to.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// Moderating a review to `live` wrote a column, and 20260829200000 gave that
// column a reader. This is the page. Until it existed, the moderation screen
// told facilities "these appear on your own booking page" and no surface in the
// product rendered a review anywhere — a control that reached nothing, which is
// the shape this whole conversion has been removing. Saying it on a screen does
// not make it true.
//
// ── NO SIGN-IN, NO SESSION, NO 404 ────────────────────────────────────────
//
// A stranger deciding whether to book is the entire audience. An unknown slug
// renders the same empty wall as a facility that has published nothing, because
// a 404 would turn this into a way to ask which businesses are on Yipyy — the
// same reasoning as the API route, enforced in one shared reader so the two
// cannot drift apart.
// ============================================================================

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ facilitySlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facilitySlug } = await params;
  const branding = await getBrandingBySlug(facilitySlug);

  // No facility answers to this slug. The page still renders — see below — so
  // the title has to read as a sentence rather than "Reviews · Reviews".
  if (!branding) return { title: "Reviews", robots: { index: false } };

  return {
    title: `Reviews · ${branding.name}`,
    description: `What clients say about ${branding.name}.`,
    // These are a facility's own testimonials on its own page. They are not
    // Google reviews and must not be offered to a search engine as though a
    // rich-result star rating had been earned somewhere it was not.
    robots: { index: false, follow: true },
  };
}

export default async function PublicFacilityReviewsPage({ params }: Props) {
  const { facilitySlug } = await params;

  const [branding, published] = await Promise.all([
    getBrandingBySlug(facilitySlug),
    getPublishedReviews(facilitySlug, 50),
  ]);

  return (
    <PublicReviewWall
      // An unknown slug still renders. "this business" is the neutral wording
      // that stays true when there is no facility behind it.
      facilityName={branding?.name ?? "this business"}
      reviews={published.reviews}
      summary={published.summary}
    />
  );
}
