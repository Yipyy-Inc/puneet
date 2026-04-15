import { z } from "zod";

// ============================================================================
// Department
// ============================================================================

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  facilityId: z.number(),
  color: z.string(),
  description: z.string().optional(),
  employeeIds: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Department = z.infer<typeof departmentSchema>;

// ============================================================================
// Position
// ============================================================================

export const payTypeEnum = z.enum(["hourly", "salary"]);
export type PayType = z.infer<typeof payTypeEnum>;

export const positionSchema = z.object({
  id: z.string(),
  name: z.string(),
  departmentId: z.string(),
  hourlyRate: z.number().optional(),
  salary: z.number().optional(),
  payType: payTypeEnum,
  color: z.string(),
  description: z.string().optional(),
  isActive: z.boolean(),
});
export type Position = z.infer<typeof positionSchema>;

// ============================================================================
// Schedule Employee (extended for scheduling)
// ============================================================================

export const employmentTypeEnum = z.enum([
  "full_time",
  "part_time",
  "contract",
]);
export type EmploymentType = z.infer<typeof employmentTypeEnum>;

export const employeeStatusEnum = z.enum([
  "active",
  "inactive",
  "onboarding",
  "terminated",
]);
export type EmployeeStatus = z.infer<typeof employeeStatusEnum>;

// ─── RBAC role hierarchy ────────────────────────────────────────────────────

export const userRoleEnum = z.enum([
  "owner",
  "general_manager",
  "department_manager",
  "supervisor",
  "employee",
]);
export type UserRole = z.infer<typeof userRoleEnum>;

// ─── Company profile ────────────────────────────────────────────────────────

export const operatingHoursDaySchema = z.object({
  dayOfWeek: z.number(),
  isOpen: z.boolean(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});
export type OperatingHoursDay = z.infer<typeof operatingHoursDaySchema>;

export const facilityLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  region: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  timezone: z.string(),
  operatingHours: z.array(operatingHoursDaySchema),
  isPrimary: z.boolean(),
});
export type FacilityLocation = z.infer<typeof facilityLocationSchema>;

export const companyProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string().optional(),
  industry: z.string(),
  taxId: z.string().optional(),
  contactEmail: z.string(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  defaultTimezone: z.string(),
  weekStartsOn: z.number(),
  payPeriod: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
  locations: z.array(facilityLocationSchema),
  updatedAt: z.string(),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

// ─── Notifications ──────────────────────────────────────────────────────────

export const notificationEventEnum = z.enum([
  "schedule_published",
  "shift_changed",
  "shift_assigned",
  "shift_cancelled",
  "shift_reminder",
  "swap_requested",
  "swap_decision",
  "timeoff_decision",
  "availability_decision",
  "open_shift_posted",
  "open_shift_claimed",
  "attendance_late",
  "attendance_no_show",
]);
export type NotificationEvent = z.infer<typeof notificationEventEnum>;

export const notificationChannelsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});
export type NotificationChannels = z.infer<typeof notificationChannelsSchema>;

export const notificationRuleSchema = z.object({
  event: notificationEventEnum,
  enabled: z.boolean(),
  channels: notificationChannelsSchema,
  /** Audience scope: "all" | "managers" | "involved" — who receives this. */
  audience: z.enum(["all", "managers", "involved"]),
  /** For reminders: how many minutes before the event to fire. */
  leadTimeMinutes: z.number().optional(),
});
export type NotificationRule = z.infer<typeof notificationRuleSchema>;

export const notificationPreferencesSchema = z.object({
  facilityId: z.number(),
  rules: z.array(notificationRuleSchema),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  updatedAt: z.string(),
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const broadcastAudienceEnum = z.enum([
  "all_staff",
  "department",
  "location",
  "individual",
]);
export type BroadcastAudience = z.infer<typeof broadcastAudienceEnum>;

export const broadcastMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  audience: broadcastAudienceEnum,
  audienceTargetId: z.string().optional(),
  channels: notificationChannelsSchema,
  sentBy: z.string(),
  sentByName: z.string(),
  sentAt: z.string(),
  recipientCount: z.number(),
});
export type BroadcastMessage = z.infer<typeof broadcastMessageSchema>;

export const scheduleEmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  avatar: z.string().optional(),
  initials: z.string(),
  departmentIds: z.array(z.string()),
  positionIds: z.array(z.string()),
  primaryPositionId: z.string(),
  hireDate: z.string(),
  status: employeeStatusEnum,
  maxHoursPerWeek: z.number(),
  employmentType: employmentTypeEnum,
  role: z.string(),
  /** Skills / certifications the employee holds (e.g. "med-cert", "opener", "cpr") */
  skills: z.array(z.string()).optional(),
  /** Optional rich certifications with expiry tracking */
  certifications: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        issuedAt: z.string(),
        expiresAt: z.string().optional(),
      }),
    )
    .optional(),
});
export type ScheduleEmployee = z.infer<typeof scheduleEmployeeSchema>;

// ============================================================================
// Schedule Shift
// ============================================================================

export const shiftStatusEnum = z.enum([
  "draft",
  "published",
  "confirmed",
  "completed",
  "cancelled",
]);
export type ShiftStatus = z.infer<typeof shiftStatusEnum>;

// ─── Shift Recurrence ────────────────────────────────────────────────────────

export const shiftRecurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
  /** 0 = Sunday, 1 = Monday … 6 = Saturday — only used for weekly / biweekly */
  daysOfWeek: z.array(z.number()).optional(),
  endsOn: z.enum(["never", "date", "count"]),
  endDate: z.string().optional(),
  count: z.number().optional(),
});
export type ShiftRecurrence = z.infer<typeof shiftRecurrenceSchema>;

export const scheduleShiftSchema = z.object({
  id: z.string(),
  /** undefined = unassigned / open shift */
  employeeId: z.string().optional(),
  departmentId: z.string(),
  positionId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number(),
  notes: z.string().optional(),
  status: shiftStatusEnum,
  color: z.string().optional(),
  /** Links all shifts that belong to the same recurrence series */
  recurrenceId: z.string().optional(),
  /** Skills / certifications required for this shift */
  requiredSkills: z.array(z.string()).optional(),
  /** When true, unassigned shift appears on open-shift board */
  urgent: z.boolean().optional(),
  /** Number of employees this shift slot needs (for multi-spot shifts) */
  slots: z.number().optional(),
});
export type ScheduleShift = z.infer<typeof scheduleShiftSchema>;

// ─── Skill catalog ───────────────────────────────────────────────────────────

export const skillCategoryEnum = z.enum([
  "certification",
  "training",
  "qualification",
  "other",
]);
export type SkillCategory = z.infer<typeof skillCategoryEnum>;

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: skillCategoryEnum,
  description: z.string().optional(),
  /** Whether this skill has a renewal/expiry date */
  expires: z.boolean(),
  /** Default renewal window in days if expires is true */
  renewalDays: z.number().optional(),
});
export type Skill = z.infer<typeof skillSchema>;

// ============================================================================
// Schedule Period (draft or published schedule block)
// ============================================================================

export const schedulePeriodStatusEnum = z.enum(["draft", "published"]);
export type SchedulePeriodStatus = z.infer<typeof schedulePeriodStatusEnum>;

export const schedulePeriodSchema = z.object({
  id: z.string(),
  departmentId: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: schedulePeriodStatusEnum,
  publishedAt: z.string().optional(),
  publishedBy: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type SchedulePeriod = z.infer<typeof schedulePeriodSchema>;

// ============================================================================
// Schedule Template
// ============================================================================

export const templateShiftSchema = z.object({
  dayOfWeek: z.number(), // 0=Sunday, 6=Saturday
  employeeId: z.string(),
  positionId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number(),
});
export type TemplateShift = z.infer<typeof templateShiftSchema>;

export const scheduleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  departmentId: z.string(),
  description: z.string().optional(),
  shifts: z.array(templateShiftSchema),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type ScheduleTemplate = z.infer<typeof scheduleTemplateSchema>;

// ============================================================================
// Time Off Request (enhanced)
// ============================================================================

export const timeOffStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
  "cancelled",
]);
export type TimeOffStatus = z.infer<typeof timeOffStatusEnum>;

export const timeOffTypeEnum = z.enum([
  "vacation",
  "sick_leave",
  "personal",
  "bereavement",
  "parental",
  "unpaid",
  "other",
]);
export type TimeOffType = z.infer<typeof timeOffTypeEnum>;

export const enhancedTimeOffRequestSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  type: timeOffTypeEnum,
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: timeOffStatusEnum,
  requestedAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
  departmentId: z.string(),
});
export type EnhancedTimeOffRequest = z.infer<
  typeof enhancedTimeOffRequestSchema
>;

// ============================================================================
// Shift Swap Request (enhanced)
// ============================================================================

export const shiftSwapStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
  "cancelled",
]);
export type ShiftSwapStatus = z.infer<typeof shiftSwapStatusEnum>;

export const enhancedShiftSwapSchema = z.object({
  id: z.string(),
  requestingEmployeeId: z.string(),
  requestingEmployeeName: z.string(),
  requestingShiftId: z.string(),
  requestingShiftDate: z.string(),
  requestingShiftTime: z.string(),
  targetEmployeeId: z.string(),
  targetEmployeeName: z.string(),
  targetShiftId: z.string(),
  targetShiftDate: z.string(),
  targetShiftTime: z.string(),
  reason: z.string(),
  status: shiftSwapStatusEnum,
  requestedAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
  departmentId: z.string(),
});
export type EnhancedShiftSwap = z.infer<typeof enhancedShiftSwapSchema>;

// ============================================================================
// Employee Warning / Discipline
// ============================================================================

export const warningTypeEnum = z.enum([
  "verbal",
  "written",
  "final",
  "suspension",
  "termination",
  "custom",
]);
export type WarningType = z.infer<typeof warningTypeEnum>;

export const warningStatusEnum = z.enum([
  "issued",
  "acknowledged",
  "appealed",
  "resolved",
]);
export type WarningStatus = z.infer<typeof warningStatusEnum>;

export const employeeWarningSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  type: warningTypeEnum,
  reason: z.string(),
  description: z.string(),
  managerNotes: z.string(),
  issuedBy: z.string(),
  issuedByName: z.string(),
  issuedAt: z.string(),
  acknowledgedAt: z.string().optional(),
  witnessName: z.string().optional(),
  status: warningStatusEnum,
  departmentId: z.string(),
});
export type EmployeeWarning = z.infer<typeof employeeWarningSchema>;

// ============================================================================
// Onboarding
// ============================================================================

export const onboardingTaskTypeEnum = z.enum([
  "document",
  "agreement",
  "training",
  "form",
  "policy",
  "custom",
]);
export type OnboardingTaskType = z.infer<typeof onboardingTaskTypeEnum>;

export const onboardingTaskStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "overdue",
]);
export type OnboardingTaskStatus = z.infer<typeof onboardingTaskStatusEnum>;

export const onboardingTaskSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  title: z.string(),
  description: z.string(),
  type: onboardingTaskTypeEnum,
  status: onboardingTaskStatusEnum,
  dueDate: z.string().optional(),
  completedAt: z.string().optional(),
  documentUrl: z.string().optional(),
  requiresSignature: z.boolean(),
  signedAt: z.string().optional(),
});
export type OnboardingTask = z.infer<typeof onboardingTaskSchema>;

// ============================================================================
// Employee Document
// ============================================================================

export const employeeDocTypeEnum = z.enum([
  "work_permit",
  "id_document",
  "certification",
  "contract",
  "tax_form",
  "emergency_contact",
  "health_record",
  "other",
]);
export type EmployeeDocType = z.infer<typeof employeeDocTypeEnum>;

export const employeeDocumentSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  name: z.string(),
  type: employeeDocTypeEnum,
  fileUrl: z.string(),
  uploadedAt: z.string(),
  expiresAt: z.string().optional(),
  visibleToEmployee: z.boolean(),
  departmentId: z.string(),
});
export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;

// ============================================================================
// Employee Availability (enhanced for self-service)
// ============================================================================

export const availabilityDaySchema = z.object({
  dayOfWeek: z.number(),
  isAvailable: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});
export type AvailabilityDay = z.infer<typeof availabilityDaySchema>;

export const employeeAvailabilitySchema = z.object({
  employeeId: z.string(),
  weeklyAvailability: z.array(availabilityDaySchema),
  updatedAt: z.string(),
});
export type EmployeeAvailability = z.infer<typeof employeeAvailabilitySchema>;

// ─── Availability change request (self-service + manager approval) ──────────

export const availabilityChangeStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
  "cancelled",
]);
export type AvailabilityChangeStatus = z.infer<
  typeof availabilityChangeStatusEnum
>;

export const availabilityChangeRequestSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  departmentId: z.string(),
  /** Current availability at time of request (for side-by-side compare). */
  currentAvailability: z.array(availabilityDaySchema),
  /** Proposed replacement availability. */
  proposedAvailability: z.array(availabilityDaySchema),
  /** Date from which the new availability should apply once approved. */
  effectiveFrom: z.string(),
  reason: z.string(),
  status: availabilityChangeStatusEnum,
  requestedAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
});
export type AvailabilityChangeRequest = z.infer<
  typeof availabilityChangeRequestSchema
>;

// ============================================================================
// Scheduling Settings
// ============================================================================

export const schedulingSettingsSchema = z.object({
  allowStaffViewOtherShifts: z.boolean(),
  allowSelfScheduling: z.boolean(),
  requireManagerApproval: z.boolean(),
  autoApproveSwaps: z.boolean(),
  defaultShiftDuration: z.number(),
  maxHoursPerWeek: z.number(),
  maxConsecutiveDays: z.number(),
  minTimeBetweenShifts: z.number(),
  overtimeThresholdWeekly: z.number(),
  overtimeRate: z.number(),
});
export type SchedulingSettings = z.infer<typeof schedulingSettingsSchema>;

// ============================================================================
// Employee Document Templates & Submissions
// ============================================================================

export const documentTemplateFieldTypeEnum = z.enum([
  "text",
  "email",
  "phone",
  "date",
  "address",
  "sin_ssn",
  "number",
  "textarea",
  "select",
]);
export type DocumentTemplateFieldType = z.infer<
  typeof documentTemplateFieldTypeEnum
>;

export const documentTemplateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: documentTemplateFieldTypeEnum,
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});
export type DocumentTemplateField = z.infer<typeof documentTemplateFieldSchema>;

export const employeeDocTemplateTypeEnum = z.enum([
  "employment_agreement",
  "nda",
  "policy_acknowledgement",
  "health_declaration",
  "emergency_contact",
  "direct_deposit",
  "tax_form",
  "custom",
]);
export type EmployeeDocTemplateType = z.infer<
  typeof employeeDocTemplateTypeEnum
>;

export const employeeDocumentTemplateSchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  title: z.string(),
  type: employeeDocTemplateTypeEnum,
  description: z.string(),
  content: z.string(),
  fields: z.array(documentTemplateFieldSchema),
  requiresSignature: z.boolean(),
  isActive: z.boolean(),
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmployeeDocumentTemplate = z.infer<
  typeof employeeDocumentTemplateSchema
>;

export const employeeDocumentSubmissionSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  templateTitle: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  fieldValues: z.record(z.string(), z.string()),
  signatureData: z.string().optional(),
  signedAt: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timezone: z.string().optional(),
  deviceId: z.string().optional(),
  status: z.enum(["pending", "signed", "revoked"]),
  onboardingTaskId: z.string().optional(),
  facilityId: z.number(),
  submittedAt: z.string(),
});
export type EmployeeDocumentSubmission = z.infer<
  typeof employeeDocumentSubmissionSchema
>;

// ============================================================================
// Shift Opportunity
// ============================================================================

export const shiftOpportunityStatusEnum = z.enum([
  "open",
  "claimed",
  "expired",
  "cancelled",
]);
export type ShiftOpportunityStatus = z.infer<typeof shiftOpportunityStatusEnum>;

export const shiftOpportunityUrgencyEnum = z.enum([
  "normal",
  "urgent",
  "critical",
]);
export type ShiftOpportunityUrgency = z.infer<
  typeof shiftOpportunityUrgencyEnum
>;

export const shiftOpportunityClaimModeEnum = z.enum(["open", "invite_only"]);
export type ShiftOpportunityClaimMode = z.infer<
  typeof shiftOpportunityClaimModeEnum
>;

export const shiftOpportunitySchema = z.object({
  id: z.string(),
  facilityId: z.number(),
  departmentId: z.string(),
  positionId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number(),
  reason: z.string(),
  notes: z.string().optional(),
  urgency: shiftOpportunityUrgencyEnum,
  status: shiftOpportunityStatusEnum,
  /** Who is allowed to claim this opportunity. Defaults to "open" if unset. */
  claimMode: shiftOpportunityClaimModeEnum.optional(),
  /** When claimMode === "invite_only", restrict claims to these employee IDs. */
  invitedEmployeeIds: z.array(z.string()).optional(),
  originalEmployeeId: z.string().optional(),
  originalEmployeeName: z.string().optional(),
  originalShiftId: z.string().optional(),
  postedBy: z.string(),
  postedByName: z.string(),
  postedAt: z.string(),
  claimedBy: z.string().optional(),
  claimedByName: z.string().optional(),
  claimedAt: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type ShiftOpportunity = z.infer<typeof shiftOpportunitySchema>;

// ============================================================================
// Shift Opportunity Notification Settings
// ============================================================================

export const shiftOpportunityNotificationSettingsSchema = z.object({
  facilityId: z.number(),
  enabled: z.boolean(),
  notifyAllActive: z.boolean(),
  notifyByDepartment: z.boolean(),
  notifyByPosition: z.boolean(),
  eligibleEmployeeIds: z.array(z.string()),
  excludedEmployeeIds: z.array(z.string()),
  channels: z.object({
    inApp: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
  }),
  autoApprove: z.boolean(),
  requireManagerApproval: z.boolean(),
  maxClaimsPerWeek: z.number(),
  blackoutDays: z.array(z.number()),
});
export type ShiftOpportunityNotificationSettings = z.infer<
  typeof shiftOpportunityNotificationSettingsSchema
>;

// ============================================================================
// Holiday Rate
// ============================================================================

export const holidayRateSchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  name: z.string(),
  multiplier: z.number(), // 1.5 = time and a half
  departmentId: z.string().optional(), // undefined = all departments
});
export type HolidayRate = z.infer<typeof holidayRateSchema>;

// ============================================================================
// Time Clock Entry
// ============================================================================

export const timeClockEntrySchema = z.object({
  id: z.string(),
  shiftId: z.string(),
  employeeId: z.string(),
  date: z.string(),
  clockedInAt: z.string().optional(),
  clockedOutAt: z.string().optional(),
  actualMinutes: z.number().optional(),
  status: z.enum(["pending", "clocked_in", "clocked_out", "approved"]),
});
export type TimeClockEntry = z.infer<typeof timeClockEntrySchema>;

// ============================================================================
// Schedule Audit Trail
// ============================================================================

export const scheduleAuditActionEnum = z.enum([
  "shift_created",
  "shift_updated",
  "shift_deleted",
  "shift_assigned",
  "shift_unassigned",
  "shift_moved",
  "shift_copied",
  "schedule_published",
  "draft_discarded",
  "open_shift_posted",
  "open_shift_claimed",
]);
export type ScheduleAuditAction = z.infer<typeof scheduleAuditActionEnum>;

export const scheduleAuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: scheduleAuditActionEnum,
  facilityId: z.number(),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  shiftId: z.string().optional(),
  shiftDate: z.string().optional(),
  shiftTimeRange: z.string().optional(),
  positionId: z.string().optional(),
  positionName: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  previousEmployeeId: z.string().optional(),
  previousEmployeeName: z.string().optional(),
  actorId: z.union([z.string(), z.number()]).optional(),
  actorName: z.string().optional(),
  actorType: z.enum(["staff", "system", "employee"]).optional(),
  changes: z
    .array(
      z.object({
        field: z.string(),
        oldValue: z.string(),
        newValue: z.string(),
      }),
    )
    .optional(),
  count: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ScheduleAuditEntry = z.infer<typeof scheduleAuditEntrySchema>;
