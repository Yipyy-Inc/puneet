import type {
  ActiveCall,
  CallQueueEntry,
  IVRConfig,
  VoicemailGreeting,
  AICallSummary,
  CallingSettings,
  CallAnalytics,
  MissedCallTask,
  CallRoutingRule,
  CallTag,
} from "@/types/calling";
import { inquiryTagForIvrKey } from "@/lib/calling/inquiry-tags";

// ============================================================
// Active Calls (demo / simulation data)
// ============================================================

export const mockActiveCall: ActiveCall = {
  id: "active-001",
  type: "inbound",
  from: "+1 (514) 555-0142",
  to: "+1 (514) 555-0100",
  clientId: 3,
  clientName: "Jennifer Walsh",
  clientPhoto: undefined,
  pets: [
    { name: "Biscuit", breed: "Golden Retriever" },
    { name: "Luna", breed: "French Bulldog" },
  ],
  tags: ["vip", "high_maintenance"],
  startTime: new Date(Date.now() - 127000).toISOString(),
  status: "active",
  isMuted: false,
  isRecording: true,
  assignedStaff: "Sarah M.",
  upcomingAppointments: 2,
  outstandingBalance: 145.0,
  currentService: "Boarding – 3 nights (Biscuit)",
  // Caller pressed 3 (Boarding & Daycare) in the IVR — carried through to the
  // call log when the call ends.
  inquiryTag: inquiryTagForIvrKey("3"),
};

export const mockIncomingCall: ActiveCall = {
  id: "incoming-001",
  type: "inbound",
  from: "+1 (514) 555-0198",
  to: "+1 (514) 555-0100",
  clientId: 15, // Alice Johnson — a real client record so booking pre-fill works
  clientName: "Alice Johnson",
  clientPhoto: undefined,
  pets: [{ name: "Buddy", breed: "Golden Retriever" }],
  tags: ["vip"],
  startTime: new Date().toISOString(),
  status: "ringing",
  isMuted: false,
  isRecording: false,
  upcomingAppointments: 1,
  outstandingBalance: 0,
  previousUnresolved: "Rescheduling grooming – last Tuesday",
};

export const mockUnknownIncomingCall: ActiveCall = {
  id: "incoming-002",
  type: "inbound",
  from: "+1 (514) 555-0227",
  to: "+1 (514) 555-0100",
  startTime: new Date().toISOString(),
  status: "ringing",
  isMuted: false,
  isRecording: false,
};

// ============================================================
// Call Queue
// ============================================================

export const callQueue: CallQueueEntry[] = [
  {
    id: "queue-001",
    position: 1,
    from: "+1 (514) 555-0301",
    clientName: "Amanda Foster",
    waitTime: 45,
    estimatedWait: 120,
    // Auto-populated from the IVR: caller pressed 3 (Boarding & Daycare).
    inquiryTag: inquiryTagForIvrKey("3"),
  },
  {
    id: "queue-002",
    position: 2,
    from: "+1 (514) 555-0412",
    clientName: undefined,
    waitTime: 112,
    estimatedWait: 240,
    // Caller pressed 4 (Billing & Payments).
    inquiryTag: inquiryTagForIvrKey("4"),
  },
];

// ============================================================
// IVR Configuration
// ============================================================

export const ivrConfig: IVRConfig = {
  id: "ivr-001",
  enabled: true,
  greeting:
    "Thank you for calling Doggieville MTL, where every tail gets a five-star stay. Please listen carefully to the following options.",
  afterHoursMessage:
    "Our facility is currently closed. Our hours are Monday through Friday 7 AM to 7 PM, and weekends 8 AM to 6 PM. Please leave a voicemail and we'll return your call the next business day, or press 1 to book online.",
  holdMusic: "jazz",
  maxMenuRepeats: 3,
  nodes: [
    {
      id: "node-1",
      key: "1",
      label: "Reception & General Inquiries",
      action: "route_staff",
      destination: "Reception Team",
    },
    {
      id: "node-2",
      key: "2",
      label: "Grooming",
      action: "route_department",
      destination: "Grooming Department",
    },
    {
      id: "node-3",
      key: "3",
      label: "Boarding & Daycare",
      action: "route_department",
      destination: "Boarding Department",
    },
    {
      id: "node-4",
      key: "4",
      label: "Billing & Payments",
      action: "route_staff",
      destination: "Manager – Sophie R.",
    },
    {
      id: "node-5",
      key: "5",
      label: "Veterinary Emergencies",
      action: "route_staff",
      destination: "On-Call Vet Team",
    },
    {
      id: "node-6",
      key: "9",
      label: "Hear Our Hours & Location",
      action: "play_recording",
      message:
        "We are located at 4521 Sherbrooke Street West, Montreal. Our hours are Monday through Friday 7 AM to 7 PM, and weekends 8 AM to 6 PM.",
    },
    {
      id: "node-7",
      key: "8",
      label: "Book an Appointment via Text",
      action: "send_sms",
      smsText:
        "Hi! Click here to book your appointment online: https://doggieville.ca/book",
    },
    {
      id: "node-8",
      key: "0",
      label: "Speak with an Operator",
      action: "route_operator",
      destination: "Reception Team",
    },
  ],
};

// ============================================================
// Voicemail Greetings
// ============================================================

export const voicemailGreetings: VoicemailGreeting[] = [
  {
    id: "vm-greeting-001",
    type: "default",
    name: "Main Greeting",
    transcription:
      "Hi, you've reached Doggieville MTL. We're currently assisting other clients. Please leave your name, number, and the reason for your call, and we'll get back to you as soon as possible. Thank you!",
    isActive: true,
    lastUpdated: "2026-02-10T10:00:00Z",
  },
  {
    id: "vm-greeting-002",
    type: "after_hours",
    name: "After Hours",
    transcription:
      "Thank you for calling Doggieville MTL. Our facility is currently closed. Our hours are Monday to Friday 7 AM to 7 PM and weekends 8 AM to 6 PM. Please leave a voicemail and we will call you back first thing in the morning. For boarding emergencies, please press 1.",
    isActive: true,
    lastUpdated: "2026-01-15T09:00:00Z",
  },
  {
    id: "vm-greeting-003",
    type: "holiday",
    name: "Holiday Season",
    transcription:
      "Season's greetings from Doggieville MTL! We are operating with reduced hours during the holiday period. Please visit our website for updated schedules or leave a message and we'll get back to you. Happy holidays!",
    isActive: false,
    lastUpdated: "2025-12-20T08:00:00Z",
  },
  {
    id: "vm-greeting-004",
    type: "temporary",
    name: "Temporary Closure",
    transcription:
      "Hi, Doggieville MTL is temporarily closed for maintenance. We will reopen on Monday. For urgent boarding matters please contact our emergency line. Thank you for your patience.",
    isActive: false,
    lastUpdated: "2026-03-01T07:00:00Z",
  },
];

// Dates (YYYY-MM-DD, local) the facility treats as holidays — the greeting
// scheduler switches to the Holiday Season profile on these days.
export const holidayCalendar: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-07-01", name: "Canada Day" },
  { date: "2026-09-07", name: "Labour Day" },
  { date: "2026-10-12", name: "Thanksgiving" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-31", name: "New Year's Eve" },
];

// ============================================================
// AI Call Summaries
// ============================================================

export const aiCallSummaries: AICallSummary[] = [
  {
    callId: "call-001",
    callReason: "Client called to inquire about availability for boarding over the Easter long weekend.",
    appointmentRequest: "Requested boarding for Biscuit (Golden Retriever) from April 18–22, 2026.",
    vaccinationDiscussion: "Client confirmed Biscuit is up to date. Bordetella expires in July.",
    specialCareNotes: "Biscuit requires twice-daily medication (Apoquel 16mg). Client will bring supply.",
    behaviorAlerts: "Biscuit is reactive on-leash but great in play groups with other large dogs.",
    upsellOpportunities: ["Premium suite upgrade ($15/night)", "Daily grooming brush-out ($12)", "Webcam access add-on ($5/stay)"],
    sentimentScore: 8.5,
    riskFlag: "none",
    followUpTask: "Confirm Easter boarding reservation by email and send vaccine reminder.",
    assignedTo: "Sarah M.",
    generatedAt: "2026-04-20T10:32:00Z",
    savedToProfile: true,
  },
  {
    callId: "call-003",
    callReason: "Client called to dispute a grooming charge from last week.",
    appointmentRequest: undefined,
    vaccinationDiscussion: undefined,
    specialCareNotes: undefined,
    behaviorAlerts: undefined,
    upsellOpportunities: [],
    sentimentScore: 3.2,
    riskFlag: "angry_client",
    followUpTask: "Manager to review charge and call back within 24 hours with resolution.",
    assignedTo: "Manager – Sophie R.",
    generatedAt: "2026-04-19T14:10:00Z",
    savedToProfile: true,
  },
  {
    callId: "call-005",
    callReason:
      "General daycare inquiry — caller asked about openings next Tuesday/Thursday and daily rates for a friendly 2-year-old labradoodle.",
    appointmentRequest: "Possible daycare for Coco on Tue & Thu next week.",
    upsellOpportunities: ["Daycare 10-day package", "New-client behaviour evaluation"],
    sentimentScore: 7.5,
    riskFlag: "none",
    followUpTask: "Call back with daycare availability and rates; offer an intro evaluation.",
    generatedAt: "2026-05-31T14:53:00Z",
    savedToProfile: false,
  },
  {
    callId: "call-004",
    callReason:
      "Outbound call to confirm Biscuit's vaccination documents before the boarding stay.",
    upsellOpportunities: [],
    sentimentScore: 7.8,
    riskFlag: "none",
    generatedAt: "2026-06-01T15:32:00Z",
    savedToProfile: true,
  },
  {
    callId: "call-007",
    callReason:
      "Client disputed a grooming charge and asked for a manager callback — billing discrepancy.",
    upsellOpportunities: [],
    sentimentScore: 3.5,
    riskFlag: "refund_risk",
    followUpTask: "Manager to review quoted vs charged price and call Amanda back.",
    assignedTo: "Priya N.",
    generatedAt: "2026-05-24T14:25:00Z",
    savedToProfile: true,
  },
  {
    callId: "call-008",
    callReason:
      "Follow-up call to reschedule Marcus's grooming appointment from last Tuesday.",
    upsellOpportunities: [],
    sentimentScore: 7.2,
    riskFlag: "none",
    generatedAt: "2026-05-19T15:07:00Z",
    savedToProfile: false,
  },
  {
    callId: "call-010",
    callReason:
      "New client asked about puppy training packages and whether group sessions are offered.",
    appointmentRequest: "Free training assessment call booked.",
    upsellOpportunities: ["Basic obedience 6-week course", "Group session add-on"],
    sentimentScore: 8.2,
    riskFlag: "none",
    generatedAt: "2026-05-06T14:35:00Z",
    savedToProfile: true,
  },
  {
    callId: "call-011",
    callReason:
      "URGENT — caller has a family emergency and needs boarding for a senior dog (on twice-daily medication) starting tomorrow morning for ~5 days.",
    specialCareNotes: "Senior Labrador 'Rocky' on twice-daily medication.",
    upsellOpportunities: [],
    sentimentScore: 4.0,
    riskFlag: "churn_risk",
    followUpTask: "Call back the moment we open to confirm emergency boarding and medication handling.",
    generatedAt: "2026-04-20T18:03:00Z",
    savedToProfile: false,
  },
];

// ============================================================
// Calling Settings (defaults)
// ============================================================

export const defaultCallingSettings: CallingSettings = {
  dispatchMode: "ring_all",
  ringTone: "classic",
  visualFlash: true,
  mobileSync: true,
  simultaneousCallHandling: "queue_system",
  callForwardingMode: "on_no_answer",
  callForwardingNumber: "",
  ringDurationSeconds: 30,
  autoRecord: true,
  recordingStorage: "90_days",
  complianceNotice: true,
  autoTranscription: true,
  aiSummaryEnabled: true,
  missedCallAutoSMS: true,
  missedCallSMSTemplate:
    "Hi {{name}}, sorry we missed your call at Doggieville MTL! How can we help? Reply here or call us back at (514) 555-0100.",
  businessNumber: "+1 (514) 555-0100",
  businessHours: {
    monday: { open: "07:00", close: "19:00", enabled: true },
    tuesday: { open: "07:00", close: "19:00", enabled: true },
    wednesday: { open: "07:00", close: "19:00", enabled: true },
    thursday: { open: "07:00", close: "19:00", enabled: true },
    friday: { open: "07:00", close: "19:00", enabled: true },
    saturday: { open: "08:00", close: "18:00", enabled: true },
    sunday: { open: "08:00", close: "18:00", enabled: true },
  },
};

// ============================================================
// Analytics
// ============================================================

export const callAnalytics: CallAnalytics = {
  period: "Last 30 days",
  totalCalls: 347,
  missedCalls: 28,
  avgAnswerTime: 12,
  conversionRate: 34,
  revenueFromCalls: 8420,
  avgCallDuration: 186,
  abandonedCalls: 14,
  repeatCallers: 89,
  leadConversionRate: 22,
  hourlyVolume: [
    { hour: 0, calls: 0 },
    { hour: 1, calls: 0 },
    { hour: 2, calls: 0 },
    { hour: 3, calls: 0 },
    { hour: 4, calls: 0 },
    { hour: 5, calls: 0 },
    { hour: 6, calls: 1 },
    { hour: 7, calls: 8 },
    { hour: 8, calls: 22 },
    { hour: 9, calls: 38 },
    { hour: 10, calls: 45 },
    { hour: 11, calls: 41 },
    { hour: 12, calls: 29 },
    { hour: 13, calls: 33 },
    { hour: 14, calls: 37 },
    { hour: 15, calls: 44 },
    { hour: 16, calls: 52 },
    { hour: 17, calls: 48 },
    { hour: 18, calls: 36 },
    { hour: 19, calls: 18 },
    { hour: 20, calls: 7 },
    { hour: 21, calls: 2 },
    { hour: 22, calls: 0 },
    { hour: 23, calls: 0 },
  ],
  staffPerformance: [
    { name: "Sarah M.", callsHandled: 98, avgResponseTime: 9, missedCalls: 4, conversionRate: 38 },
    { name: "James K.", callsHandled: 87, avgResponseTime: 14, missedCalls: 8, conversionRate: 29 },
    { name: "Priya N.", callsHandled: 104, avgResponseTime: 11, missedCalls: 5, conversionRate: 41 },
    { name: "Tom B.", callsHandled: 58, avgResponseTime: 18, missedCalls: 11, conversionRate: 24 },
  ],
  topCallReasons: [
    { reason: "Boarding inquiry", count: 92 },
    { reason: "Grooming appointment", count: 78 },
    { reason: "Vaccination questions", count: 44 },
    { reason: "Pricing & rates", count: 38 },
    { reason: "Pickup / drop-off times", count: 31 },
    { reason: "Daycare availability", count: 29 },
    { reason: "Billing dispute", count: 14 },
    { reason: "Lost & found / emergency", count: 8 },
  ],
};

// ============================================================
// Missed Call Tasks
// ============================================================

export const missedCallTasks: MissedCallTask[] = [
  {
    id: "mct-001",
    callId: "call-missed-001",
    from: "+1 (514) 555-0198",
    clientName: "Marcus Thompson",
    callTime: "2026-04-24T09:15:00Z",
    missedBy: "James K.",
    status: "unresolved",
    assignedTo: "Sarah M.",
    autoSMSSent: true,
    notes: undefined,
  },
  {
    id: "mct-002",
    callId: "call-missed-002",
    from: "+1 (514) 555-0301",
    clientName: undefined,
    callTime: "2026-04-24T08:47:00Z",
    missedBy: "Reception",
    status: "unresolved",
    assignedTo: undefined,
    autoSMSSent: true,
    notes: undefined,
  },
  {
    id: "mct-003",
    callId: "call-missed-003",
    from: "+1 (514) 555-0421",
    clientName: "Diane Leblanc",
    callTime: "2026-04-23T17:52:00Z",
    missedBy: "Tom B.",
    status: "called_back",
    assignedTo: "Tom B.",
    autoSMSSent: true,
    callbackTime: "2026-04-24T07:30:00Z",
    notes: "Confirmed boarding dates for May. No issue.",
  },
];

// ============================================================
// Call Tags — manager-defined taxonomy of call categories.
// Staff apply these to calls; the Analytics tab charts their
// frequency so spikes (e.g. Complaint) surface fast.
// ============================================================

export const callTags: CallTag[] = [
  { id: "tag-billing", name: "Billing question", color: "orange", description: "Invoice, payment, or charge inquiry" },
  { id: "tag-complaint", name: "Complaint", color: "red", description: "Service issue needing follow-up" },
  { id: "tag-booking", name: "Booking inquiry", color: "green", description: "New or changed reservation" },
  { id: "tag-grooming", name: "Grooming question", color: "purple" },
  { id: "tag-boarding", name: "Boarding inquiry", color: "teal" },
  { id: "tag-cancellation", name: "Cancellation", color: "amber", description: "Cancelled an appointment or stay" },
  { id: "tag-vaccination", name: "Vaccination / records", color: "blue" },
  { id: "tag-general", name: "General info", color: "gray", description: "Hours, location, pricing" },
];

// ============================================================
// Smart Routing Rules — CRM-driven, evaluated before the IVR menu.
// Lowest priority number wins; the builder lets staff drag to reorder.
// ============================================================

export const callRoutingRules: CallRoutingRule[] = [
  {
    id: "route-001",
    name: "VIP callers — straight to a manager",
    condition: { field: "clientTags", operator: "includes", value: "vip" },
    action: { routeTo: "staff_group", staffGroupId: "grp-management" },
    priority: 1,
    enabled: true,
  },
  {
    id: "route-002",
    name: "Outstanding balance — route to billing",
    condition: { field: "outstandingBalance", operator: "gt", value: "0" },
    action: { routeTo: "staff_group", staffGroupId: "grp-billing" },
    priority: 2,
    enabled: true,
  },
  {
    id: "route-003",
    name: "Care alert on file — route to vet team",
    condition: { field: "careAlerts", operator: "has_any", value: "" },
    action: { routeTo: "staff_group", staffGroupId: "grp-vet" },
    priority: 3,
    enabled: true,
  },
  {
    id: "route-004",
    name: "New client — Reception with a welcome greeting",
    condition: { field: "isNewClient", operator: "is_true", value: "" },
    action: {
      routeTo: "staff_group",
      staffGroupId: "grp-reception",
      greeting:
        "Welcome to Doggieville! Since this looks like your first time calling, we'll connect you with our reception team to get you set up.",
    },
    priority: 4,
    enabled: true,
  },
];
