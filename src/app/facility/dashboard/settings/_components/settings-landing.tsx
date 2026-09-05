"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Puzzle, SearchX } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { canAccessSettingsSection } from "@/components/facility/SettingsSidebar";
import { FilterBand, FilterBandSearch } from "@/components/ui/filter-band";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { SETTINGS_NAV, type SettingsLeaf } from "@/lib/settings/nav";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// ============================================================================
// THE SETTINGS INDEX.
//
// Opening settings used to mean landing IN a section: "Business", 8,992px of it
// — 8.2 screens, twelve stacked cards, 56 inputs and three headings — chosen
// because it happened to be the fallback. Nobody arrived there wanting all of
// it, and the rail beside it was the only way to find out what else existed.
//
// So the index is an index: every section this viewer may open, grouped, on one
// screen. Which is also the only reason the groups could be fixed at all — a
// taxonomy is arguable when you can see it and invisible when it is a list down
// the left edge.
//
// ── AND IT IS SEARCHABLE, BECAUSE 45 IS STILL 45 ─────────────────────────
//
// Nine groups on one screen answers "what is here". It does not answer "where
// do I set the deposit rule", which is what somebody actually arrives with —
// and answering that by reading nine headings is the smaller version of the
// problem this whole rework is about.
//
// The match runs over the LABEL AND ITS GROUP, so "money" finds Taxes and
// "business" finds Hours & closures. Both are things a person types when they
// know the area but not our word for the screen.
//
// ── EVERY ROW IS A LINK, AND THE PERMISSION IS THE SAME ONE ──────────────
//
// Filtered by `canAccessSettingsSection` — the rail's own function over the
// registry's `access` field, not a second list. That is the whole point of the
// registry: the index and the rail cannot come to disagree about what exists.
//
// ── §6 ────────────────────────────────────────────────────────────────────
//
// Rule 2: white cards on the ground, no tint fills — a group is a hairline and
// a micro label, not a coloured panel. Rule 1: no accent on any edge; hover is
// a neutral row wash and the icon inherits its label's ink (§5b1 — an icon
// never introduces a colour).
// ============================================================================

export function SettingsLanding() {
  const label = useSettingsText();
  const permissions = useEffectivePermissions();
  const { modules } = useCustomServices();
  const settingsPath = useSettingsHref();
  const [query, setQuery] = useState("");

  // The rail synthesises these from live data; the index has to agree with it,
  // so it synthesises the same ones the same way.
  const customLeaves: SettingsLeaf[] = useMemo(
    () =>
      modules
        .filter((m) => m.status === "active")
        .map((m) => ({
          id: `custom-${m.slug}`,
          segment: `custom-${m.slug}`,
          label: m.name,
          icon: Puzzle,
          access: "manage_services",
        })),
    [modules],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SETTINGS_NAV.map((group) => {
      const groupLabel = label.group(group.label);
      const matchesGroup = groupLabel.toLowerCase().includes(needle);
      return {
        label: group.label,
        leaves: [
          ...group.leaves,
          ...(group.label === "Services" ? customLeaves : []),
        ]
          // A parent is a heading over other leaves, never a destination.
          .filter(
            (leaf) => !group.leaves.some((other) => other.parent === leaf.id),
          )
          .filter((leaf) => canAccessSettingsSection(leaf.id, permissions))
          .filter(
            (leaf) =>
              !needle ||
              matchesGroup ||
              label.leaf(leaf).toLowerCase().includes(needle),
          ),
      };
    }).filter((group) => group.leaves.length > 0);
  }, [customLeaves, label, permissions, query]);

  return (
    <div className="space-y-4">
      <FilterBand>
        <FilterBandSearch
          placeholder={label.text("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </FilterBand>

      {groups.length === 0 ? (
        <div className="border-line bg-card rounded-3xl border">
          {/* §5d2: a filtered empty IS an empty surface, so it takes
              `searching` — the same pose and the same words DataTable uses when
              its own filters match nothing. */}
          <TableEmptyState
            icon={SearchX}
            pose="searching"
            title={label.text("noMatch")}
            description={label.text("noMatchHint")}
          />
        </div>
      ) : (
        // Columns, not a grid. The groups are wildly different lengths —
        // Money has nine leaves, Pets & records has three — so a grid either
        // stretches the short ones into cards of empty white, or leaves a
        // ragged hole under each until the next row starts. Column flow packs
        // them, which is what turns this from a long page into one screen.
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {groups.map((group) => (
            <section
              key={group.label}
              className="border-line bg-card mb-4 break-inside-avoid rounded-3xl border p-4"
            >
              <h2 className="text-ink-tertiary px-2 pb-2 text-xs font-bold tracking-[0.06em] uppercase">
                {label.group(group.label)}
              </h2>
              <ul className="space-y-0.5">
                {group.leaves.map((leaf) => (
                  <li key={leaf.id}>
                    <Link
                      href={settingsPath(leaf)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-2",
                        "text-foreground hover:bg-muted/50 text-[15px] font-semibold",
                        "transition-colors",
                      )}
                    >
                      <leaf.icon className="size-5 shrink-0" />
                      <span className="min-w-0 flex-1">{label.leaf(leaf)}</span>
                      <ChevronRight className="text-ink-disabled size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
