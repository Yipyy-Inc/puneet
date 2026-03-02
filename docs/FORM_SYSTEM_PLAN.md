# Full-Featured Form System (rebuilt)

## Goal

Facilities can create and manage:

- **Pet Forms** — stored on each pet profile
- **Owner/Customer Forms** — stored on customer profile
- **Intake Forms** — new client application / onboarding
- **Service Forms** — boarding intake, grooming consent, training waiver, evaluation forms
- **Internal Forms** — staff-only checklists

Forms must support: **conditional questions / branching**, reusable templates, shareable links + embed, submission inbox + processing (create/merge profiles), mapping answers to profile fields/notes, multi-pet support, automation + notification hooks.

---

## Current state

- **Data**: All in `src/data`; no ORM. `clients.ts`, `documents.ts`, `facility-config.ts`. Facility pages use static `facilityId` (e.g. 11).
- **Waivers**: DigitalWaiversManager + waivers page; facility-config waiversAndContracts has template names/content, no builder or conditional logic.
- **Automations**: communications-hub (triggers), facility-notifications (addFacilityNotification). No form-submission trigger yet.

---

## 1. Data model

**New: `src/data/forms.ts`**

- **Form**: `id`, `facilityId`, `name`, `slug`, `type` (`pet`|`owner`|`intake`|`service`|`internal`), `serviceType?`, `templateId?`, `internal` (boolean), `questions`, `fieldMapping`, `repeatPerPet?`, `createdAt`, `updatedAt`.
- **FormQuestion**: `id`, `type` (text, textarea, select, multiselect, checkbox, date, number, file, signature), `label`, `required`, `options?`, `placeholder?`, `condition?`.
- **FormCondition**: `questionId?` | `contextField?` (petType, serviceType, evaluationStatus), `operator` (eq, neq, contains, in), `value`.
- **FormTemplate**: `id`, `facilityId`, `name`, `formType`, `questions`.
- **FieldMappingItem**: `questionId`, `target` (e.g. `customer.name`, `pet.breed`, `notes`).
- Helpers: `getFormsByFacility`, `getFormBySlug`, `getFormById`, CRUD for forms and templates; **`shouldShowQuestion(question, answers, context)`** for conditional logic.

**New: `src/data/form-submissions.ts`**

- **FormSubmission**: `id`, `formId`, `facilityId`, `status` (new | processed | merged), `context?`, `answers`, `petIds?`, `customerId?`, `submitterEmail?`, `submitterName?`, `createdAt`, `processedAt?`, `processedBy?`.
- Helpers: `createSubmission`, `getSubmissionsByFacility`, `getSubmission`, `updateSubmissionStatus`, `linkSubmissionToCustomer`.

---

## 2. Conditional logic (must-have)

- **Engine**: `shouldShowQuestion(question, answers, context)` in forms.ts. If `condition.contextField` → evaluate against context; if `condition.questionId` → evaluate `answers[questionId]` with operator/value.
- **Builder**: Each question can have one condition: “Show when” → answer to question X **or** context (pet type / service type / evaluation status) → operator → value(s).
- **Fill**: Only render questions where `shouldShowQuestion` is true; collect answers and context (URL params or earlier answers).

---

## 3. UI structure (facility)

**Navigation (under Management, after Digital Waivers, before Settings)**  
Add in `src/components/layout/facility-admin-sidebar.tsx`:

- **Intake Forms** → `/facility/dashboard/forms`
- **Form Builder** → `/facility/dashboard/forms/builder`
- **Submissions Inbox** → `/facility/dashboard/forms/submissions`
- **Templates** → `/facility/dashboard/forms/templates`

**Form categories (filter/tabs on Intake Forms page)**  
Tabs: Intake Forms | Pet Profile Forms | Customer Profile Forms | Service Forms | Internal Forms (maps to `type`: intake, pet, owner, service, internal).

**Pages**

- **Intake Forms** `src/app/facility/dashboard/forms/page.tsx`: List forms by category tabs; links to builder, duplicate, share link.
- **Form Builder** `src/app/facility/dashboard/forms/builder/page.tsx`: Create/edit form (name, slug, type, serviceType, internal, repeatPerPet), questions (add/reorder/edit, conditions), field mapping. Optional: create from template, save as template.
- **Submissions Inbox** `src/app/facility/dashboard/forms/submissions/page.tsx`: List submissions (form, submitter, date, status); detail view with answers; actions: Create client, Merge into existing, Attach to profile (optional ClientDocument).
- **Templates** `src/app/facility/dashboard/forms/templates/page.tsx`: List/create/edit facility templates (prebuilt + facility-specific).

---

## 4. Shareable links and embed

- **Route**: `src/app/forms/[slug]/page.tsx`. Resolve via `getFormBySlug(slug)`; if not found or `internal` → 404.
- **Query params**: `?service=boarding`, `?petType=Dog`, `?evaluationStatus=pending` for context.
- **Embed**: Same page with `?embed=1` → minimal layout (no facility header/footer) for iframe.
- **Customer portal**: Link from documents/pet profile to `/forms/[slug]?customerId=...&petId=...`.

---

## 5. Submission processing and field mapping

- **Mapping**: Form stores `fieldMapping[]` (questionId → target). On “Create client” / “Merge”: for each mapping, set `client[field]` or `pet[field]` or append to `notes` from `answers[questionId]`.
- **Create client**: Build new client (and pets if repeat-per-pet) from mapped answers; append to clients; set submission `customerId`, status processed.
- **Merge**: Select existing client/pet; apply mapping; link submission; mark merged.
- **Attach**: Link submission to profile; optionally create ClientDocument so it appears under documents.

---

## 6. Multi-pet support

- Form config: `repeatPerPet: true` or pet-selector question.
- Fill: Block per pet; answers e.g. `answers[qId] = { [petId]: value }`.
- Inbox: Show answers per pet; create/merge can create or update multiple pets.

---

## 7. Automation and notifications

- **facility-notifications.ts**: Add type `form_submitted`; on `createSubmission()` call `addFacilityNotification` with formId, formName, submissionId in meta.
- **communications-hub.ts**: Add trigger `form_submitted` (and optional `triggerMeta.formId`) to AutomationRule; wire UI to show it.

---

## 8. Implementation order

1. **Data**: `src/data/forms.ts` + `src/data/form-submissions.ts` (types, CRUD, `shouldShowQuestion`).
2. **Nav + Intake Forms page**: Sidebar items, `forms/page.tsx` with category tabs.
3. **Form Builder**: `forms/builder/page.tsx` + shared components (question editor, condition editor, mapping editor) under `src/components/forms/`.
4. **Templates page**: `forms/templates/page.tsx`.
5. **Public fill**: `app/forms/[slug]/page.tsx` + form renderer (conditions, validation, submit → `createSubmission`).
6. **Submissions Inbox**: `forms/submissions/page.tsx` + processing actions (create/merge/attach, apply mapping).
7. **Multi-pet**: Extend form config and fill UI (repeat block / pet selector); inbox display and processing.
8. **Notifications**: `form_submitted` type and trigger; call notification from submission creation.

---

## 9. Files to add or touch

| File | Action |
|------|--------|
| `src/data/forms.ts` | New: types, CRUD, `shouldShowQuestion` |
| `src/data/form-submissions.ts` | New: types, create, get, update |
| `src/data/facility-notifications.ts` | Add `form_submitted` type and meta |
| `src/data/communications-hub.ts` | Add `form_submitted` trigger, optional triggerMeta |
| `src/components/layout/facility-admin-sidebar.tsx` | Add Intake Forms, Form Builder, Submissions Inbox, Templates |
| `src/app/facility/dashboard/forms/page.tsx` | New: list by category tabs |
| `src/app/facility/dashboard/forms/builder/page.tsx` | New: form builder |
| `src/app/facility/dashboard/forms/submissions/page.tsx` | New: inbox + processing |
| `src/app/facility/dashboard/forms/templates/page.tsx` | New: templates list/edit |
| `src/app/forms/[slug]/page.tsx` | New: public fill + embed |
| `src/components/forms/` | New: FormBuilderEditor, condition/question/mapping editors, form renderer |
| `src/data/clients.ts` | Used by inbox “Create client” |
| `src/data/documents.ts` | Optional: create ClientDocument on “Attach as document” |

Conditional fields (pet type, service type, evaluation status, and “if answer A → show X”) are implemented via **FormCondition** and **shouldShowQuestion** in the builder and on the public fill page.
