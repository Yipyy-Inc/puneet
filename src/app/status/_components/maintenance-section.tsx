import { CalendarClock } from "lucide-react";

import { getMaintenanceAnnouncements, REFERENCE_MS } from "@/data/status-page";

import { formatDateTime } from "./status-styles";

// Surfaces Yipyy System Announcements about maintenance windows on the public
// status page (so a single admin announcement reaches facilities here too).
export function MaintenanceSection() {
  const items = getMaintenanceAnnouncements(REFERENCE_MS);
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
              {a.publishedAt && (
                <span className="text-muted-foreground text-xs">
                  Posted {formatDateTime(a.publishedAt)}
                </span>
              )}
            </div>
            <div
              className="text-muted-foreground [&_strong]:text-foreground text-sm [&_p]:m-0 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: a.body }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
