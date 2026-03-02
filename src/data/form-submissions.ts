/**
 * Form submissions: intake, service, and profile form responses.
 * Used by public fill (create), facility inbox (list/process), and notifications.
 */

export type FormSubmissionStatus = "new" | "processed" | "merged";

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
  /** questionId -> value; for multi-pet, value can be Record<petId, value> or array */
  answers: Record<string, unknown>;
  petIds?: number[];
  customerId?: number;
  submitterEmail?: string;
  submitterName?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

let submissions: FormSubmission[] = [];

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSubmission(
  input: Omit<FormSubmission, "id" | "status" | "createdAt">
): FormSubmission {
  const submission: FormSubmission = {
    ...input,
    id: generateId(),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  submissions.push(submission);
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
  return sub;
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
  return sub;
}
