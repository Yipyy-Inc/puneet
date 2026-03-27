import { z } from "zod";

// ============================================================================
// Role & Permission Enums
// ============================================================================

export const userRoleEnum = z.enum(["super_admin", "facility_admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const facilityRoleEnum = z.enum([
  "owner",
  "manager",
  "front_desk",
  "groomer",
  "trainer",
  "kennel_tech",
]);
export type FacilityRole = z.infer<typeof facilityRoleEnum>;

export const permissionEnum = z.enum([
  // Navigation/Page Access
  "view_dashboard",
  "view_kennel",
  "view_clients",
  "view_bookings",
  "view_staff",
  "view_scheduling",
  "view_services",
  "view_petcams",
  "view_daycare",
  "view_boarding",
  "view_grooming",
  "view_training",
  "view_retail",
  "view_billing",
  "view_inventory",
  "view_reports",
  "view_insights",
  "view_marketing",
  "view_communications",
  "view_incidents",
  "view_waivers",
  "view_settings",
  // Actions
  "create_booking",
  "edit_booking",
  "cancel_booking",
  "check_in_out",
  "take_payment",
  "process_refund",
  "apply_discount",
  "manual_card_entry",
  "override_refund_method",
  "manage_staff",
  "manage_services",
  "manage_pricing",
  "manage_settings",
  "add_pet_notes",
  "add_grooming_notes",
  "add_training_notes",
  "view_financials",
  "view_revenue",
  "view_wages",
  "view_client_lifetime_value",
  "export_reports",
  "send_marketing",
  "manage_incidents",
  "delete_records",
  "manage_permissions",
  // Tags & Notes
  "manage_tags",
  "assign_tags",
  "manage_notes",
  "view_internal_notes",
  "delete_notes",
  // Forms
  "forms_create",
  "forms_edit",
  "forms_publish",
  "forms_configure_mapping",
  "forms_configure_logic",
  "forms_view_submissions",
  "forms_process_submissions",
  "forms_staff_assisted_intake",
]);
export type Permission = z.infer<typeof permissionEnum>;

export const userPermissionOverrideSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: facilityRoleEnum,
  addedPermissions: z.array(permissionEnum),
  removedPermissions: z.array(permissionEnum),
});
export type UserPermissionOverride = z.infer<
  typeof userPermissionOverrideSchema
>;

// ============================================================================
// Task Enums
// ============================================================================

export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

export const taskStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const repeatPatternEnum = z.enum([
  "none",
  "daily",
  "weekly",
  "weekdays",
  "custom",
]);
export type RepeatPattern = z.infer<typeof repeatPatternEnum>;

export const shiftTaskCategoryEnum = z.enum([
  "feeding",
  "cleaning",
  "medication",
  "exercise",
  "grooming",
  "admin",
  "other",
]);
export type ShiftTaskCategory = z.infer<typeof shiftTaskCategoryEnum>;

export const staffDocumentTypeEnum = z.enum([
  "certification",
  "license",
  "training",
  "contract",
  "id",
  "other",
]);
export type StaffDocumentType = z.infer<typeof staffDocumentTypeEnum>;

export const certificationStatusEnum = z.enum([
  "valid",
  "expiring_soon",
  "expired",
]);
export type CertificationStatus = z.infer<typeof certificationStatusEnum>;

export const swapRequestStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
  "cancelled",
]);
export type SwapRequestStatus = z.infer<typeof swapRequestStatusEnum>;

export const sickCoverageStatusEnum = z.enum([
  "needs_coverage",
  "covered",
  "cancelled_shift",
]);
export type SickCoverageStatus = z.infer<typeof sickCoverageStatusEnum>;

export const timeOffRequestStatusEnum = z.enum([
  "pending",
  "approved",
  "denied",
  "changes_requested",
]);
export type TimeOffRequestStatus = z.infer<typeof timeOffRequestStatusEnum>;

export const conflictTypeEnum = z.enum([
  "double_booking",
  "overlapping",
  "time_off",
  "role_mismatch",
  "max_hours",
  "min_rest",
]);
export type ConflictType = z.infer<typeof conflictTypeEnum>;

export const conflictSeverityEnum = z.enum(["critical", "warning", "info"]);
export type ConflictSeverity = z.infer<typeof conflictSeverityEnum>;

export const staffConflictTypeEnum = z.enum([
  "double_booking",
  "overtime",
  "insufficient_break",
  "skill_mismatch",
  "time_off_overlap",
]);
export type StaffConflictType = z.infer<typeof staffConflictTypeEnum>;

// ============================================================================
// Task Template
// ============================================================================

export const taskTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  estimatedMinutes: z.number(),
  requiresPhoto: z.boolean(),
  priority: taskPriorityEnum,
  isActive: z.boolean(),
});
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;

// ============================================================================
// Staff Task
// ============================================================================

export const staffTaskSchema = z.object({
  id: z.number(),
  templateId: z.number(),
  templateName: z.string(),
  category: z.string(),
  description: z.string(),
  assignedTo: z.number(),
  assignedToName: z.string(),
  shiftId: z.number().optional(),
  petId: z.number().optional(),
  petName: z.string().optional(),
  priority: taskPriorityEnum,
  requiresPhoto: z.boolean(),
  status: taskStatusEnum,
  dueDate: z.string(),
  dueTime: z.string().optional(),
  repeatPattern: repeatPatternEnum.optional(),
  customRepeatDays: z.array(z.number()).optional(),
  completedAt: z.string().optional(),
  completedBy: z.number().optional(),
  completedByName: z.string().optional(),
  completedByInitials: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
  facility: z.string(),
});
export type StaffTask = z.infer<typeof staffTaskSchema>;

// ============================================================================
// Staff Performance
// ============================================================================

export const staffPerformanceSchema = z.object({
  staffId: z.number(),
  staffName: z.string(),
  role: z.string(),
  totalTasksAssigned: z.number(),
  tasksCompleted: z.number(),
  tasksSkipped: z.number(),
  tasksPending: z.number(),
  completionRate: z.number(),
  avgCompletionTimeMinutes: z.number(),
  onTimeCompletions: z.number(),
  lateCompletions: z.number(),
  photoProofCompliance: z.number(),
});
export type StaffPerformance = z.infer<typeof staffPerformanceSchema>;

// ============================================================================
// Staff Document
// ============================================================================

export const staffDocumentSchema = z.object({
  id: z.number(),
  staffId: z.number(),
  staffName: z.string(),
  name: z.string(),
  type: staffDocumentTypeEnum,
  fileUrl: z.string(),
  uploadedAt: z.string(),
  expiresAt: z.string().optional(),
  isExpired: z.boolean().optional(),
  facility: z.string(),
});
export type StaffDocument = z.infer<typeof staffDocumentSchema>;

// ============================================================================
// Staff Certification
// ============================================================================

export const staffCertificationSchema = z.object({
  id: z.number(),
  staffId: z.number(),
  name: z.string(),
  issuedBy: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string().optional(),
  status: certificationStatusEnum,
});
export type StaffCertification = z.infer<typeof staffCertificationSchema>;

// ============================================================================
// Shift Task
// ============================================================================

export const shiftTaskSchema = z.object({
  id: z.number(),
  shiftId: z.number().optional(),
  scheduleDate: z.string(),
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  taskName: z.string(),
  description: z.string(),
  category: shiftTaskCategoryEnum,
  priority: taskPriorityEnum,
  assignedToStaffId: z.number().nullable().optional(),
  assignedToStaffName: z.string().nullable().optional(),
  status: taskStatusEnum,
  completedAt: z.string().optional(),
  completedByStaffId: z.number().optional(),
  completedByStaffName: z.string().optional(),
  notes: z.string().optional(),
  requiresPhoto: z.boolean(),
  photoUrl: z.string().optional(),
  facility: z.string(),
});
export type ShiftTask = z.infer<typeof shiftTaskSchema>;

// ============================================================================
// Shift Swap Request
// ============================================================================

export const shiftSwapRequestSchema = z.object({
  id: z.number(),
  requestingStaffId: z.number(),
  requestingStaffName: z.string(),
  requestingShiftId: z.number(),
  requestingShiftDate: z.string(),
  requestingShiftTime: z.string(),
  targetStaffId: z.number().optional(),
  targetStaffName: z.string().optional(),
  targetShiftId: z.number().optional(),
  targetShiftDate: z.string().optional(),
  targetShiftTime: z.string().optional(),
  reason: z.string(),
  status: swapRequestStatusEnum,
  requestedAt: z.string(),
  reviewedByStaffId: z.number().optional(),
  reviewedByStaffName: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
  facility: z.string(),
});
export type ShiftSwapRequest = z.infer<typeof shiftSwapRequestSchema>;

// ============================================================================
// Sick Call-In
// ============================================================================

export const sickCallInSchema = z.object({
  id: z.number(),
  staffId: z.number(),
  staffName: z.string(),
  shiftId: z.number(),
  shiftDate: z.string(),
  shiftTime: z.string(),
  calledInAt: z.string(),
  reason: z.string(),
  expectedReturnDate: z.string().optional(),
  coverageStatus: sickCoverageStatusEnum,
  coveredByStaffId: z.number().optional(),
  coveredByStaffName: z.string().optional(),
  approvedByStaffId: z.number().optional(),
  approvedByStaffName: z.string().optional(),
  notes: z.string().optional(),
  facility: z.string(),
});
export type SickCallIn = z.infer<typeof sickCallInSchema>;

// ============================================================================
// Staff Availability
// ============================================================================

export const staffAvailabilitySchema = z.object({
  id: z.number(),
  staffId: z.number(),
  staffName: z.string(),
  dayOfWeek: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
  facility: z.string(),
});
export type StaffAvailability = z.infer<typeof staffAvailabilitySchema>;

// ============================================================================
// Time Off Reason
// ============================================================================

export const timeOffReasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  requiresApproval: z.boolean(),
  facility: z.string(),
});
export type TimeOffReason = z.infer<typeof timeOffReasonSchema>;

// ============================================================================
// Time Off Request
// ============================================================================

export const timeOffRequestSchema = z.object({
  id: z.number(),
  staffId: z.number(),
  staffName: z.string(),
  type: z.string(),
  customTypeName: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: timeOffRequestStatusEnum,
  requestedAt: z.string(),
  reviewedBy: z.number().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNotes: z.string().optional(),
  requestedChanges: z.string().optional(),
  coverageAlertTriggered: z.boolean().optional(),
  facility: z.string(),
});
export type TimeOffRequest = z.infer<typeof timeOffRequestSchema>;

// ============================================================================
// Shift Template
// ============================================================================

export const shiftTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  roles: z.array(z.string()),
  color: z.string(),
  facility: z.string(),
});
export type ShiftTemplate = z.infer<typeof shiftTemplateSchema>;

// ============================================================================
// Workload Metrics
// ============================================================================

export const timeBlockWorkloadSchema = z.object({
  timeBlock: z.string(),
  checkIns: z.number(),
  checkOuts: z.number(),
  daycareCount: z.number(),
  boardingCount: z.number(),
  groomingCount: z.number(),
  evaluations: z.number(),
  trainingCount: z.number(),
  customServicesCount: z.number(),
  busyMeter: z.number(),
});
export type TimeBlockWorkload = z.infer<typeof timeBlockWorkloadSchema>;

// ============================================================================
// Staff Schedule
// ============================================================================

export const scheduleStatusEnum = z.enum([
  "scheduled",
  "confirmed",
  "completed",
  "absent",
  "sick",
]);
export type ScheduleStatus = z.infer<typeof scheduleStatusEnum>;

export const scheduleSchema = z.object({
  id: z.number(),
  staffId: z.number(),
  staffName: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  role: z.string(),
  facility: z.string(),
  status: scheduleStatusEnum,
  location: z.string().optional(),
  notes: z.string().optional(),
});
export type Schedule = z.infer<typeof scheduleSchema>;

// ============================================================================
// Staff Conflict (from additional-features)
// ============================================================================

export const conflictingBookingSchema = z.object({
  bookingId: z.string(),
  serviceName: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});
export type ConflictingBooking = z.infer<typeof conflictingBookingSchema>;

export const staffConflictSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  staffName: z.string(),
  conflictType: staffConflictTypeEnum,
  severity: conflictSeverityEnum,
  date: z.string(),
  timeSlot: z.string(),
  conflictingBookings: z.array(conflictingBookingSchema).optional(),
  description: z.string(),
  recommendation: z.string(),
  canAutoResolve: z.boolean(),
});
export type StaffConflict = z.infer<typeof staffConflictSchema>;

// ============================================================================
// Scheduling Conflict (used in scheduling page & StaffConflictDetector)
// ============================================================================

export interface SchedulingConflict {
  id: string;
  shiftId: number;
  staffId: number;
  staffName: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  date: string;
  timeSlot: string;
  message: string;
  conflictingShiftId?: number;
  timeOffRequestId?: number;
  details?: Record<string, unknown>;
}
