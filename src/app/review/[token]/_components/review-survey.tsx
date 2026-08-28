"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, PawPrint, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fetchSurvey,
  reviewClickHref,
  submitSurvey,
  type SurveyRequest,
} from "@/lib/api/review-survey";
import { PLATFORM_META } from "@/lib/reputation/review-link";
import {
  fill,
  surveyStrings,
  type SurveyStrings,
} from "@/lib/reputation/survey-i18n";
import type { ReputationPublicPlatform } from "@/types/reputation";

// ============================================================================
// The survey a client opens from an SMS or an email.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// A version that read `localStorage`. The "token" WAS the request id, the ids
// were sequential (`rr-001`, `rr-002`), and the lookup ran against a fixture
// array plus a browser-local queue. So it could only ever answer for the
// hand-written sample requests that shipped in the bundle: anything the app
// actually created lived in the dashboard's `localStorage` and was invisible to
// the phone the link was sent to. Every value here now comes from one
// authenticated-by-token RPC call instead.
//
// The facility's NAME comes from that call too. It used to come from
// `businessProfile` in the settings fixture, which meant every facility's
// customers were greeted by the demo kennel.
//
// ── ONE SCREEN FOR EVERY RATING ───────────────────────────────────────────
//
// There is no branch here on the rating, and there must never be one. Showing
// the public review buttons only to happy clients is review gating: prohibited
// by Google's review policies and by the FTC's Rule on the Use of Consumer
// Reviews (16 CFR Part 465). The rating decides what happens on the facility's
// side — a recovery ticket, an alert — and the client sees the same two
// options either way, public and private, side by side.
//
// What the rating DOES change is emphasis: the heading and the placeholder
// acknowledge a bad visit rather than celebrating a good one. That is the
// compliant reading of "intercept before it goes public".
// ============================================================================

// ─── Page shell (branded, mobile-first, centered) ─────────────────────────────

function Shell({
  business,
  children,
}: {
  business: string;
  children: React.ReactNode;
}) {
  return (
    <div className="via-background to-background flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-linear-to-b from-amber-50 px-4 py-10 dark:from-amber-950/20">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
            <Star className="size-7 fill-white text-white" />
          </div>
          <p className="text-sm font-semibold tracking-tight">{business}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border p-6 shadow-xl shadow-black/5 sm:p-8">
      {children}
    </div>
  );
}

// ─── Interactive 5-star rating ────────────────────────────────────────────────

function StarRating({
  value,
  hover,
  onHover,
  onSelect,
}: {
  value: number;
  hover: number;
  onHover: (n: number) => void;
  onSelect: (n: number) => void;
}) {
  const active = hover || value;
  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2"
      onMouseLeave={() => onHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          onMouseEnter={() => onHover(n)}
          onFocus={() => onHover(n)}
          onClick={() => onSelect(n)}
          className="rounded-full p-1.5 transition-transform duration-100 hover:scale-110 focus:scale-110 focus:outline-none active:scale-95"
        >
          <Star
            className={cn(
              "size-10 transition-colors duration-100 sm:size-11",
              n <= active
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30 fill-transparent",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-6",
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30 fill-transparent",
          )}
        />
      ))}
    </div>
  );
}

/** "Nala", "Nala & Buddy", "Nala, Buddy & Sam". */
function formatNames(names: string[]): string {
  if (names.length === 0) return "your pet";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

type Phase = "loading" | "invalid" | "rate" | "answer" | "done";

export function ReviewSurvey({ token }: { token: string }) {
  const [survey, setSurvey] = useState<SurveyRequest | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    let cancelled = false;

    // The link may carry ?lang= so a bilingual facility's stacked message lands
    // the reader on the half they read. Falls back to the client's own
    // preferred language, which the RPC returns.
    const requested =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("lang")
        : null;

    void fetchSurvey(token).then((found) => {
      if (cancelled) return;
      if (!found) {
        setPhase("invalid");
        return;
      }
      setSurvey(found);
      setLang(requested || found.locale || "en");
      if (found.answered) {
        setRating(found.rating ?? 0);
        setPhase("done");
      } else {
        setPhase("rate");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const S: SurveyStrings = surveyStrings(lang);
  const business = survey?.facilityName ?? "";
  const pet = formatNames(survey?.petNames ?? []);
  const service = (survey?.serviceTypes[0] ?? "visit").toLowerCase();
  const V = { pet, service, business };

  // Emphasis only. Both options are shown at every rating — see the header.
  const isLow = rating > 0 && rating <= 3;

  /** The half of the tag catalogue that matches how they rated. */
  const offeredTags = (survey?.tags ?? []).filter((tag) =>
    isLow ? tag.polarity === "improvement" : tag.polarity === "positive",
  );

  function labelFor(labels: Record<string, string>): string {
    return labels[lang] ?? labels.en ?? Object.values(labels)[0] ?? "";
  }

  async function save(): Promise<boolean> {
    if (!survey || busy) return false;
    setBusy(true);
    setFailure(null);
    try {
      await submitSurvey(token, {
        rating,
        comment: comment.trim() || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        displayConsent: true,
        locale: lang,
      });
      return true;
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "That could not be saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Save, then hand the browser to the platform.
   *
   * In that order on purpose: if the navigation is blocked or they come
   * straight back, their rating and their words are already recorded. The
   * reverse order loses the answer of anybody whose pop-up blocker fires.
   */
  async function saveAndGo(channelId: string) {
    if (await save()) {
      window.location.href = reviewClickHref(token, channelId);
    }
  }

  async function saveAndFinish() {
    if (await save()) setPhase("done");
  }

  if (phase === "loading") {
    return (
      <Shell business={business}>
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">{S.loading}</p>
          </div>
        </Panel>
      </Shell>
    );
  }

  // Expired, already answered, cancelled, never existed — the route does not
  // distinguish them and neither does this, so a guesser learns nothing.
  if (phase === "invalid" || !survey) {
    return (
      <Shell business={business}>
        <Panel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <PawPrint className="size-6" />
            </div>
            <h1 className="text-lg font-semibold">{S.invalidTitle}</h1>
            <p className="text-muted-foreground text-sm">
              {fill(S.invalidBody, V)}
            </p>
          </div>
        </Panel>
      </Shell>
    );
  }

  if (phase === "done") {
    return (
      <Shell business={business}>
        <Panel>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl",
                isLow
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40",
              )}
            >
              <Check className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {isLow ? S.escalatedTitle : S.sharedTitle}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {isLow ? S.escalatedBody : fill(S.sharedBody, V)}
              </p>
            </div>
          </div>

          {/* Still offered after a bad rating. That is the whole point. */}
          <PublicButtons
            survey={survey}
            strings={S}
            onPick={(id) => {
              window.location.href = reviewClickHref(token, id);
            }}
          />
        </Panel>
      </Shell>
    );
  }

  if (phase === "answer") {
    return (
      <Shell business={business}>
        <Panel>
          <div className="text-center">
            <StarRow value={rating} />
            <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
              {isLow ? S.openNegTitle : S.thrilledTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {fill(isLow ? S.openNegSub : S.loveQ, V)}
            </p>
          </div>

          {offeredTags.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {offeredTags.map((tag) => {
                const picked = tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={picked}
                    onClick={() =>
                      setTagIds((current) =>
                        picked
                          ? current.filter((id) => id !== tag.id)
                          : [...current, tag.id],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      picked
                        ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {labelFor(tag.labels)}
                  </button>
                );
              })}
            </div>
          )}

          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={fill(
              isLow ? S.negPlaceholder : S.positivePlaceholder,
              V,
            )}
            className="mt-5 min-h-28 resize-none text-sm"
            autoFocus
          />

          {failure && (
            <p className="mt-3 text-center text-xs text-rose-600 dark:text-rose-400">
              {failure}
            </p>
          )}

          <PublicButtons
            survey={survey}
            strings={S}
            disabled={busy}
            onPick={(id) => void saveAndGo(id)}
          />

          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {survey.channels.length > 0 ? S.orPrivate : S.onlyToUs}
            </p>
            <Button
              onClick={() => void saveAndFinish()}
              disabled={busy}
              variant="outline"
              className="h-11 w-full"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                fill(S.sendPrivately, V)
              )}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => {
              setRating(0);
              setPhase("rate");
            }}
            className="text-muted-foreground hover:text-foreground mx-auto mt-4 block text-center text-xs"
          >
            {S.changeRating}
          </button>
        </Panel>
      </Shell>
    );
  }

  // ── The rating itself ───────────────────────────────────────────────────
  return (
    <Shell business={business}>
      <Panel>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {fill(S.rateTitle, V)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {fill(S.rateSub, V)}
          </p>
        </div>

        <div className="mt-7">
          <StarRating
            value={rating}
            hover={hover}
            onHover={setHover}
            onSelect={(n) => {
              setRating(n);
              setPhase("answer");
            }}
          />
          <p
            className={cn(
              "mt-3 h-5 text-center text-sm font-medium transition-colors",
              hover ? "text-amber-600 dark:text-amber-400" : "text-transparent",
            )}
          >
            {hover ? S.labels[hover as 1 | 2 | 3 | 4 | 5] : " "}
          </p>
        </div>

        <p className="text-muted-foreground mt-3 text-center text-xs">
          {S.poweredBy}
        </p>
      </Panel>
    </Shell>
  );
}

/**
 * The public options.
 *
 * Rendered identically at every rating. Anything that made this conditional on
 * `rating` would be the review-gating control that was removed on 2026-08-28,
 * and `bun run check:no-review-gating` exists to catch its return.
 */
function PublicButtons({
  survey,
  strings,
  disabled,
  onPick,
}: {
  survey: SurveyRequest;
  strings: SurveyStrings;
  disabled?: boolean;
  onPick: (channelId: string) => void;
}) {
  if (survey.channels.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        {strings.postPublic}
      </p>
      <div className="space-y-2">
        {survey.channels.map((channel, index) => {
          const meta =
            PLATFORM_META[channel.platform as ReputationPublicPlatform];
          return (
            <Button
              key={channel.id}
              onClick={() => onPick(channel.id)}
              disabled={disabled}
              variant={index === 0 ? "default" : "outline"}
              className={cn(
                "h-11 w-full gap-2 text-base",
                index === 0 && "bg-amber-600 text-white hover:bg-amber-700",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-bold",
                  index === 0 ? "bg-white/20 text-white" : meta?.badgeCls,
                )}
              >
                {meta?.badge ?? "?"}
              </span>
              {fill(strings.shareOn, {
                platform: meta?.label ?? channel.platform,
              })}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
