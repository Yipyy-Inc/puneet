import { unstable_cache } from "next/cache";
import { CalendarClock } from "lucide-react";

import { sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize-html";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

import { formatDateTime } from "./status-styles";

// Maintenance windows on the public status page are the platform
// announcements a platform admin PUBLISHED to every facility that are about
// maintenance, read through status_page_maintenance() (20260918103842). This
// section used to read a fixture, so the whole internet was told about a
// "Scheduled maintenance window this weekend" that nobody scheduled. With
// nothing published, the section is not rendered.
//
// Called on the server with the service role — the function is not callable
// without it (20260918110704), so the set of functions anyone can call without
// signing in did not grow for this. No cookies: the page has no viewer, and a
// cookie would make every visit a fresh database read. Cached for five minutes.

interface MaintenanceRow {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
}

const liveMaintenance = unstable_cache(
  async (): Promise<MaintenanceRow[]> => {
    if (!hasServiceRoleKey()) return [];
    const { data, error } = await createAdminClient().rpc(
      "status_page_maintenance",
    );
    if (error) return [];
    return (data ?? []) as MaintenanceRow[];
  },
  ["status-page-maintenance"],
  { revalidate: 300 },
);

export async function MaintenanceSection() {
  const items = await liveMaintenance();
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarClock className="size-5 text-sky-500" />
        Scheduled Maintenance
      </h2>
      <div className="space-y-3">
        {items.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/20"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-sky-800 dark:text-sky-200">
                {a.title}
              </h3>
              {a.published_at && (
                <span className="text-muted-foreground text-xs">
                  Posted {formatDateTime(a.published_at)}
                </span>
              )}
            </div>
            <div
              className="text-muted-foreground [&_strong]:text-foreground text-sm [&_p]:m-0 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{
                __html: sanitizeAnnouncementHtml(a.body),
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
