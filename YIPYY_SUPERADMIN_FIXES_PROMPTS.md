# Yipyy Super Admin — Workflow Fixes · Copy-Paste Build Prompts

One prompt per task (**29 total**), taken verbatim from *YIPYY — Super Admin Workflow Fixes*. **Every task in this document is CRITICAL priority** (the spec states this explicitly), so they are ordered by feature area / build dependency rather than by priority tier. Paste them into Claude Code in the order shown. Each prompt is self-contained and names the exact file(s) to edit.

**Standing rules baked into every task (the agent already has these from `CLAUDE.md`, restated here so each prompt is portable):**

> Stack: Next.js 16 App Router (RSC), React 19, TypeScript, shadcn/ui (New York), Tailwind 4, next-intl, TanStack Query + TanStack Form, bun. The Super Admin portal lives under `src/app/dashboard/`; the Facility portal under `src/app/facility/`; shared components in `src/components/`; data/query factories in `src/lib/api/<domain>.ts`. Pages are Server Components by default — extract interactivity into small `"use client"` components. Use the `DataTable` component for all tables. Wrap data in TanStack Query factories (never import mock data into components directly). Keep files under ~500 lines; split when needed. Use `next/dynamic` for modals/slide-overs/editors/charts. **No hardcoded values in production — show a loading skeleton when the backend isn't ready, never a fake value.** Any "owner-only" / role-restricted rule MUST be enforced with a **server-side route guard**, not just hidden in the UI. Conventional commits. Plan before coding; run `bun run typecheck` and `bun run lint` after.

**Component map (spec area → file to edit):**

| Spec section | Primary file(s) to edit |
|---|---|
| 1 Agreements & Waivers (super admin) | `src/components/layout/super-admin-sidebar.tsx` (nav) · new route `src/app/dashboard/support/agreements/` · builder + signing components (new) |
| 1.5 Facility Agreements access | `src/app/facility/documents/_components/facility-documents-client.tsx`, `src/app/facility/dashboard/waivers/page.tsx`, `src/components/dashboard/facilities/AgreementsTab.tsx` |
| 2 Custom Module Registry (remove) | `src/components/layout/super-admin-sidebar.tsx`, `src/app/dashboard/services/custom-modules/page.tsx`, `src/components/dashboard/facilities/ModulesTab.tsx` |
| 3 Super Admin Chat | `src/app/dashboard/support/chat/_components/support-chat-client.tsx`; mirror `src/components/messaging/*` (CommunicationHub, ContactList, ComposeBar, SavedRepliesMenu, InternalNotesTab, ClientContextPanel) |
| 4 Announcements | `src/app/dashboard/support/announcements/_components/rich-text-editor.tsx`, `announcement-composer.tsx`, `announcement-preview.tsx` |
| 5 Email Templates + Saved Replies | `src/app/dashboard/support/email-templates/page.tsx`, `src/lib/api/email-templates.ts`, `src/lib/api/communications.ts` |
| 6 Owner Account (avatar menu) | `src/components/layout/UserProfileSheet.tsx`, `src/components/layout/facility-admin-sidebar.tsx`, `src/app/facility/settings/billing/*`, `src/app/facility/settings/data-export/page.tsx` |
| 7 Clover Fiserv | `src/components/system-admin/SystemConfiguration.tsx`, `src/app/dashboard/system-admin/integrations/page.tsx`, `src/lib/fiserv-payment-service.ts`, `src/lib/clover-terminal-service.ts` |
| 8 Knowledge Base + Help Center | `src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx`, `kb-article-editor.tsx`, `src/app/facility/help/_components/help-center-client.tsx`, `src/lib/kb-articles-store.ts` |

> **Build-order note:** Do **Section 7 (Clover Fiserv)** before **Task 21 (Payment Method page)** — the owner's card-on-file form depends on the Clover integration being configured. Do **Task 1** (create the Agreements section) before Tasks 2–8.

---

# SECTION 1 — Agreement & Waiver Builder (Super Admin Portal)

*Replaces the current "upload a pre-made PDF into a facility's Agreements tab" flow with a full document builder + e-signature system. Yipyy staff design legally-binding agreements/waivers from scratch, send them for e-signature to the facility owner, and the system records the legally-signed result.*

---

## Task 1 [CRITICAL] — Add "Agreements & Waivers" super-admin section + two-tab shell
```
Add a new top-level section to the Super Admin sidebar. Edit src/components/layout/super-admin-sidebar.tsx.

PLACEMENT: Inside the "Support Operations" group, add a nav item "Agreements & Waivers" positioned BELOW "Email Templates" and ABOVE "Knowledge Base". Route: /dashboard/support/agreements.

This section is entirely separate from the facility-level Agreements tab — it is where Yipyy CREATES document templates and SENDS them.

Create the route src/app/dashboard/support/agreements/page.tsx as a Server Component shell with TWO tabs:
- "Templates" — where Yipyy builds reusable document templates (Task 2–4 build the editor).
- "Sent Agreements" — a log of every agreement sent to any facility with current signature status (Task 7 builds the table).
Extract the tab switching into a small client component. Add a query factory src/lib/api/agreements.ts (separate from the existing agreements-report.ts) for templates and sent agreements. No hardcoded rows — skeletons where backend isn't ready.
```

## Task 2 [CRITICAL] — Document Template Builder: core rich editor
```
Build the Agreement Template Builder — a rich DOCUMENT editor (NOT a PDF upload), reached from the Templates tab (Task 1) via "New Template". Create it under src/app/dashboard/support/agreements/_components/ (e.g. AgreementTemplateEditor.tsx), lazy-loaded via next/dynamic. It lets Yipyy design the full agreement layout and content.

Build these editor features:
- Rich text formatting: Bold, Italic, Underline, Strikethrough, font size selector, text color, background highlight.
- Paragraph alignment: left, center, right, justify.
- Ordered and unordered lists.
- Horizontal divider line.
- Headings: H1, H2, H3 selectable from a toolbar dropdown; each heading has a distinct visual weight so the document looks professional and readable.
- Image insertion: an Image toolbar button opens a file picker; upload a PNG/JPG max 5MB; image embeds inline with resize handles after insertion (used for logos, signature blocks, illustrative diagrams).
- Clause library (Phase 1): a right-panel drawer of pre-written legal clauses organized by category (Payment Terms, Liability, Data Privacy, Termination, etc.). Clicking a clause inserts it at the cursor; inserted clauses remain editable.

Use a proven rich-text engine (e.g. TipTap/ProseMirror) rather than contenteditable from scratch. Persist template content through src/lib/api/agreements.ts. Merge fields, signature blocks, versioning, and settings are added in Tasks 3–4 — leave clean extension points.
```

## Task 3 [CRITICAL] — Template Builder: merge fields + signature blocks
```
Extend the Agreement Template Builder (Task 2, src/app/dashboard/support/agreements/_components/AgreementTemplateEditor.tsx).

MERGE FIELDS (like Email Templates): a toolbar control inserts dynamic tokens at the cursor — {{facility_name}}, {{owner_name}}, {{plan_name}}, {{date}}, {{subscription_start_date}}, {{monthly_amount}}. These are filled automatically when the agreement is sent to a specific facility. Each inserted token renders HIGHLIGHTED in the editor so the author can distinguish dynamic tokens from static text. Provide a clickable list/menu of available tokens.

SIGNATURE BLOCKS: an "Insert Signature Block" button adds a formatted section containing:
- Facility Owner Name (auto-filled from a merge field)
- Signature (a drawn e-signature field rendered at signing time)
- Date Signed (auto-filled at time of signing)
- Title
Allow MULTIPLE signature blocks in one document (e.g. both a Yipyy representative and the facility owner must sign). Each block is a distinct, removable node in the document model so the signing portal (Task 6) can render an input per block.
```

## Task 4 [CRITICAL] — Template Builder: version control + settings panel + PDF preview
```
Extend the Agreement Template Builder (Task 2/3) with version control, a settings panel, and preview.

VERSION CONTROL: every time a template is saved, create a NEW version. A Version History sidebar lists all versions with timestamp and author, and allows restoring a previous version. Persist versions in src/lib/api/agreements.ts.

DOCUMENT SETTINGS PANEL (right sidebar):
- Document Name
- Document Type: Agreement / Waiver / Addendum / Amendment / Terms
- Internal Description
- Default Expiry (optional) — agreements can carry an expiry date that later triggers a renewal reminder.

PREVIEW: a Preview button renders a full-page PDF preview of the document with SAMPLE data substituted for merge fields (e.g. {{facility_name}} → "Sample Facility"). Show it in a full-screen modal.
```

## Task 5 [CRITICAL] — "Send to Facility" flow (steps 1–6) + new email template
```
Build the "Send to Facility" flow for agreement templates. On a template in the Templates tab, a "Send to Facility" action opens a multi-step modal. Implement steps 1–6:

1. Select template — triggered by clicking "Send to Facility" on a template.
2. Select facility — a searchable dropdown to pick which facility receives the agreement; facility owner details (name, email) auto-fill.
3. Customize merge fields — show all merge-field values that will be substituted; the admin can override any value before sending (e.g. custom pricing not on the standard plan).
4. Set expiry for response (optional) — a deadline by which the owner must sign; after this date the signing link expires and a new one must be sent.
5. Preview final document — full rendered PDF preview with all merge fields filled, exactly as the facility owner will see it.
6. Send — the system emails the facility owner. The email uses a NEW "Agreement Signature Request" email template (create it in the Email Templates system, src/lib/api/email-templates.ts + the templates data store) and contains a secure, ONE-TIME signing link.

Persist the outgoing agreement as a "Sent Agreement" record (status = Pending) via src/lib/api/agreements.ts. Steps 7–10 (signing + recording) are Task 6.
```

## Task 6 [CRITICAL] — Signing portal + signature capture/audit + confirmation + distribution (steps 7–10)
```
Build the e-signature signing portal and post-signature handling (steps 7–10 of the send flow, Task 5).

7. Facility owner signs — the one-time link opens the document in a signing portal EMBEDDED in the Yipyy ecosystem (NOT a third-party redirect). The owner reads the document, draws OR types a signature in each signature block (Task 3), and clicks "Sign & Submit".
8. Signature recorded — capture and store: the digital signature image, the signer's email address, IP address, browser/device, and a UTC timestamp. Also store a cryptographic hash of the document content so integrity can be verified later (tamper detection).
9. Confirmation — the owner sees a success screen: "Your agreement has been signed. A copy has been sent to [email]." The system emails a signed PDF copy to BOTH the facility owner and the Yipyy admin who sent it. The signed PDF includes an embedded signature certificate page (signer, email, IP, device, timestamp, document hash).
10. Appears everywhere — the signed document now appears (read-only, locked) in the facility's Agreements tab in the Super Admin (src/components/dashboard/facilities/AgreementsTab.tsx) AND in the facility portal's Documents > "Yipyy Agreements" tab (owner-only; view + download only, no edit/rename — enforced in Task 8).

Route example: /sign/[token]. Validate the token (one-time, respects the expiry from Task 5 step 4).
```

## Task 7 [CRITICAL] — Sent Agreements log (table + actions + permanent-lock rule)
```
Build the "Sent Agreements" tab (Task 1) at /dashboard/support/agreements. Edit src/app/dashboard/support/agreements/ and use the DataTable component.

TABLE — searchable and filterable, one row per agreement ever sent. Columns: Facility Name, Document Name, Type, Sent Date, Sent By (Yipyy admin), Status (Pending / Signed / Expired / Declined), Signed Date, Actions.

ACTIONS per row:
- View — opens the signed PDF.
- Resend — resends the signing link; ONLY available for Pending status.
- Void — cancels the request; prompts for a reason.
- Download PDF — downloads the signed copy with the embedded signature certificate page.

RULE (enforce in data + UI): once a document is Signed it is PERMANENTLY LOCKED — no edits, no renaming, no deletion by ANY user, not even a Yipyy super admin. Voiding or replacing an agreement creates a NEW row; the old row stays in the log permanently for legal audit. Never hard-delete a signed/sent agreement record.
```

## Task 8 [CRITICAL] — Facility portal Agreements access: owner-only, read-only
```
Lock down Yipyy agreements in the Facility portal. Edit src/app/facility/documents/_components/facility-documents-client.tsx (and its route guard) plus the "My Waivers" area src/app/facility/dashboard/waivers/page.tsx.

RULE (server-side): Yipyy agreements in the facility portal Documents section are accessible ONLY to the account with the "Facility Owner" (primary owner) role. No Manager, Staff, or other role may see the Documents section in the sidebar OR access the page directly. Implement the role check as a SERVER-SIDE route guard, not just UI hiding.

REMOVE: on the Documents > "Yipyy Agreements" tab, remove the rename (edit) icon from every document. These are legally signed records. The owner can only Download — NO rename, NO delete, NO upload to this tab. It is a read-only record of what Yipyy sent and the facility signed.

KEEP EDITABLE: the "My Waivers" tab (the facility's own customer-facing documents) stays fully editable — the facility can upload, rename, and delete their own documents. Only the "Yipyy Agreements" tab is locked.
```

---

# SECTION 2 — Custom Module Registry — Remove Entirely

---

## Task 9 [CRITICAL] — Remove the global Custom Module Registry
```
Remove the global "Custom Module Registry" from the Super Admin portal.

1. Delete the "Custom Module Registry" entry from the Super Admin sidebar/main menu — edit src/components/layout/super-admin-sidebar.tsx (it currently sits under the "Platform Control" group).
2. Remove the global page route src/app/dashboard/services/custom-modules/page.tsx (and any now-dead links to it). Clean up imports/nav references so nothing 404s.

RULE: the ONLY place custom modules can be created, viewed, or managed is inside a specific facility's detail page under the "Modules" tab (src/components/dashboard/facilities/ModulesTab.tsx). There is NO global cross-facility view of custom modules. To see a facility's custom modules, a Yipyy admin navigates to that facility and opens the Modules tab. Confirm the per-facility Modules tab and its create flow (src/app/dashboard/facilities/[id]/custom-modules/create/) still work after removal.
```

---

# SECTION 3 — Super Admin Chat — Professional Upgrade

*Bring the Super Admin chat (Support > Chat) up to the standard of the more powerful Facility Portal messaging module (src/components/messaging/*). Edit src/app/dashboard/support/chat/_components/support-chat-client.tsx and reuse the messaging components where possible.*

---

## Task 10 [CRITICAL] — Conversation list (left panel): tabs, rich rows, context menu
```
Upgrade the Super Admin chat conversation list (left panel). Edit src/app/dashboard/support/chat/_components/support-chat-client.tsx; mirror src/components/messaging/ContactList.tsx and ClientContextPanel.tsx.

1. Status tabs: All / Unread / Mine / Unassigned / Priority. Some partially exist — ensure ALL 5 are functional and correctly filtered.
2. Each conversation row shows: facility avatar + name, last-message preview, timestamp, unread-count badge (when applicable), channel-type icon (Chat / Email / SMS), and any applied tag badges (Priority, etc.).
3. Right-click / swipe context menu per row (mirror the facility portal contact context menu): Mark as Priority, Mark for Follow-up, Mark as Closed, Assign to agent (a list of all Yipyy support agents), Star conversation.

Drive everything from src/lib/api/support.ts / communications.ts queries — no placeholder rows.
```

## Task 11 [CRITICAL] — Active conversation (center panel): top bar + composer + attachments
```
Upgrade the Super Admin chat active-conversation center panel. Edit src/app/dashboard/support/chat/_components/support-chat-client.tsx; mirror src/components/messaging/ComposeBar.tsx and InternalNotesTab.tsx.

TOP BAR of the conversation shows: facility name (clickable → that facility's detail page), online/offline status indicator, assigned-agent dropdown (change assignment inline), and status dropdown (Open / In Progress / Waiting on Facility / Resolved / Closed).

MESSAGE COMPOSER matches the facility-portal standard:
- A tab toggle between "Facility" (visible to the facility) and "Internal Notes" (team-only). Internal Notes are highlighted in YELLOW so agents cannot accidentally send an internal note to the facility.
- Insert shortcuts: Booking link, KB article, Attach file.

ATTACH FILES: drag-and-drop or click. Supported types: PDF, PNG, JPG, GIF, MP4, CSV. Max 25MB per file. Attached files appear as inline previews in the message thread.

(Saved Replies "/" and Email-mode template integration are Task 12.)
```

## Task 12 [CRITICAL] — Saved Replies (/) in composer + Email-mode template integration
```
Add Saved Replies and Email-template support to the Super Admin chat composer. Edit src/app/dashboard/support/chat/_components/support-chat-client.tsx; reuse src/components/messaging/SavedRepliesMenu.tsx and saved-replies-context.

SAVED REPLIES (/ shortcut): pressing "/" in the composer opens a Saved Replies panel identical to the facility portal's — a floating panel ABOVE the composer (not a full-screen overlay). Replies are organized by category (Technical, Billing, Onboarding, General). Each reply card shows a category badge, reply name, preview text, and a hashtag slug. Typing after "/" filters by name or content match in real time. Clicking inserts the full reply text into the composer with merge fields intact (e.g. {{facility_name}} → the current facility's name). Category tabs: All / Technical / Billing / Onboarding / General. (The Saved Replies MANAGEMENT page is Task 18.)

EMAIL-MODE TEMPLATE INTEGRATION: when the channel is Email (not Chat), the composer expands to show: To (pre-filled), a Subject line field, and a body editor matching the Email Templates style. A "Use template" dropdown pre-fills subject and body from an email template. Images can be attached or embedded inline in email mode.
```

## Task 13 [CRITICAL] — Facility info (right panel): live data
```
Upgrade the Super Admin chat right-side facility info panel. Edit src/app/dashboard/support/chat/_components/support-chat-client.tsx; mirror src/components/messaging/ClientContextPanel.tsx.

The panel must include: facility name + plan badge; primary contact (name + email); account health indicator (Healthy / At Risk / Suspended); quick stats (open-tickets count, last-contact date); and Quick Actions (View Facility Profile, Open a Ticket, View Billing).

This panel currently exists in basic form — verify EVERY field is LIVE data from the query layer (facilities/support factories), not placeholders.
```

---

# SECTION 4 — Announcements — Add Rich Media Support

*The Announcement composer currently has only a basic rich text editor (Bold, Italic, Underline, List, Link). Upgrade it to support images and video. Edit src/app/dashboard/support/announcements/_components/rich-text-editor.tsx, announcement-composer.tsx, announcement-preview.tsx.*

---

## Task 14 [CRITICAL] — Image support in Announcements
```
Add image support to the Announcement composer. Edit src/app/dashboard/support/announcements/_components/rich-text-editor.tsx (+ composer).

- Add an Image button to the announcement body toolbar. Clicking opens a file picker. Accepted formats: PNG, JPG, GIF, WebP. Max size: 10MB per image.
- The image is uploaded to Yipyy's storage and embedded INLINE in the announcement body. In the editor, the image shows at its natural width constrained to the editor container.
- Image alignment options: left, center, right, full-width.
- Alt text field REQUIRED for accessibility (block insertion until alt text is provided).
- When the announcement is rendered in the facility portal's notification panel / in-platform notification feed, images render INLINE at correct dimensions — NOT as download links.
```

## Task 15 [CRITICAL] — Video support in Announcements (+ delivery rule)
```
Add video support to the Announcement composer. Edit src/app/dashboard/support/announcements/_components/rich-text-editor.tsx (+ composer).

Add a Video button to the body toolbar with TWO options:
(1) Embed a video URL — paste a YouTube or Vimeo URL; the system generates an embed preview in the editor; when rendered in the facility portal the video plays inline with standard video controls.
(2) Upload a video file — MP4 or WebM, max 100MB; uploaded to Yipyy's storage, transcoded, and embedded.

RULE: video announcements can only be delivered IN-PLATFORM. If the admin selects Email delivery while a video is embedded, warn: "Video content cannot be sent via email. The email version will show a link to view the announcement in-platform." Email delivery then sends a TEXT SUMMARY with a "View full announcement" button that opens the in-platform version.
```

## Task 16 [CRITICAL] — Announcement preview (in-platform + email)
```
Upgrade the Announcement Preview. Edit src/app/dashboard/support/announcements/_components/announcement-preview.tsx.

The Preview button must render the announcement EXACTLY as it will appear in the facility portal — including images at correct sizes and video as a playable embed. If BOTH channels are selected, Preview shows the in-platform view and the email view SIDE BY SIDE (the email view reflects the Task 15 rule: video replaced by a "View full announcement" link/button).
```

---

# SECTION 5 — Email Templates — Rich Media + Saved Replies Integration

---

## Task 17 [CRITICAL] — Image support in Email Templates (CDN rule)
```
Add image support to the Email Template body editor. Edit src/app/dashboard/support/email-templates/page.tsx (+ its editor component) and src/lib/api/email-templates.ts.

- Image button in the toolbar — same spec as Announcements: PNG/JPG/GIF/WebP, 10MB max, inline rendering, alignment options (left/center/right/full-width), alt text REQUIRED.
- RULE: images in email templates are hosted on Yipyy's CDN and referenced by URL in the email HTML — NOT attached as files — so they render in all email clients. All images MUST be served over HTTPS from Yipyy's CDN. Do NOT embed images as base64 in email bodies (it breaks most email clients and inflates size past spam thresholds).
```

## Task 18 [CRITICAL] — Saved Replies management page (second tab) + panel behavior
```
Create a Saved Replies management area. Edit src/app/dashboard/support/email-templates/page.tsx to become a TWO-TAB page: "Transactional Templates" (the existing email templates) and "Saved Replies" (new). Back it with a query factory (extend src/lib/api/communications.ts, which already has a quickReplies concept, or add saved-replies queries).

Context: Email Templates are for automated TRANSACTIONAL emails; Saved Replies are for MANUAL chat/support responses. They are managed separately but related.

On the "Saved Replies" tab, Yipyy admins can create, edit, categorize, and delete saved replies that support agents use in chat. Each reply has: Name, Category (Technical / Billing / Onboarding / General / Custom), Body (rich text, merge fields supported), and a hashtag slug used for search.

These replies feed the "/" panel in the Super Admin chat composer (Task 12): a floating panel above the composer, filterable by category tabs (All / Technical / Billing / Onboarding / General), real-time filtering as the agent types after "/", click-to-insert.
```

---

# SECTION 6 — Facility Portal — Owner Account Section (Top-Right Avatar Menu)

*Move confidential business/financial settings out of the main operational menu into an owner-only account section under the top-right avatar dropdown. These must not be accessible to managers or staff. Edit src/components/layout/UserProfileSheet.tsx and src/components/layout/facility-admin-sidebar.tsx.*

---

## Task 19 [CRITICAL] — Restructure avatar menu into an Owner Account section + guards
```
Restructure the facility-portal top-right avatar/username dropdown into a full "Owner Account" section. Edit src/components/layout/UserProfileSheet.tsx (avatar dropdown) and src/components/layout/facility-admin-sidebar.tsx (main sidebar).

MOVE INTO the top-right avatar dropdown (currently wrongly in the main menu):
- Yipyy Agreements (read-only signed docs)
- My Subscription (plan, billing cycle, invoices from Yipyy) — page built in Task 20
- Payment Method (credit card on file for the Yipyy subscription) — page built in Task 21
- Export Data (restricted to owner only) — page relocated in Task 22
- Account Settings (existing profile/system settings stay)

REMOVE from the main sidebar navigation entirely: "Documents" and "Export Data" (they are owner administrative features, not operational).

RULE (server-side): every page in the Owner Account section enforces owner-only access with a SERVER-SIDE role check. If a Manager or Staff user navigates directly to these URLs, they must receive a 403 page — NOT a blank page, NOT a redirect to dashboard. The 403 page reads: "This section is only accessible to the facility owner."
```

## Task 20 [CRITICAL] — My Subscription page (facility owner)
```
Build the "My Subscription" page inside the facility-portal Owner Account section (owner-only, server-guarded per Task 19). Reuse/relocate from src/app/facility/settings/billing/*. Pull data via src/lib/api/facility-billing.ts / subscriptions.ts.

Show:
- Current plan name and badge (e.g. "Pack Leader – Premium"), Billing cycle (Monthly / Annual / Quarterly), Next billing date, Amount due, Current status (Active / Past Due / Paused / Trial).
- Invoice History table (DataTable): all Yipyy subscription invoices for this facility. Columns: Invoice #, Period (e.g. "Jun 2025 – May 2026"), Amount, Status (Paid / Overdue / Draft), Date Issued, Date Paid, Download PDF button. Paginate older invoices.
- Active Discounts & Credits section: any credits/discounts Yipyy applied to this account (goodwill credit, promotional discount). READ-ONLY — managed from the Super Admin Credits & Discounts section (src/app/dashboard/commercial/credits/page.tsx).
- Upgrade / Change Plan button: opens a plan-comparison page where the owner REQUESTS a plan change. The request is submitted to Yipyy for review — it does NOT auto-change. A Yipyy staffer approves it in the Super Admin Subscriptions section (src/app/dashboard/commercial/subscriptions/page.tsx).
```

## Task 21 [CRITICAL] — Payment Method page (Clover Fiserv) — do AFTER Section 7
```
Build the "Payment Method" page inside the facility-portal Owner Account section (owner-only, server-guarded per Task 19). Reuse src/app/facility/settings/billing/_components/update-payment-method-dialog.tsx; integrate src/lib/fiserv-payment-service.ts / clover-terminal-service.ts. Requires Section 7 (Clover config) to be in place.

- Display the credit card on file for the Yipyy subscription: card brand (Visa / Mastercard / Amex etc.), last 4 digits, expiry date, cardholder name. If no card on file, show empty state: "No payment method on file. Add a card to enable subscription billing."
- Update Card button: opens a Clover Fiserv payment form embedded INLINE (not a third-party redirect). The owner enters new card details; on save, Clover TOKENIZES the card — Yipyy never stores raw card numbers. The new card replaces the previous one.
- Remove Card button: confirmation modal. If the facility has an active subscription, warn: "Removing your payment method may cause your subscription to lapse if a payment is due. Are you sure?" Buttons: Remove and Cancel.
- RULE: all payment-method operations go through Clover Fiserv (primary processor). No card data touches Yipyy servers; PCI DSS is Clover's responsibility. Yipyy stores ONLY the Clover-issued token plus last 4 + expiry for display.
```

## Task 22 [CRITICAL] — Export Data page — owner-only relocation
```
Relocate Export Data into the facility-portal Owner Account section (owner-only, server-guarded per Task 19). Edit src/app/facility/settings/data-export/page.tsx and remove its main-sidebar entry (facility-admin-sidebar.tsx).

- Remove Export Data from wherever it currently appears in the main sidebar navigation.
- Move it under the Owner Account section (top-right avatar dropdown). Keep the same functionality: export clients, pets, bookings, invoices, and staff data as CSV or Excel.
- Now OWNER-ONLY: managers and staff cannot see or access it (server-side 403 for non-owners, per Task 19).
```

---

# SECTION 7 — Payment Processor — Clover Fiserv Integration (Super Admin)

---

## Task 23 [CRITICAL] — "Payment Processing" tab in System Configuration
```
Add a "Payment Processing" tab inside System Configuration (alongside Integrations, API Keys, System Settings, Feature Flags). Edit src/components/system-admin/SystemConfiguration.tsx and the route src/app/dashboard/system-admin/system-config/page.tsx. This is where Yipyy configures how it charges facilities for subscriptions. Wire through src/lib/fiserv-payment-service.ts / clover-terminal-service.ts.

Clover Fiserv setup fields:
1. API Credentials: Clover Merchant ID, Private App Secret, App ID — stored ENCRYPTED, fields MASKED after entry. A "Test Connection" button verifies credentials.
2. Environment Toggle: Sandbox / Production. Sandbox uses Clover's test environment (no real charges); switch to Production to go live.
3. Subscription Billing Config: default billing currency (USD / CAD / GBP etc.); invoice generation = auto-generate at start of each billing cycle; payment collection = auto-charge on invoice due date; retry logic = retry failed payments on Day 1, Day 7, Day 14 (matches the dunning sequence — see src/lib/api/dunning.ts).
4. Webhook Configuration: Clover webhook URL auto-generated by Yipyy: https://app.yipyy.com/api/clover/webhook. Events listened for: payment.succeeded, payment.failed, refund.created, dispute.created. Webhook secret shown ONCE — copy it to the Clover dashboard.
5. Test Charge: a "Send Test Charge of $0.01" button that charges a designated test card and immediately refunds it, confirming the full payment flow end-to-end.
```

## Task 24 [CRITICAL] — Make Clover Fiserv the primary/Featured integration + Phase-1 card-only rule
```
Update the Integration Management table. Edit src/app/dashboard/system-admin/integrations/page.tsx (the table currently shows Stripe as Payment).

- Replace Stripe with Clover Fiserv as the PRIMARY payment integration. Stripe may remain as a secondary if needed, but Clover Fiserv is primary and is shown as the "Featured Integration" (same treatment Twilio has for calling).
- RULE: online credit card payment is the ONLY payment method for Phase 1 — on BOTH the super admin side (facility paying Yipyy) and the facility portal side (customers paying the facility). Cash and bank-transfer workflows may be added in a later phase. Ensure the UI/config reflects card-only for Phase 1.
```

---

# SECTION 8 — Knowledge Base — Rich Article Editor

*KB articles teach facilities to use the platform and are visible to every facility owner and their staff from the Help Center. Upgrade the basic editor to a full rich content editor. Edit src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx + kb-article-editor.tsx; store src/lib/kb-articles-store.ts.*

---

## Task 25 [CRITICAL] — KB editor toolbar: text formatting + structure/layout
```
Upgrade the Knowledge Base article editor toolbar. Edit src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx.

TEXT FORMATTING: Bold, Italic, Underline, Strikethrough; Font size (Small / Normal / Large / H1 / H2 / H3); Text color picker; Background highlight color; Clear formatting.

STRUCTURE & LAYOUT: Ordered list (numbered); Unordered list (bullets); Indentation (increase / decrease); Block quote (left-border callout style); Code block (monospace, syntax-highlighted); Horizontal divider.

Use a proven rich-text engine (e.g. TipTap). Persist to src/lib/kb-articles-store.ts. Media, linking, and special blocks are Tasks 26–27.
```

## Task 26 [CRITICAL] — KB editor: media + linking
```
Add media and linking to the KB article editor. Edit src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx.

MEDIA:
- Image upload (PNG/JPG/GIF/WebP, 10MB max) with image alignment (left / center / right / full-width) and an alt-text field on each image.
- Video embed (YouTube/Vimeo URL — paste and it generates an inline player).
- Video file upload (MP4/WebM, 100MB max, transcoded).

LINKING:
- External hyperlink: select text, click Link, paste URL — opens in a new tab.
- Internal link: select text, click Link, switch to an "Internal" tab, search for another KB article by title, and link to it.
- Tooltip / definition: a hover explanation for technical terms.
- Anchor links: H2 and H3 headings auto-generate anchor IDs so Yipyy can link to specific sections.
```

## Task 27 [CRITICAL] — KB editor: callouts + step-by-step blocks + tables
```
Add structured block types to the KB article editor. Edit src/app/dashboard/support/knowledge-base/_components/kb-rich-editor.tsx.

- Callout boxes: a "Callout" block that renders as a highlighted box with an icon and colored border. Types: Info (blue), Warning (yellow), Success (green), Danger (red). Example: a yellow warning box "Only the facility owner can access this setting."
- Step-by-step blocks: a "Steps" block that renders numbered steps in a visually distinct format — each step in a bordered card with a step-number circle. This is the primary format for how-to instructions (more readable than a plain numbered list).
- Table insertion: a basic table builder — select rows and columns, click insert. Tables render with borders and alternating row shading; column width adjustable by drag. Used for comparison/pricing/feature tables.
```

## Task 28 [CRITICAL] — KB article settings panel (right sidebar)
```
Build the KB article Settings panel (right sidebar). Edit src/app/dashboard/support/knowledge-base/_components/kb-article-editor.tsx.

- Category: dropdown to assign the article to a category (Getting Started, Bookings & Scheduling, Payments & Invoicing, Staff & Roles, Reports, Calling & Messaging, Settings, Custom Modules). A "Manage Categories" button opens a modal to add/rename/delete categories (reuse category-manager-dialog.tsx).
- Status: Published (visible to all facility users in the Help Center), Draft (only visible to Yipyy admins in the KB editor), Archived (removed from the Help Center but kept). Only Published articles appear in the facility Help Center.
- Visibility filter (new): optionally restrict an article to specific plan tiers (e.g. show a Multi-Location article only to Pack Leader and Alpha Enterprise facilities). Default: All Plans. Multi-select of plans.
- Performance metrics (read-only): Views count; Helpfulness score (thumbs up / down from facility users); a link to view which facilities viewed the article most.
- SEO / Search metadata: Article Summary (2–3 sentences shown in Help Center search results) and Tags (comma-separated keywords that improve internal search relevance).
```

## Task 29 [CRITICAL] — Help Center (facility side): full-screen render + TOC + helpfulness + related
```
Upgrade the facility-portal Help Center (opened via the floating "?" support button). Edit src/app/facility/help/_components/help-center-client.tsx (+ help-article-item.tsx). Data via src/lib/api/help.ts.

- Open the Help Center in ANOTHER TAB in FULL SCREEN so staff can read and watch videos/images properly. It must correctly render ALL content types: images (inline), videos (embedded player with controls), tables (bordered, alternating row shading), code blocks (monospace with a copy button), callout boxes (colored borders + icons), step-by-step blocks (numbered cards). Currently the Help & FAQs panel shows only plain-text summaries — replace that with full rich rendering.
- Article table of contents: if an article has 3+ H2 headings, auto-generate a floating TOC panel on the right. Each H2 entry is a clickable anchor that smoothly scrolls to that section and highlights the current section as the user scrolls.
- Article helpfulness widget: at the bottom of every article, show "Was this article helpful?" with thumbs up / thumbs down. A click records the vote (tied to facility ID; prevents duplicate votes). The score feeds the Performance metrics in the Super Admin KB editor (Task 28).
- Related articles: below the helpfulness widget, show 3 related articles auto-selected from the same category (title + one-line summary each). Clicking navigates to that article within the view.
```

---

*Yipyy · Super Admin Workflow Fixes · 29 tasks · all CRITICAL priority · companion to `YIPYY_BUILD_PROMPTS.md` and `YIPYY_SETTINGS_PART2_PROMPTS.md`. For Internal Development Use Only.*
