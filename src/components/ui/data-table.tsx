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
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchColumn,
  searchPlaceholder = "Search...",
  itemsPerPage = 50,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  // Get nested value from object
  const getNestedValue = (obj: any, path: string): any => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
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
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
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
                  className="text-center py-8 text-muted-foreground"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={index}>
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
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} results
        </div>
      )}
    </div>
  );
}
