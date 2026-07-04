"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Hash, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SUPPORT_REPLY_CATEGORY_COLORS,
  SUPPORT_REPLY_CATEGORY_LABELS,
  type SupportReplyCategory,
  type SupportSavedReply,
} from "@/types/support-saved-replies";

const CATEGORIES: SupportReplyCategory[] = [
  "technical",
  "billing",
  "onboarding",
  "general",
];

/**
 * Floating Saved Replies panel that opens ABOVE the composer when the agent
 * types "/". Mirrors the facility-portal SavedRepliesMenu: category tabs,
 * live filtering, keyboard nav (↑↓/↵/esc), and cards showing a category badge,
 * name, preview and hashtag slug.
 */
export function SavedRepliesPanel({
  open,
  query,
  replies,
  onPick,
  onClose,
}: {
  open: boolean;
  query: string;
  replies: SupportSavedReply[];
  onPick: (reply: SupportSavedReply) => void;
  onClose: () => void;
}) {
  const [rawIndex, setActiveIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<
    SupportReplyCategory | "all"
  >("all");
  const listRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = replies;
    if (categoryFilter !== "all") {
      list = list.filter((r) => r.category === categoryFilter);
    }
    if (trimmedQuery) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(trimmedQuery) ||
          r.shortcut.toLowerCase().includes(trimmedQuery) ||
          r.body.toLowerCase().includes(trimmedQuery),
      );
    }
    return [...list].sort((a, b) => b.useCount - a.useCount);
  }, [replies, categoryFilter, trimmedQuery]);

  // Clamp the highlighted row to the current results (no reset effect needed).
  const activeIndex = filtered.length
    ? Math.min(rawIndex, filtered.length - 1)
    : 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered[activeIndex]) {
          e.preventDefault();
          onPick(filtered[activeIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, filtered, activeIndex, onPick, onClose]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="bg-popover absolute bottom-full left-0 z-30 mb-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl">
      <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2.5">
        <Bookmark className="size-3.5 text-emerald-600" />
        <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
          Saved Replies
        </span>
        {trimmedQuery && (
          <span className="bg-background text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm">
            <Search className="size-2.5" />
            {trimmedQuery}
          </span>
        )}
        <span className="text-muted-foreground ml-auto flex items-center gap-1 text-[10px]">
          <kbd className="bg-background rounded-sm border px-1 py-0.5 font-mono">
            ↑↓
          </kbd>
          <kbd className="bg-background rounded-sm border px-1 py-0.5 font-mono">
            ↵
          </kbd>
          <kbd className="bg-background rounded-sm border px-1 py-0.5 font-mono">
            esc
          </kbd>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted rounded-full p-1"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b px-3 py-2">
        <CategoryTab
          active={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
        >
          All
        </CategoryTab>
        {CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat}
            active={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
          >
            {SUPPORT_REPLY_CATEGORY_LABELS[cat]}
          </CategoryTab>
        ))}
      </div>

      <div ref={listRef} className="max-h-[280px] overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground text-xs">
              No saved replies match.
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[10px]">
              Try a different search or category.
            </p>
          </div>
        ) : (
          filtered.map((reply, idx) => (
            <button
              key={reply.id}
              type="button"
              data-index={idx}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => onPick(reply)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-colors",
                activeIndex === idx ? "bg-primary/10" : "hover:bg-muted/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                    SUPPORT_REPLY_CATEGORY_COLORS[reply.category],
                  )}
                >
                  {SUPPORT_REPLY_CATEGORY_LABELS[reply.category]}
                </span>
                <span className="text-sm font-bold">{reply.title}</span>
                <span className="text-muted-foreground ml-auto flex items-center gap-1 text-[10px]">
                  <Hash className="size-2.5" />
                  {reply.shortcut}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2 text-[11px]">
                {reply.body}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
