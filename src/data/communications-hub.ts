// ========================================
// MESSAGING HUB DATA
// ========================================

import type {
  Message,
  MessageTemplate,
  AutomationRule,
  PetUpdate,
  CallLog,
  RoutingRule,
  InternalMessage,
} from "@/types/communications";

export type {
  Message,
  MessageTemplate,
  AutomationRule,
  PetUpdate,
  CallLog,
  RoutingRule,
  InternalMessage,
};

export const messages: Message[] = [
  {
    id: "msg-001",
    type: "email",
    direction: "inbound",
    from: "sarah.johnson@email.com",
    to: "facility@pawcare.com",
    subject: "Question about boarding rates",
    body: "Hi, I'd like to know your rates for boarding a medium-sized dog for 5 days. Do you have availability next week? Thanks!",
    status: "read",
    timestamp: "2024-02-20T14:30:00Z",
    clientId: 1,
    threadId: "thread-001",
    hasRead: true,
  },
  {
    id: "msg-002",
    type: "email",
    direction: "outbound",
    from: "facility@pawcare.com",
    to: "sarah.johnson@email.com",
    subject: "Re: Question about boarding rates",
    body: "Hi Sarah! Our medium dog boarding rates are $45/night. We do have availability next week. Would you like to book? Let me know!",
    status: "delivered",
    timestamp: "2024-02-20T15:15:00Z",
    clientId: 1,
    threadId: "thread-001",
    hasRead: false,
  },
  {
    id: "msg-003",
    type: "sms",
    direction: "outbound",
    from: "+1234567890",
    to: "+1987654321",
    body: "Reminder: Max's grooming appointment is tomorrow at 10:00 AM. See you then!",
    status: "delivered",
    timestamp: "2024-02-21T09:00:00Z",
    clientId: 2,
    threadId: "thread-002",
    hasRead: false,
  },
  {
    id: "msg-004",
    type: "in-app",
    direction: "inbound",
    from: "Client Portal - Sarah Johnson",
    to: "Facility Staff",
    body: "Can I add an extra play session to Buddy's booking?",
    status: "read",
    timestamp: "2024-02-21T11:30:00Z",
    clientId: 1,
    threadId: "thread-003",
    hasRead: true,
  },
  {
    id: "msg-005",
    type: "sms",
    direction: "inbound",
    from: "+1987654321",
    to: "+1234567890",
    body: "Yes, confirmed for tomorrow. Thanks!",
    status: "read",
    timestamp: "2024-02-21T09:15:00Z",
    clientId: 2,
    threadId: "thread-002",
    hasRead: true,
  },
];

export const messageTemplates: MessageTemplate[] = [
  {
    id: "tmpl-001",
    name: "Booking Confirmation",
    type: "email",
    subject: "Booking Confirmed - {{pet_name}}",
    body: "Hi {{customer_full_name}},\n\nYour booking for {{pet_name}} has been confirmed!\n\nService: {{service_name}}\nDate: {{booking_date}}\nTime: {{check_in_time}}\n\nWe look forward to seeing you!\n\nBest regards,\n{{facility_name}}",
    category: "confirmation",
    variables: [
      "customer_full_name",
      "pet_name",
      "service_name",
      "booking_date",
      "check_in_time",
      "facility_name",
    ],
  },
  {
    id: "tmpl-002",
    name: "24-Hour Reminder",
    type: "sms",
    body: "Hi {{customer_full_name}}! Reminder: {{pet_name}}'s {{service_name}} appointment is tomorrow at {{booking_time}}. See you then! - {{facility_name}}",
    category: "reminder",
    variables: [
      "customer_full_name",
      "pet_name",
      "service_name",
      "booking_time",
      "facility_name",
    ],
  },
  {
    id: "tmpl-003",
    name: "Check-In Notice",
    type: "email",
    subject: "{{pet_name}} has been checked in!",
    body: "Hi {{customer_full_name}},\n\n{{pet_name}} has been safely checked in at {{check_in_time}}. They're settling in nicely!\n\nWe'll keep you updated throughout their stay.\n\nBest,\n{{facility_name}}",
    category: "update",
    variables: [
      "customer_full_name",
      "pet_name",
      "check_in_time",
      "facility_name",
    ],
  },
  {
    id: "tmpl-004",
    name: "Check-Out Notice",
    type: "email",
    subject: "{{pet_name}} is ready for pickup!",
    body: "Hi {{customer_full_name}},\n\n{{pet_name}} is all ready for pickup! Check-out is available from {{check_out_time}}.\n\nWe hope {{pet_name}} had a wonderful time. See you next time!\n\nBest,\n{{facility_name}}",
    category: "update",
    variables: [
      "customer_full_name",
      "pet_name",
      "check_out_time",
      "facility_name",
    ],
  },
  {
    id: "tmpl-005",
    name: "Check-Out Notice (SMS)",
    type: "sms",
    body: "Hi {{customer_full_name}}! {{pet_name}} is ready for pickup at {{check_out_time}}. See you soon! - {{facility_name}}",
    category: "update",
    variables: [
      "customer_full_name",
      "pet_name",
      "check_out_time",
      "facility_name",
    ],
  },
  {
    id: "tmpl-006",
    name: "Payment Receipt",
    type: "email",
    subject: "Payment Received - {{invoice_id}}",
    body: "Hi {{customer_full_name}},\n\nWe've received your payment of {{amount_paid}} for {{service_name}}.\n\nInvoice: {{invoice_id}}\nDate: {{booking_date}}\n\nView your receipt: {{receipt_link}}\n\nThank you for choosing {{facility_name}}!",
    category: "confirmation",
    variables: [
      "customer_full_name",
      "amount_paid",
      "service_name",
      "invoice_id",
      "booking_date",
      "receipt_link",
      "facility_name",
    ],
  },
  {
    id: "tmpl-007",
    name: "Overdue Invoice Reminder",
    type: "email",
    subject: "Payment Reminder - {{amount_due}} due",
    body: "Hi {{customer_full_name}},\n\nThis is a friendly reminder that invoice {{invoice_id}} for {{amount_due}} is past due.\n\nDue date: {{due_date}}\n\nPay now: {{payment_link}}\n\nIf you've already made this payment, please disregard this message.\n\nThank you,\n{{facility_name}}",
    category: "reminder",
    variables: [
      "customer_full_name",
      "invoice_id",
      "amount_due",
      "due_date",
      "payment_link",
      "facility_name",
    ],
  },
  {
    id: "tmpl-008",
    name: "YipyyGo Pre-Arrival",
    type: "sms",
    body: "Hi {{customer_full_name}}! Please complete {{pet_name}}'s pre-arrival form before your visit on {{booking_date}}: {{yipyygo_link}} - {{facility_name}}",
    category: "reminder",
    variables: [
      "customer_full_name",
      "pet_name",
      "booking_date",
      "yipyygo_link",
      "facility_name",
    ],
  },
];

// ========================================
// AUTOMATIONS DATA
// ========================================

export const automationRules: AutomationRule[] = [
  {
    id: "auto-001",
    name: "Booking Confirmation",
    trigger: "booking_created",
    enabled: true,
    messageType: "email",
    templateId: "tmpl-001",
    stats: {
      totalSent: 234,
      lastTriggered: "2024-02-21T10:30:00Z",
    },
  },
  {
    id: "auto-002",
    name: "24-Hour Reminder",
    trigger: "24h_before",
    enabled: true,
    messageType: "sms",
    templateId: "tmpl-002",
    schedule: {
      hoursBefore: 24,
    },
    stats: {
      totalSent: 189,
      lastTriggered: "2024-02-21T09:00:00Z",
    },
  },
  {
    id: "auto-003",
    name: "Check-In Notice",
    trigger: "check_in",
    enabled: true,
    messageType: "email",
    templateId: "tmpl-003",
    stats: {
      totalSent: 156,
      lastTriggered: "2024-02-21T08:15:00Z",
    },
  },
  {
    id: "auto-004",
    name: "Check-Out Notice",
    trigger: "check_out",
    enabled: true,
    messageType: "both",
    templateId: "tmpl-004",
    stats: {
      totalSent: 142,
      lastTriggered: "2024-02-20T17:30:00Z",
    },
  },
  {
    id: "auto-005",
    name: "Payment Receipt",
    trigger: "payment_received",
    enabled: true,
    messageType: "email",
    templateId: "tmpl-005",
    conditions: {
      minAmount: 0,
    },
    stats: {
      totalSent: 267,
      lastTriggered: "2024-02-21T14:20:00Z",
    },
  },
  {
    id: "auto-006",
    name: "Vaccination Expiry Warning",
    trigger: "vaccination_expiry",
    enabled: true,
    messageType: "email",
    templateId: "tmpl-006",
    schedule: {
      daysBeforeExpiry: 30,
    },
    stats: {
      totalSent: 45,
      lastTriggered: "2024-02-15T08:00:00Z",
    },
  },
  {
    id: "auto-007",
    name: "Grooming Appointment Reminder",
    trigger: "appointment_reminder",
    enabled: true,
    messageType: "sms",
    templateId: "tmpl-007",
    conditions: {
      serviceTypes: ["grooming"],
    },
    schedule: {
      hoursBefore: 24,
    },
    stats: {
      totalSent: 78,
      lastTriggered: "2024-02-20T10:00:00Z",
    },
  },
  // ---- 7.2 Form Automation Rules ----
  {
    id: "auto-form-001",
    name: "Form Link Sent Confirmation",
    trigger: "form_link_sent" as const,
    enabled: true,
    messageType: "email" as const,
    templateId: "tmpl-form-link",
    stats: {
      totalSent: 92,
      lastTriggered: "2026-03-24T14:00:00Z",
    },
  },
  {
    id: "auto-form-002",
    name: "Form Started Notification",
    trigger: "form_started" as const,
    enabled: false,
    messageType: "email" as const,
    templateId: "tmpl-form-started",
    stats: {
      totalSent: 0,
    },
  },
  {
    id: "auto-form-003",
    name: "Form Submitted — Thank You",
    trigger: "form_submitted" as const,
    enabled: true,
    messageType: "email" as const,
    templateId: "tmpl-form-submitted",
    stats: {
      totalSent: 148,
      lastTriggered: "2026-03-25T09:30:00Z",
    },
  },
  {
    id: "auto-form-004",
    name: "Incomplete Form Reminder",
    trigger: "form_incomplete_by_deadline" as const,
    enabled: true,
    messageType: "both" as const,
    templateId: "tmpl-form-deadline",
    schedule: {
      hoursBefore: 24,
    },
    stats: {
      totalSent: 34,
      lastTriggered: "2026-03-23T08:00:00Z",
    },
  },
  {
    id: "auto-form-005",
    name: "Red Flag Answer Alert (Staff)",
    trigger: "form_red_flag_answer" as const,
    enabled: true,
    messageType: "email" as const,
    templateId: "tmpl-form-redflag",
    stats: {
      totalSent: 7,
      lastTriggered: "2026-03-20T11:45:00Z",
    },
  },
];

// ========================================
// PET UPDATES DATA
// ========================================

export const petUpdates: PetUpdate[] = [
  {
    id: "update-001",
    petId: 1,
    petName: "Buddy",
    clientId: 1,
    updateType: "eating",
    message: "Buddy enjoyed his lunch! Ate all his food.",
    timestamp: "2024-02-21T12:30:00Z",
    staffName: "Sarah Johnson",
    notificationSent: true,
  },
  {
    id: "update-002",
    petId: 1,
    petName: "Buddy",
    clientId: 1,
    updateType: "playtime",
    message: "Had a great play session in the yard with other dogs!",
    photo: "/images/buddy-playing.jpg",
    timestamp: "2024-02-21T14:15:00Z",
    staffName: "Mike Davis",
    notificationSent: true,
  },
  {
    id: "update-003",
    petId: 2,
    petName: "Max",
    clientId: 2,
    updateType: "naptime",
    message: "Max is taking a nice nap after playtime.",
    timestamp: "2024-02-21T15:00:00Z",
    staffName: "Emily Brown",
    notificationSent: true,
  },
  {
    id: "update-004",
    petId: 1,
    petName: "Buddy",
    clientId: 1,
    updateType: "potty",
    message: "Potty break completed - all good!",
    timestamp: "2024-02-21T10:45:00Z",
    staffName: "Sarah Johnson",
    notificationSent: true,
  },
];

// ========================================
// AI RECEPTIONIST / CALLING DATA
// ========================================

export const callLogs: CallLog[] = [
  {
    id: "call-001",
    type: "inbound",
    from: "+1987654321",
    to: "+1234567890",
    clientId: 1,
    clientName: "Sarah Johnson",
    duration: 180,
    status: "completed",
    timestamp: "2024-02-21T09:30:00Z",
    recordingUrl: "/recordings/call-001.mp3",
    transcription:
      "Hi, I'd like to book a grooming appointment for my dog Buddy next Tuesday at 2 PM.",
    aiHandled: true,
    outcome: "booking_created",
    notes:
      "AI successfully created booking for grooming on Tuesday 2/27 at 2:00 PM",
  },
  {
    id: "call-002",
    type: "inbound",
    from: "+1555123456",
    to: "+1234567890",
    clientName: "New Caller",
    duration: 45,
    status: "voicemail",
    timestamp: "2024-02-21T11:15:00Z",
    recordingUrl: "/recordings/call-002.mp3",
    aiHandled: false,
    outcome: "voicemail_left",
    notes: "Caller asked about boarding rates, left voicemail",
  },
  {
    id: "call-003",
    type: "inbound",
    from: "+1444987654",
    to: "+1234567890",
    clientId: 2,
    clientName: "Mike Davis",
    duration: 120,
    status: "completed",
    timestamp: "2024-02-21T13:45:00Z",
    recordingUrl: "/recordings/call-003.mp3",
    transcription: "I need to cancel my booking for tomorrow. Can you help?",
    aiHandled: true,
    outcome: "transferred_to_staff",
    notes: "AI transferred to staff for cancellation processing",
  },
  {
    id: "call-004",
    type: "outbound",
    from: "+1234567890",
    to: "+1987654321",
    clientId: 1,
    clientName: "Sarah Johnson",
    duration: 90,
    status: "completed",
    timestamp: "2024-02-20T15:30:00Z",
    recordingUrl: "/recordings/call-004.mp3",
    aiHandled: false,
    notes: "Staff called to confirm vaccination documents",
  },
];

export const routingRules: RoutingRule[] = [
  {
    id: "route-001",
    name: "VIP Customers - Direct to Manager",
    enabled: true,
    priority: 1,
    conditions: {
      callerType: "vip",
    },
    action: "transfer_to_staff",
    destination: "Manager - Sarah Johnson",
  },
  {
    id: "route-002",
    name: "New Bookings - AI Handles",
    enabled: true,
    priority: 2,
    conditions: {
      keywords: ["booking", "appointment", "reserve", "schedule"],
    },
    action: "ai_handles",
  },
  {
    id: "route-003",
    name: "After Hours - Voicemail",
    enabled: true,
    priority: 3,
    conditions: {
      timeOfDay: { start: "18:00", end: "08:00" },
    },
    action: "voicemail",
  },
  {
    id: "route-004",
    name: "Business Hours - AI First",
    enabled: true,
    priority: 4,
    conditions: {
      timeOfDay: { start: "08:00", end: "18:00" },
      dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    action: "ai_handles",
  },
];

// ========================================
// INTERNAL COMMUNICATIONS DATA
// ========================================

export const internalMessages: InternalMessage[] = [
  {
    id: "int-001",
    from: "Sarah Johnson",
    message: "@Mike can you check on Buddy in kennel 5? Owner wants an update.",
    mentions: ["Mike"],
    timestamp: "2024-02-21T14:30:00Z",
    channel: "general",
    hasRead: ["Sarah Johnson"],
  },
  {
    id: "int-002",
    from: "Mike Davis",
    message: "@all Reminder: Deep cleaning scheduled for Saturday morning",
    mentions: ["all"],
    timestamp: "2024-02-21T10:00:00Z",
    channel: "general",
    hasRead: ["Sarah Johnson", "Mike Davis", "Emily Brown"],
  },
  {
    id: "int-003",
    from: "Emily Brown",
    message: "@Sarah The vaccination records for Max just came in",
    mentions: ["Sarah"],
    timestamp: "2024-02-21T11:15:00Z",
    channel: "urgent",
    hasRead: ["Emily Brown", "Sarah Johnson"],
  },
];
