import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import {
  SETTINGS_NAV,
  SETTINGS_LEAVES,
  SETTINGS_PARENT_IDS,
} from "../../src/lib/settings/nav";
import {
  settingsGroupLabel,
  settingsLeafLabel,
  settingsText,
} from "../../src/lib/settings/text";

// ============================================================================
// EVERY SETTINGS LABEL EXISTS IN BOTH LANGUAGES.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// There was no `settings` namespace at all. Settings labels went through
// `src/lib/ui-translations.ts`, an English→French string map that RETURNS THE
// INPUT UNCHANGED on a miss — so a missing translation is indistinguishable
// from a translated one, and nothing anywhere could tell you which. Measured
// before this landed: of the settings labels, exactly ONE ("Notifications")
// had a French string. A French user read the entire area in English and the
// build was perfectly happy.
//
// That is the failure mode a fallback-to-input map always has. It cannot be
// fixed by translating more strings, only by making the absence visible, which
// is what this file does.
//
// ── IT IS TIED TO THE REGISTRY, NOT TO A COPY OF IT ──────────────────────
//
// The keys are asserted against `SETTINGS_NAV` itself, so adding a section
// without translating it fails here rather than shipping an English label into
// a French screen. A list checked against another list is two lists; a list
// checked against the thing it describes is one.
// ============================================================================

const enSettings = en.settings as {
  groups: Record<string, string>;
  leaves: Record<string, string>;
  index: Record<string, string>;
};
const frSettings = fr.settings as typeof enSettings;

describe("the settings namespace", () => {
  test("every group in the registry is translated", () => {
    for (const group of SETTINGS_NAV) {
      expect(enSettings.groups[group.label], `en: ${group.label}`).toBeString();
      expect(frSettings.groups[group.label], `fr: ${group.label}`).toBeString();
    }
  });

  test("every leaf in the registry is translated", () => {
    for (const leaf of SETTINGS_LEAVES) {
      expect(enSettings.leaves[leaf.id], `en: ${leaf.id}`).toBeString();
      expect(frSettings.leaves[leaf.id], `fr: ${leaf.id}`).toBeString();
    }
  });

  test("the English side is the registry's own label", () => {
    // Not a second copy to keep in step: renaming a section in the registry
    // must not leave a stale English string behind in the catalogue.
    for (const leaf of SETTINGS_LEAVES) {
      expect(enSettings.leaves[leaf.id]).toBe(leaf.label);
    }
  });

  test("neither catalogue carries a key the registry does not have", () => {
    const ids = new Set(SETTINGS_LEAVES.map((l) => l.id));
    for (const key of Object.keys(enSettings.leaves))
      expect(ids.has(key)).toBe(true);
    for (const key of Object.keys(frSettings.leaves))
      expect(ids.has(key)).toBe(true);
  });

  test("en and fr have the same shape", () => {
    expect(Object.keys(frSettings.groups).sort()).toEqual(
      Object.keys(enSettings.groups).sort(),
    );
    expect(Object.keys(frSettings.leaves).sort()).toEqual(
      Object.keys(enSettings.leaves).sort(),
    );
    expect(Object.keys(frSettings.index).sort()).toEqual(
      Object.keys(enSettings.index).sort(),
    );
  });

  test("nothing is left in English on the French side", () => {
    // A French value identical to its English one is how an untranslated
    // string hides — it is exactly what ui-translations.ts did silently. The
    // few that are legitimately identical are named, so the next one has to be
    // argued for rather than slipped in.
    const SAME_IN_BOTH = new Set([
      "taxes", // Taxes / Taxes
      "notifications", // Notifications / Notifications
      "yipyy-pay", // a product name, and product names do not translate
      "yipyygo", // Yipyy Go, same
    ]);
    const untranslated = SETTINGS_LEAVES.filter(
      (leaf) =>
        !SETTINGS_PARENT_IDS.has(leaf.id) &&
        !SAME_IN_BOTH.has(leaf.id) &&
        frSettings.leaves[leaf.id] === enSettings.leaves[leaf.id],
    ).map((leaf) => leaf.id);
    expect(untranslated).toEqual([]);
  });
});

describe("the label lookup", () => {
  test("a registry leaf resolves in both languages", () => {
    for (const leaf of SETTINGS_LEAVES) {
      expect(settingsLeafLabel("en", leaf)).toBe(leaf.label);
      expect(settingsLeafLabel("fr", leaf)).toBe(
        frSettings.leaves[leaf.id] as string,
      );
    }
  });

  test("a group resolves in both languages", () => {
    for (const group of SETTINGS_NAV) {
      expect(settingsGroupLabel("en", group.label)).toBe(group.label);
      expect(settingsGroupLabel("fr", group.label)).toBe(
        frSettings.groups[group.label] as string,
      );
    }
  });

  test("a name the facility typed is NOT translated", () => {
    // §5q: "A pet's name, a breed as the owner typed it, an invoice number and
    // a run number never pass through the locale layer." A custom service
    // module's name is the same kind of thing — the rail synthesises
    // `custom-<slug>` entries from live data, and there is no key for one.
    const custom = { id: "custom-hydrotherapy", label: "Hydrothérapie Plus" };
    expect(settingsLeafLabel("fr", custom)).toBe("Hydrothérapie Plus");
    expect(settingsLeafLabel("en", custom)).toBe("Hydrothérapie Plus");
  });

  test("an unknown index key falls back to English, then to itself", () => {
    expect(settingsText("fr", "title")).toBe(frSettings.index.title);
    expect(settingsText("fr", "nope" as never)).toBe("nope");
  });
});

// ============================================================================
// AND THE SAME THING, ONE LEVEL DOWN: A SECTION'S OWN BODY COPY.
//
// The tests above cover the RAIL — group headings, leaf labels, the index. They
// say nothing about `settings.sections.<id>`, which is where the actual screen
// lives: 41 strings for `hours` alone, added by hand in two files with nothing
// comparing them.
//
// `settingsSectionText` falls back `fr → en → key`, and that fallback is
// correct — a missing French string should read as English words rather than
// as `blockReasonPlaceholder`. But it is also silent, which is exactly the
// failure `translateUiText()` had and this whole namespace exists to escape.
// `check:ui-french` cannot see it either: a string routed through `t("…")` is
// an expression, so the gate counts the section as converted the moment the
// literal leaves the JSX — whether or not a French string was ever written.
//
// So a section can pass every gate in this repo and still render English.
// Measured when this was written: `business` and `hours`, 66 keys, all present
// in both — the hole was real and nothing had fallen into it yet.
// ============================================================================

const enSections = (
  en.settings as { sections: Record<string, Record<string, string>> }
).sections;
const frSections = (
  fr.settings as { sections: Record<string, Record<string, string>> }
).sections;

describe("a settings section's body copy", () => {
  test("every section with English copy has a French counterpart", () => {
    const missing = Object.keys(enSections).filter((id) => !frSections[id]);
    expect(missing).toEqual([]);
  });

  test("every key is present in both languages", () => {
    const missing: string[] = [];
    for (const [section, strings] of Object.entries(enSections)) {
      for (const key of Object.keys(strings)) {
        if (frSections[section]?.[key] === undefined) {
          missing.push(`${section}.${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test("no French section carries a key English does not", () => {
    // The other direction, and not symmetry for its own sake: a key removed
    // from the screen leaves dead copy behind, and dead copy is what makes the
    // next person think a string is handled when nothing renders it.
    const orphaned: string[] = [];
    for (const [section, strings] of Object.entries(frSections)) {
      for (const key of Object.keys(strings)) {
        if (enSections[section]?.[key] === undefined) {
          orphaned.push(`${section}.${key}`);
        }
      }
    }
    expect(orphaned).toEqual([]);
  });

  test("a French string is actually different from the English one", () => {
    // The cheap way to fake a translation is to copy the English across, and
    // it passes every check above. This cannot demand a difference — "Date",
    // "Instagram" and "Celsius (°C)" are the same word in both — so it asserts
    // the SHAPE instead: a section that is entirely identical has not been
    // translated, it has been duplicated.
    const suspicious: string[] = [];
    for (const [section, strings] of Object.entries(enSections)) {
      const keys = Object.keys(strings);
      if (keys.length < 5) continue;
      const differing = keys.filter(
        (key) => frSections[section]?.[key] !== strings[key],
      );
      if (differing.length === 0) suspicious.push(section);
    }
    expect(suspicious).toEqual([]);
  });
});
