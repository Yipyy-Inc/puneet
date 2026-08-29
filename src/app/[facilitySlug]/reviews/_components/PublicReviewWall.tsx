import { Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  PublishedReview,
  PublishedReviewSummary,
} from "@/lib/api/published-reviews";

// ============================================================================
// A facility's own reviews, on a page anybody can open.
//
// ── NO CLIENT JAVASCRIPT ──────────────────────────────────────────────────
//
// Nothing here has state or handlers, so this stays a Server Component. A wall
// of text and stars that ships a hydration bundle would be paying for nothing.
//
// ── THE NUMBER CARRIES ITS DENOMINATOR ────────────────────────────────────
//
// "4.8 out of 5, from 23 reviews" and never a bare 4.8. That is the same rule
// the reputation metrics layer enforces, and this is the one screen where a
// stranger is being asked to trust the number — so it is the last place to
// start rounding one off into a decoration.
//
// The average comes from the database over EXACTLY the rows listed below it,
// so the header cannot disagree with what the reader can count themselves.
// ============================================================================

interface Props {
  facilityName: string;
  reviews: PublishedReview[];
  summary: PublishedReviewSummary;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      // The stars are decorative once the rating is stated in words; a screen
      // reader should hear "Rated 5 out of 5", not five list items.
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className="size-4"
          // Below the rating, an outline; at or under it, filled.
          data-filled={n <= rating ? "true" : undefined}
          fill={n <= rating ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

export function PublicReviewWall({ facilityName, reviews, summary }: Props) {
  return (
    <main className="bg-background min-h-screen px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What clients say about {facilityName}
          </h1>

          {summary.count > 0 && summary.average !== null ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="text-amber-500">
                <Stars rating={Math.round(summary.average)} />
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">
                  {summary.average.toFixed(1)}
                </span>{" "}
                out of 5, from {summary.count}{" "}
                {summary.count === 1 ? "review" : "reviews"}
              </p>
            </div>
          ) : null}
        </header>

        {reviews.length === 0 ? (
          // An unknown slug lands here too, and that is deliberate — see
          // getPublishedReviews. Nothing on this page distinguishes "this
          // business has published nothing yet" from "no such business", so the
          // wording has to be true of both.
          <Card>
            <CardContent className="text-muted-foreground py-16 text-center text-sm">
              There are no reviews to show here yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-amber-500">
                      <Stars rating={review.rating} />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {reviewDate(review.submittedAt)}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed">{review.comment}</p>

                  <p className="text-muted-foreground text-xs">
                    {/* A first name and an initial. Consent to display a review
                        is not consent to be identified. */}
                    {review.author} · {review.serviceType}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {reviews.length > 0 ? (
          <p className="text-muted-foreground mt-10 text-center text-xs">
            These reviews were left by clients of {facilityName} and are
            published by {facilityName}.
          </p>
        ) : null}
      </div>
    </main>
  );
}
