"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { getTenantAuditLogs, type TenantAuditLog } from "@/data/tenant-logs";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChangesTable({
  changes,
}: {
  changes: { field: string; oldValue: string; newValue: string }[];
}) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-lg border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-muted-foreground p-2 text-left font-medium">
              Field
            </th>
            <th className="text-muted-foreground p-2 text-left font-medium">
              Before
            </th>
            <th className="text-muted-foreground p-2 text-left font-medium">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 font-medium">{c.field}</td>
              <td className="text-muted-foreground p-2">
                {c.oldValue || (
                  <span className="text-muted-foreground/50 italic">empty</span>
                )}
              </td>
              <td className="text-foreground p-2 font-medium">{c.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditEntry({ entry }: { entry: TenantAuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = entry.changes.length > 0;

  return (
    <div
      className={`hover:bg-muted/30 rounded-lg border p-3 transition-colors ${hasChanges ? "cursor-pointer" : ""}`}
      onClick={() => hasChanges && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
          <Shield className="text-muted-foreground size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm">
                <span className="font-medium">{entry.userName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ({entry.userRole})
                </span>
                <span className="text-muted-foreground"> — </span>
                <span>{entry.action}</span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {entry.entityName}
                {entry.description !== entry.entityName &&
                  ` — ${entry.description}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {formatRelative(entry.timestamp)}
              </span>
              {hasChanges &&
                (expanded ? (
                  <ChevronDown className="text-muted-foreground size-3.5" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-3.5" />
                ))}
            </div>
          </div>
          {expanded && <ChangesTable changes={entry.changes} />}
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  "All",
  "Configuration",
  "Financial",
  "Client",
  "Booking",
  "User Access",
  "Security",
  "System",
  "Data",
];

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AuditTrail({ facilityId = 11 }: { facilityId?: number }) {
  const allEntries = useMemo(
    () => getTenantAuditLogs(facilityId),
    [facilityId],
  );
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateRange, setDateRange] = useState("all");

  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => {
    let entries = allEntries;
    if (categoryFilter !== "All") {
      entries = entries.filter((e) => e.category === categoryFilter);
    }
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      entries = entries.filter((e) => new Date(e.timestamp).getTime() > cutoff);
    }
    return entries;
  }, [allEntries, categoryFilter, dateRange, now]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-muted-foreground text-xs">
          {filtered.length} entries
        </Badge>
      </div>

      {/* Entries */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Shield className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
              <p className="font-medium">No audit entries</p>
              <p className="text-muted-foreground mt-1 text-sm">
                No changes match your filters.
              </p>
            </div>
          ) : (
            filtered.map((entry) => <AuditEntry key={entry.id} entry={entry} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
