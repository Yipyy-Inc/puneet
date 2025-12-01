import { clients } from "./clients";

// ========================================
// MESSAGING HUB DATA
// ========================================

export interface Message {
  id: string;
  type: "email" | "sms" | "in-app";
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  subject?: string; // for emails
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  clientId?: number;
  threadId?: string;
  attachments?: {
    id: string;
    name: string;
    size: number;
    url: string;
  }[];
  hasRead: boolean;
}

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

export interface MessageTemplate {
  id: string;
  name: string;
  type: "email" | "sms";
  subject?: string;
  body: string;
  category: "reminder" | "confirmation" | "update" | "general";
  variables: string[];
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: "tmpl-001",
    name: "Booking Confirmation",
    type: "email",
    subject: "Booking Confirmed - {{pet_name}}",
    body: "Hi {{client_name}},\n\nYour booking for {{pet_name}} has been confirmed!\n\nService: {{service_type}}\nDate: {{booking_date}}\nTime: {{check_in_time}}\n\nWe look forward to seeing you!\n\nBest regards,\n{{facility_name}}",
    category: "confirmation",
    variables: ["client_name", "pet_name", "service_type", "booking_date", "check_in_time", "facility_name"],
  },
  {
    id: "tmpl-002",
    name: "24-Hour Reminder",
    type: "sms",
    body: "Hi {{client_name}}! Reminder: {{pet_name}}'s {{service_type}} appointment is tomorrow at {{appointment_time}}. See you then! - {{facility_name}}",
    category: "reminder",
    variables: ["client_name", "pet_name", "service_type", "appointment_time", "facility_name"],
  },
  {
    id: "tmpl-003",
    name: "Check-In Notice",
    type: "email",
    subject: "{{pet_name}} has been checked in!",
    body: "Hi {{client_name}},\n\n{{pet_name}} has been safely checked in at {{check_in_time}}. They're settling in nicely!\n\nWe'll keep you updated throughout their stay.\n\nBest,\n{{facility_name}}",
    category: "update",
    variables: ["client_name", "pet_name", "check_in_time", "facility_name"],
  },
];

// ========================================
// AUTOMATIONS DATA
// ========================================

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "booking_created" | "24h_before" | "check_in" | "check_out" | "payment_received" | "vaccination_expiry" | "appointment_reminder";
  enabled: boolean;
  messageType: "email" | "sms" | "both";
  templateId: string;
  conditions?: {
    serviceTypes?: string[];
    minAmount?: number;
  };
  schedule?: {
    hoursBefore?: number;
    daysBeforeExpiry?: number;
  };
  stats: {
    totalSent: number;
    lastTriggered?: string;
  };
}

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
];

// ========================================
// PET UPDATES DATA
// ========================================

export interface PetUpdate {
  id: string;
  petId: number;
  petName: string;
  clientId: number;
  updateType: "eating" | "potty" | "playtime" | "naptime" | "medication" | "grooming" | "custom";
  message: string;
  photo?: string;
  timestamp: string;
  staffName: string;
  notificationSent: boolean;
}

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

export interface CallLog {
  id: string;
  type: "inbound" | "outbound";
  from: string;
  to: string;
  clientId?: number;
  clientName?: string;
  duration: number; // in seconds
  status: "completed" | "missed" | "voicemail" | "failed";
  timestamp: string;
  recordingUrl?: string;
  transcription?: string;
  aiHandled: boolean;
  outcome?: "booking_created" | "question_answered" | "transferred_to_staff" | "voicemail_left";
  notes?: string;
}

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
    transcription: "Hi, I'd like to book a grooming appointment for my dog Buddy next Tuesday at 2 PM.",
    aiHandled: true,
    outcome: "booking_created",
    notes: "AI successfully created booking for grooming on Tuesday 2/27 at 2:00 PM",
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

export interface VoicemailSettings {
  greeting: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  transcription: boolean;
}

export const voicemailSettings: VoicemailSettings = {
  greeting: "Thank you for calling PawCare Facility. We're unable to take your call right now. Please leave a message and we'll get back to you as soon as possible.",
  emailNotifications: true,
  smsNotifications: true,
  transcription: true,
};

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    callerType?: "new" | "existing" | "vip";
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: string[];
    keywords?: string[];
  };
  action: "ai_handles" | "transfer_to_staff" | "voicemail" | "specific_extension";
  destination?: string;
}

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

export interface InternalMessage {
  id: string;
  from: string;
  message: string;
  mentions: string[]; // user IDs or names mentioned with @
  timestamp: string;
  channel: "general" | "shifts" | "urgent";
  hasRead: string[]; // user IDs who have read
}

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

