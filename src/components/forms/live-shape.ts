import type { FormRow } from "@/lib/api/forms-live";
import type {
  FieldMappingItem,
  Form,
  FormAppliesTo,
  FormAudience,
  FormLogicRule,
  FormQuestion,
  FormSectionDTO,
  FormSettings,
  FormStatus,
  FormType,
} from "@/types/forms";

// ============================================================================
// A Postgres form, in the shape the builder and the list already speak.
//
// ── WHY A SHIM ────────────────────────────────────────────────────────────
//
// `FormBuilder` and the forms list are typed against the flat `Form`, which
// carries the definition inline as `questions` / `sections` / `logicRules` /
// `fieldMapping`. That is exactly what a version's `schema` holds, so the two
// map cleanly and neither screen has to be retyped in the same change that
// moves the data.
//
// ── WHICH VERSION A `Form` IS ─────────────────────────────────────────────
//
// The flat shape has no notion of versions, and the database's whole point is
// that it does. So: an author editing gets the DRAFT when there is one, and the
// published version otherwise — that is what the builder should be changing.
// Anyone else gets the published one.
//
// `versionOf` is exported so a caller can be explicit rather than relying on
// that default when it matters.
//
// ── `facilityId` IS A SENTINEL ────────────────────────────────────────────
//
// The flat type wants a number and Postgres has a uuid. Zero, never 11: 11 is
// the demo facility's legacy id, and stamping it would make another facility's
// form pass every `=== FACILITY_ID` filter it met. Zero matches nothing, so a
// surviving filter empties loudly rather than lying. The real scoping is the
// session's — `/api/forms` never takes a facility from the caller.
// ============================================================================

/** See the header — 0 means "ask the session", not "facility zero". */
export const NO_LEGACY_FACILITY_ID = 0;

function arrayFrom<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * The version a given caller should be looking at.
 *
 * `forAuthor` picks the open draft first, because that is the one an editor is
 * allowed to change — a published version is frozen by trigger, so handing the
 * builder one would produce a save that returns an error.
 */
export function versionOf(form: FormRow, forAuthor = false) {
  if (forAuthor && form.draftVersion) return form.draftVersion;
  return form.publishedVersion ?? form.draftVersion;
}

export function toFlatForm(row: FormRow, forAuthor = false): Form {
  const version = versionOf(row, forAuthor);
  const schema = version?.schema ?? {};

  return {
    id: row.id,
    facilityId: NO_LEGACY_FACILITY_ID,
    name: row.name,
    slug: row.slug,
    type: row.type as FormType,
    // The flat shape says "internal"; the row says who it is for. One fact.
    internal: row.audience === "staff",
    questions: arrayFrom<FormQuestion>(schema.questions),
    fieldMapping: arrayFrom<FieldMappingItem>(schema.fieldMapping),
    logicRules: arrayFrom<FormLogicRule>(schema.logicRules),
    sections: arrayFrom<FormSectionDTO>(schema.sections),
    repeatPerPet: row.repeatPerPet,
    requireAuth: row.requireAuth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status as FormStatus,
    audience: row.audience as FormAudience,
    appliesTo: row.appliesTo as FormAppliesTo,
    settings: row.settings as FormSettings,
  };
}

/**
 * The definition half, for saving.
 *
 * Only the four keys that make up the questions. The form's identity — name,
 * slug, status — travels separately, because changing a name must not open a
 * new version and changing a question must.
 */
export function schemaFromFlatForm(form: Form): Record<string, unknown> {
  return {
    questions: form.questions ?? [],
    sections: form.sections ?? [],
    logicRules: form.logicRules ?? [],
    fieldMapping: form.fieldMapping ?? [],
  };
}
