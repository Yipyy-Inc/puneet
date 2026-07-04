# Yipyy Settings Page — Part 2 · Copy-Paste Build Prompts

One prompt per master-list task (**44 total**), taken verbatim from *Yipyy Settings Page — UI/UX Workflow Specification, Part 2*. Paste them into Claude Code **in build order**: all **4 CRITICAL** first, then **25 HIGH**, then **14 MEDIUM**, then **1 LOW**. Each prompt is self-contained and names the exact component file to edit.

**Standing rules baked into every task (the agent already has these from `CLAUDE.md`, restated here so each prompt is portable):**

> Stack: Next.js 16 App Router (RSC), React 19, TypeScript, shadcn/ui (New York), Tailwind 4, next-intl, TanStack Query + TanStack Form, bun. The settings shell `src/app/facility/dashboard/settings/page.tsx` is a client component that switches sections via `?section=<key>`; each section renders a dedicated component under `src/components/`. Keep interactive logic in these section components — do not bloat the shell. Use the `DataTable` component for all tables. Wrap data in TanStack Query factories in `src/lib/api/<domain>.ts` (never import mock data into components directly). Keep files under ~500 lines; split when needed. Use `next/dynamic` for modals/slide-overs/charts. No hardcoded numbers in production — show a loading skeleton when the backend isn't ready, never a fake value. **Preserve every item marked KEEP** — only change what the task describes. Conventional commits. Plan before coding; run `bun run typecheck` and `bun run lint` after.

**Component map (section key → file to edit):**

| Spec section | `?section=` key | Component file |
|---|---|---|
| A.1 Form Requirements | `form-requirements` | `src/components/forms/FormRequirementsSettings.tsx` |
| A.2 Form Notifications | `form-notifications` | `src/components/forms/FormNotificationSettings.tsx` |
| B Roles & Permissions | `roles-permissions` | `src/components/facility/RolesPermissionsSettings.tsx` |
| C.1 Pet Breeds | `pet-breeds` | `src/components/facility/BreedManagement.tsx` |
| C.2 Care Tasks | `care-tasks` | `src/components/facility/CareTaskSettings.tsx` (+ `FeedingMedicationConfig.tsx`) |
| D.1 Evaluations | `evaluations` | `src/components/facility/EvaluationSettings.tsx`, `EvaluationBookingWizardSettings.tsx`, `src/components/evaluations/EvaluationFormBuilder.tsx`, `EvaluationReportCardBuilder.tsx` |
| D.2 Booking Statuses | `booking-statuses` | `src/components/facility/BookingStatusSettings.tsx`, `StatusColorSettings.tsx` |
| D.3 Express Check-In | `checkin-requirements` | `src/components/facility/CheckinRequirementsSettings.tsx` |
| D.4 Retail / POS | `retail` | `src/components/facility/RetailSettings.tsx` (+ `TaxSettings.tsx`) |
| E.1 Pricing Rules | `pricing-rules` | `src/components/facility/PricingRulesSettings.tsx` |
| E.2 Estimate Settings | `estimate-settings` | `src/components/estimates/EstimateFollowUpSettings.tsx` |
| E.3 Deposit Rules | `deposit-rules` | `src/components/facility/DepositRulesSettings.tsx` |
| E.4 Invoice Template | `invoice-template` | `src/components/facility/InvoiceTemplateSettings.tsx` |

> Task numbers below match the spec's **Master Task Table — Part 2** (1–44) so you can cross-reference. They are grouped by priority, not numeric order.

---

# PART A — CRITICAL (build all 4 first)

---

## Task 11 [CRITICAL] — Roles & Permissions — Confirm/build "+ New Role" modal
```
Edit src/components/facility/RolesPermissionsSettings.tsx (settings section=roles-permissions).

PRESERVE: the two-panel layout (preset roles list on the left — Owner, Manager, Reception, Groomer, Trainer, Daycare Attendant, Boarding Attendant, Sanitation Specialist — and the permission detail table on the right, selecting a role loads its permissions); the four top summary stats; the permission progress bar (75% Manager, 40% Reception); the "Preset" badges; and the "Core always on" section at the top of the permission table.

ISSUE: There is no confirmed way to create a custom role from this page. A "+ New Role" button exists in the top-right but is not verified as functional.

DO: Ensure the "+ New Role" button opens a "Create Custom Role" modal containing:
- Role Name (text)
- Description (text)
- Optional "Based on preset" selector — when chosen, pre-fills all permission toggles from that existing preset
- After creation, allow toggling individual permissions
On save, the new custom role appears in the LEFT panel and must be visually distinguishable from presets — it must NOT show the "Preset" badge (use a different colour dot or a "Custom" badge instead). Wire it through a TanStack Query mutation in src/lib/api/staff.ts (or the roles domain file). No hardcoded role list — read/write through the query layer.
```

## Task 28 [CRITICAL] — Retail / POS — Add Tax Configuration section
```
Edit src/components/facility/RetailSettings.tsx (settings section=retail). Reuse the existing src/components/facility/TaxSettings.tsx if it already models tax fields; otherwise add the fields directly.

PRESERVE: Product Categories, Suppliers cards, Brands, Product Tags, and Units of Measure — all existing sections stay.

ISSUE (CRITICAL MISSING SECTION): Retail/POS Settings has no tax configuration. The POS module currently contains hardcoded Quebec-only tax logic. This settings section must hold the tax configuration that REPLACES that hardcoding.

DO: Add a "Tax Configuration" section placed BETWEEN Suppliers and Brands. Contents:
- Default Tax Rate (%) field, labelled "Applied to all taxable products unless overridden"
- Tax mode selector: HST / GST / PST / QST (for Canadian facilities)
- Tax-exempt toggle per product category
- Tax registration number field
- "Show tax breakdown on receipt" toggle
Persist via TanStack Query factory in src/lib/api/retail.ts. This configuration is the single source of truth that replaces all hardcoded tax logic in the POS module — expose it so the POS and the Invoice Template (Task 40) can read from it.
```

## Task 40 [CRITICAL] — Invoice Template — Tax lines pull from Tax Configuration
```
Edit src/components/facility/InvoiceTemplateSettings.tsx (settings section=invoice-template).

PRESERVE: the side-by-side layout (configuration left, live preview right that updates as the admin types); Branding (logo upload, accent colour), Facility Information, Footer & Signature, and the Sample Data toggle; and the professional invoice preview render.

ISSUE: The invoice preview tax lines are hardcoded to Quebec — "GST 2.5% / QST 2.5%". These labels/rates are wrong for facilities outside Quebec.

DO: Make the invoice preview tax lines pull from the Tax Configuration defined in Retail/POS Settings (Task 28, src/lib/api/retail.ts). The preview must render whatever tax labels and rates the facility has configured — remove the hardcoded Quebec GST/QST values entirely. If tax config is not yet loaded, show a skeleton for the tax lines, never a fake value.
```

## Task 41 [CRITICAL] — Invoice Template — Generic, configurable tax registration numbers
```
Edit src/components/facility/InvoiceTemplateSettings.tsx (settings section=invoice-template).

ISSUE: The Tax Registration Numbers field is Quebec-specific — it shows "GST, RT 234567/89 · QST: Q198765432". Not all facilities have a QST number.

DO: Replace the hardcoded QST/GST field labels with a generic, configurable list. Let the admin add MULTIPLE tax registration numbers, each with a custom label (e.g. "GST/HST Number", "PST Number", "VAT Number") and a value. Render them on the invoice preview from this configurable list. Remove all hardcoded QST/GST field labels. Persist through the invoice-template query factory.
```

---

# PART B — HIGH (25 tasks)

---

## Task 1 [HIGH] — Form Requirements — Add per-form "Preview" (eye icon) slide-over
```
Edit src/components/forms/FormRequirementsSettings.tsx (settings section=form-requirements).

PRESERVE: the per-service form gating system (Daycare, Boarding, Grooming, Training each showing attached forms with timing = Before Booking / Before Check-In / Before Approval and enforcement = Block step entirely vs Allow with a warning banner); the "+ Add Form" button per service; the collapse/expand chevron per form row; and the Requirements Overview at the bottom.

ISSUE: There is no way to see which fields are in a form without leaving Settings for the Forms builder.

DO: Add a "Preview" link (eye icon) next to each form name in the requirement list. Clicking it opens a read-only slide-over panel that shows the form's fields/questions inline — the admin must NOT have to navigate to the Forms builder to review what a form contains. Lazy-load the slide-over with next/dynamic. Read form field data via the forms query factory (src/lib/api/forms.ts).
```

## Task 2 [HIGH] — Form Requirements — Colour-code enforcement & timing badges
```
Edit src/components/forms/FormRequirementsSettings.tsx (settings section=form-requirements).

ISSUE: The timing dropdowns (Before Booking / Before Check-In / Before Approval) and the enforcement dropdowns (Block / Allow with Warning) use very small text and are hard to distinguish. With 3–4 forms an admin cannot tell at a glance which form blocks which stage.

DO: Increase the size and contrast of the timing and enforcement badges/chips. Colour-code enforcement: Block = red pill, Allow with Warning = amber pill. The enforcement mode is the most important at-a-glance information on each row — make it the visually dominant element, not a secondary dropdown.
```

## Task 3 [HIGH] — Form Requirements — Replace ambiguous service badges with a summary line
```
Edit src/components/forms/FormRequirementsSettings.tsx (settings section=form-requirements).

ISSUE: Service section headers show unclear status badges — Daycare shows "Onboarding" and Boarding shows "Onboarding + Checking". It is not evident what they indicate about form completion for that service.

DO: Replace the ambiguous status badges on each service section header with a simple, computed summary line, e.g.: "X forms required before booking · Y form required before check-in." This communicates the configuration state without interpretation. Derive the counts from that service's configured forms.
```

## Task 5 [HIGH] — Form Requirements — Add explicit sticky "Save Changes" button
```
Edit src/components/forms/FormRequirementsSettings.tsx (settings section=form-requirements).

ISSUE: It is unclear whether changes save automatically or need an explicit save.

DO: Add a "Save Changes" button to Form Requirements, sticky at the bottom of the page, matching the pattern already used by Booking Statuses and other sections that have explicit save buttons. Wire it to the forms query mutation.
```

## Task 6 [HIGH] — Form Notifications — Configure red-flag keywords (link + modal)
```
Edit src/components/forms/FormNotificationSettings.tsx (settings section=form-notifications).

PRESERVE: the two-part structure — Notify Staff When (New submission received, Red-flag answers detected, Submission includes file upload) and Notify Customer When (Submission confirmed, Missing required forms reminder, Form rejected / needs correction) — plus the Email/SMS channel toggles per customer notification and the multi-channel toggle for staff.

ISSUE: The "Red-flag answers detected" notification references "aggression, health concerns" but there is no way to configure what counts as a red-flag answer. The definition is opaque.

DO: Add a "Configure red-flag keywords and responses" link directly below the Red-flag notification toggle. Clicking it opens a modal where the admin sets which form-question answers trigger the notification — e.g. if question "Has your dog shown aggression?" = "Yes", flag it. Persist this mapping via the forms query factory. This is a key intake safety feature and must be admin-configurable, not hardcoded.
```

## Task 7 [HIGH] — Form Notifications — Timing field for Missing Required Forms Reminder
```
Edit src/components/forms/FormNotificationSettings.tsx (settings section=form-notifications).

ISSUE: The "Missing required forms reminder" toggle has no configurable timing — when it fires is undefined.

DO: Add a timing field beneath the Missing Required Forms Reminder toggle: "Send reminder [X] hours / days before [appointment / check-in date]." Default to 48 hours before check-in. Persist the value.
```

## Task 9 [HIGH] — Roles & Permissions — Fix duplicate "Custom roles" stat label
```
Edit src/components/facility/RolesPermissionsSettings.tsx (settings section=roles-permissions).

ISSUE: The stats row shows "Custom roles: 0" twice (two columns share the same label) — a copy-paste error.

DO: Fix the four stat labels so each is different and meaningful: "Preset Roles (count) · Custom Roles (count) · Preset Overrides (count) · Staff Assigned (count)". Compute each count from real data.
```

## Task 10 [HIGH] — Roles & Permissions — Make the role's actual toggle state the primary visual
```
Edit src/components/facility/RolesPermissionsSettings.tsx (settings section=roles-permissions).

ISSUE: Each permission row shows "Default On" or "Default Unchecked", which describes the SYSTEM default — not what is actually set for the selected role. The role's real state is not clear at a glance.

DO: Show the selected role's ACTUAL permission state (On or Off) as the primary visual element on each row — a large, clear toggle or checkbox. Demote the "Default On" / "Default Unchecked" text to a small secondary hint. The current layout inverts these priorities; correct it.
```

## Task 12 [HIGH] — Roles & Permissions — "Go to Staff Management →" link
```
Edit src/components/facility/RolesPermissionsSettings.tsx (settings section=roles-permissions).

ISSUE: The page says "Assign roles to staff from Staff Management" but offers no direct link there. After configuring a role the admin must navigate away manually.

DO: Add a prominent "Go to Staff Management →" link/button at the top of the Roles & Permissions page, directly below the subtitle, linking to the Staff Management route.
```

## Task 13 [HIGH] — Pet Breeds — Add "Restrict Breed" action per row
```
Edit src/components/facility/BreedManagement.tsx (settings section=pet-breeds).

PRESERVE: the three-section layout (Dogs / Cats / Other) with breed count badges, alphabetical lists, collapsible sections, search bar, and "+ Add Breed" button.

ISSUE: Some facilities do not accept certain breeds, but there is no way to mark a breed as restricted or blocked.

DO: Add a "Restrict Breed" action to each breed row (via a "..." menu or a toggle). Restricted breeds show a red indicator and remain in the list but are visually distinct (e.g. strikethrough or red badge). Add a facility-configurable message that is shown to a customer who tries to book with a restricted breed. Persist restriction state and the message via the breeds/pet query factory.
```

## Task 15 [HIGH] — Pet Breeds — Add a legend explaining row icons
```
Edit src/components/facility/BreedManagement.tsx (settings section=pet-breeds).

ISSUE: Two cat breeds (Bengal and Birman) show star/flag icons whose meaning is not explained anywhere on the page.

DO: Add a legend below the breed-list header explaining every icon used on breed rows. Whether the star/flag indicates a restricted breed, a hypoallergenic breed, or a special-handling note, state its meaning clearly and inline. (Coordinate with Task 13 — a restricted-breed indicator should appear in this legend.)
```

## Task 17 [HIGH] — Care Tasks — Clarify the Feeding Feedback percentage labels
```
Edit src/components/facility/CareTaskSettings.tsx (settings section=care-tasks; feeding/med config may live in FeedingMedicationConfig.tsx).

PRESERVE: the separated Feeding & Medication Options; Feeding Feedback Options (Ate all / Ate most / Ate little / Ate some / Refused to eat) with "+ Add"; and Medication Feedback Options (Given / Skipped / Refused / Vomited after) with "+ Add".

ISSUE: The percentage next to each Feeding Feedback option (e.g. "Ate all (75%)") is ambiguous — unclear whether it is a portion reference or historical usage rate.

DO: Clarify the labels. If the number is a preset portion-size reference, show it with a helper label like "75% of meal". If it is a historical usage rate, show it via a tooltip like "Selected X% of the time in the past 30 days". Either way the meaning must be explicitly stated.
```

## Task 19 [HIGH] — Evaluations — Define the Form Builder Edit mode
```
Edit src/components/evaluations/EvaluationFormBuilder.tsx (settings section=evaluations; container EvaluationSettings.tsx).

PRESERVE: the two-part structure (Booking Wizard Configuration vs Evaluation Form Builder); the existing Form Builder sections — Temperament Assessment, Play Profile, Additional Observations, Behaviour Codes; the "Currently Active" badge; and the Evaluation Result Card.

ISSUE: The Form Builder is read-only with an "Edit" button; it is unclear whether Edit allows custom sections or only editing presets.

DO: Build the Edit mode so it allows:
- Adding new sections, each with a section type: Scale / Yes-No / Single Select / Multi Select / Free Text
- Reordering existing sections via drag-to-reorder
- Duplicating or deleting NON-CORE sections
Protect core sections (Temperament Assessment, Play Profile) from deletion, but keep them editable. Persist the form structure via the evaluations query factory.
```

## Task 20 [HIGH] — Evaluations — "Result goes to pet profile automatically" toggle
```
Edit src/components/facility/EvaluationSettings.tsx / the Evaluation Result Card component (settings section=evaluations).

PRESERVE: the Evaluation Result Card with Content / Delivery / Preview sub-tabs, the Enable result cards toggle, the Header/Pass/Fail/Footer message fields, and the Sections to Include list.

ISSUE: There is no setting controlling whether a completed evaluation feeds into the pet's profile history.

DO: Add an "Evaluation result goes to pet profile automatically" toggle under the Evaluation Result Card. When ON, completed evaluation results are attached to the pet's profile and visible in pet history; when OFF, results live only in the evaluation record. Default to ON. Persist the setting.
```

## Task 22 [HIGH] — Booking Statuses — Collapse Status Colors rows by default
```
Edit src/components/facility/StatusColorSettings.tsx (settings section=booking-statuses).

PRESERVE: the Status Colors section covering all statuses (Confirmed, Pending, Checked-In, Checked-Out, Cancelled, Completed, Overdue, Scheduled, Planned, Refunded) and full colour-picker functionality.

ISSUE: The section lists 10 status colour pickers, each with a full 36-colour swatch row — visually overwhelming and slow to navigate.

DO: Collapse each status colour row by default so it shows only the status name, its currently selected colour circle, and a pencil edit icon. Clicking the pencil expands the swatch picker for THAT status only. This should cut the visual footprint by roughly 80% while preserving full functionality.
```

## Task 23 [HIGH] — Booking Statuses — Rename "IFTTT Service Rules" to "Automatic Status Rules"
```
Edit src/components/facility/BookingStatusSettings.tsx (settings section=booking-statuses).

PRESERVE: the rules themselves and their behaviour — System Statuses, Custom Statuses (On Hold, Waiting List), Auto-Transition Rules, the service-conditional rules with enabled toggles, and "+ Add ... Rule".

ISSUE: "IFTTT" is jargon that non-technical facility owners will not understand.

DO: Rename the "IFTTT Service Rules" section to "Automatic Status Rules" and change its description to: "Set conditions that automatically move a booking to a specific status — for example, automatically set grooming bookings to In Progress when the pet checks in." Rename the "+ Add IFTTT Rule" button to "+ Add Automatic Status Rule". Keep all rule logic intact.
```

## Task 25 [HIGH] — Express Check-In — Inline Required/Optional/Disable control per row
```
Edit src/components/facility/CheckinRequirementsSettings.tsx (settings section=checkin-requirements).

PRESERVE: the Check-In Sections list (Feeding Instructions — Required, Medication Instructions — Required, Belongings Checklist — Optional, Additional Contacts Verification — Required, Vaccination Verification — Required, Waiver / Agreement Confirmation — Required); Custom Sections with "+ Add custom section"; and the Testing panel.

ISSUE: The Required / Optional / Disable state is shown only as a badge label with no inline control to change it.

DO: Make Required / Optional / Disable a direct dropdown or segmented control on each row, changeable without entering a separate edit mode. Place the control to the right of the section name. Changes save immediately with a success toast.
```

## Task 27 [HIGH] — Express Check-In — Service-specific check-in requirements
```
Edit src/components/facility/CheckinRequirementsSettings.tsx (settings section=checkin-requirements).

ISSUE: All check-in requirements currently apply to all services. A daycare facility may not need Feeding Instructions, but a boarding facility always does.

DO: Add a "Service-specific check-in requirements" capability: allow each check-in section to be toggled per service (Boarding / Daycare / Grooming / Training / etc.). A section can be Required for one service and Disabled for another. Persist the per-service configuration via the query layer.
```

## Task 29 [HIGH] — Retail / POS — Add Receipt Settings section
```
Edit src/components/facility/RetailSettings.tsx (settings section=retail).

ISSUE: There is no receipt / POS UI configuration in Retail Settings.

DO: Add a "Receipt Settings" section at the BOTTOM of Retail/POS Settings. Contents:
- Receipt Header (custom text shown at top of receipt)
- Receipt Footer (e.g. "Thank you for shopping with us!")
- Receipt Format: Print / Email / Both
- "Show facility logo on receipt" toggle
- Return policy text (shown on receipt)
- "Send test receipt" button
Persist via src/lib/api/retail.ts.
```

## Task 34 [HIGH] — Estimate Settings — Max follow-ups + stop conditions
```
Edit src/components/estimates/EstimateFollowUpSettings.tsx (settings section=estimate-settings).

PRESERVE: Auto Follow-Up Reminders with the two triggers (Estimate Not Viewed / Viewed but Not Booked), each with a delay field, channel selector (Email), and message template with merge tags ({customer_name}, {pet_name}, {service_name}, {estimate_total}, {estimate_link}).

ISSUE: "Estimate Not Viewed" is set to 1 day but has no maximum follow-up count — it could send forever. The stopping condition is undefined.

DO: Add a "Max follow-ups" field to each reminder rule: "Send up to [X] times, then stop." Default 2 for Estimate Not Viewed, 1 for Viewed but Not Booked. Add a "Stop following up when" condition with options: estimate is accepted / estimate expires / customer books a different service. Persist per rule.
```

## Task 35 [HIGH] — Estimate Settings — "Preview rendered message" toggle
```
Edit src/components/estimates/EstimateFollowUpSettings.tsx (settings section=estimate-settings).

ISSUE: The template textarea shows raw merge-tag syntax ({customer_name} etc.) with no preview of how the rendered message will look.

DO: Add a "Preview rendered message" toggle above the template textarea. In Preview mode, swap the textarea for a read-only card showing the message with merge tags replaced by sample data (e.g. "{customer_name}" → "Sarah Johnson"). Toggle back to Edit to keep writing. Reuse the exact pattern already used by the Report Card Builder — apply it consistently here.
```

## Task 36 [HIGH] — Estimate Settings — Estimate Expiry section
```
Edit src/components/estimates/EstimateFollowUpSettings.tsx (settings section=estimate-settings).

ISSUE: There is no estimate-expiry setting. Expired estimates should not be bookable.

DO: Add an "Estimate Expiry" section at the TOP of Estimate Settings (before the Follow-Up Reminders):
- "Expires after [X] days" field (default 30)
- "Expired estimate action" option: Mark as declined / Archive / No action
When an estimate expires, the follow-up reminder chain must stop automatically (ties into Task 34's stop conditions). Persist the settings.
```

## Task 38 [HIGH] — Deposit Rules — Deposit Refund Policy section
```
Edit src/components/facility/DepositRulesSettings.tsx (settings section=deposit-rules).

PRESERVE: the Per-Service Rules table (Boarding 70% flat, Daycare disabled, Grooming $25, Training 50%, Vet disabled, Retail disabled) and the Booking Value Threshold rule (High-Value Booking Deposit when value exceeds $2k → 25% flat).

ISSUE: There is no setting for what happens to a deposit when a booking is cancelled.

DO: Add a "Deposit Refund Policy" section below the per-service rules: "If a booking is cancelled, the deposit is:" with options — Full refund if cancelled before [X] hours / Non-refundable / Applied as credit toward a future booking. This must stay consistent with the Cancellation Policy in Business Settings — read/reference that policy so the two don't contradict. Persist the selection.
```

## Task 42 [HIGH] — Invoice Template — Invoice Number Format setting
```
Edit src/components/facility/InvoiceTemplateSettings.tsx (settings section=invoice-template).

ISSUE: The invoice shows "#1001" (a simple counter). Invoice numbering should be configurable.

DO: Add an "Invoice Number Format" setting where the admin defines the pattern. Example: [YYYY]-[MM]-[####] generates INV-2026-06-0001. Provide controls for: prefix text, year format, month format, and a sequential counter. Reflect the configured format live in the preview. Persist via the invoice-template factory.
```

## Task 43 [HIGH] — Invoice Template — Payment Terms field
```
Edit src/components/facility/InvoiceTemplateSettings.tsx (settings section=invoice-template).

DO: Add a "Payment Terms" field to Invoice Settings with standard options — Due on receipt / Net 7 / Net 14 / Net 30 / Custom — plus a custom text field for "Custom". The chosen term line is shown on the invoice (and in the live preview) and sets the customer's expectation for when payment is due. Persist the value.
```

---

# PART C — MEDIUM (14 tasks)

---

## Task 4 [MEDIUM] — Form Requirements — Prefix Requirements Overview entries with service name
```
Edit src/components/forms/FormRequirementsSettings.tsx (settings section=form-requirements).

ISSUE: The Requirements Overview groups forms by stage but gives no indication which service each form belongs to when forms from multiple services appear under the same stage.

DO: In the Requirements Overview, render each entry as "[Service Name] · [Form Name]" instead of just "[Form Name]". This keeps the overview scannable when a facility has many services with overlapping form names.
```

## Task 8 [MEDIUM] — Form Notifications — Differentiate Staff vs Customer badge colours
```
Edit src/components/forms/FormNotificationSettings.tsx (settings section=form-notifications).

ISSUE: The Staff badge and the Customer badge both use the same purple colour, so the two sections don't separate visually.

DO: Give the two badges different colours for quick scanning — e.g. teal for the "Staff" badge and blue for the "Customer" badge. Purely a colour/label change; keep the section content intact.
```

## Task 14 [MEDIUM] — Pet Breeds — Subtitle for the "Other" section
```
Edit src/components/facility/BreedManagement.tsx (settings section=pet-breeds).

ISSUE: The "Other" section is collapsed with only a count badge; it is unclear what it contains.

DO: Add a subtitle to the "Other" section header: "Other species (rabbits, ferrets, guinea pigs, birds, reptiles, etc.)" to set the correct expectation for what the section covers.
```

## Task 16 [MEDIUM] — Care Tasks — Edit button per category row
```
Edit src/components/facility/CareTaskSettings.tsx / FeedingMedicationConfig.tsx (settings section=care-tasks).

PRESERVE: the Feeding categories (Schedules, Types, Sources, Units, Destinations, Frequencies, Allowed Proteins) and Medication categories (Methods, Frequencies, Quick Times) as labelled tag groups.

ISSUE: Each category is a compact tag row; there is no discoverable way to see or manage the full list of values without clicking an individual tag.

DO: Add an "Edit" button to each category row (Schedules, Types, Sources, Units, etc.) that opens an inline edit mode showing ALL tags in that category with the ability to rename, reorder, and delete individual values. Persist changes via the care-tasks query factory.
```

## Task 18 [MEDIUM] — Care Tasks — Sticky unsaved-changes save banner
```
Edit src/components/facility/CareTaskSettings.tsx (settings section=care-tasks).

ISSUE: The existing "Save Changes" button sits in the very bottom-right corner and is easy to miss after scrolling the long page.

DO: Add a sticky save banner that appears at the bottom (or top) of Care Tasks whenever unsaved changes exist, with the Save Changes action in it. Keep the existing save wiring; just make it always reachable when there are pending edits.
```

## Task 21 [MEDIUM] — Evaluations — Group Buffer & Pets-per-slot under "Slot Constraints"
```
Edit src/components/facility/EvaluationBookingWizardSettings.tsx (settings section=evaluations).

PRESERVE: Booking Wizard Configuration — Available Days, Session Lengths, Availability Windows, Slot Configuration (Fixed start times vs Rolling window), Start Times list — and the Booking Wizard Preview.

ISSUE: "Buffer between sessions" and "Pets per slot" sit at the bottom of Slot Configuration and look unrelated to the time slots, though they are critical scheduling constraints.

DO: Move "Buffer between sessions" and "Pets per slot" to directly below the Start Times list, grouped under a "Slot Constraints" sub-heading, so the page reads top-to-bottom in operational order: Available Days → Session Length → Windows → Slots → Constraints.
```

## Task 24 [MEDIUM] — Booking Statuses — Collapsible "Status Flow Preview" diagram
```
Edit src/components/facility/BookingStatusSettings.tsx (settings section=booking-statuses).

ISSUE: There is no visual diagram showing how statuses connect, so an owner with custom statuses cannot verify the lifecycle is consistent.

DO: Add a small, collapsible "Status Flow Preview" panel at the TOP of the Booking Statuses page. It renders a simple horizontal flow diagram of the booking lifecycle from the configured statuses and transition rules — read-only, for verification only. Example: Estimate Sent → Pending → Confirmed → Checked-In → In Progress → Completed. Build it from the actual configured statuses, not a hardcoded sequence.
```

## Task 26 [MEDIUM] — Express Check-In — Recipient email on the Testing panel
```
Edit src/components/facility/CheckinRequirementsSettings.tsx (settings section=checkin-requirements).

ISSUE: The Testing panel's "Send check-in form" and "Send reminder" buttons have no recipient selector — it's unclear who receives the test.

DO: Add a recipient input to the Testing panel: "Send to: [email field]", defaulting to the logged-in user's email. The test send uses this address.
```

## Task 30 [MEDIUM] — Retail / POS — Low Stock Alerts section
```
Edit src/components/facility/RetailSettings.tsx (settings section=retail).

ISSUE: Low-stock alert configuration is missing; the operational trigger belongs here in Retail Settings.

DO: Add a "Low Stock Alerts" section:
- Default low-stock threshold (units) field: "Alert me when any product falls below X units."
- Note that per-product overrides are set from the individual product page
- Toggle: "Send low-stock alert to [Staff Notifications channel]"
Persist via src/lib/api/retail.ts.
```

## Task 31 [MEDIUM] — Pricing Rules — Make "Available For" service chips clickable
```
Edit src/components/facility/PricingRulesSettings.tsx (settings section=pricing-rules).

PRESERVE: the two-panel layout (categorised rule types on the left with rule counts, content on the right); "How Discounts Combine" with its Quick Example preview; Multi-Pet, Long-Stay, and Room-Type rules with toggle/edit/duplicate controls.

ISSUE: The "Available For" chips (Boarding / Daycare / Grooming / Training / Yoda's Splash) in each rule's content area are read-only; changing a rule's service scope requires opening the full editor.

DO: Make the "Available For" service chips clickable — clicking a chip toggles that service in/out of scope for the selected rule with an immediate save, no modal required.
```

## Task 32 [MEDIUM] — Pricing Rules — Status dot per rule in the sidebar
```
Edit src/components/facility/PricingRulesSettings.tsx (settings section=pricing-rules).

ISSUE: The left sidebar rule list shows names and counts but no status indicator (active / paused / has an issue).

DO: Add a coloured status dot to each rule in the left sidebar: green = active, grey = inactive/disabled, amber = warning (e.g. the rule applies to a service that has been removed). Rules with warnings should also surface a count badge in their category header.
```

## Task 37 [MEDIUM] — Deposit Rules — Inline-editable deposit amounts
```
Edit src/components/facility/DepositRulesSettings.tsx (settings section=deposit-rules).

ISSUE: The rows are read-only behind a top-right Edit button; changing e.g. Boarding 70% → 50% requires entering a separate edit state.

DO: Make the deposit amount fields directly editable inline — clicking a value activates an input. The deposit type (flat / percentage) becomes a small inline dropdown. Commit changes per row immediately on focus-out, with a toast confirmation. Keep the Booking Value Threshold rule working.
```

## Task 39 [MEDIUM] — Deposit Rules — Remove or relabel Retail & Vet rows
```
Edit src/components/facility/DepositRulesSettings.tsx (settings section=deposit-rules).

ISSUE: The Retail (and Vet) rows show "Disabled — no deposit collected", but deposits don't apply to retail/vet transactions, which is confusing.

DO: Remove the Retail and Vet rows from Deposit Rules if those services do not support deposits. If they must remain for completeness, label them "N/A — deposits do not apply to retail/vet transactions" in grey italic text instead of "Disabled".
```

## Task 44 [MEDIUM] — Invoice Template — Confirm "Full Preview" opens a full-screen modal
```
Edit src/components/facility/InvoiceTemplateSettings.tsx (settings section=invoice-template).

DO: Confirm the "Full Preview" button (already present top-right) works and opens the invoice preview in a full-screen modal at real reading size — the small side-panel preview is fine for quick checks but too small to verify all details. If the button is not wired, wire it; lazy-load the modal via next/dynamic.
```

---

# PART D — LOW (1 task)

---

## Task 33 [LOW] — Pricing Rules — Verify sidebar search filters all categories
```
Edit src/components/facility/PricingRulesSettings.tsx (settings section=pricing-rules).

ISSUE: There are ~10 discount/surcharge/fee categories in the sidebar; finding a specific rule gets slow as more are added.

DO: Ensure the existing "Search categories" text field at the top of the left sidebar filters the rule list across ALL rule categories — not just the currently selected one. If the field already filters, verify and fix its scope so it matches rules in every category.
```

---

*Yipyy · Settings Page · UI/UX Workflow Specification · Part 2 · 44 tasks · Companion to `YIPYY_BUILD_PROMPTS.md` — combine both task tables for the full sprint. For Internal Development Use Only.*
