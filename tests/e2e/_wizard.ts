import type { Locator } from "@playwright/test";

// ============================================================================
// The booking form's care steps, answered the way a person with nothing to
// add answers them (2026-10-01).
//
// The facility decides per service whether Feeding and Medications are off,
// optional or required (Settings › Services › Feeding & medications), and the
// page ships with boarding's Medications step REQUIRED: Next waits until each
// pet has a medication or "{pet} takes no medication" is ticked. A spec that
// walks a boarding booking past that step, and is not about it, calls this
// before it presses Next.
//
// Nothing here is done unless the step is on screen and asks: an optional
// step has no pill, and a pet that already has a medication is answered.
// ============================================================================

async function tickNone(dialog: Locator): Promise<void> {
  const pill = dialog
    .locator("label")
    .filter({ hasText: / takes no medication$/ })
    .first();
  if ((await pill.count()) === 0) return;
  const input = pill.locator("input[type=checkbox]");
  if (!(await input.isChecked())) await pill.click();
}

/** On a required Medications step, ticks "takes no medication" for every pet with none. */
export async function answerCareSteps(dialog: Locator): Promise<void> {
  const heading = dialog.getByRole("heading", {
    name: "Medications",
    exact: true,
  });
  if (!(await heading.isVisible().catch(() => false))) return;
  const tabs = dialog
    .getByRole("radiogroup", { name: "Pets" })
    .locator("label");
  const count = await tabs.count();
  if (count <= 1) {
    await tickNone(dialog);
    return;
  }
  for (let i = 0; i < count; i += 1) {
    await tabs.nth(i).click();
    await tickNone(dialog);
  }
}
