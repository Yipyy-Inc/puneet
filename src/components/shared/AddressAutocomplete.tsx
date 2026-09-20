"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";

import { useAppLocale } from "@/hooks/use-app-locale";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AddressSuggestion } from "@/lib/geocode/address";

// ============================================================================
// A street field that offers real addresses while it is typed.
//
// ── IT IS A TEXT INPUT FIRST ──────────────────────────────────────────────
//
// Everything below is a convenience over an ordinary field. The provider can
// be down, the address can be too new to be in OpenStreetMap, the person can
// be entering a rural route — in every one of those cases they type what they
// know and the form takes it. Nothing here can block a save, and no error is
// ever shown for a lookup that found nothing: an address the software has not
// heard of is not a mistake the person made.
//
// That is also why the list is not a <Select>. The value is whatever is in the
// box, chosen from the list or not.
//
// ── WHY NOT THE Command PRIMITIVE ─────────────────────────────────────────
//
// `components/ui/command.tsx` owns its own input and its own filtering, and
// both are wrong here: the field belongs to the form (it holds the typed
// value, and it is what the label and the error message point at), and the
// filtering already happened on the server. Wrapping Command would mean
// fighting its focus model to keep a form field focused. This is a listbox
// under an input, which is what the pattern actually is.
// ============================================================================

/** Long enough that a word is not four requests. */
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

interface AddressAutocompleteProps {
  value: string;
  onValueChange: (street: string) => void;
  /**
   * A row was chosen. The parent fills city, province and postal code from it
   * — and may keep the coordinates, which is what eventually retires the
   * hashed pseudo-coordinates in `src/lib/route-planning.ts`.
   */
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  /** Read by a screen reader when the list opens. */
  hintText: string;
  id?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder,
  hintText,
  id,
  disabled,
}: AddressAutocompleteProps) {
  // The app's OWN locale hook, not next-intl's useLocale: the language lives
  // in a cookie this side reads (see use-staff-text.ts), and useLocale() needs
  // a NextIntlClientProvider that the facility dashboard does not mount — it
  // threw on render and took the whole clients page to its error boundary.
  const locale = useAppLocale();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-suggestions`;

  const [term, setTerm] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // The term the QUERY uses, a beat behind the field. Typing stays instant;
  // only the lookup waits.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ["geocode", "suggest", locale, term],
    enabled: open && term.trim().length >= MIN_CHARS,
    // Addresses do not move. Anything already looked up this session stands.
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const url = `/api/geocode/suggest?q=${encodeURIComponent(term)}&lang=${locale === "fr" ? "fr" : "en"}`;
      const response = await fetch(url);
      if (!response.ok) return { suggestions: [] as AddressSuggestion[] };
      return (await response.json()) as { suggestions: AddressSuggestion[] };
    },
  });

  const suggestions = data?.suggestions ?? [];
  const showList = open && suggestions.length > 0;

  // Pointer-down rather than click: a click on a row would blur the input
  // first, and a blur handler that closes the list would take the row out from
  // under the pointer before the click landed.
  useEffect(() => {
    if (!open) return;
    const onDocumentDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocumentDown);
    return () => document.removeEventListener("pointerdown", onDocumentDown);
  }, [open]);

  const choose = (suggestion: AddressSuggestion) => {
    onValueChange(suggestion.street);
    onSelect(suggestion);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      // Down opens a list that was closed by Escape, without retyping.
      if (event.key === "ArrowDown" && suggestions.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      // Only when a row is highlighted. Enter with nothing chosen belongs to
      // the form, and swallowing it would break submitting by keyboard.
      const picked = suggestions[active];
      if (picked) {
        event.preventDefault();
        choose(picked);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        id={inputId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${listId}-${active}` : undefined
        }
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {isFetching && (
        <Loader2
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
        />
      )}

      {showList && (
        <>
          <ul
            id={listId}
            role="listbox"
            aria-label={hintText}
            // z from the token scale (§1): a dropdown is 300 and no component
            // writes its own number.
            className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-[var(--z-dropdown)] mt-1 max-h-72 overflow-y-auto rounded-2xl border p-1 shadow-md"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose(suggestion);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm",
                  index === active && "bg-accent text-accent-foreground",
                )}
              >
                <MapPin aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {suggestion.label}
                </span>
              </li>
            ))}
          </ul>
          {/* Announced once when the list appears, rather than on every
              keystroke — a per-result count read aloud while somebody types is
              noise, not help. */}
          <span className="sr-only" role="status">
            {hintText}
          </span>
        </>
      )}
    </div>
  );
}
