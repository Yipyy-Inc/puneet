"use client";

import { useSyncExternalStore } from "react";

import { buildKbArticles, DEFAULT_KB_CATEGORIES } from "@/data/knowledge-base";
import type { HelpArticle } from "@/data/help-articles";
import type { KbArticle, KbArticleStatus } from "@/types/knowledge-base";

// Knowledge Base store. Lazy now-anchored seed (SSR-safe). The Published subset
// is exposed as HelpArticle[] via getPublishedHelpArticles() so the facility
// Help Center (lib/api/help.ts) renders the same content the admin manages.

interface KbState {
  articles: KbArticle[];
  categories: string[];
}

let state: KbState | null = null;
const EMPTY: KbState = { articles: [], categories: [] };
const listeners = new Set<() => void>();
let seq = 0;

function initialCategories(articles: KbArticle[]): string[] {
  const set = new Set<string>(DEFAULT_KB_CATEGORIES);
  for (const a of articles) set.add(a.category);
  return [...set];
}

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    const articles = buildKbArticles(Date.now());
    state = { articles, categories: initialCategories(articles) };
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: KbState) {
  state = next;
  emit();
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export interface KbArticleDraft {
  id?: string;
  title: string;
  category: string;
  body: string;
  status: KbArticleStatus;
}

/** Create or update an article (preserves views/helpfulness on edit). */
export function upsertKbArticle(draft: KbArticleDraft): KbArticle {
  ensureInit();
  const list = state?.articles ?? [];
  const existing = draft.id ? list.find((a) => a.id === draft.id) : undefined;
  const article: KbArticle = {
    id: draft.id ?? `kb-${Date.now()}-${seq++}`,
    title: draft.title,
    category: draft.category,
    body: draft.body,
    status: draft.status,
    views: existing?.views ?? 0,
    helpfulYes: existing?.helpfulYes ?? 0,
    helpfulNo: existing?.helpfulNo ?? 0,
    author: existing?.author ?? "Yipyy Support",
    updatedAt: new Date().toISOString(),
  };
  commit({
    articles: [article, ...list.filter((a) => a.id !== article.id)].sort(
      (a, b) => (a.updatedAt < b.updatedAt ? 1 : -1),
    ),
    categories: ensureCategory(state?.categories ?? [], draft.category),
  });
  return article;
}

export function setKbArticleStatus(id: string, status: KbArticleStatus) {
  ensureInit();
  if (!state) return;
  commit({
    ...state,
    articles: state.articles.map((a) =>
      a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a,
    ),
  });
}

export function deleteKbArticle(id: string) {
  ensureInit();
  if (!state) return;
  commit({ ...state, articles: state.articles.filter((a) => a.id !== id) });
}

// --- category management --------------------------------------------------

function ensureCategory(categories: string[], name: string): string[] {
  return categories.includes(name) ? categories : [...categories, name];
}

export function addKbCategory(name: string) {
  ensureInit();
  if (!state) return;
  const n = name.trim();
  if (!n || state.categories.includes(n)) return;
  commit({ ...state, categories: [...state.categories, n] });
}

export function renameKbCategory(oldName: string, newName: string) {
  ensureInit();
  if (!state) return;
  const n = newName.trim();
  if (!n || n === oldName) return;
  commit({
    categories: state.categories.map((c) => (c === oldName ? n : c)),
    articles: state.articles.map((a) =>
      a.category === oldName ? { ...a, category: n } : a,
    ),
  });
}

export function removeKbCategory(name: string) {
  ensureInit();
  if (!state) return;
  const inUse = state.articles.some((a) => a.category === name);
  commit({
    categories: state.categories.filter((c) => c !== name),
    articles: inUse
      ? state.articles.map((a) =>
          a.category === name ? { ...a, category: "Uncategorized" } : a,
        )
      : state.articles,
  });
}

// --- facility Help Center feed --------------------------------------------

/** Published articles mapped to the facility Help Center's HelpArticle shape. */
export function getPublishedHelpArticles(): HelpArticle[] {
  ensureInit();
  return (state?.articles ?? [])
    .filter((a) => a.status === "Published")
    .map((a) => ({
      id: a.id,
      category: a.category,
      title: a.title,
      answer: htmlToText(a.body),
    }));
}

// --- subscription ---------------------------------------------------------

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): KbState {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): KbState {
  return EMPTY;
}

export function useKbState(): KbState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
