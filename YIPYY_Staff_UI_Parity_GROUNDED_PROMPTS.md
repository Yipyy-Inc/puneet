# YIPYY — Staff Portal UI Parity & Permissions: Grounded Copy‑Paste Prompts

**Spec:** `Yipyy_Staff_UI_Parity_Workflow.docx` (Sections 1–9)
**Target repo:** `C:\dev\puneet` — Next.js 16 App Router · React 19 · TS 5.9 strict · Tailwind 4 · shadcn/ui · **bun**
**Audited against real code:** yes — every change is mapped to the file that owns it.

---

## ⭐ Audit finding (read this first)

The spec's whole thesis is "one UI, filtered by the permission rows already configured in Settings → Roles & Permissions, keyed on permission strings — never role names." Auditing the code against that, the situation is very specific:

**The permission ENGINE is fully built. The employee PORTAL ignores it.** That gap is the entire job.

- ✅ **The facility‑staff RBAC engine exists and matches the spec exactly.** `src/hooks/use-facility-rbac.tsx` is a full provider with `can(key)`, `usePermission(key)`, `useCan(key): AccessScope | false`, `useEffectivePermissions()`, `resolveFor(staff, key) => {granted, scope}`, `resolvePermissions()`, and **individual overrides** (`setOverride`). `src/types/facility-staff.ts` defines `PermissionKey`, `AccessScope`, `ALWAYS_ON_PERMISSIONS`, `PERMISSION_GROUPS` (the catalog), and `ROLE_PRESETS` (the 13 presets). The spec's keys are the code's keys 1:1 — `view_grooming_queue`, `perform_grooming`, `log_feedings`, `log_incidents`, etc. all exist. So **Section 8A (permissionCheck), 8C (resolved object + overrides), and the Section 7 override pipeline are already built.**
- ✅ **The Roles & Permissions Studio UI exists** (`src/components/facility/FacilityRolesStudio.tsx`, 43 KB): preset list, scope grid, custom‑role editor, duplicate. That's Section 1 and most of Section 7.
- ❌ **The employee portal is 100% role‑name driven and unaware of the engine.** `src/components/employee/EmployeeSidebar.tsx` renders from a hardcoded `NAV_BY_ROLE[staff.primaryRole]` map (single flat "Navigation" group, no My Workspace/Operations split, zero permission checks). Dashboard Quick Actions are keyed by role name too. This is exactly the anti‑pattern Table 7 forbids. **Sections 2, 3, 4, 5, 6 are the build: wire the portal to the engine.**
- ❌ **No Access Restricted page** (Section 8D). `src/components/facility/PermissionGuard.tsx` is a **gutted no‑op** ("permission system is removed … always renders children") — do not reuse it.

### ⛔ Wrong‑code trap — there are THREE RBAC systems; use only ONE

| System                            | File(s)                                                                                               | Verdict                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Facility‑staff RBAC (THE ONE)** | `src/hooks/use-facility-rbac.tsx`, `src/types/facility-staff.ts`, `src/lib/facility-roles-store.ts`   | ✅ Use this everywhere. Keys = the spec's keys.               |
| Scheduling RBAC (decoy)           | `src/lib/rbac.ts` (`hasPermission(role, "schedule.view")`, roles owner/general_manager/…)             | 🚫 Different role model + dotted keys. Not the spec.          |
| Platform super‑admin RBAC (decoy) | `src/lib/role-permissions-catalog.ts`, `src/lib/role-permissions-store.ts`, `src/data/admin-users.ts` | 🚫 Tenant Management / Platform Control. Not the spec.        |
| Gutted guard (decoy)              | `src/components/facility/PermissionGuard.tsx`                                                         | 🚫 No‑op stub. Build the real Access Restricted page instead. |

If a prompt has you importing from `lib/rbac.ts`, `role-permissions-catalog.ts`, or `PermissionGuard.tsx` for this work, stop — the right import is `@/hooks/use-facility-rbac` (+ `@/types/facility-staff`).

### ⚙️ Mock‑app scope

Section 8 describes a backend (`GET /api/employee/me/permissions`, server‑side `WHERE assigned_staff_id`). This is a **mock prototype** with no server. So: the "resolved permissions object" = what `use-facility-rbac`'s `resolvePermissions()` / `useEffectivePermissions()` already returns for the acting viewer (loaded once via the provider); "assigned‑only server‑side filter" = enforce the scope in the mock **data/query layer** (the `src/lib/api/*` factories + data helpers), not as cosmetic client hiding; a "403" = render the Access Restricted page. Build it so a real endpoint could drop in behind the same hook later.

---

## Module map

| Area                                     | Real file(s)                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RBAC engine (use this)**               | `src/hooks/use-facility-rbac.tsx` — `useFacilityRbac`, `usePermission(key)`, `useCan(key)`, `useEffectivePermissions()`, `useFacilityViewer()`, `resolveFor`, `setOverride`                  |
| Permission catalog + presets + types     | `src/types/facility-staff.ts` — `PermissionKey`, `AccessScope`, `ALWAYS_ON_PERMISSIONS`, `PERMISSION_GROUPS`, `ROLE_PRESETS`                                                                 |
| Staff records (primaryRole, assignments) | `src/data/facility-staff.ts`                                                                                                                                                                 |
| Custom roles + overrides persistence     | `src/lib/facility-roles-store.ts`, `src/lib/api/roles.ts`                                                                                                                                    |
| Roles & Permissions Studio (admin)       | `src/components/facility/FacilityRolesStudio.tsx`                                                                                                                                            |
| Individual staff permission editor       | `src/components/facility/StaffPermissionEditor.tsx`, `src/app/facility/dashboard/staff/_components/role-matrix.tsx`                                                                          |
| **Employee shell**                       | `src/app/employee/(shell)/layout.tsx`                                                                                                                                                        |
| **Employee nav (NAV_BY_ROLE — rewrite)** | `src/components/employee/EmployeeSidebar.tsx`, `src/components/employee/EmployeeBottomNav.tsx`                                                                                               |
| Employee header (notif bell)             | `src/components/employee/EmployeeHeader.tsx`                                                                                                                                                 |
| Employee dashboard + widgets             | `src/app/employee/(shell)/page.tsx`, `src/components/employee/EmployeeDashboard.tsx`, `src/components/employee/employee-dashboard-widgets.tsx`                                               |
| HR alert banner                          | `src/components/employee/WriteUpAckBanner.tsx`                                                                                                                                               |
| Employee module pages                    | `src/app/employee/(shell)/{bookings,clients,grooming,daycare,boarding,training,retail,schedule,kennel,tasks}/page.tsx`                                                                       |
| Demo account picker                      | `src/app/employee/select/_client.tsx` (+ staff in `src/data/facility-staff.ts`)                                                                                                              |
| Admin modules to reuse for parity        | grooming `src/app/facility/dashboard/services/grooming/*`, bookings `.../dashboard/bookings`, clients `.../dashboard/clients/[id]`, daily care `src/components/daily-care/DailyCareView.tsx` |

---

## How to use this pack

1. Paste one prompt at a time, **in the spec's Build Order** (Section 9) — the prompts below are sequenced to it.
2. Each prompt names the **real file(s)** and a **Status**.
3. **Verification (green sequence) noted once, not per prompt.** After a batch: `bun run typecheck && bun run lint && bun run format:check` (add `bun run build` when a route changed). Use **bun** only.
4. Mock‑app scope applies (permissions object = the RBAC hook; assigned‑only = data‑layer scope; 403 = Access Restricted page).
5. **The golden rule (Section 8A / Table 7):** every UI conditional calls `usePermission(key)` / `useCan(key)` with a permission key — NEVER `role === "groomer"` or `isManager`.

### Status legend

✅ VERIFY · ⚠️ FIX · ❌ BUILD · 🔁 IMPROVE

### Permission states (from the engine's `AccessScope`)

`granted` → element renders fully · `assigned_only`/scoped → element renders, data scoped to the viewer's assigned records · `not_granted` (absent from the resolved map) → element is **not in the DOM** (not greyed) · always‑on (`ALWAYS_ON_PERMISSIONS`) → personal features that can never be removed.

---

# PART 0 — Foundations (Build Order 1–3)

### 0.1 — Confirm the engine + standardize on it ✅ VERIFY (Build Order 1–2)

```
Read src/hooks/use-facility-rbac.tsx and src/types/facility-staff.ts. Confirm the acting employee's resolved permissions are available via the FacilityRbacProvider and these hooks: usePermission(key): boolean, useCan(key): AccessScope | false, useEffectivePermissions(): the flat key→scope object, useFacilityViewer(): the acting staff + can(). Confirm resolveFor(staff, key) merges ROLE_PRESETS defaults + custom-role + individual overrides (setOverride), which is the spec's 8C "role defaults + individual overrides." This is the ONLY permission system to use for the employee portal.
Do NOT use these decoys anywhere in this work: src/lib/rbac.ts (scheduling RBAC), src/lib/role-permissions-catalog.ts + role-permissions-store.ts (platform super-admin RBAC), src/components/facility/PermissionGuard.tsx (gutted no-op). Confirm the FacilityRbacProvider wraps the /employee shell (src/app/employee/(shell)/layout.tsx); if not, wrap it so every employee screen can call the hooks. Produce a one-paragraph note of the exact hook signatures downstream prompts should call.
```

### 0.2 — `permissionCheck(key)` convenience + resolved object (mock endpoint) ✅ VERIFY / ⚠️ FIX (Build Order 1–2)

```
Section 8A/8C. The engine already exposes can(key)/usePermission(key)/useCan(key)/useEffectivePermissions(). Do NOT build a parallel util. If a single helper name is useful for readability, add a thin alias permissionCheck(key): "granted" | "assigned_only" | "not_granted" in src/lib/facility-permissions.ts that derives from useCan/resolveFor (map AccessScope→those three buckets). For the spec's "GET /api/employee/me/permissions" (8C), the mock equivalent is useEffectivePermissions() resolved from the provider on session start — document that the hook IS the endpoint in this prototype, shaped so a real fetch can back it later. Confirm the object is re-resolved on viewer change (it already is via the store subscription), satisfying "fetched fresh each session; manager edits appear on refresh."
```

### 0.3 — Access Restricted page ❌ BUILD (Build Order 3)

```
Section 8D. Build a clean, branded, reusable full-page component src/components/employee/AccessRestricted.tsx (do NOT reuse the gutted src/components/facility/PermissionGuard.tsx). Content, centered on a plain white page: Yipyy logo, "You don't have access to this section." (large), "Contact your manager if you believe this is an error." (small grey), and a "Go to my dashboard" button → /employee. No nav, no back button, no breadcrumbs, and it must not render any restricted content behind it. Also add a small wrapper <RequirePermission permKey=... >{children}</RequirePermission> that renders children when usePermission(key) !== not_granted, else renders <AccessRestricted/> — used to gate whole module pages (Part 4). When a scoped data call "would 403" (mock: the record isn't in the viewer's assigned set), the page renders <AccessRestricted/> too.
```

---

# PART 1 — Navigation Sidebar (Build Order 4; Sections 3A, 6)

### 1.1 — Rewrite EmployeeSidebar from role‑map to permission‑driven ❌ BUILD (the centerpiece)

```
Rewrite src/components/employee/EmployeeSidebar.tsx. Today it renders NAV_BY_ROLE[staff.primaryRole] — a hardcoded per-role nav in a single flat "Navigation" group. Replace it entirely with a permission-driven, two-section sidebar:
- "My Workspace" (top): personal items that ALWAYS render (backed by ALWAYS_ON_PERMISSIONS) — Dashboard, My Schedule, My Tasks, My Documents, My Performance, My Write-ups, Availability, Clock in/out. Never gated.
- "Operations" (below): each section + item renders per the RBAC engine. Build a declarative NAV_MODEL: an array of Operations sections, each { label, permKey (the section-visibility key), items: [{ title, url, permKey }] }. A section renders iff at least one of its items' permKey resolves to granted OR assigned_only for the viewer (Section 3A rule). An item renders iff its permKey is granted/assigned_only; absent when not_granted.
Map items→keys per spec Table 3, e.g.: Grooming section (view_grooming_queue → "Check-In Board"/"Today's Queue"; view_own_grooming_calendar → "My Calendar"; view_all_grooming_calendars → "Full Calendar"), Bookings (view_bookings), Facility Calendar (view_all_calendars), Boarding (view_boarding_dashboard), Daycare (view_daycare_dashboard), Daily Care (log_feedings OR boarding_daily_care_log), Clients (view_client_list), Retail/POS (access_point_of_sale), Calling (view_calling), Inbox (view_message_inbox), Incidents (view_incidents), Marketing (view_marketing), Smart Insights (view_smart_insights), Staff (view_staff_directory), Inventory (view_inventory), Settings (facility_settings), HQ (view_hq). Resolve visibility with usePermission/useCan from @/hooks/use-facility-rbac — NEVER staff.primaryRole. Delete NAV_BY_ROLE. Mirror the same model into src/components/employee/EmployeeBottomNav.tsx (mobile).
```

### 1.2 — Verify the 6 demo accounts fall out correctly ✅ VERIFY (Build Order 8; Section 6)

```
With Part 1.1 done, the 6 demo employee navs should be correct automatically from their role presets. Verify each via src/app/employee/select/_client.tsx + the staff presets in src/data/facility-staff.ts / ROLE_PRESETS:
- Manager (Nathalie Côté): My Workspace label present (spec's "My Account → My Workspace" rename is satisfied by the new section name), "Operations" label present, all modules visible.
- Reception (Yasmine Tremblay): NO Boarding/Daycare/Training sections (those dashboards not_granted); Grooming shows "Check-In Board" (check_in_out = assigned_only), not "Today's Queue"; Retail visible only if access_point_of_sale granted.
- Groomer (Olivia Beaumont): only Grooming items + "Today's Queue" label; NO Boarding/Daycare/Training; Daily Care hidden unless a Daily Care permission is granted for her.
- Trainer (Marcus Bélanger): only Training items; no Boarding/Daycare.
- Boarding (Dominic Levesque): Boarding items + Daily Care; no Grooming/Daycare/Training.
- Sanitation (Philippe Dubois): only Tasks + Log cleaning (Operations); no service modules.
If any demo account's nav is wrong, the fix is its ROLE_PRESET scope config in facility-staff.ts, NOT a hardcoded per-account nav. Report each account's before/after.
```

---

# PART 2 — Action Buttons & Table Columns (Build Order 5, 7; Sections 3B, 3C)

### 2.1 — Gate action buttons on permission keys ❌ BUILD (Build Order 5)

```
Section 3B / Table 4. Go through the employee-reachable screens and wrap each action control so it renders only when its permission key !== not_granted, using usePermission/useCan. Since the spec's directive is "same components as admin," prefer applying these gates in the SHARED components (so admin and employee both honor them, admin simply having the keys granted). Key mappings (Table 4): create_bookings → "+ New Booking" (+ calendar slot→wizard); edit_bookings → "Edit Booking"; cancel_bookings → "Cancel Booking"; perform_grooming → Check In/Start/Mark Ready on a card (only the viewer's own cards when assigned_only); add_grooming_notes → notes field in Mark Ready; upload_grooming_photos → photo steps in Check-In + Mark Ready modals; edit_grooming_pricing → Rates edit; take_payment → Charge/Collect; process_refunds → Issue Refund; apply_discounts → Apply Discount; manage_grooming_styles → Manage buttons; create_shifts → "+ Add Shift"; approve_time_off → Approve/Decline; log_incidents → "Report Incident" in booking More menu; manage_incidents → Close Incident + status dropdown; delete_clients → Delete; message_clients → Message button; view_client_financials → payments section. Start with the highest-traffic: Bookings, Grooming Check-In Board, Client profile.
```

### 2.2 — Hide table columns + KPI tiles on permission keys ❌ BUILD (Build Order 7)

```
Section 3C / Table 5. Conditionally render (omit from the DOM, don't grey) these columns/tiles by key: view_booking_amounts not_granted → Amount/Total column + Payment status badge in the bookings table, price breakdown + Services panel + payment section in booking detail, AND the Expected/Collected Revenue KPI tiles on the Grooming Check-In Board (rest of the KPI row still renders); view_payroll not_granted → payroll/hourly-rate column in staff list; view_staff_permissions not_granted → Permissions column in staff list; view_client_financials not_granted → financial summary column in client list + billing tab on client profile; view_home_address not_granted → Address section on client profile (not in DOM); view_revenue not_granted → revenue/financial KPI tiles on dashboards/reports. Apply in the shared table/column components so admin+employee share one implementation.
```

---

# PART 3 — "Assigned Only" Data Scoping (Build Order 6; Section 8B)

### 3.1 — Scope data to the viewer's assigned records ❌ BUILD

```
Section 8B. When a permission resolves to an assigned/"assigned_only" scope (useCan(key) returns a scope, not false/"granted"), the data the screen shows must be scoped to the viewer's assigned records — enforced in the data/query layer, not as cosmetic client filtering. In this mock, apply the scope inside the src/lib/api/* query factories + data helpers the employee pages call (e.g. a bookings query gains a scope param = viewerId when view_bookings is assigned_only; grooming queue filtered to the viewer's stylistId; clients filtered to clients whose pets are assigned to the viewer; inbox to threads where the viewer is a participant/assigned). Same factory the admin uses, with the scope arg added for employees. If an employee opens a specific record URL not in their assigned set (e.g. /employee/bookings/1234), treat it as a 403 → render <AccessRestricted/> (Part 0.3). Do bookings first, then clients, then grooming queue, then inbox.
```

---

# PART 4 — Module Parity (Sections 5A–5G)

> Directive: the `/employee/*` module pages must render the SAME components as the admin modules, filtered by permissions — not simplified employee copies. Where an `/employee` page currently has a bespoke implementation, switch it to the admin component + permission gates.

### 4.1 — Grooming parity (5A) ❌ BUILD

```
Section 5A. Make /employee/grooming (src/app/employee/(shell)/grooming/page.tsx) render the SAME grooming module UI as admin (src/app/facility/dashboard/services/grooming/* — same tabs: Check-In Board, Calendar, Route Planner, Live Tracking, Stations, Groomers, Packages, Inventory, Rates, Tasks, Report Cards; same KPI row + card style), gated by keys: Check-In Board renders all groomer columns but only the viewer's column has cards + action buttons when view_grooming_queue = assigned_only; Calendar shows all columns but only the viewer's blocks are interactive when view_all_grooming_calendars = not_granted, and "+ New Event" hidden when create_bookings = not_granted; Rates tab hidden or read-only when edit_grooming_pricing = not_granted; no Manage buttons when manage_grooming_styles = not_granted; Revenue KPI tiles hidden when view_booking_amounts = not_granted (rest of KPI row stays); photo steps in Check-In/Mark Ready only on the viewer's own appointments when upload_grooming_photos = assigned_only. Reuse the admin components; wrap the gated pieces with usePermission/useCan.
```

### 4.2 — Bookings parity (5B) ❌ BUILD

```
Section 5B. /employee/bookings renders the same bookings table + detail as admin (src/app/facility/dashboard/bookings + the booking detail route), with: view_bookings = assigned_only → data scoped to the viewer's bookings (Part 3); view_booking_amounts = not_granted → Amount/Total column absent, and booking detail hides price breakdown + payment status + the right-side Services panel; create_bookings = not_granted → "+ New Booking" absent + calendar slot click does nothing; edit_bookings/cancel_bookings/log_incidents = not_granted → those actions absent from the detail action bar / More menu. Same layout, filters, columns — just gated + scoped.
```

### 4.3 — Clients parity (5C) ❌ BUILD

```
Section 5C. Clients: view_client_list = not_granted → Clients absent from Operations nav AND /employee/clients renders <AccessRestricted/>; = assigned_only → nav present, list scoped to clients whose pets are assigned to the viewer (Part 3). On the client profile (same layout as admin src/app/facility/dashboard/clients/[id]): view_home_address = not_granted → Address section not in DOM; view_client_financials = not_granted → billing/payments section + invoice history absent; add_pet_notes = assigned_only → "Add note" present only on the viewer's assigned pets; edit_pet_medical_records = not_granted → medical records visible (if view_pet_medical_records granted) but edit button absent.
```

### 4.4 — Daily Care parity (5D) ❌ BUILD

```
Section 5D. Daily Care (src/components/daily-care/DailyCareView.tsx) renders the same layout for employees, scoped: log_feedings = not_granted → Log button on feeding rows absent (rows still visible read-only if view_boarding_dashboard granted); log_medications = not_granted → Give buttons absent. For a Groomer with log_feedings/log_medications = not_granted and only perform_grooming: Daily Care must NOT appear in their Operations nav at all (handled by Part 1.1's section-visibility rule), and grooming care tasks show on their booking cards, not in Daily Care.
```

### 4.5 — Schedule, Calling/Inbox, Incidents parity (5E, 5F, 5G) ❌ BUILD

```
Sections 5E–5G.
- Schedule (5E): My Schedule (My Workspace) is always available (always-on). The facility Schedule view: view_all_staff_schedules = not_granted → only the viewer's own shifts render; = granted → full facility schedule (all columns) but view-only unless create_shifts/edit_shifts granted (no "+ Add Shift", no drag-resize; clicking a shift opens a read-only popup, not the edit modal).
- Calling/Inbox (5F): view_calling = not_granted → Calling nav item absent. view_message_inbox = assigned_only → Inbox present, scoped to the viewer's threads; view_all_message_threads = not_granted → the "All conversations" view/filter absent; send_messages = assigned_only → compose/reply only within the viewer's assigned-client conversations; cannot start a new conversation with a non-assigned client.
- Incidents (5G): view_incidents = not_granted → Incidents absent from Operations nav + list not reachable; log_incidents = granted → "Report Incident" appears in the booking More menu for assigned bookings (prefilled pets — this ties to the already-built incident feature); manage_incidents = not_granted → Close Incident + status dropdown absent from the incident detail modal even when view_incidents is granted.
```

---

# PART 5 — Employee Dashboard (Build Order 9; Section 4)

### 5.1 — Quick Action from first permitted action ⚠️ FIX (4A)

```
Section 4A / Table 6. In src/components/employee/employee-dashboard-widgets.tsx the Quick Action is currently keyed by role name (e.g. groomer: {label:"Start next appointment"}). Rewire it to derive from the viewer's PERMISSIONS in priority order (Table 6): perform_grooming → "Start next grooming appointment →" (/employee/grooming); daycare_check_in_out → "View daycare board →"; log_boarding_feeding OR boarding_daily_care_log → "Log kennel round →"; run_training_sessions → "Start training session →"; check_in_out (+ reception context) → "Check in next arrival →"; log_cleaning → "Log cleaning task →"; view_bookings (+ manager) → "View today's bookings →"; else (personal-only) → "View my schedule →". For staff with multiple roles, use the PRIMARY role's action (first assigned role in their Staff Management profile). Use usePermission — no role-name switch.
```

### 5.2 — Quick Access icons, dynamic from permissions ❌ BUILD (4C)

```
Section 4C. The 2–3 Quick Access shortcut icons must be generated from the viewer's permissions, never hardcoded per role. Priority: (1) their primary service module (Grooming/Training/Boarding/Daycare — whichever they can access), (2) Bookings if view_bookings, (3) Clients if view_client_list, (4) Daily Care if a log permission, (5) My Schedule as universal fallback. RULE: a Quick Access icon must never link to a screen the viewer would be blocked from — filter each candidate through usePermission before including it (e.g. no Clients shortcut if view_client_list = not_granted). Implement in employee-dashboard-widgets.tsx.
```

### 5.3 — My Schedule count scoped + universal HR banner + scoped notifications ⚠️ FIX (4B, 4D)

```
Sections 4B & 4D.
- 4B: the "Today: X appointments" summary (employee-dashboard-widgets.tsx, currently staff.upcomingAppointments) must count the RIGHT things per role using assigned_only scope — a Groomer shows their assigned appointment count; a BOH with 0 grooming appointments but 6 care tasks shows "0 appointments, 6 care tasks." Derive the counts from the viewer's scoped data (Part 3), not a single generic field.
- 4D HR banner: src/components/employee/WriteUpAckBanner.tsx (the "You have 1 HR record to review… Review →" banner) must fire for ANY role with pending HR acknowledgements — it's universal across all 13 presets, not Groomer-only. Confirm it renders from the viewer's pending write-ups, independent of role.
- 4D notifications: scope the notification types an employee receives to their role's permissions (a Groomer gets appointment assigned/cancelled, message for their clients, task assigned, shift changed; NOT payment failed, other groomers' new bookings, staff-management alerts). Gate via the same permission keys.
```

---

# PART 6 — Roles & Permissions Studio gaps (Build Order 10; Section 7)

### 6.1 — "Preview as employee" ❌ BUILD

```
Section 7. Add a "Preview as employee" button on the role detail panel in src/components/facility/FacilityRolesStudio.tsx. Clicking it opens the employee portal exactly as a staff member with this role/permission config would see it — same nav, same modules, same filtered data — by setting the RBAC viewer to a synthetic viewer carrying this role's resolved permissions (use the existing viewer mechanism in use-facility-rbac: e.g. setViewerId / a preview override) and rendering the /employee shell in a modal or new tab, with a persistent "Previewing as [role] — Exit preview" bar. This is the manager's QA tool; it must reflect the CURRENT unsaved grid state if possible, else the saved role.
```

### 6.2 — Studio polish: custom roles, Save-all labels, always-visible states ✅ VERIFY / 🔁 IMPROVE

```
Section 7 remaining:
- VERIFY the Duplicate→custom role pipeline: duplicating a preset creates an editable role in the Custom roles section, renamable, with independently adjustable permissions that persist (facility-roles-store) and apply to any staff assigned that custom role. FacilityRolesStudio has the custom-role editor + updateRolePermissions — confirm the save/assign path is connected end-to-end.
- VERIFY individual staff override: src/components/facility/StaffPermissionEditor.tsx should let a manager override individual permission rows for one employee beyond their role, and SHOW which rows are "role default" vs "individual override." The engine's setOverride supports this — confirm the UI surfaces the distinction visually.
- IMPROVE the section-header "Save all" toggles: relabel to "Grant all in section" / "Revoke all in section" so bulk changes aren't accidental.
- IMPROVE permission-row state labels: every row must always show its current state label ("Granted" / "Assigned only" / "Not granted") — not just a bare toggle, not only on hover.
```

---

# Appendix — Final verification

### A.1 — Anti‑pattern sweep (Section 8A / Table 7)

```
Grep the employee portal (src/app/employee, src/components/employee) for role-name conditionals: `primaryRole`, `role === "`, `=== "groomer"`, `isManager`, `NAV_BY_ROLE`, and any import from src/lib/rbac.ts / role-permissions-catalog.ts / role-permissions-store.ts / components/facility/PermissionGuard.tsx. Every UI conditional must instead call usePermission/useCan from @/hooks/use-facility-rbac with a PermissionKey. Report any remaining role-name gate as a defect with file:line. Zero should remain.
```

### A.2 — Demo accounts + Preview parity

```
For each of the 6 demo accounts (Manager, Reception, Groomer, Trainer, Boarding, Sanitation), open /employee as that account and confirm: correct My Workspace + Operations nav (Part 1.2), Quick Action + Quick Access match Table 6/4C, restricted URLs render <AccessRestricted/>, price/financial columns hidden where view_booking_amounts/view_client_financials are not_granted, and data is scoped to their assigned records. Then use "Preview as employee" (6.1) on each of the 13 presets and confirm the preview matches what that role actually sees. Run: bun run typecheck && bun run lint && bun run build. Produce a per-section (2–8) DONE/PARTIAL/SKIPPED report with files touched.
```

---

_Generated for the Yipyy Staff Portal UI Parity spec. Grounded against the live `C:\dev\puneet` codebase. The permission ENGINE (`use-facility-rbac` + `types/facility-staff`) and the Roles Studio already exist and use the spec's exact keys; the work is wiring the employee portal (currently `NAV_BY_ROLE`-driven) to that engine, building the Access Restricted page, and adding "Preview as employee" — while avoiding the three decoy RBAC systems._
