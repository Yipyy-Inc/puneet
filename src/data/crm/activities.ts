export type ActivityType = "call" | "email" | "meeting" | "note" | "task";

export type ActivityStatus = "completed" | "pending" | "overdue" | "cancelled";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description: string;
  leadId?: string;
  dealId?: string;
  contactId?: string;
  assignedTo: string;
  assignedToName: string;
  dueDate?: string;
  completedAt?: string;
  status: ActivityStatus;
  notes?: string;
  duration?: number; // in minutes for calls/meetings
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskReminder {
  id: string;
  activityId: string;
  reminderDate: string;
  isRead: boolean;
  createdAt: string;
}

export const activityTypes: {
  value: ActivityType;
  label: string;
  icon: string;
}[] = [
  { value: "call", label: "Phone Call", icon: "Phone" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "meeting", label: "Meeting", icon: "Calendar" },
  { value: "note", label: "Note", icon: "FileText" },
  { value: "task", label: "Task", icon: "CheckSquare" },
];

export const activities: Activity[] = [
  {
    id: "act-001",
    type: "call",
    subject: "Initial Discovery Call",
    description:
      "Discussed their current pet management challenges and pain points.",
    leadId: "lead-001",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    completedAt: "2025-01-10T14:30:00Z",
    status: "completed",
    duration: 25,
    outcome: "Interested in Pro tier, scheduled demo for next week",
    notes:
      "Very enthusiastic about the booking module. Main concern is data migration from their current Excel-based system.",
    createdAt: "2025-01-10T14:00:00Z",
    updatedAt: "2025-01-10T14:35:00Z",
  },
  {
    id: "act-002",
    type: "email",
    subject: "Follow-up: Product Information",
    description: "Sent detailed product brochure and pricing information.",
    leadId: "lead-001",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    completedAt: "2025-01-10T15:00:00Z",
    status: "completed",
    notes: "Attached: Pro tier features PDF, case study from similar facility",
    createdAt: "2025-01-10T14:45:00Z",
    updatedAt: "2025-01-10T15:00:00Z",
  },
  {
    id: "act-003",
    type: "meeting",
    subject: "Product Demo - Paws Paradise",
    description:
      "Full product demonstration including booking, client management, and reporting modules.",
    leadId: "lead-001",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    dueDate: "2025-01-15T10:00:00Z",
    status: "pending",
    duration: 60,
    createdAt: "2025-01-10T15:10:00Z",
    updatedAt: "2025-01-10T15:10:00Z",
  },
  {
    id: "act-004",
    type: "call",
    subject: "Cold Outreach - Happy Tails",
    description: "Initial contact attempt to introduce our platform.",
    leadId: "lead-002",
    assignedTo: "user-002",
    assignedToName: "Michael Chen",
    completedAt: "2025-01-09T11:00:00Z",
    status: "completed",
    duration: 5,
    outcome: "Left voicemail, will try again tomorrow",
    createdAt: "2025-01-09T10:55:00Z",
    updatedAt: "2025-01-09T11:05:00Z",
  },
  {
    id: "act-005",
    type: "call",
    subject: "Follow-up Call - Happy Tails",
    description: "Second attempt to reach the owner.",
    leadId: "lead-002",
    assignedTo: "user-002",
    assignedToName: "Michael Chen",
    completedAt: "2025-01-11T09:30:00Z",
    status: "completed",
    duration: 15,
    outcome: "Spoke with owner, interested but busy until February",
    notes: "Schedule follow-up for early February",
    createdAt: "2025-01-11T09:15:00Z",
    updatedAt: "2025-01-11T09:45:00Z",
  },
  {
    id: "act-006",
    type: "email",
    subject: "Proposal: Enterprise Package",
    description: "Sent customized proposal for enterprise subscription.",
    leadId: "lead-003",
    dealId: "deal-002",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    completedAt: "2025-01-08T16:00:00Z",
    status: "completed",
    notes: "Included 20% discount for annual commitment",
    createdAt: "2025-01-08T14:00:00Z",
    updatedAt: "2025-01-08T16:00:00Z",
  },
  {
    id: "act-007",
    type: "meeting",
    subject: "Contract Negotiation",
    description: "Final meeting to discuss contract terms and pricing.",
    leadId: "lead-003",
    dealId: "deal-002",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    dueDate: "2025-01-14T14:00:00Z",
    status: "pending",
    duration: 45,
    createdAt: "2025-01-08T16:30:00Z",
    updatedAt: "2025-01-08T16:30:00Z",
  },
  {
    id: "act-008",
    type: "task",
    subject: "Prepare Demo Environment",
    description: "Set up demo account with sample data for Furry Friends demo.",
    leadId: "lead-004",
    assignedTo: "user-003",
    assignedToName: "Emily Davis",
    dueDate: "2025-01-12T09:00:00Z",
    status: "completed",
    completedAt: "2025-01-11T17:00:00Z",
    createdAt: "2025-01-10T10:00:00Z",
    updatedAt: "2025-01-11T17:00:00Z",
  },
  {
    id: "act-009",
    type: "note",
    subject: "Competitor Analysis",
    description: "Lead mentioned they are also evaluating PetDesk and Gingr.",
    leadId: "lead-004",
    assignedTo: "user-002",
    assignedToName: "Michael Chen",
    status: "completed",
    completedAt: "2025-01-09T13:00:00Z",
    notes:
      "Main differentiator: our multi-location support and custom reporting. Price is comparable.",
    createdAt: "2025-01-09T13:00:00Z",
    updatedAt: "2025-01-09T13:00:00Z",
  },
  {
    id: "act-010",
    type: "call",
    subject: "Pricing Discussion",
    description: "Discuss pricing options and potential discounts.",
    leadId: "lead-005",
    dealId: "deal-003",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    dueDate: "2025-01-13T11:00:00Z",
    status: "pending",
    duration: 30,
    createdAt: "2025-01-11T10:00:00Z",
    updatedAt: "2025-01-11T10:00:00Z",
  },
  {
    id: "act-011",
    type: "email",
    subject: "Welcome to PetCare Platform!",
    description: "Sent welcome email with onboarding instructions.",
    leadId: "lead-006",
    contactId: "contact-006",
    assignedTo: "user-003",
    assignedToName: "Emily Davis",
    completedAt: "2025-01-05T10:00:00Z",
    status: "completed",
    notes: "Lead converted to customer - Pro tier",
    createdAt: "2025-01-05T09:30:00Z",
    updatedAt: "2025-01-05T10:00:00Z",
  },
  {
    id: "act-012",
    type: "task",
    subject: "Send Contract for Signature",
    description: "Prepare and send the final contract to Bark Avenue.",
    leadId: "lead-003",
    dealId: "deal-002",
    assignedTo: "user-001",
    assignedToName: "Sarah Johnson",
    dueDate: "2025-01-16T17:00:00Z",
    status: "pending",
    createdAt: "2025-01-12T09:00:00Z",
    updatedAt: "2025-01-12T09:00:00Z",
  },
  {
    id: "act-013",
    type: "meeting",
    subject: "Onboarding Kickoff",
    description: "Initial onboarding meeting with new customer.",
    contactId: "contact-006",
    assignedTo: "user-003",
    assignedToName: "Emily Davis",
    dueDate: "2025-01-07T10:00:00Z",
    completedAt: "2025-01-07T11:00:00Z",
    status: "completed",
    duration: 60,
    outcome: "Covered platform basics, scheduled data migration for next week",
    createdAt: "2025-01-05T10:30:00Z",
    updatedAt: "2025-01-07T11:00:00Z",
  },
  {
    id: "act-014",
    type: "call",
    subject: "Qualification Call",
    description: "Initial qualification call to understand needs.",
    leadId: "lead-007",
    assignedTo: "user-002",
    assignedToName: "Michael Chen",
    dueDate: "2025-01-13T15:00:00Z",
    status: "pending",
    duration: 20,
    createdAt: "2025-01-12T14:00:00Z",
    updatedAt: "2025-01-12T14:00:00Z",
  },
  {
    id: "act-015",
    type: "task",
    subject: "Update CRM with Event Leads",
    description: "Enter all leads collected from Pet Expo 2025.",
    assignedTo: "user-002",
    assignedToName: "Michael Chen",
    dueDate: "2025-01-08T17:00:00Z",
    completedAt: "2025-01-08T16:30:00Z",
    status: "completed",
    notes: "Added 12 new leads from the event",
    createdAt: "2025-01-06T09:00:00Z",
    updatedAt: "2025-01-08T16:30:00Z",
  },
];

export const taskReminders: TaskReminder[] = [
  {
    id: "rem-001",
    activityId: "act-003",
    reminderDate: "2025-01-15T09:00:00Z",
    isRead: false,
    createdAt: "2025-01-10T15:10:00Z",
  },
  {
    id: "rem-002",
    activityId: "act-007",
    reminderDate: "2025-01-14T13:00:00Z",
    isRead: false,
    createdAt: "2025-01-08T16:30:00Z",
  },
  {
    id: "rem-003",
    activityId: "act-010",
    reminderDate: "2025-01-13T10:00:00Z",
    isRead: false,
    createdAt: "2025-01-11T10:00:00Z",
  },
  {
    id: "rem-004",
    activityId: "act-012",
    reminderDate: "2025-01-16T09:00:00Z",
    isRead: false,
    createdAt: "2025-01-12T09:00:00Z",
  },
  {
    id: "rem-005",
    activityId: "act-014",
    reminderDate: "2025-01-13T14:30:00Z",
    isRead: false,
    createdAt: "2025-01-12T14:00:00Z",
  },
];

// Helper functions
export function getActivitiesByLead(leadId: string): Activity[] {
  return activities.filter((activity) => activity.leadId === leadId);
}

export function getActivitiesByDeal(dealId: string): Activity[] {
  return activities.filter((activity) => activity.dealId === dealId);
}

export function getActivitiesByContact(contactId: string): Activity[] {
  return activities.filter((activity) => activity.contactId === contactId);
}

export function getActivitiesByAssignee(userId: string): Activity[] {
  return activities.filter((activity) => activity.assignedTo === userId);
}

export function getPendingActivities(): Activity[] {
  return activities.filter((activity) => activity.status === "pending");
}

export function getOverdueActivities(): Activity[] {
  const now = new Date();
  return activities.filter(
    (activity) =>
      activity.status === "pending" &&
      activity.dueDate &&
      new Date(activity.dueDate) < now,
  );
}

export function getActivitiesByType(type: ActivityType): Activity[] {
  return activities.filter((activity) => activity.type === type);
}

export function getRecentActivities(limit: number = 10): Activity[] {
  return [...activities]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function getUpcomingActivities(limit: number = 10): Activity[] {
  const now = new Date();
  return activities
    .filter(
      (activity) =>
        activity.status === "pending" &&
        activity.dueDate &&
        new Date(activity.dueDate) >= now,
    )
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    )
    .slice(0, limit);
}
