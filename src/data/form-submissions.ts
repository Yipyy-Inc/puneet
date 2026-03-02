/**
 * Form submissions: core model per spec.
 * Submission (form_version_id, status, related_customer_id, related_pet_id, etc.)
 * Answer (submission_id, field_id, value, attachments)
 * Backward compat: createSubmission(formId, answers) and getSubmission returning answers record.
 */

export type FormSubmissionStatus = "new" | "processed" | "merged";

/** New spec status */
export type SubmissionStatus = "unread" | "read" | "processed" | "archived";

export interface FormSubmissionContext {
  petType?: string;
  serviceType?: string;
  evaluationStatus?: string;
}

/** Legacy shape: still returned by getSubmission for existing UI */
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
}

/** New spec: Submission record */
export interface SubmissionRecord {
  id: string;
  formVersionId: string;
  formId: string; // denormalized for quick filter
  facilityId: number;
  locationId?: string;
  status: SubmissionStatus;
  submittedBy?: string; // customer_user_id or staff_user_id
  relatedCustomerId?: number;
  relatedPetId?: number;
  relatedBookingId?: number;
  createdAt: string;
  submittedAt?: string;
  mergeDecision?: Record<string, unknown>;
}

/** New spec: Answer record */
export interface AnswerRecord {
  submissionId: string;
  fieldId: string;
  value: unknown;
  attachments?: string[];
}

let submissionRecords: SubmissionRecord[] = [];
let answerRecords: AnswerRecord[] = [];
let submissions: FormSubmission[] = []; // legacy list for getSubmissionsByFacility that returns FormSubmission[]

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create submission (backward compat: formId + answers record; creates SubmissionRecord + AnswerRecords) */
export function createSubmission(
  input: Omit<FormSubmission, "id" | "status" | "createdAt">
): FormSubmission {
  const now = new Date().toISOString();
  const id = generateId();
  const submission: FormSubmission = {
    ...input,
    id,
    status: "new",
    createdAt: now,
  };
  submissions.push(submission);

  const record: SubmissionRecord = {
    id,
    formVersionId: (input as unknown as { formVersionId?: string }).formVersionId ?? "",
    formId: input.formId,
    facilityId: input.facilityId,
    status: "unread",
    submittedBy: input.submitterEmail ?? input.submitterName,
    relatedCustomerId: input.customerId,
    relatedPetId: input.petIds?.[0],
    createdAt: now,
    submittedAt: now,
  };
  submissionRecords.push(record);
  Object.entries(input.answers).forEach(([fieldId, value]) => {
    answerRecords.push({ submissionId: id, fieldId, value });
  });

  return submission;
}

export function getSubmissionsByFacility(facilityId: number): FormSubmission[] {
  return submissions
    .filter((s) => s.facilityId === facilityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getSubmission(id: string): FormSubmission | undefined {
  return submissions.find((s) => s.id === id);
}

/** Get submission record (new model) */
export function getSubmissionRecord(id: string): SubmissionRecord | undefined {
  return submissionRecords.find((s) => s.id === id);
}

/** Get answers for a submission (new model) */
export function getAnswersForSubmission(submissionId: string): AnswerRecord[] {
  return answerRecords.filter((a) => a.submissionId === submissionId);
}

/** Build answers as record (fieldId -> value) */
export function getAnswersRecord(submissionId: string): Record<string, unknown> {
  const list = getAnswersForSubmission(submissionId);
  const out: Record<string, unknown> = {};
  list.forEach((a) => {
    out[a.fieldId] = a.value;
  });
  return out;
}

export function getSubmissionsByForm(formId: string): FormSubmission[] {
  return submissions
    .filter((s) => s.formId === formId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateSubmissionStatus(
  id: string,
  status: FormSubmission["status"],
  processedBy?: string
): FormSubmission | null {
  const sub = submissions.find((s) => s.id === id);
  if (!sub) return null;
  sub.status = status;
  sub.processedAt = new Date().toISOString();
  if (processedBy) sub.processedBy = processedBy;
  const rec = submissionRecords.find((s) => s.id === id);
  if (rec) {
    rec.status = status === "new" ? "unread" : status === "processed" || status === "merged" ? "processed" : "read";
  }
  return sub;
}

/** Update submission record status (new model) */
export function updateSubmissionRecordStatus(
  id: string,
  status: SubmissionStatus
): SubmissionRecord | null {
  const rec = submissionRecords.find((s) => s.id === id);
  if (!rec) return null;
  rec.status = status;
  return rec;
}

export function linkSubmissionToCustomer(
  id: string,
  customerId: number,
  petIds?: number[]
): FormSubmission | null {
  const sub = submissions.find((s) => s.id === id);
  if (!sub) return null;
  sub.customerId = customerId;
  if (petIds != null) sub.petIds = petIds;
  const rec = submissionRecords.find((s) => s.id === id);
  if (rec) {
    rec.relatedCustomerId = customerId;
    rec.relatedPetId = petIds?.[0];
  }
  return sub;
}
