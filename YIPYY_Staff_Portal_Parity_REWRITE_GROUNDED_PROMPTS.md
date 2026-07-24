# YIPYY — Employee Portal = Facility Portal (minus permissions): Grounded Prompts

**Client directive:** "I want exactly the same design and everything on employee accounts, minus the things they don't have permission for. Employees are the ones who use the software — they should have the same UI as the facility/admin side, filtered by their permissions. When we hire a new reception, we create their account and give them certain permissions."

**Target repo:** `C:\dev\puneet` · Next.js 16 App Router · React 19 · shadcn/ui · **bun**
**Audited live:** yes — checked the current `/employee` build against `/facility/dashboard`.

---

## ⭐ Audit finding — you're ~60% there; four concrete gaps remain

Good news first: the hard architecture from the earlier parity pack is **already built and correct**, so this is not a rebuild — it's closing four gaps.

**Already done (do NOT redo):**
- The employee shell sets the signed‑in employee as the RBAC viewer: `src/app/employee/(shell)/layout.tsx` wraps everything in `EmployeeRbacBoundary` and supplies the **same provider stack** the facility layout does (Location, Settings, Loyalty, BookingModal, CallAvailability, CallTags, Reputation) — with a comment saying it's so "the employee portal renders the SAME admin module components."
- The employee module pages **reuse the real admin pages**: `src/app/employee/(shell)/bookings/page.tsx` is literally `import BookingsPage from "@/app/facility/dashboard/bookings/page"` wrapped in `<RequirePermission>`. Same for clients, grooming, etc.
- The sidebar is **permission‑driven** now: `EmployeeSidebar.tsx` says "there is no NAV_BY_ROLE anymore" and builds Operations from `getOperationsNav(perms)`.
- `AccessRestricted` + `RequirePermission` exist. The Reception preset is already generous (bookings CRUD, calendar, POS, gift cards, invoices, calling, messages, inventory, marketing, incidents…).

**So why does Reception still feel empty / "can't do anything"? Four gaps:**

1. **The dashboard is still the bespoke bare one.** `src/app/employee/(shell)/page.tsx` renders `<EmployeeDashboard staff={staff}/>` — a stripped custom widget. The facility dashboard is `<WeatherWidget/>` + `<DashboardShell/>` (`src/components/facility/dashboard/dashboard-shell.tsx`). **This is the first screen every employee sees, and it's the one in the client's screenshot.** → Make the employee dashboard render the *same* `DashboardShell`, permission‑filtered. (Gap A — the headline.)

2. **Most admin modules have no employee route, so they're unreachable even when permitted.** Reception's preset grants `view_all_calendars`, `financial_manage_invoices`, `financial_manage_gift_cards`, `marketing_view`, `view_inventory`, `view_services` — but there are **no** `/employee/` wrappers for calendar, billing, gift‑cards, marketing, inventory, services (and ~15 more admin modules). The nav can't show what has no route. → Add employee wrappers for **every** admin module + list them all in the nav model. (Gap B — the bulk of "can't do anything.")

3. **The employee header is stripped.** `EmployeeHeader.tsx` is basically just an avatar — no global search, no "+ New", no messages, no notification bell. The facility header (`FacilityHeaderActions`) has all of these. → Bring the employee header to parity, each control permission‑gated. (Gap C.)

4. **Shared action buttons/columns aren't fully permission‑gated**, so a reused admin page can either show controls an employee shouldn't have, or (worse for this complaint) the client perceives "read‑only." → Audit the reused screens so buttons/columns gate on permission keys — present when granted, absent when not. (Gap D — the "minus permissions" guarantee.)

Plus the client's process ask — **create an employee, assign permissions** — is mostly built (`staff/_components/staff-form-dialog.tsx`, `access-tab.tsx`, `role-matrix.tsx`, `StaffPermissionEditor.tsx`); verify + polish it (Gap F).

### Golden rule (unchanged)
Every conditional uses a permission **key** via `usePermission(key)` / `useCan(key)` from `@/hooks/use-facility-rbac` — never a role name. Keys + presets live in `src/types/facility-staff.ts`.

---

## Module map

| Area | Real file(s) |
|---|---|
| Employee shell (RBAC viewer + provider stack) | `src/app/employee/(shell)/layout.tsx` |
| Employee dashboard page (bespoke — to replace) | `src/app/employee/(shell)/page.tsx`, `src/components/employee/EmployeeDashboard.tsx` |
| **Facility dashboard (reuse this)** | `src/app/facility/dashboard/page.tsx` → `src/components/facility/dashboard/dashboard-shell.tsx` + `WeatherWidget` |
| Employee sidebar (permission‑driven nav model) | `src/components/employee/EmployeeSidebar.tsx` (`NAV_MODEL`, `getOperationsNav`) |
| Employee header (stripped — to bring to parity) | `src/components/employee/EmployeeHeader.tsx` |
| Facility header (reuse pattern) | `src/components/layout/FacilityHeaderActions.tsx`, `FacilityHeader.tsx`, `TopBarIcons.tsx` |
| Route‑wrapper pattern (copy this) | `src/app/employee/(shell)/bookings/page.tsx` (+ `clients`, `grooming`) |
| Access gate | `src/components/employee/AccessRestricted.tsx` (`RequirePermission`, `AccessRestricted`) |
| RBAC engine + keys + presets | `src/hooks/use-facility-rbac.tsx`, `src/types/facility-staff.ts` (`PermissionKey`, `ROLE_PRESETS`, `PERMISSION_GROUPS`) |
| Create‑employee + assign permissions | `src/app/facility/dashboard/staff/_components/{staff-form-dialog,access-tab,role-matrix}.tsx`, `src/components/facility/StaffPermissionEditor.tsx` |
| Existing employee routes | `/employee/(shell)/{availability,boarding,bookings,calling,clients,daily-care,daycare,documents,grooming,inbox,incidents,kennel,performance,retail,schedule,tasks,training,write-ups}` |
| Admin modules WITHOUT an employee route (to add) | `add-ons, automations, billing, calendar, communications, estimates, evaluations, forms, gift-cards, insights, inventory, loyalty, marketing, messaging, modules, notifications, online-booking, petcams, reports, resources, services, staff, waivers` |

---

## How to use this pack
Paste one prompt at a time. Green sequence noted once — after a batch run `bun run typecheck && bun run lint && bun run build`; **bun** only. Mock‑app rules apply (data scoping in the data/query layer). Status: ✅ VERIFY · ⚠️ FIX · ❌ BUILD.

---

# GAP A — Make the employee dashboard = the facility dashboard (headline fix)

### A.1 — Replace the bespoke employee dashboard with the real one ⚠️ FIX
```
The employee's first screen is bare because src/app/employee/(shell)/page.tsx renders the custom <EmployeeDashboard staff={staff}/> instead of the real facility dashboard. Change it to render the SAME dashboard the facility admin sees: <WeatherWidget/> + <DashboardShell/> (from src/app/facility/dashboard/page.tsx → src/components/facility/dashboard/dashboard-shell.tsx), inside the existing employee shell. The employee layout already supplies the required provider stack, so the shared components won't throw. Keep the small personal touches that are genuinely employee-only (the "Good morning, [name]" greeting, the HR write-up banner which is already in the layout) by rendering them ABOVE DashboardShell — but the body of the page must be the facility DashboardShell, not the stripped EmployeeDashboard. Retire EmployeeDashboard (or keep it only as the greeting header).
```

### A.2 — Permission‑gate the dashboard tiles/widgets so it filters cleanly ❌ BUILD
```
Open src/components/facility/dashboard/dashboard-shell.tsx and gate each KPI tile / widget on its permission key with usePermission/useCan (so the SAME shell renders for admin and employee, minus what the viewer can't see): revenue / financial tiles → financial_view_amounts (hidden or "--" when not granted); booking widgets → view_bookings; today's schedule / calendar widget → view_all_calendars or the viewer's own scope; grooming queue widget → view_grooming_queue; occupancy/boarding/daycare widgets → the matching dashboard keys; staff/labor widgets → view_staff_directory / view_labor_cost; incidents widget → ops_incidents_view. A reception viewer then sees a full, useful dashboard (bookings, calendar, today's arrivals, POS shortcuts, messages) minus owner-only financial/staff tiles — exactly "same as facility minus permissions." Do this in the shared component so there is ONE dashboard.
```

---

# GAP B — Full module route coverage (make every permitted module reachable)

### B.1 — Add employee route wrappers for EVERY remaining admin module ❌ BUILD
```
Reception (and other roles) are granted permissions for modules that have no /employee route, so they can't reach them. Following the EXACT pattern already used in src/app/employee/(shell)/bookings/page.tsx (import the admin page, wrap in <RequirePermission permKey=...>), create employee route wrappers under src/app/employee/(shell)/ for every admin module that doesn't have one yet, each gated by the controlling permission key:
- calendar → view_all_calendars ; billing → financial_manage_invoices (or financial_view_amounts) ; gift-cards → financial_manage_gift_cards ; marketing → marketing_view ; inventory → view_inventory ; services → view_services ; estimates → view_bookings/create_bookings ; evaluations → the evaluations key ; forms → manage_forms (or a view key) ; loyalty → marketing/loyalty key ; reports → view_operations_reports/financial_view ; insights → view_smart_insights ; online-booking → view_bookings/manage_booking_calendar ; waivers → forms/waivers key ; resources → a resources key ; notifications → always-on (personal) ; communications → messages/communicate_clients ; petcams → a petcams key ; add-ons → view_services ; automations → marketing/ops key ; staff → view_staff_directory ; modules → facility_settings.
Use the closest existing PermissionKey from src/types/facility-staff.ts; if a module has no natural key, gate it on the nearest section key and note it. Each wrapper is ~10 lines. If a reused admin page needs a provider not already in the employee layout's stack, add that provider to src/app/employee/(shell)/layout.tsx (the layout already documents this pattern). Where an admin module page reads a route param the employee URL won't have, pass a sensible default or the viewer context.
```

### B.2 — List every module in the Operations nav model, keyed to its permission ⚠️ FIX
```
Open src/components/employee/EmployeeSidebar.tsx (the NAV_MODEL + getOperationsNav). Ensure the Operations nav model includes an entry for EVERY module wrapped in B.1, each with its controlling permKey, so a granted module actually appears in the sidebar. Group them the way the facility navigation groups them (Services, Bookings & Calendar, Clients, Financial, Communications, Operations, Marketing, Reports/Insights, Staff, Settings) so the employee's sidebar mirrors the facility sidebar's structure — just with not-granted sections absent. Verify a Reception viewer now shows: Dashboard, Calendar, Bookings, Clients, Grooming queue, Daycare check-in, Retail/POS, Gift Cards, Invoices/Billing, Inventory, Services, Calling, Inbox, Marketing, Incidents (view), Tasks — plus My Workspace. Mirror the model into EmployeeBottomNav.tsx.
```

### B.3 — Point the employee shell at the facility nav structure (optional consolidation) 🔁 IMPROVE
```
To guarantee the employee sidebar stays in lockstep with the facility sidebar as new modules are added, refactor so BOTH derive their Operations items from ONE shared nav definition (e.g. a single NAV_MODEL module imported by both src/components/facility/SettingsSidebar/main facility nav and EmployeeSidebar), where each item carries its permKey. The facility admin simply has all keys granted; the employee filters by getOperationsNav(perms). This prevents drift where a module is added to the admin nav but forgotten in the employee nav. If a full consolidation is too invasive now, at minimum add a lint/test that asserts every facility module route has a corresponding permKey'd entry in the employee NAV_MODEL.
```

---

# GAP C — Header parity

### C.1 — Bring the employee header to facility parity ❌ BUILD
```
src/components/employee/EmployeeHeader.tsx is stripped to basically an avatar. Rebuild it to match the facility header (src/components/layout/FacilityHeaderActions.tsx + TopBarIcons.tsx) so employees get the same top bar, each control permission-gated:
- Global search (the "/" search) — always on (personal utility), scoped to what they can see.
- "+ New" quick-action button — same menu as facility (New Client, New Booking, Retail Sale, New Estimate, Quick Daycare Check-in) but each menu ITEM gated by its permission (create_clients, create_bookings, retail_process_sale, etc.); hide the whole button if none are permitted.
- Messages icon with unread badge — gated by messages_view_inbox.
- Notification bell — always on; notifications scoped to the viewer's role/permissions.
- Avatar / profile menu — with role-colored initials, Profile Settings, and Logout.
Reuse the facility header components directly where possible rather than reimplementing. The goal: an employee's header is indistinguishable from the facility header except that ungranted quick-actions/icons are absent.
```

---

# GAP D — "Minus permissions" correctness on the shared screens

### D.1 — Gate action buttons + columns inside the shared admin components ⚠️ FIX
```
Because the employee reuses the real admin pages, any action button or data column that an employee shouldn't have must be gated INSIDE those shared components on a permission key (so it's absent for the employee, present for the admin). Audit the highest-traffic reused screens and wrap controls with usePermission/useCan: Bookings (edit_bookings→Edit, cancel_bookings→Cancel, create_bookings→"+ New Booking", financial_view_amounts→amount column + payment panel, log_incidents→Report Incident in More); Client profile (delete_clients→Delete, view_client_financials→billing tab, view_home_address→address section, edit_pet_medical→edit); Grooming board (perform_grooming→Check In/Start/Mark Ready on own cards, financial_view_amounts→revenue KPI tiles, edit_grooming_pricing→Rates edit, upload_grooming_photos→photo steps); Retail/POS (retail_process_return→Return, retail_apply_discount→Discount, financial_take_payment→Charge); Staff (view_payroll→payroll column, manage_staff→edit). Where the earlier parity pack already added these, just verify. Never use role-name checks. The result: a Reception viewer can DO everything reception is permitted to do, and simply doesn't see owner-only controls.
```

### D.2 — Assigned‑only data scoping holds on the shared screens ✅ VERIFY
```
Confirm that where a permission resolves to an assigned/operating-hours scope, the shared admin screens show scoped data (the data/query layer applies the viewer scope — bookings to the viewer's assignments, grooming queue to their column, clients to their assigned clients, inbox to their threads), and that opening a record not in scope renders <AccessRestricted/>. This was in the earlier pack; verify it still holds now that more modules are reachable (B.1), especially for calendar, billing, and inventory. Report any screen that leaks all-facility data to a scoped employee.
```

---

# GAP E — Presets reflect real jobs (so employees can actually work)

### E.1 — Review every role preset for a realistic working set ✅ VERIFY / ⚠️ FIX
```
Open ROLE_PRESETS in src/types/facility-staff.ts. The client's principle: employees are the primary users, so operational roles must be generously permissioned — the ONLY things they lack are facility Settings, Roles & Permissions, Staff Management, owner-level Financial/payroll, and HQ (unless explicitly granted). Reception is already generous — verify it. Then verify each other preset grants a realistic day-to-day set:
- Groomer: grooming queue/calendar/perform/notes/photos, their bookings, their clients, daily care for their pets if applicable, inbox, tasks.
- Trainer: training space/calendar/run sessions/notes/progress, their bookings/clients, inbox, tasks.
- Daycare / Boarding: their dashboard, check-in/out, daily care log (feed/med), kennel view, their bookings, tasks.
- Reception/Front desk: the current generous set (bookings, calendar, POS, gift cards, invoices, clients, calling, messages, inventory, marketing view).
- Manager/Supervisor/Admin: broad, up to near-owner (manager can typically see financials + staff, but Settings/RBAC/HQ stay owner-gated unless granted).
Fix any preset that's too thin to do its job. Keep Settings/RBAC/Staff-management/HQ/owner-financial as not_granted by default for non-managers.
```

---

# GAP F — Create an employee & assign permissions (the hiring flow)

### F.1 — Verify/polish the add‑staff → assign‑role → override‑permissions pipeline ✅ VERIFY / ⚠️ FIX
```
The client wants: "hire a new reception → create their account → give them certain permissions." Verify this works end-to-end in Staff Management (src/app/facility/dashboard/staff/): the "+ Add staff" flow (src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx) creates a staff record with a role; the Access tab (access-tab.tsx + role-matrix.tsx + src/components/facility/StaffPermissionEditor.tsx) lets the manager pick a preset role AND override individual permission rows for that one person, with a visible "role default vs individual override" distinction. Confirm the new staff's permissions resolve through use-facility-rbac so that when that employee signs in to /employee, their nav + screens reflect exactly what was granted. Fix any break in: create → assign role → adjust overrides → employee sees it. Add a "Preview as this employee" shortcut on the staff profile (reuses the FacilityRolesStudio "Preview as employee" if built) so the manager can verify before the employee logs in.
```

### F.2 — New employee onboarding default ✅ VERIFY
```
Confirm that when a new employee is created and assigned a role (F.1), their portal is immediately usable: dashboard (Gap A) populated, nav (Gap B) showing their permitted modules, header (Gap C) with permitted quick-actions. i.e. a brand-new Reception hire logs in and can take bookings, check people in, run POS, message clients, see the calendar — with zero extra setup. This is the client's acceptance test.
```

---

# GAP G — Settings: personal only for employees

### G.1 — Employee settings = personal sections only ⚠️ FIX
```
Employees still need SOME settings (their own profile, notification preferences, password) but NOT the facility admin settings (Business, Integrations, Services config, Roles & Permissions, Taxes, etc.) unless granted facility_settings. Ensure the settings surface reachable from /employee shows only personal sections by default (My Profile, My Notifications), and gates each facility-admin settings section on facility_settings / the specific key (e.g. roles-permissions → manage_roles_permissions). If a manager has facility_settings granted, they see the full settings — same component, filtered. Do NOT hide settings entirely (the client said "minus the settings they don't have permission" — personal settings they DO have).
```

---

# Appendix — Acceptance test (do this as the client would)

### Z.1 — Walk it as Reception, then hire a new one
```
1) Sign in to /employee as the Reception demo (Yasmine). Confirm: the DASHBOARD is the full facility dashboard minus owner-only tiles (not the bare widget); the SIDEBAR shows all reception-permitted modules (Calendar, Bookings, Clients, Grooming queue, Daycare check-in, Retail/POS, Gift Cards, Invoices, Inventory, Services, Calling, Inbox, Marketing, Incidents, Tasks) + My Workspace; the HEADER has search + "+ New" (with permitted actions) + messages + bell + avatar. Open Bookings, Clients, Retail, Calendar — each is the SAME screen as the admin, with only ungranted buttons/columns absent, and you can actually perform reception actions (create a booking, check someone in, ring up a POS sale, message a client).
2) As the owner, go to Staff → + Add staff → create a new Reception employee → assign the Reception role → optionally toggle one individual override (e.g. grant view_client_financials to this one person) → save. Sign in as that new employee and confirm their portal matches, including the one override.
3) Confirm NOTHING owner-only leaked: no facility Settings sections (unless granted), no Roles & Permissions, no Staff management edit, no payroll, no HQ.
Run: bun run typecheck && bun run lint && bun run build. Report GAP-by-GAP (A–G) DONE/PARTIAL with files touched.
```

---

*Grounded against the live `C:\dev\puneet`. The employee portal already reuses the real admin screens behind a permission-driven shell — this pack closes the four gaps that make it feel empty for staff: the dashboard (swap the bare widget for the real DashboardShell), full module route coverage, header parity, and button/column gating — plus verifies the create-employee → assign-permissions hiring flow. Result: an employee account is the facility UI, minus only what their permissions exclude.*
