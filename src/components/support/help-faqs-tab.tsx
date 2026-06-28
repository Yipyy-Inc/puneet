"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";

import { helpQueries } from "@/lib/api/help";
import { closeSupportDrawer } from "@/lib/support-drawer-store";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

export function HelpFaqsTab() {
  const { data: articles = [] } = useQuery(helpQueries.articles());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articles, query]);

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

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No articles match “{query}”. Try a different search or submit a
            ticket.
          </p>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {filtered.map((article) => (
              <AccordionItem
                key={article.id}
                value={article.id}
                className="rounded-lg border px-3"
              >
                <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                  <span className="flex flex-col items-start gap-1">
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      {article.category}
                    </span>
                    {article.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {article.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
