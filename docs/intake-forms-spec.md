# Intake Forms System — Requirements Specification

> Reference: [Live App](https://puneet-blue.vercel.app/facility/dashboard/forms) | [Competitor Reference (MoeGo)](https://wiki.moego.pet/intake-form-set-up/)

---

## 1. Overview

Build a full-featured form system that lets facilities create, manage, and process structured forms across five categories. Forms must support conditional branching, reusable templates, shareable links, a submission inbox with profile matching/merging, field mapping to profiles, multi-pet support, and automation hooks.

---

## 2. Form Types

| Type | Purpose | Stored On |
|------|---------|-----------|
| **Intake** | New client application / onboarding | Submission → creates profiles |
| **Pet Profile** | Per-pet questionnaires | Pet profile |
| **Customer Profile** | Per-owner questionnaires | Customer profile |
| **Service** | Boarding intake, grooming consent, training waiver, evaluations | Booking / service record |
| **Internal** | Staff-only checklists | Internal records |

---

## 3. Navigation & UI Placement

### 3.1 Admin Sidebar (Settings)

```
Settings
└── Intake Forms
    ├── Form Builder       (create / edit / publish)
    ├── Submissions Inbox  (received forms + processing)
    └── Templates          (prebuilt + facility templates)
```

### 3.2 Category Tabs (Filter/View)

- Intake Forms (new clients)
- Pet Profile Forms (per pet)
- Customer Profile Forms (per owner)
- Service Forms (per service type)
- Internal Forms (staff-only)

---

## 4. Data Model

### 4.1 Form

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `facility_id` | uuid | |
| `name` | string | |
| `type` | enum | `intake` / `pet` / `customer` / `service` / `internal` |
| `status` | enum | `draft` / `published` / `archived` |
| `audience` | enum | `customer` / `staff` / `both` |
| `applies_to` | json | Pet types, service types, locations |
| `settings` | json | Theme color, welcome message, submit message |

### 4.2 FormVersion

| Field | Type | Notes |
|-------|------|-------|
| `version_id` | uuid | |
| `form_id` | uuid | FK → Form |
| `version_number` | int | |
| `published_at` | timestamp | |
| `created_by` | uuid | |

> Immutable once published. Editing creates a new version.

### 4.3 Section

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `form_version_id` | uuid | FK → FormVersion |
| `title` | string | |
| `description` | string | Optional |
| `order` | int | |

### 4.4 Field (Question)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `section_id` | uuid | FK → Section |
| `label` | string | |
| `help_text` | string | Optional |
| `field_type` | enum | See supported types below |
| `required` | bool | |
| `visibility` | enum | `customer` / `staff` |
| `applies_to_pet_type` | string[] | Optional filter |
| `default_value` | json | Optional |
| `validation_rules` | json | min/max, regex, allowed file types |
| `mapping_target` | string | Profile field path (see Section 9) |

**Supported Field Types:**

- Yes/No
- Short text
- Long text
- Dropdown (single select)
- Radio buttons (single select)
- Checkboxes (multi select)
- Date
- Number
- File upload (vaccine proof, photo, documents)
- Signature (consent/waiver)
- Contact fields (email / phone)
- Address block

### 4.5 Option

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `field_id` | uuid | FK → Field |
| `label` | string | |
| `value` | string | |
| `order` | int | |

### 4.6 LogicRule (Conditional Branching)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `form_version_id` | uuid | FK → FormVersion |
| `trigger_field_id` | uuid | FK → Field |
| `operator` | enum | `=`, `!=`, `contains`, `>`, `<`, `answered`, `not_answered` |
| `value(s)` | json | Comparison value(s) |
| `action` | enum | `show` / `hide` / `require` / `skip_to_section` / `end_form` / `set_tag` / `set_status` |
| `target_field_ids` | uuid[] | Fields affected |
| `target_section_id` | uuid | Section affected (for skip/end) |

### 4.7 Submission

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `form_version_id` | uuid | FK → FormVersion |
| `facility_id` | uuid | |
| `location_id` | uuid | Optional |
| `status` | enum | `unread` / `read` / `processed` / `archived` |
| `submitted_by` | uuid | Customer or staff user ID |
| `related_customer_id` | uuid | Nullable until matched |
| `related_pet_id` | uuid[] | Nullable, multi-pet supported |
| `related_booking_id` | uuid | Optional |
| `created_at` | timestamp | |
| `submitted_at` | timestamp | |
| `merge_decision` | json | Metadata about merge choices |

### 4.8 Answer

| Field | Type | Notes |
|-------|------|-------|
| `submission_id` | uuid | FK → Submission |
| `field_id` | uuid | FK → Field |
| `value` | json | |
| `attachments` | json | Optional file references |

---

## 5. Form Builder (Admin Experience)

### 5.1 Creation Flow

1. Navigate to **Forms → + Create New**
2. Select:
   - Form type (Intake / Pet / Customer / Service / Internal)
   - Form name
   - Welcome message
   - Theme color (optional)
3. Configure "Applies To":
   - Pet types (Dog / Cat / Other)
   - Service types (Boarding / Daycare / Grooming / Training / Custom)
   - Location(s) — if multi-location
4. Land in **Builder Canvas**

### 5.2 Builder Canvas Layout

| Area | Content |
|------|---------|
| **Left panel** | Sections + questions (drag/drop reorder) |
| **Right panel** | Selected question settings + logic rules |

**Per-question toggles:**
- Required
- Visible to customer vs staff only
- Save answer to profile vs keep only in submission

### 5.3 Conditional Logic Builder

Each question supports **"Add Logic"**:

```
IF [Question] [Operator] [Value]
THEN:
  - Show question(s)
  - Hide question(s)
  - Make question(s) required
  - Jump to section
  - End form early (with message)
  - Add tag to pet/customer
  - Trigger internal alert flag on submission
```

**Examples:**

| Trigger | Action |
|---------|--------|
| "Any allergies?" = Yes | Show "List allergies + symptoms" |
| "Ever bitten?" = Yes | Show "Describe circumstances" |
| Pet type = Cat | Show cat-specific section |
| Service type = Boarding | Show boarding-only section |

> Conditional logic based on **pet type**, **service type**, and **evaluation status** is a must-have.

### 5.4 Preview & Publish

**Preview modes:**
- Desktop / Mobile
- Customer view / Staff view

**Publishing behavior:**
- Publish creates `FormVersion` vX (immutable)
- Subsequent edits create a new draft version
- Old versions retained for audit/history

---

## 6. Customer Experience

### 6.1 Form Access Points

| Trigger | Description |
|---------|-------------|
| **Account creation** | Customer creates account → adds pet(s) → system checks facility rules for required forms → guided through form wizard (save & resume supported) |
| **Pet profile** | Pet profile → "Forms" tab showing required (incomplete), completed (view-only), and optional forms |
| **Share link** | Each published form gets a copyable link + embed code for website/social/email/text |

### 6.2 Authentication

- Logged-in user → open form directly
- Not logged in → magic link or verification code via email/SMS (configurable per facility)

### 6.3 Save / Resume / Edit Rules

- **Autosave** drafts in progress
- Customer can edit until submission
- Facility can optionally allow editing after submission (creates "resubmission version" with audit trail)

### 6.4 Multi-Pet Support

For Intake or Pet Forms:

| Option | Description | Recommendation |
|--------|-------------|----------------|
| Option 1 | One submission covers multiple pets (repeatable pet blocks) | Flexible |
| **Option 2** | One form per pet | **Recommended** — cleaner mapping |

---

## 7. Submissions Inbox

### 7.1 List View

**Columns:**
- Submitted at
- Form name
- Customer name (if matched)
- Pet name(s) (if provided)
- Status (Unread / Read / Processed)
- Flags (file upload present, red-alert answers, missing required fields)

**Filters:**
- Status: All / Unread / Read / Processed
- By form
- By date range
- By location

### 7.2 Submission Detail View

**Layout:**

| Area | Content |
|------|---------|
| **Left** | Submission answers displayed in form layout |
| **Right** | Matching panel — match by email/phone (customer), match pets by name + breed + DOB |

**Processing Actions:**

1. **Create New Profile** — Creates customer + pet record(s)
2. **Match Existing + Merge** — Shows merge diff:
   - New fields to add
   - Conflicts (existing vs submitted)

**Merge conflict rules** (facility-configurable default):

| Rule | Behavior |
|------|----------|
| Submitted overrides existing | New data always wins |
| Existing wins | Keep current profile data |
| Ask on conflict | Staff decides per submission |

**Post-processing options:**
- Mark as Processed
- Create booking request / add to waitlist
- Trigger tasks/alerts

---

## 8. UX Guidelines

### 8.1 Builder UX

- Ship with **starter templates**: new client intake, pet profile basics, boarding intake, grooming consent, behavior evaluation
- Allow duplicating templates and editing
- Builder must feel lightweight:
  - Drag/drop reorder
  - Inline edit question text
  - Right-side settings panel
  - Logic rules displayed in plain language (e.g., "If X = Yes → Show Y")

### 8.2 Customer-Facing Forms

- **Mobile-first** design
- Progress indicator
- Save & resume
- Friendly validation messages

---

## 9. Answer Mapping & Storage

### 9.1 Immutable Storage

Every submission is stored as a **full snapshot** (immutable) for audit and compliance — regardless of field mapping.

### 9.2 Configurable Mapping Targets (Per Field)

Each question can optionally map to:

| Target | Examples |
|--------|----------|
| **Customer profile field** | Phone, address, emergency contact |
| **Pet profile field** | Breed, weight, birthday, behavior flags, vet info |
| **Medical / vaccine area** | Including file uploads |
| **Notes** | Customer notes, pet notes, booking notes (if submission is booking-linked) |
| **Tags** | Apply tags based on answers (behavior/medical alerts) |

> Mapping must be configurable per field in the builder UI.

---

## 10. Booking & Operations Integration

### 10.1 Form Requirements (Per Service, Configurable)

Facilities can require specific forms:
- Before a customer can **request** a booking
- Before staff can **approve** a booking
- Before **check-in**

**If forms are missing:**
- Block the booking step, **OR**
- Allow but show "incomplete requirements" banner

### 10.2 Automation Hooks

Forms must emit events for the automation builder:

| Event | Trigger |
|-------|---------|
| `form.link_sent` | Share link distributed |
| `form.started` | Customer begins form |
| `form.submitted` | Form submitted |
| `form.incomplete_deadline` | Form not completed by deadline |
| `form.red_flag` | Submission contains flagged answer (based on logic rules) |

> Must integrate with existing automation patterns (communications-hub triggers, facility-notifications).

---

## 11. Permissions & Roles

| Role | Capabilities |
|------|-------------|
| **Admin / Manager** | Create/edit/publish forms, configure mapping + logic, view all submissions |
| **Staff** | View submissions (permission-based), process submissions (create/merge) if allowed, fill forms on behalf of customer (staff-assisted intake) |
| **Customer** | View/submit forms they are allowed to access |

---

## 12. Notifications

### 12.1 Staff Notifications (Configurable)

- New submission received
- Submission has red-flag answers
- Submission includes file upload

### 12.2 Customer Notifications (Configurable)

- Submission confirmed
- Missing required forms reminder
- Form rejected / needs correction (optional workflow)

---

## 13. Audit & Compliance

**Non-negotiable.** Every change must be logged:

- Form version publish history
- Submission timestamps
- Staff edits to mapped profile data
- Merge decisions + what was overridden

---

## 14. Phase 2 (Plan Data Model Now)

| Feature | Notes |
|---------|-------|
| **Advanced conditional rules** | Reference pet attributes, service type, evaluation status, tags |
| **Intake scoring** | Approve / deny / needs review scoring system |
| **Multi-language** | Per-question translations (EN/FR) |
| **E-signatures** | Agreements + timestamps + IP/device metadata |
| **Payment capture** | Credit card as a form block (requires payments module tokenization) |

> Conditional fields referencing pet type, service type, and evaluation status are expected in system scope and should be planned in the data model from Phase 1.
