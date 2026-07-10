# Yipyy Daily Care Module — Code-Grounded Copy-Paste Prompts

Every change in the _Daily Care Module — Full Workflow Specification_ (Parts 2–7), rewritten to point at the **actual files** in your repo (`puneet` / Yipyy) and to state the **current build status** of each.

**Audit finding (July 2026):** unlike the Gift Cards spec, this module is an **early build**. The KEEP items exist and are correct (tab bar, task cards, pet rows with photo avatars, guest-journal skeleton, empty states). But **most FIX/ADD items are unbuilt or partial** — there is one _generic_ `TaskLogModal` (the spec wants a dedicated modal per task type), the summary bar counts individual pet-tasks (spec wants task **blocks**), Print is a bare `window.print()` (no print layout/CSS), and there is **no** Head Count, staff assignment, shift notes, care notes, day summary, or HQ view yet. Several features also need a **data-model change first** — `DailyCareStep` has no `assignedStaff` / `requiresHeadCount` / `activeDays` / `appliesTo` fields.

So these are mostly **build** prompts (not verify-only like the gift-cards pack). Each names the real file to edit or the new file to create, states what exists today, and specifies what to build.

**Module location:** route `src/app/facility/dashboard/daily-care/` (`layout.tsx` = title + `Today's Care` / `Schedule Settings` tabs; `page.tsx` → `DailyCareView`; `settings/page.tsx` → `DailyCareSettings`). Components in `src/components/daily-care/`, `src/components/guest-journal/`. Config/logic in `src/hooks/use-daily-care-config.ts`, `src/data/daily-care-config-store.ts`, `src/lib/care-log-scheduler.ts`, `src/hooks/use-care-log.ts`. Types in `src/types/boarding.ts` (`DailyCareStep`, `FacilityDailyCareConfig`) and `src/types/care-log.ts` (`ScheduledTask`, `TaskExecution`).

---

## How to use

- **Paste one prompt at a time** into Claude Code. Let it plan → implement → run the green sequence.
- **Do PART 0 (Foundations) first** — it extends the data model and shared identity/color helpers that many later prompts depend on. Skipping it will make the feature prompts invent their own types and drift.
- Prompts are written so an agent implements the feature if absent and verifies/leaves-alone if already present.
- This spec is large (~60 change items). Recommended macro-order: **Foundations → Header/Summary/Task-cards/Pet-rows (the daily list) → Log modals → Schedule Builder → New Features (Head Count, staff, notes, day summary, HQ) → Guest Journals → Print.**

## Standing rules (restated so each prompt is portable)

> **Stack:** Next.js 16 App Router (RSC), React 19, TypeScript 5.9 strict, Tailwind CSS 4, shadcn/ui (New York), next-intl, TanStack Query + TanStack Form, **bun** (never npm/yarn/pnpm). `@dnd-kit/*`, `sonner` (toasts), and `qrcode.react` are already installed.
> **Architecture:** `page.tsx`/`layout.tsx` are Server Components — keep interactivity in `"use client"` children (the Daily Care views are already client components). New shared data goes through the existing stores/hooks (`useDailyCareConfig`, `use-care-log`), not ad-hoc globals. Keep components under ~500 lines — split large new features (Head Count, Step Creator, dedicated log modals) into their own files. No new `any` / `@ts-ignore`.
> **Discipline:** Inventory and reuse what exists — the task-type colors, outcome sets, `metaFor()`, `EmptyState`, `format12h`, and the care-log store already exist; extend them, don't recreate. Touch only the file the task is about.
> **Green sequence (run before "done"):** `bun run typecheck && bun run lint && bun run format:check`; add `bun run build` for structural/type changes; for UI, run `bun run dev` and look at `/facility/dashboard/daily-care`.

## Status legend

- ✅ **Built** — present and correct; prompt is verify-only.
- ⚠️ **Partial** — some of it exists; prompt extends/fixes it.
- ❌ **Missing** — not built; prompt implements it.

## Audit summary

Roughly **8 items ✅ built** (the KEEP set + pet-photo avatars + enable/disable + basic add-step), about **10 ⚠️ partial**, and about **40 ❌ missing**. The big missing pillars: dedicated per-task log modals, Head Count rollcall, staff assignment + per-staff filtering, shift notes, pet care-notes, day summary, HQ view, schedule templates, the full Step Creator, and a real print layout. Start with **PART 0 Foundations** — four changes that unblock the rest.

---

# PART 0 — Foundations (do these first)

### F1 (❌) — Extend the Daily Care data model

**File:** `src/types/boarding.ts` (`DailyCareStep`, `FacilityDailyCareConfig`)
**Status:** ❌ `DailyCareStep` is `{ id, name, time, taskType, description?, enabled, sortOrder }` — no assignment/head-count/active-days/applies-to; `FacilityDailyCareConfig` is `{ steps, alertOverdueAfterMinutes }` — no templates.

```
In src/types/boarding.ts, extend the DailyCareStep type (do not remove existing fields) with these OPTIONAL fields so later Daily Care features have a home:
- assignedStaff?: { kind: "unassigned" } | { kind: "role"; role: string } | { kind: "person"; staffId: string; staffName: string }
- requiresHeadCount?: boolean   // triggers the Last Call rollcall
- activeDays?: number[]         // 0–6 (Sun–Sat); undefined = all 7 days
- appliesTo?: { kind: "all" } | { kind: "feeding_plan" } | { kind: "medications" } | { kind: "addon"; addonId?: string } | { kind: "tags"; tags: string[] }
Also extend FacilityDailyCareConfig with: templates?: { id: string; name: string; steps: DailyCareStep[] }[] and activeTemplateId?: string.
Keep everything backward-compatible (all new fields optional) so existing seed data in src/data/boarding.ts still typechecks. Do not change runtime behaviour yet — later prompts consume these fields. Then run bun run typecheck.
```

### F2 (⚠️) — Replace "initials" with the logged-in staff identity

**Files:** `src/components/daily-care/TaskLogModal.tsx`, `src/types/care-log.ts` (`TaskExecution`), a new `src/hooks/use-current-staff.ts`
**Status:** ⚠️ `TaskLogModal` has a free-text "Your initials" `Input` defaulting to `"ME"`; `TaskExecution.staffInitials` stores it; the journal shows those initials. Spec (Tables 42, 80) wants an auto "Logged by: [logged-in user]" read-only field and the journal to show the staff display name.

```
Establish a single source for the current staff member and use it instead of typed initials.
1) Search the repo for an existing facility auth/session/current-user hook or context. If one exists, use it. If none exists, create src/hooks/use-current-staff.ts exporting useCurrentStaff() that returns a mock { id: string; displayName: string; initials: string } (leave a // TODO: wire to real auth) — mirror how src/hooks/use-customer-facility.tsx provides the customer's facility.
2) In src/types/care-log.ts, add an optional staffName?: string to TaskExecution (keep staffInitials for back-compat).
3) In src/components/daily-care/TaskLogModal.tsx, replace the editable "Your initials" Input with a read-only "Logged by: {displayName}" line sourced from useCurrentStaff(); on submit, set staffName and staffInitials from that user (drop the free-text entry).
Do not change other modals yet. Then run bun run typecheck && bun run lint.
```

### F3 (❌) — Count task BLOCKS, not individual pet-tasks

**Files:** `src/components/daily-care/DailyCareView.tsx`, `src/components/daily-care/ProgressHeader.tsx`
**Status:** ❌ `DailyCareView` computes `totalTasks = allTasks.length` and `completedTasks` per pet-task (inflated, e.g. "74 remaining"). Spec (Table 21) wants block counts, e.g. "3 of 12 tasks complete · 2 overdue" where a block = a schedule step.

```
In src/components/daily-care/DailyCareView.tsx, change the summary counts from individual pet-task counts to TASK BLOCK counts. A "block" is a schedule step (sortedSteps): a block is complete when all of its tasks (tasksByStep.get(step.id)) are logged, and overdue when it has unlogged tasks past step.time + alertOverdueAfterMinutes (you already compute overdue per step). Pass blockTotal (= sortedSteps.length), blockComplete, and blockOverdue into ProgressHeader. In src/components/daily-care/ProgressHeader.tsx, render "{blockComplete} of {blockTotal} tasks complete" and "{blockOverdue} overdue", and base the progress bar % on blocks. Keep the date + pet-count line. Then run bun run typecheck && bun run lint.
```

### F4 (⚠️) — Unify task-type color coding (one source of truth)

**Files:** `src/components/daily-care/task-type-meta.ts` (keep), `src/components/facility/boarding/daily-care-settings.tsx` (dedupe)
**Status:** ⚠️ `TASK_TYPE_META` is defined **twice** — once in `components/daily-care/task-type-meta.ts` (used by the daily list) and again inline in `daily-care-settings.tsx` (the schedule builder). Spec (Table 72) wants consistent colours across builder AND task cards.

```
There are two copies of TASK_TYPE_META (task type → label/Icon/color/bg): the canonical one in src/components/daily-care/task-type-meta.ts and a duplicate inline in src/components/facility/boarding/daily-care-settings.tsx. Make task-type-meta.ts the single source: export what the schedule builder needs from it, delete the inline TASK_TYPE_META in daily-care-settings.tsx, and import from "@/components/daily-care/task-type-meta". Ensure both the schedule builder rows and the daily task cards render identical colours per step type. Then run bun run typecheck && bun run lint.
```

---

# AREA 1 — Module Header & Navigation

**KEEP (verify, no change):** the "Daily Care" title + subtitle and the `Today's Care` / `Schedule Settings` tabs in `src/app/facility/dashboard/daily-care/layout.tsx`; the Guest Journals and Print header buttons in `DailyCareView.tsx`. _(Minor: the "Daily Care" H1 renders in both `layout.tsx` and `ProgressHeader.tsx` — a duplicate heading; drop the one in ProgressHeader when you touch A2.)_

### A1.1 (❌ / FIX) — Remove the redundant "Configure schedule" header button

**File:** `src/components/daily-care/DailyCareView.tsx`
**Status:** ❌ Present — a "Configure schedule" button links to `/settings`, duplicating the `Schedule Settings` tab (spec Table 14).

```
In src/components/daily-care/DailyCareView.tsx, remove the "Configure schedule" header button (the Link to /facility/dashboard/daily-care/settings in the top action row). Navigation to schedule settings is already handled by the "Schedule Settings" tab in the daily-care layout, so the button is redundant. Keep the "Guest Journals" and "Print" buttons. Then run bun run typecheck && bun run lint.
```

### A1.2 (❌ / ADD) — Date picker (← Today →) in the header

**File:** `src/components/daily-care/DailyCareView.tsx`
**Status:** ❌ The view is hardcoded to `todayIso()` (`const date = todayIso()`), and `useDateCareLog(date)` already accepts any date — so a date selector just needs to drive `date` state.

```
In src/components/daily-care/DailyCareView.tsx, add a date navigator to the header: a left arrow, a centered date chip (defaulting to today) that opens a calendar popover, and a right arrow to step days. Replace the hardcoded `const date = todayIso()` with useState seeded from todayIso(); useDateCareLog(date) already takes the date so logs/executions follow it. generateScheduledTasks already accepts a Date (used in the guest journal) — pass the selected date so past/future schedules render. Use the shadcn Calendar/Popover (or the existing DatePicker component). This lets managers review yesterday's logs or preview tomorrow. Then run bun run typecheck && bun run lint.
```

### A1.3 (❌ / ADD) — Staff Filter dropdown

**File:** `src/components/daily-care/DailyCareView.tsx` (+ depends on F1 `assignedStaff`)
**Status:** ❌ No staff filter; all tasks show for everyone.

```
In src/components/daily-care/DailyCareView.tsx, add a "Staff Filter" dropdown in the header (right side, before the action buttons): "All Staff" plus each staff member. When a specific staff member is selected, filter the visible steps/tasks to those whose step.assignedStaff targets that person (kind "person" with matching staffId) or their role, PLUS unassigned steps (kind "unassigned" or undefined) which are first-come-first-served. "All Staff" shows everything. Source the staff list from the same identity source used in F2 (or a mock staff list if none exists). This filter also feeds the summary bar (see A2.3). Then run bun run typecheck && bun run lint.
```

### A1.4 (❌ / ADD) — Shift Notes button + handoff banner

**Files:** `src/components/daily-care/DailyCareView.tsx`, new `src/components/daily-care/ShiftNotes.tsx`, new store `src/data/shift-notes-store.ts`
**Status:** ❌ Missing entirely (spec 3.3 / Table 62).

```
Add shift-handoff notes to Daily Care.
1) Create src/data/shift-notes-store.ts — a small in-memory store (mirror src/data/daily-care-config-store.ts using useSyncExternalStore) keyed by facility+date holding notes: { id, author, createdAt, text }[].
2) Create src/components/daily-care/ShiftNotes.tsx: a header "Shift Notes" button that opens a dialog with a "Notes for the next shift:" textarea; on submit it stamps author (from useCurrentStaff, F2) + time and saves to the store.
3) In DailyCareView.tsx, add the ShiftNotes button to the header and render any notes for the current date as a banner at the top of the Today's Care view labelled "From {author} at {time}". Then run bun run typecheck && bun run lint.
```

---

# AREA 2 — Daily Summary Bar (`ProgressHeader.tsx`)

**KEEP (verify):** the three count chips (done / remaining / overdue) and the progress bar concept — already present in `ProgressHeader.tsx`.

### A2.1 (❌ / FIX) — Block-based counts

Covered by **F3** above (task-block counting). Ensure the summary reads e.g. "3 of 12 tasks complete · 2 overdue".

### A2.2 (❌ / ADD) — Make the overdue chip clickable → scroll to first overdue

**Files:** `src/components/daily-care/ProgressHeader.tsx`, `src/components/daily-care/DailyCareView.tsx`, `src/components/daily-care/Section.tsx`
**Status:** ❌ The overdue chip is a static Badge.

```
Make the overdue count chip actionable. In Section.tsx, add an id or ref anchor to each task card so it can be scrolled to (e.g. id={`step-${step.id}`} and a data-overdue attribute already exists). In DailyCareView.tsx, compute the first overdue step and pass a handler to ProgressHeader. In ProgressHeader.tsx, make the overdue Badge a button that, on click, scrolls to the first overdue task card (scrollIntoView smooth) and briefly applies a pulse highlight (a temporary ring/animation class removed after ~1.5s). Then run bun run typecheck && bun run lint.
```

### A2.3 (❌ / ADD) — Summary reflects the active Staff Filter

**File:** `src/components/daily-care/DailyCareView.tsx` (depends on A1.3)
**Status:** ❌ Summary is always facility-wide.

```
In DailyCareView.tsx, when a Staff Filter (A1.3) is active, compute the block counts (F3) over only that staff member's assigned/eligible steps so the ProgressHeader shows that person's shift progress; when the filter is "All Staff", show facility-wide progress. Then run bun run typecheck && bun run lint.
```

---

# AREA 3 — Task Cards (`Section.tsx`)

**KEEP (verify):** card structure (name / time / description / overdue badge / done counter / pet list) and the red Overdue badge — present in `Section.tsx`.

### A3.1 (❌ / FIX) — Auto-collapse fully completed task cards

**File:** `src/components/daily-care/Section.tsx`
**Status:** ❌ A complete card only gets `opacity-75`; it still renders every pet row (long page). Spec Table 27.

```
In src/components/daily-care/Section.tsx, when a task block is fully complete (done === total && total > 0), auto-collapse the card into a compact green "all done" state showing: task icon, name, time, completion count (e.g. "7/7"), and a ✓ — not the full pet list. Make it tappable to re-expand (local useState, default collapsed when complete). Active/overdue/in-progress cards stay expanded. Then run bun run typecheck && bun run lint.
```

### A3.2 (❌ / ADD) — "Collapse all completed" / "Expand all" controls

**File:** `src/components/daily-care/DailyCareView.tsx` (+ `Section.tsx` controlled expand prop)
**Status:** ❌ Missing.

```
Add a "Collapse all completed" button at the top of the task list in DailyCareView.tsx (appears once at least one block is fully complete), plus an "Expand all". Lift a collapse map / "expand all" signal into DailyCareView and pass a controlled expanded prop into Section.tsx (keeping A3.1's per-card toggle as the default). Then run bun run typecheck && bun run lint.
```

### A3.3 (❌ / FIX) — "Assigned to: [Staff / Role]" on each card header

**File:** `src/components/daily-care/Section.tsx` (depends on F1 `assignedStaff`)
**Status:** ❌ No assignment shown.

```
In Section.tsx, add an "Assigned to: {name/role}" line to each task card header, reading step.assignedStaff (F1): show the person's name, the role, or "All Staff" when unassigned/undefined. Keep it subtle (muted text next to the time). Then run bun run typecheck && bun run lint.
```

### A3.4 (❌ / ADD) — "Mark all as done" per card (with confirmation)

**File:** `src/components/daily-care/Section.tsx` (+ a bulk-log handler in `DailyCareView.tsx`)
**Status:** ❌ Missing.

```
In Section.tsx, add a secondary "Mark all as done" button at the top-right of each task card (next to the done counter). Tapping opens a confirm dialog: "Mark all X pets as done for {task name}? This will log {default outcome} for all pets." On confirm, log the task's default outcome (the first success outcome from OUTCOME_OPTIONS[taskType]) for every not-yet-logged pet in that block via the existing log() path in DailyCareView (add an onLogAll(step) handler). For task types that REQUIRE per-pet data, gate this behind A3.5's rule. Then run bun run typecheck && bun run lint.
```

### A3.5 (❌ / ADD) — "Log All" batch button for non-individual tasks only

**File:** `src/components/daily-care/Section.tsx`
**Status:** ❌ Missing. Spec Table 67: batch allowed for Water Refill / Kennel Cleaning; disabled for feeding / medication / potty (which need per-pet data).

```
In Section.tsx, restrict batch logging to non-individual task types. Water Refill (water_refill) and Kennel Cleaning (kennel_clean) get an active "Log All" (confirmation: "Log {task} as {default} for all N pets? This cannot be individually undone."). For feeding, medication, and potty, the batch/"Mark all as done" control is disabled with a tooltip "This task needs an outcome logged per pet." Drive this from the step.taskType. Then run bun run typecheck && bun run lint.
```

### A3.6 (❌ / FIX) — Compact one-line state for 0-pet tasks

**File:** `src/components/daily-care/Section.tsx`
**Status:** ⚠️ A 0-pet card shows the full card with "No pets need this task right now." (kept as the empty pattern) but still occupies full height. Spec Table 59 wants a compact one-liner.

```
In Section.tsx, when a task block has 0 pets for the day, render a compact single-line card instead of a full one: "{task icon} {task name} · No pets today ✓" (much shorter). Keep the "No pets need this task right now" copy only if you prefer, but collapse the vertical space. Then run bun run typecheck && bun run lint.
```

---

# AREA 4 — Pet Rows (`PetRow.tsx`)

**KEEP (verify):** avatar + kennel + tag pills + instruction text + Log button. **✅ Already built:** pet photo in the avatar — `PetRow` renders `<AvatarImage src={task.petPhotoUrl}>` with the initial as fallback (spec Table 39), so that ADD is done.

### A4.1 (⚠️ / FIX) — Green "✓ Done" state + green row tint after logging

**File:** `src/components/daily-care/PetRow.tsx`
**Status:** ⚠️ After logging, the row shows the outcome inline and the button becomes a muted "Edit" (pencil); there's no green Done affordance or green border (spec Table 35).

```
In src/components/daily-care/PetRow.tsx, after a pet's task is logged, visually distinguish the row: give it a green left border (or subtle green background tint) via the existing data-logged attribute, and show a green "✓ Done" indicator. Keep an Edit affordance available (see A4.2) — e.g. a green "✓ Done" chip plus a small Edit (pencil) button, rather than replacing Done with Edit. Then run bun run typecheck && bun run lint.
```

### A4.2 (⚠️ / ADD) — Edit re-opens the modal PRE-FILLED

**Files:** `src/components/daily-care/PetRow.tsx`, `src/components/daily-care/DailyCareView.tsx`, `src/components/daily-care/TaskLogModal.tsx`
**Status:** ⚠️ An Edit button exists and calls `onLog(task, execution)`, and `DailyCareView` tracks `modalState.existing` — but `TaskLogModal` ignores it and resets to blank on open. So edits start empty (spec Table 36 wants pre-filled).

```
Make editing a logged row re-open the modal pre-filled. TaskLogModal already receives open/task; pass the existing TaskExecution into it (DailyCareView already stores modalState.existing — thread it through as an `existing?: TaskExecution` prop). In TaskLogModal's reset effect, when `existing` is present, seed outcome, notes, servedAt, and photo state from it instead of clearing. Confirm the Edit button in PetRow (and JournalDayCard) opens this pre-filled modal so staff can correct a mis-logged outcome. Then run bun run typecheck && bun run lint.
```

### A4.3 (❌ / ADD) — Flag (⚑) button per pet row → manager alert

**Files:** `src/components/daily-care/PetRow.tsx`, a flags store (new `src/data/pet-flags-store.ts`), `src/types/care-log.ts`
**Status:** ❌ Missing (spec Table 37).

```
Add a Flag (⚑) button to each pet row in PetRow.tsx. Tapping it marks the pet as needing attention for the rest of the day and notifies the manager. Implement a small pet-flags store (src/data/pet-flags-store.ts, same useSyncExternalStore pattern) keyed by date+guest holding { reason?, createdBy, createdAt }; toggling shows a red ⚑ indicator on the row and fires a sonner toast to represent the manager notification (leave a // TODO for real push). The flag should also surface in the Guest Journal (see A8.2). Then run bun run typecheck && bun run lint.
```

### A4.4 (❌ / FIX) — "⚠ Avoid: [allergens]" line for Allergy-tagged pets

**Files:** `src/components/daily-care/PetRow.tsx`, `src/lib/care-log-scheduler.ts` (surface allergens on the task)
**Status:** ❌ Rows show an "Allergy" pill but not the specific allergens (spec Table 38).

```
For pets with the Allergy alert tag, show a red "⚠ Avoid: {allergen list}" line beneath the instruction text in PetRow.tsx, consistently across ALL task types (not just feeding). The allergen list must come from booking/guest data: in src/lib/care-log-scheduler.ts, where ScheduledTask is built (buildAlertTags uses the guest), also surface the guest's allergens onto the task (e.g. add an optional avoidList?: string[] to ScheduledTask in src/types/care-log.ts and populate it from the guest's allergy data). Render the line only when avoidList is non-empty. Then run bun run typecheck && bun run lint.
```

### A4.5 (❌ / ADD) — Care Note (sticky) indicator on the row

**Files:** `src/components/daily-care/PetRow.tsx`, care-notes source (see A6.6), `src/types/care-log.ts`
**Status:** ❌ Missing (spec 3.4 / Table 63).

```
Add a care-note indicator to PetRow.tsx: a small sticky-note icon that appears when the pet has a care note, opening a Popover/Tooltip showing the note text without leaving the view. Care notes are per-pet, persist for the stay, and are set at check-in / pet profile (see A6.6 for the source). Surface the note onto ScheduledTask (e.g. careNote?: string in src/types/care-log.ts, populated in care-log-scheduler.ts from the pet/guest record). Then run bun run typecheck && bun run lint.
```

---

# AREA 5 — Log Modals (all types)

The current build has ONE generic `src/components/daily-care/TaskLogModal.tsx` that only swaps outcome chips by `task.taskType`. The spec wants **dedicated modal components per type** with a read-only "booking data" zone on top and a log zone below. Recommended structure: create `src/components/daily-care/log-modals/` with one component per type and a small router that picks the right one; keep the shared "logged by / timestamp / photo" pieces as reusable subcomponents. Outcome sets already live in `src/components/daily-care/outcome-meta.ts` (`OUTCOME_OPTIONS`) — reuse and, where the spec's labels differ, reconcile there.

### A5.1 (⚠️ / FIX) — "Logged by" (auto) instead of initials

Covered by **F2**. Ensure every modal (generic + the new dedicated ones) shows read-only "Logged by: {displayName}".

### A5.2 (❌ / ADD) — Auto timestamp + "Override time"

**File:** shared modal piece (e.g. `src/components/daily-care/log-modals/LogMeta.tsx`), consumed by all modals
**Status:** ⚠️ Only feeding has a "time served" input today; no general "Logging at: now" + override.

```
Create a small reusable "log meta" section used by every log modal: an auto-populated "Logging at: {now}" line plus an "Override time" text link that reveals a time input for backdated entries. Wire the chosen time into the TaskExecution.executedAt on submit (DailyCareView/handleSubmit currently stamps now — let an override value win when provided). Then run bun run typecheck && bun run lint.
```

### A5.3 (⚠️ / ADD) — Optional photo attachment (max 3) on all modals

**File:** shared modal piece + `src/types/care-log.ts`
**Status:** ⚠️ Photo capture exists only when `requiresPhotoProof`, single `photoUrl`. Spec Table 66 wants optional photos (max 3) on all modals.

```
Add an optional "Add Photo" control (camera/library) to every log modal, max 3 photos per entry. Change TaskExecution to carry photoUrls?: string[] (keep photoUrl for back-compat, or migrate reads) in src/types/care-log.ts, and thread it through DailyCareView/ReservationJournalPanel handleSubmit and log(). Photos then appear in that day's Guest Journal entry. Keep it optional except where a step/type marks photo required. Then run bun run typecheck && bun run lint.
```

### A5.4 (❌ / ADD) — "Quick Log" one-tap default outcome

**Files:** `src/components/daily-care/PetRow.tsx` or `Section.tsx`, reusing the log path
**Status:** ❌ Missing (spec Table 43) — for routine tasks (potty, cleaning, water), a big "Log: {default} ✓" that saves without opening the modal; "More options" opens the full modal.

```
Add a "Quick Log" path for routine task types (potty, water_refill, kennel_clean): render a primary one-tap button on the pet row (or task card) that logs the most common default outcome immediately (potty → "Both"; water/cleaning → "Completed") via the existing log() path, plus a "More options" affordance that opens the full modal for edge cases. Do NOT offer quick-log for feeding/medication (they need real data). Then run bun run typecheck && bun run lint.
```

### A5.5 (❌ / ADD) — Health-observation option on the potty modal

**File:** `src/components/daily-care/log-modals/PottyLogModal.tsx` (new; extracted from the generic modal)
**Status:** ❌ Missing (spec Table 45).

```
Build a dedicated Potty log modal (extract from the generic TaskLogModal) with the existing potty outcome chips (Peed/Pooped/Both/Nothing/Soft stool/Diarrhea/Vomit noticed from OUTCOME_OPTIONS.potty), Notes, and the shared Logged-by/timestamp/photo pieces. Add a "Note health concern" checkbox that, when checked, expands to: Observation type (Limping / Lethargy / Abnormal stool / Vomiting / Coughing / Eye / Ear / Skin / Other), Severity (Monitoring / Needs attention / Urgent), and a Notes field. Logging a health concern also raises a pet flag (A4.3) and notifies the manager (toast). Persist the observation on the TaskExecution (add an optional healthObservation field to TaskExecution in src/types/care-log.ts). Then run bun run typecheck && bun run lint.
```

### A5.6 (❌ / FIX) — Dedicated Feeding log modal

**File:** `src/components/daily-care/log-modals/FeedingLogModal.tsx` (new)
**Status:** ❌ Generic modal only adds a "time served" input.

```
Build a dedicated Feeding log modal with two zones. TOP (READ-ONLY, from the booking, not editable here): food brand/type, amount to give, frequency, and — if the pet has the Allergy tag — a red "⚠ Avoid: {allergens}" banner rendered ABOVE everything else (staff must pass over it before reaching the chips). Source this from the task's subDetails/avoidList (A4.4) — Daily Care never asks staff to re-enter care instructions. BOTTOM (LOG ZONE): outcome chips matching the facility's Feeding Feedback Options (use OUTCOME_OPTIONS.feeding; reconcile labels toward Ate all / Ate most / Ate some / Ate little / Refused per spec, updating outcome-meta.ts if you change them), optional Notes, shared Logged-by/timestamp/photo. Also: if the booking has NO feeding plan, show a warning banner "No feeding plan on file for this pet. Ask the owner or check the booking." but still allow logging. Wire it into the modal router (A5.13) for taskType "feeding". Then run bun run typecheck && bun run lint.
```

### A5.7 (❌ / FIX) — Dedicated Medication log modal (multi-med, mandatory skip note)

**File:** `src/components/daily-care/log-modals/MedicationLogModal.tsx` (new)
**Status:** ❌ Generic modal only.

```
Build a dedicated Medication log modal. TOP (READ-ONLY from booking): medication name, dosage, administration method (Oral / Topical / Injection / Eye drops / Ear drops), timing notes (e.g. "Give with food") — displayed, not editable. BOTTOM (LOG ZONE): outcome chips (Given / Skipped / Refused / Vomited after — reconcile with OUTCOME_OPTIONS.medication), timestamp (override-able), Notes, Logged-by. Rules: (a) for pets with multiple medications, step through each one ("Medication 1 of 2: {name} {dose} · {method}"), logging each as its own TaskExecution before advancing; (b) if outcome is Skipped or Refused, require a Notes value of ≥10 characters before Save enables; (c) if the task appears but the booking lists no meds (added after generation), show "Medication data may have changed. Tap to reload from booking." Wire into the router for taskType "medication". Then run bun run typecheck && bun run lint.
```

### A5.8 (❌ / FIX) — Dedicated Kennel Cleaning log modal

**File:** `src/components/daily-care/log-modals/CleaningLogModal.tsx` (new)
**Status:** ❌ Generic modal only.

```
Build a dedicated Kennel Cleaning log modal (no booking data needed): Cleaning type (Full clean / Quick tidy / Spot clean), Products used (optional free text or a configurable dropdown), an "Any damage or issues noticed" toggle that reveals a "Kennel condition" note field (soiling type, broken hardware, items left) to build a maintenance log, plus shared Logged-by/timestamp/photo. Supports batch "Log All" (A3.5). Persist the cleaning-specific fields on TaskExecution (extend the type minimally). Wire into the router for kennel_clean. Then run bun run typecheck && bun run lint.
```

### A5.9 (❌ / FIX) — Dedicated Water Refill log modal

**File:** `src/components/daily-care/log-modals/WaterRefillLogModal.tsx` (new)
**Status:** ❌ Generic modal only.

```
Build a dedicated Water Refill log modal: a simple confirm ("Refilled"), an optional volume field, shared Logged-by/timestamp, and support for batch "Log All" across all pets (A3.5). Minimal by design. Wire into the router for water_refill. Then run bun run typecheck && bun run lint.
```

### A5.10 (❌ / FIX) — Dedicated Add-On log modal (+ play-specific, cannot-deliver)

**File:** `src/components/daily-care/log-modals/AddOnLogModal.tsx` (new)
**Status:** ❌ Generic modal only.

```
Build a dedicated Add-On log modal. TOP (READ-ONLY from booking): service name (e.g. "Checkout Day Groom"), booked duration, owner instructions. BOTTOM (LOG ZONE): Actual duration (pre-filled from booked, editable), Outcome/Notes (free text), "Staff member who delivered" (dropdown of active staff), Logged-by. When the service is a play session, show extra fields after the standard ones: Group interaction (Thrived / Good / Needed monitoring / Had to separate), Energy level (High / Normal / Low / Lethargic), and an "Any incidents" toggle (opens the incident flow). Add a "Cannot deliver today" option with a required reason (logs the missed service, optionally notifies the owner). Wire into the router for addon. Then run bun run typecheck && bun run lint.
```

### A5.11 (❌ / ADD) — Enrichment log modal

**File:** `src/components/daily-care/log-modals/EnrichmentLogModal.tsx` (new)
**Status:** ❌ Missing.

```
Build an Enrichment log modal (no booking data): Activity type, Duration, Dog engagement level (e.g. High / Normal / Low), Notes, shared Logged-by/timestamp/photo. Wire into the router for the enrichment/custom-enrichment case. Then run bun run typecheck && bun run lint.
```

### A5.12 (❌ / ADD) — Custom step log modal (log-type driven)

**File:** `src/components/daily-care/log-modals/CustomLogModal.tsx` (new)
**Status:** ❌ Missing.

```
Build a Custom log modal driven by the step's chosen Log Type (from the Step Creator, A7.5): Simple Confirm / Outcome Chips / Notes Only / Photo Required. Render the minimal UI for whichever log type the custom step declares, plus shared Logged-by/timestamp. Wire into the router for taskType "custom". Then run bun run typecheck && bun run lint.
```

### A5.13 (❌ / ADD) — Log-modal router

**Files:** `src/components/daily-care/log-modals/LogModalRouter.tsx` (new), `DailyCareView.tsx`, `ReservationJournalPanel.tsx`
**Status:** ❌ Both `DailyCareView` and `ReservationJournalPanel` currently render the single `TaskLogModal`.

```
Create src/components/daily-care/log-modals/LogModalRouter.tsx that takes the same props as today's TaskLogModal (open, task, existing, onOpenChange, onSubmit) and renders the correct dedicated modal based on task.taskType (+ subType): potty→PottyLogModal, feeding→FeedingLogModal, medication→MedicationLogModal, kennel_clean→CleaningLogModal, water_refill→WaterRefillLogModal, addon→AddOnLogModal, enrichment→EnrichmentLogModal, custom→CustomLogModal; fall back to the generic modal for anything unmapped. Swap the <TaskLogModal> usages in DailyCareView.tsx and ReservationJournalPanel.tsx for <LogModalRouter>. Keep the onSubmit shape backward-compatible. Then run bun run typecheck && bun run lint && bun run build.
```

---

# AREA 6 — New Features

### A6.1 (❌ / ADD) — Head Count / Rollcall ("Dogs back inside") — the critical one

**Files:** new `src/components/daily-care/HeadCountOverlay.tsx`, `src/components/daily-care/Section.tsx` (Start button), `DailyCareView.tsx` (state), depends on F1 `requiresHeadCount`
**Status:** ❌ Missing entirely. Spec 3.1 / Table 61 — Puneet's top-priority feature (a dog left outside overnight is a liability).

```
Build the Head Count rollcall for the Evening Potty Round (Last Call) — the module must not let staff mark Last Call complete until every dog is accounted for.
- Trigger: on any task card whose step has requiresHeadCount === true (F1; default it on for the last potty step), show a prominent "START HEAD COUNT" button at the top of the card, distinct from the normal per-pet flow (Section.tsx).
- Create src/components/daily-care/HeadCountOverlay.tsx: a FULL-SCREEN overlay (cannot be dismissed by clicking outside; the X is disabled until complete). It lists ALL dogs currently in the facility (getCurrentGuests) as large cards: initial avatar (or photo), pet name, kennel, tier badge. Each card has a big "Mark Inside" button; tapping turns it green with a check. A sticky top banner shows "{X} of {Y} dogs inside" with a progress bar that turns green at 100%.
- "Cannot Locate" per card → red state and fires a CRITICAL manager alert (sonner toast now, // TODO push/SMS): "{Facility}: {Dog} (Kennel {n} · {tier}) cannot be located during Last Call. Immediate attention required." A Cannot-Locate requires a manager override note before the head count can close.
- "Complete Head Count" is disabled until 0 dogs remain Pending (every dog is Inside or Cannot-Locate). Completing it closes the overlay, marks the Last Call step complete, and writes a log record: "{staff} confirmed {X/Y} dogs inside at {time}. Head count complete." (persist via the care-log path / a head-count store).
- Card states: Pending (white) · Inside ✓ (green) · Cannot Locate ✗ (red). 2-col grid on mobile, 3–4 on tablet.
Then run bun run typecheck && bun run lint && bun run build.
```

### A6.2 (❌ / ADD) — Cannot-Locate critical alert + override

Covered inside **A6.1** (the alert + manager override note). If you split it out, keep the alert copy and the "override note required before close" rule.

### A6.3 (❌ / ADD) — Head count result logged in the daily care record

Covered inside **A6.1** (the "confirmed X/Y dogs inside at {time}" log). Ensure it appears in the Day Summary (A6.7) and is attributable to the staff member.

### A6.4 (❌ / ADD) — Staff assignment to steps

**Files:** Step Creator (A7.5) writes `step.assignedStaff` (F1); consumed by A1.3 (filter) and A3.3 (card line)
**Status:** ❌ No assignment anywhere.

```
Wire staff assignment end to end: the Step Creator (A7.5) sets step.assignedStaff (F1) to Unassigned / Role / Person; the daily list shows "Assigned to:" per card (A3.3); the header Staff Filter (A1.3) filters to a person's assigned + unassigned steps; and the manager view shows the staff name next to each completed log (staffName from F2). Confirm all four read the same assignedStaff field. Then run bun run typecheck && bun run lint.
```

### A6.5 (❌ / ADD) — Per-staff task view (default to my tasks, toggle to All)

**File:** `src/components/daily-care/DailyCareView.tsx`
**Status:** ❌ Missing.

```
In DailyCareView.tsx, when a staff member is logged in (useCurrentStaff, F2), default their Today's Care view to THEIR assigned tasks (plus unassigned, first-come-first-served) with a visible toggle to "All Tasks". Managers default to All. This reuses the A1.3 filter logic but seeds the default from the current user. Shift handoff: a new staff member can still switch to All to see what the previous shift completed vs pending. Then run bun run typecheck && bun run lint.
```

### A6.6 (❌ / ADD) — Pet-specific care notes (sticky notes)

**Files:** care-notes source (pet/guest data or a new `src/data/pet-care-notes.ts`), consumed by A4.5
**Status:** ❌ Missing.

```
Add pet-specific care notes that persist for the whole stay and are visible throughout Daily Care. Store them per pet (either on the guest/pet record in src/data/boarding.ts, or a dedicated src/data/pet-care-notes.ts store). Surface each pet's note onto ScheduledTask (careNote, per A4.5) so PetRow shows the sticky-note icon + popover. Provide a way to set/edit a note (at check-in or the pet profile, and via the Guest Journal manual-note flow in A8.4). Examples: "Needs extra cuddle time", "Call owner if she refuses food twice". Then run bun run typecheck && bun run lint.
```

### A6.7 (❌ / ADD) — Day Summary / End-of-Day report (past dates)

**Files:** new `src/components/daily-care/DaySummaryView.tsx`, reachable from the date picker (A1.2)
**Status:** ❌ Missing (spec 3.5 / Table 64).

```
Build a Day Summary view for a past date (reachable from the date navigator once the selected date is in the past). It aggregates, for that date: total task blocks completed vs missed, all health flags raised, all medication logs, all feeding outcomes, the head-count confirmation, any shift notes, and a list of Guest Journals updated that day. Render it from the care-log executions + stores already in place. Make it printable and exportable as PDF (reuse whatever PDF/print approach A9 establishes). Then run bun run typecheck && bun run lint.
```

### A6.8 (❌ / ADD) — HQ View (manager real-time monitoring)

**Files:** new `src/components/daily-care/HqView.tsx`, toggle in `DailyCareView.tsx`
**Status:** ❌ Missing (spec 3.6 / Table 65). _(Note: the spec mentions an existing "HQ View" toggle, but the current `DailyCareView` header has none — build the toggle too.)_

```
Add an "HQ View" toggle to the Daily Care header that switches to a manager monitoring mode (src/components/daily-care/HqView.tsx): all task blocks in a condensed view with assigned staff; a live progress bar per staff member (e.g. "Maria: 8/12 · James: 4/12") computed from block completion + assignedStaff; overdue blocks highlighted; pet flags raised in the last 30 minutes; and a "Send nudge to staff" button that fires a push-style toast reminding assigned staff of overdue tasks (// TODO real push). Then run bun run typecheck && bun run lint.
```

---

# AREA 7 — Schedule Builder (Schedule Settings tab)

**Live file:** `src/components/facility/boarding/daily-care-settings.tsx` (rendered by `daily-care/settings/page.tsx`). _(Ignore `src/components/facility-config/ScheduleSettings.tsx` — that's a different check-in/out & operating-hours panel, unrelated to this spec.)_

**KEEP (verify):** the step list showing name + type badge + time + description; the enable/disable Switch; the delete action — all present in `DailyCareSettings`.

### A7.1 (❌ / FIX) — Always-editable interactive list (remove the Edit mode)

**File:** `src/components/facility/boarding/daily-care-settings.tsx`
**Status:** ❌ The list is gated behind an "Edit" button / `isEditing` draft; controls only show in edit mode (spec Table 68 wants it always interactive).

```
In src/components/facility/boarding/daily-care-settings.tsx, remove the Edit/Save/Cancel draft mode (isEditing) and make the step list directly interactive: reorder handles, enable/disable toggles, delete, and the overdue-threshold field are always active and persist immediately via useDailyCareConfig().setConfig (the store already re-renders the daily list live). Drop the draft state and the Edit button. Keep a subtle autosave/"saved" affordance if useful. Then run bun run typecheck && bun run lint.
```

### A7.2 (❌ / ADD) — Drag-to-reorder grips

**File:** `src/components/facility/boarding/daily-care-settings.tsx`
**Status:** ❌ Reordering is up/down chevrons; `@dnd-kit/*` is already installed.

```
Replace the up/down chevron reordering in daily-care-settings.tsx with drag-to-reorder using @dnd-kit (already a dependency): a ⋮⋮ grip handle on the left of each step row; dragging updates sortOrder and persists via setConfig. Keep keyboard accessibility (dnd-kit sortable supports it). Then run bun run typecheck && bun run lint.
```

### A7.3 (✅ / verify) — Enable/disable toggle per step

**Status:** ✅ Already present (the `Switch` in `StepRow`). After A7.1 it should be always-on (not edit-mode-gated). No new work beyond that.

### A7.4 (⚠️ / FIX) — Consistent step-type colour coding

Covered by **F4** (unify `TASK_TYPE_META`). Verify the builder rows and daily task cards render identical colours per type.

### A7.5 (⚠️ / ADD) — Full Step Creator modal

**Files:** new `src/components/facility/boarding/StepCreatorModal.tsx` (replaces the inline `AddStepForm`), depends on F1
**Status:** ⚠️ The current `AddStepForm` only captures name / time / taskType / description. Spec Table 73 needs far more.

```
Replace the inline AddStepForm in daily-care-settings.tsx with a StepCreatorModal (src/components/facility/boarding/StepCreatorModal.tsx) opened by an always-visible "+ Add Step" button. Fields (per spec 4.3):
- Step Name (text, required)
- Step Type (Potty Round / Feeding / Medication / Kennel Cleaning / Water Refill / Add-On Service / Enrichment / Custom) — drives which log modal opens
- Time of Day (time, required)
- Description (optional)
- Who This Task Applies To → step.appliesTo (F1): All Boarding Guests (default) / Dogs with a feeding plan / Dogs with medications / Dogs with this add-on booked / Dogs with tags. (Booking-driven; not manual dog selection.)
- Assigned Staff → step.assignedStaff (F1): Unassigned / Role / Person
- Log Type (Custom steps only): Simple Confirm / Outcome Chips / Notes Only / Photo Required
- Requires Head Count (toggle) → step.requiresHeadCount (F1); default ON for the last potty round of the day
- Active Days (day-of-week multiselect) → step.activeDays (F1); default all 7
Persist via setConfig. Support editing an existing step through the same modal. Then run bun run typecheck && bun run lint.
```

### A7.6 (❌ / ADD) — Active Days honored by the scheduler

**File:** `src/lib/care-log-scheduler.ts`
**Status:** ❌ `generateScheduledTasks` filters only `enabled` steps.

```
In src/lib/care-log-scheduler.ts, make generateScheduledTasks respect step.activeDays (F1): when a step has activeDays and the target date's day-of-week is not included, skip that step for that date. Undefined activeDays = runs every day. The function already receives the target Date. Then run bun run typecheck && bun run lint.
```

### A7.7 (❌ / ADD) — "Applies To" honored by the scheduler

**File:** `src/lib/care-log-scheduler.ts`
**Status:** ❌ Task assignment to pets is by task type only.

```
In src/lib/care-log-scheduler.ts, honor step.appliesTo (F1) when building each step's pet list: "all" = every current boarding guest; "feeding_plan" = only guests with a feeding plan on file; "medications" = only guests with meds; "addon" = only guests who booked that add-on; "tags" = guests with the given tags. This replaces implicit type-based filtering with the configured rule, keeping the current behaviour as the default when appliesTo is undefined. Then run bun run typecheck && bun run lint.
```

### A7.8 (❌ / ADD) — "Requires Head Count" toggle wired to Last Call

Covered by **A7.5** (sets `requiresHeadCount`) + **A6.1** (consumes it). Verify a step with the toggle on shows the START HEAD COUNT button and blocks completion until the rollcall closes.

### A7.9 (❌ / ADD) — Schedule Templates (save / load / apply)

**Files:** `src/components/facility/boarding/daily-care-settings.tsx`, `src/types/boarding.ts` (F1 `templates`)
**Status:** ❌ Missing (spec Table 75).

```
Add Schedule Templates to the builder: let a facility save the current steps as a named template (config.templates from F1), load/apply a template to the live schedule (optionally to specific days or a date range), and pick a starter template from a small built-in library when setting up. Provide Save-as-template, Apply-template, and Delete-template actions in daily-care-settings.tsx; persist via setConfig. Then run bun run typecheck && bun run lint.
```

---

# AREA 8 — Guest Journals

**Files:** `src/components/guest-journal/ReservationJournalPanel.tsx`, `JournalDayCard.tsx`, `JournalActivityLog.tsx` (opened from the Daily Care header slide-over).

**KEEP (verify):** the slide-over panel, guest list, day tabs (D1…Dn), per-day task list, and the append-only Activity Log — all present.

### A8.1 (⚠️ / FIX) — Activity Log shows the staff display name, not initials

**File:** `src/components/guest-journal/JournalActivityLog.tsx` (+ `JournalDayCard.tsx`)
**Status:** ⚠️ Shows `exec.staffInitials`. After F2 adds `staffName`, switch the display.

```
In src/components/guest-journal/JournalActivityLog.tsx and JournalDayCard.tsx, display exec.staffName (F2) instead of exec.staffInitials, falling back to initials only when staffName is absent (legacy records). Then run bun run typecheck && bun run lint.
```

### A8.2 (❌ / ADD) — Health-flag indicator in the guest list

**Files:** `src/components/daily-care/DailyCareView.tsx` (the journal guest list), pet-flags store (A4.3)
**Status:** ❌ Missing.

```
In the Guest Journals list (rendered inside DailyCareView.tsx's journal sheet), show a small red ⚑ next to any pet that has a health flag raised during their stay (read the pet-flags store from A4.3, and/or executions carrying a health observation from A5.5). Managers can then spot which pets need attention. Then run bun run typecheck && bun run lint.
```

### A8.3 (❌ / ADD) — "Download Journal" PDF

**File:** `src/components/guest-journal/ReservationJournalPanel.tsx`
**Status:** ❌ Missing (spec Table 82).

```
Add a "Download Journal" action to the individual Guest Journal (ReservationJournalPanel.tsx) that generates a PDF of the pet's complete stay — all days, tasks, outcomes, notes, health flags — formatted as a shareable owner report. Reuse any existing PDF/print helper in the repo before adding a dependency; if none exists, use a print-to-PDF layout consistent with AREA 9. Then run bun run typecheck && bun run lint.
```

### A8.4 (❌ / ADD) — "Add Manual Note" (not tied to a task)

**File:** `src/components/guest-journal/ReservationJournalPanel.tsx` (+ care-log/notes store)
**Status:** ❌ Missing (spec Table 83).

```
Add an "Add Note" button in the individual Guest Journal that opens a free-text field and appends a manual, non-task note to that guest's journal/activity log (e.g. "Owner called — told them Bella is doing great."). Store it alongside executions (a note-type entry) so it appears in the Activity Log with author + time. Then run bun run typecheck && bun run lint.
```

### A8.5 (❌ / ADD) — Stay summary at the top of the journal

**File:** `src/components/guest-journal/ReservationJournalPanel.tsx`
**Status:** ❌ Only a nights badge today.

```
At the top of the individual Guest Journal (ReservationJournalPanel.tsx / GuestJournalContent), show the pet's stay summary: check-in date, check-out date, room/kennel type, owner name and phone (tap-to-call tel: link), and any special instructions from the booking. Source from the BoardingGuest / booking record already loaded. Then run bun run typecheck && bun run lint.
```

---

# AREA 9 — Print View

**Status today:** the "Print" button just calls `window.print()` on the live DOM (`DailyCareView.tsx`) — there is **no** print-specific layout or CSS, which is why interactive controls (Edit buttons) and the app nav leak into the printout. Build a real print layout.

### A9.1 (❌ / FIX+ADD) — Dedicated print layout + print CSS

**Files:** new `src/components/daily-care/DailyCarePrintSheet.tsx`, `DailyCareView.tsx`, global print CSS
**Status:** ❌ No print layout exists.

```
Create a dedicated print layout for Daily Care (src/components/daily-care/DailyCarePrintSheet.tsx) rendered only for print (a print-only container), and drive the Print button from it. It must:
- Render ONLY the daily care content: task blocks with their pet rows and instructions — no Edit buttons, no interactive controls, no app navigation/bottom tab bar. Use @media print CSS (a print:hidden utility on app chrome and a print:block on the sheet) so screen UI and nav are excluded.
- Add a printed page header on each page: "{Facility Name} · Daily Care · {Date} · Printed at {Time} by {Staff Name}".
- Add an empty checkbox column next to each pet row so staff can tick items on paper.
Keep the overall black-and-white task-list structure. Then run bun run typecheck && bun run lint && bun run build.
```

### A9.2 (❌ / ADD) — "Print Single Task"

**Files:** `src/components/daily-care/Section.tsx`, `DailyCarePrintSheet.tsx`
**Status:** ❌ Missing (spec Table 90).

```
Add a "Print this task" secondary action on each task card header (Section.tsx) that prints only that task's pet list (e.g. just "Morning Medications" for the nurse): task name, time, and each pet with its specific instruction. Reuse the DailyCarePrintSheet with a single-step filter (print only the selected step). Then run bun run typecheck && bun run lint.
```

_(A9's "remove Edit button from print" and "remove app nav from print" FIXes are satisfied by building the print-only sheet in A9.1 — the printout renders the sheet, not the interactive DOM.)_

---

# APPENDIX — Verification & smoke-test prompt

Run after a batch of the above to confirm nothing regressed.

```
Do a read-only verification pass on the Daily Care module and report a PASS/FAIL table, then run the green sequence.
Files: src/app/facility/dashboard/daily-care/{layout,page,settings/page}.tsx; src/components/daily-care/*; src/components/daily-care/log-modals/*; src/components/facility/boarding/daily-care-settings.tsx; src/components/guest-journal/*; src/types/{boarding,care-log}.ts; src/lib/care-log-scheduler.ts.
For each spec area (Header/Nav, Summary bar, Task cards, Pet rows, Log modals, New features [Head Count, Staff assignment, Shift notes, Care notes, Day summary, HQ view], Schedule builder, Guest journals, Print), state which change items are implemented (with file + line) and which are still missing. Confirm: task-block counting (not pet-tasks); "Logged by" name instead of typed initials; dedicated per-type log modals via the router; Head Count blocks Last Call completion until all dogs accounted for; DailyCareStep carries assignedStaff/requiresHeadCount/activeDays/appliesTo. Then run `bun run typecheck && bun run lint && bun run format:check` and report results. Do not edit code in this pass.
```

---

_~60 change items mapped to the client's Part 7 change table, each grounded in the real file that owns it, ordered Foundations → daily list → log modals → schedule builder → new features → journals → print. Because this module is an early build, most prompts implement rather than verify. Paste one block at a time; let the agent plan, implement, typecheck, and lint before the next._
