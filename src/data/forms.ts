/**
 * Form system: definitions, templates, conditions, and field mapping.
 * Facility-scoped; used by Form Builder, public fill, and submission processing.
 */

export type FormType =
  | "intake"
  | "pet"
  | "owner"
  | "service"
  | "internal";

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
  | "signature";

export type ConditionOperator = "eq" | "neq" | "contains" | "in";

export type ContextField = "petType" | "serviceType" | "evaluationStatus";

export interface FormCondition {
  /** Answer to check (when condition is based on another question) */
  questionId?: string;
  /** When set, condition is evaluated against submission context */
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
}

export interface FieldMappingItem {
  questionId: string;
  target: string; // e.g. "customer.name", "pet.breed", "notes"
}

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
  repeatPerPet?: boolean;
  createdAt: string;
  updatedAt: string;
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

// In-memory store (would be DB in production)
let forms: Form[] = [];
let formTemplates: FormTemplate[] = [];

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Evaluate whether a question should be shown given current answers and context */
export function shouldShowQuestion(
  question: FormQuestion,
  answers: Record<string, unknown>,
  context?: { petType?: string; serviceType?: string; evaluationStatus?: string }
): boolean {
  if (!question.condition) return true;

  const c = question.condition;
  let sourceValue: unknown;

  if (c.contextField && context) {
    sourceValue = context[c.contextField];
  } else if (c.questionId) {
    sourceValue = answers[c.questionId];
  } else {
    return true;
  }

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
      const val = sourceValue;
      return arr.some((t) => val === t || String(val) === String(t));
    }
    default:
      return true;
  }
}

// Forms CRUD
export function getFormsByFacility(facilityId: number): Form[] {
  return forms.filter((f) => f.facilityId === facilityId);
}

export function getFormById(id: string): Form | undefined {
  return forms.find((f) => f.id === id);
}

export function getFormBySlug(slug: string): Form | undefined {
  return forms.find((f) => f.slug === slug && !f.internal);
}

export function createForm(
  input: Omit<Form, "id" | "createdAt" | "updatedAt">
): Form {
  const now = new Date().toISOString();
  const id = generateId("form");
  let slug = input.slug || slugify(input.name);
  let attempt = 0;
  while (forms.some((f) => f.slug === slug)) {
    attempt++;
    slug = `${slugify(input.name)}-${attempt}`;
  }
  const form: Form = {
    ...input,
    id,
    slug,
    createdAt: now,
    updatedAt: now,
  };
  forms.push(form);
  return form;
}

export function updateForm(
  id: string,
  input: Partial<Omit<Form, "id" | "facilityId" | "createdAt">>
): Form | null {
  const idx = forms.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const updated = {
    ...forms[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  forms[idx] = updated;
  return updated;
}

export function deleteForm(id: string): boolean {
  const idx = forms.findIndex((f) => f.id === id);
  if (idx === -1) return false;
  forms.splice(idx, 1);
  return true;
}

export function duplicateForm(id: string, facilityId: number): Form | null {
  const existing = getFormById(id);
  if (!existing) return null;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
  return createForm({
    ...rest,
    facilityId,
    name: `${existing.name} (Copy)`,
    slug: "",
  });
}

// Templates CRUD
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
  const updated = {
    ...formTemplates[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  formTemplates[idx] = updated;
  return updated;
}

export function deleteTemplate(id: string): boolean {
  const idx = formTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  formTemplates.splice(idx, 1);
  return true;
}

// Seed a few forms and templates for facility 11 (demo)
const now = new Date().toISOString();
const seedForm: Form = {
  id: "form-intake-demo",
  facilityId: 11,
  name: "New Client Intake",
  slug: "new-client-intake",
  type: "intake",
  internal: false,
  questions: [
    {
      id: "q1",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: "Your full name",
    },
    {
      id: "q2",
      type: "text",
      label: "Email",
      required: true,
      placeholder: "email@example.com",
    },
    {
      id: "q3",
      type: "textarea",
      label: "How did you hear about us?",
      required: false,
    },
  ],
  fieldMapping: [
    { questionId: "q1", target: "customer.name" },
    { questionId: "q2", target: "customer.email" },
  ],
  createdAt: now,
  updatedAt: now,
};

const seedTemplate: FormTemplate = {
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
};

forms = [seedForm];
formTemplates = [seedTemplate];
