// Feature Toggles and Remote Config Data Models

export interface TenantModuleConfig extends Record<string, unknown> {
  tenantId: string;
  tenantName: string;
  subscriptionTier: "beginner" | "pro" | "enterprise" | "custom";
  enabledModules: string[];
  disabledModules: string[];
  moduleOverrides: ModuleOverride[];
  lastUpdated: string;
  updatedBy: string;
}

export interface ModuleOverride {
  moduleId: string;
  moduleName: string;
  isEnabled: boolean;
  overrideReason: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface RemoteConfigFlag extends Record<string, unknown> {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "boolean" | "string" | "number" | "json";
  defaultValue: string;
  currentValue: string;
  environment: "development" | "staging" | "production";
  scope: "global" | "tenant" | "user";
  targetTenants?: string[];
  targetUsers?: string[];
  isActive: boolean;
  lastSynced: string;
  syncStatus: "synced" | "pending" | "failed";
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ConfigChangeLog {
  id: string;
  configId: string;
  configKey: string;
  action: "created" | "updated" | "deleted" | "toggled" | "synced";
  previousValue?: string;
  newValue?: string;
  actor: string;
  timestamp: string;
  affectedTenants: number;
  syncDuration?: number; // in milliseconds
}

// Available modules that can be toggled
export const availableModules = [
  {
    id: "module-booking",
    name: "Booking & Reservation",
    category: "core",
    tier: "all",
  },
  {
    id: "module-staff-scheduling",
    name: "Staff Scheduling",
    category: "core",
    tier: "pro",
  },
  {
    id: "module-customer-management",
    name: "Customer Management",
    category: "core",
    tier: "all",
  },
  {
    id: "module-financial-reporting",
    name: "Financial Reporting",
    category: "advanced",
    tier: "pro",
  },
  {
    id: "module-communication",
    name: "Communication Hub",
    category: "core",
    tier: "all",
  },
  {
    id: "module-training-education",
    name: "Training & Education",
    category: "premium",
    tier: "enterprise",
  },
  {
    id: "module-grooming-management",
    name: "Grooming Management",
    category: "advanced",
    tier: "pro",
  },
  {
    id: "module-inventory-management",
    name: "Inventory Management",
    category: "advanced",
    tier: "pro",
  },
  {
    id: "module-analytics",
    name: "Advanced Analytics",
    category: "premium",
    tier: "enterprise",
  },
  {
    id: "module-multi-location",
    name: "Multi-Location Support",
    category: "premium",
    tier: "enterprise",
  },
  {
    id: "module-api-access",
    name: "API Access",
    category: "advanced",
    tier: "pro",
  },
  {
    id: "module-white-label",
    name: "White Label Branding",
    category: "premium",
    tier: "enterprise",
  },
];

// Mock tenant configurations
export const tenantModuleConfigs: TenantModuleConfig[] = [
  {
    tenantId: "fac-001",
    tenantName: "Happy Paws Daycare",
    subscriptionTier: "pro",
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-communication",
      "module-grooming-management",
    ],
    disabledModules: [
      "module-financial-reporting",
      "module-inventory-management",
      "module-api-access",
    ],
    moduleOverrides: [
      {
        moduleId: "module-analytics",
        moduleName: "Advanced Analytics",
        isEnabled: true,
        overrideReason: "Trial access granted for 30 days",
        expiresAt: "2024-12-31T23:59:59Z",
        createdAt: "2024-11-01T10:00:00Z",
        createdBy: "Sales Team",
      },
    ],
    lastUpdated: "2024-11-28T14:30:00Z",
    updatedBy: "Admin User",
  },
  {
    tenantId: "fac-002",
    tenantName: "Pawsome Pet Resort",
    subscriptionTier: "enterprise",
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-training-education",
      "module-grooming-management",
      "module-inventory-management",
      "module-analytics",
      "module-multi-location",
      "module-api-access",
      "module-white-label",
    ],
    disabledModules: [],
    moduleOverrides: [],
    lastUpdated: "2024-11-25T09:00:00Z",
    updatedBy: "System",
  },
  {
    tenantId: "fac-003",
    tenantName: "Bark & Play Center",
    subscriptionTier: "beginner",
    enabledModules: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    disabledModules: [],
    moduleOverrides: [
      {
        moduleId: "module-staff-scheduling",
        moduleName: "Staff Scheduling",
        isEnabled: true,
        overrideReason: "Upgrade promotion - free for 3 months",
        expiresAt: "2025-02-28T23:59:59Z",
        createdAt: "2024-11-15T11:00:00Z",
        createdBy: "Marketing Team",
      },
    ],
    lastUpdated: "2024-11-29T08:15:00Z",
    updatedBy: "Support Agent",
  },
  {
    tenantId: "fac-004",
    tenantName: "Furry Friends Grooming",
    subscriptionTier: "pro",
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-communication",
      "module-grooming-management",
      "module-financial-reporting",
    ],
    disabledModules: ["module-inventory-management", "module-api-access"],
    moduleOverrides: [],
    lastUpdated: "2024-11-20T16:45:00Z",
    updatedBy: "Admin User",
  },
  {
    tenantId: "fac-005",
    tenantName: "Pet Paradise Hotel",
    subscriptionTier: "enterprise",
    enabledModules: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-communication",
      "module-grooming-management",
      "module-inventory-management",
      "module-analytics",
      "module-multi-location",
      "module-api-access",
    ],
    disabledModules: ["module-training-education", "module-white-label"],
    moduleOverrides: [],
    lastUpdated: "2024-11-27T12:00:00Z",
    updatedBy: "Account Manager",
  },
];

// Remote config flags
export const remoteConfigFlags: RemoteConfigFlag[] = [
  {
    id: "rc-001",
    key: "feature.new_booking_ui",
    name: "New Booking Interface",
    description: "Enable the redesigned booking interface with improved UX",
    type: "boolean",
    defaultValue: "false",
    currentValue: "true",
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-29T10:30:00Z",
    syncStatus: "synced",
    version: 3,
    createdAt: "2024-10-01T00:00:00Z",
    updatedAt: "2024-11-29T10:30:00Z",
    createdBy: "Product Team",
  },
  {
    id: "rc-002",
    key: "feature.ai_recommendations",
    name: "AI Service Recommendations",
    description:
      "Enable AI-powered service recommendations based on pet history",
    type: "boolean",
    defaultValue: "false",
    currentValue: "false",
    environment: "production",
    scope: "tenant",
    targetTenants: ["fac-002", "fac-005"],
    isActive: true,
    lastSynced: "2024-11-28T15:00:00Z",
    syncStatus: "synced",
    version: 1,
    createdAt: "2024-11-15T00:00:00Z",
    updatedAt: "2024-11-28T15:00:00Z",
    createdBy: "AI Team",
  },
  {
    id: "rc-003",
    key: "config.max_concurrent_bookings",
    name: "Max Concurrent Bookings",
    description:
      "Maximum number of bookings that can be processed simultaneously",
    type: "number",
    defaultValue: "50",
    currentValue: "100",
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-29T08:00:00Z",
    syncStatus: "synced",
    version: 5,
    createdAt: "2024-08-01T00:00:00Z",
    updatedAt: "2024-11-29T08:00:00Z",
    createdBy: "DevOps",
  },
  {
    id: "rc-004",
    key: "feature.dark_mode",
    name: "Dark Mode Theme",
    description: "Enable dark mode theme option for users",
    type: "boolean",
    defaultValue: "true",
    currentValue: "true",
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-25T12:00:00Z",
    syncStatus: "synced",
    version: 1,
    createdAt: "2024-09-01T00:00:00Z",
    updatedAt: "2024-11-25T12:00:00Z",
    createdBy: "Design Team",
  },
  {
    id: "rc-005",
    key: "feature.mobile_check_in",
    name: "Mobile Check-In",
    description: "Allow customers to check in via mobile app",
    type: "boolean",
    defaultValue: "false",
    currentValue: "true",
    environment: "production",
    scope: "tenant",
    targetTenants: ["fac-001", "fac-002", "fac-004", "fac-005"],
    isActive: true,
    lastSynced: "2024-11-29T09:45:00Z",
    syncStatus: "synced",
    version: 2,
    createdAt: "2024-10-15T00:00:00Z",
    updatedAt: "2024-11-29T09:45:00Z",
    createdBy: "Mobile Team",
  },
  {
    id: "rc-006",
    key: "config.session_timeout_minutes",
    name: "Session Timeout",
    description: "User session timeout in minutes",
    type: "number",
    defaultValue: "30",
    currentValue: "60",
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-27T14:30:00Z",
    syncStatus: "synced",
    version: 2,
    createdAt: "2024-07-01T00:00:00Z",
    updatedAt: "2024-11-27T14:30:00Z",
    createdBy: "Security Team",
  },
  {
    id: "rc-007",
    key: "feature.beta_analytics",
    name: "Beta Analytics Dashboard",
    description: "Enable new beta analytics dashboard with advanced metrics",
    type: "boolean",
    defaultValue: "false",
    currentValue: "true",
    environment: "staging",
    scope: "user",
    targetUsers: ["user-001", "user-002", "user-003"],
    isActive: true,
    lastSynced: "2024-11-29T11:00:00Z",
    syncStatus: "pending",
    version: 1,
    createdAt: "2024-11-20T00:00:00Z",
    updatedAt: "2024-11-29T11:00:00Z",
    createdBy: "Analytics Team",
  },
  {
    id: "rc-008",
    key: "config.maintenance_mode",
    name: "Maintenance Mode",
    description: "Enable system-wide maintenance mode",
    type: "boolean",
    defaultValue: "false",
    currentValue: "false",
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-29T00:00:00Z",
    syncStatus: "synced",
    version: 8,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-11-29T00:00:00Z",
    createdBy: "DevOps",
  },
  {
    id: "rc-009",
    key: "config.api_rate_limit",
    name: "API Rate Limit",
    description: "API requests per minute per tenant",
    type: "json",
    defaultValue: '{"beginner": 100, "pro": 500, "enterprise": 2000}',
    currentValue: '{"beginner": 150, "pro": 750, "enterprise": 3000}',
    environment: "production",
    scope: "global",
    isActive: true,
    lastSynced: "2024-11-28T16:00:00Z",
    syncStatus: "synced",
    version: 4,
    createdAt: "2024-05-01T00:00:00Z",
    updatedAt: "2024-11-28T16:00:00Z",
    createdBy: "Platform Team",
  },
];

// Config change logs
export const configChangeLogs: ConfigChangeLog[] = [
  {
    id: "log-001",
    configId: "rc-001",
    configKey: "feature.new_booking_ui",
    action: "toggled",
    previousValue: "false",
    newValue: "true",
    actor: "Product Manager",
    timestamp: "2024-11-29T10:30:00Z",
    affectedTenants: 45,
    syncDuration: 1250,
  },
  {
    id: "log-002",
    configId: "rc-003",
    configKey: "config.max_concurrent_bookings",
    action: "updated",
    previousValue: "75",
    newValue: "100",
    actor: "DevOps Lead",
    timestamp: "2024-11-29T08:00:00Z",
    affectedTenants: 45,
    syncDuration: 890,
  },
  {
    id: "log-003",
    configId: "rc-005",
    configKey: "feature.mobile_check_in",
    action: "updated",
    previousValue: '["fac-001", "fac-002"]',
    newValue: '["fac-001", "fac-002", "fac-004", "fac-005"]',
    actor: "Account Manager",
    timestamp: "2024-11-29T09:45:00Z",
    affectedTenants: 4,
    syncDuration: 450,
  },
  {
    id: "log-004",
    configId: "fac-001-module",
    configKey: "tenant.modules.fac-001",
    action: "toggled",
    previousValue: "module-analytics: disabled",
    newValue: "module-analytics: enabled (trial)",
    actor: "Sales Team",
    timestamp: "2024-11-01T10:00:00Z",
    affectedTenants: 1,
    syncDuration: 120,
  },
  {
    id: "log-005",
    configId: "rc-007",
    configKey: "feature.beta_analytics",
    action: "created",
    newValue: "true (staging)",
    actor: "Analytics Team",
    timestamp: "2024-11-20T00:00:00Z",
    affectedTenants: 0,
    syncDuration: 200,
  },
];

// Helper functions
export const getConfigStats = () => {
  const totalTenants = tenantModuleConfigs.length;
  const totalFlags = remoteConfigFlags.length;
  const activeFlags = remoteConfigFlags.filter((f) => f.isActive).length;
  const pendingSync = remoteConfigFlags.filter(
    (f) => f.syncStatus === "pending",
  ).length;
  const totalOverrides = tenantModuleConfigs.reduce(
    (sum, t) => sum + t.moduleOverrides.length,
    0,
  );
  const recentChanges = configChangeLogs.filter(
    (log) =>
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000),
  ).length;

  return {
    totalTenants,
    totalFlags,
    activeFlags,
    pendingSync,
    totalOverrides,
    recentChanges,
  };
};
