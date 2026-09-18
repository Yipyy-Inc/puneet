"use client";

import { useState } from "react";
import { ChevronDown, Megaphone } from "lucide-react";

import { announcementPlainText } from "@/lib/announcements/sanitize-html";
import type { FacilityAnnouncement } from "@/types/announcement";

/**
 * Platform announcements in the bell (20260918103842): what a platform admin
 * published for this facility, High and Normal. Urgent ones are the banner.
 * Renders nothing when nothing is live.
 *
 * The body is sanitised on write and again in the mapper that produced it —
 * this renders what those left, which is the allowlist's markup and nothing
 * else.
 */
export function PlatformAnnouncementsSection({
  items,
  heading,
}: {
  items: FacilityAnnouncement[];
  heading: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <section className="border-b">
      <p className="text-ink-tertiary px-4 pt-3 text-xs font-bold tracking-[.06em] uppercase">
        {heading}
      </p>
      <ul className="divide-y">
        {items.map((a) => {
          const open = expanded === a.id;
          return (
            <li key={a.id} className="px-4 py-3">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : a.id)}
                className="flex min-h-10 w-full min-w-0 items-center gap-3 text-left max-lg:min-h-12"
              >
                <Megaphone
                  className={
                    a.priority === "High"
                      ? "text-warning size-5 shrink-0"
                      : "text-ink-secondary size-5 shrink-0"
                  }
                  aria-hidden
                />
                <span
                  className={
                    a.read
                      ? "text-foreground min-w-0 flex-1 truncate text-sm"
                      : "text-foreground min-w-0 flex-1 truncate text-sm font-semibold"
                  }
                >
                  {a.title}
                </span>
                <ChevronDown
                  className={
                    open
                      ? "text-ink-disabled size-4 shrink-0 rotate-180"
                      : "text-ink-disabled size-4 shrink-0"
                  }
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  className="text-foreground [&_a]:text-primary text-meta/relaxed mt-2 pl-8 [&_a]:underline [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:rounded-xl [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: a.body }}
                />
              ) : (
                <p className="text-ink-tertiary text-meta mt-0.5 line-clamp-2 pl-8">
                  {announcementPlainText(a.body)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
