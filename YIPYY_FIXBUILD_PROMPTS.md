# Yipyy — Fix & Build (Client Feedback) — Copy-Paste Prompts

Round 2. These are the 19 changes from the client's _Fix & Build Specification_ (changes only — working items omitted). Paste into Claude Code **in order**: 5 CRITICAL first (FB-1…FB-5), then 14 HIGH (FB-6…FB-19). Several tasks modify work from the original 84-prompt build — cross-references are noted so the agent edits existing components instead of creating duplicates.

**Standing rules (same as round 1, restated so each prompt is portable):**

> Stack: Next.js 16 App Router (RSC), React 19, TypeScript, shadcn/ui (New York), Tailwind 4, next-intl, TanStack Query + TanStack Form, bun. Pages are Server Components by default — extract interactivity into small `"use client"` components. Use the `DataTable` component for all tables. Wrap data in TanStack Query factories in `src/lib/api/<domain>.ts` (never import mock data into components directly). Keep files under ~500 lines. Use `next/dynamic` for modals/panels/charts. No hardcoded numbers — show a loading skeleton only when data is genuinely loading, never as a permanent placeholder. Conventional commits. Plan first, then typecheck + lint.

---

# PART A — CRITICAL (5)

---

## FB-1 — Remove Support button from facility top header

```
In the FACILITY portal top navigation header, remove the "Support" button entirely (this replaces its placement from the original Task 13 build). It should no longer appear in the primary nav row alongside phone, messages, notifications, and the avatar — it competes visually and confuses staff. Remove only the header entry point here; the Support Center panel itself is being relocated (FB-2, FB-3), not deleted. After removal, the header keeps: phone icon, messages icon, clipboard/tasks icon, alerts, unified notifications, user avatar. (Header spacing rebalance is FB-16.)
```

## FB-2 — Floating Support button (bottom-right corner)

```
Build a floating Support button for the FACILITY portal, fixed to the bottom-right corner of the viewport on every page. Style: circular, 48px diameter, Yipyy purple, with a question-mark or headset icon. Position: fixed, bottom 24px, right 24px, z-index above all other fixed UI (including mobile nav). On hover: expand to show a "Help & Support" label beside the icon. Clicking it toggles the Support Center panel (FB-3). Implement as a small "use client" component mounted in the facility layout so it persists across navigation.
```

## FB-3 — Support panel as a floating card (not full-height drawer)

```
Change the facility Support Center from a full-height right-edge drawer into a floating card that slides in from the bottom-right corner (anchored to the floating button, FB-2). Card: ~380px wide × ~560px tall, rounded corners, drop shadow, floating overlay ON TOP of the current page — the underlying page stays fully visible and usable. It must NOT push layout or span full height. The card contains the same 3 tabs: "Chat with Yipyy" / "Submit a Ticket" / "Help & FAQs" (behaviors refined in FB-6…FB-10). Closing: an X button top-right of the card, and clicking outside the card both close it. This supersedes the drawer from the original Task 14.
```

## FB-4 — Per-Facility Overrides tab (complete the module toggle UI)

```
Complete the Per-Facility Overrides tab under Feature Flags (/admin/platform/flags — finishes original Task 43). BUG: after selecting a facility in the search field, nothing loads — the override UI is missing.
Build: once a facility is selected, load a list of ALL Yipyy standard modules. Each row shows: module name, its tier-default state (inherited from that facility's subscription plan), and a toggle to override that state on/off for THIS facility only. Changes save immediately with a confirmation toast. A "Reset to Tier Defaults" button at the top clears all overrides for the facility.
RULE: an override applies only to the selected facility — other facilities on the same plan are unaffected. Any overridden row must be visually distinct from tier-default: show a purple "Override" badge next to any toggled row.
```

## FB-5 — Custom Modules architecture rework (registry read-only + facility-scoped creation)

```
Rework Custom Modules from a global creation workflow into a facility-scoped one, plus a read-only registry.
1. REMOVE global creation: on /dashboard/services/custom-modules remove the "+ New Module" button and all Edit actions. Remove Custom Modules as a creation workflow from the Platform Control sidebar.
2. RENAME the sidebar item "Custom Modules" → "Custom Module Registry". This page becomes READ-ONLY: a searchable/filterable card grid of all custom modules across all facilities. The only per-card action is "View", which opens a NON-editable detail drawer.
3. BUILD facility-scoped creation: inside the Facility detail page > Modules tab, add a "Custom Modules" section BELOW the standard modules grid, with a "+ Add Custom Module" button. Clicking it opens a 12-step facility-scoped wizard (the facility is pre-filled from context, NOT selectable). Use the full wizard spec from the previously delivered "Custom Module Integration" document for the 12 steps.
RULE: a custom module created inside a facility belongs only to that facility and appears in the Global Registry as read-only once published. No creation flow exists anywhere outside a specific facility's Modules tab.
```

---

# PART B — HIGH (14)

---

## FB-6 — Support Chat tab: functional real-time chat inside the panel

```
Fix the facility Support "Chat with Yipyy" tab (inside the floating panel, FB-3). BUG: it shows the "Start a conversation" empty state even when conversations exist, and never renders the thread. Fix: once a conversation is started, the full chat thread displays INSIDE the panel with real-time updates (reuse the WebSocket/real-time layer from original Tasks 16/84) — no page navigation, no redirect.
- If a prior unresolved conversation exists: open the panel directly into the thread view (skip the empty state), show full message history, new messages append at the bottom. An "✕ Close conversation" option at the top-right of the chat area lets the facility mark it resolved.
```

## FB-7 — Support Chat tab: message input + send; empty state only when no history

```
In the facility Support Chat tab: show the illustrated empty state with a "Start a conversation" button ONLY when no prior conversation exists. On click, expand a message input field with a Send button at the bottom of the panel. Show Yipyy Support online/offline status with a response-time hint ("We typically reply in minutes"). Sent and received messages appear inline in the panel — no page navigation. (Pairs with FB-6.)
```

## FB-8 — Submit a Ticket tab: confirmation state after submit

```
Fix the facility Support "Submit a Ticket" tab. BUG: the form (Subject, Category, Description, Attachment) submits into a void — no confirmation, no way to see submitted tickets. On successful submission, replace the form with a confirmation state inside the panel showing: the ticket number, "We'll email you at [facility email] when we respond", and two buttons — "View my tickets" (→ /facility/support/tickets) and "Done" (closes the panel). Create the /facility/support/tickets page if it doesn't exist (list of the facility's tickets with number, subject, status, date).
```

## FB-9 — Submit a Ticket tab: My Tickets sub-section

```
At the bottom of the facility Support "Submit a Ticket" tab (below the form), add a "My Tickets" sub-section showing the facility's last 3 open tickets as compact rows: ticket number, truncated subject, status badge (Open / In Progress / Resolved). A "View all" link at the bottom goes to /facility/support/tickets (FB-8).
```

## FB-10 — Help & FAQs tab: clickable articles (expand inline / open in new tab)

```
Fix the facility Support "Help & FAQs" tab. BUG: article rows (category label + title) do nothing on click. Make each row clickable: on click, animate open an expanded in-panel view showing the article's full content, with a "← Back" link at the top to return to the list. Also add an "Open in Help Center" link at the bottom of each expanded article that opens the full knowledge base (original Task 57) in a new tab. Content comes from the Knowledge Base Admin (original Task 56).
```

## FB-11 — Help & FAQs tab: real-time search + no-results state

```
Make the search bar at the top of the facility Support "Help & FAQs" tab functional. As the user types, filter the article list in real time, matching against article titles AND category names. If nothing matches, show "No articles found — try different keywords" plus a "Contact Support" link that switches to the Chat tab (FB-6).
```

## FB-12 — Dashboard HQ View: distinct styling for custom-module check-in chips

```
In the facility Dashboard HQ View, the "Today's Check-ins" row shows service filter chips (Daycare, Boarding, Grooming, Training, Yoda's Splash, Paws Express, Birthday Pawty). BUG: custom modules ("Yoda's Splash", "Paws Express", "Birthday Pawty", etc.) look identical to standard services. Fix: keep standard service chips as-is; render custom-module chips with the same chip shape but a small star (★) or custom-module icon prefix and a slightly different background shade (e.g. soft teal vs. standard gray/white). Add a legend line below the chip row, shown ONLY when custom modules are present: "★ Custom module". Detect custom vs. standard from the module type, not a hardcoded name list.
```

## FB-13 — Facility header UX cleanup / rebalance

```
After the Support button is removed from the facility header (FB-1), rebalance the header: distribute the remaining items evenly — phone icon, messages icon, clipboard/tasks icon, alerts, unified notifications, user avatar. All already exist; just redistribute spacing so nothing competes.
RULE: the header stays single-height on desktop and must not wrap or compress any icon at 1280px and above. At narrower (tablet) viewports, collapse secondary items into an overflow menu.
```

## FB-14 — Facility Portal: Documents page (Yipyy Agreements + My Waivers)

```
Add a facility-portal "Documents" item to the sidebar (or within Settings) → a page with two tabs:
- "Yipyy Agreements" (READ-ONLY): platform agreements, terms, amendments uploaded by Yipyy Super Admin. Facility can view/download only.
- "My Waivers" (facility-managed): the facility can upload, rename, and delete their own customer-facing waiver PDFs (grooming liability waivers, boarding intake forms, training contracts) for storage/reference.
Each document row: Name, Type, Date Added, Download button. A search bar filters by name. Both tabs sort by Date Added (newest first by default).
RULE: no e-signature capability in the facility portal — storage and reference only. E-signature requests originate from the Super Admin side (FB-16).
```

## FB-15 — Super Admin: fix Modules tab Usage / Actions / Last Used

```
On the Facility detail page > Modules tab (completes original Task 36). BUG: the Usage, Actions, and Last Used columns render as permanent loading skeletons — not bound to any data source. Fix: each enabled module card must display Usage (times the module was accessed this month), Actions (discrete bookings/transactions created via this module this month), and Last Used (date of most recent activity), all pulled from the facility's activity log filtered by module. If a module genuinely had zero activity, show "0" and "—" — NEVER an indefinite skeleton.
```

## FB-16 — Super Admin: Agreements tab on the facility detail page

```
Add a new "Agreements" tab to the facility detail page, alongside Overview / Locations / Clients / Staff / Billing / Modules / Reports / Logs (making it the 9th tab).
It's a searchable repository of all legal documents, waivers, and agreements between this facility and Yipyy: original platform agreement, amendments, service-specific addenda, and custom legal terms accepted during onboarding. Each document row: Document Name, Type (Agreement / Waiver / Amendment / Addendum), Date Signed, Signed By (facility owner name), Version number, Download PDF button. A search bar filters by document name or type.
RULE: documents are uploaded/managed by Yipyy Super Admins only — facility owners view/download but cannot upload or delete. Show an "Upload Document" button only in the Super Admin view of this tab, plus an optional "Request Signature" button that sends a document for e-signature to the facility's primary contact. This tab's data is also the source for the global Agreements report (FB-19).
```

## FB-17 — Super Admin: Platform Health tile "View Details" link

```
On the Command Center (Home Dashboard), the Platform Health KPI tile shows a percentage but has no path forward. Add a "View Details →" link on the tile that navigates to System Configuration > System Settings, where the degraded servers are listed (original Task 25). Keep the tile's existing color logic.
```

## FB-18 — Super Admin: fix Facility Total Revenue KPI ($0.0K bug)

```
On the facility detail page, the Total Revenue KPI tile always shows $0.0K regardless of facility (data-binding bug; part of original Task 7). Fix the query to scope to the correct facility ID and the selected time period (default: last 6 months), pulling actual transaction revenue for that facility. Verify switching facilities and changing the time filter both update the value. Show a skeleton only while genuinely loading.
```

## FB-19 — Super Admin: global Agreements report in Reports & Analytics

```
In the Reports & Analytics section, add an "Agreements" report view showing which facilities have missing or expired agreements, sortable by expiry date. Columns: Facility, Agreement Type, Status (Missing / Expired / Active), Expiry Date. Source the data from the per-facility Agreements tab (FB-16). Include an Export CSV action, consistent with the other reports.
```

---

_19 tasks. Build the 5 CRITICAL (FB-1…FB-5) before the 14 HIGH (FB-6…FB-19). FB-5's 12-step wizard references the separate "Custom Module Integration" document — have that open when you run it. Paste one prompt at a time; let the agent plan, implement, typecheck, and lint before moving on._
