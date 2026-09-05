"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { ChevronDown, Puzzle } from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import type { PermissionKey } from "@/types/facility-staff";
import {
  SETTINGS_LEAVES,
  SETTINGS_NAV,
  SETTINGS_PARENT_IDS,
  settingsLeaf,
  type SettingsLeaf,
} from "@/lib/settings/nav";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// ── THE RAIL IS DERIVED, NOT DECLARED ─────────────────────────────────────
//
// This file used to hold three things that had to agree: `STATIC_GROUPS` (the
// rail), `SETTINGS_SECTION_KEYS` (the permission map the settings page reused
// to guard deep links), and — by convention only — the ~45 render branches in
// page.tsx. Nothing compared them, and they had drifted: the map's own comment
// admits that an unmapped id is ALLOWED, so adding a rail entry and forgetting
// the map entry hid the link from a groomer and still let them deep-link to it.
//
// All of it now comes from `src/lib/settings/nav.ts`, where `access` is a
// REQUIRED field. That deletes the unmapped state rather than documenting it,
// and `bun run check:settings-routes` walks the same list to prove every leaf
// renders and every link in the product resolves to one.

/**
 * A rail entry: a registry leaf, plus the children the rail nests under it.
 * The registry stores that relation flat (`parent`) because a flat list is
 * what the gate, the redirect map and the landing page all want; the nesting
 * exists only here, where it is drawn.
 */
export type SettingsSection = SettingsLeaf & { children?: SettingsLeaf[] };

/**
 * The controlling permission for each facility-admin settings section, still
 * exported under its old name because the settings page guards deep links with
 * it. Personal sections are absent by construction — they have no key.
 */
export const SETTINGS_SECTION_KEYS: Record<string, PermissionKey> =
  Object.fromEntries(
    SETTINGS_LEAVES.filter((l) => l.access !== "personal").map((l) => [
      l.id,
      l.access as PermissionKey,
    ]),
  );

/**
 * True when the acting viewer may open a settings section.
 *
 * `!== false` rather than `=== true` on purpose, and it is not the same
 * question the server asks. `myPermissions()` returns an EMPTY map on any RPC
 * error, so "denied" and "we could not find out" are indistinguishable there;
 * reading an absent key as denied here would blank the whole rail — including
 * the owner's — on one transient failure. The client stays permissive about
 * what it does not know and the server route is what actually refuses.
 */
export function canAccessSettingsSection(
  id: string,
  permissions: Record<string, unknown>,
): boolean {
  const leaf = settingsLeaf(id);
  if (!leaf) return false;
  return leaf.access === "personal" || permissions[leaf.access] !== false;
}

interface SettingsGroup {
  label: string;
  sections: SettingsSection[];
}

/** The registry's flat leaves, re-nested under their parent for the rail. */
const STATIC_GROUPS: SettingsGroup[] = SETTINGS_NAV.map((group) => ({
  label: group.label,
  // `: SettingsSection` is annotated, not inferred. Without it TypeScript
  // widens the array to a union of the two literal shapes and `children` —
  // which only the parent branch declares — stops existing on the whole. The
  // hand-written version of this list carried the same note.
  sections: group.leaves
    .filter((l) => !l.parent)
    .map(
      (l): SettingsSection =>
        SETTINGS_PARENT_IDS.has(l.id)
          ? { ...l, children: group.leaves.filter((c) => c.parent === l.id) }
          : l,
    ),
}));

interface SettingsSidebarProps {
  /** The leaf id currently open, or "" at the settings index. */
  activeSection: string;
}

export function SettingsSidebar({ activeSection }: SettingsSidebarProps) {
  // Keyed on the leaf id, not matched on its English words — see
  // src/lib/settings/text.ts for why the app-wide `useUiText` cannot do this.
  const label = useSettingsText();
  const { modules } = useCustomServices();
  const permissions = useEffectivePermissions();
  const settingsPath = useSettingsHref();
  const activeModules = modules.filter((m) => m.status === "active");

  /** One gate. There used to be two — this line also re-checked a `permKey`
   *  on the section — because the rail and the permission map were separate
   *  lists that "are allowed to disagree". They are one list now, so there is
   *  one answer. */
  const visible = (section: SettingsSection) =>
    canAccessSettingsSection(section.id, permissions);

  // Build groups with dynamic custom modules, then filter each section by the
  // acting viewer's permissions: personal sections always show; facility-admin
  // sections show only when granted. Custom module config follows manage_services.
  const groups: SettingsGroup[] = STATIC_GROUPS.map((group) => {
    const base: SettingsGroup =
      group.label === "Services" && activeModules.length > 0
        ? {
            ...group,
            // Annotated, not inferred: without it TypeScript widens the array
            // to a union of the literal shapes, and `section.children` — which
            // only some members declare — stops existing on the whole.
            sections: [
              ...group.sections,
              ...activeModules.map(
                (m): SettingsSection => ({
                  id: `custom-${m.slug}`,
                  segment: `custom-${m.slug}`,
                  label: m.name,
                  icon: Puzzle,
                  access: "manage_services",
                }),
              ),
            ],
          }
        : group;
    return {
      ...base,
      sections: base.sections
        .map((section) =>
          section.children
            ? { ...section, children: section.children.filter(visible) }
            : section,
        )
        // A parent whose every child was filtered away is a heading for
        // nothing, so it goes with them — otherwise a groomer would see
        // "Payments & Billing" expand into an empty list.
        .filter((s) => visible(s) && (!s.children || s.children.length > 0)),
    };
  }).filter((group) => group.sections.length > 0);

  return (
    <nav className="w-full space-y-1 lg:w-56">
      {groups.map((group) => (
        <Collapsible key={group.label} defaultOpen>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wider uppercase">
            {label.group(group.label)}
            <ChevronDown className="size-3" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-0.5">
              {group.sections.map((section) =>
                section.children ? (
                  <ParentSection
                    key={section.id}
                    section={section}
                    activeSection={activeSection}
                    settingsPath={settingsPath}
                    label={label}
                  />
                ) : (
                  <SectionLink
                    key={section.id}
                    href={settingsPath(section)}
                    section={section}
                    isActive={activeSection === section.id}
                    label={label.leaf(section)}
                  />
                ),
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </nav>
  );
}

/**
 * One leaf: an icon, a label, and the active treatment.
 *
 * ── A LINK, NOT A BUTTON ──────────────────────────────────────────────────
 *
 * It was a `<button>` calling `onSectionChange`, because the section was
 * component state and the URL was written afterwards. The section IS the URL
 * now, so this is an anchor: it opens in a new tab on middle click, offers a
 * copyable address on right click, and Next prefetches it on hover. None of
 * which a button can do.
 *
 * ── AND THE SELECTED STATE IS NO LONGER A TINT ────────────────────────────
 *
 * It was `bg-primary/10 text-primary`, which §6 rule 2 bans outright: white,
 * or a solid. The rule's own escape is what this takes — "where one must
 * dominate, fill it solid with the ink at full strength" — so the open section
 * is a solid `--primary` pill with white on it, 5.09:1, which is also what §1
 * says an active nav item wears. A pill, because §1 lists nav items among the
 * things that are pills.
 */
function SectionLink({
  href,
  section,
  isActive,
  label,
  nested,
}: {
  href: string;
  section: SettingsSection;
  isActive: boolean;
  label: string;
  nested?: boolean;
}) {
  const Icon = section.icon;
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
        nested && "pl-8",
        isActive
          ? "bg-primary font-medium text-white"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

/**
 * A heading that expands, for a section holding others.
 *
 * Open by default, like the groups around it — a settings list that hides three
 * of its entries behind a closed twisty is a settings list where people cannot
 * find things. `defaultOpen` rather than a controlled `open`: a facility who
 * collapses it should stay collapsed while they work, and re-opening it on
 * every render would fight them.
 */
function ParentSection({
  section,
  activeSection,
  settingsPath,
  label,
}: {
  section: SettingsSection;
  activeSection: string;
  settingsPath: (leaf: SettingsLeaf) => string;
  label: ReturnType<typeof useSettingsText>;
}) {
  const Icon = section.icon;
  const holdsActive = (section.children ?? []).some(
    (child) => child.id === activeSection,
  );

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          // The heading itself is never "active" — it has no screen. When a
          // child is selected the heading only reads as its parent, which is
          // why it takes a weight change and not the accent background.
          holdsActive && "text-foreground font-medium",
        )}
      >
        <Icon className="size-4" />
        {label.leaf(section)}
        <ChevronDown className="ml-auto size-3" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5">
          {(section.children ?? []).map((child) => (
            <SectionLink
              key={child.id}
              href={settingsPath(child)}
              section={child}
              nested
              isActive={activeSection === child.id}
              label={label.leaf(child)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
