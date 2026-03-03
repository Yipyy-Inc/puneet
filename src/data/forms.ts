/**
 * Form system: core data model per spec.
 * Form -> FormVersion (immutable when published) -> Section -> Field -> Option
 * LogicRule for conditional branching. Backward-compat: flat Form/FormQuestion for existing UI.
 */

import { logFormVersionPublish } from "@/lib/form-audit";

// ----- Form (root) -----
export type FormType =
  | "intake"
  | "pet"
  | "owner"
  | "customer"
  | "service"
  | "internal";

export type FormStatus = "draft" | "published" | "archived";

export type FormAudience = "customer" | "staff" | "both";

export interface FormAppliesTo {
  petTypes?: string[]; // e.g. ["dog", "cat", "other"]
  serviceTypes?: string[];
  locationIds?: string[];
}

export interface FormSettings {
  themeColor?: string;
  welcomeMessage?: string;
  submitMessage?: string;
}

export interface FormRecord {
  id: string;
  facilityId: number;
  name: string;
  slug: string;
  type: FormType;
  status: FormStatus;
  audience: FormAudience;
  appliesTo?: FormAppliesTo;
  settings?: FormSettings;
  createdAt: string;
  updatedAt: string;
}

// ----- FormVersion (immutable once published) -----
export interface FormVersionRecord {
  id: string;
  formId: string;
  versionNumber: number;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
}

// ----- Section -----
export interface FormSectionRecord {
  id: string;
  formVersionId: string;
  title: string;
  description?: string;
  order: number;
}

// ----- Field (question) -----
export type FieldType =
  | "yes_no"
  | "short_text"
  | "long_text"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "date"
  | "number"
  | "file_upload"
  | "signature"
  | "phone"
  | "email"
  | "address";

export type FieldVisibility = "customer" | "staff";

export interface FieldValidation {
  min?: number;
  max?: number;
  regex?: string;
  allowedFileTypes?: string[];
}

export interface FormFieldRecord {
  id: string;
  sectionId: string;
  label: string;
  helpText?: string;
  fieldType: FieldType;
  required: boolean;
  visibility?: FieldVisibility;
  appliesToPetType?: string;
  defaultValue?: string;
  validation?: FieldValidation;
  mappingTarget?: string; // e.g. "customer.name", "pet.breed"
  order: number;
}

// ----- Option (for dropdown/radio/checkbox) -----
export interface FormOptionRecord {
  id: string;
  fieldId: string;
  label: string;
  value: string;
  order: number;
}

// ----- LogicRule (conditional branching) -----
export type LogicRuleOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "lt"
  | "answered"
  | "not_answered";

export type LogicRuleAction =
  | "show"
  | "hide"
  | "require"
  | "skip_to_section"
  | "end_form"
  | "set_tag"
  | "set_status";

export interface LogicRuleRecord {
  id: string;
  formVersionId: string;
  triggerFieldId: string;
  operator: LogicRuleOperator;
  value?: string | string[];
  action: LogicRuleAction;
  targetFieldIds?: string[];
  targetSectionId?: string;
}

// ----- Legacy / flat shape (backward compat for existing UI) -----
export type ServiceType =
  | "boarding"
  | "grooming"
  | "training"
  | "evaluation";

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "date"
  | "number"
  | "file"
  | "signature"
  | "yes_no"
  | "radio"
  | "phone"
  | "email"
  | "address";

export type ConditionOperator = "eq" | "neq" | "contains" | "in";

export type ContextField = "petType" | "serviceType" | "evaluationStatus";

export interface FormCondition {
  questionId?: string;
  contextField?: ContextField;
  operator: ConditionOperator;
  value: string | string[];
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  condition?: FormCondition;
  /** Customer vs staff only (builder UX) */
  visibility?: "customer" | "staff";
  /** Section this question belongs to (builder; required when form has sections) */
  sectionId?: string;
}

/** Section for builder and flat Form DTO */
export interface FormSectionDTO {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface FieldMappingItem {
  questionId: string;
  target: string;
}

/** Flat Form DTO: used by list page, public fill, and builder when editing "current" version as flat list */
export interface Form {
  id: string;
  facilityId: number;
  name: string;
  slug: string;
  type: FormType;
  serviceType?: ServiceType;
  templateId?: string;
  internal: boolean;
  questions: FormQuestion[];
  fieldMapping: FieldMappingItem[];
  /** Sections (builder); when present, each question should have sectionId */
  sections?: FormSectionDTO[];
  repeatPerPet?: boolean;
  createdAt: string;
  updatedAt: string;
  // New model fields (optional for backward compat)
  status?: FormStatus;
  audience?: FormAudience;
  appliesTo?: FormAppliesTo;
  settings?: FormSettings;
}

export interface FormTemplate {
  id: string;
  facilityId: number;
  name: string;
  formType: FormType;
  questions: FormQuestion[];
  createdAt: string;
  updatedAt: string;
}

// ----- In-memory stores -----
let formRecords: FormRecord[] = [];
let formVersions: FormVersionRecord[] = [];
let formSections: FormSectionRecord[] = [];
let formFields: FormFieldRecord[] = [];
let formOptions: FormOptionRecord[] = [];
let logicRules: LogicRuleRecord[] = [];
let formTemplates: FormTemplate[] = [];

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fieldTypeToQuestionType(ft: FieldType): QuestionType {
  const map: Record<FieldType, QuestionType> = {
    yes_no: "yes_no",
    short_text: "text",
    long_text: "textarea",
    dropdown: "select",
    radio: "radio",
    checkbox: "checkbox",
    date: "date",
    number: "number",
    file_upload: "file",
    signature: "signature",
    phone: "phone",
    email: "email",
    address: "address",
  };
  return map[ft] ?? "text";
}

/** Build flat Form from FormRecord + published version (or latest draft) for backward-compat */
function formRecordToFlatForm(record: FormRecord, versionId?: string): Form {
  const version = versionId
    ? formVersions.find((v) => v.id === versionId)
    : formVersions.filter((v) => v.formId === record.id).sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const sectionsOrdered = version
    ? formSections.filter((s) => s.formVersionId === version.id).sort((a, b) => a.order - b.order)
    : [];
  const sectionIds = sectionsOrdered.map((s) => s.id);
  const fields = formFields
    .filter((f) => sectionIds.includes(f.sectionId))
    .sort((a, b) => {
      const aSec = sectionsOrdered.findIndex((s) => s.id === a.sectionId);
      const bSec = sectionsOrdered.findIndex((s) => s.id === b.sectionId);
      if (aSec !== bSec) return aSec - bSec;
      return a.order - b.order;
    });
  const questions: FormQuestion[] = fields.map((f) => {
    const opts = formOptions.filter((o) => o.fieldId === f.id).sort((a, b) => a.order - b.order);
    return {
      id: f.id,
      type: fieldTypeToQuestionType(f.fieldType),
      label: f.label,
      required: f.required,
      options: opts.length ? opts.map((o) => ({ value: o.value, label: o.label })) : undefined,
      placeholder: f.helpText ?? undefined,
      visibility: f.visibility,
      sectionId: f.sectionId,
    };
  });
  const fieldMapping: FieldMappingItem[] = fields
    .filter((f) => f.mappingTarget)
    .map((f) => ({ questionId: f.id, target: f.mappingTarget! }));

  const sections: FormSectionDTO[] = sectionsOrdered.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    order: s.order,
  }));

  return {
    id: record.id,
    facilityId: record.facilityId,
    name: record.name,
    slug: record.slug,
    type: record.type,
    internal: record.audience === "staff",
    questions,
    fieldMapping,
    sections: sections.length ? sections : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
    audience: record.audience,
    appliesTo: record.appliesTo,
    settings: record.settings,
  };
}

/** Evaluate whether a question should be shown (legacy condition or LogicRule) */
export function shouldShowQuestion(
  question: FormQuestion,
  answers: Record<string, unknown>,
  context?: { petType?: string; serviceType?: string; evaluationStatus?: string }
): boolean {
  if (!question.condition) return true;
  const c = question.condition;
  let sourceValue: unknown;
  if (c.contextField && context) sourceValue = context[c.contextField];
  else if (c.questionId) sourceValue = answers[c.questionId];
  else return true;
  const target = c.value;
  const op = c.operator;
  switch (op) {
    case "eq":
      return sourceValue === target || String(sourceValue) === String(target);
    case "neq":
      return sourceValue !== target && String(sourceValue) !== String(target);
    case "contains": {
      const str = Array.isArray(sourceValue) ? sourceValue.join(" ") : String(sourceValue ?? "");
      return str.toLowerCase().includes(String(target).toLowerCase());
    }
    case "in": {
      const arr = Array.isArray(target) ? target : [target];
      return arr.some((t) => sourceValue === t || String(sourceValue) === String(t));
    }
    default:
      return true;
  }
}

// ----- Public API (backward compat: flat Form) -----
export function getFormsByFacility(facilityId: number): Form[] {
  return formRecords
    .filter((f) => f.facilityId === facilityId)
    .map((r) => formRecordToFlatForm(r));
}

export function getFormById(id: string): Form | undefined {
  const record = formRecords.find((f) => f.id === id);
  return record ? formRecordToFlatForm(record) : undefined;
}

export function getFormBySlug(slug: string): Form | undefined {
  const record = formRecords.find((f) => f.slug === slug && f.audience !== "staff" && f.status === "published");
  return record ? formRecordToFlatForm(record) : undefined;
}

/** Also resolve by slug for draft (e.g. preview); internal forms not returned */
export function getFormBySlugOrDraft(slug: string): Form | undefined {
  const record = formRecords.find((f) => f.slug === slug && f.audience !== "staff");
  return record ? formRecordToFlatForm(record) : undefined;
}

export function createForm(input: Omit<Form, "id" | "createdAt" | "updatedAt">): Form {
  const now = new Date().toISOString();
  const id = generateId("form");
  let slug = input.slug || slugify(input.name);
  let attempt = 0;
  while (formRecords.some((f) => f.slug === slug)) {
    attempt++;
    slug = `${slugify(input.name)}-${attempt}`;
  }
  const record: FormRecord = {
    id,
    facilityId: input.facilityId,
    name: input.name,
    slug,
    type: input.type,
    status: (input.status as FormStatus) ?? "draft",
    audience: input.internal ? "staff" : (input.audience ?? "customer"),
    appliesTo: input.appliesTo,
    settings: input.settings,
    createdAt: now,
    updatedAt: now,
  };
  formRecords.push(record);
  const versionId = generateId("ver");
  formVersions.push({
    id: versionId,
    formId: id,
    versionNumber: 1,
    createdAt: now,
  });
  const inputSections = input.sections?.length
    ? input.sections
    : [{ id: generateId("sec"), title: "Default", order: 0 }];
  const sectionIdToRecord = new Map<string, string>();
  inputSections.forEach((s, idx) => {
    const secId = s.id.startsWith("sec-") ? s.id : generateId("sec");
    sectionIdToRecord.set(s.id, secId);
    formSections.push({
      id: secId,
      formVersionId: versionId,
      title: s.title,
      description: s.description,
      order: idx,
    });
  });
  const firstSectionId = formSections.find((s) => s.formVersionId === versionId)?.id ?? sectionIdToRecord.get(inputSections[0].id)!;
  input.questions.forEach((q, i) => {
    const fieldId = q.id.startsWith("q-") ? q.id : generateId("f");
    const qq = q as FormQuestion & { visibility?: "customer" | "staff" };
    const resolvedSectionId = qq.sectionId && sectionIdToRecord.has(qq.sectionId)
      ? sectionIdToRecord.get(qq.sectionId)!
      : firstSectionId;
    const sectionOrder = formSections.findIndex((s) => s.id === resolvedSectionId);
    const fieldsInSection = input.questions.filter((oq) => {
      const osid = (oq as FormQuestion & { sectionId?: string }).sectionId;
      const orid = osid && sectionIdToRecord.has(osid) ? sectionIdToRecord.get(osid)! : firstSectionId;
      return orid === resolvedSectionId;
    });
    const orderInSection = fieldsInSection.indexOf(q);
    formFields.push({
      id: fieldId,
      sectionId: resolvedSectionId,
      label: q.label,
      helpText: q.placeholder,
      fieldType: q.type === "textarea" ? "long_text" : q.type === "text" ? "short_text" : (q.type as FieldType),
      required: q.required,
      visibility: qq.visibility ?? "customer",
      defaultValue: undefined,
      mappingTarget: input.fieldMapping.find((m) => m.questionId === q.id)?.target,
      order: orderInSection >= 0 ? orderInSection : i,
    });
    (q.options ?? []).forEach((o, j) => {
      formOptions.push({
        id: generateId("opt"),
        fieldId,
        label: o.label,
        value: o.value,
        order: j,
      });
    });
  });
  if (input.status === "published") {
    const v = formVersions.find((x) => x.id === versionId);
    if (v) {
      v.publishedAt = now;
      logFormVersionPublish({
        facilityId: record.facilityId,
        formId: id,
        formName: record.name,
        versionNumber: 1,
        versionId,
      });
    }
  }
  return formRecordToFlatForm(record, versionId);
}

export function updateForm(
  id: string,
  input: Partial<Omit<Form, "id" | "facilityId" | "createdAt">>
): Form | null {
  const idx = formRecords.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const record = formRecords[idx];
  const updatedRecord = {
    ...record,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.type !== undefined && { type: input.type }),
    ...(input.status !== undefined && { status: input.status as FormStatus }),
    ...(input.audience !== undefined && { audience: input.audience as FormAudience }),
    ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    ...(input.settings !== undefined && { settings: input.settings }),
    updatedAt: new Date().toISOString(),
  };
  formRecords[idx] = updatedRecord;
  const version = formVersions.filter((v) => v.formId === id).sort((a, b) => b.versionNumber - a.versionNumber)[0];
  if (input.status === "published" && version) {
    const publishedAt = new Date().toISOString();
    version.publishedAt = publishedAt;
    logFormVersionPublish({
      facilityId: updatedRecord.facilityId,
      formId: id,
      formName: updatedRecord.name,
      versionNumber: version.versionNumber,
      versionId: version.id,
    });
  }
  if (version && input.questions !== undefined) {
    const oldSectionIds = formSections.filter((s) => s.formVersionId === version.id).map((s) => s.id);
    const removedFieldIds = formFields.filter((f) => oldSectionIds.includes(f.sectionId)).map((f) => f.id);
    formFields = formFields.filter((f) => !oldSectionIds.includes(f.sectionId));
    formSections = formSections.filter((s) => s.formVersionId !== version.id);
    formOptions = formOptions.filter((o) => !removedFieldIds.includes(o.fieldId));

    const questions = input.questions;
    if (!questions) {
      return formRecordToFlatForm(updatedRecord);
    }

    const inputSections = input.sections?.length
      ? input.sections
      : [{ id: generateId("sec"), title: "Default", order: 0 }];
    const sectionIdToRecord = new Map<string, string>();
    inputSections.forEach((s, idx) => {
      const secId = s.id.startsWith("sec-") ? s.id : generateId("sec");
      sectionIdToRecord.set(s.id, secId);
      formSections.push({
        id: secId,
        formVersionId: version.id,
        title: s.title,
        description: s.description,
        order: idx,
      });
    });
    const firstSectionId = formSections.find((s) => s.formVersionId === version.id)?.id ?? sectionIdToRecord.get(inputSections[0].id)!;
    questions.forEach((q, i) => {
      const fieldId = q.id;
      const qq = q as FormQuestion & { visibility?: "customer" | "staff"; sectionId?: string };
      const resolvedSectionId = qq.sectionId && sectionIdToRecord.has(qq.sectionId)
        ? sectionIdToRecord.get(qq.sectionId)!
        : firstSectionId;
      const fieldsInThisSection = questions.filter((oq) => {
        const osid = (oq as FormQuestion & { sectionId?: string }).sectionId;
        const orid = osid && sectionIdToRecord.has(osid) ? sectionIdToRecord.get(osid)! : firstSectionId;
        return orid === resolvedSectionId;
      });
      const orderInSection = fieldsInThisSection.indexOf(q);
      formFields.push({
        id: fieldId,
        sectionId: resolvedSectionId,
        label: q.label,
        helpText: q.placeholder,
        fieldType: q.type === "textarea" ? "long_text" : q.type === "text" ? "short_text" : (q.type as FieldType),
        required: q.required,
        visibility: qq.visibility ?? "customer",
        mappingTarget: input.fieldMapping?.find((m) => m.questionId === q.id)?.target,
        order: orderInSection >= 0 ? orderInSection : i,
      });
      (q.options ?? []).forEach((o, j) => {
        formOptions.push({ id: generateId("opt"), fieldId, label: o.label, value: o.value, order: j });
      });
    });
  }
  return formRecordToFlatForm(updatedRecord);
}

export function deleteForm(id: string): boolean {
  const idx = formRecords.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  const versionIds = formVersions.filter((v) => v.formId === id).map((v) => v.id);
  const sectionIds = formSections.filter((s) => versionIds.includes(s.formVersionId)).map((s) => s.id);
  const removedFieldIds = formFields.filter((f) => sectionIds.includes(f.sectionId)).map((f) => f.id);
  formRecords.splice(idx, 1);
  formVersions = formVersions.filter((v) => v.formId !== id);
  formSections = formSections.filter((s) => !versionIds.includes(s.formVersionId));
  formFields = formFields.filter((f) => !sectionIds.includes(f.sectionId));
  formOptions = formOptions.filter((o) => !removedFieldIds.includes(o.fieldId));
  logicRules = logicRules.filter((r) => !versionIds.includes(r.formVersionId));
  return true;
}

export function duplicateForm(id: string, facilityId: number): Form | null {
  const existing = getFormById(id);
  if (!existing) return null;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
  return createForm({ ...rest, facilityId, name: `${existing.name} (Copy)`, slug: "" });
}

// ----- Templates -----
export function getTemplatesByFacility(facilityId: number): FormTemplate[] {
  return formTemplates.filter((t) => t.facilityId === facilityId);
}

export function getTemplateById(id: string): FormTemplate | undefined {
  return formTemplates.find((t) => t.id === id);
}

export function createTemplate(
  input: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">
): FormTemplate {
  const now = new Date().toISOString();
  const template: FormTemplate = {
    ...input,
    id: generateId("tpl"),
    createdAt: now,
    updatedAt: now,
  };
  formTemplates.push(template);
  return template;
}

export function updateTemplate(
  id: string,
  input: Partial<Omit<FormTemplate, "id" | "facilityId" | "createdAt">>
): FormTemplate | null {
  const idx = formTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  formTemplates[idx] = { ...formTemplates[idx], ...input, updatedAt: new Date().toISOString() };
  return formTemplates[idx];
}

export function deleteTemplate(id: string): boolean {
  const idx = formTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  formTemplates.splice(idx, 1);
  return true;
}

// ----- Seed (new model + legacy flat) -----
const now = new Date().toISOString();
const seedFormId = "form-intake-demo";
const seedVerId = "ver-intake-demo";
const seedSecId = "sec-intake-demo";
formRecords = [
  {
    id: seedFormId,
    facilityId: 11,
    name: "New Client Intake",
    slug: "new-client-intake",
    type: "intake",
    status: "published",
    audience: "customer",
    createdAt: now,
    updatedAt: now,
  },
];
formVersions = [{ id: seedVerId, formId: seedFormId, versionNumber: 1, publishedAt: now, createdAt: now }];
formSections = [{ id: seedSecId, formVersionId: seedVerId, title: "Default", order: 0 }];
formFields = [
  { id: "q1", sectionId: seedSecId, label: "Full name", fieldType: "short_text", required: true, order: 0, mappingTarget: "customer.name" },
  { id: "q2", sectionId: seedSecId, label: "Email", fieldType: "email", required: true, order: 1, mappingTarget: "customer.email" },
  { id: "q3", sectionId: seedSecId, label: "How did you hear about us?", fieldType: "long_text", required: false, order: 2 },
];
formOptions = [];
logicRules = [];
formTemplates = [
  {
    id: "tpl-intake-base",
    facilityId: 11,
    name: "Basic Intake",
    formType: "intake",
    questions: [
      { id: "q1", type: "text", label: "Full name", required: true },
      { id: "q2", type: "text", label: "Email", required: true },
      { id: "q3", type: "text", label: "Phone", required: false },
    ],
    createdAt: now,
    updatedAt: now,
  },
];
