"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { initialsOf } from "@/lib/bookings/wizard/client-search";
import { statusLabel } from "@/lib/i18n/labels";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Client } from "@/types/client";

// ============================================================================
// The client a staff booking is for, once found (the client's mock,
// 2026-10-01): initials (people get initials, pets get photographs), the
// name, how many visits, the account's status, how to reach them — and
// "Change client", which goes back to the search with nothing chosen.
// Drawn exactly as the mock draws it (2026-10-02, CLAUDE.md § "Client mocks
// decide the look"): accent-tinted initials, an amber visits chip, a green
// "Active".
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
  const locale = useShellLocale();
  const contact = [client.email, client.phone].filter(Boolean).join(" · ");
  return (
    <section aria-labelledby="wizard-client" className="flex flex-col gap-3">
      <p
        id="wizard-client"
        className="text-ink-tertiary text-[12px] font-semibold tracking-[0.07em] uppercase"
      >
        {t("wizClientLabel")}
      </p>
      <div className="border-line bg-card flex flex-wrap items-center gap-4 rounded-[20px] border px-5 py-[18px] shadow-(--sh-card)">
        <span
          aria-hidden
          className="bg-acc-soft text-acc-soft-text flex size-13 shrink-0 items-center justify-center rounded-full text-[17px] font-bold"
        >
          {initialsOf(client.name)}
        </span>
        <div className="flex min-w-[200px] flex-1 flex-col gap-[3px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-ink text-[17px] font-semibold">
              {client.name}
            </span>
            {visits ? (
              <Chip tone="warning-outline" size="sm" className="tabular-nums">
                {fill(t(visits === 1 ? "wizVisitsOne" : "wizVisitsOther"), {
                  count: visits,
                })}
              </Chip>
            ) : null}
            {client.status ? (
              <Chip
                tone={client.status === "active" ? "success" : "neutral"}
                size="sm"
              >
                {statusLabel(locale, client.status)}
              </Chip>
            ) : null}
          </div>
          {contact ? (
            <p className="text-ink-tertiary text-[13.5px] break-all">
              {contact}
            </p>
          ) : null}
        </div>
        {onChange ? (
          <Button
            type="button"
            variant="quiet"
            size="mock-38"
            onClick={onChange}
          >
            {t("wizChangeClient")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
