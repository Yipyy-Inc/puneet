"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuickBooksScope } from "@/lib/quickbooks/connection-store";
import {
  suggestMappings,
  toMapping,
} from "@/lib/quickbooks/mapping-suggestions";
import {
  mappingProgress,
  setQuickBooksMapping,
  useQuickBooksMappings,
} from "@/lib/quickbooks/mappings-store";
import {
  QUICKBOOKS_UNASSIGNED_INCOME,
  useQuickBooksData,
} from "@/lib/quickbooks/qb-data-cache";
import { patchQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import {
  buildMappableGroups,
  CUSTOMER_MAPPING_NOTE,
  TRANSACTION_COUNT_NOTE,
} from "@/lib/quickbooks/yipyy-catalog";

import { QuickBooksMappingGroup } from "./QuickBooksMappingGroup";

// ============================================================================
// Step 4 (Phase 3.4) — map what Yipyy sells to what QuickBooks records.
//
// Groups follow Table 2 and start collapsed: this is a long screen, and a
// facility scrolling past thirteen retail products to reach Tips would give up.
// Each header carries its own progress so the collapsed state still says where
// the work is.
// ============================================================================

export function QuickBooksMappingScreen({
  scope,
  onContinue,
}: {
  scope: QuickBooksScope;
  onContinue?: () => void;
}) {
  const groups = useMemo(() => buildMappableGroups(), []);
  const data = useQuickBooksData(scope);
  const mappings = useQuickBooksMappings(scope);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);

  const suggestions = useMemo(
    () => suggestMappings(groups, data, mappings),
    [groups, data, mappings],
  );
  const suggestionCount = Object.keys(suggestions).length;

  const overall = mappingProgress(groups, mappings);
  const unmapped = overall.total - overall.mapped;

  // "Confirm all suggestions" is not the first thing a facility sees. It shows
  // once they've opened a group and moved down the page — accepting forty
  // postings sight-unseen is exactly what this screen exists to prevent.
  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 120) setScrolled(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasReviewed = expanded.size > 0 && scrolled;

  function confirmAllSuggestions() {
    for (const [itemId, suggestion] of Object.entries(suggestions)) {
      setQuickBooksMapping(scope, itemId, toMapping(suggestion));
    }
  }

  function handleContinue() {
    patchQuickBooksSetup(scope, { mappingsReviewed: true });
    onContinue?.();
  }

  const barTone =
    overall.percent >= 100 ? "full" : overall.percent >= 50 ? "part" : "low";

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
              data-tone={barTone}
              style={{ width: `${overall.percent}%` }}
              className="h-full rounded-full transition-all data-[tone=full]:bg-emerald-500 data-[tone=low]:bg-red-500 data-[tone=part]:bg-amber-500"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {TRANSACTION_COUNT_NOTE}
          </p>

          {hasReviewed && suggestionCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={confirmAllSuggestions}
                className="border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                <Sparkles className="mr-1.5 size-3.5" />
                Confirm all {suggestionCount} suggestions
              </Button>
              <p className="text-muted-foreground text-xs">
                Applies every amber suggestion. You can still change any of them
                afterwards.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Groups (Table 2) ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {groups.map((group) => (
          <QuickBooksMappingGroup
            key={group.key}
            group={group}
            scope={scope}
            suggestions={suggestions}
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

      {/* ── The catch-all rule, stated before they commit to it ─────────── */}
      {unmapped > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <p>
            <span className="font-semibold">
              {unmapped} unmapped {unmapped === 1 ? "item" : "items"}
            </span>{" "}
            will post to &ldquo;{QUICKBOOKS_UNASSIGNED_INCOME}&rdquo;, an
            account Yipyy creates when you finish setup. Those sales still reach
            QuickBooks — each one is flagged in the sync log so you can move it
            later.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {overall.mapped === 0 && (
          <p className="text-muted-foreground text-xs">
            Map at least one item to continue.
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
