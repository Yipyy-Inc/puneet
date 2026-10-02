"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { initialsOf } from "@/lib/bookings/wizard/client-search";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { Client } from "@/types/client";

// ============================================================================
// The client a staff booking is for, once found (the client's mock,
// 2026-10-01): initials (people get initials, pets get photographs), the
// name, how many visits, the account's status, how to reach them — and
// "Change client", which goes back to the search with nothing chosen.
// ============================================================================

export function ClientCard({
  client,
  visits,
  onChange,
}: {
  client: Client;
  /** Bookings this client has had here; no chip when unknown or none. */
  visits?: number;
  /** Absent when the caller fixed the client (opened from their profile). */
  onChange?: () => void;
}) {
  const t = useShellText("booking");
  const contact = [client.email, client.phone].filter(Boolean).join(" · ");
  return (
    <section aria-labelledby="wizard-client" className="flex flex-col gap-3">
      <p id="wizard-client" className="text-micro text-ink-tertiary uppercase">
        {t("wizClientLabel")}
      </p>
      <div className="border-line bg-card shadow-card flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-[18px]">
        <span
          aria-hidden
          className="bg-surface-inset text-body-ink flex size-13 shrink-0 items-center justify-center rounded-full text-[17px] font-bold"
        >
          {initialsOf(client.name)}
        </span>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-section text-body-ink">{client.name}</span>
            {visits ? (
              <Badge
                variant="outline"
                className="border-line-strong text-ink-secondary h-[26px] px-2.5 text-[12.5px] font-semibold tabular-nums md:text-[12.5px]"
              >
                {fill(t(visits === 1 ? "wizVisitsOne" : "wizVisitsOther"), {
                  count: visits,
                })}
              </Badge>
            ) : null}
            {client.status ? (
              <StatusBadge type="status" value={client.status} />
            ) : null}
          </div>
          {contact ? (
            <p className="text-meta text-ink-tertiary break-all">{contact}</p>
          ) : null}
        </div>
        {onChange ? (
          <Button type="button" variant="outline" onClick={onChange}>
            {t("wizChangeClient")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
