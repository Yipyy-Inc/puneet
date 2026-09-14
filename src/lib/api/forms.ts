import {
  getFormsByFacility,
  getFormById,
  getFormBySlug,
  getFormBySlugOrDraft,
  getFormVersionHistory,
  getStarterTemplates,
  getTemplatesByFacility,
  getTemplateById,
  createForm,
  updateForm,
  archiveForm,
  deleteForm,
  duplicateForm,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createFormFromTemplate,
} from "@/data/forms";
import {
  getSubmissionsByFacility,
  getSubmission,
  getSubmissionRecord,
  getSubmissionsWithRecords,
  getSubmissionsByForm,
  getSubmissionsForPet,
  getAnswersForSubmission,
  getAnswersRecord,
  createSubmission,
  updateSubmissionStatus,
  updateSubmissionRecordStatus,
} from "@/data/form-submissions";

// ---- Query factories ----

export const formQueries = {
  byFacility: (facilityId: number) => ({
    queryKey: ["forms", facilityId] as const,
    queryFn: async () => getFormsByFacility(facilityId),
  }),
  detail: (id: string) => ({
    queryKey: ["forms", "detail", id] as const,
    queryFn: async () => getFormById(id),
  }),
  bySlug: (slug: string) => ({
    queryKey: ["forms", "slug", slug] as const,
    queryFn: async () => getFormBySlug(slug),
  }),
  bySlugOrDraft: (slug: string) => ({
    queryKey: ["forms", "slug-or-draft", slug] as const,
    queryFn: async () => getFormBySlugOrDraft(slug),
  }),
  versionHistory: (formId: string) => ({
    queryKey: ["forms", "versions", formId] as const,
    queryFn: async () => getFormVersionHistory(formId),
  }),
  starterTemplates: () => ({
    queryKey: ["forms", "starter-templates"] as const,
    queryFn: async () => getStarterTemplates(),
  }),
  templatesByFacility: (facilityId: number) => ({
    queryKey: ["forms", "templates", facilityId] as const,
    queryFn: async () => getTemplatesByFacility(facilityId),
  }),
  templateDetail: (id: string) => ({
    queryKey: ["forms", "templates", "detail", id] as const,
    queryFn: async () => getTemplateById(id),
  }),
  submissions: (facilityId: number) => ({
    queryKey: ["forms", "submissions", facilityId] as const,
    queryFn: async () => getSubmissionsByFacility(facilityId),
  }),
  submissionsWithRecords: (facilityId: number) => ({
    queryKey: ["forms", "submissions-records", facilityId] as const,
    queryFn: async () => getSubmissionsWithRecords(facilityId),
  }),
  submission: (id: string) => ({
    queryKey: ["forms", "submissions", "detail", id] as const,
    queryFn: async () => getSubmission(id),
  }),
  submissionRecord: (id: string) => ({
    queryKey: ["forms", "submission-records", "detail", id] as const,
    queryFn: async () => getSubmissionRecord(id),
  }),
  submissionsByForm: (formId: string) => ({
    queryKey: ["forms", "submissions", "by-form", formId] as const,
    queryFn: async () => getSubmissionsByForm(formId),
  }),
  submissionsForPet: (facilityId: number, petId: number) => ({
    queryKey: ["forms", "submissions", "by-pet", facilityId, petId] as const,
    queryFn: async () => getSubmissionsForPet(facilityId, petId),
  }),
  answers: (submissionId: string) => ({
    queryKey: ["forms", "answers", submissionId] as const,
    queryFn: async () => getAnswersForSubmission(submissionId),
  }),
  answersRecord: (submissionId: string) => ({
    queryKey: ["forms", "answers-record", submissionId] as const,
    queryFn: async () => getAnswersRecord(submissionId),
  }),
};

// ---- Mutation helpers ----

export const formMutations = {
  createForm,
  updateForm,
  archiveForm,
  deleteForm,
  duplicateForm,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createFormFromTemplate,
  createSubmission,
  updateSubmissionStatus,
  updateSubmissionRecordStatus,
};
