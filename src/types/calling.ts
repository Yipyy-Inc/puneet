import { z } from "zod";

// ============================================================
// Active Call
// ============================================================

export const activeCallSchema = z.object({
  id: z.string(),
  type: z.enum(["inbound", "outbound"]),
  from: z.string(),
  to: z.string(),
  clientId: z.number().optional(),
  clientName: z.string().optional(),
  clientPhoto: z.string().optional(),
  pets: z
    .array(
      z.object({
        name: z.string(),
        breed: z.string(),
        photo: z.string().optional(),
      }),
    )
    .optional(),
  tags: z
    .array(
      z.enum([
        "vip",
        "high_maintenance",
        "frequent_no_show",
        "new_client",
        "allergy_alert",
        "aggression_flag",
      ]),
    )
    .optional(),
  startTime: z.string(),
  status: z.enum(["ringing", "active", "on_hold", "transferring"]),
  isMuted: z.boolean(),
  isRecording: z.boolean(),
  assignedStaff: z.string().optional(),
  upcomingAppointments: z.number().optional(),
  outstandingBalance: z.number().optional(),
  previousUnresolved: z.string().optional(),
  currentService: z.string().optional(),
});
export type ActiveCall = z.infer<typeof activeCallSchema>;

// ============================================================
// Call Queue
// ============================================================

export const callQueueEntrySchema = z.object({
  id: z.string(),
  position: z.number(),
  from: z.string(),
  clientName: z.string().optional(),
  waitTime: z.number(),
  reason: z.string().optional(),
  estimatedWait: z.number().optional(),
});
export type CallQueueEntry = z.infer<typeof callQueueEntrySchema>;

// ============================================================
// IVR
// ============================================================

export const ivrActionEnum = z.enum([
  "route_staff",
  "route_voicemail",
  "play_recording",
  "send_sms",
  "route_department",
  "submenu",
  "route_operator",
]);
export type IVRAction = z.infer<typeof ivrActionEnum>;

export const ivrNodeSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  action: ivrActionEnum,
  destination: z.string().optional(),
  message: z.string().optional(),
  smsText: z.string().optional(),
});
export type IVRNode = z.infer<typeof ivrNodeSchema>;

export const ivrConfigSchema = z.object({
  id: z.string(),
  greeting: z.string(),
  nodes: z.array(ivrNodeSchema),
  afterHoursMessage: z.string().optional(),
  holdMusic: z.enum(["none", "jazz", "classical", "upbeat"]),
  maxMenuRepeats: z.number(),
  enabled: z.boolean(),
});
export type IVRConfig = z.infer<typeof ivrConfigSchema>;

// ============================================================
// Voicemail Greetings
// ============================================================

export const voicemailGreetingSchema = z.object({
  id: z.string(),
  type: z.enum(["default", "after_hours", "holiday", "temporary"]),
  name: z.string(),
  transcription: z.string(),
  isActive: z.boolean(),
  lastUpdated: z.string(),
});
export type VoicemailGreeting = z.infer<typeof voicemailGreetingSchema>;

// ============================================================
// AI Call Summary
// ============================================================

export const aiCallSummarySchema = z.object({
  callId: z.string(),
  callReason: z.string(),
  appointmentRequest: z.string().optional(),
  vaccinationDiscussion: z.string().optional(),
  specialCareNotes: z.string().optional(),
  behaviorAlerts: z.string().optional(),
  upsellOpportunities: z.array(z.string()),
  sentimentScore: z.number().min(0).max(10),
  riskFlag: z.enum(["none", "angry_client", "refund_risk", "churn_risk"]),
  followUpTask: z.string().optional(),
  assignedTo: z.string().optional(),
  generatedAt: z.string(),
  savedToProfile: z.boolean(),
});
export type AICallSummary = z.infer<typeof aiCallSummarySchema>;

// ============================================================
// Calling Settings
// ============================================================

export const dispatchModeEnum = z.enum([
  "ring_all",
  "desktop_first",
  "mobile_first",
  "reception_only",
  "specific_group",
  "location_based",
  "round_robin",
]);
export type DispatchMode = z.infer<typeof dispatchModeEnum>;

export const ringToneEnum = z.enum([
  "classic",
  "soft_chime",
  "loud_alert",
  "repeating",
  "silent",
]);
export type RingTone = z.infer<typeof ringToneEnum>;

export const callHandlingEnum = z.enum([
  "allow_waiting",
  "next_available",
  "direct_voicemail",
  "queue_system",
]);
export type CallHandling = z.infer<typeof callHandlingEnum>;

export const businessHoursDaySchema = z.object({
  open: z.string(),
  close: z.string(),
  enabled: z.boolean(),
});

export const callingSettingsSchema = z.object({
  dispatchMode: dispatchModeEnum,
  ringTone: ringToneEnum,
  visualFlash: z.boolean(),
  mobileSync: z.boolean(),
  simultaneousCallHandling: callHandlingEnum,
  autoRecord: z.boolean(),
  recordingStorage: z.enum(["30_days", "90_days", "unlimited"]),
  complianceNotice: z.boolean(),
  autoTranscription: z.boolean(),
  aiSummaryEnabled: z.boolean(),
  missedCallAutoSMS: z.boolean(),
  missedCallSMSTemplate: z.string(),
  businessNumber: z.string(),
  businessHours: z.object({
    monday: businessHoursDaySchema,
    tuesday: businessHoursDaySchema,
    wednesday: businessHoursDaySchema,
    thursday: businessHoursDaySchema,
    friday: businessHoursDaySchema,
    saturday: businessHoursDaySchema,
    sunday: businessHoursDaySchema,
  }),
});
export type CallingSettings = z.infer<typeof callingSettingsSchema>;

// ============================================================
// Analytics
// ============================================================

export const staffPerformanceSchema = z.object({
  name: z.string(),
  callsHandled: z.number(),
  avgResponseTime: z.number(),
  missedCalls: z.number(),
  conversionRate: z.number(),
});
export type StaffPerformance = z.infer<typeof staffPerformanceSchema>;

export const callAnalyticsSchema = z.object({
  period: z.string(),
  totalCalls: z.number(),
  missedCalls: z.number(),
  avgAnswerTime: z.number(),
  conversionRate: z.number(),
  revenueFromCalls: z.number(),
  avgCallDuration: z.number(),
  abandonedCalls: z.number(),
  repeatCallers: z.number(),
  leadConversionRate: z.number(),
  hourlyVolume: z.array(z.object({ hour: z.number(), calls: z.number() })),
  staffPerformance: z.array(staffPerformanceSchema),
  topCallReasons: z.array(z.object({ reason: z.string(), count: z.number() })),
});
export type CallAnalytics = z.infer<typeof callAnalyticsSchema>;

// ============================================================
// Missed Call Tasks
// ============================================================

export const missedCallTaskSchema = z.object({
  id: z.string(),
  callId: z.string(),
  from: z.string(),
  clientName: z.string().optional(),
  callTime: z.string(),
  missedBy: z.string(),
  status: z.enum(["unresolved", "called_back", "resolved"]),
  assignedTo: z.string().optional(),
  autoSMSSent: z.boolean(),
  callbackTime: z.string().optional(),
  notes: z.string().optional(),
});
export type MissedCallTask = z.infer<typeof missedCallTaskSchema>;
