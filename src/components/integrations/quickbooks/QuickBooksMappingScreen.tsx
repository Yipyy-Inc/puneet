"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Mail,
  MinusCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import {
  groupProgress,
  mappingProgress,
  setQuickBooksMapping,
  useQuickBooksMappings,
} from "@/lib/quickbooks/mappings-store";
import { activeItems, useQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import { patchQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import {
  buildMappableGroups,
  CUSTOMER_MAPPING_NOTE,
  TRANSACTION_COUNT_NOTE,
  type MappableGroup,
} from "@/lib/quickbooks/yipyy-catalog";

import { QuickBooksMappingCard } from "./QuickBooksMappingCard";

// ============================================================================
// Step 4 (Phase 3.4) — map what Yipyy sells to what QuickBooks records.
//
// Groups follow Table 2 and start collapsed: this is a long screen, and a
// facility scrolling past forty retail products to reach Tips would give up.
// Each header carries its own progress so the collapsed state still says where
// the work is.
// ============================================================================

function progressTone(percent: number): string {
  if (percent >= 100)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (percent >= 50)
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
}

function GroupSection({
  group,
  scope,
  expanded,
  onToggle,
}: {
  group: MappableGroup;
  scope: QuickBooksScope;
  expanded: boolean;
  onToggle: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const data = useQuickBooksData(scope);
  const mappings = useQuickBooksMappings(scope);
  const progress = groupProgress(group, mappings);
  const qbItems = activeItems(data);

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
          {group.items.map((item) => (
            <QuickBooksMappingCard
              key={item.id}
              item={item}
              mapping={mappings[item.id]}
              items={qbItems}
              accounts={data.accounts}
              realmId={connection.realmId}
              onChange={(patch) => setQuickBooksMapping(scope, item.id, patch)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function QuickBooksMappingScreen({
  scope,
  onContinue,
}: {
  scope: QuickBooksScope;
  onContinue?: () => void;
}) {
  const groups = useMemo(() => buildMappableGroups(), []);
  const mappings = useQuickBooksMappings(scope);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const overall = mappingProgress(groups, mappings);
  const unmapped = overall.total - overall.mapped;

  function handleContinue() {
    patchQuickBooksSetup(scope, { mappingsReviewed: true });
    onContinue?.();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Map your services to QuickBooks
        </h1>
        <p className="text-muted-foreground text-sm">
          Tell Yipyy which QuickBooks item and account each thing you sell
          belongs to.
        </p>
      </div>

      {/* ── Overall progress ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {overall.mapped} of {overall.total} items mapped
            </span>
            <span className="text-muted-foreground text-xs">
              {overall.percent}%
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              data-tone={
                overall.percent >= 100
                  ? "full"
                  : overall.percent >= 50
                    ? "part"
                    : "low"
              }
              style={{ width: `${overall.percent}%` }}
              className="h-full rounded-full transition-all data-[tone=full]:bg-emerald-500 data-[tone=low]:bg-red-500 data-[tone=part]:bg-amber-500"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {TRANSACTION_COUNT_NOTE}
          </p>
        </CardContent>
      </Card>

      {/* ── Groups (Table 2) ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            scope={scope}
            expanded={expanded.has(group.key)}
            onToggle={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(group.key)) next.delete(group.key);
                else next.add(group.key);
                return next;
              })
            }
          />
        ))}
      </div>

      {/* ── Customer mapping: the one the facility doesn't choose ───────── */}
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">How clients are matched</p>
            <p className="text-muted-foreground text-xs">
              {CUSTOMER_MAPPING_NOTE.detail}
            </p>
            <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px]">
              <div>
                <dt className="inline font-medium">Matched by: </dt>
                <dd className="inline">{CUSTOMER_MAPPING_NOTE.matchBy}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Name format: </dt>
                <dd className="inline font-mono">
                  {CUSTOMER_MAPPING_NOTE.nameFormat}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium">Fallback: </dt>
                <dd className="inline">{CUSTOMER_MAPPING_NOTE.fallback}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {unmapped > 0 && (
          <p className="text-muted-foreground text-xs">
            {unmapped} unmapped {unmapped === 1 ? "item" : "items"} will post to
            a catch-all income account.
          </p>
        )}
        <Button
          onClick={handleContinue}
          disabled={overall.mapped === 0}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
