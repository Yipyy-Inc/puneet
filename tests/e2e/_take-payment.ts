import { expect, type Locator, type Page } from "@playwright/test";

// ============================================================================
// The Take payment dialog (the client's mock, 2026-10-03), as a spec drives
// it — from the booking page and from the dashboard board's Check Out alike.
// ============================================================================

/** The open dialog. */
export const takePaymentDialog = (page: Page) =>
  page.locator("[data-slot=take-payment]");

/**
 * Its form, once the reads that decide the figures — the client's credit,
 * cards and readers, the bill's lines — have answered. Until then the dialog
 * shows `LoadingView`, so a count taken earlier counts nothing.
 */
export async function formReady(dialog: Locator) {
  await expect(dialog.getByText(/^total to collect$/i)).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Account credit off for this one payment, as staff may always turn it.
 *
 * The dialog applies a client's credit by default (`checkout_config`
 * "auto"), and the demo clients carry credit that other specs leave behind:
 * on 2026-10-03 Alice held $74.00 from the production copy, which paid a
 * $64.00 booking whole and left the spec looking for a Cash card that a
 * $0.00 total does not offer. A test about a METHOD turns the credit off.
 */
export async function creditOff(dialog: Locator) {
  await formReady(dialog);
  const use = dialog.getByRole("switch", { name: /use account credit/i });
  if ((await use.count()) > 0 && (await use.isChecked())) {
    await use.click();
    await expect(use).not.toBeChecked();
  }
  // A facility that asks the client first offers the same answer as a choice.
  const later = dialog.getByRole("button", { name: /^save it for later$/i });
  if ((await later.count()) > 0) await later.click();
}

/** A method card ("Cash", "E-transfer"…). Its radio is visually hidden. */
export const methodCard = (dialog: Locator, name: RegExp) =>
  dialog.locator("label").filter({ hasText: name }).first();
