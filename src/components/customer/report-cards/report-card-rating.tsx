"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReportCard } from "@/types/pet";
import { setReportCardCustomerRating } from "@/data/pet-data";
import { reputationSettings } from "@/data/reputation";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  yelp: "Yelp",
  nextdoor: "Nextdoor",
  tripadvisor: "Tripadvisor",
};

/** Highest-priority enabled public review platform, or null if none configured. */
function topSharePlatform(): { key: string; url: string } | null {
  if (!reputationSettings.enabled) return null;
  for (const key of reputationSettings.platformOrder ?? []) {
    const p =
      reputationSettings.reviewPlatforms[
        key as keyof typeof reputationSettings.reviewPlatforms
      ];
    if (p?.enabled && p.url) return { key, url: p.url };
  }
  return null;
}

export function ReportCardRating({
  reportCard,
  petName,
  facilityName,
}: {
  reportCard: ReportCard;
  petName: string;
  facilityName: string;
}) {
  const existing = reportCard.customerRating;
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [submitted, setSubmitted] = useState(Boolean(existing));

  const shareTarget = topSharePlatform();

  const handleSubmit = () => {
    if (stars < 1) return;
    // Save to the card (F1) + notify the facility.
    setReportCardCustomerRating(reportCard.id, {
      stars,
      comment: comment.trim() || undefined,
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
    toast.success("Thanks for your rating!", {
      description: `Sent to ${facilityName}.`,
    });
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
          <Button size="sm" onClick={handleSubmit}>
            Submit rating
          </Button>
        </div>
      )}

      {submitted && (
        <p className="text-muted-foreground text-xs">
          Thanks! Your {stars}-star rating was sent to {facilityName}.
        </p>
      )}

      {/* External-share prompt for happy ratings, when a platform is configured */}
      {submitted &&
        stars >= reputationSettings.happyThreshold &&
        shareTarget && (
          <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Loved {petName}&apos;s visit? Share it!
            </p>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
              A quick public review helps {facilityName} a lot.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                window.open(shareTarget.url, "_blank", "noopener,noreferrer")
              }
            >
              Share on {PLATFORM_LABELS[shareTarget.key] ?? shareTarget.key}
            </Button>
          </div>
        )}
    </div>
  );
}
