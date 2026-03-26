import { z } from "zod";

// ============================================================================
// Form Enums
// ============================================================================

export const formTypeEnum = z.enum([
  "intake",
  "pet",
  "owner",
  "customer",
  "service",
  "internal",
]);
export type FormType = z.infer<typeof formTypeEnum>;

export const formStatusEnum = z.enum(["draft", "published", "archived"]);
export type FormStatus = z.infer<typeof formStatusEnum>;

export const formAudienceEnum = z.enum(["customer", "staff", "both"]);
export type FormAudience = z.infer<typeof formAudienceEnum>;

export const fieldTypeEnum = z.enum([
  "yes_no",
  "short_text",
  "long_text",
  "dropdown",
  "radio",
  "checkbox",
  "date",
  "number",
  "file_upload",
  "signature",
  "phone",
  "email",
  "address",
]);
export type FieldType = z.infer<typeof fieldTypeEnum>;

export const fieldVisibilityEnum = z.enum(["customer", "staff"]);
export type FieldVisibility = z.infer<typeof fieldVisibilityEnum>;

export const questionTypeEnum = z.enum([
  "text",
  "textarea",
  "select",
  "multiselect",
  "checkbox",
  "date",
  "number",
  "file",
  "signature",
  "yes_no",
  "radio",
  "phone",
  "email",
  "address",
]);
export type QuestionType = z.infer<typeof questionTypeEnum>;

export const logicRuleOperatorEnum = z.enum([
  "eq",
  "neq",
  "contains",
  "gt",
  "lt",
  "answered",
  "not_answered",
]);
export type LogicRuleOperator = z.infer<typeof logicRuleOperatorEnum>;

export const logicRuleActionEnum = z.enum([
  "show",
  "hide",
  "require",
  "skip_to_section",
  "end_form",
  "set_tag",
  "set_status",
]);
export type LogicRuleAction = z.infer<typeof logicRuleActionEnum>;

export const conditionOperatorEnum = z.enum([
  "eq",
  "neq",
  "contains",
  "in",
  "gt",
  "lt",
  "answered",
  "not_answered",
]);
export type ConditionOperator = z.infer<typeof conditionOperatorEnum>;

export const logicActionTypeEnum = z.enum([
  "show",
  "hide",
  "require",
  "skip_to_section",
  "end_form",
  "set_tag",
  "alert_flag",
]);
export type LogicActionType = z.infer<typeof logicActionTypeEnum>;

export const contextFieldEnum = z.enum([
  "petType",
  "serviceType",
  "evaluationStatus",
]);
export type ContextField = z.infer<typeof contextFieldEnum>;

export const formServiceTypeEnum = z.enum([
  "boarding",
  "grooming",
  "training",
  "evaluation",
]);
export type FormServiceType = z.infer<typeof formServiceTypeEnum>;

// ============================================================================
// Submission Enums
// ============================================================================

export const formSubmissionStatusEnum = z.enum(["new", "processed", "merged"]);
export type FormSubmissionStatus = z.infer<typeof formSubmissionStatusEnum>;

export const submissionStatusEnum = z.enum([
  "unread",
  "read",
  "processed",
  "archived",
]);
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>;

// ============================================================================
// Audit Enums
// ============================================================================

export const formAuditActionEnum = z.enum([
  "form_version_published",
  "submission_received",
  "staff_profile_edit",
  "merge_decision",
]);
export type FormAuditAction = z.infer<typeof formAuditActionEnum>;

// ============================================================================
// Automation Event Enums
// ============================================================================

export const formAutomationEventTypeEnum = z.enum([
  "form_link_sent",
  "form_started",
  "form_submitted",
  "form_incomplete_by_deadline",
  "form_red_flag_answer",
]);
export type FormAutomationEventType = z.infer<
  typeof formAutomationEventTypeEnum
>;

// ============================================================================
// Permission Enums
// ============================================================================

export const formPermissionEnum = z.enum([
  "forms_create",
  "forms_edit",
  "forms_publish",
  "forms_configure_mapping",
  "forms_configure_logic",
  "forms_view_submissions",
  "forms_process_submissions",
  "forms_staff_assisted_intake",
]);
export type FormPermission = z.infer<typeof formPermissionEnum>;

// ============================================================================
// Requirements Enums
// ============================================================================

export const requirementStageEnum = z.enum([
  "before_booking",
  "before_approval",
  "before_checkin",
]);
export type RequirementStage = z.infer<typeof requirementStageEnum>;

// ============================================================================
// Phase 2 Enums
// ============================================================================

export const conditionSourceTypeEnum = z.enum([
  "question",
  "petAttribute",
  "serviceType",
  "evaluationStatus",
  "tag",
]);
export type ConditionSourceType = z.infer<typeof conditionSourceTypeEnum>;

export const petAttributeConditionEnum = z.enum([
  "pet.breed",
  "pet.type",
  "pet.age",
  "pet.weight",
  "pet.hasTag",
  "pet.gender",
]);
export type PetAttributeCondition = z.infer<typeof petAttributeConditionEnum>;

export const scoreOutcomeEnum = z.enum(["approve", "deny", "needs_review"]);
export type ScoreOutcome = z.infer<typeof scoreOutcomeEnum>;

export const supportedFormLocaleEnum = z.enum(["en", "fr"]);
export type SupportedFormLocale = z.infer<typeof supportedFormLocaleEnum>;

export const paymentFormBlockStatusEnum = z.literal("planned");
export type PaymentFormBlockStatus = z.infer<typeof paymentFormBlockStatusEnum>;

// ============================================================================
// Form Core Schemas
// ============================================================================

export const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  regex: z.string().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
});
export type FieldValidation = z.infer<typeof fieldValidationSchema>;

export const formAppliesToSchema = z.object({
  petTypes: z.array(z.string()).optional(),
  serviceTypes: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
});
export type FormAppliesTo = z.infer<typeof formAppliesToSchema>;

// ============================================================================
// Phase 2 Schemas
// ============================================================================

export const formScoringRuleSchema = z.object({
  id: z.string(),
  sourceFieldId: z.string().optional(),
  conditionOperator: z.enum(["eq", "neq", "contains", "in"]).optional(),
  conditionValue: z.union([z.string(), z.array(z.string())]).optional(),
  points: z.number(),
});
export type FormScoringRule = z.infer<typeof formScoringRuleSchema>;

export const formScoringConfigSchema = z.object({
  enabled: z.boolean(),
  thresholds: z
    .object({
      approveAbove: z.number().optional(),
      needsReviewAbove: z.number().optional(),
    })
    .optional(),
  rules: z.array(formScoringRuleSchema).optional(),
});
export type FormScoringConfig = z.infer<typeof formScoringConfigSchema>;

export const submissionScoreSchema = z.object({
  score: z.number(),
  outcome: scoreOutcomeEnum,
  details: z
    .array(z.object({ ruleId: z.string(), points: z.number() }))
    .optional(),
  computedAt: z.string(),
});
export type SubmissionScore = z.infer<typeof submissionScoreSchema>;

export const formQuestionI18nSchema = z.object({
  label: z.record(supportedFormLocaleEnum, z.string()).optional(),
  placeholder: z.record(supportedFormLocaleEnum, z.string()).optional(),
  options: z
    .record(z.string(), z.record(supportedFormLocaleEnum, z.string()))
    .optional(),
});
export type FormQuestionI18n = z.infer<typeof formQuestionI18nSchema>;

export const signatureMetadataSchema = z.object({
  signedAt: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceId: z.string().optional(),
  agreementText: z.string().optional(),
  timezone: z.string().optional(),
});
export type SignatureMetadata = z.infer<typeof signatureMetadataSchema>;

export const formPaymentBlockConfigSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  captureMode: z.enum(["capture", "authorize_only"]).optional(),
});
export type FormPaymentBlockConfig = z.infer<
  typeof formPaymentBlockConfigSchema
>;

export const paymentAnswerValueSchema = z.object({
  paymentIntentId: z.string().optional(),
  token: z.string().optional(),
  last4: z.string().optional(),
  brand: z.string().optional(),
  capturedAt: z.string().optional(),
});
export type PaymentAnswerValue = z.infer<typeof paymentAnswerValueSchema>;

export const formConditionPhase2Schema = z.object({
  questionId: z.string().optional(),
  contextField: contextFieldEnum.optional(),
  sourceType: conditionSourceTypeEnum.optional(),
  petAttribute: petAttributeConditionEnum.optional(),
  tagId: z.string().optional(),
  operator: z.enum(["eq", "neq", "contains", "in"]),
  value: z.union([z.string(), z.array(z.string())]),
});
export type FormConditionPhase2 = z.infer<typeof formConditionPhase2Schema>;

export interface LogicRuleTriggerPhase2 {
  triggerSource?:
    | "field"
    | "petAttribute"
    | "tag"
    | "serviceType"
    | "evaluationStatus";
  petAttribute?: PetAttributeCondition;
  tagId?: string;
}

// ============================================================================
// Form Settings
// ============================================================================

export interface FormSettings {
  themeColor?: string;
  welcomeMessage?: string;
  submitMessage?: string;
  scoring?: FormScoringConfig;
}

// ============================================================================
// Form Record Schemas
// ============================================================================

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

export interface FormVersionRecord {
  id: string;
  formId: string;
  versionNumber: number;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface FormSectionRecord {
  id: string;
  formVersionId: string;
  title: string;
  description?: string;
  order: number;
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
  labelI18n?: Partial<Record<SupportedFormLocale, string>>;
  paymentConfig?: FormPaymentBlockConfig;
}

export interface FormOptionRecord {
  id: string;
  fieldId: string;
  label: string;
  value: string;
  order: number;
}

export interface LogicRuleRecord {
  id: string;
  formVersionId: string;
  triggerFieldId: string;
  operator: LogicRuleOperator;
  value?: string | string[];
  action: LogicRuleAction;
  targetFieldIds?: string[];
  targetSectionId?: string;
  triggerSource?: LogicRuleTriggerPhase2["triggerSource"];
  petAttribute?: PetAttributeCondition;
  tagId?: string;
}

// ============================================================================
// Legacy / Flat Form Schemas (backward compat for existing UI)
// ============================================================================

export interface FormCondition {
  questionId?: string;
  contextField?: ContextField;
  operator: ConditionOperator;
  value: string | string[];
  sourceType?: ConditionSourceType;
  petAttribute?: PetAttributeCondition;
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
  labelI18n?: Partial<Record<SupportedFormLocale, string>>;
  placeholderI18n?: Partial<Record<SupportedFormLocale, string>>;
  paymentConfig?: FormPaymentBlockConfig;
}

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

export interface Form {
  id: string;
  facilityId: number;
  name: string;
  slug: string;
  type: FormType;
  serviceType?: FormServiceType;
  templateId?: string;
  internal: boolean;
  questions: FormQuestion[];
  fieldMapping: FieldMappingItem[];
  logicRules?: FormLogicRule[];
  sections?: FormSectionDTO[];
  repeatPerPet?: boolean;
  requireAuth?: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface FormVersionSummary {
  versionId: string;
  versionNumber: number;
  publishedAt?: string;
  createdBy?: string;
  createdAt: string;
  questionCount: number;
}

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

// ============================================================================
// Submission Schemas
// ============================================================================

export interface FormSubmissionContext {
  petType?: string;
  serviceType?: string;
  evaluationStatus?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  facilityId: number;
  status: FormSubmissionStatus;
  context?: FormSubmissionContext;
  answers: Record<string, unknown>;
  petIds?: number[];
  customerId?: number;
  submitterEmail?: string;
  submitterName?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  staffAssisted?: boolean;
  staffAssistantId?: string | number;
  staffAssistantName?: string;
}

export interface SubmissionRecord {
  id: string;
  formVersionId: string;
  formId: string;
  facilityId: number;
  locationId?: string;
  status: SubmissionStatus;
  submittedBy?: string;
  relatedCustomerId?: number;
  relatedPetId?: number;
  relatedBookingId?: number;
  createdAt: string;
  submittedAt?: string;
  mergeDecision?: Record<string, unknown>;
  staffAssisted?: boolean;
  staffAssistantId?: string | number;
  staffAssistantName?: string;
  score?: number;
  scoreOutcome?: ScoreOutcome;
  scoreDetails?: SubmissionScore["details"];
}

export interface AnswerRecord {
  submissionId: string;
  fieldId: string;
  value: unknown;
  attachments?: string[];
  signatureMetadata?: SignatureMetadata;
}

export interface SubmissionListFilters {
  status?: SubmissionStatus | "all";
  formId?: string;
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
}

export interface SubmissionWithRecord {
  submission: FormSubmission;
  record: SubmissionRecord;
}

export interface MergeOverride {
  field: string;
  submittedValue: string;
  existingValue: string;
}

export interface MappingResult {
  target: string;
  group: "customer" | "pet" | "medical" | "notes" | "tags";
  label: string;
  questionLabel: string;
  value: unknown;
  hasAttachment: boolean;
}

// ============================================================================
// Audit Schemas
// ============================================================================

export interface FormAuditEntry {
  id: string;
  timestamp: string;
  action: FormAuditAction;
  facilityId: number;
  formId?: string;
  formName?: string;
  versionNumber?: number;
  versionId?: string;
  submissionId?: string;
  actorId?: string | number;
  actorName?: string;
  actorType?: "customer" | "staff" | "system";
  targetType?: "customer" | "pet";
  targetId?: string | number;
  changes?: { field: string; oldValue: string; newValue: string }[];
  mergeRule?: "submitted_wins" | "existing_wins" | "ask";
  overrides?: {
    field: string;
    submittedValue: string;
    existingValue: string;
  }[];
  relatedCustomerId?: number;
  relatedPetId?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Automation Event Schemas
// ============================================================================

export interface FormEventPayload {
  facilityId: number;
  formId: string;
  formName?: string;
  submissionId?: string;
  customerId?: number;
  petIds?: number[];
  sentVia?: string;
  deadline?: string;
  triggerQuestionId?: string;
  triggerRuleId?: string;
  [key: string]: unknown;
}

// ============================================================================
// Requirements Schemas
// ============================================================================

export interface MissingFormResult {
  formId: string;
  formName: string;
  enforcement: "block" | "warn";
  stage: RequirementStage;
}

export interface FormRequirementsCheck {
  complete: boolean;
  missing: MissingFormResult[];
  hasBlocker: boolean;
  hasWarning: boolean;
  totalRequired: number;
  totalCompleted: number;
}
