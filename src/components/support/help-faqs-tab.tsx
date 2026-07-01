"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Search,
} from "lucide-react";

import { helpQueries } from "@/lib/api/help";
import {
  closeSupportDrawer,
  setSupportDrawerTab,
} from "@/lib/support-drawer-store";
import { Input } from "@/components/ui/input";

export function HelpFaqsTab() {
  const { data: articles = [] } = useQuery(helpQueries.articles());
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Real-time filter — match article titles AND category names.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articles, query]);

  // Look up from the full set so the detail view survives even if the current
  // search filter would exclude it.
  const selected = selectedId
    ? (articles.find((a) => a.id === selectedId) ?? null)
    : null;

  // --- Expanded article (in-panel detail view) ---------------------------
  if (selected) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 flex h-full min-h-0 flex-col duration-200">
        <div className="border-b p-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {selected.category}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">
            {selected.title}
          </h3>
          <div className="text-muted-foreground mt-3 text-sm/relaxed whitespace-pre-wrap">
            {selected.answer}
          </div>

          <div className="mt-6 border-t pt-3">
            <a
              href="/facility/help"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              Open in Help Center
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- Article list -------------------------------------------------------
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles…"
            className="pl-9"
            aria-label="Search help articles"
          />
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-left-4 flex-1 overflow-y-auto p-3 duration-200">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-muted-foreground text-sm">
              No articles found — try different keywords
            </p>
            <button
              type="button"
              onClick={() => setSupportDrawerTab("chat")}
              className="text-primary text-sm font-medium hover:underline"
            >
              Contact Support
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setSelectedId(article.id)}
                className="hover:bg-muted/50 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left transition-colors"
              >
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {article.category}
                  </span>
                  <span className="text-sm font-medium">{article.title}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <Link
          href="/facility/help"
          onClick={() => closeSupportDrawer()}
          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          Open the full Help Center
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
