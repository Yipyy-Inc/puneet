import type {
  Campaign,
  MessageTemplate,
  Automation,
  MessagingAnalytics,
  ThreadMeta,
  InternalNote,
} from "@/types/messaging";

// ── Thread Metadata ──────────────────────────────────────────────────

export const threadMeta: ThreadMeta[] = [
  {
    threadId: "thread-1",
    status: "open",
    tags: ["vip", "boarding_now"],
    starred: true,
    assignedTo: "Sarah M.",
    lastStatusChange: "2026-04-24T10:00:00Z",
  },
  {
    threadId: "thread-2",
    status: "pending_client",
    tags: ["vaccine_expired", "overdue_payment"],
    starred: false,
    assignedTo: "James K.",
    lastStatusChange: "2026-04-23T14:30:00Z",
  },
  {
    threadId: "thread-3",
    status: "follow_up",
    tags: ["new_lead", "upsell_opportunity"],
    starred: false,
    assignedTo: "Priya N.",
    lastStatusChange: "2026-04-22T09:15:00Z",
  },
  {
    threadId: "thread-4",
    status: "resolved",
    tags: ["complaint"],
    starred: false,
    assignedTo: "Sarah M.",
    lastStatusChange: "2026-04-21T16:00:00Z",
  },
  {
    threadId: "thread-5",
    status: "open",
    tags: ["high_priority", "needs_follow_up"],
    starred: true,
    assignedTo: undefined,
    lastStatusChange: "2026-04-25T08:00:00Z",
  },
];

// ── Internal Notes ────────────────────────────────────────────────────

export const internalNotes: InternalNote[] = [
  {
    id: "note-001",
    threadId: "thread-1",
    body: "Client tends to negotiate pricing — always escalate discount requests to manager.",
    author: "Sarah M.",
    createdAt: "2026-04-20T11:00:00Z",
    pinned: true,
  },
  {
    id: "note-002",
    threadId: "thread-1",
    body: "Biscuit is reactive with small dogs. Separate from small dog playgroup during boarding.",
    author: "James K.",
    createdAt: "2026-04-22T09:30:00Z",
    pinned: false,
  },
  {
    id: "note-003",
    threadId: "thread-2",
    body: "Client asked for vaccine exception — manager approved one-week grace period for Max.",
    author: "Priya N.",
    createdAt: "2026-04-23T14:00:00Z",
    pinned: true,
  },
  {
    id: "note-004",
    threadId: "thread-3",
    body: "Interested in upgrading to monthly daycare package. Follow up after first trial day.",
    author: "Sarah M.",
    createdAt: "2026-04-21T10:00:00Z",
    pinned: false,
  },
];

// ── Message Templates ─────────────────────────────────────────────────

export const messageTemplates: MessageTemplate[] = [
  // Booking
  {
    id: "tpl-001",
    name: "Booking Confirmation",
    category: "booking",
    smsBody:
      "Hi {ClientName}! Your booking for {PetName} on {NextAppointment} is confirmed. See you soon! 🐾 – Doggieville MTL",
    emailSubject: "Your Booking is Confirmed – Doggieville MTL",
    emailBody:
      "Hi {ClientName},\n\nWe're excited to welcome {PetName} on {NextAppointment}!\n\nIf you have any questions, reply to this email or call us at (514) 555-0100.\n\nWoof regards,\nThe Doggieville MTL Team",
    variables: ["{ClientName}", "{PetName}", "{NextAppointment}"],
    charCount: 110,
  },
  {
    id: "tpl-002",
    name: "Booking Reminder – 24h",
    category: "booking",
    smsBody:
      "Reminder: {PetName}'s appointment is tomorrow at {NextAppointment}. Reply CONFIRM or CANCEL. – Doggieville MTL",
    emailSubject: "Reminder: Your Appointment Tomorrow",
    emailBody:
      "Hi {ClientName},\n\nJust a friendly reminder that {PetName} has an appointment tomorrow at {NextAppointment}.\n\nNeed to reschedule? Click here: {BookingLink}\n\nSee you tomorrow!",
    variables: ["{ClientName}", "{PetName}", "{NextAppointment}", "{BookingLink}"],
    charCount: 106,
  },
  {
    id: "tpl-003",
    name: "Booking Cancellation",
    category: "booking",
    smsBody:
      "Hi {ClientName}, your booking for {PetName} on {NextAppointment} has been cancelled. Book again at doggieville.ca – Doggieville MTL",
    emailSubject: "Your Booking Has Been Cancelled",
    emailBody:
      "Hi {ClientName},\n\nWe've cancelled your booking for {PetName} on {NextAppointment} as requested.\n\nWe'd love to see {PetName} again soon. Book online at {BookingLink}.",
    variables: ["{ClientName}", "{PetName}", "{NextAppointment}", "{BookingLink}"],
    charCount: 132,
  },
  // Boarding
  {
    id: "tpl-004",
    name: "Boarding Check-In Confirmation",
    category: "boarding",
    smsBody:
      "🐾 {PetName} has checked in! They're settling in great. We'll send updates throughout their stay. – Doggieville MTL",
    emailSubject: "{PetName} Has Checked In!",
    emailBody:
      "Hi {ClientName},\n\n{PetName} has arrived safely and is already making friends! We'll keep you posted with daily updates.\n\nFor urgent matters, call (514) 555-0100.",
    variables: ["{ClientName}", "{PetName}"],
    charCount: 113,
  },
  {
    id: "tpl-005",
    name: "Boarding Daily Update",
    category: "boarding",
    smsBody:
      "Daily update: {PetName} had a great day! Ate well, played lots, and is resting comfortably. 🐶 – Doggieville MTL",
    emailSubject: "Daily Update: {PetName} is Doing Great!",
    emailBody:
      "Hi {ClientName},\n\nHere's your daily update for {PetName}:\n\n✅ Meals: All eaten\n✅ Exercise: Playtime completed\n✅ Rest: Comfortable\n\nWe'll send another update tomorrow!",
    variables: ["{ClientName}", "{PetName}"],
    charCount: 112,
  },
  // Grooming
  {
    id: "tpl-006",
    name: "Grooming Ready for Pickup",
    category: "grooming",
    smsBody:
      "Great news! {PetName} is all groomed and ready for pickup. Looking fabulous! 🐾 – Doggieville MTL",
    emailSubject: "{PetName} is Ready for Pickup!",
    emailBody:
      "Hi {ClientName},\n\n{PetName} is freshly groomed and ready to come home! Come pick them up at your convenience.\n\nTotal: ${Balance}",
    variables: ["{ClientName}", "{PetName}", "{Balance}"],
    charCount: 97,
  },
  // Vaccination
  {
    id: "tpl-007",
    name: "Vaccine Expiry Reminder – 30 Days",
    category: "vaccination",
    smsBody:
      "Hi {ClientName}, {PetName}'s vaccines expire in 30 days. Please update to keep their booking active. – Doggieville MTL",
    emailSubject: "Action Required: {PetName}'s Vaccines Expire Soon",
    emailBody:
      "Hi {ClientName},\n\nThis is a reminder that {PetName}'s vaccinations are due for renewal within the next 30 days.\n\nUp-to-date vaccines are required for all services. Please send us the updated records.\n\nQuestions? Reply to this email.",
    variables: ["{ClientName}", "{PetName}"],
    charCount: 119,
  },
  {
    id: "tpl-008",
    name: "Vaccine Expiry – 7 Days",
    category: "vaccination",
    smsBody:
      "⚠️ {PetName}'s vaccines expire in 7 days! Please update ASAP to avoid booking suspension. – Doggieville MTL",
    emailSubject: "Urgent: {PetName}'s Vaccines Expire in 7 Days",
    emailBody:
      "Hi {ClientName},\n\nUrgent reminder: {PetName}'s vaccinations expire in 7 days. Failure to update may result in booking suspension.\n\nPlease send updated vaccine records immediately.",
    variables: ["{ClientName}", "{PetName}"],
    charCount: 108,
  },
  // Payment
  {
    id: "tpl-009",
    name: "Payment Reminder",
    category: "payment",
    smsBody:
      "Hi {ClientName}, you have an outstanding balance of {Balance}. Pay online: {BookingLink} – Doggieville MTL",
    emailSubject: "Payment Reminder – Outstanding Balance",
    emailBody:
      "Hi {ClientName},\n\nWe noticed you have an outstanding balance of {Balance}.\n\nPay securely online: {BookingLink}\n\nIf you have any questions, don't hesitate to reach out.",
    variables: ["{ClientName}", "{Balance}", "{BookingLink}"],
    charCount: 103,
  },
  // General
  {
    id: "tpl-010",
    name: "Birthday Message",
    category: "general",
    smsBody:
      "🎂 Happy Birthday {PetName}! Wishing them lots of treats and belly rubs today! – Doggieville MTL",
    emailSubject: "Happy Birthday {PetName}! 🎂",
    emailBody:
      "Hi {ClientName},\n\nToday is {PetName}'s birthday! 🎂🐾\n\nWe hope they have a wonderful day filled with treats, cuddles, and play. From all of us at Doggieville MTL – Happy Birthday {PetName}!",
    variables: ["{ClientName}", "{PetName}"],
    charCount: 97,
  },
  {
    id: "tpl-011",
    name: "Post-Visit Feedback Request",
    category: "general",
    smsBody:
      "Hi {ClientName}! Hope {PetName} had a great time with us. Share your experience: {BookingLink} – Doggieville MTL",
    emailSubject: "How Was Your Visit? Leave Us a Review!",
    emailBody:
      "Hi {ClientName},\n\nThank you for choosing Doggieville MTL! We hope {PetName} had a wonderful time.\n\nWe'd love to hear your feedback: {BookingLink}\n\nYour review helps other pet parents find us!",
    variables: ["{ClientName}", "{PetName}", "{BookingLink}"],
    charCount: 113,
  },
  {
    id: "tpl-012",
    name: "Missed Call Auto-Reply",
    category: "general",
    smsBody:
      "Hi! Sorry we missed your call at Doggieville MTL. How can we help? Reply here or call (514) 555-0100.",
    variables: ["{ClientName}"],
    charCount: 100,
  },
];

// ── Campaigns ─────────────────────────────────────────────────────────

export const campaigns: Campaign[] = [
  {
    id: "camp-001",
    name: "Easter Long Weekend – Boarding Promo",
    channel: "sms",
    status: "sent",
    audience: "all_active",
    recipientCount: 284,
    message:
      "🐾 Easter is coming! Book boarding for your pup April 18–22 and get 10% off with code EASTER10. Limited spots! doggieville.ca/book – Doggieville MTL",
    scheduledAt: "2026-04-10T09:00:00Z",
    sentAt: "2026-04-10T09:01:22Z",
    smsCost: 14.2,
    smsSegments: 2,
    deliveryRate: 97.5,
    createdAt: "2026-04-08T11:00:00Z",
    createdBy: "Sophie R.",
  },
  {
    id: "camp-002",
    name: "Spring Grooming Special",
    channel: "email",
    status: "sent",
    audience: "grooming_clients",
    recipientCount: 143,
    message: "Spring is here! Treat your pup to a full groom this season...",
    subject: "🌸 Spring Grooming Special – 15% Off This Month!",
    sentAt: "2026-04-05T10:00:00Z",
    openRate: 38.5,
    clickRate: 12.3,
    deliveryRate: 99.1,
    createdAt: "2026-04-03T14:00:00Z",
    createdBy: "Sarah M.",
  },
  {
    id: "camp-003",
    name: "Vaccine Expiry Reminder Blast",
    channel: "sms",
    status: "sent",
    audience: "vaccine_expired",
    recipientCount: 67,
    message:
      "⚠️ Hi {ClientName}, {PetName}'s vaccines have expired. Please update to avoid booking suspension. – Doggieville MTL",
    sentAt: "2026-04-18T08:00:00Z",
    smsCost: 3.35,
    smsSegments: 1,
    deliveryRate: 94.0,
    createdAt: "2026-04-17T16:00:00Z",
    createdBy: "Priya N.",
  },
  {
    id: "camp-004",
    name: "Re-engage Inactive Clients",
    channel: "email",
    status: "scheduled",
    audience: "inactive_6m",
    recipientCount: 112,
    message: "We miss you and your pup! Come back and enjoy a special returning client offer...",
    subject: "We Miss You! 🐾 A Special Offer Inside",
    scheduledAt: "2026-04-28T10:00:00Z",
    createdAt: "2026-04-24T09:00:00Z",
    createdBy: "Sophie R.",
  },
  {
    id: "camp-005",
    name: "Membership Renewal Reminder",
    channel: "sms",
    status: "draft",
    audience: "membership_holders",
    recipientCount: 89,
    message:
      "Hi {ClientName}, your Doggieville membership renews soon! Ensure uninterrupted benefits at doggieville.ca/membership",
    smsCost: 4.45,
    smsSegments: 1,
    createdAt: "2026-04-24T15:30:00Z",
    createdBy: "Sarah M.",
  },
];

// ── Automations ────────────────────────────────────────────────────────

export const automations: Automation[] = [
  {
    id: "auto-001",
    name: "Booking Confirmation SMS",
    trigger: "booking_confirmed",
    channel: "sms",
    templateId: "tpl-001",
    message:
      "Hi {ClientName}! Your booking for {PetName} on {NextAppointment} is confirmed. See you soon! 🐾 – Doggieville MTL",
    delayMinutes: 0,
    enabled: true,
    sentCount: 1247,
    lastTriggered: "2026-04-25T07:45:00Z",
  },
  {
    id: "auto-002",
    name: "Appointment Reminder – 24h",
    trigger: "booking_confirmed",
    channel: "sms",
    templateId: "tpl-002",
    message:
      "Reminder: {PetName}'s appointment is tomorrow at {NextAppointment}. Reply CONFIRM or CANCEL.",
    delayMinutes: -1440,
    enabled: true,
    sentCount: 889,
    lastTriggered: "2026-04-24T09:00:00Z",
  },
  {
    id: "auto-003",
    name: "Boarding Check-In Notification",
    trigger: "boarding_check_in",
    channel: "sms",
    templateId: "tpl-004",
    message:
      "🐾 {PetName} has checked in! They're settling in great. We'll send updates throughout their stay.",
    delayMinutes: 0,
    enabled: true,
    sentCount: 342,
    lastTriggered: "2026-04-25T08:15:00Z",
  },
  {
    id: "auto-004",
    name: "Vaccine Expiry – 30 Day Warning",
    trigger: "vaccine_expiring_30d",
    channel: "email",
    templateId: "tpl-007",
    message:
      "Hi {ClientName}, {PetName}'s vaccines expire in 30 days. Please update to keep their booking active.",
    delayMinutes: 0,
    enabled: true,
    sentCount: 198,
    lastTriggered: "2026-04-20T07:00:00Z",
  },
  {
    id: "auto-005",
    name: "Vaccine Expiry – 7 Day Urgent",
    trigger: "vaccine_expiring_7d",
    channel: "sms",
    templateId: "tpl-008",
    message: "⚠️ {PetName}'s vaccines expire in 7 days! Please update ASAP to avoid booking suspension.",
    delayMinutes: 0,
    enabled: true,
    sentCount: 87,
    lastTriggered: "2026-04-23T07:00:00Z",
  },
  {
    id: "auto-006",
    name: "Missed Call Auto-SMS",
    trigger: "missed_call",
    channel: "sms",
    templateId: "tpl-012",
    message:
      "Hi! Sorry we missed your call at Doggieville MTL. How can we help? Reply here or call (514) 555-0100.",
    delayMinutes: 2,
    enabled: true,
    sentCount: 214,
    lastTriggered: "2026-04-24T16:30:00Z",
  },
  {
    id: "auto-007",
    name: "Abandoned Booking Recovery",
    trigger: "abandoned_booking",
    channel: "sms",
    message:
      "Hi {ClientName}! Looks like you left before completing your booking. Complete it here: {BookingLink}",
    delayMinutes: 60,
    enabled: true,
    sentCount: 156,
    lastTriggered: "2026-04-24T18:00:00Z",
  },
  {
    id: "auto-008",
    name: "Post-Visit Feedback Request",
    trigger: "post_visit_24h",
    channel: "email",
    templateId: "tpl-011",
    message: "How was your visit? We'd love to hear your feedback.",
    delayMinutes: 1440,
    enabled: true,
    sentCount: 421,
    lastTriggered: "2026-04-24T10:00:00Z",
  },
  {
    id: "auto-009",
    name: "Birthday Greeting",
    trigger: "birthday",
    channel: "sms",
    templateId: "tpl-010",
    message: "🎂 Happy Birthday {PetName}! Wishing them lots of treats and belly rubs today!",
    delayMinutes: 0,
    enabled: true,
    sentCount: 94,
    lastTriggered: "2026-04-22T08:00:00Z",
  },
  {
    id: "auto-010",
    name: "Payment Overdue Reminder",
    trigger: "payment_overdue",
    channel: "sms",
    message:
      "Hi {ClientName}, you have an outstanding balance of {Balance}. Please settle to avoid service interruption.",
    delayMinutes: 0,
    enabled: false,
    sentCount: 38,
    lastTriggered: "2026-04-15T09:00:00Z",
  },
];

// ── Messaging Analytics ───────────────────────────────────────────────

export const messagingAnalytics: MessagingAnalytics = {
  period: "Last 30 days",
  totalSent: 2847,
  smsSent: 1643,
  emailSent: 891,
  chatMessages: 313,
  emailOpenRate: 36.8,
  avgResponseTimeMin: 14,
  avgResolutionTimeHours: 3.2,
  conversionRate: 28,
  revenueInfluenced: 12340,
  missedChats: 18,
  hourlyVolume: [
    { hour: 0, messages: 2 },
    { hour: 1, messages: 0 },
    { hour: 2, messages: 0 },
    { hour: 3, messages: 0 },
    { hour: 4, messages: 0 },
    { hour: 5, messages: 1 },
    { hour: 6, messages: 5 },
    { hour: 7, messages: 18 },
    { hour: 8, messages: 47 },
    { hour: 9, messages: 89 },
    { hour: 10, messages: 112 },
    { hour: 11, messages: 98 },
    { hour: 12, messages: 67 },
    { hour: 13, messages: 78 },
    { hour: 14, messages: 103 },
    { hour: 15, messages: 118 },
    { hour: 16, messages: 134 },
    { hour: 17, messages: 121 },
    { hour: 18, messages: 89 },
    { hour: 19, messages: 43 },
    { hour: 20, messages: 21 },
    { hour: 21, messages: 8 },
    { hour: 22, messages: 3 },
    { hour: 23, messages: 1 },
  ],
  channelBreakdown: [
    { channel: "SMS", count: 1643, pct: 57.7 },
    { channel: "Email", count: 891, pct: 31.3 },
    { channel: "Chat", count: 313, pct: 11.0 },
  ],
  topThreadTags: [
    { tag: "boarding_now", count: 78 },
    { tag: "vaccine_expired", count: 54 },
    { tag: "overdue_payment", count: 41 },
    { tag: "new_lead", count: 37 },
    { tag: "high_priority", count: 29 },
    { tag: "vip", count: 24 },
  ],
  statusBreakdown: [
    { status: "resolved", count: 312 },
    { status: "open", count: 89 },
    { status: "pending_client", count: 47 },
    { status: "follow_up", count: 38 },
    { status: "archived", count: 156 },
  ],
  staffPerformance: [
    { name: "Sarah M.", replied: 312, avgResponseMin: 11, resolved: 298, csat: 4.8 },
    { name: "James K.", replied: 241, avgResponseMin: 17, resolved: 218, csat: 4.4 },
    { name: "Priya N.", replied: 287, avgResponseMin: 13, resolved: 271, csat: 4.7 },
    { name: "Tom B.", replied: 168, avgResponseMin: 22, resolved: 145, csat: 4.1 },
  ],
};
