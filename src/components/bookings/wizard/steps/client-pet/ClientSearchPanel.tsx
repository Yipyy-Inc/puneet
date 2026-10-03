"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  CLIENT_SEARCH_MIN_CHARS,
  initialsOf,
  searchClients,
  searchExamples,
  type ClientSearchHit,
} from "@/lib/bookings/wizard/client-search";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { Client } from "@/types/client";

// ============================================================================
// "Find a client" — the staff wizard's first screen (the client's mock,
// 2026-10-01). One search over names, emails, phone digits and pet names;
// nothing is listed until two characters are typed, so there is no client
// list to scroll. A hit through a pet says which pet ("Pet match: Mango"),
// and picking it starts the booking with that pet chosen.
//
// "+ New client" swaps this form for the full new-client form rather than
// stacking a second dialog on it (§5i); the booking comes back with the new
// client and their pets selected.
// ============================================================================

/** How long typing must pause before the list follows it. */
const DEBOUNCE_MS = 220;

export function ClientSearchPanel({
  clients,
  loading = false,
  query,
  onQuery,
  onPick,
  onNewClient,
}: {
  clients: readonly Client[];
  /** The list has not arrived: a search finds nobody yet, and says why. */
  loading?: boolean;
  query: string;
  onQuery: (query: string) => void;
  onPick: (hit: ClientSearchHit) => void;
  /** Absent when the viewer may not create clients. */
  onNewClient?: () => void;
}) {
  const t = useShellText("booking");
  // A phone gets the short placeholder, as the mock has it.
  const phone = useMediaQuery("(max-width: 639px)");
  // The list follows the box after a short pause, so a fast typist is not
  // shown a list for every letter.
  const [settled, setSettled] = useState(query);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(query), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const typed = query.trim().length >= CLIENT_SEARCH_MIN_CHARS;
  const { hits, total } = searchClients(clients, settled);
  const examples = searchExamples(clients);

  return (
    <section
      aria-labelledby="wizard-find-client"
      className="flex flex-col gap-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id="wizard-find-client"
          className="text-body-ink text-[17px] font-semibold"
        >
          {t("wizFindClient")}
        </h3>
        {onNewClient ? (
          <Button
            type="button"
            variant="quiet"
            size="mock-36"
            onClick={onNewClient}
          >
            <span aria-hidden>+</span>
            {t("wizNewClient")}
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search
          aria-hidden
          strokeWidth={2}
          className="text-ink-tertiary pointer-events-none absolute top-1/2 left-5 size-[19px] -translate-y-1/2"
        />
        <Input
          type="search"
          // The one thing to do on this screen.
          autoFocus
          data-autofocus
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          aria-label={t("wizSearchLabel")}
          placeholder={t(phone ? "wizSearchPhShort" : "wizSearchPh")}
          className="border-primary h-14 border-2 pr-12 pl-[51px] text-[16px] shadow-[0_0_0_4px_var(--acc-soft)] focus-visible:shadow-[0_0_0_4px_var(--acc-soft)] max-lg:h-14 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onQuery("")}
            aria-label={t("wizClearSearch")}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      {!typed ? (
        <div className="border-line-strong flex flex-col items-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed px-6 py-9 text-center">
          <p className="text-body-ink text-[15px] font-semibold">
            {t("wizSearchHintTitle")}
          </p>
          <p className="text-ink-tertiary text-[13.5px] text-pretty">
            {examples
              ? fill(t("wizSearchHintText"), examples)
              : t("wizSearchHintPlain")}
          </p>
        </div>
      ) : hits.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="border-line bg-card overflow-hidden rounded-[20px] border">
            {hits.map((hit) => (
              <li
                key={hit.client.id}
                className="border-line-soft border-b last:border-b-0"
              >
                <ResultRow hit={hit} onPick={onPick} />
              </li>
            ))}
          </ul>
          {total > hits.length ? (
            <p className="text-ink-tertiary px-1 text-[13px]">
              {fill(t("wizMoreMatches"), { shown: hits.length, total })}
            </p>
          ) : null}
        </div>
      ) : settled === query ? (
        <p
          aria-live="polite"
          className="border-line bg-card text-ink-tertiary rounded-[20px] border p-[22px] text-center text-[14px]"
        >
          {loading
            ? t("wizFindingClients")
            : fill(t("wizNoClientMatch"), { query: query.trim() })}
        </p>
      ) : null}
    </section>
  );
}

function ResultRow({
  hit,
  onPick,
}: {
  hit: ClientSearchHit;
  onPick: (hit: ClientSearchHit) => void;
}) {
  const t = useShellText("booking");
  const { client, matchedPets } = hit;
  const contact = [client.email, client.phone].filter(Boolean).join(" · ");
  const pets =
    client.pets.length > 0
      ? client.pets.map((pet) => pet.name).join(", ")
      : t("wizNoPets");
  const chips = (
    <>
      {matchedPets.length > 0 ? (
        <Chip tone="accent" size="md">
          {fill(t("wizPetMatch"), {
            pets: matchedPets.map((pet) => pet.name).join(", "),
          })}
        </Chip>
      ) : null}
      <Chip tone="outline" size="md" className="font-normal">
        {pets}
      </Chip>
    </>
  );
  return (
    <button
      type="button"
      onClick={() => onPick(hit)}
      className="focus-visible:outline-primary flex w-full min-w-0 items-center gap-3.5 px-[18px] py-3.5 text-left transition-[background-color] duration-120 ease-[ease] hover:bg-(--row-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:transition-none"
    >
      <span
        aria-hidden
        className="bg-surface-inset-2 text-body-ink flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
      >
        {initialsOf(client.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-ink text-[15.5px] font-semibold">
          {client.name}
        </span>
        <span className="text-ink-tertiary truncate text-[13px]">
          {contact}
        </span>
        <span className="mt-1 flex flex-wrap gap-1.5 sm:hidden">{chips}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 max-sm:hidden">
        {chips}
      </span>
      <span aria-hidden className="text-ink-disabled shrink-0 text-[18px]">
        ›
      </span>
    </button>
  );
}
