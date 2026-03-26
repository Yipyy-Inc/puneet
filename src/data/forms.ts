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
  /** Phase 2: scoring for intake (approve/deny/needs review). See forms-phase2-types. */
  scoring?: import("./forms-phase2-types").FormScoringConfig;
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
  repeatPerPet?: boolean;
  requireAuth?: boolean;
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
  mappingTarget?: string;
  order: number;
  /** Phase 2: multi-language labels. See forms-phase2-types. */
  labelI18n?: Partial<Record<import("./forms-phase2-types").SupportedFormLocale, string>>;
  /** Phase 2: payment block (when tokenization supported). */
  paymentConfig?: import("./forms-phase2-types").FormPaymentBlockConfig;
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
  /** Phase 2: trigger from pet attribute, tag, service type, or evaluation status. See LogicRuleTriggerPhase2. */
  triggerSource?: import("./forms-phase2-types").LogicRuleTriggerPhase2["triggerSource"];
  petAttribute?: import("./forms-phase2-types").PetAttributeCondition;
  tagId?: string;
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

export type ConditionOperator = "eq" | "neq" | "contains" | "in" | "gt" | "lt" | "answered" | "not_answered";

export type ContextField = "petType" | "serviceType" | "evaluationStatus";

export interface FormCondition {
  questionId?: string;
  contextField?: ContextField;
  operator: ConditionOperator;
  value: string | string[];
  /** Phase 2: condition on pet attribute (e.g. pet.breed, pet.hasTag). See forms-phase2-types. */
  sourceType?: import("./forms-phase2-types").ConditionSourceType;
  petAttribute?: import("./forms-phase2-types").PetAttributeCondition;
  tagId?: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  condition?: FormCondition;
  visibility?: "customer" | "staff";
  sectionId?: string;
  helpText?: string;
  defaultValue?: string;
  appliesToPetType?: string;
  validation?: FieldValidation;
  /** Phase 2: multi-language (EN/FR). See FormQuestionI18n in forms-phase2-types. */
  labelI18n?: Partial<Record<import("./forms-phase2-types").SupportedFormLocale, string>>;
  placeholderI18n?: Partial<Record<import("./forms-phase2-types").SupportedFormLocale, string>>;
  /** Phase 2: payment block config (when payments module supports tokenization). */
  paymentConfig?: import("./forms-phase2-types").FormPaymentBlockConfig;
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

export type LogicActionType = "show" | "hide" | "require" | "skip_to_section" | "end_form" | "set_tag" | "alert_flag";

export interface FormLogicRule {
  id: string;
  triggerQuestionId: string;
  operator: ConditionOperator;
  value?: string | string[];
  action: LogicActionType;
  targetQuestionIds?: string[];
  targetSectionId?: string;
  tagValue?: string;
  endMessage?: string;
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
  /** Logic rules (builder): IF trigger question answer THEN action on targets */
  logicRules?: FormLogicRule[];
  /** Sections (builder); when present, each question should have sectionId */
  sections?: FormSectionDTO[];
  repeatPerPet?: boolean;
  requireAuth?: boolean;
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
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      appliesToPetType: f.appliesToPetType,
      validation: f.validation,
      visibility: f.visibility,
      sectionId: f.sectionId,
      labelI18n: f.labelI18n,
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

  // Convert LogicRuleRecords to flat FormLogicRules
  const versionLogicRules = version
    ? logicRules.filter((r) => r.formVersionId === version.id)
    : [];
  const flatLogicRules: FormLogicRule[] = versionLogicRules.map((r) => ({
    id: r.id,
    triggerQuestionId: r.triggerFieldId,
    operator: r.operator as ConditionOperator,
    value: r.value,
    action: r.action as LogicActionType,
    targetQuestionIds: r.targetFieldIds,
    targetSectionId: r.targetSectionId,
    tagValue: r.tagId,
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
    logicRules: flatLogicRules.length ? flatLogicRules : undefined,
    sections: sections.length ? sections : undefined,
    repeatPerPet: record.repeatPerPet,
    requireAuth: record.requireAuth,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
    audience: record.audience,
    appliesTo: record.appliesTo,
    settings: record.settings,
  };
}

/** Phase 2 extended context for conditions (pet attributes, tags, etc.) */
export interface ConditionContext {
  petType?: string;
  serviceType?: string;
  evaluationStatus?: string;
  petAttributes?: {
    breed?: string;
    type?: string;
    age?: number;
    weight?: number;
    gender?: string;
    tags?: string[];
  };
  customerTags?: string[];
}

/** Resolve source value from a condition, supporting Phase 2 sourceType/petAttribute/tag. */
function resolveConditionSource(
  c: FormCondition,
  answers: Record<string, unknown>,
  context?: ConditionContext,
): unknown {
  // Phase 2: explicit sourceType
  if (c.sourceType === "petAttribute" && c.petAttribute && context?.petAttributes) {
    const attr = c.petAttribute;
    if (attr === "pet.breed") return context.petAttributes.breed;
    if (attr === "pet.type") return context.petAttributes.type;
    if (attr === "pet.age") return context.petAttributes.age;
    if (attr === "pet.weight") return context.petAttributes.weight;
    if (attr === "pet.gender") return context.petAttributes.gender;
    if (attr === "pet.hasTag") return context.petAttributes.tags?.includes(String(c.value)) ? "true" : "false";
  }
  if (c.sourceType === "tag" && c.tagId) {
    const allTags = [...(context?.petAttributes?.tags ?? []), ...(context?.customerTags ?? [])];
    return allTags.includes(c.tagId) ? "true" : "false";
  }
  if (c.sourceType === "serviceType" && context?.serviceType) return context.serviceType;
  if (c.sourceType === "evaluationStatus" && context?.evaluationStatus) return context.evaluationStatus;
  // Legacy: contextField or questionId
  if (c.contextField && context) return context[c.contextField];
  if (c.questionId) return answers[c.questionId];
  return undefined;
}

/** Evaluate whether a question should be shown (legacy condition or LogicRule) */
export function shouldShowQuestion(
  question: FormQuestion,
  answers: Record<string, unknown>,
  context?: ConditionContext
): boolean {
  if (!question.condition) return true;
  const c = question.condition;
  const sourceValue = resolveConditionSource(c, answers, context);
  if (sourceValue === undefined) return true;
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
    case "gt":
      return Number(sourceValue) > Number(target);
    case "lt":
      return Number(sourceValue) < Number(target);
    case "answered":
      return sourceValue !== undefined && sourceValue !== "" && sourceValue !== null;
    case "not_answered":
      return sourceValue === undefined || sourceValue === "" || sourceValue === null;
    default:
      return true;
  }
}

/** Evaluate all logic rules for a form against current answers.
 *  Returns a map of effects: { hiddenQuestionIds, requiredQuestionIds, skipToSectionId, endFormMessage, tags, alertFlag } */
export interface LogicRuleEffects {
  hiddenQuestionIds: Set<string>;
  requiredQuestionIds: Set<string>;
  skipToSectionId?: string;
  endFormMessage?: string;
  tags: string[];
  alertFlag: boolean;
}

export function evaluateLogicRules(
  rules: FormLogicRule[],
  answers: Record<string, unknown>,
  context?: ConditionContext,
): LogicRuleEffects {
  const effects: LogicRuleEffects = {
    hiddenQuestionIds: new Set(),
    requiredQuestionIds: new Set(),
    tags: [],
    alertFlag: false,
  };
  for (const rule of rules) {
    // Phase 2: resolve from context if triggerSource is set
    let sourceValue: unknown;
    const ts = (rule as unknown as Record<string, unknown>).triggerSource as string | undefined;
    if (ts === "petAttribute" && context?.petAttributes) {
      const attr = (rule as unknown as Record<string, unknown>).petAttribute as string | undefined;
      if (attr === "pet.breed") sourceValue = context.petAttributes.breed;
      else if (attr === "pet.type") sourceValue = context.petAttributes.type;
      else if (attr === "pet.age") sourceValue = context.petAttributes.age;
      else if (attr === "pet.weight") sourceValue = context.petAttributes.weight;
      else if (attr === "pet.gender") sourceValue = context.petAttributes.gender;
      else if (attr === "pet.hasTag") sourceValue = context.petAttributes.tags?.includes(String(rule.value)) ? "true" : "false";
    } else if (ts === "tag") {
      const tagId = (rule as unknown as Record<string, unknown>).tagId as string | undefined;
      const allTags = [...(context?.petAttributes?.tags ?? []), ...(context?.customerTags ?? [])];
      sourceValue = tagId && allTags.includes(tagId) ? "true" : "false";
    } else if (ts === "serviceType") {
      sourceValue = context?.serviceType;
    } else if (ts === "evaluationStatus") {
      sourceValue = context?.evaluationStatus;
    } else {
      sourceValue = answers[rule.triggerQuestionId];
    }
    const target = rule.value;
    let matches = false;
    switch (rule.operator) {
      case "eq": matches = sourceValue === target || String(sourceValue) === String(target); break;
      case "neq": matches = sourceValue !== target && String(sourceValue) !== String(target); break;
      case "contains": {
        const s = Array.isArray(sourceValue) ? sourceValue.join(" ") : String(sourceValue ?? "");
        matches = s.toLowerCase().includes(String(target).toLowerCase());
        break;
      }
      case "in": {
        const arr = Array.isArray(target) ? target : [target];
        matches = arr.some((t) => sourceValue === t || String(sourceValue) === String(t));
        break;
      }
      case "gt": matches = Number(sourceValue) > Number(target); break;
      case "lt": matches = Number(sourceValue) < Number(target); break;
      case "answered": matches = sourceValue !== undefined && sourceValue !== "" && sourceValue !== null; break;
      case "not_answered": matches = sourceValue === undefined || sourceValue === "" || sourceValue === null; break;
    }
    if (!matches) continue;
    switch (rule.action) {
      case "show":
        // Show is the default; no-op since questions are visible by default
        break;
      case "hide":
        rule.targetQuestionIds?.forEach((id) => effects.hiddenQuestionIds.add(id));
        break;
      case "require":
        rule.targetQuestionIds?.forEach((id) => effects.requiredQuestionIds.add(id));
        break;
      case "skip_to_section":
        if (rule.targetSectionId) effects.skipToSectionId = rule.targetSectionId;
        break;
      case "end_form":
        effects.endFormMessage = rule.endMessage || "This form has ended based on your responses.";
        break;
      case "set_tag":
        if (rule.tagValue) effects.tags.push(rule.tagValue);
        break;
      case "alert_flag":
        effects.alertFlag = true;
        break;
    }
  }
  return effects;
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
    repeatPerPet: input.repeatPerPet,
    requireAuth: input.requireAuth,
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
      helpText: q.helpText ?? q.placeholder,
      fieldType: q.type === "textarea" ? "long_text" : q.type === "text" ? "short_text" : (q.type as FieldType),
      required: q.required,
      visibility: qq.visibility ?? "customer",
      defaultValue: q.defaultValue,
      appliesToPetType: q.appliesToPetType,
      validation: q.validation,
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
  // Persist logic rules
  if (input.logicRules?.length) {
    for (const rule of input.logicRules) {
      logicRules.push({
        id: rule.id || generateId("lr"),
        formVersionId: versionId,
        triggerFieldId: rule.triggerQuestionId,
        operator: rule.operator as LogicRuleOperator,
        value: rule.value,
        action: rule.action as LogicRuleAction,
        targetFieldIds: rule.targetQuestionIds,
        targetSectionId: rule.targetSectionId,
        tagId: rule.tagValue,
      });
    }
  }
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
    ...(input.repeatPerPet !== undefined && { repeatPerPet: input.repeatPerPet }),
    ...(input.requireAuth !== undefined && { requireAuth: input.requireAuth }),
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
    // Clear old logic rules for this version
    logicRules = logicRules.filter((r) => r.formVersionId !== version.id);
    // Persist new logic rules
    if (input.logicRules?.length) {
      for (const rule of input.logicRules) {
        logicRules.push({
          id: rule.id || generateId("lr"),
          formVersionId: version.id,
          triggerFieldId: rule.triggerQuestionId,
          operator: rule.operator as LogicRuleOperator,
          value: rule.value,
          action: rule.action as LogicRuleAction,
          targetFieldIds: rule.targetQuestionIds,
          targetSectionId: rule.targetSectionId,
          tagId: rule.tagValue,
        });
      }
    }

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
        helpText: q.helpText ?? q.placeholder,
        fieldType: q.type === "textarea" ? "long_text" : q.type === "text" ? "short_text" : (q.type as FieldType),
        required: q.required,
        visibility: qq.visibility ?? "customer",
        defaultValue: q.defaultValue,
        appliesToPetType: q.appliesToPetType,
        validation: q.validation,
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

/** Get version history for a form (newest first) */
export interface FormVersionSummary {
  versionId: string;
  versionNumber: number;
  publishedAt?: string;
  createdAt: string;
  createdBy?: string;
  questionCount: number;
}

export function getFormVersionHistory(formId: string): FormVersionSummary[] {
  return formVersions
    .filter((v) => v.formId === formId)
    .sort((a, b) => b.versionNumber - a.versionNumber)
    .map((v) => {
      const sectionIds = formSections.filter((s) => s.formVersionId === v.id).map((s) => s.id);
      const fieldCount = formFields.filter((f) => sectionIds.includes(f.sectionId)).length;
      return {
        versionId: v.id,
        versionNumber: v.versionNumber,
        publishedAt: v.publishedAt,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        questionCount: fieldCount,
      };
    });
}

export function archiveForm(id: string): Form | null {
  const idx = formRecords.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  formRecords[idx] = { ...formRecords[idx], status: "archived", updatedAt: new Date().toISOString() };
  return formRecordToFlatForm(formRecords[idx]);
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
/** Starter templates (facilityId 0) – ship with app; facilities duplicate and edit. */
export function getStarterTemplates(): FormTemplate[] {
  return formTemplates.filter((t) => t.facilityId === 0);
}

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

/** Create a new form from a template (starter or facility). Duplicate and edit flow. */
export function createFormFromTemplate(templateId: string, facilityId: number): Form | null {
  const template = formTemplates.find((t) => t.id === templateId);
  if (!template) return null;
  const secId = generateId("sec");
  const questions: FormQuestion[] = template.questions.map((q) => ({
    ...q,
    id: generateId("q"),
    sectionId: secId,
  }));
  const slug = slugify(template.name);
  return createForm({
    facilityId,
    name: template.name,
    slug: formRecords.some((f) => f.slug === slug) ? `${slug}-${Date.now().toString(36)}` : slug,
    type: template.formType,
    internal: false,
    sections: [{ id: secId, title: "Default", order: 0 }],
    questions,
    fieldMapping: [],
  });
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
  { id: "q1", sectionId: seedSecId, label: "Full name", fieldType: "short_text", required: true, order: 0, mappingTarget: "customer.name", labelI18n: { fr: "Nom complet" } },
  { id: "q2", sectionId: seedSecId, label: "Email", fieldType: "email", required: true, order: 1, mappingTarget: "customer.email", labelI18n: { fr: "Courriel" } },
  { id: "q3", sectionId: seedSecId, label: "How did you hear about us?", fieldType: "long_text", required: false, order: 2, labelI18n: { fr: "Comment avez-vous entendu parler de nous?" } },
];
formOptions = [];
logicRules = [];
// Starter templates (facilityId 0): ship with app; facilities duplicate and edit
const starterTpl = (id: string, name: string, formType: FormType, questions: FormQuestion[]) => ({
  id,
  facilityId: 0,
  name,
  formType,
  questions,
  createdAt: now,
  updatedAt: now,
});
formTemplates = [
  starterTpl("tpl-starter-new-client", "New client intake", "intake", [
    { id: "q1", type: "text", label: "Full name", required: true },
    { id: "q2", type: "email", label: "Email", required: true },
    { id: "q3", type: "phone", label: "Phone", required: false },
    { id: "q4", type: "textarea", label: "How did you hear about us?", required: false },
    { id: "q5", type: "textarea", label: "Anything else we should know?", required: false },
  ]),
  starterTpl("tpl-starter-pet-profile", "Pet profile basics", "pet", [
    { id: "q1", type: "text", label: "Pet name", required: true },
    { id: "q2", type: "text", label: "Species / type", required: true },
    { id: "q3", type: "text", label: "Breed", required: false },
    { id: "q4", type: "date", label: "Date of birth (approx. ok)", required: false },
    { id: "q5", type: "yes_no", label: "Spayed or neutered?", required: false },
    { id: "q6", type: "textarea", label: "Allergies or special needs", required: false },
  ]),
  starterTpl("tpl-starter-boarding", "Boarding intake", "service", [
    { id: "q1", type: "text", label: "Emergency contact name", required: true },
    { id: "q2", type: "phone", label: "Emergency contact phone", required: true },
    { id: "q2b", type: "textarea", label: "Feeding instructions", required: false },
    { id: "q3", type: "textarea", label: "Medication (if any)", required: false },
    { id: "q4", type: "yes_no", label: "Can we share space with other dogs?", required: false },
    { id: "q5", type: "textarea", label: "Behavior notes for staff", required: false },
  ]),
  starterTpl("tpl-starter-grooming", "Grooming consent", "service", [
    { id: "q1", type: "yes_no", label: "I consent to standard grooming procedures", required: true },
    { id: "q2", type: "textarea", label: "Sensitivities or areas to avoid", required: false },
    { id: "q3", type: "yes_no", label: "May we use photos for portfolio/social?", required: false },
  ]),
  starterTpl("tpl-starter-behavior", "Behavior evaluation", "pet", [
    { id: "q1", type: "yes_no", label: "Has your pet ever shown aggression to people?", required: true },
    { id: "q2", type: "yes_no", label: "Has your pet ever shown aggression to other animals?", required: true },
    { id: "q3", type: "textarea", label: "If yes, describe circumstances", required: false },
    { id: "q4", type: "textarea", label: "What does your pet enjoy most?", required: false },
    { id: "q5", type: "textarea", label: "Any triggers we should avoid?", required: false },
  ]),
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
