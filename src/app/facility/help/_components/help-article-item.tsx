"use client";

import { ChevronRight, Clock, ExternalLink, Eye } from "lucide-react";

import type { KbArticle } from "@/types/knowledge-base";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  categoryMeta,
  estimateReadTime,
  normalizeCategory,
  stripHtml,
} from "./help-center-utils";

interface HelpArticleItemProps {
  article: KbArticle;
  onOpen: (id: string) => void;
}

/**
 * A single Help Center article, shown as a clickable card in the browse grid.
 * Opening it hands off to the full-screen reader (rich content, TOC, related
 * articles). The corner "open in new tab" button deep-links to the same
 * article — a sibling button so the two actions never nest.
 */
export function HelpArticleItem({ article, onOpen }: HelpArticleItemProps) {
  const category = normalizeCategory(article.category);
  const meta = categoryMeta(article.category);
  const readTime = estimateReadTime(article.body);
  const excerpt =
    article.summary?.trim() || stripHtml(article.body).slice(0, 160);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(article.id)}
        className="bg-card hover:border-primary/50 flex w-full flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors"
      >
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
          {article.views > 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Eye className="size-3" />
              {article.views.toLocaleString()}
            </span>
          )}
        </div>

        <span className="group-hover:text-primary pr-8 text-sm font-semibold">
          {article.title}
        </span>
        {excerpt && (
          <span className="text-muted-foreground line-clamp-2 text-xs">
            {excerpt}
          </span>
        )}

        <ChevronRight className="text-muted-foreground group-hover:text-primary absolute top-4 right-4 size-4 transition-colors" />
      </button>

      <button
        type="button"
        aria-label="Open article in new tab"
        onClick={() =>
          window.open(
            `/facility/help?article=${encodeURIComponent(article.id)}`,
            "_blank",
            "noopener",
          )
        }
        className="text-muted-foreground hover:bg-muted hover:text-primary absolute right-3 bottom-3 hidden rounded-md p-1 group-hover:inline-flex"
      >
        <ExternalLink className="size-3.5" />
      </button>
    </div>
  );
}
