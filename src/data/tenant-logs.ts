// Tenant Activity & Audit Logs Data

export interface TenantActivityLog {
  id: string;
  facilityId: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorAvatar?: string;
  action: string;
  actionType:
    | "booking"
    | "payment"
    | "user"
    | "client"
    | "pet"
    | "settings"
    | "staff"
    | "service"
    | "communication"
    | "system";
  targetType: string;
  targetName: string;
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface TenantAuditLog {
  id: string;
  facilityId: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category:
    | "Financial"
    | "User Access"
    | "Configuration"
    | "Security"
    | "Data"
    | "System"
    | "Booking"
    | "Client";
  entityType: string;
  entityId: string;
  entityName: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  ipAddress: string;
  userAgent: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Success" | "Failed" | "Pending";
  description: string;
}

export interface TenantLogStatistics {
  facilityId: number;
  totalActivityLogs: number;
  totalAuditLogs: number;
  todayActivityLogs: number;
  todayAuditLogs: number;
  weeklyTrend: { date: string; activity: number; audit: number }[];
  activityByType: { type: string; count: number; percentage: number }[];
  auditByCategory: { category: string; count: number; percentage: number }[];
  topUsers: { userId: string; userName: string; actionCount: number }[];
  securityEvents: number;
  failedActions: number;
  criticalEvents: number;
}

// Generate tenant-specific activity logs
export function getTenantActivityLogs(facilityId: number): TenantActivityLog[] {
  const facilityActivityLogs: Record<number, TenantActivityLog[]> = {
    1: [
      {
        id: "act-1-001",
        facilityId: 1,
        timestamp: "2025-11-30T10:30:00Z",
        actorId: "user-101",
        actorName: "Admin User",
        actorRole: "Admin",
        action: "Created booking",
        actionType: "booking",
        targetType: "Booking",
        targetName: "Max - Daycare",
        targetId: "bk-001",
        description: "Created new daycare booking for Max (Golden Retriever)",
      },
      {
        id: "act-1-002",
        facilityId: 1,
        timestamp: "2025-11-30T09:45:00Z",
        actorId: "user-102",
        actorName: "Manager One",
        actorRole: "Manager",
        action: "Processed payment",
        actionType: "payment",
        targetType: "Payment",
        targetName: "Invoice #INV-2025-156",
        targetId: "pay-001",
        description: "Processed payment of $150.00 for grooming services",
        metadata: { amount: 150.0, method: "Credit Card" },
      },
      {
        id: "act-1-003",
        facilityId: 1,
        timestamp: "2025-11-30T08:20:00Z",
        actorId: "user-101",
        actorName: "Admin User",
        actorRole: "Admin",
        action: "Updated client profile",
        actionType: "client",
        targetType: "Client",
        targetName: "Alice Johnson",
        targetId: "client-001",
        description: "Updated contact information for Alice Johnson",
      },
      {
        id: "act-1-004",
        facilityId: 1,
        timestamp: "2025-11-29T16:30:00Z",
        actorId: "user-103",
        actorName: "Staff One",
        actorRole: "Staff",
        action: "Checked in pet",
        actionType: "pet",
        targetType: "Pet",
        targetName: "Buddy",
        targetId: "pet-001",
        description: "Checked in Buddy for scheduled daycare session",
      },
      {
        id: "act-1-005",
        facilityId: 1,
        timestamp: "2025-11-29T14:15:00Z",
        actorId: "user-102",
        actorName: "Manager One",
        actorRole: "Manager",
        action: "Modified schedule",
        actionType: "staff",
        targetType: "Schedule",
        targetName: "Week 48 Schedule",
        targetId: "sch-001",
        description: "Updated staff schedule for the upcoming week",
      },
      {
        id: "act-1-006",
        facilityId: 1,
        timestamp: "2025-11-29T11:00:00Z",
        actorId: "user-101",
        actorName: "Admin User",
        actorRole: "Admin",
        action: "Updated service pricing",
        actionType: "service",
        targetType: "Service",
        targetName: "Premium Grooming",
        targetId: "svc-001",
        description: "Updated pricing for premium grooming package",
        metadata: { oldPrice: 75.0, newPrice: 85.0 },
      },
      {
        id: "act-1-007",
        facilityId: 1,
        timestamp: "2025-11-28T15:45:00Z",
        actorId: "user-102",
        actorName: "Manager One",
        actorRole: "Manager",
        action: "Sent notification",
        actionType: "communication",
        targetType: "Notification",
        targetName: "Appointment Reminder",
        targetId: "notif-001",
        description: "Sent bulk appointment reminders to 45 clients",
        metadata: { recipientCount: 45 },
      },
      {
        id: "act-1-008",
        facilityId: 1,
        timestamp: "2025-11-28T10:30:00Z",
        actorId: "user-101",
        actorName: "Admin User",
        actorRole: "Admin",
        action: "Added staff member",
        actionType: "user",
        targetType: "User",
        targetName: "Emily Davis",
        targetId: "user-104",
        description: "Added new staff member Emily Davis with Staff role",
      },
      {
        id: "act-1-009",
        facilityId: 1,
        timestamp: "2025-11-27T17:00:00Z",
        actorId: "system",
        actorName: "System",
        actorRole: "System",
        action: "Generated report",
        actionType: "system",
        targetType: "Report",
        targetName: "Weekly Revenue Report",
        targetId: "rpt-001",
        description: "Auto-generated weekly revenue report",
      },
      {
        id: "act-1-010",
        facilityId: 1,
        timestamp: "2025-11-27T09:00:00Z",
        actorId: "user-103",
        actorName: "Staff One",
        actorRole: "Staff",
        action: "Completed grooming",
        actionType: "service",
        targetType: "Appointment",
        targetName: "Luna - Full Groom",
        targetId: "apt-001",
        description: "Completed full grooming service for Luna (Poodle)",
      },
    ],
    2: [
      {
        id: "act-2-001",
        facilityId: 2,
        timestamp: "2025-11-30T11:00:00Z",
        actorId: "user-201",
        actorName: "Admin Groom",
        actorRole: "Admin",
        action: "Updated business hours",
        actionType: "settings",
        targetType: "Settings",
        targetName: "Operating Hours",
        targetId: "set-001",
        description: "Updated Saturday operating hours to 9 AM - 6 PM",
      },
      {
        id: "act-2-002",
        facilityId: 2,
        timestamp: "2025-11-30T09:30:00Z",
        actorId: "user-202",
        actorName: "Staff Groom",
        actorRole: "Staff",
        action: "Created booking",
        actionType: "booking",
        targetType: "Booking",
        targetName: "Rex - Grooming",
        targetId: "bk-002",
        description: "Scheduled grooming appointment for Rex",
      },
      {
        id: "act-2-003",
        facilityId: 2,
        timestamp: "2025-11-29T15:20:00Z",
        actorId: "user-201",
        actorName: "Admin Groom",
        actorRole: "Admin",
        action: "Processed refund",
        actionType: "payment",
        targetType: "Payment",
        targetName: "Refund #REF-001",
        targetId: "pay-002",
        description: "Processed refund of $45.00 for cancelled appointment",
        metadata: { amount: 45.0, reason: "Cancelled by client" },
      },
    ],
    3: [
      {
        id: "act-3-001",
        facilityId: 3,
        timestamp: "2025-11-30T08:00:00Z",
        actorId: "user-301",
        actorName: "Admin Board",
        actorRole: "Admin",
        action: "Added new kennel",
        actionType: "settings",
        targetType: "Resource",
        targetName: "Kennel Block D",
        targetId: "res-001",
        description: "Added new kennel block with 20 units",
      },
      {
        id: "act-3-002",
        facilityId: 3,
        timestamp: "2025-11-29T18:00:00Z",
        actorId: "user-302",
        actorName: "Manager Board",
        actorRole: "Manager",
        action: "Extended boarding",
        actionType: "booking",
        targetType: "Booking",
        targetName: "Charlie - Boarding",
        targetId: "bk-003",
        description: "Extended boarding reservation for Charlie by 3 days",
      },
    ],
  };

  return (
    facilityActivityLogs[facilityId] || generateDefaultActivityLogs(facilityId)
  );
}

// Generate tenant-specific audit logs
export function getTenantAuditLogs(facilityId: number): TenantAuditLog[] {
  const facilityAuditLogs: Record<number, TenantAuditLog[]> = {
    1: [
      {
        id: "audit-1-001",
        facilityId: 1,
        timestamp: "2025-11-30T10:30:00Z",
        userId: "user-101",
        userName: "Admin User",
        userRole: "Admin",
        action: "Updated Pricing",
        category: "Financial",
        entityType: "Service",
        entityId: "svc-001",
        entityName: "Premium Grooming",
        changes: [
          { field: "price", oldValue: "$75.00", newValue: "$85.00" },
          { field: "duration", oldValue: "60 min", newValue: "75 min" },
        ],
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Medium",
        status: "Success",
        description:
          "Updated pricing and duration for premium grooming service",
      },
      {
        id: "audit-1-002",
        facilityId: 1,
        timestamp: "2025-11-30T09:15:00Z",
        userId: "user-101",
        userName: "Admin User",
        userRole: "Admin",
        action: "Modified User Permissions",
        category: "User Access",
        entityType: "User",
        entityId: "user-103",
        entityName: "Staff One",
        changes: [
          { field: "canProcessPayments", oldValue: "false", newValue: "true" },
          { field: "canViewReports", oldValue: "false", newValue: "true" },
        ],
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "High",
        status: "Success",
        description: "Granted additional permissions to Staff One",
      },
      {
        id: "audit-1-003",
        facilityId: 1,
        timestamp: "2025-11-29T16:45:00Z",
        userId: "user-102",
        userName: "Manager One",
        userRole: "Manager",
        action: "Failed Login Attempt",
        category: "Security",
        entityType: "Authentication",
        entityId: "auth-001",
        entityName: "Login System",
        changes: [],
        ipAddress: "10.0.0.45",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
        severity: "High",
        status: "Failed",
        description: "Failed login attempt - Invalid password (3rd attempt)",
      },
      {
        id: "audit-1-004",
        facilityId: 1,
        timestamp: "2025-11-29T14:30:00Z",
        userId: "user-101",
        userName: "Admin User",
        userRole: "Admin",
        action: "Updated Facility Settings",
        category: "Configuration",
        entityType: "Settings",
        entityId: "settings-001",
        entityName: "Booking Settings",
        changes: [
          {
            field: "maxAdvanceBooking",
            oldValue: "30 days",
            newValue: "60 days",
          },
          {
            field: "cancellationWindow",
            oldValue: "24 hours",
            newValue: "48 hours",
          },
        ],
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Medium",
        status: "Success",
        description: "Modified booking and cancellation policies",
      },
      {
        id: "audit-1-005",
        facilityId: 1,
        timestamp: "2025-11-29T11:20:00Z",
        userId: "user-102",
        userName: "Manager One",
        userRole: "Manager",
        action: "Exported Client Data",
        category: "Data",
        entityType: "Export",
        entityId: "export-001",
        entityName: "Client List Export",
        changes: [],
        ipAddress: "192.168.1.52",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        severity: "Medium",
        status: "Success",
        description: "Exported client contact list for marketing campaign",
      },
      {
        id: "audit-1-006",
        facilityId: 1,
        timestamp: "2025-11-28T17:00:00Z",
        userId: "system",
        userName: "System Automation",
        userRole: "System",
        action: "Automated Backup",
        category: "System",
        entityType: "Backup",
        entityId: "backup-001",
        entityName: "Daily Backup",
        changes: [],
        ipAddress: "127.0.0.1",
        userAgent: "System/1.0",
        severity: "Low",
        status: "Success",
        description: "Completed daily automated backup of facility data",
      },
      {
        id: "audit-1-007",
        facilityId: 1,
        timestamp: "2025-11-28T10:45:00Z",
        userId: "user-101",
        userName: "Admin User",
        userRole: "Admin",
        action: "Created Booking",
        category: "Booking",
        entityType: "Booking",
        entityId: "bk-001",
        entityName: "Max - Daycare Booking",
        changes: [
          { field: "status", oldValue: "N/A", newValue: "Confirmed" },
          { field: "date", oldValue: "N/A", newValue: "2025-12-01" },
        ],
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Low",
        status: "Success",
        description: "Created new daycare booking for client Alice Johnson",
      },
      {
        id: "audit-1-008",
        facilityId: 1,
        timestamp: "2025-11-27T15:30:00Z",
        userId: "user-101",
        userName: "Admin User",
        userRole: "Admin",
        action: "Deleted Client Record",
        category: "Client",
        entityType: "Client",
        entityId: "client-old",
        entityName: "Inactive Client - John Doe",
        changes: [
          { field: "status", oldValue: "Inactive", newValue: "Deleted" },
        ],
        ipAddress: "192.168.1.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Critical",
        status: "Success",
        description:
          "Permanently deleted inactive client record per GDPR request",
      },
    ],
    2: [
      {
        id: "audit-2-001",
        facilityId: 2,
        timestamp: "2025-11-30T11:00:00Z",
        userId: "user-201",
        userName: "Admin Groom",
        userRole: "Admin",
        action: "Updated Business Hours",
        category: "Configuration",
        entityType: "Settings",
        entityId: "hours-001",
        entityName: "Operating Hours",
        changes: [
          { field: "saturdayOpen", oldValue: "10:00 AM", newValue: "9:00 AM" },
          { field: "saturdayClose", oldValue: "5:00 PM", newValue: "6:00 PM" },
        ],
        ipAddress: "192.168.2.10",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Low",
        status: "Success",
        description: "Extended Saturday operating hours",
      },
      {
        id: "audit-2-002",
        facilityId: 2,
        timestamp: "2025-11-29T14:00:00Z",
        userId: "user-201",
        userName: "Admin Groom",
        userRole: "Admin",
        action: "Processed Refund",
        category: "Financial",
        entityType: "Payment",
        entityId: "refund-001",
        entityName: "Refund Transaction",
        changes: [
          { field: "amount", oldValue: "N/A", newValue: "$45.00" },
          { field: "status", oldValue: "Pending", newValue: "Completed" },
        ],
        ipAddress: "192.168.2.10",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Medium",
        status: "Success",
        description: "Processed refund for cancelled grooming appointment",
      },
    ],
    3: [
      {
        id: "audit-3-001",
        facilityId: 3,
        timestamp: "2025-11-30T08:00:00Z",
        userId: "user-301",
        userName: "Admin Board",
        userRole: "Admin",
        action: "Added Resource",
        category: "Configuration",
        entityType: "Resource",
        entityId: "res-001",
        entityName: "Kennel Block D",
        changes: [
          { field: "capacity", oldValue: "N/A", newValue: "20 units" },
          { field: "status", oldValue: "N/A", newValue: "Active" },
        ],
        ipAddress: "192.168.3.10",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        severity: "Medium",
        status: "Success",
        description: "Added new kennel block with 20 boarding units",
      },
    ],
  };

  return facilityAuditLogs[facilityId] || generateDefaultAuditLogs(facilityId);
}

// Generate tenant-specific statistics
export function getTenantLogStatistics(
  facilityId: number,
): TenantLogStatistics {
  const baseStats: Record<number, TenantLogStatistics> = {
    1: {
      facilityId: 1,
      totalActivityLogs: 1247,
      totalAuditLogs: 892,
      todayActivityLogs: 34,
      todayAuditLogs: 12,
      weeklyTrend: [
        { date: "Nov 24", activity: 156, audit: 89 },
        { date: "Nov 25", activity: 178, audit: 102 },
        { date: "Nov 26", activity: 142, audit: 78 },
        { date: "Nov 27", activity: 189, audit: 115 },
        { date: "Nov 28", activity: 167, audit: 98 },
        { date: "Nov 29", activity: 203, audit: 124 },
        { date: "Nov 30", activity: 34, audit: 12 },
      ],
      activityByType: [
        { type: "booking", count: 423, percentage: 33.9 },
        { type: "payment", count: 245, percentage: 19.6 },
        { type: "client", count: 198, percentage: 15.9 },
        { type: "pet", count: 156, percentage: 12.5 },
        { type: "staff", count: 89, percentage: 7.1 },
        { type: "service", count: 67, percentage: 5.4 },
        { type: "communication", count: 45, percentage: 3.6 },
        { type: "system", count: 24, percentage: 1.9 },
      ],
      auditByCategory: [
        { category: "Booking", count: 312, percentage: 35.0 },
        { category: "Financial", count: 189, percentage: 21.2 },
        { category: "User Access", count: 145, percentage: 16.3 },
        { category: "Configuration", count: 98, percentage: 11.0 },
        { category: "Security", count: 67, percentage: 7.5 },
        { category: "Data", count: 45, percentage: 5.0 },
        { category: "System", count: 36, percentage: 4.0 },
      ],
      topUsers: [
        { userId: "user-101", userName: "Admin User", actionCount: 456 },
        { userId: "user-102", userName: "Manager One", actionCount: 312 },
        { userId: "user-103", userName: "Staff One", actionCount: 189 },
        { userId: "system", userName: "System", actionCount: 290 },
      ],
      securityEvents: 23,
      failedActions: 8,
      criticalEvents: 3,
    },
    2: {
      facilityId: 2,
      totalActivityLogs: 534,
      totalAuditLogs: 298,
      todayActivityLogs: 12,
      todayAuditLogs: 5,
      weeklyTrend: [
        { date: "Nov 24", activity: 67, audit: 34 },
        { date: "Nov 25", activity: 78, audit: 42 },
        { date: "Nov 26", activity: 56, audit: 28 },
        { date: "Nov 27", activity: 89, audit: 51 },
        { date: "Nov 28", activity: 72, audit: 39 },
        { date: "Nov 29", activity: 84, audit: 45 },
        { date: "Nov 30", activity: 12, audit: 5 },
      ],
      activityByType: [
        { type: "booking", count: 189, percentage: 35.4 },
        { type: "payment", count: 112, percentage: 21.0 },
        { type: "client", count: 87, percentage: 16.3 },
        { type: "service", count: 78, percentage: 14.6 },
        { type: "communication", count: 34, percentage: 6.4 },
        { type: "settings", count: 23, percentage: 4.3 },
        { type: "system", count: 11, percentage: 2.1 },
      ],
      auditByCategory: [
        { category: "Booking", count: 134, percentage: 45.0 },
        { category: "Financial", count: 67, percentage: 22.5 },
        { category: "Configuration", count: 45, percentage: 15.1 },
        { category: "User Access", count: 28, percentage: 9.4 },
        { category: "Security", count: 15, percentage: 5.0 },
        { category: "System", count: 9, percentage: 3.0 },
      ],
      topUsers: [
        { userId: "user-201", userName: "Admin Groom", actionCount: 234 },
        { userId: "user-202", userName: "Staff Groom", actionCount: 156 },
        { userId: "system", userName: "System", actionCount: 144 },
      ],
      securityEvents: 8,
      failedActions: 3,
      criticalEvents: 1,
    },
  };

  return baseStats[facilityId] || generateDefaultStatistics(facilityId);
}

// Helper functions to generate default data for facilities without specific mock data
function generateDefaultActivityLogs(facilityId: number): TenantActivityLog[] {
  return [
    {
      id: `act-${facilityId}-001`,
      facilityId,
      timestamp: new Date().toISOString(),
      actorId: "user-default",
      actorName: "Facility Admin",
      actorRole: "Admin",
      action: "System initialized",
      actionType: "system",
      targetType: "System",
      targetName: "Facility Setup",
      targetId: "sys-001",
      description: "Facility logging system initialized",
    },
  ];
}

function generateDefaultAuditLogs(facilityId: number): TenantAuditLog[] {
  return [
    {
      id: `audit-${facilityId}-001`,
      facilityId,
      timestamp: new Date().toISOString(),
      userId: "user-default",
      userName: "Facility Admin",
      userRole: "Admin",
      action: "System Initialized",
      category: "System",
      entityType: "System",
      entityId: "sys-001",
      entityName: "Audit System",
      changes: [],
      ipAddress: "127.0.0.1",
      userAgent: "System/1.0",
      severity: "Low",
      status: "Success",
      description: "Audit logging system initialized for facility",
    },
  ];
}

function generateDefaultStatistics(facilityId: number): TenantLogStatistics {
  return {
    facilityId,
    totalActivityLogs: 0,
    totalAuditLogs: 0,
    todayActivityLogs: 0,
    todayAuditLogs: 0,
    weeklyTrend: [
      { date: "Day 1", activity: 0, audit: 0 },
      { date: "Day 2", activity: 0, audit: 0 },
      { date: "Day 3", activity: 0, audit: 0 },
      { date: "Day 4", activity: 0, audit: 0 },
      { date: "Day 5", activity: 0, audit: 0 },
      { date: "Day 6", activity: 0, audit: 0 },
      { date: "Day 7", activity: 0, audit: 0 },
    ],
    activityByType: [],
    auditByCategory: [],
    topUsers: [],
    securityEvents: 0,
    failedActions: 0,
    criticalEvents: 0,
  };
}
