"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Filter, Columns, ArrowUp, ArrowDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  icon?: LucideIcon;
  render?: (item: T) => React.ReactNode;
  defaultVisible?: boolean;
  sortable?: boolean;
  sortValue?: (item: T) => unknown;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Custom filter function. If provided, used instead of simple key matching. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFn?: (item: any, value: string) => boolean;
}

interface DataTableProps<T> {
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
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const visibleColumnDefs = columns.filter((col) => visibleColumns[col.key]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-2">
        {(searchKey || searchKeys || getSearchValue) && (
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
        {showFilters &&
          filters.map((filter) => (
            <Select
              key={filter.key}
              value={filterValues[filter.key]}
              onValueChange={(value) => {
                setFilterValues((prev) => ({ ...prev, [filter.key]: value }));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
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
        {onFilterClick && (
          <Button
            variant={filterCount ? "default" : "outline"}
            size="icon"
            className="relative"
            onClick={onFilterClick}
          >
            <Filter className="size-4" />
            {!!filterCount && filterCount > 0 && (
              <span className="bg-primary-foreground text-primary absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
                {filterCount}
              </span>
            )}
          </Button>
        )}
        {!onFilterClick && filters.length > 0 && (
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-4" />
          </Button>
        )}
        {columns.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="space-y-1">
              <DropdownMenuLabel>Filter</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  className="p-0"
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Label className="hover:bg-primary/30 has-aria-checked:bg-accent/5 flex w-full cursor-pointer items-center gap-2 rounded-md border p-2">
                    <Checkbox
                      checked={visibleColumns[col.key]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: !!checked,
                        }))
                      }
                      className="data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-primary-foreground mt-0.5"
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumnDefs.map((col) => (
                <TableHead
                  key={col.key}
                  className={
                    col.sortable !== false ? "cursor-pointer select-none" : ""
                  }
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
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnDefs.length + (actions ? 1 : 0)}
                  className="text-muted-foreground py-8 text-center"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    rowClassName?.(item),
                    onRowClick &&
                      "hover:bg-muted/50 cursor-pointer transition-colors",
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
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {visibleColumnDefs.map((col) => (
                    <TableCell
                      key={col.key}
                      className={
                        col.key === columns[0].key ? "font-medium" : ""
                      }
                    >
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key])}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
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
