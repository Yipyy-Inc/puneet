"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Bookmark, Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SAVED_REPLY_CATEGORY_COLORS,
  SAVED_REPLY_CATEGORY_LABELS,
  type SavedReply,
  type SavedReplyCategory,
} from "@/types/saved-replies";

const CATEGORIES: SavedReplyCategory[] = [
  "boarding",
  "grooming",
  "daycare",
  "pricing",
  "general",
];

export function SavedRepliesMenu({
  open,
  query,
  replies,
  onPick,
  onClose,
}: {
  open: boolean;
  query: string;
  replies: SavedReply[];
  onPick: (reply: SavedReply) => void;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<SavedReplyCategory | "all">(
    "all",
  );
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
    return list.sort((a, b) => b.useCount - a.useCount);
  }, [replies, categoryFilter, trimmedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, categoryFilter]);

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
    <div className="absolute bottom-full left-0 z-30 mb-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <Bookmark className="size-3.5 text-emerald-600" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Saved Replies
        </span>
        {trimmedQuery && (
          <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">
            <Search className="size-2.5" />
            {trimmedQuery}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
          <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
            ↑↓
          </kbd>
          <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
            ↵
          </kbd>
          <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">
            esc
          </kbd>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
            categoryFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
              categoryFilter === cat
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            {SAVED_REPLY_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div ref={listRef} className="max-h-[280px] overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-400">No saved replies match.</p>
            <p className="mt-1 text-[10px] text-slate-300">
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
                activeIndex === idx ? "bg-blue-50" : "hover:bg-slate-50",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    SAVED_REPLY_CATEGORY_COLORS[reply.category],
                  )}
                >
                  {SAVED_REPLY_CATEGORY_LABELS[reply.category]}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {reply.title}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                  <Hash className="size-2.5" />
                  {reply.shortcut}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] text-slate-500">
                {reply.body}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
