"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  LifeBuoy,
  Loader2,
  Megaphone,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { SearchInput } from "@/components/search/GlobalSearch";
import {
  ADMIN_SEARCH_MIN_CHARS,
  adminSearchQueries,
  type AdminEntityType,
} from "@/lib/api/admin-search";

const GROUPS: { type: AdminEntityType; label: string; icon: LucideIcon }[] = [
  { type: "facility", label: "Facilities", icon: Building2 },
  { type: "invoice", label: "Invoices", icon: Receipt },
  { type: "ticket", label: "Support Tickets", icon: LifeBuoy },
  { type: "team", label: "Team Members", icon: Users },
  { type: "announcement", label: "Announcements", icon: Megaphone },
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
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

export function AdminGlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 250);
  const term = debounced.trim();
  const ready = term.length >= ADMIN_SEARCH_MIN_CHARS;

  const { data, isFetching } = useQuery(adminSearchQueries.results(term));
  const results = ready ? (data ?? []) : [];

  // "/" focuses the search bar from anywhere in the admin panel.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isEditableElement(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && results[0]) {
      e.preventDefault();
      navigate(results[0].href);
    }
  };

  const groups = GROUPS.map((g) => ({
    ...g,
    items: results.filter((r) => r.entityType === g.type),
  })).filter((g) => g.items.length > 0);

  const showEmpty = ready && !isFetching && results.length === 0;
  const dropdownOpen = open && ready;

  return (
    <Popover open={dropdownOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <SearchInput
          ref={inputRef}
          value={query}
          className={className}
          placeholder="Search facilities, invoices, tickets, team, announcements…"
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          onChangeValue={(next) => {
            setQuery(next);
            setOpen(true);
          }}
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-(--radix-popover-trigger-width) p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isFetching && results.length === 0 && (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            )}

            {groups.map((g, index) => (
              <React.Fragment key={g.type}>
                <CommandGroup heading={g.label}>
                  {g.items.map((item) => (
                    <CommandItem
                      key={`${item.entityType}:${item.id}`}
                      value={`${item.entityType}-${item.id}-${item.primaryText}`}
                      onSelect={() => navigate(item.href)}
                      className="gap-2"
                    >
                      <g.icon className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {item.primaryText}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {item.secondaryText}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {index < groups.length - 1 && <CommandSeparator />}
              </React.Fragment>
            ))}

            {showEmpty && <CommandEmpty>No results for “{term}”.</CommandEmpty>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
