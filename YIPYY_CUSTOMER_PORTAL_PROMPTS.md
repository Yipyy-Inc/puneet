# Yipyy Customer Portal — Gift Cards & Rewards — Copy-Paste Prompts

Round 3. All 53 tasks from the _Gift Cards & Rewards UI/UX Workflow Spec_, one prompt each. Grouped by priority (CRITICAL → HIGH → MEDIUM → LOW) so you have a clear build order, but **each prompt keeps the client's own task number** (Task 1–53) so it maps 1:1 to their checklist.

Pages touched: `/customer/gift-cards`, `/customer/billing`, `/customer/rewards`, `/customer/wallet`.

**Recommended order:** build the 7 CRITICAL first (Tasks 3, 15, 19, 25, 30, 34, 42), then HIGH, then MEDIUM, then LOW. Within the Gift Cards send flow, note several tasks share the same 4-step wizard state — build them in the same sitting even across priority tiers.

**Standing rules (restated so each prompt is portable):**

> Stack: Next.js 16 App Router (RSC), React 19, TypeScript, shadcn/ui (New York), Tailwind 4, next-intl, TanStack Query + TanStack Form, bun. Pages are Server Components by default — extract interactivity into small `"use client"` components. Use `DataTable` for tables. Wrap data in TanStack Query factories in `src/lib/api/<domain>.ts` (never import mock data into components directly). Multi-step wizard state uses `useState` + shared context and must persist across Back/Forward. Keep files under ~500 lines. Use `next/dynamic` for modals. No hardcoded numbers — skeleton only while genuinely loading. Conventional commits. Plan first, then typecheck + lint.

---

# PART A — CRITICAL (7)

---

## Task 3 (CRITICAL) — Add 3-tab bar to Gift Cards page

```
On /customer/gift-cards, add a 3-tab bar at the top of the page: "Send a gift card" (default active on load) / "Cards I sent" / "Cards I received". The existing purchase flow lives inside the "Send a gift card" tab; the other two tabs show the customer's gift card history (built in Tasks 25 and 30). Keep the page title "Gift Cards" and the existing subtitle. This tab bar is the backbone for merging the old separate /my-cards page into this one.
```

## Task 15 (CRITICAL) — Schedule Delivery toggle reveals date + time pickers

```
In the Gift Card send flow, Step 3 (Recipient): fix the Schedule Delivery toggle — currently turning it On does nothing. When toggled On, animate open a date picker + time selector directly below the toggle. Date picker rules: minimum selectable date is tomorrow (no same-day — that's what "Send now" is for); maximum is 1 year from today. After the customer picks a date and time, show a confirmation line beneath the selector: "Will be delivered on [Weekday], [Month Date] at [Time]." When toggled Off, collapse the pickers and clear any selected date. Default (toggle Off) = gift card sent immediately after purchase. Persist the schedule in the 4-step flow state so Step 4 can display it.
```

## Task 19 (CRITICAL) — Step 4 card preview must render real data

```
In the Gift Card send flow, Step 4 (Review & Pay): fix the card preview — it currently shows garbled placeholder data (nonsense recipient name, placeholder message). This is the final confirmation before payment and must be accurate. Render: the actual design chosen in Step 2 (correct background color + icon), the actual amount from Step 1, the actual recipient name from Step 3 (e.g. "For Jane Smith"), and the first line of the personal message truncated to ~40 chars if longer. Pull all of this from the shared 4-step flow state.
```

## Task 25 (CRITICAL) — Move "Cards I Sent" into Tab 2

```
Move the "Cards I Sent" view out of the separate /customer/gift-cards/my-cards page and into Tab 2 ("Cards I sent") of /customer/gift-cards. Keep the list layout: recipient name, send date, status badge (Active / Redeemed / Expired), original amount, remaining balance. Retire the old my-cards route (redirect it to /customer/gift-cards). Search, sort, and row actions are Tasks 26–28; empty state is Task 29.
```

## Task 30 (CRITICAL) — Move "Cards I Received" into Tab 3

```
Move the "Cards I Received" view out of the separate /customer/gift-cards/my-cards page and into Tab 3 ("Cards I received") of /customer/gift-cards. Keep the data shown: sender name, received date, expiry status, full card amount. The "Load" button, "Check balance", the load-to-wallet modal, and the empty state are Tasks 31–35. Ensure the old my-cards route is fully retired.
```

## Task 34 (CRITICAL) — Load-to-wallet confirmation modal (full/partial)

```
In Tab 3 (Cards I received): tapping "Load to my wallet" must open a small confirmation modal (not a full page) instead of moving the full balance instantly. Modal shows: card details (sender, amount); a toggle between "Load full balance: $X.XX" and "Load partial amount:" with a number input (max = card balance); and a before/after preview: "Your wallet: $Y.YY → $Y.YY + loaded amount." Confirm and Cancel buttons. On Confirm: load the selected amount to the wallet, decrement the card's remaining balance, and show a success toast. (Depends on the button rename in Task 31.)
```

## Task 42 (CRITICAL) — Rewards progress bar shows progress to NEXT tier

```
On /customer/rewards, fix the points hero progress bar. It currently contradicts itself ("340 / 500 points" + "0% to Silver" while the badge already says "Silver Tier"). The bar must show progress toward the NEXT tier, not the current one: if the customer is Silver, the bar shows progress toward Gold, with text "[X] / [target] points to Gold." Show the current tier badge separately above the bar, not as part of the bar label. Compute from real tier thresholds.
```

---

# PART B — HIGH (27)

---

## Task 1 (HIGH) — Merge "Gift Cards" + "My Gift Cards" sidebar items

```
In the customer portal sidebar (Account section), merge the two separate items "Gift Cards" and "My Gift Cards" into a single item called "Gift Cards". Remove the "My Gift Cards" entry. The single item opens /customer/gift-cards (the tabbed page from Task 3). Keep "Billing & Payments", "My Wallet", and "Loyalty & Rewards" as their own separate sidebar items, names unchanged.
```

## Task 2 (HIGH) — Single "Gift Cards" item → tabbed page

```
Ensure the merged "Gift Cards" sidebar item navigates to /customer/gift-cards and lands on the 3-tab page (Send a gift card / Cards I sent / Cards I received). No separate /my-cards destination should remain reachable from the sidebar. (Pairs with Tasks 1 and 3.)
```

## Task 4 (HIGH) — Default active tab = "Send a gift card"

```
On /customer/gift-cards, when the customer arrives from the sidebar, the default active tab is "Send a gift card" (Tab 1). (The email-link exception is Task 5.)
```

## Task 7 (HIGH) — Step 1 default: no tile selected, preview shows "Choose an amount"

```
Gift Card send flow, Step 1 (Amount): fix the broken "$0.00" default. On load, no preset tile is selected and the live preview card is visible but shows "Choose an amount" in place of the dollar figure (not "$0.00"). As soon as the customer clicks a preset tile or types a custom amount, the preview updates immediately with the real value.
```

## Task 8 (HIGH) — Step 1 preview updates live

```
Gift Card send flow, Step 1: the live card preview updates in real time as the customer selects a preset tile or types a custom amount — reflecting the current dollar value instantly. (Works together with Task 7's default state and Task 12's design color.)
```

## Task 9 (HIGH) — Step 1 preset tiles and custom input mutually exclusive

```
Gift Card send flow, Step 1: make the preset amount tiles and the custom amount input mutually exclusive. When the customer starts typing in the custom field, deselect all preset tiles. When they tap a preset tile, clear the custom amount input. Never show both as active.
```

## Task 10 (HIGH) — Step 1 amount validation ($10–$500)

```
Gift Card send flow, Step 1: enforce minimum $10 and maximum $500. If the customer enters an amount outside this range, show an inline validation error below the input: "Amount must be between $10 and $500." Keep the Continue button disabled until a valid amount is selected.
```

## Task 11 (HIGH) — Step 2 add "New pet" and "Gotcha Day" designs

```
Gift Card send flow, Step 2 (Design): add two petcare-specific designs to the existing 6, for 8 tiles total: "New pet" (paw/pet icon, warm tone) and "Gotcha Day" (celebration icon, teal/green tone). Keep the existing 6 (Birthday, Holiday, Anniversary, Just Because, Thank You, Welcome) and the layout that shows the selected amount on each tile. Cap at 8 tiles to keep the grid scannable. (Colored tile + icon + label is an acceptable placeholder for now; real illustrated designs are a separate visual pass — don't block on it.)
```

## Task 12 (HIGH) — Step 2 store selected design in flow state

```
Gift Card send flow: store the selected design's color/theme and icon in the shared 4-step flow state. The preview card in Step 1 (if the user navigates back) and in the Step 4 review must use the actual selected design color and icon — not a static generic card.
```

## Task 16 (HIGH) — Step 3 date picker bounds + confirmation line

```
Gift Card send flow, Step 3: for the scheduled-delivery date picker (revealed in Task 15), enforce minimum = tomorrow and maximum = 1 year from today. After the customer selects a date and time, show a formatted confirmation line: "Will be delivered on [Weekday], [Month Date] at [Time]."
```

## Task 17 (HIGH) — Step 3 validate required Recipient Name + Email on Continue

```
Gift Card send flow, Step 3: Recipient Name and Recipient Email are required. If either is empty when the customer clicks Continue, show an inline validation error beneath the empty field and block progression to Step 4. (Email format check on blur is Task 18.)
```

## Task 22 (HIGH) — Step 4 show delivery timing in review table

```
Gift Card send flow, Step 4 (Review): in the recipient details table, show the delivery timing. If a schedule was set in Step 3, show "Delivery: [Day], [Month Date] at [Time]." If not, show "Delivery: Immediately after purchase."
```

## Task 23 (HIGH) — Step 4 disable Purchase until valid payment method

```
Gift Card send flow, Step 4: keep the "Purchase $X.XX" button disabled until a valid payment method is confirmed on screen. If the customer has no saved card, show a prompt to add one before allowing purchase.
```

## Task 24 (HIGH) — Step 4 success screen (no blank page)

```
Gift Card send flow, Step 4: after a successful purchase, do NOT redirect to a blank page. Show a success screen within the same step container containing: a confirmation message "Gift card sent to [Recipient Name]!", the card preview with the correct design and amount, a summary row showing where it was sent, and two buttons — "Send another gift card" (resets the flow to Step 1) and "View cards I sent" (switches to Tab 2).
```

## Task 28 (HIGH) — Cards I Sent: replace Resend with "..." actions menu

```
Tab 2 (Cards I sent): replace the single Resend button with a "..." actions menu per card: "Resend email" (for cards where delivery may have failed), "View details" (opens a panel/modal with full transaction history for that card), "Check balance" (shows current remaining balance inline). Resend is only available for digital cards; if a physical card exists, grey it out with tooltip "Physical cards cannot be resent by email."
```

## Task 31 (HIGH) — Cards I Received: rename "Load" → "Load to my wallet"

```
Tab 3 (Cards I received): rename the "Load" button to "Load to my wallet" (the ambiguous "Load" label is unclear to first-time customers). This button opens the confirmation modal in Task 34. (Explanatory text is Task 32.)
```

## Task 32 (HIGH) — Cards I Received: explain what loading to wallet means

```
Tab 3 (Cards I received): directly below the "Load to my wallet" button (or as a hover tooltip), show a brief explanation: "Loading to your wallet lets you pay for services at checkout automatically — no need to enter a code."
```

## Task 33 (HIGH) — Cards I Received: inline "Check balance" per card

```
Tab 3 (Cards I received): add a "Check balance" link/button next to each card. Clicking it shows the current balance inline beneath the card row (no navigation away). Format: "Current balance: $X.XX."
```

## Task 36 (HIGH) — Billing: move 3 balance cards above the tab bar

```
On /customer/billing, move the 3 balance cards (Store Credit, Gift Card Balance, Outstanding Balance) ABOVE the tab bar so they're always visible regardless of the active tab. The tabs (Payment Methods / Invoices & Receipts / Balances) then control only the detailed content area below.
```

## Task 37 (HIGH) — Billing: Outstanding Balance card warning styling

```
On /customer/billing, style the Outstanding Balance card with a red/warning treatment when the amount > $0: red border, red amount text, small alert icon, and a sub-line "From unpaid or overdue invoices." When the outstanding balance is $0.00, show the card in the standard neutral style with "No outstanding balance."
```

## Task 40 (HIGH) — Billing: "Add payment method" button

```
On /customer/billing, Payment Methods tab: add a prominently placed "Add payment method" button in the top right (not buried) that opens a secure card entry form (Stripe Elements or equivalent). Keep the existing saved-cards layout (card type, last 4, expiry, Default badge).
```

## Task 44 (HIGH) — Rewards: Redeem Points modal

```
On /customer/rewards, when the customer clicks "Redeem Points", open a redemption modal (not a new page) showing: current balance, dollar value, a numeric input "How many points to redeem?", a live preview of the dollar value being redeemed, and an "Apply to my wallet" confirm button. On success: deduct the points, add the dollar value to the wallet, show a success message, and update the hero section points balance in real time.
```

## Task 45 (HIGH) — Rewards: load earn rules dynamically

```
On /customer/rewards, the "How Points Are Earned" section must load earn rules dynamically from the facility's loyalty program configuration — do not hardcode them. If a facility has no birthday bonus, that row does not appear. Keep the per-rule layout (icon, description, "Active" badge).
```

## Task 46 (HIGH) — Rewards: available rewards as cards with "Use reward"

```
On /customer/rewards, "Your Rewards" section: when the customer has rewards available (e.g. a free grooming session, a discount voucher), render each as a card showing reward name, description, expiry date (if applicable), and a "Use reward" button. Clicking "Use reward" opens a modal with the reward code or QR code to present at the facility. Keep the existing encouraging empty state when there are none.
```

## Task 47 (HIGH) — Rewards: tier benefits active vs locked styling

```
On /customer/rewards, Tier Benefits section: style current active benefits with a checkmark icon prefix in the success (green) color, and locked next-tier benefits with muted grey text + a small lock icon prefix. The difference must be clear at a glance. Keep the side-by-side current-vs-next layout.
```

## Task 49 (HIGH) — Rewards: My History tab chronological event list

```
On /customer/rewards, "My History" tab: when data exists, show a chronological list of point events — each row: event label (e.g. "Booking: Grooming", "Birthday bonus", "Points redeemed"), points change (+X or −X), date and time. Empty state: "No transactions yet. Points you earn and redeem will appear here."
```

## Task 53 (HIGH) — Rewards: all stats from real data

```
On /customer/rewards, all stats must pull from real data — no mock values: current points from the loyalty ledger, lifetime points as the cumulative total of ALL points ever earned (not net of redemptions), total spent as the sum of all paid invoices. This resolves the "450 lifetime points but $0.00 total spent" contradiction. Skeleton only while genuinely loading.
```

---

# PART C — MEDIUM (13)

---

## Task 5 (MEDIUM) — Email-link arrival defaults to "Cards I received"

```
On /customer/gift-cards, when the customer arrives via a "Check your balance" link from a gift card email, default the active tab to Tab 3 ("Cards I received") instead of Tab 1. Detect this from a query param on the incoming link. Normal sidebar navigation still defaults to Tab 1 (Task 4).
```

## Task 14 (MEDIUM) — Step 3 pre-populate "From" with customer first name

```
Gift Card send flow, Step 3 (Recipient): pre-populate the "From (Your Name)" field with the logged-in customer's first name. The customer can edit it. Do not leave it blank on load.
```

## Task 18 (MEDIUM) — Step 3 validate email format on blur

```
Gift Card send flow, Step 3: validate the Recipient Email format on blur (when the customer leaves the field). If invalid, show "Please enter a valid email address" beneath the field. (Complements the required-field check in Task 17.)
```

## Task 20 (MEDIUM) — Step 4 replace "Change" link with "Use different card" button

```
Gift Card send flow, Step 4 (Review): replace the small "Change" text link next to the payment card with a clearly styled secondary button labeled "Use different card", placed visibly below the current card chip. The button opens a payment method selector (modal or inline expansion).
```

## Task 21 (MEDIUM) — Step 4 confirm "Send me a copy" recipient

```
Gift Card send flow, Step 4 (Review): if the customer checked "Send me a copy" in Step 3, show a confirmation line in the review: "A copy will also be sent to [customer's own email]." This confirms the checkbox was registered before they pay.
```

## Task 26 (MEDIUM) — Cards I Sent: search by recipient name

```
Tab 2 (Cards I sent): add a search bar above the list — "Search by recipient name." Results filter in real time as the customer types.
```

## Task 38 (MEDIUM) — Billing: Gift Card Balance card link

```
On /customer/billing, add a small "Manage gift cards →" link inside the Gift Card Balance card that navigates to /customer/gift-cards. When the balance is $0.00, change the link text to "Send a gift card →."
```

## Task 39 (MEDIUM) — Billing: Store Credit card link

```
On /customer/billing, add a "Manage wallet →" link inside the Store Credit card that navigates to /customer/wallet.
```

## Task 41 (MEDIUM) — Billing: payment method actions menu

```
On /customer/billing, Payment Methods tab: give each saved payment method a "..." actions menu with "Set as default" and "Remove". Removing the default card must prompt: "Are you sure? You will need to add a new default card before making purchases."
```

## Task 43 (MEDIUM) — Rewards: redemption context note near Redeem button

```
On /customer/rewards, below the "Redeem Points" button add a small context note: "100 points = $1.00 in credit. Minimum redemption: [X] points." Pull the minimum from the loyalty config. This sets expectations before the customer opens the redemption modal (Task 44).
```

## Task 50 (MEDIUM) — Rewards: Referrals tab link + copy

```
On /customer/rewards, "Referrals" tab: show the customer's unique referral link/code with a Copy button. Empty-state message: "Share your referral link to earn bonus points when a friend joins."
```

## Task 52 (MEDIUM) — Rewards: move stat bar below hero

```
On /customer/rewards, move the stat bar (Current Points / Lifetime Points / Total Spent) from the fixed bottom of the viewport to the top of the page, directly below the hero section and above the tabs. A fixed bottom bar on a scrollable page is poor UX; placing it below the hero keeps the stats persistently visible as context. (Real data for these stats is Task 53.)
```

---

# PART D — LOW (6)

---

## Task 6 (LOW) — Step 1 add "$75" preset tile

```
Gift Card send flow, Step 1 (Amount): add a "$75" preset tile so the row has 6 even options: $25 / $50 / $75 / $100 / $150 / $200. This closes the visual gap left by the current 5-tile layout.
```

## Task 13 (LOW) — Step 3 personal message limit 200 → 300

```
Gift Card send flow, Step 3 (Recipient): increase the Personal Message character limit from 200 to 300. Update the counter to show "0 / 300" and count up as the customer types.
```

## Task 27 (LOW) — Cards I Sent: sort dropdown

```
Tab 2 (Cards I sent): add a sort dropdown with options — Newest first (default), Oldest first, Highest amount, Lowest amount.
```

## Task 29 (LOW) — Cards I Sent: empty state

```
Tab 2 (Cards I sent): add an empty state for when no cards have been sent — an icon, the message "You haven't sent any gift cards yet," and a button "Send your first gift card" that switches to Tab 1.
```

## Task 35 (LOW) — Cards I Received: empty state

```
Tab 3 (Cards I received): add an empty state for when no cards have been received — an icon, the message "No gift cards received yet," and a note "Share the Gift Cards page with friends and family so they can send you one."
```

## Task 48 (LOW) — Rewards: "How do I earn more points?" link

```
On /customer/rewards, below the Tier Benefits comparison add a small "How do I earn more points?" link that smooth-scrolls up to the "How Points Are Earned" section — giving a motivated customer a logical next step.
```

---

_53 tasks. Suggested execution: CRITICAL (Part A) first, then HIGH, MEDIUM, LOW. Task numbers match the client's Section 5 list exactly for easy check-off. Note two invoices/receipts details from the spec were "NOTE only" (no change required) and aren't tasks: ensure the Invoices tab lists date, service description, amount, status, and a per-invoice PDF download. Paste one prompt at a time; let the agent plan, implement, typecheck, and lint._
