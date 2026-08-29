"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Info, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// The reviews on the facility's OWN booking page.
//
// ── WHAT THE OLD SCREEN CLAIMED ───────────────────────────────────────────
//
// It put Google and Facebook badges beside "Hide" and "Display" buttons, which
// reads as an offer to hide a review on those platforms. Nothing in this
// product can do that, and a footnote saying so does not undo what the buttons
// imply. The buttons now name the page they affect, and the banner says plainly
// that Google and Facebook are untouched.
//
// ── AND THE PAGE NOW EXISTS ───────────────────────────────────────────────
//
// This screen said "these appear on your own booking page" before ANY surface
// in the product rendered a review — the same shape of untrue claim it was
// written to remove, introduced one layer up. /[facilitySlug]/reviews is that
// page, and the banner links to it, so the claim is one the person making it
// can click and check.
//
// ── AND WHAT IT COULD NOT ANSWER ──────────────────────────────────────────
//
// It showed "Pending 0" with no approve action anywhere and no stated rule, so
// nobody could say why a given review was or was not on the booking page.
// Eligibility is now one sentence — a written comment, a rating at or above the
// facility's showcase minimum, and the client's consent — and it is enforced in
// the query rather than in somebody's head.
// ============================================================================

interface ShowcasePayload {
  reviews: ShowcaseReview[];
  /** The public page these are published to, or null if the slug is unset. */
  publicPath: string | null;
}

interface ShowcaseReview {
  id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  moderation_state: "pending" | "approved" | "live" | "hidden" | "rejected";
  showcase_sort_order: number | null;
  display_consent: boolean;
  approved_at: string | null;
  staff: { id: string; first_name: string; last_name: string } | null;
  request: {
    id: string;
    showcase_min: number;
    service_types: string[];
    client: { id: string; name: string };
  };
}

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Waiting on you" },
  { value: "live", label: "On the page" },
  { value: "hidden", label: "Taken down" },
] as const;

export function ReputationPublicReviewsTab() {
  const [state, setState] = useState<string>("");
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["reputation", "showcase", state],
    queryFn: async (): Promise<ShowcasePayload> => {
      const params = state ? `?state=${state}` : "";
      const response = await fetch(`/api/reputation/showcase${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? "Could not read the reviews.");
      }
      return (await response.json()) as ShowcasePayload;
    },
  });

  const reviews = data?.reviews ?? [];
  const publicPath = data?.publicPath ?? null;

  const moderate = useMutation({
    mutationFn: async (input: { responseId: string; state: string }) => {
      const response = await fetch("/api/reputation/showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? "That could not be saved.");
      }
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["reputation", "showcase"],
      }),
    onError: (failure) =>
      toast.error(
        failure instanceof Error ? failure.message : "That could not be saved.",
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setState(tab.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              state === tab.value
                ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {error instanceof Error ? error.message : "Could not load reviews."}
          </CardContent>
        </Card>
      ) : isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Nothing here yet. Only reviews with something written in them can go
            on the booking page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={moderate.isPending}
              onModerate={(next) =>
                moderate.mutate({ responseId: review.id, state: next })
              }
            />
          ))}
        </div>
      )}

      <div className="bg-muted/30 flex items-start gap-2 rounded-xl border border-dashed px-3 py-2.5">
        <Info className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
        <p className="text-muted-foreground text-xs">
          These appear on{" "}
          {publicPath ? (
            <a
              className="text-foreground font-medium underline underline-offset-2"
              href={publicPath}
              rel="noreferrer"
              target="_blank"
            >
              your public reviews page
            </a>
          ) : (
            <span className="font-medium">your public reviews page</span>
          )}
          , and only there. Putting one up or taking it down changes nothing on
          Google, Facebook or Yelp — no product can edit a review on those
          platforms. A review can be shown when it has a written comment, a
          rating at or above your showcase minimum, and the client agreed it
          could be displayed.
        </p>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  busy,
  onModerate,
}: {
  review: ShowcaseReview;
  busy: boolean;
  onModerate: (state: string) => void;
}) {
  const live = review.moderation_state === "live";
  const eligible =
    review.rating >= review.request.showcase_min && review.display_consent;

  return (
    <Card className={cn(live && "border-emerald-300 dark:border-emerald-900")}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              {review.request.client.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-3",
                    n <= review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30 fill-transparent",
                  )}
                />
              ))}
            </div>
          </div>
          {live && (
            <Badge className="border-0 bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              On the page
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-4 text-xs italic">
          &ldquo;{review.comment}&rdquo;
        </p>

        {review.staff && (
          <p className="text-muted-foreground text-[11px]">
            {review.staff.first_name} {review.staff.last_name}
          </p>
        )}

        {!eligible ? (
          // Say WHY, rather than disabling a button and leaving somebody to
          // guess. These are the two halves of the eligibility rule.
          <p className="text-muted-foreground border-t pt-2 text-[11px]">
            {!review.display_consent
              ? "They did not agree to have this shown."
              : `Below your showcase minimum of ${review.request.showcase_min}★.`}
          </p>
        ) : (
          <div className="border-t pt-2">
            <Button
              size="sm"
              variant={live ? "outline" : "default"}
              disabled={busy}
              className={cn(
                "h-8 gap-1.5 text-xs",
                !live && "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={() => onModerate(live ? "hidden" : "live")}
            >
              {live ? (
                <>
                  <EyeOff className="size-3" /> Remove from booking page
                </>
              ) : (
                <>
                  <Eye className="size-3" /> Show on booking page
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
