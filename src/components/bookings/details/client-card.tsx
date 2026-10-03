"use client";

import Link from "next/link";

import { useSavedCards } from "@/lib/api/saved-cards";
import { initialsOf } from "@/lib/bookings/wizard/client-search";
import { formatPhone } from "@/lib/i18n/format";
import { useShellText } from "@/lib/shell/use-shell-text";

import { DetailsCard } from "./details-card";
import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// The client, as the mock draws them beside the booking: initials in the
// accent's soft blue, the name, how long they have been a client, a Profile
// link, then how to reach them and the card the facility holds — the wizard's
// own client card, worded the same way. Contact details follow the viewer's
// field mask: someone who may not see them sees "Hidden".
// ============================================================================

export function ClientCard({ d }: { d: BookingDetails }) {
  const { t, fill, locale } = d.text;
  const words = useShellText("booking");
  const client = d.client;
  const { data: cards } = useSavedCards(client?.rowId ?? null);
  if (!client) return null;
  const card = (cards ?? []).find((c) => c.chargeable && c.last4);
  const since = client.createdAt ? client.createdAt.slice(0, 4) : null;
  const contact = (value: string | undefined) =>
    value ? d.fieldMask.maskContact(value) : null;
  const phone = client.phone ? formatPhone(client.phone, locale) : undefined;

  return (
    <DetailsCard className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="bg-acc-soft text-acc-soft-text grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-bold"
          >
            {initialsOf(client.name)}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{client.name}</span>
            {since ? (
              <span className="text-ink-tertiary text-[12px]">
                {fill("clientSince", { year: since })}
              </span>
            ) : null}
          </span>
        </div>
        <Link
          href={d.portal.href(`/facility/dashboard/clients/${client.id}`)}
          className="text-primary hover:text-primary-hover text-[13px] font-semibold"
        >
          {t("profile")}
        </Link>
      </div>
      <div className="text-ink-secondary flex flex-col gap-1.5 text-[13px] wrap-break-word">
        {phone ? <span>{contact(phone)}</span> : null}
        {client.email ? (
          <span className="truncate">{contact(client.email)}</span>
        ) : null}
        {card ? (
          <span>
            {fill("cardOnFile", {
              card: `${card.brand ?? words("wizCard")} •••• ${card.last4}`,
            })}
          </span>
        ) : null}
      </div>
    </DetailsCard>
  );
}
