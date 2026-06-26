# Yipyy Super Admin — Copy-Paste Build Prompts

One prompt per master-list task (84 total). Paste them into Claude Code **in build order**: all 30 CRITICAL first, then the 54 HIGH. Each prompt is self-contained.

**Standing rules baked into every task (the agent already has these from `CLAUDE.md`, restated here so each prompt is portable):**

> Stack: Next.js 16 App Router (RSC), React 19, TypeScript, shadcn/ui (New York), Tailwind 4, next-intl, TanStack Query + TanStack Form, bun. Pages are Server Components by default — extract interactivity into small `"use client"` components. Use the `DataTable` component for all tables. Wrap data in TanStack Query factories in `src/lib/api/<domain>.ts` (never import mock data into components directly). Keep files under ~500 lines. Use `next/dynamic` for modals/charts. No hardcoded numbers in production — show a loading skeleton when the backend isn't ready, never a fake value. Conventional commits. Plan before coding, typecheck and lint after.

---

# PART A — CRITICAL (build all 30 before any HIGH)

---

## Task 1 — Rebuild Home Dashboard
```
Rebuild the Home Dashboard at /admin/dashboard as an operational command center (not charts + hardcoded data). Server Component page; extract interactive pieces into client components. Four zones:

ZONE 1 — Business Health Tiles (top row, 5 tiles, each clickable):
- Active Facilities: COUNT of facilities with status Active OR Trial. Show delta vs last month. Click → Facilities list.
- MRR: SUM of all active subscription monthly amounts. Delta vs last month. Click → Subscriptions.
- Open Support Tickets: COUNT of tickets Open/In Progress/Escalated. If any SLA-breached, show a red sub-label "X SLA breached". Click → Support Tickets.
- Trials Expiring in 7 Days: COUNT of Trial facilities with trial_end_date <= today+7. Amber if > 0. Click → Trials.
- Platform Health: % from infrastructure health checks. Green=100%, amber if any degraded, red if any down. Click → System Status.

ZONE 2 — Needs Attention panel (full-width, heading "Needs Attention"), four expandable sub-sections with count badges:
- Overdue Invoices (facility + amount + days overdue + "Send Reminder" button)
- Pending Facility Requests (name + date + "Review" button)
- SLA-Breached Tickets (ticket ID + facility + hours over + "Open Ticket" button)
- Facilities At Risk (name + risk reason + "Reach Out" button). At-risk = last login >14 days OR booking volume this month <50% of last month OR any overdue invoice.

ZONE 3 — Activity Feed: last 15 significant platform events from past 24h. Each row: colored dot, plain-English description, facility name as link, relative timestamp. Filter chips: All / Facility / Billing / Support / System. "View Full Log" link → Activity Log.

ZONE 4 — Quick Actions Bar: four large buttons — "+ Add Facility" (opens Onboarding Wizard), "Find Facility" (global search modal), "Create Announcement" (composer), "Run Data Import" (import wizard).

All values from TanStack Query factories; loading skeletons where backend isn't ready. No hardcoded numbers.
```

## Task 2 — Make "+ Add Facility" open the Onboarding Wizard
```
On /admin/facilities and the Home Dashboard Quick Actions, wire the "+ Add Facility" button to open the 6-step Facility Onboarding Wizard as a full-screen overlay (see Task 3). For now it can mount the wizard component; ensure the trigger works from both locations. Lazy-load the wizard via next/dynamic.
```

## Task 3 — Build Facility Onboarding Wizard (6-step full-screen overlay)
```
Build a 6-step full-screen modal overlay Facility Onboarding Wizard. Step progress bar at top. Use TanStack Form + Zod per step. Steps:

1. Business Information: Facility Legal Name, Display Name, Address (autocomplete), City, Province, Postal Code, Country, Time Zone, Phone, Website, Business Type checkboxes (Boarding, Daycare, Grooming, Training, Veterinary, Retail), "How they heard about Yipyy" dropdown.
2. Plan & Trial: tier selection cards (name, price, included modules), billing cycle toggle Monthly/Annual, Trial toggle with date picker (default +14 days), Promo code field.
3. Services & Pricing: checkbox per service; for each checked service a Base Price input + Additional Animal Fee; Tax Rate field with jurisdiction note.
4. Operating Configuration: Mon–Sun schedule grid with open/closed toggle + time pickers, check-in/out times per service, booking cut-off time, deposit toggle + percentage.
5. Primary Admin Account: First Name, Last Name, Email. Note "Welcome email with login link will be sent on creation." Role = Facility Admin (auto-set).
6. Review & Create: summary of all data with per-section Edit links, "Create Facility" button, success screen with "View Facility Profile" button.

RULE: wizard state must persist across Back/Forward navigation (going back to Step 1 from Step 5 must NOT clear Steps 2–5). Validate on Continue click with inline errors — do NOT proactively disable the Continue button.
```

## Task 4 — Pending Requests page (Approve/Reject flow)
```
Build /admin/facilities/requests — a full page for pending facility applications. Amber banner: "X applications awaiting review." DataTable columns: Business Name, Primary Contact, Email, Business Types requested, Plan Interest, Date Applied. Per row: "Approve" (primary) and "Reject" (outlined).
- Approve → opens the Onboarding Wizard overlay PREFILLED with applicant data.
- Reject → modal with Reason dropdown + optional message + "Send Rejection Email" checkbox.
Also ensure the Facilities List "View Requests" eye button navigates here.
```

## Task 5 — Facility Profile Billing tab (subscription management)
```
Build the Billing tab at /admin/facilities/[id] (Billing). Three stacked sections:
1. Current Subscription: plan name, billing cycle (Monthly/Annual), amount, next renewal date, start date, active discounts/credits. Action buttons: Change Plan, Apply Credit, Apply Discount, Pause Subscription, Cancel Subscription.
2. Invoice History: DataTable — Invoice #, Period, Amount, Status badge (Paid/Overdue/Draft/Void), Date Issued, Date Paid, Download PDF link. Paginated 10/page. "View All" link.
3. Payment Method: card on file (type icon + last 4 + expiry) + "Update Card" button.

Change Plan modal: all tiers as comparison cards, select new tier + effective date (immediately or next renewal), preview of features gained/lost, Confirm. Cancel Subscription modal: reason dropdown, effective date, internal notes, red "Confirm Cancellation" → facility status becomes Cancelled. All values from real queries.
```

## Task 6 — Facility Profile Setup Checklist (Overview tab)
```
In the Facility Profile Overview tab (/admin/facilities/[id]), add a "Setup Progress" checklist card ABOVE the Contact Information section. Show 7 items, each with a green checkmark or red X: Services configured, Pricing set, Tax rate set, Staff account created, Payment method connected, First booking made, Marked Active by Yipyy admin. Each red-X item has a "Fix This" link that navigates to the specific tab/section. Derive each item's state from real facility data. This mirrors the facility-side onboarding checklist (Task 30).
```

## Task 7 — Connect all Facility Profile data to real DB queries
```
Across the Facility Profile (/admin/facilities/[id]) Overview, Reports, and Logs tabs, replace ALL hardcoded values with real computed queries via TanStack Query factories in src/lib/api/facilities.ts:
- Overview KPI tiles: Total Revenue = SUM of completed payments (last 6 months); Staff Members = COUNT active staff; Active Clients = COUNT active clients; Locations = COUNT branches.
- Reports tab: Total Revenue, Total Bookings, Active Clients, Avg Booking Value, all charts — real values for the selected facility + date range; verify the date filter actually updates charts/KPIs.
- Logs tab: pull from the correct facility's log records (not shared/hardcoded).
Show loading skeletons where backend isn't ready. Use the real facility ID from the route, never a hardcoded "1".
```

## Task 8 — Subscription Tier editor (full CRUD)
```
Build /admin/commercial/tiers. Tier cards at top (one per tier), feature comparison matrix below. "Edit" on a card opens a right-side drawer with sections:
- Identity: name, description, status toggle, public visibility toggle.
- Pricing: monthly price, annual price (auto-calculated discount %).
- Included Modules: checkboxes for every module.
- Platform Limits: max staff, max clients, max locations, max bookings/month, storage GB (0 = unlimited).
- Transaction Fee (%).
Save button at bottom. "+ Create New Tier" button top right.
RULE on save: confirm "This will immediately update permissions for all [X] facilities on this tier. Continue?" before persisting.
```

## Task 9 — Invoice system (list, detail, manual payment, auto-gen)
```
Build /admin/commercial/invoices. KPI tiles: Total Invoiced (month), Collected, Outstanding, Overdue (red if >0). Filter tabs: All / Paid / Sent / Overdue / Draft / Void. Date range picker. DataTable: Invoice #, Facility, Plan, Amount, Status, Issued Date, Due Date, Paid Date. Row click → Invoice Detail drawer with: line-items table (subscription fee, add-ons, taxes, discounts, total), payment history, action buttons (Download PDF, Send Email, Void, Record Manual Payment). "+ Create Invoice" top right.
Record Manual Payment modal: Payment Date, Method (Bank Transfer/Cash/Check/Other), Reference Number → marks invoice Paid.
Auto-generation: system creates Draft invoices at each billing-cycle start; super admin reviews; after a 24h window auto-send if not reviewed.
```

## Task 10 — Dunning email sequence (Day 1/7/14 → auto-suspension)
```
Build the dunning sequence for overdue invoices: automated emails at Day 1, Day 7, and Day 14 past due (use the "Invoice Overdue — Day 1/7/14" email template). On Day 14 the facility is flagged for suspension. Implement as scheduled/queued jobs keyed off invoice due dates, idempotent (don't double-send). Surface the flag in the Needs Attention panel and on the Facility Profile. Wire to the email-template system (Task 55).
```

## Task 11 — Trials page (extend/convert/cancel/nudge)
```
Build /admin/commercial/trials. KPI tiles: Total Active Trials, Expiring in 7 Days (amber), Conversion Rate This Quarter. DataTable sorted by Days Remaining ascending: Facility Name, Plan, Trial Start, Trial End, Days Remaining (green >7 / amber 3–7 / red <3). Per-row actions:
- Extend: date-picker modal + required reason.
- Convert to Paid: tier selection + billing setup modal.
- Cancel Trial: confirmation.
- Send Nudge: pre-filled email compose modal.
Automated emails at 14/7/3 days before trial_end_date without admin action (use templates). On trial_end_date: status → Trial Expired, access restricted to read-only.
```

## Task 12 — Data Import Wizard (6-step; MoeGo + Gingr parsers first)
```
Build /admin/platform/import. Import History DataTable: Facility, Source Software (with logo), Date, Customers/Pets/Bookings imported, Status, Imported By. "+ Start New Import" opens a 6-step full-screen Import Wizard:
1. Select Source: grid of platform cards — MoeGo, Gingr, PawPartner, ProPetware, 123PetSoftware, Kennel Connection, Generic CSV, Excel. Each: logo, name, importable data, "Download Export Guide" link.
2. Select Facility: full-width search "Which facility is this import for?"; show prior import history for the chosen facility.
3. Upload File: drag-and-drop zone, accept CSV/XLSX, max 50MB, preview first 5 rows, multi-file upload for platforms with separate customer/appointment files.
4. Map Fields: two-column table (file columns ↔ Yipyy destination field dropdowns); known platforms auto-mapped; required-but-unmapped highlighted red; skip option per column.
5. Validate: summary green (clean) / amber (warnings, will import) / red (errors, will skip); expandable error detail table; "Download Error Report CSV"; default radio "Import clean rows, skip errors".
6. Import & Complete: progress bar with live record count; success screen with counts; "Download Import Report"; "Undo Import" (available 24h); "View Facility Profile".
Implement MoeGo and Gingr column parsers first (others in Task 44).
```

## Task 13 — Facility-Side Yipyy Support button (persistent top nav)
```
Add a persistent "Yipyy Support" button to the FACILITY dashboard top navigation bar, on every page, between the notification bell and the user avatar. Headset icon + "Support" label. Clicking opens a Support Center right-side drawer (NOT a new page — the facility stays where they are). The drawer has three tabs: "Chat with Yipyy", "Submit a Ticket", "Help & FAQs" (built in Task 14). Implement the persistent button + drawer shell here.
```

## Task 14 — Facility Support Drawer (Chat / Submit Ticket / Help & FAQs)
```
Build the three tabs inside the facility Yipyy Support drawer (from Task 13):
- Chat with Yipyy: shows last 5 messages of any open chat with Yipyy support; if none, a "Start a conversation" button with greeting; text input at bottom to send; messages appear in real-time (WebSocket or polling). Agents reply from the admin Support Chat Inbox (Task 15).
- Submit a Ticket: short form — Subject, Category (Technical Issue / Billing Question / Feature Request / Account Help / Other), Description, optional file attachment, Submit.
- Help & FAQs: searchable list of help articles/FAQs; search filters in real time (feeds from Task 57).
```

## Task 15 — Support Chat Inbox (super admin, two-panel)
```
Build /admin/support/chat — a two-panel messaging interface modeled on the facility Messaging module.
LEFT panel (~380px): inbox list header with "+ New Conversation"; filter chips All / Unread / Mine / Priority; search "Search by facility name, email…". Each item: facility logo avatar, facility name, truncated last-message preview, channel badge (Chat), time. Unread items: bold name + blue unread count badge; conversation moves to top on new message.
RIGHT panel: active conversation thread — facility name + contact at top with status indicator (Online/Away); facility messages left (their logo), Yipyy replies right; each message sender name + timestamp + body; file attachments as chips; a "Facility / Internal Notes" toggle (internal notes yellow tint); reply composer with "Send via Chat" tab and INSERT shortcuts (Booking link, Knowledge Base article, File attachment); "Assign to Agent" dropdown top-right; status control Open / Pending / Resolved.
RIGHT sidebar within conversation (~280px): Facility Info card (name, plan, primary contact, account health), Quick Stats (open tickets count, last support contact date), Quick Actions (View Facility Profile, Open a Ticket for this Facility, View Billing).
RULE: a conversation is linked to a facility account; all messages stored permanently and visible in the facility's Logs tab.
```

## Task 16 — Real-time chat delivery (facility drawer ↔ admin inbox)
```
Implement real-time chat delivery between the facility Support drawer (Task 14) and the admin Support Chat Inbox (Task 15) using WebSockets (or Pusher/Ably). A facility message appears immediately in the agent's inbox; an agent reply appears immediately in the facility drawer. Unread handling: new facility message shows a blue unread count badge, moves the conversation to the top, and posts a notification to the agent's notification bell. Unassigned conversations appear under the "Unassigned" filter. (See also Task 84 for the shared WebSocket connection.)
```

## Task 17 — Support Calling: Live tab (Call Queue + Unanswered)
```
Build /admin/support/calling with the page shell and Live tab. Page title "Yipyy Support Calls", subtitle "Phone support for facilities". Four KPI tiles: System Status (Online/Offline green/red), Missed (amber if >0), Voicemails (amber if >0), Today (inbound + outbound). Tab bar: Live, Dialer, Call Log, Voicemail, Recordings, IVR & Routing, Analytics, Settings.
Live tab, two stacked sections:
- Call Queue (if calls waiting): each queued call — caller ID/facility name, wait time ("40s waiting"), facility badge if recognized, green "Answer" button.
- Unanswered Calls: each — caller ID, facility name, missed time, auto-SMS-sent indicator, "Call Back" + "Mark as Handled" buttons, status badges Unresolved (red) / Called Back (green) / Pending.
Caller lookup: match calling number against facility phone numbers DB; show facility name + badge if recognized, else "Unknown Caller".
```

## Task 18 — Support Calling: IVR & Routing tab
```
Build the IVR & Routing tab at /admin/support/calling.
LEFT panel: IVR Auto-Attendant (Active badge + Enabled toggle top-right); Main Greeting textarea (editable script, show character count + read-time estimate); After-Hours Message textarea; Hold Music dropdown.
RIGHT panel: Menu Options with "+ Add Option". Each option row: drag handle (reorder), number (1–9, 0), label, routing destination (Route to Staff / Route to Department / Send SMS Link / Play Recording). Smart Routing Rules section below: reorderable rules with drag handles; each rule — number, name, condition (e.g. "Client tag includes VIP → Route to Management"), enabled toggle, edit + delete icons.
"Preview IVR" + "Save IVR Configuration" buttons at bottom.
Default menu: 1 Technical Support→Technical Team, 2 Billing & Payments→Finance Team, 3 Account & Onboarding→Onboarding Team, 4 Feature Requests→Product Team, 0 Speak with an Agent→Available Agent. Smart rules run BEFORE the IVR menu.
```

## Task 19 — Configure Twilio integration (support phone number)
```
Configure the Twilio integration that powers the Section 5 calling module. Add a Twilio config (Account SID, Auth Token, Support Phone Number(s), Twilio webhook URLs) — surfaced prominently in System → Integrations (see Task 72). Wire inbound-call webhooks to the Live tab queue (Task 17) and IVR routing (Task 18), and outbound to the Dialer (Task 48). Store credentials securely (masked in UI). This is a prerequisite for all calling features to function.
```

## Task 20 — Ticket Detail page
```
Build /admin/support/tickets/[id] — two-column layout.
LEFT (65%):
- Ticket Header: Ticket ID (gray small), Subject (large bold), editable metadata row — Status dropdown, Priority dropdown, Category dropdown, Assigned To dropdown, SLA deadline countdown timer (turns red when <1h remaining).
- Conversation Thread: chat-style; facility messages left (their avatar), Yipyy replies right; each message sender name + role + timestamp + body (rich text), attachments as downloadable chips; a "Notes / Conversation" toggle — Internal Notes show yellow background + lock icon, never visible to facility.
- Reply Box: rich text editor; "Reply to Facility" vs "Add Internal Note" radio (background yellow for notes); "Send Reply" + "Reply & Resolve" buttons.
RIGHT (35%): Facility Context Panel (logo, name linked to profile in new tab, plan badge, contact info, health indicator — Active/Trial Expiring/Invoice Overdue); Ticket Details Card (all metadata in editable form + Save); Recent Tickets mini-list (last 5 from this facility, clickable).
SLA countdown computed from created_at + SLA target for the priority; at zero, badge → "SLA Breached" (red) and auto-escalate (alert email to SLA Config recipients + bump priority one level).
```

## Task 21 — Make ticket list rows clickable → Ticket Detail
```
On /admin/support/tickets, make every ticket row navigate to /admin/support/tickets/[id] using the real ticket ID. This is the top-priority fix for the support module. Verify no row leads to a 404 or empty page.
```

## Task 22 — Churn & Retention report
```
Build /admin/reports/churn. KPI tiles: Monthly Churn Rate (%), Avg Customer Lifetime (months), Net Revenue Retention (%). Churn Rate Trend: 12-month line chart. Cohort Retention Table: rows = joining cohorts (Jan 2025, Feb 2025, …), columns = months after joining (1/2/3/6/12), cells = % still active, color-coded green (>80%) to red (<50%). Churned Facility Log: DataTable of churned facilities — tier, tenure, MRR lost, reason, date churned + Export CSV. All real computed values. Lazy-load charts via next/dynamic.
```

## Task 23 — Financial Reports
```
Build /admin/reports/financial:
- Revenue Summary: month-by-month table — Subscription Revenue, Transaction Fees, One-Off Charges, Total.
- Invoice Aging: bar chart (Current / 1–30 / 31–60 / 61–90 / 90+ days overdue) with an underlying invoices table below.
- Credits & Discounts Ledger: all credits/discounts in period + total cost to Yipyy.
- Transaction Fee Revenue: platform fee collected per facility per month.
- Tax Summary: taxes collected by jurisdiction.
All real computed values; charts via next/dynamic.
```

## Task 24 — Business Overview report
```
Build /admin/reports/business. KPI tiles: MRR, ARR (MRR×12), Active Facilities, Avg Revenue Per Facility, Net Revenue Retention (%). A date-range selector controls all charts.
- MRR Trend: 12-month line chart with 4 lines — New MRR, Expansion MRR, Churned MRR, Net MRR.
- Revenue by Tier: donut chart (% of MRR per tier).
- Facility Growth: cumulative active-facility count over time.
- Revenue Forecast: 3-month forward projection table.
All real computed values, no hardcoded data; charts via next/dynamic.
```

## Task 25 — Wire System Status to real health checks
```
On /admin/system/status, make every status value come from real infrastructure health checks. If monitoring isn't connected yet, show a "Monitoring not configured" placeholder — NOT fake green dots. Auto-refresh every 60s with a "Last updated: [time]" label. Show an alert banner at the top if any component is Degraded or Down. Also add per-server drill-down: clicking a server row opens an accordion with a 24h CPU/memory trend chart and the last 50 error log entries for that server.
```

## Task 26 — Enforce Audit Log immutability
```
Enforce Audit Trail immutability at both UI and database level: write-once, append-only. No edit/delete/modify on any audit-log entry for ANY role, including Super Administrator. Remove/disable any UI affordance that would mutate audit entries, and add a DB-level constraint/trigger preventing UPDATE and DELETE on the audit table. The Audit Trail tab is strictly READ ONLY.
```

## Task 27 — Replace ALL hardcoded placeholder data with real DB values
```
Sweep the entire admin panel and replace every hardcoded/placeholder number, chart series, and table with real DB-computed values via TanStack Query factories. Where the backend isn't ready for a specific data point, render a loading skeleton — never a fake number. Produce a checklist of every location changed. This is the global rule from the spec; treat any remaining hardcoded value as a bug.
```

## Task 28 — Global Search (top nav, "/" shortcut)
```
Build a global search bar in the super admin top navigation. After 2+ characters, show a dropdown of results across all entities, grouped by type with an icon: Facilities (name/city/email), Invoices (number/amount), Support Tickets (ID/subject), Team Members (name/email), Announcements (title). Enter or click navigates to the item. Pressing "/" anywhere in the admin panel focuses the search bar. Debounced queries via TanStack Query.
```

## Task 29 — Facility-Side Subscription Self-Service Portal
```
Build the facility-side billing self-service at /facility/settings/billing: Current Plan display (name, price, renewal date, what's included); "Upgrade Plan" (higher tiers with feature comparison); "View All Invoices" (past invoices + PDF download); "Update Payment Method" (Stripe card update form); "Cancel Subscription" (multi-step: reason → confirmation → access ends at billing-period end); credit balance display. Notify the Yipyy super admin of every self-service action (upgrade, cancel, card update) via the Activity Feed AND an email alert.
```

## Task 30 — Facility Onboarding Checklist (7-step guided)
```
Build /facility/onboarding — a guided 7-step checklist shown to new facilities, displayed as a persistent banner in the facility dashboard until all steps complete (or dismissible after ≥5 of 7 done). Steps: (1) Complete business profile (logo, description, address); (2) Set up services + pricing; (3) Configure operating hours; (4) Add first staff member; (5) Connect a payment method; (6) Make first booking (test); (7) Set up customer portal (booking URL + branding). Each step: status (Complete/In Progress/Not Started), brief description, "Start"/"Continue" button → relevant section. Progress bar with overall %. Mirror this progress into the Facility Profile Overview setup checklist (Task 6).
```

---

# PART B — HIGH (build after all CRITICAL)

---

## Task 31 — Add MRR and Last Login columns to Facilities List
```
On /admin/facilities, add two columns between "Active Clients" and "Day Joined": MRR (monthly subscription revenue for this facility, from subscription records) and Last Login (most recent login by any staff member). Real computed values. Keep the existing DataTable columns intact (Facility Name+address, Status, Plan, Business Type tags, Total Users, Active Clients, Day Joined).
```

## Task 32 — Fix "View Requests" button navigation
```
On /admin/facilities, ensure the "View Requests" eye button (in the pending-requests banner) navigates to /admin/facilities/requests. Verify it does not lead to a 404 or empty page; fix the link if broken.
```

## Task 33 — Fix search and filter controls on Facilities List
```
On /admin/facilities, add a working search bar (real-time filter by facility name, city, or email) and a filter panel (triggered by the existing filter icon): Status multi-select, Plan multi-select, Business Type multi-select, with Apply + Clear buttons. Enable sort by any column header. Add an "Export CSV" button for the filtered view. Confirm each row navigates to /dashboard/facilities/[realId] using the real facility ID, not a hardcoded "1".
```

## Task 34 — Facility Profile Clients tab (read-only)
```
Build the Clients tab at /admin/facilities/[id] (Clients): a searchable DataTable of all clients under this facility — Client Name, Pet Name(s) (up to 2, "+N more"), Contact (email/phone), Status (Active/Inactive), Joined Date, Last Visit, Total Spent. Search bar + Status filter dropdown. VIEW ONLY — no editing. Row click opens a read-only client profile drawer (full details, pet records, booking history). RULE: super admin can view but not edit client data here.
```

## Task 35 — Facility Profile Staff tab
```
Build the Staff tab at /admin/facilities/[id] (Staff): DataTable of staff accounts — Avatar+Name, Email, Role badge, Status (Active/Inactive/Invited), Last Login. Per-row "..." menu: Reset Password (sends reset email), Change Role (dropdown), Deactivate (confirmation). "+ Add Staff Account" top right opens a modal (First Name, Last Name, Email, Role) that creates the account and sends an invitation email; account shows "Invited" until setup completes.
```

## Task 36 — Fix Modules tab "Manage Modules" drawer
```
On the Facility Profile Modules tab (/admin/facilities/[id]), wire the existing "Manage Modules" button to open a drawer where the super admin can, per module: toggle Enabled/Disabled, set a Price Override (blank = tier default; a Custom badge auto-appears when overridden), and see which modules are tier-included vs add-ons. Save applies immediately. Keep the existing module-card layout. Ensure each card's usage stats (bookings, profiles, messages, etc.) come from real per-facility usage data, not hardcoded values.
```

## Task 37 — Fix Locations tab (detail drawer + Add Location)
```
On the Facility Profile Locations tab (/admin/facilities/[id]), make the per-row chevron open a Location Detail right-side drawer showing: location name, address, phone, operating hours, services offered, staff assigned — plus an Edit button in the drawer header. Add a "+ Add Location" button (top right) opening a modal (Location Name, Address, Services checkboxes, Phone) that creates the location. Keep the existing table layout.
```

## Task 38 — Fix Reports tab "Generate Report" output
```
On the Facility Profile Reports tab (/admin/facilities/[id]), wire the "Generate Report" button to open a modal where the admin selects report type (Revenue Summary, Client Retention, Service Utilization, Staff Performance, Booking Trends) and a date range, then generates and downloads a real PDF or CSV of that report for this facility.
```

## Task 39 — Fix Logs tab search + filter
```
On the Facility Profile Logs tab (/admin/facilities/[id]), make the "Search logs..." input functional (filter by actor name, event type, or keyword in description) and make the "All Types" filter dropdown actually filter the log list by event type (Booking, Payment, Security, System, etc.). Keep the existing KPI tiles and charts.
```

## Task 40 — Facility Impersonation
```
Build facility impersonation from the Facility Profile. The "Impersonate" button opens a confirmation modal; on confirm, open the facility's own dashboard (/facility/dashboard) in a NEW browser tab using a temporary impersonation token. Show a persistent amber banner at the top of every page in that tab: "Yipyy Admin Mode — You are viewing [Facility Name] as [Admin Name]. [ Exit ]". Log every action during the session in the audit trail as "[Admin Name] via impersonation of [Facility Name]". Send the Impersonation Notice email to the facility primary admin on session start.
```

## Task 41 — All Subscriptions list page
```
Build /admin/commercial/subscriptions. KPI tiles: Total Subscriptions, Active, Trial, Past Due (red if >0), Paused. Filter tabs: All / Active / Trial / Past Due / Paused / Cancelled. DataTable: Facility Name, Plan badge, Billing Cycle, MRR, Status badge, Next Renewal, Auto-Renew toggle. Row click → that facility's Billing tab. "Export CSV" button.
```

## Task 42 — Credits & Discounts page
```
Build /admin/commercial/credits. KPI tile: Total Outstanding Credit Balance (Yipyy liability). Filter tabs: All / Active Credits / Active Discounts / Expired. DataTable: Facility, Type badge, Amount or %, Reason, Applied By, Applied On, Expiry, Status.
- "Apply Credit" modal: Facility search, Amount, Reason dropdown, internal note.
- "Apply Discount" modal: Facility search, Discount Type (% or fixed), Value, Duration, Reason, internal note.
```

## Task 43 — Feature Flags page
```
Build out /admin/platform/flags. Keep the existing Tenant Modules tab (tenant table with tier badges, enabled module counts "9/12", override indicators, last-updated). FIX: clicking a tenant row opens a right-side drawer showing that tenant's full module list as toggles, each marked tier-default or override (override shows a badge). BUILD three more tabs: Global Flags (all platform features with toggle switches, rollout %, last-changed info; toggling off warns with affected-facility count); Tier Defaults (matrix of features × tiers with checkboxes); Per-Facility Overrides (facility search → that facility's module list with individual toggles).
```

## Task 44 — Data Import parsers: PawPartner, ProPetware, Generic CSV
```
Extend the Import Wizard (Task 12) with column-mapping parsers for PawPartner, ProPetware, and Generic CSV. Auto-map known columns to Yipyy destination fields, validate, and import via the same 6-step flow. Reuse the validation/error-report and undo logic already built for MoeGo/Gingr.
```

## Task 45 — Wire AI Settings usage to real Anthropic data
```
On /admin/platform/ai, wire token usage and cost to real Anthropic API usage data; connect the Facility Access tab to show real per-facility token consumption; fix the 0/0 placeholder values. Keep the existing 3-tab structure (Platform Config, Facility Access, Usage & Billing), masked API key field, model selector, token limits, and global enable toggle. BUILD a Usage & Cost tab: KPI tiles (Total Tokens This Month, Estimated Cost, Facilities Using AI), top-10 facilities by token usage table, monthly AI cost trend chart.
```

## Task 46 — Support Ticket List (KPIs, tabs, filters)
```
On /admin/support/tickets, keep the ticket list structure (Ticket ID, Title + facility subtitle, Status badge, Priority badge, SLA Status, Assigned To). Add KPI tiles: Total Open, In Progress, Escalated, SLA Breached (red if >0). Filter tabs: All / Open / In Progress / Escalated / Resolved / Closed. Secondary filter bar: search input, Priority dropdown, Category dropdown, SLA Status dropdown. Sort by any column. Inline "Assign" click on "Unassigned" rows opens an agent dropdown without opening the full ticket. (Row navigation handled in Task 21.)
```

## Task 47 — Support Chat Scheduled Messages tab
```
Build /admin/support/chat/scheduled, modeled on the facility messaging Scheduled tab. Title "Scheduled Messages". Filter chips: All / Chat / Email. Messages grouped by date. Each card: recipient facility name, channel badge, scheduled time ("Sending now..." for due messages), message preview, "Created by [agent name]". Hover actions: Edit (opens compose modal with current content) and Cancel (removes from schedule).
```

## Task 48 — Support Calling: Dialer tab
```
Build the Dialer tab at /admin/support/calling. Heading "Outbound Dialer — Make outbound calls using the Yipyy support number". Centered numpad (1–9, *, 0, #) with a number input showing the Yipyy support-number prefix. "Clear" and green "Dial" (phone icon) buttons. Below: a "Recent Contacts" section showing the last 5 facilities called, each with a quick-redial button. Wire dialing through Twilio (Task 19).
```

## Task 49 — Support Calling: Call Log tab
```
Build the Call Log tab at /admin/support/calling. KPI row: Total Calls, Completed (green), Missed (red), Voicemails. Location filter (All / Team 1 / Team 2 if multiple numbers/teams). Search by facility name or number. Filter dropdowns: All Types, All Statuses, All Time. Call list rows: direction icon (inbound/outbound), facility avatar+name (or "Unknown Caller"), department tag (Billing/Technical/General), status badges (Completed/Missed/Voicemail), date+time. Row click → right-side detail panel: Status, Direction, Duration, Handled By (agent or AI Assistant), Inquiry department, Time, Follow-Up status dropdown, Assigned To dropdown, Call Tags (chips), Staff Notes textarea + Save, "Call Back", "Send SMS". Recognized facility names are clickable links → Facility Profile in a new tab.
```

## Task 50 — Support Calling: Voicemail tab
```
Build the Voicemail tab at /admin/support/calling. Voicemail Messages section: list with a NEW badge for unplayed; each entry — caller ID + facility name, date+time, duration, AI-transcribed text below the caller info, Play button (audio playback), Call Back button, Pending/Resolved status badge. Greetings section below: four greeting cards — Main Greeting (Active, Auto-managed badge), After Hours, Holiday Season, Temporary Closure; each with a pencil edit icon opening a text editor for that greeting script; the active greeting shows a filled radio. AI transcription via a speech-to-text service, displayed below the caller info.
```

## Task 51 — Support Calling: Recordings tab
```
Build the Recordings tab at /admin/support/calling. "Needs Review" section at top (amber): calls flagged by AI for low sentiment or complaint-related words; each entry — caller + date, reason (Low AI sentiment / Mentions "complaint"), "Clear Flag" button. Below: full recordings list with filter dropdowns (All Staff, All Time, QA Scored); table — agent avatar, facility name+number, QA score badge (e.g. 4.5/5), duration, date+time, Flagged badge, Play button. Storage note: "AES-256 encrypted — 90-day retention". RULE: recordings require consent — show a notice that recording is enabled and callers are informed (also part of the IVR greeting).
```

## Task 52 — Support Calling: Analytics tab
```
Build the Analytics tab at /admin/support/calling. Key metric: Missed Call Recovery Rate (% of missed facility calls called back and resolved) + an 8-week weekly recovery trend line chart. KPI tiles: Total Calls, Missed Call Rate %, Avg Queue Wait, Avg Call Duration, Voicemail Rate, Follow-Up Completion Rate, Avg AI Sentiment Score. Call Outcome Breakdown donut: No Answer / Issue Resolved / Info Provided / Left Voicemail / Complaint Logged. Location + date-range filters. Call Tag Frequency: horizontal bar chart of category-tag usage. AI Sentiment scored 1–10 per recorded call; <5 triggers the Needs Review flag (Task 51); average shown here.
```

## Task 53 — Support Calling: Settings tab
```
Build the Settings tab at /admin/support/calling. Sections: Business Phone Number (Yipyy support number + Active status); Port Your Number; Call Dispatch Mode (selection cards — Ring All Agents, Round-Robin [recommended default], Specific Team, Priority-Based); Call Availability (agent status toggles Available/Busy/Away with auto-reset timeout); Ring & Alert Settings (ringtone, visual flash, desktop+mobile sync toggles); Call Forwarding (mode selector, forwarding number); Ring Duration slider (time before voicemail); Recording toggles (Auto-Record All Calls, Auto-Transcribe, Compliance Notice); Missed Call Auto-Response SMS (toggle + template editor); Business Hours (Mon–Sun grid with open/closed toggles + time pickers); Staff Permissions (table of which agents can access which calling features).
```

## Task 54 — Announcements composer
```
Build /admin/support/announcements. Keep the existing list (Title, Status, Priority, Target columns; tabs All/Published/Scheduled/Drafts/Archived) if present. Build a full composer PAGE (not a modal): LEFT (60%) — Title input + rich text body editor. RIGHT (40%) — Priority selector (Normal/High/Urgent), Target selector (All Facilities / By Plan Tier / By Business Type / Specific Facilities search), Delivery method checkboxes (In-platform / Email / Both), Scheduling (Now or future date+time), Auto-archive after X days. Preview + Save Draft + Publish buttons. Delivery behavior: Urgent = full-width red dismissible banner on every facility page until dismissed; High = yellow notification bell badge; Normal = notification dropdown only.
```

## Task 55 — Email Templates page
```
Build /admin/support/email-templates. LEFT sidebar: template list grouped by category (Onboarding, Trial Lifecycle, Billing, Account Management, Support). RIGHT: editor — Subject Line input, rich text body editor, Merge Tags panel (clickable chips that insert into the editor), Preview tab with "Send Test Email", Save Changes. Seed these templates with their trigger + recipient:
Facility Welcome (onboarding wizard completion → primary admin); Trial Expiry 14/7/3 Days (automated → primary admin); Trial Expired (on trial_end if not converted → primary admin); Invoice Generated (billing cycle start → billing contact); Invoice Overdue Day 1/7/14 (automated dunning → billing contact); Account Suspended (on suspension → primary admin); Password Reset (on request → requesting staff); Staff Invitation (on account creation → invited staff); Impersonation Notice (on session start → primary admin); Data Import Complete (on job completion → super admin who triggered); Support Ticket Opened (on create → primary admin); Support Ticket Reply (on Yipyy reply → primary admin); Ticket Resolved (on resolve → primary admin); Support Chat Initiated (on chat start → assigned agent notification).
```

## Task 56 — Knowledge Base Admin
```
Build a Knowledge Base Admin under Support Operations in the super admin panel: a content management interface for Yipyy staff to create, edit, and publish help articles. WYSIWYG editor. Category management. Article status: Draft / Published / Archived. Show view count and helpfulness score per article. This content feeds the facility-side Help Center (Task 57).
```

## Task 57 — Facility-Side Help Center
```
Build /facility/help — a searchable help center accessible from the facility dashboard (Help & FAQs tab in the Yipyy Support drawer, Task 14). Articles organized by category: Getting Started, Bookings & Scheduling, Clients & Pets, Payments & Invoicing, Staff Management, Calling & Messaging, Reports, Account Settings. Search bar filters articles in real time. Each article: title, category badge, estimated read time, body with screenshots, a "Was this helpful?" thumbs up/down, and a "Still need help? Chat with support" button that opens the chat tab. Pull content from the Knowledge Base Admin (Task 56).
```

## Task 58 — Fix Invite Admin flow (real email + Pending status)
```
On /admin/team, fix the Invite Admin flow to send a real email. Modal: Name, Email, Role, Department → sends an invitation email with a time-limited setup link (48 hours). The new member shows "Invited"/"Pending" status in the table until setup completes. Keep the existing table structure (Name, Email, Role, Department, Status, Last Login) and user detail modal.
```

## Task 59 — Fix Role permissions editor (interactive + saveable)
```
On /admin/team/roles, make the permission checkboxes editable. The "Edit" button on a role card opens the role editor with all checkboxes interactive. Save updates permissions for all members in that role, with a confirmation warning before saving: "This will affect [X] team members." Keep the existing role-card layout (name, description, member count, permission preview badges).
```

## Task 60 — Create Role + Duplicate Role
```
On /admin/team/roles, add a "Create Role" button and a "Duplicate role" button. The Role Editor organizes permissions by category: Tenant Management, Commercial & Billing, Platform Control, Support Operations, Team & Access, Reports & Analytics, System & Security. Duplicating copies an existing role's permission set as a starting point.
```

## Task 61 — Support-specific permissions in Role editor
```
Add these as separate, individually toggleable permissions in the Role Editor (under Support Operations): Can answer support calls, Can manage chat inbox, Can assign/escalate tickets, Can configure IVR, Can access call recordings, Can process GDPR requests.
```

## Task 62 — Activity Log search/filter/CSV export
```
On /admin/team/activity-log, wire all data to real logged actions from the DB. Keep the 3-tab structure (Activity Log, Login History, Audit Trail). Build a search + filter bar: Team Member dropdown, Action Type dropdown, Target Facility search, Date Range picker. Add an "Export CSV" button on the Audit Trail tab. RULE: the Audit Trail tab is READ ONLY — no edit/delete/modify on any entry, any role (see Task 26).
```

## Task 63 — Facility Performance report
```
Build /admin/reports/facilities. Top Facilities by MRR: ranked table (Facility, Plan, MRR, % of total revenue, MRR growth vs last month). Feature Adoption chart: horizontal bars — per module, % of facilities with it enabled and % actively using it. Login Frequency Distribution: bar chart (Daily/Weekly/Monthly/Rarely/Never buckets). Booking Volume Trend: platform-wide weekly bookings over 12 months. Real values; charts via next/dynamic.
```

## Task 64 — Support Analytics report
```
Build /admin/reports/support. KPI tiles: Avg First Response Time (hrs), Avg Resolution Time (hrs), SLA Compliance Rate %, Chat Response Time (min), Call Answer Rate %. Ticket Volume: stacked bar chart by priority per week. Resolution Time Trend: line chart. Chat Volume: messages/day over 30 days. Call Metrics: missed-call rate, avg call duration, recovery-rate trends. Top Issue Categories: horizontal bar chart. Agent Performance table: per agent — tickets resolved, avg resolution time, SLA compliance, chat messages handled, calls taken. Unifies tickets + chat + calls.
```

## Task 65 — Platform Usage report
```
Build /admin/reports/usage. Daily Active Users (facility staff): 30-day rolling line chart. Module Usage: table of all modules — enabled count, actively-using count, usage rate %. API Volume: request count + response time trend. AI Usage & Cost: token consumption by facility (top 10) + platform AI cost-per-month trend. Real values; charts via next/dynamic.
```

## Task 66 — Fix Custom Report Builder (real data)
```
Build /admin/reports/custom with two tabs. Saved Reports: list with name, last run, schedule, export format, and Run/Edit/Delete buttons. Report Builder: (1) Select Data Source, (2) Filters, (3) Columns, (4) Sort & Group, (5) Schedule options. "Run Report" must generate a real table preview below from actual data (not a stub). "Save Report" persists the configuration with a name.
```

## Task 67 — Alert row actions (Acknowledge/Resolve/Escalate)
```
On /admin/system/alerts, add row-level actions to active alerts: Acknowledge (records who/when), Resolve (modal for a resolution note), Escalate (modal for new severity + escalation note). Keep the existing active-alert list (severity, category, auto-escalated indicator, users-impacted count) and 3-tab structure.
```

## Task 68 — Alert Configuration tab
```
On /admin/system/alerts, build the Alert Configuration tab: create / edit / delete / enable-disable alert rules. Include a support-specific alert type "Facility Chat Unanswered > 10 minutes" — triggers when a facility sends a chat message and no agent responds within 10 minutes, routing to all available support agents.
```

## Task 69 — Notification Channels tab
```
On /admin/system/alerts, build the Notification Channels tab: email recipients per severity, Slack webhook URL + "Test" button, and business-hours / on-call config.
```

## Task 70 — Security Management row actions
```
On /admin/system/security, add row-level actions. MFA table: Resend Setup Email (Pending status), Disable MFA (confirmation), Reset MFA. IP Access Control: Add IP button, Edit, Remove, Block, Unblock, View Login Attempts (for blocked IPs). Active Sessions: Terminate Session per row (confirmation), plus an emergency "Terminate All Sessions Except Mine" button. Password Policies: make each row editable via an Edit button opening a drawer. Also add an "Enforce MFA by Role" button → modal listing all roles with an MFA Required toggle per role. Keep existing table structures.
```

## Task 71 — Integration Detail pages
```
On /admin/system/integrations, every integration with Error status must show an inline "Reconnect" button on its card and display the specific API error message (not just "Error"). Clicking an integration card opens a detail PAGE (not drawer) with: Status & Health (connection status, last successful call, "Test Connection" button), Credentials (masked fields + "Update Credentials" button), Usage & Logs (request count, success rate, last 50 errors table). Keep the existing integration list (type badge, status badge, usage stats, last sync).
```

## Task 72 — Twilio integration config page
```
In System → Integrations, add a prominently featured Twilio configuration as a Support Calling integration: Account SID, Auth Token, Support Phone Number(s), Twilio webhook URLs. This config powers the Section 5 calling module (Task 19). Mask credentials in the UI; include Test Connection.
```

## Task 73 — Data Management Recovery tab (two-admin approval)
```
On /admin/system/data, keep the Backup History table (scope, status, size, verification badge). Verify the Recovery tab is functional. Add a Backup Schedule configuration card (frequency, time, retention, notification recipients) and row actions: Download, Verify (checksum), Restore, Delete. Restore uses a two-admin approval flow: Admin A clicks Restore → system notifies all other System admins → Admin B approves → restore executes; if no second admin approves within 4 hours, the request expires.
```

## Task 74 — Facility Data Export tool (GDPR portability ZIP)
```
Build a facility data export tool, available both from the Facility Profile Data tab (/admin/facilities/[id], Data tab) for super admin and from the facility's own settings. It downloads all data for a facility as a ZIP containing: customers.csv, pets.csv, bookings.csv, invoices.csv, staff.csv — each with a clear header row and full data. Required for GDPR Article 20 portability, offboarding, and backups. Add a facility search + data-type checklist (Customers, Pets, Bookings, Invoices) + Export button → ZIP download.
```

## Task 75 — Fix Compliance Tools (clickable Non-Compliant tile)
```
On /admin/system/compliance, make the Non-Compliant KPI tile clickable → shows a list of non-compliant items, each with a "Fix This" link to the specific setting. Keep the existing GDPR Requests table (type badges, status tracking, Article 20/17 panels) and Compliance Score KPI. Also build a Data Retention Settings tab (editable table of retention periods per data type) and a Regulatory Compliance tab (checklist of GDPR/PIPEDA/PCI-DSS requirements with current status + Fix This links).
```

## Task 76 — GDPR request row actions
```
On /admin/system/compliance, build GDPR request row actions: Generate Export (Article 20), Anonymize or Delete Records (Article 17 — two-step confirmation requiring the user to type DELETE), Reject Request (reason modal).
```

## Task 77 — Facility Notification Center
```
Build /facility/notifications — a unified notification center in the facility dashboard. The existing bell icon opens a drawer showing notifications grouped by type: Bookings (new/cancellations/modifications), Clients (registrations, document uploads, profile updates), Financial (payment received, invoice due, overdue), Staff (new login, shift changes, clock-ins), System (module updates, Yipyy announcements). Each notification: icon, description, relative time, link to the relevant item. "Mark All Read" button at top + a "Notification Settings" link to preference settings.
```

## Task 78 — Multi-Location support
```
Build multi-location support. FACILITY side: a location selector in the top nav bar (currently shows "All Locations"); switching filters all data to that location. Cross-location: staff assignable to multiple locations, clients can visit any location, reports show data by location or combined. SUPER ADMIN side (Facility Profile Locations tab): see all locations + services and switch between them; Facility Profile KPI tiles can show combined or per-location data via a filter. Each location is a separate operating branch with its own services, hours, and staff.
```

## Task 79 — Public Status Page
```
Build a public-facing status page at /status (status.yipyy.com or yipyy.com/status). Show current status of components facilities care about: API availability, booking system, payment processing, messaging, calling, customer portal. Historical uptime graph (last 90 days). Active incident reports with status updates. Let facilities subscribe to email or SMS status alerts. When Yipyy creates a System Announcement about a maintenance window, also post it here.
```

## Task 80 — Fix Platform Name in Global Settings
```
In Global Settings, change the platform name from "Doggieville MTL" to "Yipyy" everywhere it is surfaced (settings, page titles, emails, branding defaults). Search the codebase for residual "Doggieville" references and update them.
```

## Task 81 — Restructure sidebar navigation (8-section architecture)
```
Restructure the super admin sidebar navigation to match the 8-section architecture: 1 Home Dashboard, 2 Tenant Management (Facilities), 3 Commercial & Billing, 4 Platform Control, 5 Support Operations (Tickets, Chat, Calling, Announcements, Email Templates, Knowledge Base), 6 Team & Access, 7 Reports & Analytics, 8 System & Security. Keep the layout a Server Component; extract usePathname/active-state logic into a small client NavTabs/NavSidebar component.
```

## Task 82 — Empty states for every list/table
```
Build empty states for every list and table in the admin panel: a meaningful icon, a one-line explanation, and where appropriate a primary action (e.g. "No facilities yet — Add Facility"). Apply consistently across all DataTable usages.
```

## Task 83 — Loading skeleton states
```
Add loading skeleton states to all data-loading sections (service pages, dashboards, profile tabs, reports). Use loading.tsx route segments where possible (Server Component, zero client JS) plus inline skeletons for query-driven panels. This enforces the global rule: never show a fake number while loading — show a skeleton.
```

## Task 84 — Real-time WebSocket connection for support chat
```
Implement the shared real-time WebSocket connection that powers support chat (Tasks 14, 15, 16): a single client connection (or Pusher/Ably channel) used by both the facility Support drawer and the admin Chat Inbox, with reconnection handling, presence (Online/Away), unread-count delivery, and notification-bell events. Centralize the connection so other real-time features (alerts, queue updates) can reuse it.
```

---

*84 tasks. Build all CRITICAL (1–30) before any HIGH (31–84). Each prompt is independent — paste one at a time and let the agent plan, implement, typecheck, and lint before moving on.*
