"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// A settings section that failed to load.
//
// §5d2's state ladder, "Failed to load": pose `error`, the error ink #B23B3B,
// and the sentence the system writes for it. Same rung as src/app/error.tsx —
// the copy is narrowed to what actually failed, because this boundary catches
// ONE section rather than the whole app.
//
// ── WHY `surface="card"` AND NOT THE FULL VIEW ───────────────────────────
//
// The root error owns the viewport: nothing else is on the page. This one does
// not. `settings/layout.tsx` still renders — the rail, the page header naming
// the section, "← All settings" — and only the section body is replaced. That
// is exactly the case §5d2 draws as "In place — a whole view that failed", and
// exactly what `surface="card"` was built for and had no caller for until now.
//
// It also keeps §5b2's one-h1 rule: the shell's PageHeader owns the h1, so the
// carded state renders an h2 and a <section> rather than a second h1 inside a
// second <main>.
// ============================================================================
export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const label = useSettingsText();

  return (
    <RouteState
      surface="card"
      pose="error"
      icon={CircleAlert}
      inkClassName="text-destructive"
      title={label.text("errorTitle")}
      description={label.text("errorBody")}
      action={{
        label: label.text("errorAction"),
        icon: RefreshCw,
        onClick: reset,
      }}
      className="min-h-0 p-0"
    />
  );
}
