# YIPYY — QuickBooks Online Integration: Grounded Copy‑Paste Prompts

**Spec:** `Yipyy_QuickBooks_Integration_Workflow.docx` (Sections 1–9, 10 build phases)
**Target repo:** `C:\dev\puneet` — Next.js 16 App Router · React 19 · TS 5.9 strict · Tailwind 4 · shadcn/ui · **bun**
**Audited against real code:** yes — every change is mapped to the file that owns it.

---

## ⭐ Audit finding (read this first)

This is the largest single feature of any spec so far, and the most important thing to get right is **scope**, because the spec describes a _real_ third‑party integration and `puneet` is a _mock_ prototype.

**What exists today (~5% of the spec):**

- `src/lib/quickbooks-sync.ts` — a **tiny mock stub** that literally says _"QuickBooks sync — mocked for now. When backend is built, replace the mock functions with real API calls."_ It has `QBSyncStatus` (not_synced/pending/synced/failed), `QBInvoiceData`, `QBSyncResult`, and three functions: `syncPaymentToQuickBooks` (500 ms, 95% success), `syncRefundToQuickBooks`, `resyncToQuickBooks`. Booking‑level only.
- `src/components/bookings/QuickBooksSyncPanel.tsx` — a per‑booking "sync this booking" panel using that stub.
- A facility **Settings → Integrations** section already exists (`SettingsSidebar` id `integrations`; `settings/page.tsx` ~L4199), and it already has an **"Accounting Integration → QuickBooks Online (Phase 2)"** placeholder toggle (~L4302–4316).
- A facility integration‑card UI pattern: `src/components/integrations/clover-integration-card.tsx` (reuse its look for the QuickBooks entry card).

**What the spec wants (~95% net‑new):** the entry page, OAuth connect, 5‑step setup wizard (company confirm → account health check → service→account/item mapping with smart defaults + bulk + progress → sync settings → test sync → success), the management dashboard (status header, KPI tiles, sync activity log, error panel, manage‑mappings), the 18 per‑transaction‑type QuickBooks document builders, multi‑location, token management, historical sync, and a sandbox toggle. This is essentially a from‑scratch module hung off the existing Integrations section.

### ⚙️ THE defining constraint — mock‑app scope (read before every prompt)

There is **no backend**. Real QuickBooks OAuth, real API calls, server‑side token storage, a durable server job queue, and cron token‑refresh **cannot run here**. So build it exactly like the codebase already frames it in `quickbooks-sync.ts`: **the full UI is real and 100% buildable; the "engine" is a realistic mock behind a typed seam.** Concretely, in this prototype:

- **OAuth** = a simulated flow (a mock consent modal → fake company + tokens stored in a localStorage store), not a real redirect.
- **QuickBooks data reads** (Chart of Accounts, Products/Services, Customers, Tax codes) = **canned mock data** in a new `src/data/quickbooks-mock.ts`.
- **Sync** = a simulated in‑app queue that produces fake QB document IDs (`QB Sales Receipt #1042`), models pending/synced/failed states, idempotency keys, and exponential‑backoff _state_ (not real timers), extending `quickbooks-sync.ts`.
- **Token expiry / refresh / outage banners** = simulated states you can toggle for demo, not real cron.
- Every seam carries a `// TODO: real QuickBooks Online API (OAuth2 + Accounting API)` comment so a real backend drops in later.

The **valuable, buildable deliverable is the whole UI + a faithful mock sync layer** whose data shapes mirror the real QuickBooks documents (Section 5 tables). Build to those shapes so the eventual backend is a drop‑in.

### ⛔ Wrong‑code trap — do NOT build on the platform integrations registry

| Thing                                              | File(s)                                                                                                                                               | Verdict                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **QuickBooks mock seam (extend this)**             | `src/lib/quickbooks-sync.ts`                                                                                                                          | ✅ The declared seam. Grow it.                                                |
| Facility integration‑card pattern (reuse the look) | `src/components/integrations/clover-integration-card.tsx`, `twilio-integration-card.tsx`                                                              | ✅ Facility‑settings cards.                                                   |
| Facility Settings → Integrations host              | `src/app/facility/dashboard/settings/page.tsx` (~L4199), `SettingsSidebar` id `integrations`                                                          | ✅ Mount the QuickBooks entry here.                                           |
| Platform super‑admin integrations registry         | `src/lib/integrations-store.ts`, `src/data/system-administration.ts`, `src/data/integration-logs.ts`, `src/app/dashboard/system-admin/integrations/*` | 🚫 Different feature (platform ops). Not the facility QuickBooks integration. |
| "QuickBook" button                                 | `src/components/customer/QuickBookButton.tsx`                                                                                                         | 🚫 This is _quick booking_, not QuickBooks.                                   |

---

## Module map

| Area                                          | Real file(s)                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mock sync seam (extend)**                   | `src/lib/quickbooks-sync.ts`                                                                                                                                                    |
| Per‑booking sync panel (existing)             | `src/components/bookings/QuickBooksSyncPanel.tsx`                                                                                                                               |
| Settings → Integrations host + QB placeholder | `src/app/facility/dashboard/settings/page.tsx` (~L4199 / ~L4302), `src/components/facility/SettingsSidebar.tsx`                                                                 |
| Integration‑card UI pattern to reuse          | `src/components/integrations/clover-integration-card.tsx`                                                                                                                       |
| **Transaction sources (what syncs)**          | `src/types/retail.ts` (`Transaction`, payments, tip, discount, `storeCredit`, `giftCards`), `src/data/retail.ts`, `src/lib/api/retail.ts`                                       |
| Gift cards                                    | the Gift Cards module + `retailGiftCardSchema` (`src/types/retail.ts`)                                                                                                          |
| Packages / passes                             | `src/data/customer-packages.ts` (`redeemPackagePass`)                                                                                                                           |
| Deposits                                      | `src/data/deposit-rules.ts`, booking deposit flow                                                                                                                               |
| Invoices / billing                            | `src/components/billing/*`, `src/components/bookings/InvoicePanel.tsx`, `src/app/facility/dashboard/billing/*`                                                                  |
| Memberships                                   | the memberships/loyalty module                                                                                                                                                  |
| Multi‑location / HQ                           | `src/components/hq/*`, the HQ dashboard                                                                                                                                         |
| **New: QuickBooks feature module**            | `src/app/facility/dashboard/settings/integrations/quickbooks/` (+ `src/components/integrations/quickbooks/*`, `src/lib/quickbooks/*`, `src/data/quickbooks-mock.ts`) — to build |

---

## How to use this pack

1. Paste one prompt at a time, **in the spec's Build Order** (Section 9, phases 1–10) — the prompts below follow it.
2. Each prompt names the **real file(s)** and a **Status**.
3. **Green sequence noted once, not per prompt.** After a batch: `bun run typecheck && bun run lint && bun run format:check` (add `bun run build` for new routes). **bun** only.
4. **Mock‑app scope applies to every prompt** — build the UI for real; simulate OAuth/API/queue/tokens behind the `quickbooks-sync.ts` seam with canned data. Never claim a real QuickBooks connection.
5. Accounting correctness still matters _in the mock_ — the document builders (Part 5) must produce to‑the‑cent totals and the right line structure per Section 5, so the mock sync log is believable and the real backend is a drop‑in.

### Status legend

✅ VERIFY · ⚠️ FIX · ❌ BUILD · 🔁 IMPROVE (post‑core)

---

# PHASE 1 — OAuth Connection (mocked) ❌ BUILD

### 1.1 — QuickBooks connection store + simulated OAuth ❌ BUILD (Section 3B, 7D)

```
Create src/lib/quickbooks/connection-store.ts — a useSyncExternalStore + localStorage + BroadcastChannel store (mirror src/lib/integrations-store.ts's pattern) holding the QuickBooks connection state per facility (and per location for Phase 8): { connected, companyName, companyCountry, companyCurrency, realmId (mock), accessToken (mock), refreshToken (mock), accessTokenExpiresAt, refreshTokenExpiresAt, lastSyncAt, status: "disconnected"|"connected"|"expired"|"outage" }.
Add a MOCK OAuth flow in src/lib/quickbooks/oauth-mock.ts: connectQuickBooks() opens a simulated consent modal (component in Part 3.2) and on "Connect" returns a mock company (name/country/currency) + mock tokens (accessToken TTL 60 min, refreshToken TTL 100 days) written to the store, with a `// TODO: real QuickBooks OAuth 2.0 (Intuit) redirect + server-side token exchange`. Model failure/cancel paths (Section 3B RULE) so the "Try again" state can be shown. Add mock token lifecycle helpers: isAccessTokenExpired(), refreshAccessToken() (simulated proactive refresh), isRefreshTokenExpired() → drives the "connection expired — Reconnect" banner (7D). No real network.
```

### 1.2 — Disconnect / reconnect / expiry state ❌ BUILD (Section 4A, 7D)

```
In connection-store.ts add disconnectQuickBooks() (confirmation handled in UI: "Disconnecting will stop all future syncs. Existing entries in QuickBooks will not be deleted."), reconnectQuickBooks() (re-runs the mock OAuth, preserving existing mappings), and a way to simulate refresh-token expiry so the dashboard banner "Your QuickBooks connection has expired. Reconnect to resume syncing." can render (7D pauses — not fails — queued jobs when expired). Expose a useQuickBooksConnection() hook.
```

---

# PHASE 2 — Data Read from QuickBooks (canned) ❌ BUILD

### 2.1 — Mock QuickBooks data cache ❌ BUILD (Section 3B step 5, Phase 2)

```
Create src/data/quickbooks-mock.ts with canned QuickBooks company data returned right after (mock) OAuth: a Chart of Accounts (Income accounts like "Grooming Income", "Boarding Income", "Retail Income"; a Gift Card Liability, Deposits Held, Tips Payable, Accounts Receivable, Undeposited Funds, a Discounts account, per Section 2A / Table 1), a Products & Services list, a Customer list, and Tax codes (GST/QST/HST). Create src/lib/quickbooks/qb-data-cache.ts — a store that "reads" this into Yipyy's cache on connect and exposes it to the mapping UI, with a refresh() (simulated re-read) and a `// TODO: real QuickBooks read APIs (Account, Item, Customer, TaxCode)`. Shape the types to match QuickBooks entities so a real read swaps in cleanly.
```

---

# PHASE 3 — Setup Wizard UI (Steps 0–5) ❌ BUILD

### 3.1 — Step 0: entry point page ❌ BUILD (Section 3A)

```
Build the QuickBooks entry point. Add a route src/app/facility/dashboard/settings/integrations/quickbooks/page.tsx (and link to it from the existing "Accounting Integration → QuickBooks Online" block in src/app/facility/dashboard/settings/page.tsx ~L4302, replacing the placeholder toggle with a "Set up" entry that opens this page; keep it inside the Integrations section). Before connection, render the entry point (reuse the visual weight of clover-integration-card.tsx): QuickBooks logo + Yipyy logo with a linking icon; the value sentence "Sync every sale, payment, and refund from Yipyy directly to your QuickBooks account — automatically, accurately, and in real time."; three benefit cards (every dollar tracked / no more manual entry / your accountant will love it); a single large green "Connect to QuickBooks" primary button; and a "What will Yipyy access in QuickBooks?" text link opening a modal (reads: customer list, chart of accounts, products/services; writes: sales receipts, invoices, refund receipts, credit memos). RULE: this page shows only before connection; after connection it renders the management dashboard (Phase 5).
```

### 3.2 — Step 1: connect (simulated OAuth) + Step 2: confirm company ❌ BUILD (Section 3B, 3C)

```
Wire "Connect to QuickBooks" to the mock OAuth (1.1): show a simulated QuickBooks consent modal ("Yipyy would like to access your QuickBooks company: [Company]. Read customers, chart of accounts, products. Create sales receipts, invoices, refund receipts, credit memos."). On "Connect": store mock tokens, read the mock QB data (Phase 2), and show the green success "QuickBooks connected — [Company Name]" with "Continue to setup →". On cancel/fail: clean error + "Try again" + "Make sure you're logged in to the correct QuickBooks account." Then Step 2 (3C): a confirmation card showing the QuickBooks company name + country + currency and "Is this the right QuickBooks company?" (Yes, continue / No, disconnect and try a different account).
```

### 3.3 — Step 3: account health check ❌ BUILD (Section 3D)

```
Build the account-health-check step. Against the mock Chart of Accounts (Phase 2), display a checklist of required account types (Table 1): each row shows "✓ Found — [Account Name]" (green) or "⚠ Not found — [type]" (amber), with a "What is this?" plain-English tooltip. For amber rows, an inline "Create this in QuickBooks" link (mock: opens a new tab to a QuickBooks deeplink URL — stubbed) + a "Re-check" button that re-reads the mock cache. RULE: require at least one Income account + Accounts Receivable to proceed; Gift Card Liability / Deposits Held / Tips Payable are optional (fall back to a general Other Current Liability with a warning). "Continue" is always available (amber warnings carry forward as a summary).
```

### 3.4 — Step 4: the mapping screen (core) ❌ BUILD (Section 3E)

```
Build the mapping screen — the heart of setup. Create src/lib/quickbooks/mappings-store.ts (persistent) holding, per Yipyy item, its mapped QuickBooks item + income account. Source the Yipyy items from the real catalogs: services (grooming/boarding/daycare/training/custom), add-ons, packages, memberships, gift cards (sale + redemption), deposits, retail products (src/data/retail.ts), discounts, fees/surcharges, tips, taxes — grouped exactly per Table 2. Card-based layout, groups collapsed by default with a mapping-status summary; each card shows left = Yipyy item name + type + transaction count, right = two dropdowns (QuickBooks Product/Service item + QuickBooks Income account) pre-populated from the mock QB cache, plus an optional "Create new item in QuickBooks" link (mock). Include Customer mapping note (map by client email; format "[Last], [First]"; "Walk-in Customer" fallback).
```

### 3.5 — Mapping: smart defaults, bulk, progress ❌ BUILD (Section 3E)

```
Add to the mapping screen: (a) SMART DEFAULTS — if the mock QB accounts include one named like "Grooming Income"/"Grooming Revenue", pre-suggest it for all Grooming services (same for Boarding etc.); else pre-suggest the general/first income account; every pre-suggestion shows an amber "suggested" badge and is never auto-applied. A "Confirm all suggestions" button appears only AFTER the user has scrolled/reviewed (not as the first CTA). (b) BULK — a "Select all [type]" checkbox per group; when multiple selected, an "Apply to all selected" dropdown sets account/item for all at once, with per-item override afterward. (c) PROGRESS — a top progress bar "X of Y items mapped" coloured red <50% / amber 50–99% / green 100%; cannot proceed at 0 mapped, can proceed partial (with warning). RULE: unmapped services route to a "Yipyy Unassigned Income" catch-all (auto-created in mock on finish) and raise a per-transaction sync warning.
```

### 3.6 — Step 5: sync settings + finish + test sync + success ❌ BUILD (Section 3F)

```
Build Step 5 (Table 3 settings, persisted in a src/lib/quickbooks/settings-store.ts): Sync trigger (Real-time default / Daily batch / Manual only), Payment deposit account (dropdown of mock QB bank/Undeposited Funds; default Undeposited Funds), Invoice vs Sales Receipt (Sales Receipt for immediate, Invoice for outstanding — default), Sync historical toggle + date range (default off, with the large-range warning), Tax handling (Use Yipyy tax rates recommended / Use QuickBooks tax rates), Refund handling (auto / manual approval), Discount account. "Finish Setup": saves mappings+settings, creates the mock "Yipyy Unassigned Income" catch-all, runs a MOCK test sync (creates a "Yipyy Connection Test — do not use" Sales Receipt then deletes it), then a full-screen success state (green check animation, "QuickBooks is connected! …", summary of X services mapped / sync mode / payment account, "View integration dashboard →", "Done"). Model the test-sync failure path with a specific error + "Try again".
```

---

# PHASE 4 — Core Sync: Sales Receipt (mock engine) ❌ BUILD

### 4.1 — Mock sync queue + idempotency + retry state ❌ BUILD (Section 7A, 7B; extend quickbooks-sync.ts)

```
Extend src/lib/quickbooks-sync.ts (do NOT replace — it's the declared seam) into a mock sync engine in src/lib/quickbooks/sync-engine.ts. Model a durable-ish queue (persisted to localStorage) of sync jobs, each with: yipyy transaction id, an IdempotencyKey derived from that id (7B), status (pending/synced/failed), attemptCount, nextRetryAt (simulated exponential backoff: immediate → 5m → 30m → 2h → 24h; after 5 attempts → Failed + error notification), and the stored QuickBooks document id after success. Before any (mock) sync or retry, check "does this transaction already have a QB doc id?" → skip + mark synced (7B). enqueueSync(txn), processQueue() (simulated), retry(jobId), markIgnored(jobId, reason). RULE: a failed sync NEVER blocks operations — the Yipyy payment already succeeded; the failure is only surfaced in the log. Keep the `// TODO: real QuickBooks API + real durable queue` seam.
```

### 4.2 — Standard service payment → Sales Receipt builder ❌ BUILD (Section 5A, Table 4)

```
Build src/lib/quickbooks/documents/sales-receipt.ts — buildServiceSalesReceipt(txn) that turns a Yipyy checkout transaction (src/types/retail.ts Transaction) into a QuickBooks Sales Receipt object per Table 4: Customer (matched by email, "[Last], [First]", auto-create if new — mock), date = payment date, payment method mapped (Card→Credit Card, Cash→Cash, Package pass→Other), deposit-to account from settings, line 1 = service (mapped QB item, desc "[Service] — [Pet]", qty 1, rate base price), line 2+ = add-ons, discount line (negative), surcharge/matting line, tip line (posted to Tips Payable), tax (Yipyy amount on taxable lines, mapped tax code), memo "Yipyy Booking #[id] | [Groomer] | [Booking date]", total. RULE (5A): the QB total must EQUAL the Yipyy total to the cent — if a rounding delta appears, add a ±$0.01 rounding-adjustment line to force an exact match. Wire checkout (retail payment / booking payment) to enqueueSync with this builder. This is the most common path — build + verify it first.
```

---

# PHASE 5 — Sync Log & Integration Dashboard ❌ BUILD

### 5.1 — Dashboard header + KPI tiles ❌ BUILD (Section 4A, 4B)

```
After connection, the QuickBooks route renders the management dashboard (not the entry page). Build the header status bar: "✓ Connected to QuickBooks — [Company]" (green healthy), "Last synced: X ago", "X transactions synced today | $X.XX synced today", a "Disconnect" button (confirm dialog with the warning), and a "Reconnect" link when expired. Below it, four KPI tiles matching the Yipyy dashboard tile style: Synced today (click → filter log), Pending (→ queue), Errors (red accent when >0, → errors), Last 30 days ($ total). Derive all counts from the sync-engine queue + a synced-documents store.
```

### 5.2 — Sync activity log + filters ❌ BUILD (Section 4C)

```
Build the sync activity log — the trust engine. Each row: Yipyy transaction date/time, client + pet name, service type/items, total amount, sync status (green "Synced ✓" / amber "Pending…" / red "Failed ✗"), the QuickBooks document number (e.g. "QB Sales Receipt #1042") as a clickable link (mock: opens a stubbed QuickBooks Online URL in a new tab), and a "Retry" button on failed rows. Filters above the log: Date range | Status (All/Synced/Pending/Failed) | Service type | Amount range | Client search. RULE: retain 12 months in the log; older archived but available via "Export log" CSV download (build the CSV export). Read from the sync-engine + synced-documents store.
```

### 5.3 — Error panel + manage‑mappings + new‑service detection ❌ BUILD (Section 4D, 4E)

```
(a) Error panel (4D): when failed syncs exist, a red banner "X transactions need your attention → Review errors" opens a panel listing each failed transaction with a PLAIN-ENGLISH reason (not raw codes) — e.g. "QuickBooks could not find the income account for Spa Day Deluxe. Update the mapping and retry.", "Your QuickBooks connection has expired. Reconnect…", "Duplicate transaction detected: a Sales Receipt for this booking already exists. Retry skipped." Actions: "Retry all", per-row "Retry", and "Ignore" (with a required reason).
(b) Manage mappings (4E): a dashboard tab reusing the Phase 3.4/3.5 mapping screen for ongoing edits. RULE: when a new Yipyy service is created with an active integration, show a dashboard banner within (mock) 24h "New service detected: [name] is not yet mapped… Map it now", linking to that service's mapping. RULE: when a Yipyy service is deleted, RETAIN its mapping (strikethrough + "Deleted service — historical transactions still reference this mapping").
```

---

# PHASE 6 — Remaining Transaction Types (document builders) ❌ BUILD

### 6.1 — Refunds, Invoices, Credit Memos ❌ BUILD (Sections 5F, 5G; Tables 9, 10)

```
Add builders in src/lib/quickbooks/documents/: (a) refund-receipt.ts — full refund = Refund Receipt mirroring the original Sales Receipt; partial = only refunded lines; references original receipt (5F/Table 9); wire the existing syncRefundToQuickBooks path. (b) invoice.ts — outstanding-balance/pay-later bookings create an Invoice (unpaid, due date configurable), partial payment = a Payment applied leaving a balance, final payment = Payment marks it Paid (5G/Table 10). (c) credit-memo.ts — store credit issued from a refund = Credit Memo against the customer; store credit applied = negative "Store Credit Applied" line referencing the memo; write-off of an uncollectable invoice = Credit Memo to a Bad Debt account. Enqueue each from the matching Yipyy event (refund flow, invoice flow, store-credit flow in src/types/retail.ts storeCredit + billing).
```

### 6.2 — Packages, package redemption, deposits ❌ BUILD (Sections 5B, 5E; Tables 5, 8)

```
Add builders: (a) package sale = a Sales Receipt for the full package amount at time of purchase, revenue recognised at sale, no per-unit discount line (Table 5). (b) package pass redemption = a $0 Sales Receipt (service at full price + a "Package Pass Applied" credit line equal to full price → total $0), memo referencing the original package receipt # and current booking (5B). Hook to src/data/customer-packages.ts redeemPackagePass. (c) deposits (5E/Table 8): deposit collected = Sales Receipt with a Booking Deposit item posted to Deposits Held (liability, not income); deposit applied at checkout = a negative "Booking Deposit Applied" line on the final Sales Receipt against Deposits Held; deposit refunded = Refund Receipt reversing it. RULE (5E): (Deposit Sales Receipt) + (Deposit Applied credit) must net to zero in Deposits Held, and full service revenue lands in income after checkout — assert this in a test scenario.
```

### 6.3 — Gift cards, memberships, retail, tips ❌ BUILD (Sections 5C, 5D; Tables 6, 7)

```
Add builders: (a) gift cards (5C/Table 6): sale = Sales Receipt line posted to Gift Card Liability (not income); redemption for a service = Sales Receipt at full price, payment method "Gift Card", revenue to the service income account, Gift Card Liability decreases; optional expiry/breakage = a Journal Entry moving the balance from Gift Card Liability to Breakage Income. (b) memberships (5D/Table 7): sale/renewal = Sales Receipt (recurring billing creates one each period, description includes the period); cancellation no-refund = no entry; cancellation with refund = pro-rated Refund Receipt; member discount at checkout = a discount line labelled "[tier] member discount". (c) retail/POS sale = Sales Receipt with each product as a line item (already partially modeled by the retail Transaction). (d) tips = a separate Sales Receipt line posted to Tips Payable. Enqueue each from its Yipyy source module.
```

---

# PHASE 7 — New‑Service Detection ✅ VERIFY (folded into 5.3)

```
Confirm Phase 5.3's new-service-detection + deleted-service-mapping-retention are implemented and fire from the real service catalog changes (a new grooming/boarding/etc. service, or a deletion) — not a stub. This phase is the same work as 4E; verify it end-to-end rather than rebuilding.
```

---

# PHASE 8 — Multi‑Location ❌ BUILD (Section 6)

### 8.1 — One QuickBooks company, Class/Location tagging ❌ BUILD (Section 6A)

```
For facilities on one QuickBooks company across locations: add a "Track by location" toggle in sync settings; when on, each Sales Receipt is tagged with a QuickBooks Class matching the Yipyy location, and a Location mapping group appears above the Service groups (map each Yipyy location → a QuickBooks Class). RULE: if the (mock) QB plan is Simple Start (no Classes), grey out the option with "Class tracking requires QuickBooks Plus or Advanced." Use the HQ/locations model (src/components/hq/*, the locations data) for the Yipyy location list.
```

### 8.2 — Separate QuickBooks company per location ❌ BUILD (Section 6B)

```
For facilities with a QuickBooks company per location: in the HQ view, the integration settings show each location as its own card with its own Connect/Disconnect + its own mapping config; transactions from Location A sync only to Location A's QuickBooks. RULE: each location uses its own OAuth token set (connection-store keyed by locationId from 1.1) — if one location's token expires, only that location's sync pauses; others continue. Reuse the HQ multi-location surfaces.
```

---

# PHASE 9 — Historical Sync ❌ BUILD (Section 3F setting; Phase 9)

```
Build the historical-sync flow from the sync setting (3.6): a date-range picker "Sync from [date] to today", the large-range warning ("Syncing 6 months of history will create [N] entries… your accountant should review these"), and a batch runner that enqueues past Yipyy transactions through the same document builders with (mock) rate limiting (QuickBooks real limit ~500 req/min — simulate throttling) and a progress indicator for large runs. Default off. Idempotency (4.1) prevents re-creating already-synced documents.
```

---

# PHASE 10 — Sandbox Toggle 🔁 IMPROVE (Section, Phase 10)

```
Add a "Test mode" toggle in the integration settings that (in this mock) points the connection at a "QuickBooks Sandbox" flavour of the mock data instead of "production" — letting the facility test their mapping before going live. Available only before the first production sync. In the mock, this just switches which canned dataset/labels are used and marks synced docs as sandbox; the `// TODO` notes where the real Intuit sandbox base URL would swap in.
```

---

# Appendix — Final verification

### A.1 — Accounting correctness (mock, to the cent)

```
Verify the document builders produce correct, balanced entries for the Section 5 scenarios: (1) standard service payment — QB Sales Receipt total == Yipyy total exactly, with a ±$0.01 rounding line added if needed. (2) deposit — (deposit receipt) + (deposit-applied credit) nets to zero in Deposits Held, full revenue in income after checkout. (3) package sale recognises revenue once; package redemption is a $0 receipt (no double count). (4) gift card sale hits Liability not income; redemption moves Liability→Income. (5) refund mirrors the original; store credit = Credit Memo. Write these as assertions/test scenarios against the mock builders.
```

### A.2 — Scope + wrong-code + flow check

```
Confirm: (1) everything is built behind the mock seam (extends src/lib/quickbooks-sync.ts / src/lib/quickbooks/*, canned src/data/quickbooks-mock.ts, // TODO real-API markers) — no real network calls, no claim of a live QuickBooks connection. (2) NOTHING was built on the platform integrations registry (src/lib/integrations-store.ts, src/data/system-administration.ts, src/data/integration-logs.ts) or the customer QuickBookButton (that's quick-booking). (3) The feature mounts under Settings → Integrations (the existing section) and swaps entry-page↔dashboard on connection state. (4) A failed sync never blocks a Yipyy payment. Walk: connect → wizard → map → finish/test → take a real Yipyy payment → see it appear "Synced ✓ | QB Sales Receipt #" in the log → force an error → Retry/Ignore → disconnect. Run: bun run typecheck && bun run lint && bun run build. Produce a phase-by-phase (1–10) DONE/PARTIAL/SKIPPED report with files touched.
```

---

_Generated for the Yipyy QuickBooks Online Integration spec. Grounded against the live `C:\dev\puneet` codebase. ~95% net-new and, decisively, a mock-app build: the full UI (entry, 5-step wizard, mapping, dashboard, sync log, error panel, settings) is real; OAuth, QuickBooks reads, the sync queue, and token lifecycle are simulated behind the existing `quickbooks-sync.ts` seam with canned data and `// TODO: real API` markers — built to the real QuickBooks document shapes so a backend drops in later. Do not build on the platform integrations registry._
