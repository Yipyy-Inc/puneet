"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, MinusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import type { SuggestionSet } from "@/lib/quickbooks/mapping-suggestions";
import {
  groupProgress,
  setQuickBooksMapping,
  setQuickBooksMappings,
  useQuickBooksMappings,
} from "@/lib/quickbooks/mappings-store";
import {
  selectableClasses,
  suggestClassForLocation,
} from "@/lib/quickbooks/location-classes";
import { activeItems, useQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import type { MappableGroup } from "@/lib/quickbooks/yipyy-catalog";

import { QuickBooksMappingCard } from "./QuickBooksMappingCard";

// One Table 2 group: a collapsible header carrying its own progress, a bulk
// toolbar once rows are selected, and the per-item cards.

function progressTone(percent: number): string {
  // Red under half, amber while there's work left, green only when complete.
  if (percent >= 100)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (percent >= 50)
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
}

export function QuickBooksMappingGroup({
  group,
  scope,
  suggestions,
  expanded,
  onToggle,
}: {
  group: MappableGroup;
  scope: QuickBooksScope;
  suggestions: SuggestionSet;
  expanded: boolean;
  onToggle: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const data = useQuickBooksData(scope);
  const mappings = useQuickBooksMappings(scope);
  const progress = groupProgress(group, mappings);
  const qbItems = activeItems(data);
  const qbClasses = selectableClasses(data);

  // Selection is per-group and deliberately not persisted — it's a working
  // gesture, not a decision worth surviving a reload.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Snapshotted with each mapping so the row survives the service being
  // deleted from the catalog.
  const itemNames = Object.fromEntries(group.items.map((i) => [i.id, i.name]));

  const allSelected =
    group.items.length > 0 && selected.size === group.items.length;

  function toggleAll(next: boolean) {
    setSelected(next ? new Set(group.items.map((i) => i.id)) : new Set());
  }

  function applyToSelected(patch: {
    itemId?: string;
    accountId?: string;
  }): void {
    setQuickBooksMappings(scope, [...selected], patch, itemNames);
  }

  // Bulk account choices follow the same rule as a single card: a group of
  // liability items must not be handed income accounts.
  const isLocationGroup = group.key === "locations";
  const groupIsLiability = group.items.every((i) => i.postsToLiability);
  const bulkAccounts = groupIsLiability
    ? data.accounts.filter((a) => a.Classification === "Liability")
    : data.accounts.filter(
        (a) => a.Classification === "Revenue" || a.Classification === "Asset",
      );

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-muted/40 flex w-full items-center gap-3 p-4 text-left transition-colors"
      >
        <ChevronDown
          data-expanded={expanded}
          className="text-muted-foreground size-4 shrink-0 transition-transform data-[expanded=false]:-rotate-90"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{group.title}</p>
          <p className="text-muted-foreground text-xs">{group.description}</p>
        </div>
        {group.items.length === 0 ? (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <MinusCircle className="size-3" />
            None set up
          </Badge>
        ) : (
          <Badge variant="outline" className={progressTone(progress.percent)}>
            {progress.percent === 100 && (
              <CheckCircle2 className="mr-1 size-3" />
            )}
            {progress.mapped}/{progress.total} mapped
          </Badge>
        )}
      </button>

      {expanded && group.items.length > 0 && (
        <CardContent className="border-t p-0">
          {/* ── Bulk bar ─────────────────────────────────────────────────── */}
          {/* Locations have no item/account to bulk-apply — one Class each. */}
          {!isLocationGroup && (
            <div className="bg-muted/30 flex flex-wrap items-center gap-3 border-b p-3">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(next) => toggleAll(next === true)}
                  aria-label={`Select all ${group.title}`}
                />
                Select all {group.title.toLowerCase()}
              </label>

              {selected.size > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {selected.size} selected · apply to all:
                  </span>
                  <Select
                    value=""
                    onValueChange={(value) =>
                      applyToSelected({ itemId: value })
                    }
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue placeholder="Product / Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {qbItems.map((qb) => (
                        <SelectItem
                          key={qb.Id}
                          value={qb.Id}
                          className="text-xs"
                        >
                          {qb.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value=""
                    onValueChange={(value) =>
                      applyToSelected({ accountId: value })
                    }
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkAccounts.map((a) => (
                        <SelectItem key={a.Id} value={a.Id} className="text-xs">
                          {a.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          )}

          {group.items.map((item) => (
            <QuickBooksMappingCard
              key={item.id}
              item={item}
              mapping={mappings[item.id]}
              items={qbItems}
              accounts={data.accounts}
              classes={item.mapsToClass ? qbClasses : undefined}
              suggestedClass={
                item.mapsToClass
                  ? suggestClassForLocation(
                      // The row already carries what the matcher reads: the
                      // location's name, and its short code as the type prefix.
                      { name: item.name, shortCode: item.type.split(" · ")[0] },
                      qbClasses,
                    )
                  : undefined
              }
              realmId={connection.realmId}
              suggestion={suggestions[item.id]}
              selected={selected.has(item.id)}
              onSelectedChange={(next) =>
                setSelected((prev) => {
                  const updated = new Set(prev);
                  if (next) updated.add(item.id);
                  else updated.delete(item.id);
                  return updated;
                })
              }
              onChange={(patch) =>
                setQuickBooksMapping(scope, item.id, {
                  ...patch,
                  name: item.name,
                })
              }
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
