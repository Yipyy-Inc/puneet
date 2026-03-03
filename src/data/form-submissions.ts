/**
 * Form submissions: core model per spec.
 * Submission (form_version_id, status, related_customer_id, related_pet_id, etc.)
 * Answer (submission_id, field_id, value, attachments)
 *
 * 6.1 Always Store: Full submission snapshot (submission + all answers) is stored
 * and treated as immutable for audit/compliance. No in-place edits to submitted data.
 *
 * Audit: submission timestamps + submission_received log entry; merge decisions stored on record.
 */

import { logSubmissionReceived, logMergeDecision } from "@/lib/form-audit";

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

  logSubmissionReceived({
    facilityId: input.facilityId,
    formId: input.formId,
    submissionId: id,
    submittedAt: now,
    customerId: input.customerId,
    petIds: input.petIds,
  });

  return submission;
}

export function getSubmissionsByFacility(facilityId: number): FormSubmission[] {
  return submissions
    .filter((s) => s.facilityId === facilityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface SubmissionListFilters {
  status?: SubmissionStatus | "all";
  formId?: string;
  dateFrom?: string; // ISO date
  dateTo?: string;
  locationId?: string;
}

export interface SubmissionWithRecord {
  submission: FormSubmission;
  record: SubmissionRecord;
}

/** List submissions with their records for inbox; supports filters */
export function getSubmissionsWithRecords(
  facilityId: number,
  filters?: SubmissionListFilters
): SubmissionWithRecord[] {
  const list: SubmissionWithRecord[] = [];
  for (const sub of submissions) {
    if (sub.facilityId !== facilityId) continue;
    const rec = submissionRecords.find((r) => r.id === sub.id);
    if (!rec) continue;
    if (filters?.status && filters.status !== "all" && rec.status !== filters.status) continue;
    if (filters?.formId && sub.formId !== filters.formId) continue;
    if (filters?.locationId && rec.locationId !== filters.locationId) continue;
    const subDate = sub.createdAt.slice(0, 10);
    if (filters?.dateFrom && subDate < filters.dateFrom) continue;
    if (filters?.dateTo && subDate > filters.dateTo) continue;
    list.push({ submission: sub, record: rec });
  }
  list.sort((a, b) => new Date(b.submission.createdAt).getTime() - new Date(a.submission.createdAt).getTime());
  return list;
}

/** Check if submission has file uploads in answers */
export function submissionHasFiles(submissionId: string): boolean {
  const answers = answerRecords.filter((a) => a.submissionId === submissionId);
  return answers.some((a) => a.attachments?.length || (typeof a.value === "object" && a.value !== null));
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

/** Submissions linked to a specific pet (for customer portal Forms tab) */
export function getSubmissionsForPet(facilityId: number, petId: number): FormSubmission[] {
  return submissions
    .filter(
      (s) =>
        s.facilityId === facilityId &&
        (s.petIds?.includes(petId) || submissionRecords.find((r) => r.id === s.id)?.relatedPetId === petId)
    )
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

/** Update submission record status (new model); syncs legacy submission status */
export function updateSubmissionRecordStatus(
  id: string,
  status: SubmissionStatus
): SubmissionRecord | null {
  const rec = submissionRecords.find((s) => s.id === id);
  if (!rec) return null;
  rec.status = status;
  const sub = submissions.find((s) => s.id === id);
  if (sub && status === "processed") {
    sub.status = "processed";
    sub.processedAt = new Date().toISOString();
  }
  return rec;
}

export interface MergeOverride {
  field: string;
  submittedValue: string;
  existingValue: string;
}

export function linkSubmissionToCustomer(
  id: string,
  customerId: number,
  petIds?: number[],
  options?: {
    mergeRule?: "submitted_wins" | "existing_wins" | "ask";
    overrides?: MergeOverride[];
    staffUserId?: string | number;
    staffUserName?: string;
  }
): FormSubmission | null {
  const sub = submissions.find((s) => s.id === id);
  if (!sub) return null;
  sub.customerId = customerId;
  if (petIds != null) sub.petIds = petIds;
  const rec = submissionRecords.find((s) => s.id === id);
  if (rec) {
    rec.relatedCustomerId = customerId;
    rec.relatedPetId = petIds?.[0];
    const rule = options?.mergeRule ?? "ask";
    const overrides = options?.overrides ?? [];
    rec.mergeDecision = {
      at: new Date().toISOString(),
      rule,
      overrides,
      staffUserId: options?.staffUserId,
      staffUserName: options?.staffUserName,
    };
    logMergeDecision({
      facilityId: rec.facilityId,
      submissionId: id,
      formId: rec.formId,
      staffUserId: options?.staffUserId,
      staffUserName: options?.staffUserName,
      relatedCustomerId: customerId,
      relatedPetId: petIds?.[0],
      mergeRule: rule,
      overrides,
    });
  }
  return sub;
}

// ----- Seed: example submissions for UI demo -----
const seedFormId = "form-intake-demo";
const seedVerId = "ver-intake-demo";
const seedSubs: FormSubmission[] = [
  {
    id: "sub-seed-1",
    formId: seedFormId,
    facilityId: 11,
    status: "new",
    answers: {
      q1: "Jamie Rivera",
      q2: "jamie.rivera@example.com",
      q3: "Google search",
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    customerId: undefined,
    petIds: undefined,
  },
  {
    id: "sub-seed-2",
    formId: seedFormId,
    facilityId: 11,
    status: "new",
    answers: {
      q1: "Alice Johnson",
      q2: "alice@example.com",
      q3: "Friend referral",
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    customerId: 15,
    petIds: [1],
  },
  {
    id: "sub-seed-3",
    formId: seedFormId,
    facilityId: 11,
    status: "processed",
    answers: {
      q1: "Bob Smith",
      q2: "bob@example.com",
      q3: "Website",
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    customerId: 16,
    petIds: [3],
  },
  {
    id: "sub-seed-4",
    formId: seedFormId,
    facilityId: 11,
    status: "new",
    answers: {
      q1: "Sam Wilson",
      q2: "sam@example.com",
      q3: "Vaccination record attached",
    },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];
const seedRecords: SubmissionRecord[] = [
  {
    id: "sub-seed-1",
    formVersionId: seedVerId,
    formId: seedFormId,
    facilityId: 11,
    status: "unread",
    createdAt: seedSubs[0].createdAt,
    submittedAt: seedSubs[0].createdAt,
  },
  {
    id: "sub-seed-2",
    formVersionId: seedVerId,
    formId: seedFormId,
    facilityId: 11,
    status: "read",
    relatedCustomerId: 15,
    relatedPetId: 1,
    createdAt: seedSubs[1].createdAt,
    submittedAt: seedSubs[1].createdAt,
  },
  {
    id: "sub-seed-3",
    formVersionId: seedVerId,
    formId: seedFormId,
    facilityId: 11,
    status: "processed",
    relatedCustomerId: 16,
    relatedPetId: 3,
    createdAt: seedSubs[2].createdAt,
    submittedAt: seedSubs[2].createdAt,
  },
  {
    id: "sub-seed-4",
    formVersionId: seedVerId,
    formId: seedFormId,
    facilityId: 11,
    status: "unread",
    createdAt: seedSubs[3].createdAt,
    submittedAt: seedSubs[3].createdAt,
  },
];
const seedAnswers: AnswerRecord[] = [
  { submissionId: "sub-seed-1", fieldId: "q1", value: "Jamie Rivera" },
  { submissionId: "sub-seed-1", fieldId: "q2", value: "jamie.rivera@example.com" },
  { submissionId: "sub-seed-1", fieldId: "q3", value: "Google search" },
  { submissionId: "sub-seed-2", fieldId: "q1", value: "Alice Johnson" },
  { submissionId: "sub-seed-2", fieldId: "q2", value: "alice@example.com" },
  { submissionId: "sub-seed-2", fieldId: "q3", value: "Friend referral" },
  { submissionId: "sub-seed-3", fieldId: "q1", value: "Bob Smith" },
  { submissionId: "sub-seed-3", fieldId: "q2", value: "bob@example.com" },
  { submissionId: "sub-seed-3", fieldId: "q3", value: "Website" },
  { submissionId: "sub-seed-4", fieldId: "q1", value: "Sam Wilson" },
  { submissionId: "sub-seed-4", fieldId: "q2", value: "sam@example.com" },
  { submissionId: "sub-seed-4", fieldId: "q3", value: "Vaccination record attached" },
  { submissionId: "sub-seed-4", fieldId: "q4", value: "vaccine-record.pdf", attachments: ["vaccine-record.pdf"] },
];
submissions.push(...seedSubs);
submissionRecords.push(...seedRecords);
answerRecords.push(...seedAnswers);
