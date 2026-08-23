import type { Tables } from "@/types/database";

// ============================================================================
// Form rows -> what the screens read.
//
// ── A VERSION IS A SNAPSHOT, AND THE SCREENS SHOULD SAY SO ────────────────
//
// `FormRow` carries the form's identity; `FormVersionRow` carries the
// questions, and `published` on it is the difference between "still being
// written" and "frozen forever". A submission names a version, never a form,
// because the questions have to be reconstructable exactly.
//
// The fixture had this shape and did not honour it — `updateForm()` rewrote a
// published version in place. The types cannot prevent that; the trigger does.
// What these can do is stop a screen quietly rendering the CURRENT questions
// beside somebody's OLD answers, which is why `SubmissionRow` carries the
// version's schema rather than the form's.
// ============================================================================

export type FormStatus = "draft" | "published" | "archived";
export type FormAudience = "customer" | "staff" | "both";
export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "reviewed"
  | "flagged"
  | "archived";

export interface FormRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: FormStatus;
  audience: FormAudience;
  appliesTo: Record<string, unknown>;
  settings: Record<string, unknown>;
  repeatPerPet: boolean;
  requireAuth: boolean;
  createdAt: string;
  updatedAt: string;
  /** The newest published version, when the caller may see one. */
  publishedVersion: FormVersionRow | null;
  /** The newest unpublished version, for whoever is authoring it. */
  draftVersion: FormVersionRow | null;
  /** How many submissions name a version of this form. */
  submissionCount?: number;
}

export interface FormVersionRow {
  id: string;
  formId: string;
  versionNumber: number;
  /** Sections, fields, options and logic, as authored. */
  schema: Record<string, unknown>;
  /** Null while it is a draft. Once set, the row is frozen. */
  publishedAt: string | null;
  createdAt: string;
}

export interface SubmissionRow {
  id: string;
  formId: string | null;
  formVersionId: string;
  /** The version's own number, so a screen can say WHICH questions these are. */
  versionNumber: number | null;
  formName: string | null;
  /** The questions as they were when this was answered. */
  schema: Record<string, unknown> | null;
  clientId: string | null;
  clientRef: number | null;
  clientName: string | null;
  petId: string | null;
  /** Resolved by a second query — `pet_id` carries no FK, so it cannot embed. */
  petName: string | null;
  bookingId: string | null;
  status: SubmissionStatus;
  answers: Record<string, unknown>;
  staffAssisted: boolean;
  score: number | null;
  scoreOutcome: string | null;
  submittedBy: string | null;
  submittedAt: string;
}

export const FORM_SELECT =
  "id, name, slug, type, status, audience, applies_to, settings, repeat_per_pet, require_auth, created_at, updated_at";

export const VERSION_SELECT =
  "id, form_id, version_number, schema, published_at, created_at";

interface ClientEmbed {
  ref: number;
  name: string;
}

interface VersionEmbed {
  id: string;
  form_id: string;
  version_number: number;
  schema: unknown;
  published_at: string | null;
  created_at: string;
  forms?: { name: string } | { name: string }[] | null;
}

export type SubmissionRecord = Tables<"form_submissions"> & {
  // Both are TO-ONE relations, so PostgREST returns an object or null — not an
  // array. Reading a to-one as an array is what emptied the boarding board
  // once, so `one()` below tolerates either rather than trusting which.
  //
  // `pet_id` is NOT among them and cannot be: it carries no foreign key on
  // purpose (a pet may be removed and the answers stay), and PostgREST embeds
  // only what a constraint describes. Asking for one costs the whole select —
  // "Could not find a relationship between 'form_submissions' and 'pet_id'"
  // fails every route that shares this string, including submitting. Pet names
  // are resolved separately; see `resolvePetNames`.
  clients?: ClientEmbed | ClientEmbed[] | null;
  form_versions?: VersionEmbed | VersionEmbed[] | null;
};

export const SUBMISSION_SELECT =
  "id, form_id, form_version_id, client_id, pet_id, booking_id, status, answers, staff_assisted, score, score_outcome, submitted_by, submitted_at, clients:client_id(ref, name), form_versions:form_version_id(id, form_id, version_number, schema, published_at, created_at, forms:form_id(name))";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function toVersionRow(row: {
  id: string;
  form_id: string;
  version_number: number;
  schema: unknown;
  published_at: string | null;
  created_at: string;
}): FormVersionRow {
  return {
    id: row.id,
    formId: row.form_id,
    versionNumber: row.version_number,
    schema: asRecord(row.schema),
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

export function toFormRow(
  row: Tables<"forms">,
  versions: Tables<"form_versions">[] = [],
): FormRow {
  const mine = versions
    .filter((v) => v.form_id === row.id)
    .sort((a, b) => b.version_number - a.version_number);

  const published = mine.find((v) => v.published_at !== null) ?? null;
  const draft = mine.find((v) => v.published_at === null) ?? null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    status: row.status as FormStatus,
    audience: row.audience as FormAudience,
    appliesTo: asRecord(row.applies_to),
    settings: asRecord(row.settings),
    repeatPerPet: row.repeat_per_pet,
    requireAuth: row.require_auth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedVersion: published ? toVersionRow(published) : null,
    draftVersion: draft ? toVersionRow(draft) : null,
  };
}

export function toSubmissionRow(
  row: SubmissionRecord,
  petNames?: Map<string, string>,
): SubmissionRow {
  const client = one(row.clients);
  const version = one(row.form_versions);
  const form = version ? one(version.forms) : null;

  return {
    id: row.id,
    formId: row.form_id,
    formVersionId: row.form_version_id,
    versionNumber: version?.version_number ?? null,
    formName: form?.name ?? null,
    // The questions AS ANSWERED. A screen showing the form's current questions
    // beside these answers would be showing a different form.
    schema: version ? asRecord(version.schema) : null,
    clientId: row.client_id,
    clientRef: client?.ref ?? null,
    clientName: client?.name ?? null,
    petId: row.pet_id,
    petName: row.pet_id ? (petNames?.get(row.pet_id) ?? null) : null,
    bookingId: row.booking_id,
    status: row.status as SubmissionStatus,
    answers: asRecord(row.answers),
    staffAssisted: row.staff_assisted,
    score: row.score === null ? null : Number(row.score),
    scoreOutcome: row.score_outcome,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
  };
}
