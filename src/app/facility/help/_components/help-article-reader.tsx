"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  List,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import type { KbArticle } from "@/types/knowledge-base";
import {
  recordKbArticleView,
  recordKbHelpfulVote,
} from "@/lib/kb-articles-store";
import { openSupportDrawer } from "@/lib/support-drawer-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./help-article.module.css";
import {
  categoryMeta,
  estimateReadTime,
  normalizeCategory,
} from "./help-center-utils";

interface TocEntry {
  id: string;
  text: string;
}

interface HelpArticleReaderProps {
  article: KbArticle;
  related: KbArticle[];
  onBack: () => void;
  onOpen: (id: string) => void;
}

/** Resolve the current facility so helpfulness votes are recorded per-facility. */
function activeFacilityId(): string {
  if (typeof window === "undefined") return "fac-11";
  return window.localStorage.getItem("yipyy-active-facility") ?? "fac-11";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Read a previously recorded vote for this facility + article from storage. */
function readVote(key: string): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(key);
  return v === "up" ? true : v === "down" ? false : null;
}

/**
 * Parse the article's H2 headings (in document order) into TOC entries with
 * stable, de-duplicated anchor IDs — matching the IDs the reader assigns onto
 * the rendered headings, so anchor links resolve.
 */
function parseHeadings(html: string): TocEntry[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const used = new Set<string>();
  const entries: TocEntry[] = [];
  doc.querySelectorAll("h2").forEach((h) => {
    const text = h.textContent?.trim() ?? "";
    const base = h.getAttribute("id") || slugify(text) || "section";
    let id = base;
    let n = 1;
    while (used.has(id)) id = `${slugify(text) || "section"}-${n++}`;
    used.add(id);
    entries.push({ id, text });
  });
  return entries;
}

// Track articles whose view was already counted this session (guards against
// React's double effect invocation in dev + returning to the same article).
const viewedThisSession = new Set<string>();

export function HelpArticleReader({
  article,
  related,
  onBack,
  onOpen,
}: HelpArticleReaderProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const category = normalizeCategory(article.category);
  const meta = categoryMeta(category);
  const readTime = estimateReadTime(article.body);
  const updated = useMemo(() => {
    const d = new Date(article.updatedAt);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  }, [article.updatedAt]);

  // TOC derived from the article HTML (no DOM read needed); shown at 3+ headings.
  const toc = useMemo(() => parseHeadings(article.body), [article.body]);
  const hasToc = toc.length >= 3;

  // Vote is per-facility + per-article; reset it when the article changes by
  // adjusting state during render (no effect → no cascading render).
  const voteKey = `yipyy-help-vote:${activeFacilityId()}:${article.id}`;
  const [voteFor, setVoteFor] = useState(voteKey);
  const [vote, setVote] = useState<boolean | null>(() => readVote(voteKey));
  if (voteFor !== voteKey) {
    setVoteFor(voteKey);
    setVote(readVote(voteKey));
  }

  // Record a view once per article per session.
  useEffect(() => {
    if (viewedThisSession.has(article.id)) return;
    viewedThisSession.add(article.id);
    recordKbArticleView(article.id);
  }, [article.id]);

  // Assign the derived anchor IDs onto the rendered headings and inject a
  // copy button on each code block. Pure DOM work — no setState here.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    root.querySelectorAll<HTMLElement>("h2").forEach((h, i) => {
      const entry = toc[i];
      if (entry) h.id = entry.id;
    });

    // Copy-to-clipboard button on every code block.
    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
      if (pre.dataset.copyReady) return;
      pre.dataset.copyReady = "true";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = styles.copyBtn;
      btn.textContent = "Copy";
      const onClick = () => {
        const code =
          pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
        void navigator.clipboard?.writeText(code);
        btn.textContent = "Copied!";
        window.setTimeout(() => {
          btn.textContent = "Copy";
        }, 1500);
      };
      btn.addEventListener("click", onClick);
      pre.appendChild(btn);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((c) => c());
  }, [article.id, toc]);

  // Scrollspy — highlight the section currently in view.
  useEffect(() => {
    if (toc.length < 3) return;
    const root = bodyRef.current;
    if (!root) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const heads = toc
        .map((t) => root.querySelector<HTMLElement>(`#${CSS.escape(t.id)}`))
        .filter((el): el is HTMLElement => el !== null);
      let current = heads[0]?.id ?? null;
      for (const el of heads) {
        if (el.getBoundingClientRect().top - 96 <= 0) current = el.id;
        else break;
      }
      setActiveHeading(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [toc]);

  function castVote(helpful: boolean) {
    if (vote !== null) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(voteKey, helpful ? "up" : "down");
    }
    recordKbHelpfulVote(article.id, helpful);
    setVote(helpful);
  }

  function scrollToHeading(e: React.MouseEvent, id: string) {
    e.preventDefault();
    bodyRef.current
      ?.querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openInNewTab() {
    window.open(
      `/facility/help?article=${encodeURIComponent(article.id)}`,
      "_blank",
      "noopener",
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back to Help Center
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={openInNewTab}
        >
          <ExternalLink className="size-4" />
          Open in new tab
        </Button>
      </div>

      <div className={cn("grid gap-8", hasToc && "lg:grid-cols-[1fr_220px]")}>
        {/* Article */}
        <article className="min-w-0">
          <header className="border-b pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("font-medium", meta?.badgeClass)}
              >
                {category}
              </Badge>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Clock className="size-3" />
                {readTime} min read
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Eye className="size-3" />
                {article.views.toLocaleString()} views
              </span>
              {updated && (
                <span className="text-muted-foreground text-xs">
                  Updated {updated}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {article.title}
            </h1>
          </header>

          <div
            ref={bodyRef}
            className={cn(styles.body, "mt-6")}
            // KB bodies are app-authored HTML from the Knowledge Base admin editor.
            dangerouslySetInnerHTML={{ __html: article.body }}
          />

          {/* Helpfulness widget */}
          <div className="bg-muted/40 mt-8 flex flex-col items-center gap-3 rounded-xl border px-5 py-6 text-center">
            {vote === null ? (
              <>
                <p className="text-sm font-semibold">
                  Was this article helpful?
                </p>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => castVote(true)}
                  >
                    <ThumbsUp className="size-4" />
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => castVote(false)}
                  >
                    <ThumbsDown className="size-4" />
                    No
                  </Button>
                </div>
              </>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {vote ? (
                  <ThumbsUp className="size-4" />
                ) : (
                  <ThumbsDown className="size-4" />
                )}
                Thanks for your feedback!
              </p>
            )}
            {vote === false && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-primary gap-1.5"
                onClick={() => openSupportDrawer("chat")}
              >
                <MessageCircle className="size-3.5" />
                Chat with support instead
              </Button>
            )}
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold tracking-tight">
                Related articles
              </h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="bg-card hover:border-primary/50 hover:bg-muted/40 group flex flex-col rounded-xl border p-3.5 text-left transition-colors"
                  >
                    <span className="group-hover:text-primary text-sm font-semibold">
                      {r.title}
                    </span>
                    <span className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {r.summary?.trim() ||
                        `${normalizeCategory(r.category)} · ${estimateReadTime(r.body)} min read`}
                    </span>
                    <span className="text-primary mt-2 inline-flex items-center gap-0.5 text-xs font-medium">
                      Read
                      <ChevronRight className="size-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Floating table of contents */}
        {hasToc && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p className="text-muted-foreground mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wider uppercase">
                <List className="size-3.5" />
                On this page
              </p>
              <nav className="space-y-0.5 border-l">
                {toc.map((t) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    onClick={(e) => scrollToHeading(e, t.id)}
                    data-active={activeHeading === t.id ? "true" : undefined}
                    className="text-muted-foreground hover:text-foreground data-[active=true]:border-primary data-[active=true]:text-primary -ml-px block border-l-2 border-transparent py-1 pl-3 text-sm transition-colors data-[active=true]:font-medium"
                  >
                    {t.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
