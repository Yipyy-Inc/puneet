"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export interface ColumnDef<T> {
  accessorKey: string;
  header: string | React.ReactNode;
  cell?: ({ row }: { row: { original: T } }) => React.ReactNode;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchColumn?: string;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends object>({
  data,
  columns,
  searchColumn,
  searchPlaceholder = "Search...",
  itemsPerPage = 50,
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  // Get nested value from object
  const getNestedValue = (obj: object, path: string): unknown => {
    return path
      .split(".")
      .reduce(
        (current, key) =>
          (current as Record<string, unknown> | undefined)?.[key],
        obj as unknown,
      );
  };

  const filteredData = data.filter((item) => {
    // Search filter
    if (searchColumn && searchTerm) {
      const searchValue = String(
        getNestedValue(item, searchColumn),
      ).toLowerCase();
      if (!searchValue.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const paginatedData = filteredData.slice(0, itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchColumn && (
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx}>
                  {typeof col.header === "string" ? col.header : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-8 text-center"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  }
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
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx}>
                      {col.cell
                        ? col.cell({ row: { original: item } })
                        : String(getNestedValue(item, col.accessorKey) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {searchTerm && (
        <div className="text-muted-foreground text-sm">
          Showing {filteredData.length} of {data.length} results
        </div>
      )}
    </div>
  );
}
