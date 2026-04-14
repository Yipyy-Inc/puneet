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
import type {
  FormSubmission,
  SubmissionRecord,
  AnswerRecord,
  SubmissionStatus,
  MergeOverride,
  MappingResult,
  SubmissionListFilters,
  SubmissionWithRecord,
} from "@/types/forms";

export type {
  FormSubmissionStatus,
  SubmissionStatus,
  FormSubmissionContext,
  FormSubmission,
  SubmissionRecord,
  AnswerRecord,
  SubmissionListFilters,
  SubmissionWithRecord,
  MergeOverride,
  MappingResult,
} from "@/types/forms";

const submissionRecords: SubmissionRecord[] = [];
const answerRecords: AnswerRecord[] = [];
const submissions: FormSubmission[] = []; // legacy list for getSubmissionsByFacility that returns FormSubmission[]

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create submission (backward compat: formId + answers record; creates SubmissionRecord + AnswerRecords) */
export function createSubmission(
  input: Omit<FormSubmission, "id" | "status" | "createdAt">,
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
    formVersionId:
      (input as unknown as { formVersionId?: string }).formVersionId ?? "",
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
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** List submissions with their records for inbox; supports filters */
export function getSubmissionsWithRecords(
  facilityId: number,
  filters?: SubmissionListFilters,
): SubmissionWithRecord[] {
  const list: SubmissionWithRecord[] = [];
  for (const sub of submissions) {
    if (sub.facilityId !== facilityId) continue;
    const rec = submissionRecords.find((r) => r.id === sub.id);
    if (!rec) continue;
    if (
      filters?.status &&
      filters.status !== "all" &&
      rec.status !== filters.status
    )
      continue;
    if (filters?.formId && sub.formId !== filters.formId) continue;
    if (filters?.locationId && rec.locationId !== filters.locationId) continue;
    const subDate = sub.createdAt.slice(0, 10);
    if (filters?.dateFrom && subDate < filters.dateFrom) continue;
    if (filters?.dateTo && subDate > filters.dateTo) continue;
    list.push({ submission: sub, record: rec });
  }
  list.sort(
    (a, b) =>
      new Date(b.submission.createdAt).getTime() -
      new Date(a.submission.createdAt).getTime(),
  );
  return list;
}

/** Check if submission has file uploads in answers */
export function submissionHasFiles(submissionId: string): boolean {
  const answers = answerRecords.filter((a) => a.submissionId === submissionId);
  return answers.some(
    (a) =>
      a.attachments?.length ||
      (typeof a.value === "object" && a.value !== null),
  );
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
export function getAnswersRecord(
  submissionId: string,
): Record<string, unknown> {
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
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Submissions linked to a specific pet (for customer portal Forms tab) */
export function getSubmissionsForPet(
  facilityId: number,
  petId: number,
): FormSubmission[] {
  return submissions
    .filter(
      (s) =>
        s.facilityId === facilityId &&
        (s.petIds?.includes(petId) ||
          submissionRecords.find((r) => r.id === s.id)?.relatedPetId === petId),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function updateSubmissionStatus(
  id: string,
  status: FormSubmission["status"],
  processedBy?: string,
): FormSubmission | null {
  const sub = submissions.find((s) => s.id === id);
  if (!sub) return null;
  sub.status = status;
  sub.processedAt = new Date().toISOString();
  if (processedBy) sub.processedBy = processedBy;
  const rec = submissionRecords.find((s) => s.id === id);
  if (rec) {
    rec.status =
      status === "new"
        ? "unread"
        : status === "processed" || status === "merged"
          ? "processed"
          : "read";
  }
  return sub;
}

/** Update submission record status (new model); syncs legacy submission status */
export function updateSubmissionRecordStatus(
  id: string,
  status: SubmissionStatus,
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

export function linkSubmissionToCustomer(
  id: string,
  customerId: number,
  petIds?: number[],
  options?: {
    mergeRule?: "submitted_wins" | "existing_wins" | "ask";
    overrides?: MergeOverride[];
    staffUserId?: string | number;
    staffUserName?: string;
    mappingResults?: MappingResult[];
  },
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
      mappingResults: options?.mappingResults,
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

/**
 * 6.2 Apply Field Mappings — process submission answers through form's field mappings.
 * Returns a structured summary of where each answer goes (customer, pet, medical, notes, tags).
 * In production, this would write to the database; here it returns the plan for UI display.
 */

export function applyFieldMappings(
  submissionId: string,
  formFieldMappings: { questionId: string; target: string }[],
  formQuestions: { id: string; label: string; type?: string }[],
): MappingResult[] {
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return [];
  const answers = sub.answers;
  const results: MappingResult[] = [];

  for (const mapping of formFieldMappings) {
    const answer = answers[mapping.questionId];
    if (answer === undefined || answer === "") continue;

    const question = formQuestions.find((q) => q.id === mapping.questionId);
    const questionLabel = question?.label ?? mapping.questionId;

    // Determine group from target prefix
    let group: MappingResult["group"] = "notes";
    let label = mapping.target;

    if (mapping.target.startsWith("customer.")) {
      group = "customer";
      label = mapping.target.replace("customer.", "").replace(/\./g, " › ");
    } else if (mapping.target.startsWith("pet.")) {
      group = "pet";
      label = mapping.target.replace("pet.", "");
    } else if (mapping.target.startsWith("medical.")) {
      group = "medical";
      label = mapping.target.replace("medical.", "");
    } else if (mapping.target.startsWith("notes")) {
      group = "notes";
      label =
        mapping.target === "notes"
          ? "General notes"
          : mapping.target.replace("notes.", "") + " notes";
    } else if (mapping.target.startsWith("tags.")) {
      group = "tags";
      label = mapping.target.replace("tags.", "") + " tag";
    }

    // Capitalize first letter of label
    label = label.charAt(0).toUpperCase() + label.slice(1);

    // Check for attachments
    const answerRec = answerRecords.find(
      (a) =>
        a.submissionId === submissionId && a.fieldId === mapping.questionId,
    );

    results.push({
      target: mapping.target,
      group,
      label,
      questionLabel,
      value: answer,
      hasAttachment: !!answerRec?.attachments?.length,
    });
  }

  return results;
}

/** Get mapping results grouped by category for display */
export function getMappingResultsByGroup(
  submissionId: string,
  formFieldMappings: { questionId: string; target: string }[],
  formQuestions: { id: string; label: string; type?: string }[],
): Record<string, MappingResult[]> {
  const results = applyFieldMappings(
    submissionId,
    formFieldMappings,
    formQuestions,
  );
  const grouped: Record<string, MappingResult[]> = {};
  for (const r of results) {
    const key = r.group;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  return grouped;
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
    createdAt: "2026-03-04T09:00:00.000Z",
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
    createdAt: "2026-03-03T10:00:00.000Z",
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
    createdAt: "2026-03-01T10:00:00.000Z",
    processedAt: "2026-03-02T10:00:00.000Z",
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
    createdAt: "2026-03-04T11:00:00.000Z",
  },
  {
    id: "sub-seed-pet-buddy",
    formId: "form-pet-profile-demo",
    facilityId: 11,
    status: "processed",
    answers: {
      "pp-q1": "Fetch, swimming, chasing squirrels",
      "pp-q2": "5",
      "pp-q3": "None",
      "pp-q4": "2 cups kibble morning and evening",
      "pp-q5": "yes",
    },
    createdAt: "2026-03-10T09:30:00.000Z",
    processedAt: "2026-03-10T10:00:00.000Z",
    customerId: 15,
    petIds: [1],
  },
  {
    id: "sub-seed-owner-alice",
    formId: "form-owner-update-demo",
    facilityId: 11,
    status: "processed",
    answers: {
      "ou-q1": "123-456-7890",
      "ou-q2": "123 Main Street, Springfield, IL 62701",
      "ou-q3": "Robert Johnson",
      "ou-q4": "123-456-7891",
    },
    createdAt: "2026-03-12T14:00:00.000Z",
    processedAt: "2026-03-12T14:10:00.000Z",
    customerId: 15,
  },
  {
    id: "sub-seed-boarding-buddy",
    formId: "form-boarding-intake-demo",
    facilityId: 11,
    status: "processed",
    answers: {
      "bs-q1": "2 cups kibble morning and evening, no treats after 7pm",
      "bs-q2": "None",
      "bs-q3": "yes",
      "bs-q4": "Springfield Emergency Vet - 555-0199",
    },
    createdAt: "2026-03-15T11:00:00.000Z",
    processedAt: "2026-03-15T11:05:00.000Z",
    customerId: 15,
    petIds: [1],
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
  {
    id: "sub-seed-pet-buddy",
    formVersionId: "ver-pet-profile-demo",
    formId: "form-pet-profile-demo",
    facilityId: 11,
    status: "processed",
    relatedCustomerId: 15,
    relatedPetId: 1,
    createdAt: seedSubs[4].createdAt,
    submittedAt: seedSubs[4].createdAt,
  },
  {
    id: "sub-seed-owner-alice",
    formVersionId: "ver-owner-update-demo",
    formId: "form-owner-update-demo",
    facilityId: 11,
    status: "processed",
    relatedCustomerId: 15,
    createdAt: seedSubs[5].createdAt,
    submittedAt: seedSubs[5].createdAt,
  },
  {
    id: "sub-seed-boarding-buddy",
    formVersionId: "ver-boarding-intake-demo",
    formId: "form-boarding-intake-demo",
    facilityId: 11,
    status: "processed",
    relatedCustomerId: 15,
    relatedPetId: 1,
    createdAt: seedSubs[6].createdAt,
    submittedAt: seedSubs[6].createdAt,
  },
];
const seedAnswers: AnswerRecord[] = [
  { submissionId: "sub-seed-1", fieldId: "q1", value: "Jamie Rivera" },
  {
    submissionId: "sub-seed-1",
    fieldId: "q2",
    value: "jamie.rivera@example.com",
  },
  { submissionId: "sub-seed-1", fieldId: "q3", value: "Google search" },
  { submissionId: "sub-seed-2", fieldId: "q1", value: "Alice Johnson" },
  { submissionId: "sub-seed-2", fieldId: "q2", value: "alice@example.com" },
  { submissionId: "sub-seed-2", fieldId: "q3", value: "Friend referral" },
  { submissionId: "sub-seed-3", fieldId: "q1", value: "Bob Smith" },
  { submissionId: "sub-seed-3", fieldId: "q2", value: "bob@example.com" },
  { submissionId: "sub-seed-3", fieldId: "q3", value: "Website" },
  { submissionId: "sub-seed-4", fieldId: "q1", value: "Sam Wilson" },
  { submissionId: "sub-seed-4", fieldId: "q2", value: "sam@example.com" },
  {
    submissionId: "sub-seed-4",
    fieldId: "q3",
    value: "Vaccination record attached",
  },
  {
    submissionId: "sub-seed-4",
    fieldId: "q4",
    value: "vaccine-record.pdf",
    attachments: ["vaccine-record.pdf"],
  },
  {
    submissionId: "sub-seed-pet-buddy",
    fieldId: "pp-q1",
    value: "Fetch, swimming, chasing squirrels",
  },
  { submissionId: "sub-seed-pet-buddy", fieldId: "pp-q2", value: "5" },
  { submissionId: "sub-seed-pet-buddy", fieldId: "pp-q3", value: "None" },
  {
    submissionId: "sub-seed-pet-buddy",
    fieldId: "pp-q4",
    value: "2 cups kibble morning and evening",
  },
  { submissionId: "sub-seed-pet-buddy", fieldId: "pp-q5", value: "yes" },
  {
    submissionId: "sub-seed-owner-alice",
    fieldId: "ou-q1",
    value: "123-456-7890",
  },
  {
    submissionId: "sub-seed-owner-alice",
    fieldId: "ou-q2",
    value: "123 Main Street, Springfield, IL 62701",
  },
  {
    submissionId: "sub-seed-owner-alice",
    fieldId: "ou-q3",
    value: "Robert Johnson",
  },
  {
    submissionId: "sub-seed-owner-alice",
    fieldId: "ou-q4",
    value: "123-456-7891",
  },
  {
    submissionId: "sub-seed-boarding-buddy",
    fieldId: "bs-q1",
    value: "2 cups kibble morning and evening, no treats after 7pm",
  },
  { submissionId: "sub-seed-boarding-buddy", fieldId: "bs-q2", value: "None" },
  { submissionId: "sub-seed-boarding-buddy", fieldId: "bs-q3", value: "yes" },
  {
    submissionId: "sub-seed-boarding-buddy",
    fieldId: "bs-q4",
    value: "Springfield Emergency Vet - 555-0199",
  },
];
submissions.push(...seedSubs);
submissionRecords.push(...seedRecords);
answerRecords.push(...seedAnswers);
