# YIPYY — Staff Portal Nav Parity (Client Feedback): Grounded Prompts

**Client feedback (3 items, one root cause):**
1. The staff sidebar must have the **same sequence and same pages as the facility side** (the Dashboard / Calendars / Communication / Grooming / Training / Retail / Intelligence / Customer / Scheduling / Operations / Financial / Reports / Marketing structure).
2. **Remove the staff‑only extras** that don't exist on the facility side — Grooming Queue, Full Calendar, Boarding, Daycare, Kennel View, Resources, etc.
3. Make it **the same as facility everywhere**, then let the manager **toggle every single feature on/off to build positions** — and remove the "random" orphan staff pages (e.g. `/employee/resources`, `/employee/daycare`).

**Target repo:** `C:\dev\puneet` · Next.js 16 · React 19 · shadcn/ui · **bun**

---

## ⭐ Root cause — there are TWO sidebars; the employee one is bespoke

The three feedback items are one problem. The facility and employee sidebars are driven by **two different nav definitions**, and the employee one was hand‑authored to *look like* the facility one but drifted into its own structure:

- **Facility sidebar — the real one:** `src/components/layout/facility-admin-sidebar.tsx`. It builds `filteredMenuSections` (a `MenuSection[]`) with the exact sequence from your screenshot: Dashboard · Calendars (Facility Calendar `/calendar`, Occupancy Calendar `/kennel-view`) · Communication (Calling, Inbox) · Grooming · Training · Retail/POS · Intelligence (Automations, Smart Insights) · Customer (`/clients`) · Scheduling · Operations (Daily Care, Bookings, Estimates, Tasks, Booking Requests, Evaluations, Staff, Operational Inventory, Memberships, Live Pet Cams) · Financial (Payments & Billing, Subscription & Billing, Gift Cards) · Reports · Marketing. **It already gates every section/item through the permission resolver** ("the sidebar makes no role decisions") — so owners see all, lower roles see less. It's already the switchboard the client wants.
- **Employee sidebar — the bespoke one:** `src/components/employee/EmployeeSidebar.tsx` renders `OPERATIONS_NAV_MODEL` / `getOperationsNav` from `src/lib/nav/operations-nav.ts` (627 lines). Its comment claims it "mirrors the facility sidebar's structure," but it invented **different groups** (Services / Bookings & Calendar / Clients / Financial / Communications / Operations / Marketing / Reports & Insights / Staff / Settings) and **bespoke items that aren't on the facility nav**: "Grooming Queue", "Full Calendar", "Boarding", "Kennel View", "Daycare", "Daycare Check‑In", "Services", "Resources". That's precisely feedback #1 + #2.

**The fix (delivers all three at once):** retire the bespoke `operations-nav.ts` model and make the employee sidebar render the **same shared facility nav definition** the facility sidebar uses. Because that definition is already permission‑gated per item, the employee automatically gets the identical sequence + pages (#1), the bespoke extras vanish because they simply aren't in the facility model (#2), and every item is one permission key → the manager toggles features per role to build positions (#3).

### Good news on the pages themselves
Most employee routes **already reuse the real facility pages** (`/employee/bookings` imports `@/app/facility/dashboard/bookings/page`, same for clients, retail, calendar, training, daycare, boarding, kennel, resources). So this is a **nav problem, not a pages problem** — the pages are mostly fine; the sidebar just points at the wrong menu model and exposes items the facility nav never had. The only genuinely bespoke page is the employee **grooming** page (doesn't reuse the facility grooming module) — reconcile that too.

---

## Module map

| Thing | File | Role in the fix |
|---|---|---|
| **Facility nav (source of truth)** | `src/components/layout/facility-admin-sidebar.tsx` (`filteredMenuSections`, `MenuSection[]`) | Extract into a shared model |
| **Bespoke employee nav (retire)** | `src/lib/nav/operations-nav.ts` (`OPERATIONS_NAV_MODEL`, `NAV_GROUPS`, `getOperationsNav`) | Delete / repoint |
| Employee sidebar | `src/components/employee/EmployeeSidebar.tsx` | Render the shared facility nav |
| RBAC resolver + keys + presets | `src/hooks/use-facility-rbac.tsx` (`resolvePermissions`), `src/types/facility-staff.ts` (`PermissionKey`, `PERMISSION_GROUPS`, `ROLE_PRESETS`) | Per‑item gating |
| Roles & Permissions UI (the switchboard) | `src/components/facility/FacilityRolesStudio.tsx` | One toggle per feature |
| Access gate | `src/components/employee/AccessRestricted.tsx` (`RequirePermission`) | Guard reused pages |
| Bespoke employee grooming page | `src/app/employee/(shell)/grooming/page.tsx` (doesn't reuse facility) | Reconcile to facility grooming |
| Orphan employee routes (drop from nav) | `/employee/(shell)/{resources,daycare,boarding,kennel}` | Remove from nav (see 3.x) |

---

## How to use
Paste one prompt at a time, in order. After a batch: `bun run typecheck && bun run lint && bun run build` (**bun** only). Status: ✅ VERIFY · ⚠️ FIX · ❌ BUILD · 🗑️ REMOVE.

---

# PART 1 — One shared nav definition

### 1.1 — Extract the facility nav into a shared, permission‑keyed model ❌ BUILD
```
Create a single source-of-truth nav model at src/lib/nav/facility-nav.ts by extracting the MenuSection[] currently built inline in src/components/layout/facility-admin-sidebar.tsx (the `filteredMenuSections` structure). Shape: NAV_SECTIONS: { id, label, items: { title, url, icon, permKey: PermissionKey, exact? }[] }[], in the EXACT order and grouping the facility sidebar shows: Dashboard · Calendars (Facility Calendar → /facility/dashboard/calendar, Occupancy Calendar → /facility/dashboard/kennel-view) · Communication (Calling → /calling, Inbox → /messaging) · [Services] (Grooming → /services/grooming, Training → /services/training, Retail/POS → /services/retail) · Intelligence (Automations → /automations, Smart Insights → /insights) · Customer → /clients · Scheduling → /services/scheduling · Operations (Daily Care, Bookings, Estimates, Tasks, Booking Requests → /online-booking, Evaluations, Staff, Operational Inventory → /inventory, Memberships → /services/memberships, Live Pet Cams → /petcams) · Financial (Payments & Billing → /billing, Subscription & Billing → /settings/billing, Gift Cards → /gift-cards) · Reports (Reports & Analytics → /reports) · Marketing (Marketing, Loyalty Program, Loyalty Reports). Attach a permKey to EVERY item (see 4.1 for the key list; add missing keys there). Then refactor facility-admin-sidebar.tsx to render from NAV_SECTIONS (unchanged behaviour — it already gates each item via the resolver). This is now the ONE nav both sidebars use.
```

---

# PART 2 — Point the employee sidebar at the facility nav (delivers #1 + #2)

### 2.1 — Render the employee sidebar from the shared facility nav ⚠️ FIX
```
Rewrite src/components/employee/EmployeeSidebar.tsx to render from src/lib/nav/facility-nav.ts NAV_SECTIONS (1.1) instead of OPERATIONS_NAV_MODEL / getOperationsNav from src/lib/nav/operations-nav.ts. For the signed-in employee, resolve their effective permissions (use-facility-rbac resolvePermissions(staffId)) and render each section/item exactly as the facility sidebar does: an item shows iff its permKey is granted; a section shows iff at least one of its items is granted. The result MUST be pixel-identical in sequence, grouping, and labels to the facility sidebar — same section headers (Calendars, Communication, Intelligence, Operations, Financial, Reports, Marketing), same order, same page links — just filtered to the employee's permissions. Do NOT keep the old bespoke groups (Services / Bookings & Calendar / etc.) or bespoke items (Grooming Queue, Full Calendar, Boarding, Kennel View, Daycare, Resources). Mirror the same into src/components/employee/EmployeeBottomNav.tsx.
```

### 2.2 — Route links resolve under /employee for reused pages ⚠️ FIX
```
The facility nav URLs are /facility/dashboard/*. Employees must stay in the employee shell. Add a small mapping so each NAV_SECTIONS item renders its employee-shell equivalent route (e.g. /employee/bookings, /employee/clients, /employee/grooming, /employee/calendar, /employee/reports, …) which already reuse the facility page component behind RequirePermission. Where an employee wrapper route doesn't exist yet for a facility nav item the employee can be granted (e.g. Estimates, Evaluations, Memberships, Live Pet Cams, Automations, Gift Cards, Billing, Marketing, Loyalty, Smart Insights, Scheduling, Occupancy Calendar), create the ~10-line wrapper (import the facility page + <RequirePermission permKey=...>), following the existing /employee/bookings pattern. Net result: every item in the shared nav has a working employee route that renders the real facility page, gated by permission.
```

---

# PART 3 — Remove the bespoke model + orphan pages (delivers #2 + #3c)

### 3.1 — Retire the bespoke employee nav model 🗑️ REMOVE
```
Delete src/lib/nav/operations-nav.ts (OPERATIONS_NAV_MODEL, NAV_GROUPS, getOperationsNav) now that EmployeeSidebar renders from facility-nav.ts (2.1). Grep the repo for any remaining import of operations-nav / getOperationsNav / OPERATIONS_NAV_MODEL and repoint or remove them. Confirm nothing else depends on the bespoke groups.
```

### 3.2 — Reconcile the bespoke employee grooming page ⚠️ FIX
```
src/app/employee/(shell)/grooming/page.tsx is bespoke (it does NOT reuse the facility grooming module — it's the "Grooming Queue" the client flagged). Replace it with a wrapper that renders the real facility grooming module page (@/app/facility/dashboard/services/grooming/page) behind <RequirePermission permKey="view_grooming_queue">, exactly like /employee/bookings reuses the facility bookings page. The employee then sees the identical grooming module (the Check-In Board etc.), permission-filtered — not a separate "Grooming Queue" screen.
```

### 3.3 — Remove orphan staff pages with no facility‑nav equivalent 🗑️ REMOVE / ⚠️ FIX
```
The staff-only pages the client flagged as "random" — /employee/(shell)/resources, /employee/(shell)/daycare, /employee/(shell)/boarding, /employee/(shell)/kennel — are not items on the facility sidebar, so after Part 2 they no longer appear in the employee nav. Now clean them up: if the facility sidebar has NO equivalent nav item, remove the employee route (delete the folder) so there's no orphan URL — the facility manages boarding/daycare/kennel via the Grooming/Training/Bookings/Occupancy pages, not standalone nav. If any of these IS actually reachable on the facility side under a different item (e.g. Occupancy Calendar == kennel-view), keep only that one, mapped through the shared nav (2.2), and delete the rest. Grep for any links pointing at the removed routes and repoint them. End state: no /employee page exists that isn't reachable from the shared facility nav.
```

---

# PART 4 — Per‑feature toggle to build positions (delivers #3b)

### 4.1 — Every nav item has its own permission key ⚠️ FIX
```
For the manager to switch each feature on/off (feedback #3), every item in src/lib/nav/facility-nav.ts NAV_SECTIONS must map to a distinct PermissionKey in src/types/facility-staff.ts. Audit the item→key mapping and ADD any missing keys (with labels + a group) to PERMISSION_GROUPS so each of these has a dedicated view key: Dashboard, Facility Calendar, Occupancy Calendar, Calling, Inbox, Grooming, Training, Retail/POS, Automations, Smart Insights, Customer/Clients, Scheduling, Daily Care, Bookings, Estimates, Tasks, Booking Requests, Evaluations, Staff, Operational Inventory, Memberships, Live Pet Cams, Payments & Billing, Subscription & Billing, Gift Cards, Reports & Analytics, Marketing, Loyalty Program, Loyalty Reports. Reuse existing keys where present (view_bookings, view_client_list, view_grooming_queue, view_all_calendars, view_inventory, retail_pos_access, marketing_view, ops_view_reports, etc.); only add the genuinely missing ones. This makes the nav a complete per-feature switchboard.
```

### 4.2 — Roles & Permissions shows a toggle per feature ✅ VERIFY / ⚠️ FIX
```
In the Roles & Permissions studio (src/components/facility/FacilityRolesStudio.tsx + StaffPermissionEditor.tsx), confirm the manager can toggle each of the 4.1 permission keys on/off for a role AND for an individual staff member (override), and that flipping a key immediately changes whether that nav item + page appear in that person's employee portal. Group the toggles by the SAME sections as the nav (Calendars, Communication, Operations, Financial, …) so "building a position" reads as "turn on the features this position needs." This is the mechanism the client described: assemble a position by switching features. Verify granting/revoking a key updates the employee sidebar on their next load (resolvePermissions already re-reads).
```

### 4.3 — Seed the preset positions from the toggles ✅ VERIFY
```
Confirm each ROLE_PRESET in src/types/facility-staff.ts grants exactly the nav features that position should see (so the defaults are sensible starting points a manager then customizes): e.g. a Groomer preset → Grooming, Calendar, Clients, Bookings, Daily Care (as applicable), Inbox, Tasks ON; Financial/Reports/Marketing/Staff/Settings OFF. A Daycare Attendant → Daily Care, Occupancy Calendar, Bookings, Clients, Inbox, Tasks ON; grooming/financial/etc. OFF. Reception → the broad front-desk set (already generous). Managers/Owner → all. These are just defaults; the per-feature toggles (4.2) let the manager build any custom position on top.
```

---

# PART 5 — Personal items match the facility chrome

### 5.1 — Move employee personal items to the header (match facility) ⚠️ FIX
```
The facility sidebar has no "My Workspace" group — personal actions live in the top header (Clock in button, notification bell, search, + New, avatar/profile menu). To make the employee portal identical, move the employee's personal items OUT of the sidebar: Clock in/out, Notifications, Settings (personal), My write-ups, My documents, My performance → into the employee header / avatar dropdown (src/components/employee/EmployeeHeader.tsx), matching the facility header. "My Schedule" stays reachable via the Scheduling nav item (filtered to the employee's own shifts by their scope) or a header link. End state: the employee sidebar is a pure mirror of the facility sidebar; personal/self-service actions live in the header exactly as they do on the facility side.
```

---

# Appendix — Verification

### Z.1 — Sidebars are identical; positions are feature-toggles
```
1) Sign in as the Manager employee (Nathalie) → the employee sidebar is pixel-identical to the facility sidebar: same sections in order (Dashboard, Calendars, Communication, Grooming, Training, Retail/POS, Intelligence, Customer, Scheduling, Operations, Financial, Reports, Marketing), same page links, NO Grooming Queue / Full Calendar / Boarding / Daycare / Kennel View / Resources. Every page opens the real facility screen.
2) Grep confirms operations-nav.ts is gone and no /employee page exists that isn't in the shared nav; the bespoke grooming page now reuses the facility grooming module.
3) In Roles & Permissions, build a "Daycare Attendant" position by toggling features: turn ON Daily Care + Occupancy Calendar + Bookings + Clients + Inbox + Tasks, turn everything else OFF → sign in as that employee → the sidebar shows exactly those items in facility order, nothing else, and restricted URLs render AccessRestricted.
4) Toggle one feature on for a single staff member (individual override) → it appears for only that person.
Run: bun run typecheck && bun run lint && bun run build. Report each feedback item (#1 same sequence/pages, #2 extras removed, #3 per-feature positions + orphans gone) as DONE with files touched.
```

---

*Addresses the client's three staff-portal feedback items with one architectural change: unify the employee sidebar onto the facility nav definition (`facility-admin-sidebar.tsx` → shared `facility-nav.ts`), retire the bespoke `operations-nav.ts`, reconcile/remove the orphan employee pages, and drive every nav item from one permission key so managers assemble positions by switching features on and off. Most employee pages already reuse the real facility pages — this is a nav-unification fix, not a page rebuild.*
