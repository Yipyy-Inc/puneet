"use client";

import { useEffect, useState } from "react";
import { ChevronRight, PawPrint, Plus, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  query,
  onQuery,
  onPick,
  onNewClient,
}: {
  clients: readonly Client[];
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
        <h3 id="wizard-find-client" className="text-section text-body-ink">
          {t("wizFindClient")}
        </h3>
        {onNewClient ? (
          <Button type="button" variant="outline" onClick={onNewClient}>
            <Plus aria-hidden />
            {t("wizNewClient")}
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search
          aria-hidden
          className="text-ink-tertiary pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
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
          className="pr-12 pl-11 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onQuery("")}
            aria-label={t("wizClearSearch")}
            className="absolute top-1/2 right-0 -translate-y-1/2"
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      {!typed ? (
        <div className="border-line-strong flex flex-col items-center gap-1.5 rounded-2xl border border-dashed px-6 py-9 text-center">
          <p className="text-body-strong text-body-ink">
            {t("wizSearchHintTitle")}
          </p>
          <p className="text-meta text-ink-tertiary text-pretty">
            {examples
              ? fill(t("wizSearchHintText"), examples)
              : t("wizSearchHintPlain")}
          </p>
        </div>
      ) : hits.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="border-line bg-card shadow-card overflow-hidden rounded-2xl border">
            {hits.map((hit) => (
              <li
                key={hit.client.id}
                className="border-line border-b last:border-b-0"
              >
                <ResultRow hit={hit} onPick={onPick} />
              </li>
            ))}
          </ul>
          {total > hits.length ? (
            <p className="text-meta text-ink-tertiary px-1">
              {fill(t("wizMoreMatches"), { shown: hits.length, total })}
            </p>
          ) : null}
        </div>
      ) : settled === query ? (
        <p className="border-line bg-card text-body text-ink-secondary rounded-2xl border p-[22px] text-center">
          {fill(t("wizNoClientMatch"), { query: query.trim() })}
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
        <Badge variant="checkedIn">
          <PawPrint aria-hidden />
          {fill(t("wizPetMatch"), {
            pets: matchedPets.map((pet) => pet.name).join(", "),
          })}
        </Badge>
      ) : null}
      <Badge
        variant="outline"
        className="border-line text-ink-secondary h-[26px] px-2.5 text-[12.5px] md:text-[12.5px]"
      >
        {pets}
      </Badge>
    </>
  );
  return (
    <button
      type="button"
      onClick={() => onPick(hit)}
      className="hover:bg-surface-inset focus-visible:outline-primary flex w-full min-w-0 items-center gap-3.5 px-[18px] py-3.5 text-left transition-[background-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:transition-none"
    >
      <span
        aria-hidden
        className="bg-surface-inset text-body-ink flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
      >
        {initialsOf(client.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body-strong text-body-ink">{client.name}</span>
        <span className="text-meta text-ink-tertiary truncate">{contact}</span>
        <span className="mt-1 flex flex-wrap gap-1.5 sm:hidden">{chips}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 max-sm:hidden">
        {chips}
      </span>
      <ChevronRight aria-hidden className="text-ink-disabled size-5 shrink-0" />
    </button>
  );
}
