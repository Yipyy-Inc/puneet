# YIPYY — Staff Onboarding & Offboarding: Grounded Copy‑Paste Prompts

**Spec:** `Staff Onboarding_Offboarding_Workflow.docx` (Sections 1–10, 12 build phases)
**Target repo:** `C:\dev\puneet` · Next.js 16 App Router · React 19 · shadcn/ui · **bun**
**Audited live:** yes — checked the Staff module, the existing onboarding model, and the status/role data.

---

## ⭐ Audit finding — real foundation exists; extend it, don't restart

The current Staff module is rich and much of Section 1's "KEEP" list is genuinely built. There's also a **partial onboarding system already in code** — so the job is to *extend* it into the spec's fuller vision (configurable templates + employee self‑serve + offboarding), not build from zero.

**Already built (extend / keep):**
- **Staff status model** supports the whole flow: `StaffProfile.status = "active" | "invited" | "inactive" | "terminated"` with `statusChangedAt`, `statusReason` (codes incl. `terminated_cause`), `statusNote` (`src/data/facility-staff.ts` / `src/types/facility-staff.ts`). So "Invited" and "Terminated" states exist.
- **Multi‑role field exists:** `StaffProfile.additionalRoles: []` — the data is ready; only the *"Additional roles" picker UI* is missing (Section 5).
- **A staff‑onboarding model + store exists:** `src/data/staff-onboarding.ts` (314 lines) — `OnboardingTaskType`, `OnboardingTask`, `useOnboarding / initOnboarding / addOnboardingTask / removeOnboardingTask / setOnboardingTaskComplete`, auto‑populated per role. The employee **profile already has an `OnboardingTab`** (`staff/[id]/staff-profile-tabs.tsx`) with progress + "Onboarding stalled".
- **Permission keys** `view_onboarding` / `manage_onboarding` ("Manage onboarding checklists") exist.
- The **Add‑staff modal** (`staff-form-dialog.tsx`) has the 6 tabs the spec describes; the **terminate modal** (`status-change-dialog.tsx`) has the reason dropdown.

**What's missing (the real work):** a configurable **Settings → Staff & HR** area with **template builders** (onboarding + offboarding); the **employee self‑onboarding standalone portal** (unique link, account creation, document upload, e‑sign, availability, banking) — the current model is *manager‑ticks‑checklist*, the spec **flips it to employee self‑serve**; the **simplified 3‑tab hire flow + confirmation/send**; the **"Additional roles" UI**; **onboarding progress tracking** (Invited card + 4th tab); **manager review & activate**; the **offboarding task system** (trigger on terminate + offboarding profile tab + final docs); the employee profile **Documents/Offboarding** tabs; and **notification wiring**.

### ⛔ Wrong‑code trap — staff onboarding vs FACILITY onboarding
Two unrelated "onboarding" systems exist. Use the **staff** one; ignore the **facility‑signup** one.
| Thing | File(s) | Verdict |
|---|---|---|
| **Staff onboarding (extend this)** | `src/data/staff-onboarding.ts`, `staff/[id]/staff-profile-tabs.tsx` (`OnboardingTab`), `src/types/facility-staff.ts` | ✅ The spec's target. |
| Facility signup onboarding | `src/app/facility/onboarding/*`, `src/components/admin/facility-onboarding-wizard.tsx`, `src/data/facility-onboarding.ts`, `src/lib/facility-onboarding-store.ts`, `src/types/facility-onboarding.ts`, `src/components/facility/onboarding/facility-onboarding-banner.tsx` | 🚫 Onboards a new *facility* onto the platform. Not staff. Don't touch for this spec. |

### ⚙️ Mock‑app scope
No backend. So: the onboarding **invite email + unique 7‑day link** = a mock (a real standalone route `/onboard/[token]` + a generated token stored in the mock store + a toast/preview standing in for the email); **e‑signatures, document/void‑cheque uploads, banking** = mock capture (object URLs + timestamps, "encrypted" is a UI note only); **account credential creation** = mock (sets a flag that unlocks the employee's login in the mock auth). Every notification (Table 5) = the existing facility notification feed + toast. Build to real shapes so a backend drops in later.

---

## Module map

| Area | Real file(s) |
|---|---|
| Staff list + tabs (Active/On leave/Former) | `src/app/facility/dashboard/staff/page.tsx` |
| Add‑new‑staff modal (6 tabs → 3 + confirm) | `src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx` |
| Change‑status / terminate modal | `src/app/facility/dashboard/staff/_components/status-change-dialog.tsx` |
| Role & access | `src/app/facility/dashboard/staff/_components/{role-matrix,access-tab,custom-role-quick-create-dialog}.tsx` |
| Staff card | `src/app/facility/dashboard/staff/_components/staff-card.tsx` |
| Employee profile + tabs | `src/app/facility/dashboard/staff/[id]/{staff-profile-tabs,staff-profile-view}.tsx` (has `OnboardingTab`, `PerformanceTab`) |
| HR docs / write‑ups / warnings | `src/app/facility/dashboard/staff/_components/{employee-files-tab,write-ups-tab,warnings-tab}.tsx`, `src/data/{employee-files,staff-writeups,facility-warnings}.ts` |
| **Staff onboarding model + store (extend)** | `src/data/staff-onboarding.ts` |
| Staff records + presets + status + roles + perms | `src/data/facility-staff.ts`, `src/types/facility-staff.ts` (`ROLE_PRESETS`, `StaffProfile`, `PermissionKey` incl. `manage_onboarding`) |
| Settings shell (add "Staff & HR") | `src/components/facility/SettingsSidebar.tsx`, `src/app/facility/dashboard/settings/page.tsx` |
| RBAC (gate manager/owner‑only) | `src/hooks/use-facility-rbac.tsx` (`usePermission("manage_onboarding")`) |
| Notifications (Table 5 triggers) | `src/data/facility-notifications.ts` (`addFacilityNotification`) |
| Employee availability (onboarding feeds it) | `src/app/employee/(shell)/availability/*` |
| Custom roles | `src/components/facility/FacilityRolesStudio.tsx`, roles‑permissions settings |

---

## How to use this pack
Paste one prompt at a time, in the spec's Build Order (Section 10). Green sequence noted once — after a batch: `bun run typecheck && bun run lint && bun run build`; **bun** only. Mock‑app scope applies. **Extend `src/data/staff-onboarding.ts`** — do not fork a parallel model. Gate every builder/template UI on `usePermission("manage_onboarding")` (Manager/Owner only). Status: ✅ VERIFY · ⚠️ FIX · ❌ BUILD · 🔁 IMPROVE.

---

# PHASE 0 — Model foundation (do first)

### 0.1 — Extend the staff‑onboarding model into templates + self‑serve tasks ❌ BUILD
```
Extend src/data/staff-onboarding.ts (do NOT create a parallel model — this is the canonical one, already used by the profile OnboardingTab). Add:
- OnboardingTemplate: { id, name, appliesToRoles: FacilityStaffRole[], completionDeadlineDays (default 14), inviteExpiryDays (default 7), welcomeMessage, status: "active"|"draft", managerTasks: OnboardingTask[], employeeTasks: EmployeeOnboardingTask[] }.
- Extend the task model to distinguish MANAGER tasks (existing OnboardingTask, with When due = on hire / within N days / by first shift; Assigned to = Manager/Owner/position; Required toggle — spec Table 0) from EMPLOYEE self-complete tasks. Add EmployeeOnboardingTaskType per spec Table 1: personal_info, contact_details, banking, document_upload, document_sign, availability, emergency_contact, uniform_prefs, custom_question — each with its collected-fields shape + required flag + (for document_upload/sign) a document name + facility-uploaded PDF ref, and (for custom_question) text/multiple-choice/file.
- OffboardingTemplate: { id, name, appliesToReasons: StatusReason[], managerTasks: OffboardingTask[] } where OffboardingTask = { name, description, assignedTo: "manager"|"owner"|"hr", due: "on_termination"|"within_days"|"before_last_day", days?, required }.
- Per-hire onboarding INSTANCE: { staffId, templateId, token, tokenExpiresAt, sections: {type, status: "not_started"|"in_progress"|"complete", data, completedAt}[], submittedAt?, reviewedAt?, changeRequests: {sectionType, note, resolvedAt?}[] }; and a per-departure offboarding instance keyed by staffId.
- Facility Staff&HR config: employmentTypes[], terminationReasons[], inviteExpiryDays, completionDeadlineDays, hrDocRetentionYears.
Add store fns (useSyncExternalStore + localStorage, matching the file's existing pattern): CRUD for templates + config, createOnboardingInstance(staffId, templateId) (generates token), resolveTemplateForRole(role), saveOnboardingSection, submitOnboarding, reviewActivate, createOffboardingInstance(staffId, reason). Keep the existing useOnboarding/addOnboardingTask APIs working. Header-comment: // extends the earlier Section 7 model into the full templated self-serve flow.
```

---

# PHASE 1–2 — Settings → Staff & HR + Template builders (Build Order 1–2)

### 1.1 — Add the "Staff & HR" Settings section ❌ BUILD (Section 3A, 8A)
```
Add "Staff & HR" as a new section group in the facility Settings nav (src/components/facility/SettingsSidebar.tsx + render in src/app/facility/dashboard/settings/page.tsx), visible to Manager/Owner only (gate on usePermission("manage_onboarding") / manage_staff). It contains: Onboarding Templates, Offboarding Templates, Employment Types, Termination Reasons, Roles, and the config values (onboarding invite expiry 3–30 default 7, completion deadline default 14, HR document retention default 7 years). Follow the existing Settings section pattern (id/label/icon in SettingsSidebar; a section block in settings/page.tsx). Persist config via the Phase 0 store.
```

### 1.2 — Onboarding Template builder ❌ BUILD (Section 3B–3D, Tables 0 & 1)
```
Build the Onboarding Templates page + editor under Settings → Staff & HR. List page: template cards showing name, applies-to roles, task count, active/draft toggle, "+ New template". Editor (two sections): MANAGER TASKS (name, description, when-due on-hire/within-N-days/by-first-shift, assigned-to Manager/Owner/position, required toggle — Table 0) and EMPLOYEE SELF-COMPLETE TASKS (add any of the Table 1 types: personal info, contact, banking [removable/optional], documents-to-upload [facility names each + required], documents-to-read-&-sign [facility uploads the PDF; employee e-signs], availability, emergency contact, uniform/equipment prefs, custom questions [text/multiple-choice/file]). Template settings (3D): name, applies-to-roles multi-select, completion deadline days, welcome message, active/draft toggle. Save to the Phase 0 store. Reuse a shared task-config component (it's reused by offboarding 2.1).
```

### 2.1 — Offboarding Template builder ❌ BUILD (Section 6A, Table 3)
```
Build the Offboarding Templates page + editor (same structure, manager tasks only) under Settings → Staff & HR, reusing the task-config component from 1.2. Each offboarding task: name, description, assigned-to (Manager/Owner/HR), due (on termination date / within N days / before last day), required. Seed the default task set (Table 3, facility can remove any): Issue ROE, Prepare final paycheque, Collect facility access items, Revoke building access codes, Remove from scheduling, Transfer client relationships, Archive employee documents, Send T4/year-end docs, Conduct exit interview, Update payroll provider. A template's "applies to" is the termination reason(s); one universal template is allowed.
```

### 2.2 — Employment types + termination reasons config ❌ BUILD (Section 8A)
```
In Settings → Staff & HR, build: Employment Types (defaults Full-time, Part-time, Contract, Seasonal, Volunteer, Intern; facility can add custom) and Termination Reasons (defaults Resignation, Termination without cause, Termination with cause, End of contract, Abandonment, Retirement, Mutual agreement, Other; editable). Wire the termination reasons list to the existing status-change-dialog.tsx reason dropdown (replace its hardcoded REASONS_BY_STATUS with the configured list). Wire employment types to the Add-staff Profile tab dropdown. Persist via Phase 0 config.
```

---

# PHASE 4–5 — Simplify hire flow + multi‑role (Build Order 4–5)

### 4.1 — Reduce Add‑staff modal to 3 tabs + confirmation/send screen ⚠️ FIX (Section 4A)
```
In src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx the modal has 6 tabs (profile, role, locations, access, notifications, payroll). Reduce the HIRE flow to 3 tabs — Profile (First/Last/Email required/Hire date/Employment type/Internal notes; color optional), Role & services, Locations — and REMOVE access/notifications/payroll from the hire modal (they move to the post-activation employee profile / auto-populate from the role template). Then add a 4th step as a full confirmation SCREEN (not a tab): "Review & send onboarding" showing name, role(s), locations, hire date, the auto-selected onboarding template (dropdown to change; matched by role via resolveTemplateForRole), and an onboarding-email preview. Primary button "Create staff & send onboarding email". RULE: one action both creates the staff record (status "Invited", account locked) AND sends the invite (Phase 6) — no separate send step. Keep the access/notifications/payroll tabs alive as EDIT tabs on the employee profile (Phase 11), just not in the hire modal.
```

### 5.1 — "Additional roles" multi‑role selector ❌ BUILD (Section 5B, 2D)
```
The data already supports multi-role (StaffProfile.additionalRoles). Add the UI: in the Role & services tab (staff-form-dialog.tsx AND the employee profile's Roles tab), after the primary role is chosen, render "Additional roles (optional)" — a smaller grid of the SAME 8 preset role cards (minus the selected primary), multi-select, writing to additionalRoles. RULE: permissions = the UNION of primary + all additional roles (resolve via use-facility-rbac using every role's preset — verify the RBAC resolver already unions additionalRoles; if it only reads primaryRole, fix it to union). Primary role still drives the dashboard Quick Action + default view; additional roles only add nav/access. No limit on count. Remove the "secondary roles buried in custom roles" pattern — custom roles remain a separate layering concept. Fix the role FILTER TABS on the staff list (staff/page.tsx) to count a staff member in EVERY tab matching any of their roles (primary + additional), not just primary.
```

---

# PHASE 6 — Employee self‑onboarding portal (Build Order 6)

### 6.1 — Invite link + email (mock) ❌ BUILD (Section 4B)
```
On "Create staff & send onboarding email" (4.1): create the onboarding instance (Phase 0 createOnboardingInstance) with a unique token + expiry (config inviteExpiryDays, default 7), set staff status "Invited", and fire the invite as a MOCK email — a toast + a stored/previewable branded message (facility name, logo, welcome message from the template, role + start date, a "Complete your onboarding →" link to /onboard/[token], and the "expires in 7 days" note). Manager can "Resend" from the staff card / profile (regenerates the token). No real email — reuse the app's mock notification pattern; expose the link so it's testable.
```

### 6.2 — The standalone self‑onboarding page ❌ BUILD (Section 4C, Table 2)
```
Build a PUBLIC standalone route src/app/onboard/[token]/page.tsx — NOT inside the admin shell, no Yipyy login required, mobile-responsive, styled with the facility's colors/logo (friendly, not a government form). Load the onboarding instance by token (expired/invalid → a clean "link expired, contact [manager]" page). Render a vertical progress flow (progress bar + named section cards, each expandable, green check when done, orange when incomplete-required) per Table 2, driven by the template's employee tasks:
Welcome → Create your account (set password = their Yipyy login, email pre-filled read-only) → Your details (legal name, DOB, SIN/SSN if enabled, emergency contact) → Contact info → Banking (institution/transit/account + void cheque upload, with the "encrypted, manager-only for payroll" note; fully optional per template) → Documents to upload (one card per required doc; required blocks progress) → Policies to sign (PDF rendered inline + "I have read and agree" → timestamped e-signature) → Your availability (weekly grid → feeds src/app/employee/(shell)/availability) → Custom questions → All done! screen. RULES: save-and-resume via the same link (silent save, no notification); cannot submit until all REQUIRED tasks done; optional (incl. banking) skippable. All uploads/e-sign/banking are mock captures (object URLs + timestamps).
```

### 6.3 — Submit → notify manager ❌ BUILD (Section 4D top, Table 5)
```
On the "All done!" submit: mark the instance submittedAt, set staff status to "Onboarding complete — pending review" (a derived/extra status), and fire the manager notification (facility notification feed + email mock): "New staff onboarding completed — [name] has finished their onboarding. Review and activate their account." Silent per-section saves fire NO notification.
```

---

# PHASE 7–8 — Review/activate + progress tracking (Build Order 7–8)

### 7.1 — Manager review & activate ❌ BUILD (Section 4D)
```
On the staff card / profile of a pending hire, add a "Review & activate" button that opens a review panel showing everything the employee submitted (details, documents [preview], signed policies [with timestamps], banking [masked], availability, custom answers). Manager can: (a) request a change on a specific item — a note ("Please re-upload your grooming certificate — unreadable") that notifies the employee and lets them fix THAT item via their link without redoing the flow (adds to instance.changeRequests); (b) "Activate account" → status → Active, unlock the mock login, email the employee "Your account is active! You can now log in." RULE: if required MANAGER tasks from the template are incomplete at activation, warn "You have N manager tasks incomplete… you can still activate — they stay in your task list," and let them proceed or resolve first.
```

### 8.1 — Onboarding progress tracking on the Staff page ❌ BUILD (Section 4E)
```
Two surfaces on src/app/facility/dashboard/staff/page.tsx: (a) make the "Invited" status on a staff card clickable → mini progress "3 of 8 sections complete" + a one-tap "Remind employee" (resends invite). (b) Add a 4th tab alongside Active / On leave / Former: "Onboarding in progress" listing everyone in Invited or Onboarding-in-progress, each with a progress bar + days-since-invite, and a Remind action. Derive progress from the onboarding instance sections.
```

---

# PHASE 9–10 — Offboarding (Build Order 9–10)

### 9.1 — Terminate → auto‑create offboarding tasks ❌ BUILD (Section 6B)
```
Extend src/app/facility/dashboard/staff/_components/status-change-dialog.tsx: after "Set as Terminated" (which already revokes access + moves to Former Employees — keep), (1) pick the matching offboarding template by termination reason (prompt to choose if multiple), (2) createOffboardingInstance → materialize all its tasks with due dates computed from today, (3) fire "Offboarding started — [name] has been terminated. N offboarding tasks added to your task list. View offboarding tasks →" (facility notification feed), (4) surface a dedicated "Offboarding: [name]" group in the manager's task list, grouped apart from regular tasks. RULE: offboarding tasks live on the terminated employee's record AND in the manager task list; overdue required tasks → daily reminder until resolved.
```

### 10.1 — Offboarding tab on the terminated‑employee profile ❌ BUILD (Section 6C)
```
On a terminated employee's profile (staff/[id]/staff-profile-tabs.tsx), add an "Offboarding" tab (visible only for terminated staff, manager-only): the offboarding task list with status Pending/Completed/Overdue, each with "Mark complete" + optional note ("ROE submitted to Service Canada July 22, ref #XYZ") + completion date; a top completion indicator "Offboarding: 5 of 8 tasks complete" and a green "Offboarding complete" badge when all done; and a Final Documents section to upload/store the ROE PDF, termination letter, settlement agreement (permanent on the record, honoring HR retention config). Mock uploads.
```

---

# PHASE 11–12 — Profile tabs + notifications (Build Order 11–12)

### 11.1 — Employee profile tabs (Onboarding extend + Documents) ⚠️ FIX / ❌ BUILD (Section 7A, Table 4)
```
The profile (staff/[id]/staff-profile-tabs.tsx) already has an OnboardingTab + PerformanceTab. Bring the full tab set to Table 4: Profile, Roles & positions (primary + additional + resulting permission union — from 5.1), Locations, Onboarding (EXTEND the existing tab to show the self-serve submission: submitted docs, signed policies with timestamps, masked banking, custom answers, re-upload), Access & overrides (the tab removed from the hire modal now lives here), Availability (submitted weekly grid, editable — updates the availability template, not approved future shifts), Notifications (moved here from the hire modal), Payroll (moved here), Documents (NEW — consolidate ALL HR docs: onboarding uploads, policy signatures, write-ups, reviews, certifications, from employee-files/staff-writeups data), Performance, Offboarding (10.1, terminated only). Manager can edit any field anytime.
```

### 11.2 — Manager task visibility on employee profile ❌ BUILD (Section 7B)
```
On any active employee's profile, add a "Tasks" section (bottom) listing all open tasks assigned to this employee — shift tasks, standalone tasks, incident follow-ups — pulled from the existing task stores, so the manager has context without leaving the profile.
```

### 12.1 — Wire all onboarding/offboarding notifications ❌ BUILD (Section 9, Table 5)
```
Wire every Table 5 trigger to the existing facility notification feed (src/data/facility-notifications.ts addFacilityNotification) + email mock, each configurable (on/off, timing) per facility: create-staff → employee invite email; employee marks complete → manager (in-app + email); link expires → manager; not started after 3 days → in-app staff-card alert; not completed by deadline → manager daily (in-app + email); activate → employee "account active" email; change requested → employee email w/ flagged item + note; terminated → manager offboarding-tasks-created; offboarding task due today → manager (+ Today filter); overdue → daily until resolved; all offboarding complete → manager "Offboarding for [name] is complete"; manager adds HR doc/note → employee (optional/configurable). Reuse the notification-settings pattern so each is toggleable.
```

---

# Appendix — Verification

### Z.1 — End‑to‑end onboarding + offboarding walk
```
Onboarding: Settings → Staff & HR → build an active "Full-time Groomer Onboarding" template (manager + employee tasks incl. a required doc + a policy to sign + availability + a custom question). Staff → + Add staff (3 tabs) → confirmation auto-selects that template → Create & send → status Invited + invite link generated. Open /onboard/[token] (no login) → create account → complete each section (upload, e-sign, availability, banking optional) → save-and-resume works → submit → manager notified. Manager → Review & activate → request one change → employee fixes just that item → Activate → status Active, login unlocked, employee emailed. Confirm the "Onboarding in progress" tab + Invited-card mini-progress tracked it throughout.
Offboarding: build an offboarding template (ROE, final pay, collect keys, transfer clients…). Change status → Terminated with a reason → matching template's tasks auto-created in the manager task list + "Offboarding: [name]" group + notification. Open the terminated profile → Offboarding tab → mark tasks complete with notes → upload the ROE PDF → "Offboarding complete" badge at 8/8.
Multi-role: create a Groomer + Daycare Attendant → confirm both permission sets apply (not just both badges) and she appears in BOTH role filter tabs.
Run: bun run typecheck && bun run lint && bun run build. Produce a phase-by-phase (1–12) DONE/PARTIAL report with files touched.
```

### Z.2 — Right‑model + scope check
```
Confirm all work extends src/data/staff-onboarding.ts + the staff module — NOTHING touched the facility-signup onboarding (src/app/facility/onboarding, src/data/facility-onboarding.ts, facility-onboarding-store, facility-onboarding-wizard). Confirm the self-onboarding page is a public standalone route (no admin shell, no Yipyy login) and that emails/links/e-sign/uploads/banking are mock captures behind clear seams. Confirm builders are gated on manage_onboarding (Manager/Owner only). Report any leftover hardcoded termination-reason or employment-type list not reading the Staff&HR config.
```

---

*Generated for the Yipyy Staff Onboarding & Offboarding spec. Grounded against the live `C:\dev\puneet`. A real foundation exists — the staff status model (invited/terminated + reasons), the `additionalRoles` field, and a `staff-onboarding.ts` model + profile OnboardingTab — so this extends that into the full templated, employee-self-serve flow + offboarding, avoiding the separate facility-signup onboarding cluster. Sequenced to the spec's 12-phase build order; emails/links/uploads/e-sign are mocked behind typed seams.*
