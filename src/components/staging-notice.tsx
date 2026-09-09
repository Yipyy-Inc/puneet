"use client";

import { useShellText } from "@/lib/shell/use-shell-text";

/**
 * The words on the staging bar.
 *
 * Split out of `StagingBanner` so the sentence can be read in the viewer's
 * language: the decision to show the bar is server-only (`YIPYY_DEPLOYMENT` is
 * not a NEXT_PUBLIC_ variable), but the reader's locale is client-only.
 *
 * It matters more than an English string usually would. This bar is the one
 * thing on screen saying that a click here writes to the PRODUCTION database —
 * ADR 0007 — and the client reviewing the redesign on staging.yipyy.com reads
 * French.
 */
export function StagingNotice() {
  const t = useShellText("banners");
  return (
    <div
      // `print:hidden`: on paper this is neither true nor useful, and §5u drops
      // every colour but the mark anyway.
      className="pointer-events-none fixed inset-x-0 top-0 z-9999 flex justify-center print:hidden"
      // Announced once, not on every navigation. A live region here would read
      // the whole sentence out again each time the route changes, which is the
      // fastest way to make somebody turn the screen reader off.
      role="note"
      aria-label={t("stagingLabel")}
    >
      <p className="rounded-b-md bg-[#8A5115] px-3 py-1 text-[11px] leading-none font-bold tracking-[0.06em] text-white uppercase">
        {t("stagingNotice")}
      </p>
    </div>
  );
}
