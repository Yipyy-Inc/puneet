"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, PawPrint, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { businessProfile } from "@/data/settings";
import {
  findRequestByToken,
  loadReputationSettings,
  saveRatingOverlay,
  updateRatingOverlay,
  weightedPlatformOrder,
  PLATFORM_META,
} from "@/lib/reputation/review-link";
import {
  surveyStrings,
  fill,
  type SurveyStrings,
} from "@/lib/reputation/survey-i18n";
import type {
  ReputationRequest,
  ReputationRating,
  ReputationSettings,
  ReputationPublicPlatform,
} from "@/types/reputation";

// ─── Page shell (branded, mobile-first, centered) ─────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-amber-50 via-background to-background flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-linear-to-b px-4 py-10 dark:from-amber-950/20">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
            <Star className="size-7 fill-white text-white" />
          </div>
          <p className="text-sm font-semibold tracking-tight">
            {businessProfile.businessName}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
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
                : "fill-transparent text-muted-foreground/30",
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
              : "fill-transparent text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

type Phase = "rate" | "open" | "positive" | "negative" | "shared" | "escalated";

// ─── Main survey ──────────────────────────────────────────────────────────────

export function ReviewSurvey({ token }: { token: string }) {
  // `undefined` = still loading (localStorage is client-only).
  const [request, setRequest] = useState<ReputationRequest | null | undefined>(
    undefined,
  );
  const [settings, setSettings] = useState<ReputationSettings | null>(null);
  const [lang, setLang] = useState("en");
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);
  const [ratedAt, setRatedAt] = useState("");
  const [phase, setPhase] = useState<Phase>("rate");
  const [comment, setComment] = useState("");
  const [modal, setModal] = useState<{
    open: boolean;
    platform: ReputationPublicPlatform | null;
    url: string;
  }>({ open: false, platform: null, url: "" });
  // Presentation order is fixed once per reviewer so weighted selection doesn't
  // reshuffle on re-render.
  const [platforms, setPlatforms] = useState<ReputationPublicPlatform[]>([]);

  useEffect(() => {
    const s = loadReputationSettings();
    setSettings(s);
    setPlatforms(weightedPlatformOrder(s));
    const req = findRequestByToken(token);
    setRequest(req);
    // Downstream language inheritance: the survey link appends ?lang=…; honor it.
    const urlLang =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("lang")
        : null;
    setLang(urlLang || req?.locale || "en");
  }, [token]);

  const S = surveyStrings(lang);
  const business = businessProfile.businessName;

  const alreadyRated = useMemo(
    () => phase === "rate" && request != null && request.rating != null,
    [phase, request],
  );

  // ── Loading ──
  if (request === undefined) {
    return (
      <Shell>
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">{S.loading}</p>
          </div>
        </Panel>
      </Shell>
    );
  }

  // ── Invalid / expired token ──
  if (request === null) {
    return (
      <Shell>
        <Panel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <PawPrint className="size-6" />
            </div>
            <h1 className="text-lg font-semibold">{S.invalidTitle}</h1>
            <p className="text-muted-foreground text-sm">
              {fill(S.invalidBody, { business })}
            </p>
          </div>
        </Panel>
      </Shell>
    );
  }

  const petName = request.petName;
  const serviceLower = request.serviceLabel.toLowerCase();
  const V = { pet: petName, service: serviceLower, business };
  const threshold = settings?.happyThreshold ?? 4;
  // "open" (default) never suppresses the public ask — it offers everyone both a
  // public review and a private channel, which avoids review-gating. "gated" is
  // the legacy sentiment-split behaviour.
  const routing = settings?.feedbackRouting ?? "open";
  const isLow = selected > 0 && selected < threshold;

  function pickStar(n: number) {
    const now = new Date().toISOString();
    const low = n < threshold;
    setSelected(n);
    setRatedAt(now);
    saveRatingOverlay(token, {
      rating: n as ReputationRating,
      ratedAt: now,
      source: "micro_survey",
      ...(routing === "open" && low
        ? { escalated: true, escalatedAt: now }
        : {}),
    });
    setPhase(routing === "open" ? "open" : low ? "negative" : "positive");
  }

  function submitNegative() {
    updateRatingOverlay(token, {
      feedbackText: comment.trim() || undefined,
      escalated: true,
      escalatedAt: new Date().toISOString(),
    });
    setPhase("escalated");
  }

  function submitPrivate() {
    updateRatingOverlay(token, {
      feedbackText: comment.trim() || undefined,
      ...(isLow ? { escalated: true, escalatedAt: new Date().toISOString() } : {}),
    });
    setPhase(isLow ? "escalated" : "shared");
  }

  function backToRate() {
    setPhase("rate");
    setSelected(0);
    setHover(0);
  }

  function shareTo(platform: ReputationPublicPlatform) {
    const url = settings?.reviewPlatforms[platform].url ?? "";
    const text = comment.trim();
    const now = new Date().toISOString();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    updateRatingOverlay(token, {
      clientComment: text || undefined,
      publicLinkClicked: true,
      publicLinkClickedAt: now,
      publicPlatform: platform,
      pushedToPublic: true,
    });
    setModal({ open: true, platform, url });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── Already submitted (pre-existing rating on load) ──
  if (alreadyRated) {
    return (
      <Shell>
        <Panel>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <Check className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{S.alreadyTitle}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {fill(S.alreadyBody, V)}
              </p>
            </div>
            <StarRow value={request.rating ?? 0} />
          </div>
        </Panel>
      </Shell>
    );
  }

  // ── Open routing (default, non-gated): everyone gets public + private ──
  if (phase === "open") {
    return (
      <Shell>
        <Panel>
          <div className="text-center">
            <StarRow value={selected} />
            <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
              {isLow ? S.openNegTitle : S.thrilledTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isLow ? fill(S.openNegSub, V) : fill(S.loveQ, V)}
            </p>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={fill(isLow ? S.negPlaceholder : S.positivePlaceholder, V)}
            className="mt-5 min-h-28 resize-none text-sm"
            autoFocus
          />

          {platforms.length > 0 && (
            <div className="mt-5">
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                {S.postPublic}
              </p>
              <div className="space-y-2">
                {platforms.map((p, i) => (
                  <Button
                    key={p}
                    onClick={() => shareTo(p)}
                    variant={i === 0 ? "default" : "outline"}
                    className={cn(
                      "h-11 w-full gap-2 text-base",
                      i === 0 && "bg-amber-600 text-white hover:bg-amber-700",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-xs font-bold",
                        i === 0
                          ? "bg-white/20 text-white"
                          : PLATFORM_META[p].badgeCls,
                      )}
                    >
                      {PLATFORM_META[p].badge}
                    </span>
                    {fill(S.shareOn, { platform: PLATFORM_META[p].label })}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {platforms.length > 0 ? S.orPrivate : S.onlyToUs}
            </p>
            <Button
              onClick={submitPrivate}
              disabled={!comment.trim()}
              variant="outline"
              className="h-11 w-full"
            >
              {fill(S.sendPrivately, { business })}
            </Button>
          </div>

          <button
            type="button"
            onClick={backToRate}
            className="text-muted-foreground hover:text-foreground mx-auto mt-4 block text-center text-xs"
          >
            {S.changeRating}
          </button>
        </Panel>

        <ShareModal
          modal={modal}
          strings={S}
          onClose={() => {
            setModal((m) => ({ ...m, open: false }));
            setPhase(isLow ? "escalated" : "shared");
          }}
        />
      </Shell>
    );
  }

  // ── Positive flow (gated mode): 5-star → comment → share to public ──
  if (phase === "positive") {
    return (
      <Shell>
        <Panel>
          <div className="text-center">
            <StarRow value={selected} />
            <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
              {S.thrilledTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">{S.gatedLoveQ}</p>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={fill(S.positivePlaceholder, V)}
            className="mt-5 min-h-28 resize-none text-sm"
            autoFocus
          />

          <div className="mt-5 space-y-2">
            {platforms.length > 0 ? (
              platforms.map((p, i) => (
                <Button
                  key={p}
                  onClick={() => shareTo(p)}
                  variant={i === 0 ? "default" : "outline"}
                  className={cn(
                    "h-11 w-full gap-2 text-base",
                    i === 0 && "bg-amber-600 text-white hover:bg-amber-700",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-white/20 text-white" : PLATFORM_META[p].badgeCls,
                    )}
                  >
                    {PLATFORM_META[p].badge}
                  </span>
                  {fill(S.shareOn, { platform: PLATFORM_META[p].label })}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground rounded-xl border border-dashed p-3 text-center text-xs">
                {S.noPlatforms}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={backToRate}
            className="text-muted-foreground hover:text-foreground mx-auto mt-4 block text-center text-xs"
          >
            {S.changeRating}
          </button>
        </Panel>

        <ShareModal
          modal={modal}
          strings={S}
          onClose={() => {
            setModal((m) => ({ ...m, open: false }));
            setPhase("shared");
          }}
        />
      </Shell>
    );
  }

  // ── Shared confirmation ──
  if (phase === "shared") {
    return (
      <Shell>
        <Panel>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <Check className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{S.sharedTitle}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {fill(S.sharedBody, { business })}
              </p>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  // ── Negative / below-threshold intercept (gated): private mitigation ──
  if (phase === "negative") {
    return (
      <Shell>
        <Panel>
          <div className="text-center">
            <StarRow value={selected} />
            <h1 className="mt-3 text-xl font-bold tracking-tight">{S.negTitle}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{S.negSub}</p>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={fill(S.negPlaceholder, V)}
            className="mt-5 min-h-32 resize-none text-sm"
            autoFocus
          />

          <Button
            onClick={submitNegative}
            disabled={!comment.trim()}
            className="mt-5 h-11 w-full gap-2 bg-rose-600 text-base text-white hover:bg-rose-700"
          >
            {S.sendToManager}
          </Button>

          <button
            type="button"
            onClick={backToRate}
            className="text-muted-foreground hover:text-foreground mx-auto mt-4 block text-center text-xs"
          >
            {S.changeRating}
          </button>
        </Panel>
      </Shell>
    );
  }

  // ── Escalated confirmation (private, no public link) ──
  if (phase === "escalated") {
    return (
      <Shell>
        <Panel>
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/40">
              <Check className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{S.escalatedTitle}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {S.escalatedBody}
              </p>
            </div>
          </div>
        </Panel>
      </Shell>
    );
  }

  // ── The 5-star query (the splitter entry point) ──
  return (
    <Shell>
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
            value={selected}
            hover={hover}
            onHover={setHover}
            onSelect={pickStar}
          />
          <p
            className={cn(
              "mt-3 h-5 text-center text-sm font-medium transition-colors",
              hover
                ? "text-amber-600 dark:text-amber-400"
                : "text-transparent",
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

// ─── Auto-copy advisory modal ─────────────────────────────────────────────────

function ShareModal({
  modal,
  strings,
  onClose,
}: {
  modal: { open: boolean; platform: ReputationPublicPlatform | null; url: string };
  strings: SurveyStrings;
  onClose: () => void;
}) {
  const platformLabel = modal.platform
    ? PLATFORM_META[modal.platform].label
    : "the review site";

  return (
    <Dialog open={modal.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40">
            <Check className="size-6" />
          </div>
          <DialogTitle className="text-center">{strings.modalTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {fill(strings.modalBody, { platform: platformLabel })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {modal.url && (
            <Button
              onClick={() =>
                window.open(modal.url, "_blank", "noopener,noreferrer")
              }
              className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700"
            >
              {fill(strings.openPlatform, { platform: platformLabel })}{" "}
              <ExternalLink className="size-4" />
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full">
            {strings.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
