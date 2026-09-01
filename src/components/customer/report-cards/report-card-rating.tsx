"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReportCard } from "@/types/report-card";
import { rateReportCard } from "@/lib/api/report-cards";

// ── WHY THERE IS NO "SHARE THIS PUBLICLY" PROMPT HERE ─────────────────────
//
// There was one until 2026-08-31, and it did two things wrong.
//
// It rendered only when `stars >= happyThreshold`, so the public review link
// was shown to happy clients and withheld from unhappy ones. That is review
// gating: Google's review policies prohibit it and the FTC's Rule on Consumer
// Reviews (16 CFR Part 465) prohibits suppressing negative reviews. The rating
// decides what happens INTERNALLY — a recovery ticket, a manager alert — never
// whether the public option appears.
//
// And its link came from `src/data/reputation.ts`, a fixture, so every
// facility's clients were sent to one hardcoded demo profile rather than their
// own `review_channels` row.
//
// The honest surface for this is `/review/<token>`, which reads real channels,
// routes every click through `/api/review/[token]/click` (which re-checks
// enabled and solicitable), and shows the public option to everybody. Bringing
// a share prompt back HERE needs a SECURITY DEFINER projection of
// `review_channels` for a signed-in client — the pattern in
// `lib/api/published-reviews.ts` — because RLS scopes that table to staff. It
// is G-01 in the v2 spec and is blocked on report cards actually sending.

export function ReportCardRating({
  reportCard,
  petName,
  facilityName,
}: {
  reportCard: ReportCard;
  petName: string;
  facilityName: string;
}) {
  // Already rated is a fact of the ROW, not of this browser. `rate_report_card`
  // refuses a second rating, so a card that arrives with a timestamp is closed.
  const alreadyRated = reportCard.ratingSubmittedAt != null;
  const [stars, setStars] = useState(reportCard.ratingStars ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(reportCard.ratingComment ?? "");
  const [submitted, setSubmitted] = useState(alreadyRated);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1 || saving) return;
    setSaving(true);
    try {
      // The database records it, and only then is the owner told it was sent.
      // This previously called a fixture helper that pushed into an in-memory
      // module and toasted "Sent to {facility}" — the facility never received
      // anything, and a refresh lost the rating.
      await rateReportCard(reportCard.id, stars, comment.trim() || undefined);
      setSubmitted(true);
      toast.success("Thanks for your rating!", {
        description: `Sent to ${facilityName}.`,
      });
    } catch (err) {
      toast.error("That rating could not be saved.", {
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  const display = hover || stars;

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">⭐ How was {petName}&apos;s stay?</p>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitted}
            onMouseEnter={() => !submitted && setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5 disabled:cursor-default"
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                n <= display
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>

      {/* Comment field revealed once a rating is chosen (pre-submit) */}
      {stars > 0 && !submitted && (
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={`Tell ${facilityName} more about ${petName}'s visit (optional)…`}
          />
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "Sending…" : "Submit rating"}
          </Button>
        </div>
      )}

      {submitted && (
        <p className="text-muted-foreground text-xs">
          Thanks! Your {stars}-star rating was sent to {facilityName}.
        </p>
      )}
    </div>
  );
}
