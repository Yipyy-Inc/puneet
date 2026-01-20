"use client";

import * as React from "react";
import { Search, Loader2, Plus, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export type GlobalSearchEntityType = "pet" | "customer" | "booking" | "invoice";

export interface GlobalSearchResultItem {
  entityType: GlobalSearchEntityType;
  id: string;
  href: string;
  primaryText: string;
  secondaryText: string;
}

export interface GlobalSearchResponse {
  results: GlobalSearchResultItem[];
  hasMore?: boolean;
}

export interface GlobalSearchProps {
  /** Existing global search endpoint (frontend only; no backend implementation here). */
  endpoint?: string;
  debounceMs?: number; // 250–400ms recommended
  limit?: number; // default ~10

  /** Router-agnostic. In React Router: pass `useNavigate()` result. In Next: pass `router.push`. */
  navigate?: (to: string) => void;

  /** Optional "Create customer" CTA when there are no results. */
  canCreateCustomer?: boolean;
  onCreateCustomer?: () => void;

  /** Optional "View all results" target */
  getViewAllHref?: (query: string) => string;

  className?: string;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function groupLabel(entityType: GlobalSearchEntityType) {
  if (entityType === "pet" || entityType === "customer") return "Pets / Customers";
  if (entityType === "booking") return "Bookings";
  return "Invoices";
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export interface SearchInputProps {
  value: string;
  onChangeValue: (next: string) => void;
  onFocus?: () => void;
  showShortcutHint?: boolean;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChangeValue, onFocus, showShortcutHint = true, className },
    ref,
  ) {
    return (
      <div className={cn("relative w-full max-w-xl", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          onFocus={onFocus}
          placeholder="Search pets, customers, bookings, invoices..."
          className="pl-9"
          aria-label="Global search"
        />
        {showShortcutHint && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 bg-background/60">
            /
          </kbd>
        )}
      </div>
    );
  },
);

export interface ResultItemProps {
  item: GlobalSearchResultItem;
  onSelect: (href: string) => void;
}

export function ResultItem({ item, onSelect }: ResultItemProps) {
  return (
    <CommandItem
      value={item.primaryText}
      onSelect={() => onSelect(item.href)}
      data-entity-type={item.entityType}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{item.primaryText}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.secondaryText}
        </div>
      </div>
    </CommandItem>
  );
}

export interface ResultsDropdownProps {
  loading: boolean;
  query: string;
  results: GlobalSearchResultItem[];
  hasMore: boolean;
  viewAllHref: string;
  onNavigate: (href: string) => void;
  canCreateCustomer: boolean;
  onCreateCustomer?: () => void;
}

export function ResultsDropdown({
  loading,
  query,
  results,
  hasMore,
  viewAllHref,
  onNavigate,
  canCreateCustomer,
  onCreateCustomer,
}: ResultsDropdownProps) {
  const grouped = React.useMemo(() => {
    const groups: Record<string, GlobalSearchResultItem[]> = {
      "Pets / Customers": [],
      Bookings: [],
      Invoices: [],
    };
    for (const r of results) {
      groups[groupLabel(r.entityType)].push(r);
    }
    return groups;
  }, [results]);

  const showEmpty = !loading && query.trim().length > 0 && results.length === 0;

  return (
    <PopoverContent
      align="start"
      sideOffset={8}
      className="w-[var(--radix-popover-trigger-width)] p-0"
      // Prevent cmdk focus loss on click (popover handles click-outside)
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <Command shouldFilter={false}>
        <CommandList>
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          )}

          {!loading && (
            <>
              {grouped["Pets / Customers"].length > 0 && (
                <CommandGroup heading="Pets / Customers">
                  {grouped["Pets / Customers"].map((r) => (
                    <ResultItem
                      key={`${r.entityType}:${r.id}`}
                      item={r}
                      onSelect={onNavigate}
                    />
                  ))}
                </CommandGroup>
              )}

              {(grouped["Pets / Customers"].length > 0 &&
                (grouped.Bookings.length > 0 || grouped.Invoices.length > 0)) && (
                <CommandSeparator />
              )}

              {grouped.Bookings.length > 0 && (
                <CommandGroup heading="Bookings">
                  {grouped.Bookings.map((r) => (
                    <ResultItem
                      key={`${r.entityType}:${r.id}`}
                      item={r}
                      onSelect={onNavigate}
                    />
                  ))}
                </CommandGroup>
              )}

              {(grouped.Bookings.length > 0 && grouped.Invoices.length > 0) && (
                <CommandSeparator />
              )}

              {grouped.Invoices.length > 0 && (
                <CommandGroup heading="Invoices">
                  {grouped.Invoices.map((r) => (
                    <ResultItem
                      key={`${r.entityType}:${r.id}`}
                      item={r}
                      onSelect={onNavigate}
                    />
                  ))}
                </CommandGroup>
              )}

              {showEmpty && (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>
                  {canCreateCustomer && (
                    <div className="border-t p-2">
                      <CommandItem
                        value="Create customer"
                        onSelect={() => onCreateCustomer?.()}
                      >
                        <Plus className="size-4" />
                        Create customer
                      </CommandItem>
                    </div>
                  )}
                </>
              )}

              {!showEmpty && hasMore && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Actions">
                    <CommandItem value="View all results" onSelect={() => onNavigate(viewAllHref)}>
                      <ArrowRight className="size-4" />
                      View all results
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </PopoverContent>
  );
}

export function GlobalSearch({
  endpoint = "/api/v1/search",
  debounceMs = 300,
  limit = 10,
  navigate,
  canCreateCustomer = false,
  onCreateCustomer,
  getViewAllHref,
  className,
}: GlobalSearchProps) {
  const nav = React.useCallback(
    (to: string) => {
      if (navigate) return navigate(to);
      window.location.assign(to);
    },
    [navigate],
  );

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<GlobalSearchResponse | null>(null);

  // "/" focuses the search input
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isEditableElement(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ESC closes
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setLoading(false);
      setData(null);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("q", q);
        url.searchParams.set("limit", String(limit));

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const json = (await res.json()) as GlobalSearchResponse;
        setData({
          results: Array.isArray(json.results) ? json.results.slice(0, limit) : [],
          hasMore: Boolean(json.hasMore),
        });
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setData({ results: [], hasMore: false });
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [debouncedQuery, endpoint, limit]);

  const results = React.useMemo(() => data?.results ?? [], [data]);
  const hasMore = Boolean(data?.hasMore);

  const viewAllHref =
    getViewAllHref?.(debouncedQuery.trim()) ??
    `/search?q=${encodeURIComponent(debouncedQuery.trim())}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <SearchInput
          ref={inputRef}
          value={query}
          className={className}
          onFocus={() => setOpen(true)}
          onChangeValue={(next) => {
            setQuery(next);
            if (!open) setOpen(true);
          }}
        />
      </PopoverAnchor>

      <ResultsDropdown
        loading={loading}
        query={debouncedQuery}
        results={results}
        hasMore={hasMore}
        viewAllHref={viewAllHref}
        canCreateCustomer={canCreateCustomer}
        onCreateCustomer={() => {
          onCreateCustomer?.();
          if (!onCreateCustomer) nav("/facility/dashboard/clients/new");
          setOpen(false);
        }}
        onNavigate={(href) => {
          nav(href);
          setOpen(false);
        }}
      />
    </Popover>
  );
}

