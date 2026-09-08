"use client";

import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { useUiText } from "@/hooks/use-ui-text";

// ============================================================================
// THE ONE SAVE MODEL — a sticky bar over a derived draft.
//
// Promoted out of `components/loyalty/config/` where it had served eight
// loyalty pages. The settings restructure names it as the single save model
// for all fifty sections, which is why it moved: a component that fifty
// screens depend on cannot live inside one feature's folder.
//
// ── THREE DEFECTS WERE FIXED ON THE WAY, NOT CARRIED OVER ────────────────
//
// This is the whole reason the promotion was worth doing carefully. The bar
// answered §5s's Loading cell by hand and got it wrong in the same three ways
// `SettingsBlock` did:
//
//   1. `{saving ? "Saving…" : saveLabel}` — the matrix names that under
//      Never: "it shifts layout and throws away the verb".
//   2. `disabled={saving}` made it RENDER disabled while merely loading.
//      Button scopes its disabled fill and ink to `:not([data-loading])`
//      precisely so a loading button is unclickable without looking dead.
//   3. Every string was a bare English literal — no translation layer at all,
//      on a control that would have appeared on all fifty settings screens.
//
// Promoting it unfixed would have taken those from eight screens to fifty.
//
// ── AND THE LAYER COMES FROM A TOKEN ─────────────────────────────────────
//
// `z-10` became `z-[var(--z-sticky)]`. §1: "z-index comes from tokens in
// hundreds — no component writes its own." The arbitrary-value syntax is
// needed because `--z-*` is not one of Tailwind v4's utility namespaces, so
// `z-sticky` does not exist; the token is still the single source.
//
// ── WHAT THE CALLER STILL OWNS ───────────────────────────────────────────
//
// The draft, and persistence. Drafts are DERIVED, never seeded into useState
// — `check:settings-seeding` enforces that after three screens overwrote a
// facility's real settings with defaults captured before the query resolved.
// ============================================================================

interface SaveBarProps {
  dirty: boolean;
  /**
   * May be async. It writes to Postgres, and the bar stays disabled until
   * that lands — otherwise a second click queues a second write of the same
   * draft.
   */
  onSave: () => void | Promise<void>;
  onReset: () => void;
  /** Overrides the default verb. Pass a TRANSLATED string. */
  saveLabel?: string;
  /** True while the write is in flight. */
  saving?: boolean;
}

export function SaveBar({
  dirty,
  onSave,
  onReset,
  saveLabel,
  saving = false,
}: SaveBarProps) {
  const { t } = useUiText();

  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-[var(--z-sticky)] -mx-6 flex items-center justify-end gap-2 border-t px-6 py-3 backdrop-blur-sm">
      {dirty && (
        <span className="text-muted-foreground mr-auto text-sm">
          {t("You have unsaved changes")}
        </span>
      )}
      <Button variant="ghost" onClick={onReset} disabled={!dirty || saving}>
        <RotateCcw className="mr-2 size-4" />
        {t("Discard")}
      </Button>
      {/* `loading`, not a label swap: the verb stays put and the spinner takes
          the leading glyph's slot, so the button does not move by a pixel. */}
      <Button onClick={() => void onSave()} loading={saving} disabled={!dirty}>
        <Save className="mr-2 size-4" />
        {saveLabel ?? t("Save changes")}
      </Button>
    </div>
  );
}
