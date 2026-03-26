/**
 * Phase 2 form data model (planning).
 *
 * Scope:
 * - Conditional rules: reference pet attributes, service type, evaluation status, tags (not just question answers).
 * - Scoring: intake applications → approve / deny / needs review.
 * - Multi-language: per-question EN/FR (labelI18n, placeholderI18n).
 * - E-sign: agreements + timestamps + IP/device metadata on signature answers.
 * - Payment block: form block for card capture when payments module supports tokenization.
 *
 * Extended in: forms.ts (FormCondition, FormQuestion, FormFieldRecord, FormSettings),
 * form-submissions.ts (SubmissionRecord score/scoreOutcome, AnswerRecord signatureMetadata).
 */

// ─── Conditional rules: extended context ─────────────────────────────────────
/** Source for a condition: question answer, or context (pet/service/eval/tags). */
export type ConditionSourceType =
  | "question" // existing: questionId + operator + value
  | "petAttribute" // pet.* e.g. breed, age, weight, hasTag
  | "serviceType" // existing as contextField
  | "evaluationStatus"
  | "tag"; // pet or customer has tag (tagId or tag slug)

/** Pet attribute usable in conditions (Phase 2). */
export type PetAttributeCondition =
  | "pet.breed"
  | "pet.type"
  | "pet.age"
  | "pet.weight"
  | "pet.hasTag" // value = tag id or slug
  | "pet.gender";

/**
 * Extended condition (Phase 2): question answer OR pet attribute, service type, evaluation status, tags.
 * Merge optional fields into FormCondition when implementing Phase 2.
 */
export interface FormConditionPhase2 {
  questionId?: string;
  contextField?: "petType" | "serviceType" | "evaluationStatus";
  sourceType?: ConditionSourceType;
  petAttribute?: PetAttributeCondition;
  tagId?: string;
  operator: "eq" | "neq" | "contains" | "in";
  value: string | string[];
}

// ─── Scoring (intake applications: approve / deny / needs review) ─────────────
export type ScoreOutcome = "approve" | "deny" | "needs_review";

/** Per-field or per-rule contribution to score (Phase 2). */
export interface FormScoringRule {
  id: string;
  /** Question id or rule id */
  sourceFieldId?: string;
  /** When condition met (e.g. value = X), add this many points */
  conditionOperator?: "eq" | "neq" | "contains" | "in";
  conditionValue?: string | string[];
  points: number;
}

export interface FormScoringConfig {
  enabled: boolean;
  /** Outcome thresholds: e.g. { approve: 80, needs_review: 50 } (deny below 50) */
  thresholds?: {
    approveAbove?: number;
    needsReviewAbove?: number; // below this = deny
  };
  /** Optional per-field/rule scoring */
  rules?: FormScoringRule[];
}

/** On submission: computed score and outcome (Phase 2). */
export interface SubmissionScore {
  score: number;
  outcome: ScoreOutcome;
  /** Breakdown by rule/field for audit */
  details?: { ruleId: string; points: number }[];
  computedAt: string; // ISO
}

// ─── Multi-language per question (EN/FR) ─────────────────────────────────────
export type SupportedFormLocale = "en" | "fr";

export interface FormQuestionI18n {
  label?: Partial<Record<SupportedFormLocale, string>>;
  placeholder?: Partial<Record<SupportedFormLocale, string>>;
  /** Option value is key; label per locale */
  options?: Record<string, Partial<Record<SupportedFormLocale, string>>>;
}

// ─── E-sign agreements + timestamps + IP/device metadata ─────────────────────
export interface SignatureMetadata {
  signedAt: string; // ISO
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  /** Snapshot of agreement/consent text that was signed */
  agreementText?: string;
  /** Optional: geolocation or timezone for compliance */
  timezone?: string;
}

// ─── Payment block (only when payments module supports tokenization) ──────────
export type PaymentFormBlockStatus = "planned"; // tokenization not yet implemented

export interface FormPaymentBlockConfig {
  /** Amount in smallest currency unit (e.g. cents) */
  amount?: number;
  currency?: string;
  description?: string;
  /** When payments module supports: capture vs auth-only */
  captureMode?: "capture" | "authorize_only";
}

/** Stored value for payment field: token or reference from payments module (Phase 2). */
export interface PaymentAnswerValue {
  paymentIntentId?: string;
  token?: string; // PCI: never store raw card; token only
  last4?: string;
  brand?: string;
  capturedAt?: string; // ISO
}

// ─── Logic rules: trigger from context (Phase 2) ─────────────────────────────
/** When implementing Phase 2, LogicRuleRecord can support triggerSource + petAttribute/tagId. */
export interface LogicRuleTriggerPhase2 {
  /** Default "field" = triggerFieldId; Phase 2: "petAttribute" | "tag" | "serviceType" | "evaluationStatus" */
  triggerSource?:
    | "field"
    | "petAttribute"
    | "tag"
    | "serviceType"
    | "evaluationStatus";
  petAttribute?: PetAttributeCondition;
  tagId?: string;
}
