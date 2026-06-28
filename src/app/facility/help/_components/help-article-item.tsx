"use client";

import { useState } from "react";
import { Clock, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";

import type { KbArticle } from "@/types/knowledge-base";
import { recordKbHelpfulVote } from "@/lib/kb-articles-store";
import { openSupportDrawer } from "@/lib/support-drawer-store";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  categoryMeta,
  estimateReadTime,
  normalizeCategory,
} from "./help-center-utils";

interface HelpArticleItemProps {
  article: KbArticle;
}

export function HelpArticleItem({ article }: HelpArticleItemProps) {
  const [vote, setVote] = useState<boolean | null>(null);
  const category = normalizeCategory(article.category);
  const meta = categoryMeta(category);
  const readTime = estimateReadTime(article.body);

  function castVote(helpful: boolean) {
    if (vote !== null) return;
    recordKbHelpfulVote(article.id, helpful);
    setVote(helpful);
  }

  return (
    <AccordionItem
      value={article.id}
      className="bg-card rounded-xl border px-4 shadow-sm"
    >
      <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
          </div>
          <span className="text-sm font-semibold">{article.title}</span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pb-4">
        <div
          className="text-muted-foreground [&_a]:text-primary [&_h3]:text-foreground [&_strong]:text-foreground text-sm [&_a]:underline [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-lg [&_img]:border [&_li]:ml-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          // KB bodies are app-authored HTML from the Knowledge Base admin editor.
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          {vote === null ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Was this helpful?
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => castVote(true)}
              >
                <ThumbsUp className="size-3.5" />
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => castVote(false)}
              >
                <ThumbsDown className="size-3.5" />
                No
              </Button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {vote ? (
                <ThumbsUp className="size-3.5" />
              ) : (
                <ThumbsDown className="size-3.5" />
              )}
              Thanks for your feedback!
            </p>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-primary h-8 gap-1.5 px-2"
            onClick={() => openSupportDrawer("chat")}
          >
            <MessageCircle className="size-3.5" />
            Still need help? Chat with support
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
