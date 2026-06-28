export type AdminRole =
  | "sales_team"
  | "technical_support"
  | "account_manager"
  | "financial_auditor"
  | "system_administrator";

export type AccessLevel = "full" | "read_write" | "read_only" | "restricted";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "inactive" | "suspended" | "invited";
  accessLevel: AccessLevel;
  responsibilityAreas: string[];
  permissions: string[];
  createdAt: string;
  lastLogin: string;
  loginHistory: {
    date: string;
    ip: string;
    device: string;
    location: string;
  }[];
  activityLog: {
    id: number;
    action: string;
    target: string;
    timestamp: string;
    details: string;
    severity: "low" | "medium" | "high";
  }[];
  phone: string;
  department: string;
  avatar?: string;
}

export const rolePermissions: Record<AdminRole, string[]> = {
  sales_team: [
    "view_leads",
    "manage_leads",
    "view_clients",
    "create_quotes",
    "view_reports",
    "send_communications",
  ],
  technical_support: [
    "view_tickets",
    "manage_tickets",
    "view_system_logs",
    "access_knowledge_base",
    "remote_assistance",
    "escalate_issues",
  ],
  account_manager: [
    "view_clients",
    "manage_clients",
    "view_billing",
    "manage_subscriptions",
    "view_reports",
    "send_communications",
  ],
  financial_auditor: [
    "view_billing",
    "view_transactions",
    "view_reports",
    "export_financial_data",
    "audit_trail_access",
    "compliance_reports",
  ],
  system_administrator: [
    "full_system_access",
    "manage_users",
    "manage_roles",
    "system_configuration",
    "security_settings",
    "backup_restore",
    "audit_all_actions",
  ],
};

export const accessLevelDescriptions: Record<AccessLevel, string> = {
  full: "Complete access to all features and data",
  read_write: "Can view and modify data within assigned areas",
  read_only: "Can only view data, no modifications allowed",
  restricted: "Limited access to specific features only",
};

export const adminUsers: AdminUser[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@pawsplay.com",
    role: "system_administrator",
    status: "active",
    accessLevel: "full",
    responsibilityAreas: [
      "System Configuration",
      "User Management",
      "Security",
    ],
    permissions: rolePermissions.system_administrator,
    createdAt: "2024-01-15",
    lastLogin: "2025-11-27T09:30:00",
    phone: "+1-555-0101",
    department: "IT Administration",
    loginHistory: [
      {
        date: "2025-11-27T09:30:00",
        ip: "192.168.1.100",
        device: "Chrome/Windows",
        location: "New York, US",
      },
      {
        date: "2025-11-26T14:20:00",
        ip: "192.168.1.100",
        device: "Chrome/Windows",
        location: "New York, US",
      },
      {
        date: "2025-11-25T08:45:00",
        ip: "10.0.0.50",
        device: "Safari/macOS",
        location: "New York, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "User Created",
        target: "Emily Davis",
        timestamp: "2025-11-27T09:35:00",
        details: "Created new sales team member",
        severity: "medium",
      },
      {
        id: 2,
        action: "Role Modified",
        target: "Sales Team Role",
        timestamp: "2025-11-26T15:00:00",
        details: "Added new permission: export_data",
        severity: "high",
      },
      {
        id: 3,
        action: "System Settings",
        target: "Security Policy",
        timestamp: "2025-11-25T10:00:00",
        details: "Updated password policy requirements",
        severity: "high",
      },
    ],
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.johnson@pawsplay.com",
    role: "sales_team",
    status: "active",
    accessLevel: "read_write",
    responsibilityAreas: [
      "Lead Generation",
      "Client Acquisition",
      "Enterprise Sales",
    ],
    permissions: rolePermissions.sales_team,
    createdAt: "2024-03-20",
    lastLogin: "2025-11-27T08:15:00",
    phone: "+1-555-0102",
    department: "Sales",
    loginHistory: [
      {
        date: "2025-11-27T08:15:00",
        ip: "192.168.1.105",
        device: "Chrome/Windows",
        location: "Los Angeles, US",
      },
      {
        date: "2025-11-26T09:00:00",
        ip: "192.168.1.105",
        device: "Chrome/Windows",
        location: "Los Angeles, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Lead Created",
        target: "ABC Pet Care",
        timestamp: "2025-11-27T08:30:00",
        details: "New enterprise lead added",
        severity: "low",
      },
      {
        id: 2,
        action: "Quote Sent",
        target: "XYZ Animal Hospital",
        timestamp: "2025-11-26T11:00:00",
        details: "Premium plan quote sent",
        severity: "low",
      },
    ],
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "michael.chen@pawsplay.com",
    role: "technical_support",
    status: "active",
    accessLevel: "read_write",
    responsibilityAreas: ["Tier 1 Support", "Bug Reports", "User Training"],
    permissions: rolePermissions.technical_support,
    createdAt: "2024-05-10",
    lastLogin: "2025-11-27T07:45:00",
    phone: "+1-555-0103",
    department: "Technical Support",
    loginHistory: [
      {
        date: "2025-11-27T07:45:00",
        ip: "192.168.1.110",
        device: "Firefox/Linux",
        location: "Seattle, US",
      },
      {
        date: "2025-11-26T08:00:00",
        ip: "192.168.1.110",
        device: "Firefox/Linux",
        location: "Seattle, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Ticket Resolved",
        target: "TKT-2025-1234",
        timestamp: "2025-11-27T09:00:00",
        details: "Login issue resolved for client",
        severity: "low",
      },
      {
        id: 2,
        action: "Escalation",
        target: "TKT-2025-1230",
        timestamp: "2025-11-26T14:30:00",
        details: "Escalated to engineering team",
        severity: "medium",
      },
    ],
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@pawsplay.com",
    role: "account_manager",
    status: "active",
    accessLevel: "read_write",
    responsibilityAreas: [
      "Enterprise Accounts",
      "Client Retention",
      "Upselling",
    ],
    permissions: rolePermissions.account_manager,
    createdAt: "2024-02-28",
    lastLogin: "2025-11-26T16:30:00",
    phone: "+1-555-0104",
    department: "Account Management",
    loginHistory: [
      {
        date: "2025-11-26T16:30:00",
        ip: "192.168.1.115",
        device: "Chrome/macOS",
        location: "Chicago, US",
      },
      {
        date: "2025-11-25T09:15:00",
        ip: "192.168.1.115",
        device: "Chrome/macOS",
        location: "Chicago, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Subscription Updated",
        target: "Paws & Play Daycare",
        timestamp: "2025-11-26T17:00:00",
        details: "Upgraded to Premium plan",
        severity: "medium",
      },
      {
        id: 2,
        action: "Client Meeting",
        target: "Happy Tails Boarding",
        timestamp: "2025-11-25T14:00:00",
        details: "Quarterly review completed",
        severity: "low",
      },
    ],
  },
  {
    id: 5,
    name: "Robert Wilson",
    email: "robert.wilson@pawsplay.com",
    role: "financial_auditor",
    status: "active",
    accessLevel: "read_only",
    responsibilityAreas: [
      "Financial Compliance",
      "Revenue Audits",
      "Expense Reviews",
    ],
    permissions: rolePermissions.financial_auditor,
    createdAt: "2024-06-15",
    lastLogin: "2025-11-25T11:00:00",
    phone: "+1-555-0105",
    department: "Finance",
    loginHistory: [
      {
        date: "2025-11-25T11:00:00",
        ip: "192.168.1.120",
        device: "Edge/Windows",
        location: "Boston, US",
      },
      {
        date: "2025-11-22T10:00:00",
        ip: "192.168.1.120",
        device: "Edge/Windows",
        location: "Boston, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Report Generated",
        target: "Q4 Revenue Report",
        timestamp: "2025-11-25T12:00:00",
        details: "Quarterly financial report exported",
        severity: "medium",
      },
      {
        id: 2,
        action: "Audit Completed",
        target: "October Transactions",
        timestamp: "2025-11-22T15:00:00",
        details: "Monthly transaction audit completed",
        severity: "high",
      },
    ],
  },
  {
    id: 6,
    name: "Lisa Martinez",
    email: "lisa.martinez@pawsplay.com",
    role: "sales_team",
    status: "active",
    accessLevel: "read_write",
    responsibilityAreas: ["SMB Sales", "Product Demos", "Onboarding"],
    permissions: rolePermissions.sales_team,
    createdAt: "2024-08-01",
    lastLogin: "2025-11-27T10:00:00",
    phone: "+1-555-0106",
    department: "Sales",
    loginHistory: [
      {
        date: "2025-11-27T10:00:00",
        ip: "192.168.1.125",
        device: "Chrome/Windows",
        location: "Miami, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Demo Completed",
        target: "Pet Paradise",
        timestamp: "2025-11-27T10:30:00",
        details: "Product demo for new prospect",
        severity: "low",
      },
    ],
  },
  {
    id: 7,
    name: "David Brown",
    email: "david.brown@pawsplay.com",
    role: "technical_support",
    status: "inactive",
    accessLevel: "restricted",
    responsibilityAreas: ["Tier 2 Support", "System Monitoring"],
    permissions: rolePermissions.technical_support,
    createdAt: "2024-04-20",
    lastLogin: "2025-11-10T14:00:00",
    phone: "+1-555-0107",
    department: "Technical Support",
    loginHistory: [
      {
        date: "2025-11-10T14:00:00",
        ip: "192.168.1.130",
        device: "Chrome/Windows",
        location: "Denver, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Status Changed",
        target: "User Account",
        timestamp: "2025-11-10T14:30:00",
        details: "Account set to inactive",
        severity: "medium",
      },
    ],
  },
  {
    id: 8,
    name: "Jennifer Lee",
    email: "jennifer.lee@pawsplay.com",
    role: "account_manager",
    status: "active",
    accessLevel: "read_write",
    responsibilityAreas: [
      "Key Accounts",
      "Contract Renewals",
      "Customer Success",
    ],
    permissions: rolePermissions.account_manager,
    createdAt: "2024-07-10",
    lastLogin: "2025-11-27T08:00:00",
    phone: "+1-555-0108",
    department: "Account Management",
    loginHistory: [
      {
        date: "2025-11-27T08:00:00",
        ip: "192.168.1.135",
        device: "Safari/macOS",
        location: "San Francisco, US",
      },
      {
        date: "2025-11-26T09:30:00",
        ip: "192.168.1.135",
        device: "Safari/macOS",
        location: "San Francisco, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Contract Renewed",
        target: "Furry Friends Grooming",
        timestamp: "2025-11-27T09:00:00",
        details: "Annual contract renewed",
        severity: "medium",
      },
    ],
  },
  {
    id: 9,
    name: "Thomas Anderson",
    email: "thomas.anderson@pawsplay.com",
    role: "system_administrator",
    status: "active",
    accessLevel: "full",
    responsibilityAreas: [
      "Database Management",
      "API Security",
      "Infrastructure",
    ],
    permissions: rolePermissions.system_administrator,
    createdAt: "2024-01-20",
    lastLogin: "2025-11-27T06:30:00",
    phone: "+1-555-0109",
    department: "IT Administration",
    loginHistory: [
      {
        date: "2025-11-27T06:30:00",
        ip: "192.168.1.140",
        device: "Chrome/Linux",
        location: "Austin, US",
      },
      {
        date: "2025-11-26T07:00:00",
        ip: "192.168.1.140",
        device: "Chrome/Linux",
        location: "Austin, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Backup Created",
        target: "Production Database",
        timestamp: "2025-11-27T07:00:00",
        details: "Daily backup completed successfully",
        severity: "low",
      },
      {
        id: 2,
        action: "Security Update",
        target: "API Gateway",
        timestamp: "2025-11-26T22:00:00",
        details: "Applied security patches",
        severity: "high",
      },
    ],
  },
  {
    id: 10,
    name: "Amanda Taylor",
    email: "amanda.taylor@pawsplay.com",
    role: "financial_auditor",
    status: "suspended",
    accessLevel: "restricted",
    responsibilityAreas: ["Internal Audits", "Compliance Checks"],
    permissions: [],
    createdAt: "2024-09-01",
    lastLogin: "2025-11-01T09:00:00",
    phone: "+1-555-0110",
    department: "Finance",
    loginHistory: [
      {
        date: "2025-11-01T09:00:00",
        ip: "192.168.1.145",
        device: "Chrome/Windows",
        location: "Philadelphia, US",
      },
    ],
    activityLog: [
      {
        id: 1,
        action: "Account Suspended",
        target: "User Account",
        timestamp: "2025-11-05T10:00:00",
        details: "Account suspended pending review",
        severity: "high",
      },
    ],
  },
];

export const roleDisplayNames: Record<AdminRole, string> = {
  sales_team: "Sales Team",
  technical_support: "Technical Support",
  account_manager: "Account Manager",
  financial_auditor: "Financial Auditor",
  system_administrator: "System Administrator",
};

export const roleDescriptions: Record<AdminRole, string> = {
  sales_team: "Manages leads, client acquisition, and sales processes",
  technical_support: "Handles customer support tickets and technical issues",
  account_manager: "Manages client relationships and subscriptions",
  financial_auditor: "Reviews financial data and ensures compliance",
  system_administrator: "Full system access with administrative privileges",
};
