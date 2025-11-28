// Audit & Logging Data Models
export interface AuditLog {
  id: string;
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
    | "System";
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
  facilityId?: string;
  facilityName?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Success" | "Failed" | "Pending";
  description: string;
}

export interface AuditStatistics {
  totalLogs: number;
  financialChanges: number;
  userAccessEvents: number;
  configurationChanges: number;
  securityEvents: number;
  criticalEvents: number;
  failedActions: number;
  todayLogs: number;
  weeklyTrend: { date: string; count: number }[];
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  topUsers: { userId: string; userName: string; actionCount: number }[];
}

// Data Management Models
export interface DataBackup {
  id: string;
  backupName: string;
  backupType: "Full" | "Incremental" | "Differential";
  facilityId?: string;
  facilityName?: string;
  scope: "System" | "Facility" | "Module";
  status: "Scheduled" | "In Progress" | "Completed" | "Failed" | "Cancelled";
  startTime: string;
  endTime?: string;
  duration?: string;
  size: number; // in MB
  location: string;
  triggeredBy: string;
  backupMethod: "Automated" | "Manual";
  retentionPeriod: number; // in days
  expiryDate: string;
  verificationStatus: "Verified" | "Failed" | "Pending" | "Not Verified";
  isEncrypted: boolean;
  compressionRatio: number;
}

export interface DataRecovery {
  id: string;
  recoveryName: string;
  backupId: string;
  backupName: string;
  recoveryType: "Full" | "Partial" | "Point-in-Time";
  facilityId?: string;
  facilityName?: string;
  requestedBy: string;
  requestedAt: string;
  startTime?: string;
  endTime?: string;
  status: "Requested" | "In Progress" | "Completed" | "Failed" | "Cancelled";
  targetLocation: string;
  itemsToRestore: string[];
  pointInTime?: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: string;
  errorMessage?: string;
}

export interface RetentionPolicy {
  id: string;
  policyName: string;
  dataType: string;
  retentionPeriod: number; // in days
  action: "Archive" | "Purge" | "Anonymize";
  status: "Active" | "Inactive" | "Draft";
  applicableTo: string[];
  createdBy: string;
  createdAt: string;
  lastModified: string;
  nextExecution: string;
  itemsProcessed: number;
  complianceFramework?: string;
}

// System Configuration Models
export interface Integration {
  id: string;
  name: string;
  type:
    | "Email"
    | "SMS"
    | "Messaging"
    | "Feedback"
    | "Payment"
    | "Storage"
    | "Analytics";
  provider: string;
  status: "Active" | "Inactive" | "Error" | "Testing";
  connectedAt: string;
  lastSync?: string;
  apiEndpoint: string;
  authenticationType: "API Key" | "OAuth" | "Basic Auth" | "Token";
  credentials: {
    encrypted: boolean;
    lastUpdated: string;
  };
  configuration: Record<string, unknown>;
  usageStats: {
    totalRequests: number;
    successRate: number;
    lastRequest: string;
    monthlyUsage: number;
  };
  facilities: string[];
  testStatus?: "Passed" | "Failed" | "Not Tested";
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  secretKey?: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  lastUsed?: string;
  status: "Active" | "Expired" | "Revoked" | "Suspended";
  permissions: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
    currentUsage: number;
  };
  usageStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequest: string;
  };
  ipWhitelist?: string[];
  description: string;
}

export interface SystemSetting {
  id: string;
  category: "General" | "Security" | "Performance" | "Features" | "Maintenance";
  name: string;
  key: string;
  value: string | number | boolean;
  type: "string" | "number" | "boolean" | "json";
  description: string;
  defaultValue: string | number | boolean;
  isEditable: boolean;
  requiresRestart: boolean;
  lastModified: string;
  modifiedBy: string;
  validationRules?: string[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetFacilities?: string[];
  targetUsers?: string[];
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  dependencies?: string[];
}

// Mock Data
export const auditLogs: AuditLog[] = [
  {
    id: "audit-001",
    timestamp: "2025-11-28T14:23:45Z",
    userId: "user-123",
    userName: "John Admin",
    userRole: "Super Admin",
    action: "Updated Pricing",
    category: "Financial",
    entityType: "Facility",
    entityId: "fac-001",
    entityName: "Pet Paradise Miami",
    changes: [
      { field: "boardingPrice", oldValue: "$45.00", newValue: "$49.99" },
      { field: "daycarePrice", oldValue: "$35.00", newValue: "$39.99" },
    ],
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    facilityId: "fac-001",
    facilityName: "Pet Paradise Miami",
    severity: "Medium",
    status: "Success",
    description: "Updated pricing structure for boarding and daycare services",
  },
  {
    id: "audit-002",
    timestamp: "2025-11-28T13:15:22Z",
    userId: "user-456",
    userName: "Sarah Manager",
    userRole: "Facility Admin",
    action: "User Login Attempt",
    category: "Security",
    entityType: "User",
    entityId: "user-456",
    entityName: "Sarah Manager",
    changes: [],
    ipAddress: "10.0.0.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    facilityId: "fac-002",
    facilityName: "Paws & Claws NYC",
    severity: "High",
    status: "Failed",
    description: "Failed login attempt - Invalid credentials",
  },
  {
    id: "audit-003",
    timestamp: "2025-11-28T12:45:10Z",
    userId: "user-789",
    userName: "Mike Support",
    userRole: "Technical Support",
    action: "Modified User Permissions",
    category: "User Access",
    entityType: "User",
    entityId: "user-890",
    entityName: "Emily Staff",
    changes: [
      { field: "role", oldValue: "Staff", newValue: "Manager" },
      { field: "permissions", oldValue: "Basic", newValue: "Advanced" },
    ],
    ipAddress: "172.16.0.10",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    severity: "High",
    status: "Success",
    description: "Elevated user permissions from Staff to Manager role",
  },
  {
    id: "audit-004",
    timestamp: "2025-11-28T11:30:55Z",
    userId: "system",
    userName: "System Automation",
    userRole: "System",
    action: "Database Backup",
    category: "System",
    entityType: "Backup",
    entityId: "backup-125",
    entityName: "Daily Automated Backup",
    changes: [],
    ipAddress: "127.0.0.1",
    userAgent: "System/1.0",
    severity: "Low",
    status: "Success",
    description: "Automated daily database backup completed successfully",
  },
  {
    id: "audit-005",
    timestamp: "2025-11-28T10:15:33Z",
    userId: "user-123",
    userName: "John Admin",
    userRole: "Super Admin",
    action: "Updated System Configuration",
    category: "Configuration",
    entityType: "SystemSettings",
    entityId: "config-001",
    entityName: "Email Service Settings",
    changes: [
      {
        field: "smtp_host",
        oldValue: "smtp.old.com",
        newValue: "smtp.new.com",
      },
      { field: "smtp_port", oldValue: "587", newValue: "465" },
    ],
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    severity: "Critical",
    status: "Success",
    description: "Updated email service SMTP configuration",
  },
];

export const auditStatistics: AuditStatistics = {
  totalLogs: 15842,
  financialChanges: 1245,
  userAccessEvents: 3890,
  configurationChanges: 567,
  securityEvents: 234,
  criticalEvents: 89,
  failedActions: 156,
  todayLogs: 234,
  weeklyTrend: [
    { date: "Nov 22", count: 1840 },
    { date: "Nov 23", count: 2120 },
    { date: "Nov 24", count: 1950 },
    { date: "Nov 25", count: 2340 },
    { date: "Nov 26", count: 2180 },
    { date: "Nov 27", count: 2290 },
    { date: "Nov 28", count: 234 },
  ],
  categoryBreakdown: [
    { category: "User Access", count: 3890, percentage: 24.6 },
    { category: "Financial", count: 1245, percentage: 7.9 },
    { category: "Configuration", count: 567, percentage: 3.6 },
    { category: "Security", count: 234, percentage: 1.5 },
    { category: "Data", count: 5678, percentage: 35.8 },
    { category: "System", count: 4228, percentage: 26.7 },
  ],
  topUsers: [
    { userId: "user-123", userName: "John Admin", actionCount: 1456 },
    { userId: "user-456", userName: "Sarah Manager", actionCount: 892 },
    { userId: "user-789", userName: "Mike Support", actionCount: 678 },
    { userId: "system", userName: "System Automation", actionCount: 5432 },
  ],
};

export const dataBackups: DataBackup[] = [
  {
    id: "backup-001",
    backupName: "Daily Full Backup - Nov 28",
    backupType: "Full",
    scope: "System",
    status: "Completed",
    startTime: "2025-11-28T02:00:00Z",
    endTime: "2025-11-28T03:45:20Z",
    duration: "1h 45m 20s",
    size: 8450,
    location: "s3://backups/system/2025-11-28-full.bak",
    triggeredBy: "System Automation",
    backupMethod: "Automated",
    retentionPeriod: 30,
    expiryDate: "2025-12-28",
    verificationStatus: "Verified",
    isEncrypted: true,
    compressionRatio: 3.2,
  },
  {
    id: "backup-002",
    backupName: "Pet Paradise Miami - Manual Backup",
    backupType: "Full",
    facilityId: "fac-001",
    facilityName: "Pet Paradise Miami",
    scope: "Facility",
    status: "Completed",
    startTime: "2025-11-27T15:30:00Z",
    endTime: "2025-11-27T15:48:15Z",
    duration: "18m 15s",
    size: 1250,
    location: "s3://backups/facilities/fac-001-2025-11-27.bak",
    triggeredBy: "John Admin",
    backupMethod: "Manual",
    retentionPeriod: 90,
    expiryDate: "2026-02-25",
    verificationStatus: "Verified",
    isEncrypted: true,
    compressionRatio: 2.8,
  },
  {
    id: "backup-003",
    backupName: "Incremental Backup - Nov 28",
    backupType: "Incremental",
    scope: "System",
    status: "In Progress",
    startTime: "2025-11-28T14:00:00Z",
    size: 450,
    location: "s3://backups/system/2025-11-28-incremental.bak",
    triggeredBy: "System Automation",
    backupMethod: "Automated",
    retentionPeriod: 7,
    expiryDate: "2025-12-05",
    verificationStatus: "Pending",
    isEncrypted: true,
    compressionRatio: 4.1,
  },
  {
    id: "backup-004",
    backupName: "Financial Module Backup",
    backupType: "Differential",
    scope: "Module",
    status: "Completed",
    startTime: "2025-11-28T08:00:00Z",
    endTime: "2025-11-28T08:12:30Z",
    duration: "12m 30s",
    size: 680,
    location: "s3://backups/modules/financial-2025-11-28.bak",
    triggeredBy: "System Automation",
    backupMethod: "Automated",
    retentionPeriod: 60,
    expiryDate: "2026-01-27",
    verificationStatus: "Verified",
    isEncrypted: true,
    compressionRatio: 3.5,
  },
];

export const dataRecoveries: DataRecovery[] = [
  {
    id: "recovery-001",
    recoveryName: "Restore Pet Paradise Data",
    backupId: "backup-002",
    backupName: "Pet Paradise Miami - Manual Backup",
    recoveryType: "Partial",
    facilityId: "fac-001",
    facilityName: "Pet Paradise Miami",
    requestedBy: "John Admin",
    requestedAt: "2025-11-28T10:30:00Z",
    startTime: "2025-11-28T10:35:00Z",
    status: "In Progress",
    targetLocation: "Production Database",
    itemsToRestore: ["Bookings", "Client Records", "Pet Profiles"],
    progress: 67,
    estimatedTimeRemaining: "5 minutes",
  },
  {
    id: "recovery-002",
    recoveryName: "Point-in-Time Recovery - Financial Data",
    backupId: "backup-004",
    backupName: "Financial Module Backup",
    recoveryType: "Point-in-Time",
    requestedBy: "Sarah Manager",
    requestedAt: "2025-11-27T16:00:00Z",
    startTime: "2025-11-27T16:05:00Z",
    endTime: "2025-11-27T16:18:45Z",
    status: "Completed",
    targetLocation: "Production Database",
    itemsToRestore: ["Transactions", "Invoices"],
    pointInTime: "2025-11-27T12:00:00Z",
    progress: 100,
  },
];

export const retentionPolicies: RetentionPolicy[] = [
  {
    id: "policy-001",
    policyName: "Booking Records Retention",
    dataType: "Bookings",
    retentionPeriod: 2555, // 7 years
    action: "Archive",
    status: "Active",
    applicableTo: ["All Facilities"],
    createdBy: "John Admin",
    createdAt: "2024-01-15",
    lastModified: "2025-06-20",
    nextExecution: "2025-12-01",
    itemsProcessed: 45678,
    complianceFramework: "GDPR, SOX",
  },
  {
    id: "policy-002",
    policyName: "Audit Logs Retention",
    dataType: "Audit Logs",
    retentionPeriod: 365,
    action: "Archive",
    status: "Active",
    applicableTo: ["System"],
    createdBy: "System Admin",
    createdAt: "2024-03-10",
    lastModified: "2025-03-10",
    nextExecution: "2025-11-30",
    itemsProcessed: 158420,
    complianceFramework: "ISO 27001",
  },
  {
    id: "policy-003",
    policyName: "Inactive User Data Purge",
    dataType: "User Accounts",
    retentionPeriod: 1095, // 3 years
    action: "Anonymize",
    status: "Active",
    applicableTo: ["All Users"],
    createdBy: "Compliance Officer",
    createdAt: "2024-02-01",
    lastModified: "2025-08-15",
    nextExecution: "2025-12-15",
    itemsProcessed: 234,
    complianceFramework: "GDPR",
  },
];

export const integrations: Integration[] = [
  {
    id: "int-001",
    name: "SendGrid Email Service",
    type: "Email",
    provider: "SendGrid",
    status: "Active",
    connectedAt: "2024-06-15",
    lastSync: "2025-11-28T14:30:00Z",
    apiEndpoint: "https://api.sendgrid.com/v3",
    authenticationType: "API Key",
    credentials: {
      encrypted: true,
      lastUpdated: "2025-09-01",
    },
    configuration: {
      fromEmail: "noreply@petparadise.com",
      fromName: "Pet Paradise",
      replyTo: "support@petparadise.com",
    },
    usageStats: {
      totalRequests: 45678,
      successRate: 99.2,
      lastRequest: "2025-11-28T14:25:00Z",
      monthlyUsage: 12450,
    },
    facilities: ["All"],
    testStatus: "Passed",
  },
  {
    id: "int-002",
    name: "Twilio SMS Service",
    type: "SMS",
    provider: "Twilio",
    status: "Active",
    connectedAt: "2024-07-20",
    lastSync: "2025-11-28T14:15:00Z",
    apiEndpoint: "https://api.twilio.com/2010-04-01",
    authenticationType: "Token",
    credentials: {
      encrypted: true,
      lastUpdated: "2025-10-15",
    },
    configuration: {
      phoneNumber: "+1-555-0123",
      messagingServiceSid: "MG***************",
    },
    usageStats: {
      totalRequests: 23456,
      successRate: 98.8,
      lastRequest: "2025-11-28T14:10:00Z",
      monthlyUsage: 5670,
    },
    facilities: ["fac-001", "fac-002"],
    testStatus: "Passed",
  },
  {
    id: "int-003",
    name: "Stripe Payment Gateway",
    type: "Payment",
    provider: "Stripe",
    status: "Active",
    connectedAt: "2024-05-10",
    lastSync: "2025-11-28T14:20:00Z",
    apiEndpoint: "https://api.stripe.com/v1",
    authenticationType: "API Key",
    credentials: {
      encrypted: true,
      lastUpdated: "2025-11-01",
    },
    configuration: {
      currency: "USD",
      captureMethod: "automatic",
      statementDescriptor: "PET PARADISE",
    },
    usageStats: {
      totalRequests: 78901,
      successRate: 99.6,
      lastRequest: "2025-11-28T14:18:00Z",
      monthlyUsage: 18900,
    },
    facilities: ["All"],
    testStatus: "Passed",
  },
  {
    id: "int-004",
    name: "Slack Notifications",
    type: "Messaging",
    provider: "Slack",
    status: "Error",
    connectedAt: "2024-08-05",
    lastSync: "2025-11-27T22:00:00Z",
    apiEndpoint: "https://slack.com/api",
    authenticationType: "OAuth",
    credentials: {
      encrypted: true,
      lastUpdated: "2025-08-05",
    },
    configuration: {
      workspace: "petparadise",
      defaultChannel: "#notifications",
    },
    usageStats: {
      totalRequests: 3456,
      successRate: 87.5,
      lastRequest: "2025-11-27T22:00:00Z",
      monthlyUsage: 890,
    },
    facilities: ["All"],
    testStatus: "Failed",
  },
];

export const apiKeys: ApiKey[] = [
  {
    id: "api-001",
    name: "Mobile App API Key",
    key: "pk_live_51H*********************",
    createdBy: "John Admin",
    createdAt: "2024-06-15",
    lastUsed: "2025-11-28T14:25:00Z",
    status: "Active",
    permissions: [
      "read:bookings",
      "write:bookings",
      "read:clients",
      "read:pets",
    ],
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 50000,
      currentUsage: 12450,
    },
    usageStats: {
      totalRequests: 567890,
      successfulRequests: 562345,
      failedRequests: 5545,
      lastRequest: "2025-11-28T14:25:00Z",
    },
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    description: "API key for mobile application access",
  },
  {
    id: "api-002",
    name: "Partner Integration Key",
    key: "pk_test_51H*********************",
    createdBy: "Sarah Manager",
    createdAt: "2024-09-20",
    expiresAt: "2026-09-20",
    lastUsed: "2025-11-28T10:15:00Z",
    status: "Active",
    permissions: ["read:bookings", "read:facilities"],
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 10000,
      currentUsage: 2345,
    },
    usageStats: {
      totalRequests: 45678,
      successfulRequests: 45123,
      failedRequests: 555,
      lastRequest: "2025-11-28T10:15:00Z",
    },
    description: "API key for third-party partner integration",
  },
  {
    id: "api-003",
    name: "Analytics Dashboard Key",
    key: "pk_live_72H*********************",
    createdBy: "Mike Support",
    createdAt: "2025-01-10",
    lastUsed: "2025-11-28T14:00:00Z",
    status: "Active",
    permissions: ["read:analytics", "read:reports"],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 20000,
      currentUsage: 8900,
    },
    usageStats: {
      totalRequests: 234567,
      successfulRequests: 233890,
      failedRequests: 677,
      lastRequest: "2025-11-28T14:00:00Z",
    },
    description: "Read-only access for analytics dashboard",
  },
];

export const systemSettings: SystemSetting[] = [
  {
    id: "setting-001",
    category: "General",
    name: "System Name",
    key: "system.name",
    value: "Pet Paradise Platform",
    type: "string",
    description: "The display name of the system",
    defaultValue: "Pet Paradise Platform",
    isEditable: true,
    requiresRestart: false,
    lastModified: "2024-06-15",
    modifiedBy: "John Admin",
  },
  {
    id: "setting-002",
    category: "Security",
    name: "Session Timeout",
    key: "security.session_timeout",
    value: 3600,
    type: "number",
    description: "Session timeout in seconds",
    defaultValue: 3600,
    isEditable: true,
    requiresRestart: false,
    lastModified: "2025-03-20",
    modifiedBy: "Security Admin",
    validationRules: ["min:300", "max:86400"],
  },
  {
    id: "setting-003",
    category: "Security",
    name: "Multi-Factor Authentication",
    key: "security.mfa_enabled",
    value: true,
    type: "boolean",
    description: "Enable multi-factor authentication for all users",
    defaultValue: false,
    isEditable: true,
    requiresRestart: false,
    lastModified: "2025-06-01",
    modifiedBy: "Security Admin",
  },
  {
    id: "setting-004",
    category: "Performance",
    name: "Cache TTL",
    key: "performance.cache_ttl",
    value: 300,
    type: "number",
    description: "Cache time-to-live in seconds",
    defaultValue: 300,
    isEditable: true,
    requiresRestart: true,
    lastModified: "2025-01-10",
    modifiedBy: "System Admin",
    validationRules: ["min:60", "max:3600"],
  },
  {
    id: "setting-005",
    category: "Maintenance",
    name: "Maintenance Mode",
    key: "system.maintenance_mode",
    value: false,
    type: "boolean",
    description: "Enable system maintenance mode",
    defaultValue: false,
    isEditable: true,
    requiresRestart: false,
    lastModified: "2025-11-15",
    modifiedBy: "John Admin",
  },
];

export const featureFlags: FeatureFlag[] = [
  {
    id: "flag-001",
    name: "New Booking Interface",
    key: "feature.new_booking_ui",
    description: "Enable the redesigned booking interface",
    enabled: true,
    rolloutPercentage: 50,
    targetFacilities: ["fac-001", "fac-002"],
    startDate: "2025-11-01",
    createdBy: "Product Manager",
    createdAt: "2025-10-15",
    lastModified: "2025-11-20",
  },
  {
    id: "flag-002",
    name: "AI-Powered Recommendations",
    key: "feature.ai_recommendations",
    description: "Enable AI-powered service recommendations",
    enabled: false,
    rolloutPercentage: 0,
    startDate: "2025-12-01",
    endDate: "2026-03-01",
    createdBy: "Tech Lead",
    createdAt: "2025-11-10",
    lastModified: "2025-11-10",
    dependencies: ["feature.analytics_v2"],
  },
  {
    id: "flag-003",
    name: "Mobile App Push Notifications",
    key: "feature.push_notifications",
    description: "Enable push notifications for mobile app",
    enabled: true,
    rolloutPercentage: 100,
    createdBy: "Mobile Team Lead",
    createdAt: "2025-09-01",
    lastModified: "2025-10-15",
  },
];

// Helper functions
export function getAuditLogsByCategory(category: string): AuditLog[] {
  return auditLogs.filter((log) => log.category === category);
}

export function getAuditLogsBySeverity(severity: string): AuditLog[] {
  return auditLogs.filter((log) => log.severity === severity);
}

export function getActiveBackups(): DataBackup[] {
  return dataBackups.filter(
    (backup) =>
      backup.status === "Completed" || backup.status === "In Progress",
  );
}

export function getActiveIntegrations(): Integration[] {
  return integrations.filter((int) => int.status === "Active");
}

export function getActiveApiKeys(): ApiKey[] {
  return apiKeys.filter((key) => key.status === "Active");
}

export function getEditableSettings(): SystemSetting[] {
  return systemSettings.filter((setting) => setting.isEditable);
}

export function getEnabledFeatureFlags(): FeatureFlag[] {
  return featureFlags.filter((flag) => flag.enabled);
}
