// System Health & Monitoring Data Models

export interface ServerStatus {
  serverId: string;
  serverName: string;
  region: string;
  status: "Online" | "Offline" | "Degraded" | "Maintenance";
  uptime: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  lastHealthCheck: string;
  responseTime: number;
  activeConnections: number;
  requestsPerMinute: number;
}

export interface DatabaseMetric {
  databaseId: string;
  databaseName: string;
  type: "PostgreSQL" | "MongoDB" | "Redis" | "MySQL";
  status: "Healthy" | "Degraded" | "Critical" | "Maintenance";
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  queryPerformance: {
    avgQueryTime: number;
    slowQueries: number;
    failedQueries: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  replication: {
    status: "Active" | "Delayed" | "Failed";
    lag: number;
  };
  lastBackup: string;
}

export interface APIEndpoint {
  endpointId: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  service: string;
  status: "Available" | "Degraded" | "Down" | "Maintenance";
  uptime: number;
  avgResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  lastIncident: string | null;
  sla: number;
}

export interface ServiceUptime {
  serviceId: string;
  serviceName: string;
  category: "Core" | "Payment" | "Notification" | "Analytics" | "Integration";
  status: "Operational" | "Degraded" | "Partial Outage" | "Major Outage";
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  incidents24h: number;
  lastIncident: string | null;
  dependencies: string[];
}

export interface PerformanceMetric {
  metricId: string;
  metricName: string;
  category: "Response Time" | "Error Rate" | "Resource Usage" | "Throughput";
  currentValue: number;
  averageValue: number;
  threshold: number;
  unit: string;
  trend: "Increasing" | "Decreasing" | "Stable";
  status: "Normal" | "Warning" | "Critical";
  history: {
    timestamp: string;
    value: number;
  }[];
}

export interface ResourceUtilization {
  resourceId: string;
  resourceName: string;
  resourceType: "CPU" | "Memory" | "Disk" | "Network" | "Database";
  current: number;
  average: number;
  peak: number;
  threshold: number;
  unit: string;
  status: "Normal" | "Warning" | "Critical";
  forecast: {
    hours24: number;
    days7: number;
    days30: number;
  };
}

export interface SystemAlert {
  alertId: string;
  alertType:
    | "Critical Error"
    | "Performance Degradation"
    | "Capacity Warning"
    | "Security Incident"
    | "Service Outage";
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  description: string;
  source: string;
  affectedServices: string[];
  status: "New" | "Acknowledged" | "Investigating" | "Resolved" | "Dismissed";
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  impactedUsers: number;
  autoEscalated: boolean;
}

export interface AlertConfiguration {
  configId: string;
  alertName: string;
  alertType: "Threshold" | "Anomaly" | "Pattern" | "Composite";
  metric: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  enabled: boolean;
  channels: ("Email" | "SMS" | "Slack" | "PagerDuty" | "Webhook")[];
  recipients: string[];
  escalationRules: {
    level: number;
    delay: number;
    recipients: string[];
  }[];
  cooldown: number;
  createdBy: string;
  lastTriggered: string | null;
  triggerCount: number;
}

export interface NotificationChannel {
  channelId: string;
  channelName: string;
  channelType:
    | "Email"
    | "SMS"
    | "Slack"
    | "PagerDuty"
    | "Webhook"
    | "Microsoft Teams";
  status: "Active" | "Inactive" | "Failed";
  configuration: Record<string, any>;
  recipients: string[];
  alertsSent24h: number;
  deliveryRate: number;
  lastUsed: string;
}

interface HealthDashboardStats {
  overallHealth: number;
  serversOnline: number;
  totalServers: number;
  criticalAlerts: number;
  activeIncidents: number;
  avgResponseTime: number;
  errorRate: number;
  systemUptime: number;
  dailyMetrics: {
    date: string;
    uptime: number;
    errorRate: number;
    avgResponseTime: number;
  }[];
  serviceStatus: {
    operational: number;
    degraded: number;
    outage: number;
  };
}

// Mock Data

export const serverStatuses: ServerStatus[] = [
  {
    serverId: "srv-001",
    serverName: "web-server-01",
    region: "US-East",
    status: "Online",
    uptime: "45d 12h 30m",
    cpu: 45,
    memory: 68,
    disk: 52,
    network: 34,
    lastHealthCheck: "2024-01-15T14:30:00Z",
    responseTime: 145,
    activeConnections: 234,
    requestsPerMinute: 1250,
  },
  {
    serverId: "srv-002",
    serverName: "web-server-02",
    region: "US-East",
    status: "Online",
    uptime: "45d 12h 28m",
    cpu: 52,
    memory: 71,
    disk: 48,
    network: 41,
    lastHealthCheck: "2024-01-15T14:30:00Z",
    responseTime: 138,
    activeConnections: 267,
    requestsPerMinute: 1420,
  },
  {
    serverId: "srv-003",
    serverName: "api-server-01",
    region: "US-West",
    status: "Degraded",
    uptime: "30d 8h 15m",
    cpu: 78,
    memory: 85,
    disk: 45,
    network: 67,
    lastHealthCheck: "2024-01-15T14:29:45Z",
    responseTime: 312,
    activeConnections: 445,
    requestsPerMinute: 980,
  },
  {
    serverId: "srv-004",
    serverName: "db-server-01",
    region: "EU-Central",
    status: "Online",
    uptime: "90d 5h 42m",
    cpu: 34,
    memory: 58,
    disk: 73,
    network: 28,
    lastHealthCheck: "2024-01-15T14:30:00Z",
    responseTime: 89,
    activeConnections: 156,
    requestsPerMinute: 3200,
  },
  {
    serverId: "srv-005",
    serverName: "cache-server-01",
    region: "Asia-Pacific",
    status: "Maintenance",
    uptime: "15d 3h 20m",
    cpu: 12,
    memory: 35,
    disk: 22,
    network: 15,
    lastHealthCheck: "2024-01-15T14:25:00Z",
    responseTime: 45,
    activeConnections: 89,
    requestsPerMinute: 5600,
  },
];

export const databaseMetrics: DatabaseMetric[] = [
  {
    databaseId: "db-001",
    databaseName: "primary-postgres",
    type: "PostgreSQL",
    status: "Healthy",
    connectionPool: {
      active: 45,
      idle: 15,
      total: 100,
    },
    queryPerformance: {
      avgQueryTime: 23,
      slowQueries: 12,
      failedQueries: 2,
    },
    storage: {
      used: 456,
      total: 1000,
      percentage: 45.6,
    },
    replication: {
      status: "Active",
      lag: 120,
    },
    lastBackup: "2024-01-15T06:00:00Z",
  },
  {
    databaseId: "db-002",
    databaseName: "analytics-mongo",
    type: "MongoDB",
    status: "Healthy",
    connectionPool: {
      active: 32,
      idle: 28,
      total: 80,
    },
    queryPerformance: {
      avgQueryTime: 45,
      slowQueries: 8,
      failedQueries: 1,
    },
    storage: {
      used: 723,
      total: 2000,
      percentage: 36.15,
    },
    replication: {
      status: "Active",
      lag: 89,
    },
    lastBackup: "2024-01-15T06:15:00Z",
  },
  {
    databaseId: "db-003",
    databaseName: "cache-redis",
    type: "Redis",
    status: "Healthy",
    connectionPool: {
      active: 67,
      idle: 13,
      total: 120,
    },
    queryPerformance: {
      avgQueryTime: 2,
      slowQueries: 0,
      failedQueries: 0,
    },
    storage: {
      used: 12,
      total: 64,
      percentage: 18.75,
    },
    replication: {
      status: "Active",
      lag: 15,
    },
    lastBackup: "2024-01-15T12:00:00Z",
  },
  {
    databaseId: "db-004",
    databaseName: "legacy-mysql",
    type: "MySQL",
    status: "Degraded",
    connectionPool: {
      active: 78,
      idle: 2,
      total: 80,
    },
    queryPerformance: {
      avgQueryTime: 156,
      slowQueries: 45,
      failedQueries: 8,
    },
    storage: {
      used: 890,
      total: 1000,
      percentage: 89,
    },
    replication: {
      status: "Delayed",
      lag: 1250,
    },
    lastBackup: "2024-01-15T06:00:00Z",
  },
];

export const apiEndpoints: APIEndpoint[] = [
  {
    endpointId: "api-001",
    endpoint: "/api/v1/auth/login",
    method: "POST",
    service: "Authentication",
    status: "Available",
    uptime: 99.98,
    avgResponseTime: 145,
    requestsPerMinute: 450,
    errorRate: 0.12,
    lastIncident: null,
    sla: 99.9,
  },
  {
    endpointId: "api-002",
    endpoint: "/api/v1/bookings",
    method: "GET",
    service: "Booking",
    status: "Available",
    uptime: 99.95,
    avgResponseTime: 234,
    requestsPerMinute: 890,
    errorRate: 0.23,
    lastIncident: "2024-01-12T08:30:00Z",
    sla: 99.9,
  },
  {
    endpointId: "api-003",
    endpoint: "/api/v1/payments/process",
    method: "POST",
    service: "Payment",
    status: "Available",
    uptime: 99.99,
    avgResponseTime: 567,
    requestsPerMinute: 234,
    errorRate: 0.05,
    lastIncident: null,
    sla: 99.95,
  },
  {
    endpointId: "api-004",
    endpoint: "/api/v1/facilities/search",
    method: "GET",
    service: "Search",
    status: "Degraded",
    uptime: 98.45,
    avgResponseTime: 1234,
    requestsPerMinute: 1200,
    errorRate: 1.78,
    lastIncident: "2024-01-15T12:15:00Z",
    sla: 99.5,
  },
  {
    endpointId: "api-005",
    endpoint: "/api/v1/notifications/send",
    method: "POST",
    service: "Notification",
    status: "Available",
    uptime: 99.92,
    avgResponseTime: 89,
    requestsPerMinute: 3400,
    errorRate: 0.34,
    lastIncident: "2024-01-14T18:45:00Z",
    sla: 99.8,
  },
];

export const serviceUptimes: ServiceUptime[] = [
  {
    serviceId: "svc-001",
    serviceName: "Authentication Service",
    category: "Core",
    status: "Operational",
    uptime24h: 100,
    uptime7d: 99.98,
    uptime30d: 99.95,
    incidents24h: 0,
    lastIncident: null,
    dependencies: ["primary-postgres", "cache-redis"],
  },
  {
    serviceId: "svc-002",
    serviceName: "Booking Management",
    category: "Core",
    status: "Operational",
    uptime24h: 100,
    uptime7d: 99.95,
    uptime30d: 99.87,
    incidents24h: 0,
    lastIncident: "2024-01-12T08:30:00Z",
    dependencies: ["primary-postgres", "analytics-mongo"],
  },
  {
    serviceId: "svc-003",
    serviceName: "Payment Processing",
    category: "Payment",
    status: "Operational",
    uptime24h: 100,
    uptime7d: 99.99,
    uptime30d: 99.96,
    incidents24h: 0,
    lastIncident: null,
    dependencies: ["primary-postgres", "payment-gateway"],
  },
  {
    serviceId: "svc-004",
    serviceName: "Search & Discovery",
    category: "Core",
    status: "Degraded",
    uptime24h: 98.5,
    uptime7d: 98.45,
    uptime30d: 98.12,
    incidents24h: 2,
    lastIncident: "2024-01-15T12:15:00Z",
    dependencies: ["analytics-mongo", "cache-redis"],
  },
  {
    serviceId: "svc-005",
    serviceName: "Email Notifications",
    category: "Notification",
    status: "Operational",
    uptime24h: 99.8,
    uptime7d: 99.92,
    uptime30d: 99.89,
    incidents24h: 0,
    lastIncident: "2024-01-14T18:45:00Z",
    dependencies: ["email-service"],
  },
  {
    serviceId: "svc-006",
    serviceName: "Analytics Engine",
    category: "Analytics",
    status: "Operational",
    uptime24h: 100,
    uptime7d: 99.87,
    uptime30d: 99.78,
    incidents24h: 0,
    lastIncident: "2024-01-10T15:20:00Z",
    dependencies: ["analytics-mongo", "data-warehouse"],
  },
];

export const performanceMetrics: PerformanceMetric[] = [
  {
    metricId: "pm-001",
    metricName: "API Response Time",
    category: "Response Time",
    currentValue: 234,
    averageValue: 198,
    threshold: 500,
    unit: "ms",
    trend: "Increasing",
    status: "Normal",
    history: [
      { timestamp: "2024-01-15T08:00:00Z", value: 189 },
      { timestamp: "2024-01-15T09:00:00Z", value: 201 },
      { timestamp: "2024-01-15T10:00:00Z", value: 195 },
      { timestamp: "2024-01-15T11:00:00Z", value: 210 },
      { timestamp: "2024-01-15T12:00:00Z", value: 223 },
      { timestamp: "2024-01-15T13:00:00Z", value: 234 },
    ],
  },
  {
    metricId: "pm-002",
    metricName: "Error Rate",
    category: "Error Rate",
    currentValue: 0.45,
    averageValue: 0.32,
    threshold: 1.0,
    unit: "%",
    trend: "Increasing",
    status: "Warning",
    history: [
      { timestamp: "2024-01-15T08:00:00Z", value: 0.28 },
      { timestamp: "2024-01-15T09:00:00Z", value: 0.31 },
      { timestamp: "2024-01-15T10:00:00Z", value: 0.29 },
      { timestamp: "2024-01-15T11:00:00Z", value: 0.35 },
      { timestamp: "2024-01-15T12:00:00Z", value: 0.42 },
      { timestamp: "2024-01-15T13:00:00Z", value: 0.45 },
    ],
  },
  {
    metricId: "pm-003",
    metricName: "CPU Utilization",
    category: "Resource Usage",
    currentValue: 67,
    averageValue: 58,
    threshold: 80,
    unit: "%",
    trend: "Increasing",
    status: "Warning",
    history: [
      { timestamp: "2024-01-15T08:00:00Z", value: 52 },
      { timestamp: "2024-01-15T09:00:00Z", value: 55 },
      { timestamp: "2024-01-15T10:00:00Z", value: 58 },
      { timestamp: "2024-01-15T11:00:00Z", value: 61 },
      { timestamp: "2024-01-15T12:00:00Z", value: 64 },
      { timestamp: "2024-01-15T13:00:00Z", value: 67 },
    ],
  },
  {
    metricId: "pm-004",
    metricName: "Requests Per Minute",
    category: "Throughput",
    currentValue: 8450,
    averageValue: 7800,
    threshold: 10000,
    unit: "req/min",
    trend: "Stable",
    status: "Normal",
    history: [
      { timestamp: "2024-01-15T08:00:00Z", value: 7600 },
      { timestamp: "2024-01-15T09:00:00Z", value: 7850 },
      { timestamp: "2024-01-15T10:00:00Z", value: 7920 },
      { timestamp: "2024-01-15T11:00:00Z", value: 8100 },
      { timestamp: "2024-01-15T12:00:00Z", value: 8300 },
      { timestamp: "2024-01-15T13:00:00Z", value: 8450 },
    ],
  },
];

export const resourceUtilizations: ResourceUtilization[] = [
  {
    resourceId: "res-001",
    resourceName: "Application CPU",
    resourceType: "CPU",
    current: 67,
    average: 58,
    peak: 82,
    threshold: 80,
    unit: "%",
    status: "Warning",
    forecast: {
      hours24: 71,
      days7: 73,
      days30: 75,
    },
  },
  {
    resourceId: "res-002",
    resourceName: "Application Memory",
    resourceType: "Memory",
    current: 72,
    average: 68,
    peak: 88,
    threshold: 85,
    unit: "%",
    status: "Warning",
    forecast: {
      hours24: 74,
      days7: 76,
      days30: 79,
    },
  },
  {
    resourceId: "res-003",
    resourceName: "Database Storage",
    resourceType: "Disk",
    current: 73,
    average: 70,
    peak: 78,
    threshold: 80,
    unit: "%",
    status: "Warning",
    forecast: {
      hours24: 73.5,
      days7: 75,
      days30: 82,
    },
  },
  {
    resourceId: "res-004",
    resourceName: "Network Bandwidth",
    resourceType: "Network",
    current: 45,
    average: 42,
    peak: 67,
    threshold: 80,
    unit: "%",
    status: "Normal",
    forecast: {
      hours24: 46,
      days7: 48,
      days30: 52,
    },
  },
  {
    resourceId: "res-005",
    resourceName: "Database Connections",
    resourceType: "Database",
    current: 78,
    average: 65,
    peak: 92,
    threshold: 90,
    unit: "%",
    status: "Warning",
    forecast: {
      hours24: 80,
      days7: 82,
      days30: 85,
    },
  },
];

export const systemAlerts: SystemAlert[] = [
  {
    alertId: "alert-001",
    alertType: "Performance Degradation",
    severity: "High",
    title: "Search Service Response Time Elevated",
    description:
      "Search API response time has exceeded 1000ms for the past 15 minutes",
    source: "api-server-03",
    affectedServices: ["Search & Discovery"],
    status: "Investigating",
    triggeredAt: "2024-01-15T12:15:00Z",
    acknowledgedAt: "2024-01-15T12:17:00Z",
    acknowledgedBy: "John Smith",
    resolvedAt: null,
    resolution: null,
    impactedUsers: 1250,
    autoEscalated: false,
  },
  {
    alertId: "alert-002",
    alertType: "Capacity Warning",
    severity: "Medium",
    title: "Database Storage Approaching Threshold",
    description: "Legacy MySQL database storage is at 89% capacity",
    source: "db-server-01",
    affectedServices: ["Database"],
    status: "Acknowledged",
    triggeredAt: "2024-01-15T11:30:00Z",
    acknowledgedAt: "2024-01-15T11:35:00Z",
    acknowledgedBy: "Sarah Johnson",
    resolvedAt: null,
    resolution: null,
    impactedUsers: 0,
    autoEscalated: false,
  },
  {
    alertId: "alert-003",
    alertType: "Critical Error",
    severity: "Critical",
    title: "Payment Gateway Connection Failed",
    description:
      "Unable to establish connection with payment gateway - transaction processing affected",
    source: "payment-service",
    affectedServices: ["Payment Processing"],
    status: "New",
    triggeredAt: "2024-01-15T14:22:00Z",
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolution: null,
    impactedUsers: 340,
    autoEscalated: true,
  },
  {
    alertId: "alert-004",
    alertType: "Capacity Warning",
    severity: "Medium",
    title: "CPU Utilization High",
    description: "API server CPU usage sustained above 75% for 30 minutes",
    source: "api-server-03",
    affectedServices: ["API Gateway"],
    status: "Investigating",
    triggeredAt: "2024-01-15T13:45:00Z",
    acknowledgedAt: "2024-01-15T13:50:00Z",
    acknowledgedBy: "Mike Chen",
    resolvedAt: null,
    resolution: null,
    impactedUsers: 0,
    autoEscalated: false,
  },
  {
    alertId: "alert-005",
    alertType: "Security Incident",
    severity: "High",
    title: "Unusual Login Pattern Detected",
    description: "Multiple failed login attempts from suspicious IP addresses",
    source: "auth-service",
    affectedServices: ["Authentication Service"],
    status: "Resolved",
    triggeredAt: "2024-01-15T10:15:00Z",
    acknowledgedAt: "2024-01-15T10:18:00Z",
    acknowledgedBy: "Security Team",
    resolvedAt: "2024-01-15T11:30:00Z",
    resolution: "IP addresses blocked and accounts secured",
    impactedUsers: 5,
    autoEscalated: false,
  },
];

export const alertConfigurations: AlertConfiguration[] = [
  {
    configId: "config-001",
    alertName: "High Response Time Alert",
    alertType: "Threshold",
    metric: "API Response Time",
    condition: "greater_than",
    threshold: 500,
    duration: 5,
    severity: "High",
    enabled: true,
    channels: ["Email", "Slack", "PagerDuty"],
    recipients: ["ops-team@company.com", "on-call@company.com"],
    escalationRules: [
      { level: 1, delay: 0, recipients: ["ops-team@company.com"] },
      { level: 2, delay: 15, recipients: ["senior-ops@company.com"] },
      { level: 3, delay: 30, recipients: ["engineering-leads@company.com"] },
    ],
    cooldown: 30,
    createdBy: "John Smith",
    lastTriggered: "2024-01-15T12:15:00Z",
    triggerCount: 23,
  },
  {
    configId: "config-002",
    alertName: "Critical Error Rate",
    alertType: "Threshold",
    metric: "Error Rate",
    condition: "greater_than",
    threshold: 1,
    duration: 5,
    severity: "Critical",
    enabled: true,
    channels: ["Email", "SMS", "PagerDuty"],
    recipients: ["ops-team@company.com", "incident-team@company.com"],
    escalationRules: [
      { level: 1, delay: 0, recipients: ["incident-team@company.com"] },
      { level: 2, delay: 5, recipients: ["engineering-leads@company.com"] },
      { level: 3, delay: 10, recipients: ["cto@company.com"] },
    ],
    cooldown: 15,
    createdBy: "Sarah Johnson",
    lastTriggered: null,
    triggerCount: 8,
  },
  {
    configId: "config-003",
    alertName: "Database Storage Warning",
    alertType: "Threshold",
    metric: "Database Storage",
    condition: "greater_than",
    threshold: 80,
    duration: 10,
    severity: "Medium",
    enabled: true,
    channels: ["Email", "Slack"],
    recipients: ["dba-team@company.com"],
    escalationRules: [
      { level: 1, delay: 0, recipients: ["dba-team@company.com"] },
      { level: 2, delay: 60, recipients: ["infrastructure@company.com"] },
    ],
    cooldown: 60,
    createdBy: "Mike Chen",
    lastTriggered: "2024-01-15T11:30:00Z",
    triggerCount: 15,
  },
  {
    configId: "config-004",
    alertName: "Service Down Alert",
    alertType: "Pattern",
    metric: "Service Availability",
    condition: "equals",
    threshold: 0,
    duration: 1,
    severity: "Critical",
    enabled: true,
    channels: ["Email", "SMS", "PagerDuty", "Slack"],
    recipients: ["ops-team@company.com", "on-call@company.com"],
    escalationRules: [
      { level: 1, delay: 0, recipients: ["on-call@company.com"] },
      { level: 2, delay: 5, recipients: ["engineering-leads@company.com"] },
      { level: 3, delay: 10, recipients: ["cto@company.com"] },
    ],
    cooldown: 10,
    createdBy: "John Smith",
    lastTriggered: null,
    triggerCount: 3,
  },
  {
    configId: "config-005",
    alertName: "Anomaly Detection",
    alertType: "Anomaly",
    metric: "Request Pattern",
    condition: "anomaly",
    threshold: 3,
    duration: 10,
    severity: "Medium",
    enabled: true,
    channels: ["Email", "Slack"],
    recipients: ["security-team@company.com"],
    escalationRules: [
      { level: 1, delay: 0, recipients: ["security-team@company.com"] },
    ],
    cooldown: 30,
    createdBy: "Security Team",
    lastTriggered: "2024-01-15T10:15:00Z",
    triggerCount: 42,
  },
];

export const notificationChannels: NotificationChannel[] = [
  {
    channelId: "channel-001",
    channelName: "Operations Email",
    channelType: "Email",
    status: "Active",
    configuration: {
      smtpServer: "smtp.company.com",
      from: "alerts@company.com",
    },
    recipients: ["ops-team@company.com", "on-call@company.com"],
    alertsSent24h: 47,
    deliveryRate: 99.8,
    lastUsed: "2024-01-15T14:22:00Z",
  },
  {
    channelId: "channel-002",
    channelName: "Engineering Slack",
    channelType: "Slack",
    status: "Active",
    configuration: {
      webhookUrl: "https://hooks.slack.com/services/...",
      channel: "#engineering-alerts",
    },
    recipients: ["#engineering-alerts"],
    alertsSent24h: 89,
    deliveryRate: 99.9,
    lastUsed: "2024-01-15T14:22:00Z",
  },
  {
    channelId: "channel-003",
    channelName: "PagerDuty Integration",
    channelType: "PagerDuty",
    status: "Active",
    configuration: {
      serviceKey: "pd-service-key-***",
      routingKey: "pd-routing-key-***",
    },
    recipients: ["On-Call Team"],
    alertsSent24h: 12,
    deliveryRate: 100,
    lastUsed: "2024-01-15T14:22:00Z",
  },
  {
    channelId: "channel-004",
    channelName: "SMS Alerts",
    channelType: "SMS",
    status: "Active",
    configuration: {
      provider: "Twilio",
      from: "+1234567890",
    },
    recipients: ["+1987654321", "+1456789012"],
    alertsSent24h: 5,
    deliveryRate: 98.5,
    lastUsed: "2024-01-15T14:22:00Z",
  },
  {
    channelId: "channel-005",
    channelName: "Webhook Endpoint",
    channelType: "Webhook",
    status: "Active",
    configuration: {
      url: "https://monitoring.company.com/webhook",
      method: "POST",
      headers: { Authorization: "Bearer token-***" },
    },
    recipients: ["External Monitoring System"],
    alertsSent24h: 156,
    deliveryRate: 99.5,
    lastUsed: "2024-01-15T14:30:00Z",
  },
];

export const healthDashboardStats: HealthDashboardStats = {
  overallHealth: 87,
  serversOnline: 23,
  totalServers: 25,
  criticalAlerts: 1,
  activeIncidents: 3,
  avgResponseTime: 234,
  errorRate: 0.45,
  systemUptime: 99.87,
  dailyMetrics: [
    {
      date: "2024-01-09",
      uptime: 99.95,
      errorRate: 0.28,
      avgResponseTime: 198,
    },
    {
      date: "2024-01-10",
      uptime: 99.92,
      errorRate: 0.31,
      avgResponseTime: 205,
    },
    {
      date: "2024-01-11",
      uptime: 99.98,
      errorRate: 0.25,
      avgResponseTime: 192,
    },
    {
      date: "2024-01-12",
      uptime: 99.45,
      errorRate: 0.78,
      avgResponseTime: 267,
    },
    {
      date: "2024-01-13",
      uptime: 99.87,
      errorRate: 0.35,
      avgResponseTime: 212,
    },
    {
      date: "2024-01-14",
      uptime: 99.91,
      errorRate: 0.32,
      avgResponseTime: 218,
    },
    {
      date: "2024-01-15",
      uptime: 99.87,
      errorRate: 0.45,
      avgResponseTime: 234,
    },
  ],
  serviceStatus: {
    operational: 15,
    degraded: 2,
    outage: 0,
  },
};
