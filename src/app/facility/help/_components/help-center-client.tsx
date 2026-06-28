"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Eye,
  FolderOpen,
  LifeBuoy,
  MessageCircle,
  Search,
  ThumbsUp,
} from "lucide-react";

import { useHydrated } from "@/hooks/use-hydrated";
import { useKbState } from "@/lib/kb-articles-store";
import { openSupportDrawer } from "@/lib/support-drawer-store";
import type { KbArticle } from "@/types/knowledge-base";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { HelpArticleItem } from "./help-article-item";
import {
  categoryMeta,
  HELP_CATEGORIES,
  normalizeCategory,
  stripHtml,
} from "./help-center-utils";

export function HelpCenterClient() {
  const hydrated = useHydrated();
  const { articles } = useKbState();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const published = useMemo(
    () => articles.filter((a) => a.status === "Published"),
    [articles],
  );

  const stats = useMemo(() => {
    const totalViews = published.reduce((s, a) => s + a.views, 0);
    const voted = published.filter((a) => a.helpfulYes + a.helpfulNo > 0);
    const avgHelpful =
      voted.length === 0
        ? null
        : Math.round(
            voted.reduce(
              (s, a) => s + (a.helpfulYes / (a.helpfulYes + a.helpfulNo)) * 100,
              0,
            ) / voted.length,
          );
    const categoryCount = new Set(
      published.map((a) => normalizeCategory(a.category)),
    ).size;
    return { totalViews, avgHelpful, categoryCount, total: published.length };
  }, [published]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of published) {
      const c = normalizeCategory(a.category);
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [published]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published.filter((a) => {
      const cat = normalizeCategory(a.category);
      if (activeCategory !== "all" && cat !== activeCategory) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        stripHtml(a.body).toLowerCase().includes(q)
      );
    });
  }, [published, query, activeCategory]);

  const sections = useMemo(() => {
    const m = new Map<string, KbArticle[]>();
    for (const a of filtered) {
      const c = normalizeCategory(a.category);
      const arr = m.get(c);
      if (arr) arr.push(a);
      else m.set(c, [a]);
    }
    const ordered: { name: string; items: KbArticle[] }[] = [];
    for (const c of HELP_CATEGORIES) {
      const items = m.get(c.name);
      if (items && items.length) ordered.push({ name: c.name, items });
    }
    for (const [name, items] of m) {
      if (!HELP_CATEGORIES.some((c) => c.name === name)) {
        ordered.push({ name, items });
      }
    }
    return ordered;
  }, [filtered]);

  const navCategories = HELP_CATEGORIES.filter(
    (c) => (counts.get(c.name) ?? 0) > 0,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Hero + search */}
      <div className="from-primary/10 via-primary/5 relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent p-6 sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
            <LifeBuoy className="size-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            How can we help?
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Search the Yipyy help center or browse articles by topic.
          </p>
          <div className="relative mt-5">
            <Search className="text-muted-foreground absolute top-3 left-3.5 size-5" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for answers…"
              aria-label="Search help articles"
              className="bg-background h-12 pl-11 text-base shadow-sm"
            />
          </div>
        </div>
      </div>

      {!hydrated ? (
        <HelpCenterSkeleton />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile
              label="Help Articles"
              value={stats.total}
              icon={BookOpen}
              tone="indigo"
              hint="Published & searchable"
            />
            <KpiTile
              label="Categories"
              value={stats.categoryCount}
              icon={FolderOpen}
              tone="violet"
              hint="Topics covered"
            />
            <KpiTile
              label="Avg. Helpfulness"
              value={stats.avgHelpful == null ? "—" : `${stats.avgHelpful}%`}
              icon={ThumbsUp}
              tone="emerald"
              hint="Across rated articles"
            />
            <KpiTile
              label="Total Views"
              value={stats.totalViews.toLocaleString()}
              icon={Eye}
              tone="amber"
              hint="All-time reads"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            {/* Category nav */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <p className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold tracking-wider uppercase">
                Browse by topic
              </p>
              <nav className="bg-card space-y-1 rounded-xl border p-2">
                <CategoryNavButton
                  label="All articles"
                  count={stats.total}
                  active={activeCategory === "all"}
                  onClick={() => setActiveCategory("all")}
                />
                {navCategories.map((c) => (
                  <CategoryNavButton
                    key={c.name}
                    label={c.name}
                    icon={c.icon}
                    count={counts.get(c.name) ?? 0}
                    active={activeCategory === c.name}
                    onClick={() => setActiveCategory(c.name)}
                  />
                ))}
              </nav>
            </aside>

            {/* Sections */}
            <div className="min-w-0 space-y-8">
              {sections.length === 0 ? (
                <div className="bg-card flex flex-col items-center rounded-xl border px-6 py-14 text-center">
                  <Search className="text-muted-foreground size-8" />
                  <p className="mt-3 text-sm font-medium">
                    No articles match “{query}”.
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Try a different search, or reach out to our team.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => openSupportDrawer("chat")}
                  >
                    <MessageCircle className="size-4" />
                    Chat with support
                  </Button>
                </div>
              ) : (
                sections.map((section) => {
                  const meta = categoryMeta(section.name);
                  const Icon = meta?.icon;
                  return (
                    <section key={section.name}>
                      <div className="mb-3 flex items-center gap-2.5">
                        {Icon && (
                          <span
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg border",
                              meta?.badgeClass,
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold">
                            {section.name}
                          </h2>
                          {meta?.blurb && (
                            <p className="text-muted-foreground text-xs">
                              {meta.blurb}
                            </p>
                          )}
                        </div>
                        <span className="text-muted-foreground ml-auto text-xs">
                          {section.items.length} article
                          {section.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <Accordion
                        type="single"
                        collapsible
                        className="space-y-2.5"
                      >
                        {section.items.map((a) => (
                          <HelpArticleItem key={a.id} article={a} />
                        ))}
                      </Accordion>
                    </section>
                  );
                })
              )}

              {/* Persistent contact CTA */}
              <div className="from-primary/5 flex flex-col items-center justify-between gap-3 rounded-xl border bg-linear-to-r to-transparent px-5 py-4 sm:flex-row">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                    <MessageCircle className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Still need help?</p>
                    <p className="text-muted-foreground text-xs">
                      Our support team is one message away.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => openSupportDrawer("chat")}
                >
                  <MessageCircle className="size-4" />
                  Chat with support
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryNavButton({
  label,
  count,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className="text-muted-foreground hover:bg-muted/60 data-[active=true]:bg-primary/10 data-[active=true]:text-primary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors data-[active=true]:font-medium"
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
        {count}
      </span>
    </button>
  );
}

function HelpCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted/40 h-[68px] animate-pulse rounded-xl border"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="bg-muted/40 h-72 animate-pulse rounded-xl border" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted/40 h-16 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
