"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { compareSortValues } from "@/lib/table/sort";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Columns,
  ArrowUp,
  ArrowDown,
  Inbox,
  SearchX,
  Minus,
  Rows3,
  Check,
} from "lucide-react";
import {
  COLUMN_BUDGET,
  DENSITY,
  useDensityPreference,
  useTableContext,
} from "@/hooks/use-table-density";
import {
  AddFilterChip,
  AllFiltersButton,
  FilterBand,
  FilterBandSearch,
  FilterPill,
} from "@/components/ui/filter-band";
import { LucideIcon } from "lucide-react";
import {
  TableEmptyState,
  type TableEmptyStateAction,
} from "@/components/ui/table-empty-state";
import type { YipyyPoseProps } from "@/components/ui/yipyy-pose";

export interface ColumnDef<T> {
  key: string;
  label: string;
  icon?: LucideIcon;
  render?: (item: T) => React.ReactNode;
  defaultVisible?: boolean;
  sortable?: boolean;
  sortValue?: (item: T) => unknown;
  /** Text alignment for the header + cells. Defaults to left. Use "right" for
   *  numeric columns (also applies tabular-nums to the cells). */
  align?: "left" | "right" | "center";
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Custom filter function. If provided, used instead of simple key matching. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFn?: (item: any, value: string) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterDef[];
  searchKey?: keyof T;
  searchKeys?: (keyof T)[];
  getSearchValue?: (item: T) => string;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  actions?: (item: T) => React.ReactNode;
  rowClassName?: (item: T) => string;
  onRowClick?: (item: T) => void;
  /** Custom filter button callback — renders filter icon that calls this instead of built-in filters */
  onFilterClick?: () => void;
  /** Badge count to show on the custom filter button */
  filterCount?: number;
  /** Enable checkbox selection */
  selectable?: boolean;
  /** Get unique ID from each item for selection tracking */
  getItemId?: (item: T) => string | number;
  /** Controlled selected IDs */
  selectedIds?: Set<string | number>;
  /** Selection change callback */
  onSelectionChange?: (ids: Set<string | number>) => void;
  /**
   * Controls for the bulk-selection bar (§5b pattern 04). The moment anything
   * is ticked the HEADER ROW becomes a solid `--primary` bar carrying the
   * count and these actions — it replaces the header rather than sitting
   * above it, "so the table never changes height".
   *
   * Pass `<BulkActionButton>`s from `@/components/ui/bulk-action-button`:
   * an ordinary outline Button is white-on-white against this bar.
   *
   * Omit it and the bar still appears with the count and the clear control,
   * which is the honest state — the selection is real whether or not this
   * screen has anything to do with it yet.
   */
  bulkActions?: (selectedIds: Set<string | number>) => React.ReactNode;
  /**
   * Names this table so its column choice and density survive a reload
   * (§5n: "a per-table preference saved per user"). Use something stable and
   * specific — "facility.bookings", not "table".
   *
   * Without it nothing is persisted, which is the safe default: a table that
   * cannot name itself must not write to a key another table would read back.
   * The honest limit either way is that this is localStorage, so it is per
   * BROWSER rather than per account — see the note in use-table-density.ts.
   */
  tableId?: string;
  /**
   * The 4 fields the phone card shows, by column key, in order (§5m: "the
   * phone shows four fields, AND YOU PICK THEM — identity, the status chip,
   * the one time or number that matters, one action").
   *
   * Defaults to the first four visible columns, which is a guess this
   * component is not qualified to make well: only the call site knows which
   * column is the identity. Pass it on any table a phone actually opens.
   */
  cardColumns?: string[];
  /** Extra content rendered at the end of the toolbar row */
  toolbarExtra?: React.ReactNode;
  /** Stick the header row to the top on vertical scroll. Off by default. */
  stickyHeader?: boolean;
  /** Alternate row shading (white / very light grey). Off by default. */
  zebra?: boolean;
  /**
   * Empty state shown when there are no rows at all. Falls back to a generic
   * "No data yet" state when omitted. A separate "no matching results" state is
   * shown automatically when a search/filter hides every row.
   */
  emptyState?: {
    icon?: LucideIcon;
    /**
     * Yipyy's pose for THIS module's true-empty state — §5d2 assigns one to
     * every nav area, so look it up there rather than picking.
     *
     * Only the true-empty branch reads it. The filtered-empty branch always
     * gets `searching`, because "no rows match your filters" is the same
     * moment on every screen in the product.
     */
    pose?: YipyyPoseProps["name"];
    title?: string;
    description?: string;
    action?: TableEmptyStateAction;
  };
}

export function DataTable<T extends object>({
  data,
  columns,
  filters = [],
  searchKey,
  searchKeys,
  getSearchValue,
  searchPlaceholder = "Search...",
  itemsPerPage = 10,
  actions,
  rowClassName,
  onRowClick,
  onFilterClick,
  filterCount,
  selectable = false,
  getItemId,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  bulkActions,
  tableId,
  cardColumns,
  toolbarExtra,
  emptyState,
  stickyHeader = false,
  zebra = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    filters.reduce((acc, filter) => ({ ...acc, [filter.key]: "all" }), {}),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columns.reduce(
      (acc, col) => ({
        ...acc,
        [col.key]: col.defaultVisible !== false,
      }),
      {},
    ),
  );
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // §5m's three contexts and §5n's density. Below 1024px the saved preference
  // is IGNORED rather than overwritten, so a manager who chose compact at
  // their desk still has it when they sit back down.
  const tableContext = useTableContext();
  const { density, preference, setPreference, canChoose } =
    useDensityPreference(tableId);
  const rowStyle = DENSITY[density];

  const filteredData = data.filter((item) => {
    // Search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();

      if (getSearchValue) {
        const searchValue = getSearchValue(item).toLowerCase();
        if (!searchValue.includes(lowerSearchTerm)) {
          return false;
        }
      } else if (searchKeys && searchKeys.length > 0) {
        const matches = searchKeys.some((key) => {
          const value = String(
            (item as Record<string, unknown>)[key as string] ?? "",
          ).toLowerCase();
          return value.includes(lowerSearchTerm);
        });
        if (!matches) {
          return false;
        }
      } else if (searchKey) {
        const searchValue = String(
          (item as Record<string, unknown>)[searchKey as string],
        ).toLowerCase();
        if (!searchValue.includes(lowerSearchTerm)) {
          return false;
        }
      }
    }

    // Custom filters
    for (const filter of filters) {
      const filterValue = filterValues[filter.key];
      if (filterValue && filterValue !== "all") {
        if (filter.filterFn) {
          if (!filter.filterFn(item, filterValue)) return false;
        } else if (
          String((item as Record<string, unknown>)[filter.key]) !== filterValue
        ) {
          return false;
        }
      }
    }

    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || col.sortable === false) return 0;
    const getSortValue = (item: T) => {
      if (col.sortValue) return col.sortValue(item);
      return item[col.key as keyof T];
    };
    // The comparison itself lives in src/lib/table/sort.ts, so it can be
    // tested without a browser. See that file for why numbers get their own
    // branch and why numeric strings deliberately do not.
    return compareSortValues(getSortValue(a), getSortValue(b), sortDirection);
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // ── THE COLUMN BUDGET. §6 rule 6, §5m. ────────────────────────────────
  //
  // "A table that will not fit LOSES COLUMNS, it does not scroll" — 7 at
  // >=1024px, 5 at 600-1023px, 4 fields on a card below. What the user chose
  // in the column picker is honoured FIRST and the budget trims from the
  // right, so a hidden column is never silently re-shown to fill a slot, and
  // the columns that survive are the leftmost — which is where identity is.
  //
  // The trimmed ones are not lost: they are exactly what the column picker
  // offers, which is rule 6's own remedy ("extras into a column picker with a
  // saved per-user preference — the overflow becomes a choice someone makes
  // once instead of a gesture they repeat on every row").
  const chosenColumnDefs = columns.filter((col) => visibleColumns[col.key]);
  const budget = COLUMN_BUDGET[tableContext];
  const visibleColumnDefs = chosenColumnDefs.slice(0, budget);
  const overBudget = chosenColumnDefs.length - visibleColumnDefs.length;

  // The phone's four fields. §5m puts the choice at the call site because
  // only it knows which column is identity; the fallback is the first four,
  // which is a guess, and the prop's doc says so.
  const cardColumnDefs = cardColumns?.length
    ? (cardColumns
        .map((key) => columns.find((c) => c.key === key))
        .filter(Boolean) as ColumnDef<T>[])
    : chosenColumnDefs.slice(0, COLUMN_BUDGET.phone);
  // Rows that render a selection checkbox or an actions cell contain their own
  // interactive controls, so the row itself must not also be a button.
  const hasRowControls = Boolean((selectable && getItemId) || actions);
  const emptyColSpan =
    (selectable && getItemId ? 1 : 0) +
    visibleColumnDefs.length +
    (actions ? 1 : 0);
  // ── The filter band (§5b pattern 03) ──────────────────────────────────
  // Every applied built-in filter becomes a removable solid pill; the band
  // itself only renders when it has something in it, so a table with no
  // search, no filters, one column and no extras does not gain an empty
  // --inset strip above it.
  const hasSearch = Boolean(searchKey || searchKeys || getSearchValue);
  const hasColumnPicker = columns.length > 1;
  const appliedFilters = filters
    .map((filter) => ({ filter, value: filterValues[filter.key] }))
    .filter(({ value }) => value && value !== "all");
  const hasToolbar =
    hasSearch ||
    filters.length > 0 ||
    Boolean(onFilterClick) ||
    hasColumnPicker ||
    Boolean(toolbarExtra);
  const selectionCount =
    selectable && getItemId ? (externalSelectedIds?.size ?? 0) : 0;
  // Distinguish "nothing here yet" from "your search/filter hid everything".
  const isFilteredEmpty =
    data.length > 0 &&
    (searchTerm.trim() !== "" ||
      Object.values(filterValues).some((v) => v && v !== "all"));

  return (
    <div className="space-y-4">
      {/* ── ARIA-LIVE ON ASYNC COMPLETION. §5k, stage 11. ─────────────────
          A sighted user sees the table shrink as they type; a screen-reader
          user gets nothing at all, because the rows change without focus
          moving and without anything being announced. This is the one place
          in the product where that happens 87 times over, so it is the one
          place worth the region.

          `polite`, not `assertive`: the count changing is not an interruption,
          and `assertive` would talk over the user mid-keystroke. Empty until
          there is something to say, so nothing is announced on first paint. */}
      <p aria-live="polite" className="sr-only">
        {searchTerm.trim() || appliedFilters.length > 0
          ? `${sortedData.length} of ${data.length} shown`
          : ""}
      </p>
      {/* ── The filter band. §5b pattern 03. ────────────────────────────────
          What this replaced was a bare `flex gap-2` row of controls with no
          surface of its own, so the search box, the filter button and the
          column picker read as three unrelated things floating above the
          table. The band gives them one ground — `--inset`, which rule 2
          allows because it is a neutral surface and not a hue at low
          opacity. */}
      {hasToolbar && (
        <FilterBand>
          {hasSearch && (
            <FilterBandSearch
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          )}

          {/* A call site with its own filter panel gets "All filters"; the
              built-in Select set gets the dashed "Add filter" chip instead,
              because that is what it does — one criterion at a time. Never
              both: two controls opening the same panel is rule 9's problem
              wearing a different label. */}
          {onFilterClick && (
            <AllFiltersButton onClick={onFilterClick} count={filterCount} />
          )}

          {appliedFilters.map(({ filter, value }) => {
            const option = filter.options.find((o) => o.value === value);
            const label = option?.label ?? value;
            return (
              <FilterPill
                key={filter.key}
                label={label}
                removeLabel={`Remove the ${label} filter`}
                onRemove={() => {
                  setFilterValues((prev) => ({ ...prev, [filter.key]: "all" }));
                  setCurrentPage(1);
                }}
              />
            );
          })}

          {!onFilterClick && filters.length > 0 && (
            <AddFilterChip
              onClick={() => setShowFilters(!showFilters)}
              label={showFilters ? "Hide filters" : "Add filter"}
            />
          )}

          {/* ── DENSITY. §5n. ───────────────────────────────────────────────
              Offered only at >=1024px, because that is the only place the
              preference applies: "below 1024px the preference is ignored and
              roomy wins". A control that changes nothing is worse than an
              absent one, so the tablet and phone do not get it — they are
              already roomy, and their user has both hands full. */}
          {canChoose && tableId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Row height: ${preference}`}
                >
                  <Rows3 className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Row height</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  [
                    ["compact", "Compact"],
                    ["balanced", "Balanced"],
                    ["roomy", "Roomy"],
                  ] as const
                ).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => setPreference(value)}
                  >
                    {/* `invisible` rather than `opacity-0`: it reserves the
                        same space without involving opacity at all, which
                        keeps rule 4 unambiguous. */}
                    <Check
                      className={cn(
                        "size-4",
                        preference === value ? "visible" : "invisible",
                      )}
                    />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasColumnPicker && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Choose columns"
                >
                  <Columns className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="space-y-1">
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {/* Rule 6 moves the overflow into "a choice someone makes
                    once", and a choice nobody is told about is not one. This
                    says what the budget did, in the place that can undo it. */}
                {overBudget > 0 && (
                  <p className="text-ink-tertiary max-w-[240px] px-2 pb-1 text-[13px]">
                    Showing {budget} of {chosenColumnDefs.length}. Hide one to
                    show another.
                  </p>
                )}
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuItem
                    key={col.key}
                    className="p-0"
                    onSelect={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <Label className="has-aria-checked:bg-surface-inset flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2">
                      <Checkbox
                        checked={visibleColumns[col.key]}
                        onCheckedChange={(checked) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col.key]: !!checked,
                          }))
                        }
                      />
                      <div className="grid gap-1 font-normal">
                        <p className="flex items-center gap-2 text-xs leading-none font-medium">
                          {col.icon && <col.icon className="size-3.5" />}
                          {col.label}
                        </p>
                      </div>
                    </Label>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {toolbarExtra}

          {/* The built-in Selects drop onto their own line so a table with
              five filters does not push its search box down to 60px wide. */}
          {showFilters && filters.length > 0 && (
            <div className="flex w-full basis-full flex-wrap items-center gap-[11px]">
              {filters.map((filter) => (
                <Select
                  key={filter.key}
                  value={filterValues[filter.key]}
                  onValueChange={(value) => {
                    setFilterValues((prev) => ({
                      ...prev,
                      [filter.key]: value,
                    }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label={filter.label}
                    className="border-line-strong bg-card h-10 w-[180px] rounded-full max-lg:h-12"
                  >
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </FilterBand>
      )}

      {/* ── BELOW 600px A TABLE IS NOT A TABLE. §5m, §6 rule 6. ────────────
          "DataTable -> card list of 4 fields." The alternative the rule bans
          is a table scrolled sideways, which hides the identity column — and
          identity is what makes the other fields mean anything.

          The card carries the SAME cells the table would: `col.render` is
          reused verbatim, so a status chip stays a status chip and a ringed
          pet avatar stays ringed. Only the arrangement changes.

          Selection and row actions come with it, because a phone is where
          floor staff actually work — this is not a read-only fallback. */}
      {tableContext === "phone" ? (
        <div className="flex flex-col gap-2.5">
          {paginatedData.length === 0 ? (
            <div className="border-line bg-card rounded-2xl border">
              {isFilteredEmpty ? (
                <TableEmptyState
                  icon={SearchX}
                  pose="searching"
                  title="No matching results"
                  description="Try adjusting your search or filters."
                />
              ) : (
                <TableEmptyState
                  icon={emptyState?.icon ?? Inbox}
                  pose={emptyState?.pose}
                  title={emptyState?.title ?? "No data yet"}
                  description={emptyState?.description}
                  action={emptyState?.action}
                />
              )}
            </div>
          ) : (
            paginatedData.map((item, index) => (
              <div
                key={index}
                data-density="roomy"
                className={cn(
                  "border-line bg-card shadow-card rounded-2xl border p-4",
                  rowClassName?.(item),
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                <div className="flex items-start gap-3">
                  {selectable && getItemId && (
                    <Checkbox
                      aria-label="Select row"
                      checked={(externalSelectedIds ?? new Set()).has(
                        getItemId(item),
                      )}
                      onCheckedChange={(checked) => {
                        if (!onSelectionChange || !getItemId) return;
                        const next = new Set(externalSelectedIds);
                        if (checked) next.add(getItemId(item));
                        else next.delete(getItemId(item));
                        onSelectionChange(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 size-5"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {cardColumnDefs.map((col, i) => (
                      <div
                        key={col.key}
                        className={cn(
                          "min-w-0",
                          // The first field is the identity, so it is the one
                          // that reads as the card's title.
                          i === 0
                            ? "text-body-ink text-[15px] font-semibold"
                            : "text-ink-secondary text-[14.5px]",
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key])}
                      </div>
                    ))}
                  </div>
                </div>
                {actions && (
                  <div
                    className="border-line mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {actions(item)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // NO SIDEWAYS SCROLL, here or on the Table primitive. 00a76 rule 6: both
        // containers carried `overflow-x-auto`, so a table past its budget
        // scrolled twice over. The reason the ban holds is that a sideways
        // table pushes the IDENTITY column out of view, and identity is what
        // makes the other columns legible. The budget above replaces it.
        <div className="border-line rounded-xl border">
          <Table containerClassName="overflow-x-visible">
            <TableHeader>
              {/* ── Bulk selection. §5b pattern 04. ──────────────────────────
                "A checkbox column turns the header into a selection bar the
                moment anything is ticked." Into, not above: the bar REPLACES
                the header row's cells rather than being inserted as a second
                row, which is what keeps the table from jumping down 40px the
                instant a checkbox is ticked and back up when it is cleared.

                The clear control is a button, not a Checkbox: the reference
                draws it with the `remove` dash, meaning a partial selection,
                and this Checkbox renders a tick in every state including
                indeterminate. A button that says what it does is truer than
                a checkbox that shows the wrong glyph. */}
              {selectionCount > 0 ? (
                <TableRow className="bg-primary hover:bg-primary border-b-0">
                  <TableHead
                    colSpan={emptyColSpan}
                    className={cn(
                      "bg-primary px-4 text-white",
                      stickyHeader && "sticky top-0 z-10",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3.5">
                      <button
                        type="button"
                        aria-label="Clear the selection"
                        onClick={() => onSelectionChange?.(new Set())}
                        className="text-primary relative flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] bg-white outline-none before:absolute before:content-[''] focus-visible:ring-2 focus-visible:ring-white max-lg:before:-inset-[15px]"
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <span className="text-[14px] font-bold whitespace-nowrap tabular-nums">
                        {selectionCount} selected
                      </span>
                      {bulkActions && (
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          {bulkActions(externalSelectedIds ?? new Set())}
                        </div>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  {selectable && getItemId && (
                    <TableHead
                      className={cn(
                        rowStyle.cell,
                        "w-10",
                        stickyHeader && "bg-background sticky top-0 z-10",
                      )}
                    >
                      <Checkbox
                        aria-label="Select all rows"
                        checked={
                          filteredData.length > 0 &&
                          filteredData.every((item) =>
                            (externalSelectedIds ?? new Set()).has(
                              getItemId(item),
                            ),
                          )
                        }
                        onCheckedChange={(checked) => {
                          if (!onSelectionChange || !getItemId) return;
                          if (checked) {
                            const all = new Set(externalSelectedIds);
                            filteredData.forEach((item) =>
                              all.add(getItemId(item)),
                            );
                            onSelectionChange(all);
                          } else {
                            onSelectionChange(new Set());
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  {visibleColumnDefs.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        // 00a75n: the header keeps the same horizontal padding as the
                        // cells under it, or the columns stop lining up the
                        // moment density changes.
                        rowStyle.cell,
                        col.sortable !== false && "cursor-pointer select-none",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        stickyHeader && "bg-background sticky top-0 z-10",
                      )}
                      onClick={() => {
                        if (col.sortable === false) return;
                        if (sortKey === col.key) {
                          setSortDirection(
                            sortDirection === "asc" ? "desc" : "asc",
                          );
                        } else {
                          setSortKey(col.key);
                          setSortDirection("asc");
                        }
                        setCurrentPage(1);
                      }}
                    >
                      {col.icon && <col.icon className="mr-2 inline size-4" />}
                      {col.label}
                      {sortKey === col.key &&
                        col.sortable !== false &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 inline size-4" />
                        ) : (
                          <ArrowDown className="ml-1 inline size-4" />
                        ))}
                    </TableHead>
                  ))}
                  {actions && (
                    <TableHead
                      className={cn(
                        rowStyle.cell,
                        "text-right",
                        stickyHeader && "bg-background sticky top-0 z-10",
                      )}
                    >
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={emptyColSpan} className="p-0">
                    {/* The branch this table already drew — SearchX for a
                      filter that cleared the rows, Inbox for a table that
                      never had any — turns out to be exactly §5d2's own
                      distinction, so each side simply gains its pose.

                      Filtered: `searching`, always. §5d1 reversed an earlier
                      ban to allow this specifically ("a filtered empty IS an
                      empty surface, so it takes searching at 132"), and it is
                      the same moment on every screen, so no call site chooses
                      it. True-empty: the module's own pose, from §5d2. */}
                    {isFilteredEmpty ? (
                      <TableEmptyState
                        icon={SearchX}
                        pose="searching"
                        title="No matching results"
                        description="Try adjusting your search or filters."
                      />
                    ) : (
                      <TableEmptyState
                        icon={emptyState?.icon ?? Inbox}
                        pose={emptyState?.pose}
                        title={emptyState?.title ?? "No data yet"}
                        description={emptyState?.description}
                        action={emptyState?.action}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow
                    key={index}
                    data-density={density}
                    className={cn(
                      // §5n: density moves ROW HEIGHT, cell padding and avatar
                      // size, and nothing else. Font size never changes — that
                      // is rule 16, and it is why this is a height class and
                      // not a scale.
                      rowStyle.row,
                      zebra && "even:bg-muted/40",
                      rowClassName?.(item),
                      onRowClick &&
                        "hover:bg-surface-inset cursor-pointer transition-colors",
                    )}
                    data-row-clickable={onRowClick ? "true" : "false"}
                    onClick={() => onRowClick?.(item)}
                    onKeyDown={(e) => {
                      if (!onRowClick) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(item);
                      }
                    }}
                    // Only claim role="button" when the row has no interactive
                    // children — a button containing a checkbox/menu button is a
                    // WCAG "nested-interactive" failure. Rows that do contain
                    // controls stay mouse-clickable; keyboard users reach the
                    // row's own controls/links instead.
                    tabIndex={onRowClick && !hasRowControls ? 0 : undefined}
                    role={onRowClick && !hasRowControls ? "button" : undefined}
                  >
                    {selectable && getItemId && (
                      <TableCell className={cn(rowStyle.cell, "w-10")}>
                        <Checkbox
                          aria-label="Select row"
                          checked={(externalSelectedIds ?? new Set()).has(
                            getItemId(item),
                          )}
                          onCheckedChange={(checked) => {
                            if (!onSelectionChange || !getItemId) return;
                            const next = new Set(externalSelectedIds);
                            if (checked) next.add(getItemId(item));
                            else next.delete(getItemId(item));
                            onSelectionChange(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {visibleColumnDefs.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          // 00a75n: cell padding is the second of the three
                          // things density moves.
                          rowStyle.cell,
                          col.key === columns[0].key && "font-medium",
                          col.align === "right" && "text-right tabular-nums",
                          col.align === "center" && "text-center",
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key])}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className={cn(rowStyle.cell, "text-right")}>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {actions(item)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
