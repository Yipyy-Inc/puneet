import { expect, type Locator } from "@playwright/test";

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

/**
 * Picks a Room type card and waits for it to hold. The room types are the
 * facility's boarding services (the client's flow, 2026-10-01); the card is
 * the pressed button, not a summary elsewhere that names it.
 */
export async function pickRoomType(
  dialog: Locator,
  name: string,
): Promise<void> {
  const card = dialog
    .locator("button[aria-pressed]")
    .filter({ hasText: name })
    .first();
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
}

/**
 * Next until Confirm's create button is on screen — "Create booking", or
 * "Create as pending" when the client has agreements to sign.
 */
export async function toConfirm(dialog: Locator): Promise<void> {
  const create = dialog.getByRole("button", {
    name: /^create (booking|as pending)$/i,
  });
  for (let i = 0; i < 10 && !(await create.isVisible()); i += 1) {
    await answerCareSteps(dialog);
    await dialog.getByRole("button", { name: /^next$/i }).click();
  }
  await create.waitFor();
}

/**
 * Staff booking a pet the service's evaluation rule stops are asked on
 * Confirm whether it is evaluated on its first day (the client's flow,
 * 2026-10-01) — ON until they say otherwise. This says no, with the reason
 * the booking keeps. Nothing happens when the question is not asked.
 */
export async function skipEvaluation(
  dialog: Locator,
  reason: string,
): Promise<void> {
  const ask = dialog.getByRole("switch", { name: /^evaluation$/i });
  if (!(await ask.isVisible().catch(() => false))) return;
  if ((await ask.getAttribute("aria-checked")) === "true") await ask.click();
  await dialog.getByLabel(/^why not evaluate$/i).fill(reason);
}

/**
 * Closes the screen the wizard shows once a booking is made.
 *
 * Since 2026-10-01 (the client's flow) "Create booking" no longer closes the
 * form: it stays open on "Booking #N created" with "Start another booking".
 * A spec that went on to expect the dialog gone calls this first — Escape,
 * as on any dialog, which is how the desktop screen closes too.
 */
export async function closeDoneScreen(dialog: Locator): Promise<void> {
  await dialog
    .getByRole("button", { name: /^start another booking$/i })
    .waitFor({ timeout: 120_000 });
  await dialog.page().keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

/**
 * The form has not slid out of its own window.
 *
 * Every pill (`ChoicePill`, `Segmented`) is a label around a visually hidden
 * radio or checkbox. Until 2026-10-02 nothing positioned that label, so the
 * hidden input was placed against the dialog's frame and stayed where the
 * step had first laid it out while the step scrolled under it. Clicking a pill
 * further down the Feeding or Medications step focused an input hundreds of
 * pixels below the window, and the browser scrolled the frame (overflow
 * hidden, but scrollable by focus) to show it: the whole form rose out of
 * view and the window went white. The client reported it twice. Text
 * assertions cannot see it, because the text is all still there.
 *
 * Call it straight after clicking a pill on a long step.
 */
export async function expectFrameSteady(dialog: Locator): Promise<void> {
  await expect(dialog.locator("header h2").first()).toBeInViewport();
  const frame = await dialog.evaluate((element) => {
    const astray: string[] = [];
    for (const input of element.querySelectorAll<HTMLInputElement>(
      "label > input.sr-only",
    )) {
      const label = input.parentElement!.getBoundingClientRect();
      const box = input.getBoundingClientRect();
      if (label.width === 0 && label.height === 0) continue;
      const inside =
        box.top >= label.top - 2 &&
        box.bottom <= label.bottom + 2 &&
        box.left >= label.left - 2 &&
        box.right <= label.right + 2;
      if (!inside) {
        astray.push(
          (input.parentElement!.textContent ?? "").trim().slice(0, 40),
        );
      }
    }
    return { scrolled: element.scrollTop + element.scrollLeft, astray };
  });
  expect(frame.scrolled, "the dialog's frame itself never scrolls").toBe(0);
  expect(frame.astray, "each pill's input sits inside its pill").toEqual([]);
}
