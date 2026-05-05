import type { SavedReply } from "@/types/saved-replies";

export const savedReplies: SavedReply[] = [
  {
    id: "sr-001",
    shortcut: "boarding-rates",
    title: "Boarding rates",
    body: "Our boarding rates start at $55/night for standard, $75/night for deluxe suites, and $95/night for our luxury room. All include 3 meals, 4 walks, and constant supervision. Let me know which option works for {PetName}!",
    category: "boarding",
    createdBy: "Sarah M.",
    createdAt: "2026-04-10T10:00:00Z",
    useCount: 47,
  },
  {
    id: "sr-002",
    shortcut: "boarding-checkin",
    title: "Boarding check-in instructions",
    body: "Check-in is between 7am-10am. Please bring {PetName}'s vaccine records, food (in labelled bags), and any medications with written instructions. Side gate parking is free for drop-offs!",
    category: "boarding",
    createdBy: "Sarah M.",
    createdAt: "2026-04-08T09:30:00Z",
    useCount: 32,
  },
  {
    id: "sr-003",
    shortcut: "boarding-vaccines",
    title: "Vaccine requirements",
    body: "For boarding, we require up-to-date Rabies, DHPP, and Bordetella (within 12 months). Please email or text a photo of {PetName}'s current vaccine certificate before check-in.",
    category: "boarding",
    createdBy: "Manager",
    createdAt: "2026-04-05T11:00:00Z",
    useCount: 28,
  },

  {
    id: "sr-004",
    shortcut: "grooming-packages",
    title: "Grooming packages",
    body: "We offer Bath & Brush ($45), Full Groom ($75-$110 by size), and our Spa Package ($120) with paw balm, blueberry facial, and de-shed treatment. {PetName}'s breed typically takes about 90 minutes.",
    category: "grooming",
    createdBy: "Priya N.",
    createdAt: "2026-04-12T14:00:00Z",
    useCount: 41,
  },
  {
    id: "sr-005",
    shortcut: "grooming-pickup",
    title: "Ready for pickup",
    body: "Great news — {PetName} is all groomed and looking fabulous! 🐾 Ready for pickup any time before 6pm. Total today is {Balance}.",
    category: "grooming",
    createdBy: "Priya N.",
    createdAt: "2026-04-11T16:30:00Z",
    useCount: 89,
  },

  {
    id: "sr-006",
    shortcut: "daycare-trial",
    title: "Daycare trial day",
    body: "We'd love to have {PetName} for a trial day! Trials are $35 (regular rate $48) and include a temperament assessment. Available Monday-Friday 7am-7pm. What day works best?",
    category: "daycare",
    createdBy: "Sarah M.",
    createdAt: "2026-04-09T10:30:00Z",
    useCount: 22,
  },
  {
    id: "sr-007",
    shortcut: "daycare-packages",
    title: "Daycare packages",
    body: "Daily: $48 · 5-pack: $220 ($44/day) · 10-pack: $420 ($42/day) · Monthly unlimited: $650. All packages are valid for 6 months and shareable across pets in the same household.",
    category: "daycare",
    createdBy: "Manager",
    createdAt: "2026-04-07T12:00:00Z",
    useCount: 35,
  },

  {
    id: "sr-008",
    shortcut: "pricing-services",
    title: "All service pricing",
    body: "Here's our full pricing: Daycare $48/day · Boarding from $55/night · Grooming $45-$120 · Training $80/session. Multi-service discounts available — happy to put together a custom quote!",
    category: "pricing",
    createdBy: "Manager",
    createdAt: "2026-04-06T11:00:00Z",
    useCount: 56,
  },
  {
    id: "sr-009",
    shortcut: "pricing-payment",
    title: "Payment methods",
    body: "We accept all major credit cards, Interac e-Transfer (info@doggieville.ca), and cash. Memberships and packages can be paid in installments — just ask!",
    category: "pricing",
    createdBy: "Sarah M.",
    createdAt: "2026-04-04T15:00:00Z",
    useCount: 18,
  },

  {
    id: "sr-010",
    shortcut: "thanks",
    title: "Quick thanks",
    body: "Thanks so much {ClientName}! Let us know if you need anything else 🐾",
    category: "general",
    createdBy: "Sarah M.",
    createdAt: "2026-04-01T09:00:00Z",
    useCount: 142,
  },
  {
    id: "sr-011",
    shortcut: "callback",
    title: "Will call back",
    body: "Hi {ClientName} — got your message. I'll call you back within the hour to go over everything. Talk soon!",
    category: "general",
    createdBy: "James K.",
    createdAt: "2026-04-02T10:00:00Z",
    useCount: 78,
  },
  {
    id: "sr-012",
    shortcut: "hours",
    title: "Business hours",
    body: "We're open Monday-Friday 7am-7pm, Saturday 8am-5pm, and closed Sundays. After-hours pickup by appointment for boarding clients!",
    category: "general",
    createdBy: "Manager",
    createdAt: "2026-03-30T14:00:00Z",
    useCount: 64,
  },
  {
    id: "sr-013",
    shortcut: "directions",
    title: "Directions to facility",
    body: "We're at 1234 Saint-Laurent Blvd, Montreal. Free parking on the side street. The entrance is the bright blue door — you can't miss it! 🐶",
    category: "general",
    createdBy: "Sarah M.",
    createdAt: "2026-04-03T11:00:00Z",
    useCount: 51,
  },
];

// Scheduled messages

export interface ScheduledMessage {
  id: string;
  threadId: string;
  clientName: string;
  body: string;
  channel: "sms" | "email" | "in-app";
  scheduledFor: string;
  createdAt: string;
  createdBy: string;
}

export const scheduledMessages: ScheduledMessage[] = [
  {
    id: "sched-001",
    threadId: "thread-1",
    clientName: "Sophie Rousseau",
    body: "Just a friendly reminder that Biscuit's boarding starts tomorrow at 8am. We can't wait to see them!",
    channel: "sms",
    scheduledFor: "2026-05-05T09:00:00Z",
    createdAt: "2026-05-04T19:00:00Z",
    createdBy: "Sarah M.",
  },
  {
    id: "sched-002",
    threadId: "thread-3",
    clientName: "Alice Johnson",
    body: "Hi Alice — following up on the daycare trial we discussed. Were you still thinking of bringing Bella in this week?",
    channel: "sms",
    scheduledFor: "2026-05-05T15:00:00Z",
    createdAt: "2026-05-04T11:00:00Z",
    createdBy: "Priya N.",
  },
  {
    id: "sched-003",
    threadId: "thread-2",
    clientName: "John Doe",
    body: "Reminder: Max's vaccinations expire in 7 days. Please send updated records to keep boarding bookings active.",
    channel: "email",
    scheduledFor: "2026-05-06T10:00:00Z",
    createdAt: "2026-05-04T08:30:00Z",
    createdBy: "James K.",
  },
];

// Staff for assignment

export interface MessagingStaff {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  avatar?: string;
}

export const messagingStaff: MessagingStaff[] = [
  { id: "staff-1", name: "Sarah M.", role: "Manager", initials: "SM", color: "bg-rose-500" },
  { id: "staff-2", name: "James K.", role: "Boarding Lead", initials: "JK", color: "bg-blue-500" },
  { id: "staff-3", name: "Priya N.", role: "Grooming Lead", initials: "PN", color: "bg-violet-500" },
  { id: "staff-4", name: "Marcus T.", role: "Daycare", initials: "MT", color: "bg-emerald-500" },
  { id: "staff-5", name: "Sophie R.", role: "Reception", initials: "SR", color: "bg-amber-500" },
];

// Pet care alerts (mocked at the conversation level)

export interface PetCareAlert {
  petId: number;
  type: "medication" | "allergy" | "behavior";
  text: string;
}

export const petCareAlerts: PetCareAlert[] = [
  { petId: 1, type: "medication", text: "Apoquel 16mg — daily with morning meal" },
  { petId: 1, type: "allergy", text: "Chicken-based treats" },
  { petId: 2, type: "behavior", text: "Reactive with small dogs — keep separated" },
  { petId: 3, type: "medication", text: "Joint supplement w/ dinner" },
  { petId: 5, type: "allergy", text: "Beef and lamb" },
  { petId: 5, type: "behavior", text: "Fearful of thunder — keep indoors during storms" },
];

// Conversation assignments and open/closed state seeds

export const conversationAssignments: Record<string, string> = {
  "thread-1": "staff-1",
  "thread-2": "staff-2",
  "thread-3": "staff-3",
  "thread-4": "staff-1",
  "thread-5": "staff-2",
};

export const closedThreadIds: string[] = ["thread-4"];

// Thread-to-location mapping for multi-location filter

export const threadLocationMap: Record<string, string> = {
  "thread-1": "loc-dv-main",
  "thread-2": "loc-dv-main",
  "thread-3": "loc-dv-plateau",
  "thread-4": "loc-dv-plateau",
  "thread-5": "loc-dv-main",
};
