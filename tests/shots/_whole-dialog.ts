import type { Page } from "@playwright/test";

// ============================================================================
// THE WHOLE STEP IN ONE PICTURE (2026-10-03).
//
// The booking form is a dialog of at most 900px whose body scrolls, so a
// screenshot shows one window of a long step — the Feeding plan is four of
// them. To set a step beside the client's mock, which is one long page, this
// lets the dialog out to its content's height in a tall viewport, photographs
// the dialog, and puts everything back. For comparison shots only: nothing a
// person sees looks like this.
// ============================================================================

export async function shootWholeDialog(page: Page, path: string) {
  const before = page.viewportSize();
  const style = await page.addStyleTag({
    content: `
      [role="dialog"] {
        max-height: none !important;
        height: auto !important;
        top: 0 !important;
        translate: -50% 0 !important;
      }
      [data-wizard-body] {
        overflow: visible !important;
        flex: none !important;
        max-height: none !important;
      }
    `,
  });
  try {
    await page.setViewportSize({ width: before?.width ?? 1440, height: 6000 });
    await page.waitForTimeout(600);
    await page.getByRole("dialog").screenshot({ path });
  } finally {
    await style.evaluate((element) => element.parentNode?.removeChild(element));
    if (before) await page.setViewportSize(before);
    await page.waitForTimeout(300);
  }
}
