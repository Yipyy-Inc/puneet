"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterDef[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  actions?: (item: T) => React.ReactNode;
  rowClassName?: (item: T) => string;
}

export function DataTable<T extends object>({
  data,
  columns,
  filters = [],
  searchKey,
  searchPlaceholder = "Search...",
  itemsPerPage = 10,
  actions,
  rowClassName,
}: DataTableProps<T>) {
  const t = useTranslations("common");
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
    if (searchKey && searchTerm) {
      const searchValue = String(
        (item as Record<string, unknown>)[searchKey as string],
      ).toLowerCase();
      if (!searchValue.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Custom filters
    for (const filter of filters) {
      const filterValue = filterValues[filter.key];
      if (filterValue && filterValue !== "all") {
        if (
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
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
        {filters.length > 0 && (
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
        {columns.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="space-y-1">
              <DropdownMenuLabel>{t("filter")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  className="p-0"
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Label className="hover:bg-primary/30 flex items-center gap-2 rounded-md border p-2 has-aria-checked:bg-accent/5 w-full cursor-pointer">
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
                      <p className="text-xs leading-none font-medium flex items-center gap-2">
                        {col.icon && <col.icon className="h-3.5 w-3.5" />}
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
      <div className="rounded-md border overflow-x-auto">
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
                  {col.icon && <col.icon className="mr-2 h-4 w-4 inline" />}
                  {col.label}
                  {sortKey === col.key &&
                    col.sortable !== false &&
                    (sortDirection === "asc" ? (
                      <ArrowUp className="ml-1 h-4 w-4 inline" />
                    ) : (
                      <ArrowDown className="ml-1 h-4 w-4 inline" />
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
                  className="text-center py-8 text-muted-foreground"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={index} className={rowClassName?.(item)}>
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
                      {actions(item)}
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
