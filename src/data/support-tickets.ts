export interface TicketTimelineEvent {
  id: string;
  type:
    | "created"
    | "status_change"
    | "assignment"
    | "priority_change"
    | "message"
    | "sla_update"
    | "escalation"
    | "note";
  timestamp: string;
  actor: string;
  details: {
    from?: string;
    to?: string;
    message?: string;
    note?: string;
  };
}

export interface SLAConfig {
  id: string;
  name: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  firstResponseTime: number; // in hours
  resolutionTime: number; // in hours
  escalationTime: number; // in hours
  description: string;
}

export interface TicketSLA {
  configId: string;
  firstResponseDue: string;
  resolutionDue: string;
  escalationDue: string;
  firstResponseMet?: boolean;
  resolutionMet?: boolean;
  isEscalated: boolean;
  breachCount: number;
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "Agent" | "Senior Agent" | "Team Lead" | "Manager";
  department: string;
  status: "Available" | "Busy" | "Away" | "Offline";
  activeTickets: number;
  specializations: string[];
}

export interface SupportTicket extends Record<string, unknown> {
  id: string;
  title: string;
  description: string;
  status:
    | "Open"
    | "In Progress"
    | "Resolved"
    | "Closed"
    | "Escalated"
    | "Pending";
  priority: "Low" | "Medium" | "High" | "Urgent";
  requester: string;
  requesterEmail?: string;
  facility: string;
  facilityId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedAgentId?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  sla?: TicketSLA;
  timeline?: TicketTimelineEvent[];
  messages?: {
    id: string;
    sender: string;
    message: string;
    timestamp: string;
    isInternal?: boolean;
  }[];
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionNote: string;
    satisfactionRating?: number;
  };
  escalation?: {
    escalatedAt: string;
    escalatedTo: string;
    reason: string;
    previousAssignee?: string;
  };
}

// SLA Configurations
export const slaConfigs: SLAConfig[] = [
  {
    id: "sla-urgent",
    name: "Urgent Priority SLA",
    priority: "Urgent",
    firstResponseTime: 0.5, // 30 minutes
    resolutionTime: 4, // 4 hours
    escalationTime: 2, // 2 hours
    description: "Critical issues affecting all users or causing data loss",
  },
  {
    id: "sla-high",
    name: "High Priority SLA",
    priority: "High",
    firstResponseTime: 1, // 1 hour
    resolutionTime: 8, // 8 hours
    escalationTime: 4, // 4 hours
    description: "Major functionality blocked, significant business impact",
  },
  {
    id: "sla-medium",
    name: "Medium Priority SLA",
    priority: "Medium",
    firstResponseTime: 4, // 4 hours
    resolutionTime: 24, // 24 hours
    escalationTime: 12, // 12 hours
    description: "Important issues with workarounds available",
  },
  {
    id: "sla-low",
    name: "Low Priority SLA",
    priority: "Low",
    firstResponseTime: 8, // 8 hours
    resolutionTime: 72, // 72 hours (3 days)
    escalationTime: 48, // 48 hours
    description: "Minor issues, feature requests, general inquiries",
  },
];

// Support Agents
export const supportAgents: SupportAgent[] = [
  {
    id: "agent-001",
    name: "Emma Thompson",
    email: "emma.thompson@doggieville.com",
    role: "Team Lead",
    department: "Technical Support",
    status: "Available",
    activeTickets: 5,
    specializations: ["Technical", "Integration", "API"],
  },
  {
    id: "agent-002",
    name: "Michael Chen",
    email: "michael.chen@doggieville.com",
    role: "Senior Agent",
    department: "Billing Support",
    status: "Busy",
    activeTickets: 8,
    specializations: ["Billing", "Payments", "Refunds"],
  },
  {
    id: "agent-003",
    name: "Sarah Martinez",
    email: "sarah.martinez@doggieville.com",
    role: "Agent",
    department: "Customer Support",
    status: "Available",
    activeTickets: 3,
    specializations: ["Service", "Complaints", "General"],
  },
  {
    id: "agent-004",
    name: "David Wilson",
    email: "david.wilson@doggieville.com",
    role: "Senior Agent",
    department: "Technical Support",
    status: "Away",
    activeTickets: 6,
    specializations: ["Technical", "Security", "Performance"],
  },
  {
    id: "agent-005",
    name: "Jennifer Lee",
    email: "jennifer.lee@doggieville.com",
    role: "Manager",
    department: "Support Operations",
    status: "Available",
    activeTickets: 2,
    specializations: ["Escalations", "VIP Support", "Enterprise"],
  },
  {
    id: "agent-006",
    name: "Robert Brown",
    email: "robert.brown@doggieville.com",
    role: "Agent",
    department: "Technical Support",
    status: "Offline",
    activeTickets: 0,
    specializations: ["Technical", "Mobile App", "Integration"],
  },
];

export const supportTickets: SupportTicket[] = [
  {
    id: "TICK-001",
    title: "Unable to access booking system",
    description:
      "Facility admin cannot log into the booking dashboard after password reset.",
    status: "In Progress",
    priority: "High",
    requester: "John Doe",
    requesterEmail: "john.doe@facilityabc.com",
    facility: "Facility ABC",
    facilityId: "fac-001",
    createdAt: "2024-11-28T09:00:00Z",
    updatedAt: "2024-11-28T10:30:00Z",
    assignedTo: "Emma Thompson",
    assignedAgentId: "agent-001",
    category: "Technical",
    subcategory: "Authentication",
    tags: ["login", "password-reset", "urgent"],
    sla: {
      configId: "sla-high",
      firstResponseDue: "2024-11-28T10:00:00Z",
      resolutionDue: "2024-11-28T17:00:00Z",
      escalationDue: "2024-11-28T13:00:00Z",
      firstResponseMet: true,
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-001",
        type: "created",
        timestamp: "2024-11-28T09:00:00Z",
        actor: "John Doe",
        details: { message: "Ticket created via support portal" },
      },
      {
        id: "tl-002",
        type: "assignment",
        timestamp: "2024-11-28T09:05:00Z",
        actor: "System",
        details: {
          to: "Emma Thompson",
          message: "Auto-assigned based on category",
        },
      },
      {
        id: "tl-003",
        type: "message",
        timestamp: "2024-11-28T09:15:00Z",
        actor: "Emma Thompson",
        details: { message: "First response sent - SLA met" },
      },
      {
        id: "tl-004",
        type: "status_change",
        timestamp: "2024-11-28T09:20:00Z",
        actor: "Emma Thompson",
        details: { from: "Open", to: "In Progress" },
      },
    ],
    messages: [
      {
        id: "msg-1",
        sender: "John Doe",
        message:
          "I reset my password but still can't log in. Getting error 'Invalid credentials'.",
        timestamp: "2024-11-28T09:00:00Z",
      },
      {
        id: "msg-2",
        sender: "Emma Thompson",
        message:
          "Hi John, I can see your account. Please try clearing your browser cache and try again. If that doesn't work, I'll reset your session manually.",
        timestamp: "2024-11-28T09:15:00Z",
      },
      {
        id: "msg-3",
        sender: "John Doe",
        message: "Cleared cache but still having issues. Same error.",
        timestamp: "2024-11-28T09:45:00Z",
      },
      {
        id: "msg-4",
        sender: "Emma Thompson",
        message:
          "I've cleared your active sessions and regenerated your auth token. Please try logging in now.",
        timestamp: "2024-11-28T10:30:00Z",
        isInternal: false,
      },
    ],
  },
  {
    id: "TICK-002",
    title: "Billing discrepancy for October invoice",
    description:
      "Invoice shows incorrect amount for premium services. Being charged for features we don't use.",
    status: "Open",
    priority: "Medium",
    requester: "Jane Smith",
    requesterEmail: "jane.smith@facilityxyz.com",
    facility: "Facility XYZ",
    facilityId: "fac-002",
    createdAt: "2024-11-29T14:00:00Z",
    updatedAt: "2024-11-29T14:00:00Z",
    category: "Billing",
    subcategory: "Invoice Dispute",
    tags: ["billing", "invoice", "premium"],
    sla: {
      configId: "sla-medium",
      firstResponseDue: "2024-11-29T18:00:00Z",
      resolutionDue: "2024-11-30T14:00:00Z",
      escalationDue: "2024-11-30T02:00:00Z",
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-005",
        type: "created",
        timestamp: "2024-11-29T14:00:00Z",
        actor: "Jane Smith",
        details: { message: "Ticket created via email" },
      },
    ],
  },
  {
    id: "TICK-003",
    title: "Client complaint about grooming service quality",
    description:
      "Client reported unsatisfactory grooming service and wants full refund. Dog's fur was cut unevenly.",
    status: "Resolved",
    priority: "High",
    requester: "Mike Johnson",
    requesterEmail: "mike.johnson@email.com",
    facility: "Facility DEF",
    facilityId: "fac-003",
    createdAt: "2024-11-27T11:00:00Z",
    updatedAt: "2024-11-27T16:00:00Z",
    assignedTo: "Sarah Martinez",
    assignedAgentId: "agent-003",
    category: "Service",
    subcategory: "Complaint",
    tags: ["complaint", "refund", "grooming"],
    sla: {
      configId: "sla-high",
      firstResponseDue: "2024-11-27T12:00:00Z",
      resolutionDue: "2024-11-27T19:00:00Z",
      escalationDue: "2024-11-27T15:00:00Z",
      firstResponseMet: true,
      resolutionMet: true,
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-006",
        type: "created",
        timestamp: "2024-11-27T11:00:00Z",
        actor: "Mike Johnson",
        details: { message: "Ticket created via phone call" },
      },
      {
        id: "tl-007",
        type: "assignment",
        timestamp: "2024-11-27T11:05:00Z",
        actor: "System",
        details: { to: "Sarah Martinez" },
      },
      {
        id: "tl-008",
        type: "message",
        timestamp: "2024-11-27T11:15:00Z",
        actor: "Sarah Martinez",
        details: {
          message: "First response - apologized and initiated refund process",
        },
      },
      {
        id: "tl-009",
        type: "status_change",
        timestamp: "2024-11-27T11:20:00Z",
        actor: "Sarah Martinez",
        details: { from: "Open", to: "In Progress" },
      },
      {
        id: "tl-010",
        type: "note",
        timestamp: "2024-11-27T14:00:00Z",
        actor: "Sarah Martinez",
        details: {
          note: "Refund of $85 processed. Confirmation sent to customer.",
        },
      },
      {
        id: "tl-011",
        type: "status_change",
        timestamp: "2024-11-27T16:00:00Z",
        actor: "Sarah Martinez",
        details: { from: "In Progress", to: "Resolved" },
      },
    ],
    messages: [
      {
        id: "msg-5",
        sender: "Mike Johnson",
        message:
          "The grooming was terrible, my dog looks awful. I want a full refund!",
        timestamp: "2024-11-27T11:00:00Z",
      },
      {
        id: "msg-6",
        sender: "Sarah Martinez",
        message:
          "I'm so sorry to hear about your experience, Mike. We take quality very seriously. I'm initiating a full refund immediately and will personally follow up with the facility.",
        timestamp: "2024-11-27T11:15:00Z",
      },
      {
        id: "msg-7",
        sender: "Sarah Martinez",
        message:
          "Your refund of $85 has been processed. You should see it in 3-5 business days. We've also credited your account with a complimentary grooming session.",
        timestamp: "2024-11-27T14:30:00Z",
      },
    ],
    resolution: {
      resolvedAt: "2024-11-27T16:00:00Z",
      resolvedBy: "Sarah Martinez",
      resolutionNote:
        "Full refund processed ($85). Complimentary session credited. Facility notified for quality review.",
      satisfactionRating: 4,
    },
  },
  {
    id: "TICK-004",
    title: "Feature request: Staff scheduling mobile improvements",
    description:
      "Request for better mobile app functionality for staff scheduling. Current interface is hard to use on phone.",
    status: "Open",
    priority: "Low",
    requester: "Sarah Wilson",
    requesterEmail: "sarah.wilson@facilityghi.com",
    facility: "Facility GHI",
    facilityId: "fac-004",
    createdAt: "2024-11-25T08:00:00Z",
    updatedAt: "2024-11-25T08:00:00Z",
    category: "Feature Request",
    subcategory: "Mobile App",
    tags: ["feature-request", "mobile", "scheduling"],
    sla: {
      configId: "sla-low",
      firstResponseDue: "2024-11-25T16:00:00Z",
      resolutionDue: "2024-11-28T08:00:00Z",
      escalationDue: "2024-11-27T08:00:00Z",
      firstResponseMet: true,
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-012",
        type: "created",
        timestamp: "2024-11-25T08:00:00Z",
        actor: "Sarah Wilson",
        details: { message: "Feature request submitted via feedback form" },
      },
      {
        id: "tl-013",
        type: "message",
        timestamp: "2024-11-25T10:00:00Z",
        actor: "Support Bot",
        details: {
          message: "Auto-response sent acknowledging feature request",
        },
      },
    ],
  },
  {
    id: "TICK-005",
    title: "URGENT: System outage affecting all bookings",
    description:
      "Complete system downtime preventing any bookings or check-ins. All facilities affected.",
    status: "Resolved",
    priority: "Urgent",
    requester: "System Alert",
    requesterEmail: "alerts@doggieville.com",
    facility: "All Facilities",
    createdAt: "2024-11-26T02:00:00Z",
    updatedAt: "2024-11-26T03:30:00Z",
    assignedTo: "Jennifer Lee",
    assignedAgentId: "agent-005",
    category: "Technical",
    subcategory: "Outage",
    tags: ["outage", "critical", "system-wide"],
    sla: {
      configId: "sla-urgent",
      firstResponseDue: "2024-11-26T02:30:00Z",
      resolutionDue: "2024-11-26T06:00:00Z",
      escalationDue: "2024-11-26T04:00:00Z",
      firstResponseMet: true,
      resolutionMet: true,
      isEscalated: true,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-014",
        type: "created",
        timestamp: "2024-11-26T02:00:00Z",
        actor: "Monitoring System",
        details: {
          message: "Automated alert triggered - System health check failed",
        },
      },
      {
        id: "tl-015",
        type: "assignment",
        timestamp: "2024-11-26T02:01:00Z",
        actor: "System",
        details: {
          to: "Jennifer Lee",
          message: "Auto-escalated to Manager - Urgent priority",
        },
      },
      {
        id: "tl-016",
        type: "escalation",
        timestamp: "2024-11-26T02:05:00Z",
        actor: "Jennifer Lee",
        details: { message: "Escalated to DevOps on-call team" },
      },
      {
        id: "tl-017",
        type: "status_change",
        timestamp: "2024-11-26T02:10:00Z",
        actor: "Jennifer Lee",
        details: { from: "Open", to: "Escalated" },
      },
      {
        id: "tl-018",
        type: "note",
        timestamp: "2024-11-26T02:45:00Z",
        actor: "DevOps Team",
        details: {
          note: "Root cause identified: Database connection pool exhausted",
        },
      },
      {
        id: "tl-019",
        type: "note",
        timestamp: "2024-11-26T03:15:00Z",
        actor: "DevOps Team",
        details: { note: "Fix deployed. Monitoring recovery..." },
      },
      {
        id: "tl-020",
        type: "status_change",
        timestamp: "2024-11-26T03:30:00Z",
        actor: "Jennifer Lee",
        details: { from: "Escalated", to: "Resolved" },
      },
    ],
    resolution: {
      resolvedAt: "2024-11-26T03:30:00Z",
      resolvedBy: "DevOps Team",
      resolutionNote:
        "Database connection pool configuration updated. Auto-scaling enabled. Total downtime: 90 minutes.",
    },
  },
  {
    id: "TICK-006",
    title: "Payment processing failing intermittently",
    description:
      "Customers reporting payment failures about 30% of the time. Error message mentions gateway timeout.",
    status: "Escalated",
    priority: "High",
    requester: "Tom Anderson",
    requesterEmail: "tom.anderson@facilityjkl.com",
    facility: "Facility JKL",
    facilityId: "fac-005",
    createdAt: "2024-11-29T10:00:00Z",
    updatedAt: "2024-11-29T12:00:00Z",
    assignedTo: "Michael Chen",
    assignedAgentId: "agent-002",
    category: "Billing",
    subcategory: "Payment Gateway",
    tags: ["payments", "gateway", "intermittent"],
    sla: {
      configId: "sla-high",
      firstResponseDue: "2024-11-29T11:00:00Z",
      resolutionDue: "2024-11-29T18:00:00Z",
      escalationDue: "2024-11-29T14:00:00Z",
      firstResponseMet: true,
      isEscalated: true,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-021",
        type: "created",
        timestamp: "2024-11-29T10:00:00Z",
        actor: "Tom Anderson",
        details: { message: "Ticket created via dashboard" },
      },
      {
        id: "tl-022",
        type: "assignment",
        timestamp: "2024-11-29T10:05:00Z",
        actor: "System",
        details: {
          to: "Michael Chen",
          message: "Assigned based on Billing specialization",
        },
      },
      {
        id: "tl-023",
        type: "message",
        timestamp: "2024-11-29T10:20:00Z",
        actor: "Michael Chen",
        details: { message: "First response - investigating payment logs" },
      },
      {
        id: "tl-024",
        type: "status_change",
        timestamp: "2024-11-29T10:25:00Z",
        actor: "Michael Chen",
        details: { from: "Open", to: "In Progress" },
      },
      {
        id: "tl-025",
        type: "escalation",
        timestamp: "2024-11-29T12:00:00Z",
        actor: "Michael Chen",
        details: {
          message:
            "Escalated to payment provider - potential gateway issue on their end",
        },
      },
      {
        id: "tl-026",
        type: "status_change",
        timestamp: "2024-11-29T12:00:00Z",
        actor: "Michael Chen",
        details: { from: "In Progress", to: "Escalated" },
      },
    ],
    messages: [
      {
        id: "msg-8",
        sender: "Tom Anderson",
        message:
          "Our customers are complaining about failed payments. This is costing us business!",
        timestamp: "2024-11-29T10:00:00Z",
      },
      {
        id: "msg-9",
        sender: "Michael Chen",
        message:
          "I'm looking into this right now, Tom. Can you share any specific transaction IDs that failed?",
        timestamp: "2024-11-29T10:20:00Z",
      },
      {
        id: "msg-10",
        sender: "Tom Anderson",
        message:
          "Here are some: TXN-88421, TXN-88435, TXN-88441. All within the last hour.",
        timestamp: "2024-11-29T10:45:00Z",
      },
      {
        id: "msg-11",
        sender: "Michael Chen",
        message:
          "I've identified the pattern - it's related to our payment gateway's timeout settings. I've escalated this to Stripe support and our DevOps team. Implementing a temporary workaround now.",
        timestamp: "2024-11-29T12:00:00Z",
      },
    ],
    escalation: {
      escalatedAt: "2024-11-29T12:00:00Z",
      escalatedTo: "Payment Provider (Stripe)",
      reason: "Gateway timeout issues requiring provider investigation",
      previousAssignee: "Michael Chen",
    },
  },
  {
    id: "TICK-007",
    title: "Need help setting up multi-location management",
    description:
      "We're expanding to 3 new locations and need guidance on setting up the multi-location feature.",
    status: "Pending",
    priority: "Medium",
    requester: "Lisa Park",
    requesterEmail: "lisa.park@pawsparadise.com",
    facility: "Paws Paradise",
    facilityId: "fac-006",
    createdAt: "2024-11-28T15:00:00Z",
    updatedAt: "2024-11-29T09:00:00Z",
    assignedTo: "Emma Thompson",
    assignedAgentId: "agent-001",
    category: "Technical",
    subcategory: "Configuration",
    tags: ["multi-location", "setup", "onboarding"],
    sla: {
      configId: "sla-medium",
      firstResponseDue: "2024-11-28T19:00:00Z",
      resolutionDue: "2024-11-29T15:00:00Z",
      escalationDue: "2024-11-29T03:00:00Z",
      firstResponseMet: true,
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-027",
        type: "created",
        timestamp: "2024-11-28T15:00:00Z",
        actor: "Lisa Park",
        details: { message: "Ticket created via support chat" },
      },
      {
        id: "tl-028",
        type: "assignment",
        timestamp: "2024-11-28T15:10:00Z",
        actor: "System",
        details: { to: "Emma Thompson" },
      },
      {
        id: "tl-029",
        type: "message",
        timestamp: "2024-11-28T16:00:00Z",
        actor: "Emma Thompson",
        details: { message: "Scheduled onboarding call for tomorrow" },
      },
      {
        id: "tl-030",
        type: "status_change",
        timestamp: "2024-11-29T09:00:00Z",
        actor: "Emma Thompson",
        details: {
          from: "In Progress",
          to: "Pending",
          message: "Waiting for customer to join scheduled call",
        },
      },
    ],
    messages: [
      {
        id: "msg-12",
        sender: "Lisa Park",
        message:
          "Hi! We're growing and need to add 3 new locations. Can someone walk us through the setup?",
        timestamp: "2024-11-28T15:00:00Z",
      },
      {
        id: "msg-13",
        sender: "Emma Thompson",
        message:
          "Congratulations on the expansion, Lisa! I'd be happy to help. I've scheduled a video call for tomorrow at 10 AM to walk you through the multi-location setup. You'll receive a calendar invite shortly.",
        timestamp: "2024-11-28T16:00:00Z",
      },
      {
        id: "msg-14",
        sender: "Lisa Park",
        message: "Perfect, thank you! Looking forward to it.",
        timestamp: "2024-11-28T16:30:00Z",
      },
    ],
  },
  {
    id: "TICK-008",
    title: "API rate limiting affecting integrations",
    description:
      "Our third-party booking widget is getting rate limited. Need higher API limits.",
    status: "In Progress",
    priority: "Medium",
    requester: "Alex Rivera",
    requesterEmail: "alex.rivera@petcare.com",
    facility: "PetCare Central",
    facilityId: "fac-007",
    createdAt: "2024-11-29T11:00:00Z",
    updatedAt: "2024-11-29T13:00:00Z",
    assignedTo: "David Wilson",
    assignedAgentId: "agent-004",
    category: "Technical",
    subcategory: "API",
    tags: ["api", "rate-limit", "integration"],
    sla: {
      configId: "sla-medium",
      firstResponseDue: "2024-11-29T15:00:00Z",
      resolutionDue: "2024-11-30T11:00:00Z",
      escalationDue: "2024-11-29T23:00:00Z",
      firstResponseMet: true,
      isEscalated: false,
      breachCount: 0,
    },
    timeline: [
      {
        id: "tl-031",
        type: "created",
        timestamp: "2024-11-29T11:00:00Z",
        actor: "Alex Rivera",
        details: { message: "Ticket created via API developer portal" },
      },
      {
        id: "tl-032",
        type: "assignment",
        timestamp: "2024-11-29T11:15:00Z",
        actor: "System",
        details: {
          to: "David Wilson",
          message: "Assigned based on API specialization",
        },
      },
      {
        id: "tl-033",
        type: "status_change",
        timestamp: "2024-11-29T13:00:00Z",
        actor: "David Wilson",
        details: { from: "Open", to: "In Progress" },
      },
    ],
    messages: [
      {
        id: "msg-15",
        sender: "Alex Rivera",
        message:
          "We're hitting rate limits on the booking API. Current limit of 100 req/min is not enough for our busy periods.",
        timestamp: "2024-11-29T11:00:00Z",
      },
      {
        id: "msg-16",
        sender: "David Wilson",
        message:
          "Hi Alex, I can see your API usage patterns. Given your Enterprise plan, you're eligible for higher limits. I'm preparing the upgrade now - should be active within the hour.",
        timestamp: "2024-11-29T13:00:00Z",
      },
    ],
  },
];

// Helper functions
export const getTicketStats = () => {
  const total = supportTickets.length;
  const open = supportTickets.filter((t) => t.status === "Open").length;
  const inProgress = supportTickets.filter(
    (t) => t.status === "In Progress",
  ).length;
  const escalated = supportTickets.filter(
    (t) => t.status === "Escalated",
  ).length;
  const pending = supportTickets.filter((t) => t.status === "Pending").length;
  const resolved = supportTickets.filter(
    (t) => t.status === "Resolved" || t.status === "Closed",
  ).length;
  const breached = supportTickets.filter(
    (t) => t.sla && t.sla.breachCount > 0,
  ).length;

  return { total, open, inProgress, escalated, pending, resolved, breached };
};
