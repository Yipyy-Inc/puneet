# Yipyy Customer Portal — Gift Cards & Rewards — Code-Grounded Copy-Paste Prompts

Every task from the _Gift Cards & Rewards UI/UX Workflow Spec_ (Section 5, Tasks 1–53), rewritten to point at the **actual files and components** in this repo (`puneet` / Yipyy, Next.js 16 + shadcn + bun) and to state the **current implementation status** for each.

**Why this version is different from a plain spec-to-prompts list:** an audit of the live code (July 2026) found that **all 53 tasks are already implemented** — the flow files even carry `// Task NN` comments. So every prompt below is written to be **idempotent and verify-first**: it names the real file, describes the target behaviour, and tells the agent to _confirm it matches and only change it if it's missing or has regressed_ — never to re-add or rewrite working code. That makes this pack safe to paste against the current repo (mostly no-ops that confirm behaviour) **and** re-runnable on a clean branch (where each prompt implements the feature).

Pages touched: `/customer/gift-cards`, `/customer/billing`, `/customer/rewards`, `/customer/wallet`, plus the customer sidebar.

---

## How to use

- **Paste one prompt at a time** into Claude Code. Let it plan → verify/implement → run the green sequence before moving on.
- Each prompt is self-contained: it names the file(s), the target state, and the current status.
- **On the current repo:** most prompts should come back "already implemented, verified" with no diff. Treat any prompt that _does_ produce a diff as a regression the agent caught.
- **On a clean branch / handing to another dev:** run them in the "Build order" below; each one implements its feature.

**Build order (dependency-aware):** Sidebar (1–2) → Gift Cards page + tabs (3–5) → Send-flow Steps 1–4 (6–24) → Cards I Sent (25–29) → Cards I Received (30–35) → Billing (36–41) → Rewards (42–53) → Part E polish.

## Standing rules (restated so each prompt is portable)

> **Stack:** Next.js 16 App Router (RSC), React 19, TypeScript 5.9 strict, Tailwind CSS 4, shadcn/ui (New York), next-intl, TanStack Query + TanStack Form, **bun** (never npm/yarn/pnpm).
> **Architecture:** `page.tsx`/`layout.tsx` are Server Components — extract interactivity into small `"use client"` children. New code reads data via the TanStack Query factories in `src/lib/api/<domain>.ts`, not by importing `src/data/*` directly. Keep components under ~500 lines; use `next/dynamic` for modals/heavy pieces. No new `any` / `@ts-ignore`.
> **Discipline:** Inventory and reuse what exists — never recreate. Touch only the file the task is about. Don't weaken a lint rule or gate to pass.
> **Green sequence (run before "done"):** `bun run typecheck && bun run lint && bun run format:check`; add `bun run build` for structural changes; for UI, run `bun run dev` and look at the touched journey.

## Status legend

- ✅ **Implemented** — present and correct in the current repo; prompt is verify-only.
- ⚠️ **Implemented, polish suggested** — works, but has a minor gap flagged in Part E.
- ❌ **Missing** — not found (none of the 53 are in this state as of the audit).

## Audit summary

**53 / 53 implemented.** Six minor polish items were found (all in **Part E**): the send-flow `resetFlow()` blanks the pre-filled "From" name (Task 14 continuity); the received-cards empty state has a trailing-comma typo (Task 35); the rewards hero repeats tier progress in a redundant third block (Task 42 clarity); the bottom "Rewards" tab's empty-state copy doesn't match the spec wording (Task 46/§4.6); "Apply to my wallet" writes to loyalty **credit**, not the customer **wallet** (Task 44 semantics — confirm intent); and the invoices tab's per-invoice PDF download should be confirmed (§3.4 note).

---

# SECTION 1 — Sidebar (Tasks 1–2)

### Task 1 (HIGH / FIX) — Merge "Gift Cards" + "My Gift Cards" into one sidebar item

**File:** `src/components/customer/CustomerSidebar.tsx`
**Status:** ✅ Implemented — the "Account" section has a single `Gift Cards` item (`url: "/customer/gift-cards"`, `Gift` icon); no "My Gift Cards" entry. `Billing & Payments`, `My Wallet`, `Loyalty & Rewards` are separate items.

```
In src/components/customer/CustomerSidebar.tsx, the customer "Account" menu section must contain a single "Gift Cards" item pointing at /customer/gift-cards (not two separate "Gift Cards" and "My Gift Cards" entries), while keeping "Billing & Payments", "My Wallet", and "Loyalty & Rewards" as their own items with unchanged names. Verify the menuSections array matches this; if a "My Gift Cards" item still exists, remove it and point the single "Gift Cards" item at /customer/gift-cards. Make no other change. Then run bun run typecheck && bun run lint.
```

### Task 2 (HIGH / FIX) — Single "Gift Cards" item navigates to the tabbed page

**Files:** `src/components/customer/CustomerSidebar.tsx`, `src/app/customer/gift-cards/page.tsx`
**Status:** ✅ Implemented — sidebar item → `/customer/gift-cards`, which renders the 3-tab page. The legacy `/customer/gift-cards/my-cards` route is a `redirect("/customer/gift-cards")`.

```
Verify the sidebar "Gift Cards" item routes to /customer/gift-cards and lands on the 3-tab page (Send a gift card / Cards I sent / Cards I received), and that no separate /my-cards destination is reachable from the sidebar. Confirm src/app/customer/gift-cards/my-cards/page.tsx still redirects to /customer/gift-cards. Report the routing; change nothing unless a dead /my-cards link is still wired into the sidebar.
```

---

# SECTION 2 — Gift Cards page & tabs (Tasks 3–5)

### Task 3 (CRITICAL / ADD) — 3-tab bar on the Gift Cards page

**Files:** `src/app/customer/gift-cards/_components/GiftCardsTabs.tsx`, `src/app/customer/gift-cards/page.tsx`
**Status:** ✅ Implemented — `GiftCardsTabs` renders a shadcn `Tabs` with `send` / `sent` / `received`; the page keeps the "Gift Cards" title + subtitle and mounts `GiftCardsTabs`.

```
In src/app/customer/gift-cards/_components/GiftCardsTabs.tsx, confirm there's a 3-tab bar — "Send a gift card" / "Cards I sent" / "Cards I received" — where the Send tab hosts BuyGiftCardFlow and the other two host SentGiftCardsList / ReceivedGiftCardsList. Confirm src/app/customer/gift-cards/page.tsx keeps the page title "Gift Cards" and its subtitle. Verify only; if the tab bar is missing, build it with the shadcn Tabs primitive as described. Then run bun run typecheck && bun run lint.
```

### Task 4 (HIGH / RULE) — Default active tab = "Send a gift card"

**Files:** `src/app/customer/gift-cards/page.tsx`, `src/app/customer/gift-cards/_components/GiftCardsTabs.tsx`
**Status:** ✅ Implemented — `page.tsx` sets `initialTab = tab === "received" ? "received" : "send"`; `GiftCardsTabs` defaults `initialTab = "send"`.

```
Verify that navigating to /customer/gift-cards from the sidebar opens the "Send a gift card" tab by default. In src/app/customer/gift-cards/page.tsx the initial tab is derived from the ?tab search param and defaults to "send"; GiftCardsTabs defaults its useState to that. Confirm this holds; change nothing unless the default is not "send".
```

### Task 5 (MEDIUM / ADD) — Email "check balance" link opens "Cards I received"

**File:** `src/app/customer/gift-cards/page.tsx` (+ wherever gift-card emails are templated, if present)
**Status:** ✅ Implemented — `page.tsx` reads `searchParams.tab`; `?tab=received` lands on Tab 3. Normal navigation still defaults to Send (Task 4).

```
In src/app/customer/gift-cards/page.tsx, confirm that arriving with ?tab=received opens the "Cards I received" tab (and that any other/absent value opens "Send"). This is the deep-link target for the "Check your balance" link in gift-card emails. Verify the param handling; then check whether any gift-card email template in the repo links to /customer/gift-cards — if so, ensure that "Check your balance" link includes ?tab=received. If no email templates exist yet (mock backend), just confirm the page-side handling and note that the link must carry ?tab=received when emails are built.
```

---

# SECTION 2 — Send-a-Gift-Card flow · Step 1 Amount (Tasks 6–10)

_All of Steps 1–4 live in one file: `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx` (a `"use client"` wizard using `useState`; amount presets come from `giftCardSettings` in `src/data/gift-cards.ts`). Build/verify these in one sitting since they share wizard state._

### Task 6 (LOW / ADD) — "$75" preset (6 tiles: $25/$50/$75/$100/$150/$200)

**Files:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`, `src/data/gift-cards.ts`
**Status:** ✅ Implemented — `presets = settings?.presetAmounts ?? [25,50,75,100,150,200]`, and facility 11's `giftCardSettings.presetAmounts` is exactly `[25,50,75,100,150,200]`.

```
In src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx, the Step 1 amount presets should be $25/$50/$75/$100/$150/$200 (six tiles, including $75). Presets are read from giftCardSettings.presetAmounts in src/data/gift-cards.ts with a fallback array. Verify both the fallback and facility 11's presetAmounts include 75 and render six even tiles. Change nothing unless $75 is missing from either the fallback or the facility config.
```

### Task 7 (HIGH / FIX) — Default: no tile selected, preview shows "Choose an amount"

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `amount` starts `""`; `resolvedAmount` is 0 until a choice; the preview shows `"Choose an amount"` when `resolvedAmount <= 0` (never "$0.00").

```
In BuyGiftCardFlow.tsx Step 1, on load no preset tile is selected and the live preview card shows "Choose an amount" in place of the dollar figure — never "$0.00". As soon as a preset is clicked or a custom amount typed, the preview shows the real value. This is driven by the `amount`/`customAmount` state and the `resolvedAmount > 0` conditional in the preview block. Verify it; if it renders "$0.00" on load or preselects a tile, fix to the described default. Then run bun run typecheck && bun run lint.
```

### Task 8 (HIGH / FIX) — Live preview updates as amount changes

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — preview binds to `resolvedAmount` (derived from `amount` or parsed `customAmount`).

```
In BuyGiftCardFlow.tsx Step 1, confirm the live preview card updates in real time as the customer selects a preset or types a custom amount (bound to `resolvedAmount`). Verify only; no change unless the preview is static.
```

### Task 9 (HIGH / FIX) — Presets and custom input are mutually exclusive

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — clicking a preset sets `amount` and clears `customAmount`; typing in custom sets `customAmount` and clears `amount`.

```
In BuyGiftCardFlow.tsx Step 1, the preset tiles and the custom-amount input must be mutually exclusive: clicking a preset clears the custom input; typing a custom amount deselects all presets. Verify both onClick/onChange handlers do this; fix only if both can appear active at once.
```

### Task 10 (HIGH / RULE) — Validate $10–$500, disable Continue

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `amountError` = "Amount must be between $10 and $500." for out-of-range custom input; `canProceed` requires `resolvedAmount >= 10 && <= 500`; Continue is disabled on Step 1 until valid.

```
In BuyGiftCardFlow.tsx Step 1, enforce min $10 / max $500: show the inline error "Amount must be between $10 and $500." below the input when out of range, and keep Continue disabled until a valid amount is chosen (see `amountError` and `canProceed`). Verify both the message text and the disabled logic; fix only on divergence.
```

---

# SECTION 2 — Send-a-Gift-Card flow · Step 2 Design (Tasks 11–12)

### Task 11 (HIGH / ADD) — Add "New pet" + "Gotcha Day" designs (8 tiles)

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `CARD_DESIGNS` has 8 entries: Birthday, Holiday, Anniversary, Just Because, Thank You, Welcome, **New pet** (🐶, warm orange), **Gotcha Day** (🎉, emerald/teal). Each tile shows the Step-1 amount.

```
In BuyGiftCardFlow.tsx Step 2, the design grid must have exactly 8 tiles: the original 6 (Birthday, Holiday, Anniversary, Just Because, Thank You, Welcome) plus "New pet" (paw/pet icon, warm tone) and "Gotcha Day" (celebration icon, teal/green), each showing the selected amount. See the CARD_DESIGNS array. Verify the two petcare designs exist and the grid caps at 8; add them only if missing. (Emoji + gradient tiles are an accepted placeholder — the real illustrated art is a separate visual pass; don't block on it.)
```

### Task 12 (HIGH / FIX) — Store selected design in flow state; preview reflects it

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `selectedDesign` state drives the Step 1 live preview, the Step 4 review card, and the success card (gradient + emoji + label).

```
In BuyGiftCardFlow.tsx, the chosen design (color/gradient + icon) is held in `selectedDesign` and must be reflected by the Step 1 live preview (if the user navigates back), the Step 4 review card, and the success screen — not a static generic card. Verify `selectedDesign` feeds all three; fix only if any preview ignores it.
```

---

# SECTION 2 — Send-a-Gift-Card flow · Step 3 Recipient (Tasks 13–18)

### Task 13 (LOW / FIX) — Personal message limit 200 → 300

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `<Textarea maxLength={300}>` with counter `{message.length}/300`.

```
In BuyGiftCardFlow.tsx Step 3, the Personal Message field must allow up to 300 characters with a live "N/300" counter. Verify maxLength={300} and the counter text; fix only if it still says 200.
```

### Task 14 (MEDIUM / ADD) — Pre-populate "From" with the customer's first name

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ⚠️ Implemented (polish in **Part E1**) — `senderName` is initialised from `clients.find(id===15).name.split(" ")[0]` ("Alice"), editable. But `resetFlow()` sets it back to `""`, so after "Send another gift card" the field loads blank. See Part E1.

```
In BuyGiftCardFlow.tsx Step 3, the "From (Your Name)" field must pre-fill with the logged-in customer's first name (editable), never blank on load. Verify the initial `senderName` state does this. NOTE: also check `resetFlow()` — if it resets senderName to "" the field goes blank after "Send another gift card"; if so, apply the Part E1 fix so it re-derives the first name instead. Then run bun run typecheck && bun run lint.
```

### Task 15 (CRITICAL / FIX) — Schedule Delivery toggle reveals date + time pickers

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `handleScheduleToggle` reveals an animated (`animate-in`) `DatePicker` + time `Select`; toggling off clears the date and reverts to send-immediately.

```
In BuyGiftCardFlow.tsx Step 3, turning the Schedule Delivery switch ON must animate open a date picker + time selector directly below it; turning it OFF collapses them and clears the date (default = send immediately after purchase). See `scheduleDelivery`, `handleScheduleToggle`, and the DatePicker/Select block. Verify the reveal/collapse and the default; fix only if toggling On does nothing.
```

### Task 16 (HIGH / RULE) — Date bounds (tomorrow … +1 year) + confirmation line

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `minDeliveryDate` = tomorrow, `maxDeliveryDate` = +1 year (local-ISO to avoid TZ shift); `schedulePreview` renders "Will be delivered on [Weekday], [Month Date] at [Time]."

```
In BuyGiftCardFlow.tsx Step 3, the scheduled-delivery date picker must enforce min = tomorrow and max = 1 year out, and after a date+time is chosen show "Will be delivered on [Weekday], [Month Date] at [Time]." See minDeliveryDate/maxDeliveryDate (built from local Y/M/D, not toISOString) and schedulePreview. Verify the bounds and the formatted line; fix only on divergence.
```

### Task 17 (HIGH / RULE) — Require Recipient Name + Email on Continue

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — `handleContinue` blocks Step 3→4 when name empty or email invalid, sets `attemptedStep3`, and shows inline "required" errors beneath the empty fields.

```
In BuyGiftCardFlow.tsx Step 3, Recipient Name and Recipient Email are required: clicking Continue with either empty shows an inline error under that field and blocks progression to Step 4 (see handleContinue + attemptedStep3). Verify; fix only if progression isn't blocked.
```

### Task 18 (MEDIUM / RULE) — Validate email format on blur

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — the email `onBlur` sets `emailError` = "Please enter a valid email address." when the format fails `isValidEmail`.

```
In BuyGiftCardFlow.tsx Step 3, the Recipient Email must validate format on blur and show "Please enter a valid email address." when invalid (see the input's onBlur + isValidEmail + emailError). Verify the message and trigger; fix only on divergence.
```

---

# SECTION 2 — Send-a-Gift-Card flow · Step 4 Review & Pay (Tasks 19–24)

### Task 19 (CRITICAL / FIX) — Step 4 card preview renders real data

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — the review card renders the real `selectedDesign` (gradient+emoji+label), `resolvedAmount`, "For {recipientName}", and `messagePreview` (first line, truncated ~40 chars). No placeholder/garbled text.

```
In BuyGiftCardFlow.tsx Step 4, the review card preview must show real data: the design chosen in Step 2 (correct gradient + icon), the Step-1 amount, "For {recipient name}", and the first line of the personal message truncated to ~40 chars. See the Step 4 preview block + messagePreview. Verify all four are pulled from flow state (no lorem/placeholder); fix only if any is hardcoded or garbled.
```

### Task 20 (MEDIUM / FIX) — "Use different card" secondary button (not a tiny "Change" link)

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — a clearly-styled "Use different card" button toggles `showCardSelector`, revealing an inline card picker over `SAVED_CARDS`.

```
In BuyGiftCardFlow.tsx Step 4, the payment section must offer a clearly-styled "Use different card" button (not a small "Change" link) that opens a card selector (inline expansion over the saved cards). See showCardSelector. Verify the button + selector exist; fix only if it's still a tiny link.
```

### Task 21 (MEDIUM / ADD) — "A copy will also be sent to [email]" when Send-a-copy is checked

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — when `sendCopy` is true, Step 4 shows "A copy will also be sent to {purchaserEmail}" (alice@example.com for customer 15).

```
In BuyGiftCardFlow.tsx Step 4, if "Send me a copy" was checked in Step 3, show a line "A copy will also be sent to [customer's own email]." See sendCopy + purchaserEmail. Verify the line appears only when checked and uses the real purchaser email; fix only on divergence.
```

### Task 22 (HIGH / ADD) — Show delivery timing in the review summary

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — the summary "Delivery" row shows `schedulePreview` when scheduled, else "Immediately after purchase".

```
In BuyGiftCardFlow.tsx Step 4, the review summary must show delivery timing: the scheduled "[Day], [Month Date] at [Time]" when set, otherwise "Immediately after purchase" (see the Delivery row using schedulePreview). Verify both branches; fix only on divergence.
```

### Task 23 (HIGH / RULE) — Disable Purchase until a valid payment method

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — Purchase button `disabled={loading || !hasPaymentMethod}`; with no saved card it shows an add-a-card prompt linking to `/customer/billing`.

```
In BuyGiftCardFlow.tsx Step 4, the "Purchase $X.XX" button must be disabled until a valid payment method is confirmed on screen; with no saved card, show a prompt to add one before purchase (see hasPaymentMethod + the empty-state linking to /customer/billing). Verify; fix only if Purchase is clickable without a payment method.
```

### Task 24 (HIGH / ADD) — Success screen (no blank page) with two actions

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`
**Status:** ✅ Implemented — after purchase, `done` renders an in-container success screen: "Gift card sent to {recipientName}!", the correct design+amount card, where it was sent, and two buttons — "Send another gift card" (`resetFlow`) and "View cards I sent" (`onViewSent` → Tab 2).

```
In BuyGiftCardFlow.tsx, a successful purchase must show an in-container success screen (never a blank page) with: "Gift card sent to [Recipient Name]!", the card preview with the correct design + amount, a line showing where it was sent, and two buttons — "Send another gift card" (resets to Step 1) and "View cards I sent" (switches the parent to Tab 2 via onViewSent). See the `done` branch. Verify all elements and both actions; fix only on divergence.
```

---

# SECTION 2 — Cards I Sent · Tab 2 (Tasks 25–29)

_File: `src/app/customer/gift-cards/_components/SentGiftCardsList.tsx` (+ shared helpers in `gift-card-list-shared.tsx`). Data: `giftCards` in `src/data/gift-cards.ts` filtered by `purchasedByClientId === customerId`._

### Task 25 (CRITICAL / FIX) — Move "Cards I Sent" into Tab 2 (retire /my-cards)

**Files:** `src/app/customer/gift-cards/_components/GiftCardsTabs.tsx`, `SentGiftCardsList.tsx`, `src/app/customer/gift-cards/my-cards/page.tsx`
**Status:** ✅ Implemented — `SentGiftCardsList` renders inside the "sent" tab; keeps recipient name, send date, status badge (Active/Redeemed/Expired), original amount, remaining balance. `/my-cards` redirects to `/customer/gift-cards`.

```
Confirm the "Cards I sent" view lives in Tab 2 of /customer/gift-cards (GiftCardsTabs → SentGiftCardsList), showing recipient name, send date, status badge (Active/Redeemed/Expired), original amount, and remaining balance — and that the old /customer/gift-cards/my-cards route redirects to /customer/gift-cards. Verify the tab wiring and the redirect; change nothing unless the list still lives on a separate page.
```

### Task 26 (MEDIUM / ADD) — Search by recipient name

**File:** `src/app/customer/gift-cards/_components/SentGiftCardsList.tsx`
**Status:** ✅ Implemented — search `Input` filters `visible` by recipient name/email in real time (placeholder "Search by recipient name").

```
In SentGiftCardsList.tsx, confirm a search bar above the list filters by recipient name in real time (see `query` + the `visible` useMemo). Verify; fix only if search is missing.
```

### Task 27 (LOW / ADD) — Sort dropdown

**File:** `src/app/customer/gift-cards/_components/SentGiftCardsList.tsx`
**Status:** ✅ Implemented — `SORT_OPTIONS`: Newest first (default) / Oldest first / Highest amount / Lowest amount.

```
In SentGiftCardsList.tsx, confirm a sort dropdown with Newest first (default) / Oldest first / Highest amount / Lowest amount (see SORT_OPTIONS + the sort in `visible`). Verify; fix only if missing or defaulting to something other than Newest.
```

### Task 28 (HIGH / FIX) — "…" actions menu (Resend / View details / Check balance)

**File:** `src/app/customer/gift-cards/_components/SentGiftCardsList.tsx`
**Status:** ✅ Implemented — a `DropdownMenu` per card: Resend email, View details (dialog with full transaction history), Check balance (inline). Physical cards grey out Resend with tooltip "Physical cards cannot be resent by email."

```
In SentGiftCardsList.tsx, each card's actions must be a "…" menu (not a lone Resend button) with: Resend email, View details (opens a dialog showing full transaction history), and Check balance (reveals current remaining balance inline). Resend must be disabled/greyed for physical cards with tooltip "Physical cards cannot be resent by email." See the DropdownMenu + detailCard dialog + isPhysical branch. Verify all three actions and the physical-card rule; fix only on divergence.
```

### Task 29 (MEDIUM / ADD) — Empty state → "Send your first gift card"

**File:** `src/app/customer/gift-cards/_components/SentGiftCardsList.tsx`
**Status:** ✅ Implemented — when nothing sent, `EmptyState` shows the Send icon, "You haven't sent any gift cards yet." and a "Send your first gift card" button that calls `onSendFirst` → Tab 1.

```
In SentGiftCardsList.tsx, when no cards have ever been sent, show an empty state (icon + "You haven't sent any gift cards yet.") with a "Send your first gift card" button that switches to Tab 1 (onSendFirst). Verify; fix only if missing.
```

---

# SECTION 2 — Cards I Received · Tab 3 (Tasks 30–35)

_File: `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`. Data: `giftCards` where `recipientEmail === customer email` (alice@example.com); wallet from `customerWallets`._

### Task 30 (CRITICAL / FIX) — Move "Cards I Received" into Tab 3

**Files:** `src/app/customer/gift-cards/_components/GiftCardsTabs.tsx`, `ReceivedGiftCardsList.tsx`
**Status:** ✅ Implemented — `ReceivedGiftCardsList` renders in the "received" tab; shows sender name, received date, expiry status, and full amount.

```
Confirm the "Cards I received" view lives in Tab 3 of /customer/gift-cards (GiftCardsTabs → ReceivedGiftCardsList), showing sender name, received date, expiry status, and full card amount, with the old /my-cards route fully retired. Verify; change nothing unless it still lives on a separate page.
```

### Task 31 (HIGH / FIX) — Rename "Load" → "Load to my wallet"

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`
**Status:** ✅ Implemented — the per-card button reads "Load to my wallet" and opens the confirmation modal.

```
In ReceivedGiftCardsList.tsx, the per-card action button must read "Load to my wallet" (not the ambiguous "Load") and open the load confirmation modal. Verify the label and that it opens the modal (openLoad); fix only if it still says "Load".
```

### Task 32 (HIGH / ADD) — Explain what loading to wallet means

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`
**Status:** ✅ Implemented — a `Tooltip` on the button shows `WALLET_EXPLAINER`: "Loading to your wallet lets you pay for services at checkout automatically — no need to enter a code."

```
In ReceivedGiftCardsList.tsx, confirm the "Load to my wallet" button carries the explanation (tooltip or sub-line): "Loading to your wallet lets you pay for services at checkout automatically — no need to enter a code." (see WALLET_EXPLAINER). Verify; fix only if the explanation is missing.
```

### Task 33 (HIGH / ADD) — Inline "Check balance" per card

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`
**Status:** ✅ Implemented — a "Check balance" toggle reveals "Current balance: $X.XX" inline beneath the card (no navigation), via `checkedIds`.

```
In ReceivedGiftCardsList.tsx, confirm each card has a "Check balance" action that reveals "Current balance: $X.XX" inline beneath the row without navigating away (see checkedIds/toggleChecked). Verify; fix only if missing.
```

### Task 34 (CRITICAL / FIX) — Load-to-wallet confirmation modal (full/partial + before/after)

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`
**Status:** ✅ Implemented — the modal shows card details, a full/partial RadioGroup (partial has a max-capped number input), and a "Your wallet: $Y → $Y+load" before/after line; Confirm loads the amount, decrements the card balance, and toasts success.

```
In ReceivedGiftCardsList.tsx, tapping "Load to my wallet" must open a small confirmation modal (not a full page) with: card details (sender + amount); a full-vs-partial choice where partial has a number input capped at the card balance; and a before/after wallet preview "Your wallet: $Y.YY → $Y.YY + load". Confirm loads the chosen amount to the wallet, decrements the card's remaining balance, and shows a success toast; Cancel closes. See the load modal + handleConfirm. Verify every element and the max-cap on partial; fix only on divergence.
```

### Task 35 (LOW / ADD) — Received empty state

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`
**Status:** ⚠️ Implemented (typo — **Part E2**) — empty state shows the Inbox icon, the message, and the share note. The message string is currently "No gift cards received yet**,**" (trailing comma) instead of the spec's "No gift cards received yet".

```
In ReceivedGiftCardsList.tsx, confirm the received empty state has an icon, the message "No gift cards received yet", and the note "Share the Gift Cards page with friends and family so they can send you one." NOTE: the current message string ends with a stray comma ("...received yet,"); fix it to a clean "No gift cards received yet" (see Part E2). Then run bun run typecheck && bun run lint.
```

---

# SECTION 3 — Billing & Payments (Tasks 36–41)

_Page: `src/app/customer/billing/page.tsx` (renders `BalanceSummaryCards` above the tabs, then Payment Methods / Invoices & Receipts / Balances). Components under `src/components/customer/billing/`._

### Task 36 (HIGH / FIX) — 3 balance cards above the tab bar (always visible)

**Files:** `src/app/customer/billing/page.tsx`, `src/components/customer/billing/BalanceSummaryCards.tsx`
**Status:** ✅ Implemented — `<BalanceSummaryCards />` (Store Credit / Gift Card Balance / Outstanding Balance) renders above `<Tabs>`, so it's visible on every tab.

```
In src/app/customer/billing/page.tsx, the three balance cards (Store Credit, Gift Card Balance, Outstanding Balance) must render ABOVE the tab bar so they're always visible regardless of the active tab, with the tabs controlling only the detail area below. This is BalanceSummaryCards mounted before <Tabs>. Verify placement; fix only if the cards are trapped inside the Balances tab.
```

### Task 37 (HIGH / FIX) — Outstanding Balance warning styling

**File:** `src/components/customer/billing/BalanceSummaryCards.tsx`
**Status:** ✅ Implemented — when `totalOutstanding > 0`: red border, red amount text, `AlertTriangle` icon, sub-line "From unpaid or overdue invoices."; at $0 it's neutral with "No outstanding balance."

```
In BalanceSummaryCards.tsx, the Outstanding Balance card must use a red/warning treatment when the amount > $0 (red border, red amount text, alert icon, sub-line "From unpaid or overdue invoices."), and a neutral style with "No outstanding balance." at $0. See hasOutstanding. Verify both states; fix only on divergence.
```

### Task 38 (MEDIUM / ADD) — Gift Card Balance card link

**File:** `src/components/customer/billing/BalanceSummaryCards.tsx`
**Status:** ✅ Implemented — link reads "Manage gift cards →" when balance > 0, "Send a gift card →" at $0, routing to `/customer/gift-cards`.

```
In BalanceSummaryCards.tsx, the Gift Card Balance card must contain a link to /customer/gift-cards labelled "Manage gift cards →" when balance > 0 and "Send a gift card →" when $0. Verify the conditional label + href; fix only on divergence.
```

### Task 39 (MEDIUM / ADD) — Store Credit card link

**File:** `src/components/customer/billing/BalanceSummaryCards.tsx`
**Status:** ✅ Implemented — "Manage wallet →" link to `/customer/wallet`.

```
In BalanceSummaryCards.tsx, the Store Credit card must contain a "Manage wallet →" link to /customer/wallet. Verify; fix only if missing.
```

### Task 40 (HIGH / ADD) — "Add payment method" button (top right)

**File:** `src/components/customer/billing/PaymentMethodsTab.tsx`
**Status:** ✅ Implemented — a prominent top-right "Add Payment Method" button opens a card-entry dialog (mock verify-and-save; swap for Stripe Elements when wiring the real processor).

```
In PaymentMethodsTab.tsx, confirm a prominent "Add payment method" button (top right of the tab, not buried) opens a secure card-entry form. The current form is a mock "Verify & Save" dialog — that's the "or equivalent" placeholder for Stripe Elements; leave it unless it's missing. Verify placement + that it opens the form; note (don't block) that real card entry should become Stripe Elements when the processor is wired.
```

### Task 41 (MEDIUM / ADD) — Per-card "…" menu (Set default / Remove) with default-removal confirm

**File:** `src/components/customer/billing/PaymentMethodsTab.tsx`
**Status:** ✅ Implemented — each saved card has a `DropdownMenu` (Set as default / Remove); removing the **default** card opens an `AlertDialog`: "Are you sure? You will need to add a new default card before making purchases."

```
In PaymentMethodsTab.tsx, each saved payment method must have a "…" menu with "Set as default" and "Remove", and removing the DEFAULT card must prompt "Are you sure? You will need to add a new default card before making purchases." before deleting. See the DropdownMenu + removeTarget AlertDialog. Verify both menu items and the default-removal confirmation; fix only on divergence.
```

> **§3.4 note (not a numbered task):** Invoices live in `BookingInvoicesTab.tsx` (rendered by the billing page's "Invoices & Receipts" tab), listing per-booking invoices with search + Paid/Pending/Overdue filters; each row is a `CustomerInvoiceCard`. Confirm each invoice exposes date, service description, amount, status, and a **per-invoice PDF/receipt download** — see **Part E6**.

---

# SECTION 4 — Loyalty & Rewards (Tasks 42–53)

_Page: `src/app/customer/rewards/page.tsx` (`"use client"`, ~1.5k lines). Reads the live loyalty account + facility config via `loyaltyQueries` (`src/lib/api/loyalty.ts`); points redemption in `RedeemPointsDialog.tsx`; history via `LoyaltyTransactionHistory`; reward wallet via `src/lib/loyalty/rewards-wallet.ts`; earn-rule copy via `src/lib/loyalty/earn-rule-summary.ts`._

### Task 42 (CRITICAL / FIX) — Progress bar shows progress to the NEXT tier

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ⚠️ Implemented (redundancy — **Part E3**) — the current tier badge is shown separately; the progress bar uses `nextTier.minPoints` and reads "X / [nextTier.minPoints] points" + "N% to [nextTier.name]", plus "X points away from [nextTier] Tier". No self-contradiction. There is, however, a third redundant "Summary Text (Example Format)" block restating the same thing — see Part E3.

```
In src/app/customer/rewards/page.tsx, the points-hero progress bar must show progress toward the NEXT tier (not the current one): the current tier badge is shown separately above the bar, and the bar reads "[points] / [nextTier.minPoints] points" with "N% to [nextTier.name]". Verify the bar computes against nextTier (loyaltyData.nextTier / progressPercentage) and that there is no "0% to [current tier]" contradiction. NOTE: there's a redundant third summary line repeating the same progress — apply Part E3 to remove it for clarity. Then run bun run typecheck && bun run lint.
```

### Task 43 (MEDIUM / ADD) — "100 pts = $1 / minimum redemption" context note

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — under "Redeem Points": "[redemptionRate] points = $1.00 in credit. Minimum redemption: [minimumRedemptionPoints] points." pulled from facility config (`facilityLoyaltyConfig.redemptionRate` / `settings.minimumRedemptionPoints`).

```
In rewards/page.tsx, confirm a small note below the "Redeem Points" button reads "[rate] points = $1.00 in credit. Minimum redemption: [X] points." with both values pulled from the facility loyalty config (redemptionRate + minimumRedemptionPoints), not hardcoded. Verify; fix only on divergence.
```

### Task 44 (HIGH / FIX) — Redeem Points modal (input + live preview + apply)

**Files:** `src/app/customer/rewards/page.tsx`, `src/components/customer/RedeemPointsDialog.tsx`
**Status:** ⚠️ Implemented (semantics — **Part E5**) — "Redeem Points" opens `RedeemPointsDialog` (not a new page): shows balance, a points input, a live `creditPreview`, and an "Apply to my wallet" button; on success it calls `redeemPointsForCredit`, invalidates `["loyalty"]`, toasts, and the hero updates. Note: it credits the **loyalty account credit**, not the customer **wallet** (`customerWallets`) — confirm this is the intended target (Part E5).

```
In rewards/page.tsx + RedeemPointsDialog.tsx, confirm "Redeem Points" opens a modal (not a new page) showing current balance + dollar value, a "How many points to redeem?" input, a live dollar-value preview, and an apply button; on success it deducts points, adds the dollar value, shows a success message, and updates the hero balance in real time (via queryClient.invalidateQueries(["loyalty"])). Verify this flow. NOTE: the credit currently lands in the loyalty account credit balance, while the spec says "add to the wallet" — see Part E5 to confirm/relabel/rewire. Change behaviour only per Part E5.
```

### Task 45 (HIGH / FIX) — Earn rules loaded dynamically (no hardcoding)

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — "How Points Are Earned" maps `earnRules` from `facilityLoyaltyConfig.earnRules` (falling back to `buildDefaultEarnRules`) through `activeCustomerEarnRules`; a facility without a birthday bonus simply won't list that row.

```
In rewards/page.tsx, the "How Points Are Earned" list must be built from the facility's loyalty config earn rules (facilityLoyaltyConfig.earnRules → activeCustomerEarnRules), not hardcoded — rules a facility hasn't enabled don't appear. Verify the mapping + the per-rule "Active" badge; fix only if any earn rule is hardcoded.
```

### Task 46 (HIGH / ADD) — "Your Rewards" cards + "Use reward" → code/QR modal

**Files:** `src/app/customer/rewards/page.tsx`, `src/lib/loyalty/rewards-wallet.ts`
**Status:** ⚠️ Implemented (copy mismatch — **Part E4**) — the top "Your Rewards" card renders `walletRewards` (name, applies-to, value chip, expiry) each with a "Use reward" button opening a modal that shows a QR + copyable reward code; encouraging empty state is intact. Separately, the bottom **"Rewards" tab** shows the points-catalog with its own empty state whose wording differs from the spec (§4.6) — see Part E4.

```
In rewards/page.tsx, confirm the "Your Rewards" section renders each available reward (from buildRewardsWallet/walletRewards) as a card with name, description/services, expiry, and a "Use reward" button that opens a modal showing the reward code + QR to present at the facility, keeping the encouraging empty state when there are none. Verify this. NOTE: the separate bottom "Rewards" tab uses different empty-state copy than the spec ("No rewards available at this time / Check back later" vs "No rewards available. Keep earning points to unlock rewards.") — apply Part E4 to reconcile the wording and clarify the two surfaces.
```

### Task 47 (HIGH / FIX) — Tier benefits: active = green check, locked = grey + lock

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — current-tier benefits use a green `CheckCircle2`; next-tier (locked) benefits use muted text + `Lock` icons in a dashed card.

```
In rewards/page.tsx, the Tier Benefits section must style current active benefits with a green check icon and next-tier (locked) benefits with muted grey text + a lock icon, side by side. See the CheckCircle2 (current) vs Lock (next) branches. Verify the visual distinction; fix only on divergence.
```

### Task 48 (LOW / ADD) — "How do I earn more points?" link scrolls to earn rules

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — a link under Tier Benefits smooth-scrolls to `#how-points-earned`.

```
In rewards/page.tsx, confirm a "How do I earn more points?" link below the Tier Benefits comparison smooth-scrolls to the "How Points Are Earned" section (getElementById("how-points-earned").scrollIntoView). Verify; fix only if missing.
```

### Task 49 (HIGH / ADD) — "My History" tab: chronological point events

**Files:** `src/app/customer/rewards/page.tsx`, `src/components/loyalty/LoyaltyTransactionHistory.tsx`
**Status:** ✅ Implemented — the "My History" tab renders `LoyaltyTransactionHistory` over `pointTransactions` (event label, ±points, date/time), empty text "No transactions yet. Points you earn and redeem will appear here."

```
In rewards/page.tsx, the "My History" tab must show a chronological list of point events (label, +X/−X, date & time) when data exists, with empty text "No transactions yet. Points you earn and redeem will appear here." — via LoyaltyTransactionHistory fed by pointTransactions. Verify the data source, row content, and empty text; fix only on divergence.
```

### Task 50 (MEDIUM / ADD) — "Referrals" tab: code + Copy + empty copy

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — Referrals tab shows the customer's referral code with Copy (and Share); empty state reads "Share your referral link to earn bonus points when a friend joins."

```
In rewards/page.tsx, the "Referrals" tab must show the customer's unique referral code with a Copy button, and an empty state "Share your referral link to earn bonus points when a friend joins." See customerReferralCodes + copyToClipboard. Verify the code/copy and the empty-state text; fix only on divergence.
```

### Task 51 (LOW / ADD) — "Badges" tab: earned + locked

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — earned badges render full-colour with earned date; in-progress/locked badges render greyed with `Lock` + progress bars (`badgeView.earned` / `.inProgress`).

```
In rewards/page.tsx, the "Badges" tab must show earned badges (icon + label, full colour) and unearned ones in a muted/locked style, when data exists (badgeView.earned vs badgeView.inProgress). Verify both groups; fix only if locked badges aren't visually distinct.
```

### Task 52 (MEDIUM / FIX) — Move the stat bar below the hero (not a fixed bottom bar)

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — Current Points / Lifetime Points / Total Spent render as a `KpiTile` row directly below the hero (carries a `// Task 52` comment), not a fixed bottom bar.

```
In rewards/page.tsx, the stat bar (Current Points / Lifetime Points / Total Spent) must sit directly below the hero section (a normal in-flow KpiTile row), not as a fixed bottom-of-viewport bar. Verify placement; fix only if it's still a fixed bottom bar.
```

### Task 53 (HIGH / RULE) — All stats from real data

**File:** `src/app/customer/rewards/page.tsx`
**Status:** ✅ Implemented — current points from the loyalty account; `lifetimePoints` = sum of all positive `pointTransactions` (gross, not net of redemptions); `totalSpent` = sum of completed `payments`. Resolves the "450 lifetime / $0.00 spent" contradiction (values now reflect real data).

```
In rewards/page.tsx, confirm the three stats pull from real data: current points from the loyalty account; lifetime points as the cumulative total of ALL positive point-ledger entries (not net of redemptions); total spent as the sum of completed payments. No mock constants. See lifetimePoints + totalSpent + loyaltyAccount. Verify each source; fix only if any value is hardcoded.
```

---

# PART E — Polish items found in the code audit

These are the only real gaps. Each is small and file-scoped.

### E1 — Re-prefill "From" name after "Send another gift card" (relates to Task 14)

**File:** `src/app/customer/gift-cards/_components/BuyGiftCardFlow.tsx`

```
In BuyGiftCardFlow.tsx, `resetFlow()` currently sets senderName back to "" — so after a customer taps "Send another gift card", the "From (Your Name)" field loads blank, violating Task 14 ("do not leave it blank on load"). Change resetFlow so it re-derives the customer's first name the same way the initial state does (clients.find((c) => c.id === MOCK_CUSTOMER_ID)?.name?.split(" ")[0] ?? ""), instead of "". Extract that first-name value into a single const and use it in both the initial useState and resetFlow so they can't drift. Then run bun run typecheck && bun run lint.
```

### E2 — Fix received empty-state typo (relates to Task 35)

**File:** `src/app/customer/gift-cards/_components/ReceivedGiftCardsList.tsx`

```
In ReceivedGiftCardsList.tsx, the received-cards EmptyState `text` prop is "No gift cards received yet," with a stray trailing comma. Change it to "No gift cards received yet" (no trailing comma). Leave the `note` prop unchanged. Then run bun run typecheck && bun run lint.
```

### E3 — Remove the redundant tier-progress summary block (relates to Task 42)

**File:** `src/app/customer/rewards/page.tsx`

```
In rewards/page.tsx, the points hero shows tier progress three times: (1) "X points away from [next] Tier" top-right, (2) the progress bar with "points / minPoints" and "N% to [next]", and (3) a third "Summary Text (Example Format)" block ("{points} Points – {pointsToNextTier} points away from {nextTier} Tier"). The third block is redundant and was an example-format placeholder. Remove that third block (the `{loyaltyData.nextTier && (<div className="border-t pt-2">…</div>)}` summary directly after the progress section) so the hero shows the badge + one clear progress representation. Do not touch the tier badge or the progress bar. Then run bun run typecheck && bun run lint.
```

### E4 — Reconcile the bottom "Rewards" tab empty-state copy (relates to Task 46 / §4.6)

**File:** `src/app/customer/rewards/page.tsx`

```
In rewards/page.tsx there are two reward surfaces: the top "Your Rewards" card (granted rewards wallet, with "Use reward" → QR/code) and the bottom "Rewards" TAB (the points-cost catalog). Per spec §4.6 the "Rewards" tab empty state should read "No rewards available. Keep earning points to unlock rewards." — but the tab currently shows "No rewards available at this time" / "Check back later for new rewards!". Update the bottom Rewards-tab empty state to the spec wording. Also add a one-line CardDescription distinguishing the two surfaces (e.g. top = "rewards you can use now", tab = "rewards you can unlock with points") so customers aren't confused by two "Rewards" areas. Keep both surfaces; only adjust copy. Then run bun run typecheck && bun run lint.
```

### E5 — Confirm "Apply to my wallet" target: loyalty credit vs customer wallet (relates to Task 44)

**Files:** `src/components/customer/RedeemPointsDialog.tsx`, `src/data/loyalty-redeem.ts`, `src/app/customer/wallet/_components/WalletView.tsx`

```
In RedeemPointsDialog.tsx the confirm button says "Apply to my wallet" and calls redeemPointsForCredit(...), which adds to the loyalty ACCOUNT CREDIT balance (surfaced on the rewards hero), NOT the customer WALLET shown at /customer/wallet (customerWallets in src/data/gift-cards.ts). The spec (Task 44) says "add the dollar value to the wallet." Decide and implement ONE of: (a) if account credit is the intended destination (it auto-applies at checkout like the wallet), rename the button/toasts to "Apply as account credit" and keep the DialogDescription accurate; or (b) if it should hit the customer wallet, route the redeemed dollar value into customerWallets (a wallet credit transaction) so it appears on /customer/wallet, and keep the "Apply to my wallet" label. Do not do both. Explain which you chose and why in your summary, then run bun run typecheck && bun run lint.
```

### E6 — Confirm per-invoice PDF/receipt download (relates to §3.4 note)

**Files:** `src/components/customer/billing/BookingInvoicesTab.tsx`, `src/components/customer/billing/CustomerInvoiceCard.tsx`

```
The billing "Invoices & Receipts" tab renders BookingInvoicesTab → CustomerInvoiceCard per invoice. Verify each invoice row exposes: date, service description, amount, status (Paid/Unpaid/Overdue), and a per-invoice PDF/receipt DOWNLOAD action. If the download action is missing, add a "Download PDF" (or "Receipt") button to CustomerInvoiceCard that produces the invoice as a PDF/printable receipt (reuse any existing pdf/print helper in the repo before adding a dependency). Report what you found; implement only if the download is absent. Then run bun run typecheck && bun run lint.
```

---

# APPENDIX — Whole-feature verification prompt

Run this last (or first, as a baseline) to prove the spec is met end-to-end without hunting task by task.

```
Verify the Gift Cards & Rewards feature against the client spec, without changing behaviour unless you find a real defect. Do a read-only pass across these files and report a PASS/FAIL table:
- Sidebar: src/components/customer/CustomerSidebar.tsx (single "Gift Cards" item; Billing/Wallet/Loyalty separate)
- Gift Cards: src/app/customer/gift-cards/page.tsx, _components/GiftCardsTabs.tsx, _components/BuyGiftCardFlow.tsx, _components/SentGiftCardsList.tsx, _components/ReceivedGiftCardsList.tsx, my-cards/page.tsx (redirect)
- Billing: src/app/customer/billing/page.tsx, src/components/customer/billing/BalanceSummaryCards.tsx, PaymentMethodsTab.tsx, BookingInvoicesTab.tsx
- Rewards: src/app/customer/rewards/page.tsx, src/components/customer/RedeemPointsDialog.tsx
For each of the 53 spec tasks, state the file + line region that satisfies it and PASS/FAIL. Then run `bun run typecheck && bun run lint && bun run format:check` and report results. List any FAIL or any Part E polish item still outstanding. Do not edit code in this pass — produce the report only.
```

---

_53 tasks, all mapped 1:1 to the client's Section 5 numbering, each grounded in the real file that implements it, plus 6 audit-found polish items (Part E) and a verification appendix. Paste one block at a time; on the current repo the numbered tasks should verify clean and only Part E produces diffs._
