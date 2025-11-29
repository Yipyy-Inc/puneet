// Security & Compliance Data Models

// Access Control Types
export interface MFASettings {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  mfaEnabled: boolean;
  mfaMethod: "Authenticator App" | "SMS" | "Email" | "Hardware Token";
  enrolledAt: string;
  lastUsed: string;
  backupCodes: number;
  status: "Active" | "Inactive" | "Pending Setup";
}

export interface IPWhitelist {
  id: string;
  ipAddress: string;
  description: string;
  userId?: string;
  userName?: string;
  facilityId?: string;
  facilityName?: string;
  addedBy: string;
  addedAt: string;
  lastUsed: string;
  accessCount: number;
  status: "Active" | "Inactive" | "Blocked";
  expiresAt?: string;
}

export interface SessionManagement {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  sessionToken: string;
  ipAddress: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  location: string;
  startedAt: string;
  lastActivity: string;
  expiresAt: string;
  status: "Active" | "Expired" | "Terminated";
  duration: string;
}

export interface PasswordPolicy {
  id: string;
  policyName: string;
  description: string;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
  preventReuse: number;
  maxAttempts: number;
  lockoutDuration: number;
  applicableTo: string[];
  createdBy: string;
  createdAt: string;
  lastModified: string;
  status: "Active" | "Inactive" | "Draft";
}

// Security Monitoring Types
export interface FailedLoginAttempt {
  id: string;
  userId?: string;
  userName?: string;
  email: string;
  ipAddress: string;
  location: string;
  attemptTime: string;
  failureReason:
    | "Invalid Password"
    | "Invalid Username"
    | "Account Locked"
    | "MFA Failed"
    | "IP Blocked";
  deviceType: string;
  browser: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  isBlocked: boolean;
  attemptCount: number;
}

export interface SecurityAlert {
  id: string;
  alertType:
    | "Suspicious Login"
    | "Multiple Failed Logins"
    | "Unusual Activity"
    | "Data Access Violation"
    | "Permission Escalation"
    | "Malware Detection";
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  ipAddress: string;
  location: string;
  detectedAt: string;
  status: "New" | "Investigating" | "Resolved" | "Dismissed";
  assignedTo?: string;
  resolvedAt?: string;
  actionsTaken?: string;
  affectedResources: string[];
}

export interface SecurityBreach {
  id: string;
  breachType:
    | "Data Leak"
    | "Unauthorized Access"
    | "SQL Injection"
    | "XSS Attack"
    | "DDoS Attack"
    | "Malware";
  severity: "Low" | "Medium" | "High" | "Critical";
  title: string;
  description: string;
  detectedAt: string;
  detectedBy: "Automated System" | "Security Team" | "User Report";
  affectedSystems: string[];
  affectedUsers: number;
  dataCompromised: string[];
  status: "Detected" | "Contained" | "Investigating" | "Resolved";
  incidentCommander?: string;
  resolutionTime?: string;
  mitigationSteps: string[];
  postMortemCompleted: boolean;
}

export interface SecurityDashboardStats {
  totalFailedLogins: number;
  failedLoginsToday: number;
  activeAlerts: number;
  criticalAlerts: number;
  activeSessions: number;
  blockedIPs: number;
  securityScore: number;
  breachesThisMonth: number;
  mfaAdoptionRate: number;
  weeklyFailedLogins: { date: string; count: number }[];
  alertsByType: { type: string; count: number; percentage: number }[];
  topThreats: { threat: string; count: number; severity: string }[];
}

// Data Privacy Types
export interface GDPRCompliance {
  id: string;
  complianceArea:
    | "Data Collection"
    | "Data Storage"
    | "Data Processing"
    | "User Rights"
    | "Data Breach"
    | "Consent Management";
  requirement: string;
  description: string;
  status: "Compliant" | "Partially Compliant" | "Non-Compliant" | "In Progress";
  lastAudited: string;
  nextAuditDue: string;
  responsiblePerson: string;
  documentationUrl?: string;
  findings?: string;
  remediationPlan?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
}

export interface DataProtectionSetting {
  id: string;
  category:
    | "Encryption"
    | "Access Control"
    | "Data Retention"
    | "Backup"
    | "Anonymization"
    | "Right to Erasure";
  settingName: string;
  description: string;
  currentValue: string | boolean;
  recommendedValue: string | boolean;
  isCompliant: boolean;
  dataTypes: string[];
  lastUpdated: string;
  updatedBy: string;
  impact: "Low" | "Medium" | "High";
  requiresApproval: boolean;
}

export interface PrivacyPolicy {
  id: string;
  policyName: string;
  version: string;
  effectiveDate: string;
  expiryDate?: string;
  status: "Draft" | "Active" | "Archived" | "Under Review";
  language: string;
  jurisdiction: string[];
  lastUpdated: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  acceptanceRequired: boolean;
  acceptanceCount: number;
  documentUrl: string;
  changes?: string;
}

export interface UserConsent {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  consentType:
    | "Marketing"
    | "Data Processing"
    | "Cookies"
    | "Third Party Sharing"
    | "Analytics"
    | "Terms of Service";
  consentGiven: boolean;
  consentedAt?: string;
  revokedAt?: string;
  ipAddress: string;
  consentVersion: string;
  expiresAt?: string;
  status: "Active" | "Revoked" | "Expired";
  communicationChannel: "Email" | "SMS" | "Push Notification" | "In-App";
}

// Regulatory Compliance Types
export interface ComplianceFramework {
  id: string;
  frameworkName:
    | "GDPR"
    | "HIPAA"
    | "SOC 2"
    | "ISO 27001"
    | "PCI DSS"
    | "CCPA"
    | "SOX"
    | "Other";
  industry: string;
  description: string;
  applicableTo: string[];
  requirements: number;
  completedRequirements: number;
  complianceScore: number;
  status: "Compliant" | "Partially Compliant" | "Non-Compliant" | "In Progress";
  certificationDate?: string;
  expiryDate?: string;
  nextAuditDate: string;
  auditor?: string;
  documentationUrl?: string;
}

export interface ComplianceReport {
  id: string;
  reportName: string;
  reportType:
    | "Audit Report"
    | "Compliance Assessment"
    | "Risk Assessment"
    | "Incident Report"
    | "Quarterly Review"
    | "Annual Review";
  framework: string[];
  generatedAt: string;
  generatedBy: string;
  period: string;
  status: "Draft" | "Final" | "Submitted" | "Under Review";
  findings: number;
  criticalFindings: number;
  complianceScore: number;
  recommendations: string[];
  documentUrl?: string;
  submittedTo?: string;
  submittedAt?: string;
}

export interface Certificate {
  id: string;
  certificateName: string;
  certificateType:
    | "SSL/TLS"
    | "Code Signing"
    | "Email"
    | "Client Authentication"
    | "Compliance"
    | "API";
  issuer: string;
  issuedTo: string;
  issuedAt: string;
  expiresAt: string;
  status: "Valid" | "Expiring Soon" | "Expired" | "Revoked";
  serialNumber: string;
  fingerprint: string;
  keySize: number;
  algorithm: string;
  usedBy: string[];
  autoRenew: boolean;
  lastRenewed?: string;
  daysUntilExpiry: number;
}

export interface AuditTrail {
  id: string;
  eventType:
    | "Access"
    | "Modification"
    | "Deletion"
    | "Export"
    | "Configuration Change"
    | "User Action";
  description: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ipAddress: string;
  resource: string;
  action: string;
  result: "Success" | "Failed" | "Denied";
  complianceRelevant: boolean;
  retentionPeriod: number;
  dataClassification: "Public" | "Internal" | "Confidential" | "Restricted";
}

// Mock Data
export const mfaSettings: MFASettings[] = [
  {
    id: "mfa-1",
    userId: "user-101",
    userName: "John Admin",
    userRole: "Super Admin",
    mfaEnabled: true,
    mfaMethod: "Authenticator App",
    enrolledAt: "2024-01-15T10:30:00Z",
    lastUsed: "2024-11-28T09:15:00Z",
    backupCodes: 8,
    status: "Active",
  },
  {
    id: "mfa-2",
    userId: "user-102",
    userName: "Sarah Manager",
    userRole: "Facility Admin",
    mfaEnabled: true,
    mfaMethod: "SMS",
    enrolledAt: "2024-03-20T14:20:00Z",
    lastUsed: "2024-11-28T08:45:00Z",
    backupCodes: 10,
    status: "Active",
  },
  {
    id: "mfa-3",
    userId: "user-103",
    userName: "Mike Support",
    userRole: "Support Staff",
    mfaEnabled: false,
    mfaMethod: "Email",
    enrolledAt: "2024-06-10T11:00:00Z",
    lastUsed: "2024-11-20T16:30:00Z",
    backupCodes: 0,
    status: "Pending Setup",
  },
  {
    id: "mfa-4",
    userId: "user-104",
    userName: "Emily Tech",
    userRole: "Technical Support",
    mfaEnabled: true,
    mfaMethod: "Hardware Token",
    enrolledAt: "2024-02-05T09:15:00Z",
    lastUsed: "2024-11-28T07:30:00Z",
    backupCodes: 6,
    status: "Active",
  },
];

export const ipWhitelist: IPWhitelist[] = [
  {
    id: "ip-1",
    ipAddress: "192.168.1.100",
    description: "Office Headquarters",
    facilityName: "All Facilities",
    addedBy: "System Admin",
    addedAt: "2024-01-10T08:00:00Z",
    lastUsed: "2024-11-28T09:30:00Z",
    accessCount: 15432,
    status: "Active",
  },
  {
    id: "ip-2",
    ipAddress: "10.0.0.50",
    description: "Remote Office - NY",
    userName: "John Admin",
    addedBy: "Network Team",
    addedAt: "2024-03-15T10:00:00Z",
    lastUsed: "2024-11-28T08:15:00Z",
    accessCount: 8765,
    status: "Active",
  },
  {
    id: "ip-3",
    ipAddress: "203.0.113.45",
    description: "VPN Gateway",
    addedBy: "Security Team",
    addedAt: "2024-05-20T14:30:00Z",
    lastUsed: "2024-11-27T22:45:00Z",
    accessCount: 3421,
    status: "Active",
  },
  {
    id: "ip-4",
    ipAddress: "198.51.100.78",
    description: "Suspicious Activity Detected",
    addedBy: "Automated System",
    addedAt: "2024-11-15T03:20:00Z",
    lastUsed: "2024-11-15T03:25:00Z",
    accessCount: 45,
    status: "Blocked",
    expiresAt: "2024-12-15T00:00:00Z",
  },
];

export const activeSessions: SessionManagement[] = [
  {
    id: "session-1",
    userId: "user-101",
    userName: "John Admin",
    userRole: "Super Admin",
    sessionToken: "sess_abc123xyz789",
    ipAddress: "192.168.1.100",
    deviceType: "Desktop",
    browser: "Chrome 120",
    location: "New York, USA",
    startedAt: "2024-11-28T08:00:00Z",
    lastActivity: "2024-11-28T09:45:00Z",
    expiresAt: "2024-11-28T20:00:00Z",
    status: "Active",
    duration: "1h 45m",
  },
  {
    id: "session-2",
    userId: "user-102",
    userName: "Sarah Manager",
    userRole: "Facility Admin",
    sessionToken: "sess_def456uvw123",
    ipAddress: "10.0.0.50",
    deviceType: "Mobile",
    browser: "Safari 17",
    location: "Los Angeles, USA",
    startedAt: "2024-11-28T07:30:00Z",
    lastActivity: "2024-11-28T09:30:00Z",
    expiresAt: "2024-11-28T19:30:00Z",
    status: "Active",
    duration: "2h 0m",
  },
  {
    id: "session-3",
    userId: "user-103",
    userName: "Mike Support",
    userRole: "Support Staff",
    sessionToken: "sess_ghi789rst456",
    ipAddress: "203.0.113.45",
    deviceType: "Tablet",
    browser: "Firefox 121",
    location: "Chicago, USA",
    startedAt: "2024-11-27T23:00:00Z",
    lastActivity: "2024-11-28T00:30:00Z",
    expiresAt: "2024-11-28T11:00:00Z",
    status: "Expired",
    duration: "1h 30m",
  },
];

export const passwordPolicies: PasswordPolicy[] = [
  {
    id: "policy-1",
    policyName: "Admin Password Policy",
    description: "High security password requirements for admin users",
    minLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expirationDays: 60,
    preventReuse: 10,
    maxAttempts: 3,
    lockoutDuration: 30,
    applicableTo: ["Super Admin", "Facility Admin"],
    createdBy: "Security Team",
    createdAt: "2024-01-01T00:00:00Z",
    lastModified: "2024-06-15T10:00:00Z",
    status: "Active",
  },
  {
    id: "policy-2",
    policyName: "Standard User Policy",
    description: "Standard security requirements for regular users",
    minLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expirationDays: 90,
    preventReuse: 5,
    maxAttempts: 5,
    lockoutDuration: 15,
    applicableTo: ["Manager", "Staff", "Support"],
    createdBy: "Security Team",
    createdAt: "2024-01-01T00:00:00Z",
    lastModified: "2024-06-15T10:00:00Z",
    status: "Active",
  },
  {
    id: "policy-3",
    policyName: "Customer Password Policy",
    description: "Basic security requirements for customer accounts",
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expirationDays: 365,
    preventReuse: 3,
    maxAttempts: 10,
    lockoutDuration: 5,
    applicableTo: ["Customer"],
    createdBy: "Security Team",
    createdAt: "2024-01-01T00:00:00Z",
    lastModified: "2024-03-20T14:30:00Z",
    status: "Active",
  },
];

export const failedLoginAttempts: FailedLoginAttempt[] = [
  {
    id: "fail-1",
    email: "admin@example.com",
    userName: "John Admin",
    ipAddress: "45.76.123.45",
    location: "Unknown Location",
    attemptTime: "2024-11-28T09:30:00Z",
    failureReason: "Invalid Password",
    deviceType: "Desktop",
    browser: "Chrome 120",
    severity: "Medium",
    isBlocked: false,
    attemptCount: 2,
  },
  {
    id: "fail-2",
    email: "unknown@suspicious.com",
    ipAddress: "198.51.100.78",
    location: "Russia",
    attemptTime: "2024-11-28T09:15:00Z",
    failureReason: "Invalid Username",
    deviceType: "Desktop",
    browser: "Unknown",
    severity: "High",
    isBlocked: true,
    attemptCount: 15,
  },
  {
    id: "fail-3",
    email: "sarah@facility.com",
    userName: "Sarah Manager",
    ipAddress: "192.168.1.105",
    location: "New York, USA",
    attemptTime: "2024-11-28T08:45:00Z",
    failureReason: "MFA Failed",
    deviceType: "Mobile",
    browser: "Safari 17",
    severity: "Low",
    isBlocked: false,
    attemptCount: 1,
  },
  {
    id: "fail-4",
    email: "locked@test.com",
    ipAddress: "203.0.113.89",
    location: "China",
    attemptTime: "2024-11-28T07:30:00Z",
    failureReason: "Account Locked",
    deviceType: "Desktop",
    browser: "Firefox 121",
    severity: "Critical",
    isBlocked: true,
    attemptCount: 25,
  },
];

export const securityAlerts: SecurityAlert[] = [
  {
    id: "alert-1",
    alertType: "Multiple Failed Logins",
    severity: "High",
    title: "Brute Force Attack Detected",
    description: "Multiple failed login attempts from IP 198.51.100.78",
    ipAddress: "198.51.100.78",
    location: "Russia",
    detectedAt: "2024-11-28T09:15:00Z",
    status: "Investigating",
    assignedTo: "Security Team",
    affectedResources: ["Login System", "User Database"],
  },
  {
    id: "alert-2",
    alertType: "Suspicious Login",
    severity: "Medium",
    title: "Login from Unusual Location",
    description: "User logged in from a different country than usual",
    userId: "user-102",
    userName: "Sarah Manager",
    ipAddress: "45.76.123.45",
    location: "Germany",
    detectedAt: "2024-11-28T08:30:00Z",
    status: "New",
    affectedResources: ["User Account"],
  },
  {
    id: "alert-3",
    alertType: "Data Access Violation",
    severity: "Critical",
    title: "Unauthorized Data Access Attempt",
    description:
      "Attempt to access restricted customer data without proper permissions",
    userId: "user-105",
    userName: "Jane Staff",
    ipAddress: "192.168.1.150",
    location: "New York, USA",
    detectedAt: "2024-11-28T07:00:00Z",
    status: "Resolved",
    assignedTo: "Security Team",
    resolvedAt: "2024-11-28T08:00:00Z",
    actionsTaken: "Access revoked, user notified, incident logged",
    affectedResources: ["Customer Database", "PII Records"],
  },
];

export const securityBreaches: SecurityBreach[] = [
  {
    id: "breach-1",
    breachType: "Unauthorized Access",
    severity: "High",
    title: "Unauthorized API Access Detected",
    description: "Multiple API calls made with expired authentication tokens",
    detectedAt: "2024-11-20T15:30:00Z",
    detectedBy: "Automated System",
    affectedSystems: ["API Gateway", "Authentication Service"],
    affectedUsers: 0,
    dataCompromised: ["API Logs"],
    status: "Resolved",
    incidentCommander: "Security Lead",
    resolutionTime: "4h 30m",
    mitigationSteps: [
      "Revoked all expired tokens",
      "Enhanced token validation",
      "Implemented rate limiting",
      "Notified security team",
    ],
    postMortemCompleted: true,
  },
  {
    id: "breach-2",
    breachType: "DDoS Attack",
    severity: "Medium",
    title: "Distributed Denial of Service Attack",
    description:
      "High volume of requests from multiple IPs targeting login endpoint",
    detectedAt: "2024-11-15T03:20:00Z",
    detectedBy: "Automated System",
    affectedSystems: ["Web Server", "Load Balancer"],
    affectedUsers: 1250,
    dataCompromised: [],
    status: "Resolved",
    incidentCommander: "DevOps Lead",
    resolutionTime: "2h 15m",
    mitigationSteps: [
      "Activated DDoS protection",
      "Blocked malicious IPs",
      "Scaled infrastructure",
      "Implemented CAPTCHA",
    ],
    postMortemCompleted: true,
  },
];

export const securityDashboardStats: SecurityDashboardStats = {
  totalFailedLogins: 3456,
  failedLoginsToday: 42,
  activeAlerts: 7,
  criticalAlerts: 2,
  activeSessions: 156,
  blockedIPs: 23,
  securityScore: 87,
  breachesThisMonth: 2,
  mfaAdoptionRate: 78,
  weeklyFailedLogins: [
    { date: "2024-11-22", count: 38 },
    { date: "2024-11-23", count: 45 },
    { date: "2024-11-24", count: 52 },
    { date: "2024-11-25", count: 41 },
    { date: "2024-11-26", count: 48 },
    { date: "2024-11-27", count: 55 },
    { date: "2024-11-28", count: 42 },
  ],
  alertsByType: [
    { type: "Multiple Failed Logins", count: 145, percentage: 35 },
    { type: "Suspicious Login", count: 120, percentage: 29 },
    { type: "Unusual Activity", count: 87, percentage: 21 },
    { type: "Data Access Violation", count: 42, percentage: 10 },
    { type: "Permission Escalation", count: 21, percentage: 5 },
  ],
  topThreats: [
    { threat: "Brute Force Attacks", count: 145, severity: "High" },
    { threat: "Credential Stuffing", count: 89, severity: "Medium" },
    { threat: "SQL Injection Attempts", count: 34, severity: "Critical" },
    { threat: "XSS Attempts", count: 28, severity: "Medium" },
  ],
};

export const gdprCompliance: GDPRCompliance[] = [
  {
    id: "gdpr-1",
    complianceArea: "Data Collection",
    requirement: "Article 5 - Lawfulness, fairness and transparency",
    description:
      "Ensure all data collection has legal basis and is transparent to users",
    status: "Compliant",
    lastAudited: "2024-10-15T10:00:00Z",
    nextAuditDue: "2025-01-15T10:00:00Z",
    responsiblePerson: "Data Protection Officer",
    documentationUrl: "/docs/gdpr/article-5.pdf",
    priority: "High",
  },
  {
    id: "gdpr-2",
    complianceArea: "Consent Management",
    requirement: "Article 7 - Conditions for consent",
    description: "Implement clear consent mechanisms with ability to withdraw",
    status: "Compliant",
    lastAudited: "2024-11-01T09:00:00Z",
    nextAuditDue: "2025-02-01T09:00:00Z",
    responsiblePerson: "Legal Team",
    documentationUrl: "/docs/gdpr/article-7.pdf",
    priority: "Critical",
  },
  {
    id: "gdpr-3",
    complianceArea: "User Rights",
    requirement: "Article 15 - Right of access",
    description: "Provide users ability to access their personal data",
    status: "Partially Compliant",
    lastAudited: "2024-09-20T14:00:00Z",
    nextAuditDue: "2024-12-20T14:00:00Z",
    responsiblePerson: "Technical Team",
    findings: "Manual process for data export needs automation",
    remediationPlan: "Implement automated data export feature by Q1 2025",
    priority: "High",
  },
  {
    id: "gdpr-4",
    complianceArea: "Data Breach",
    requirement: "Article 33 - Notification of breach",
    description:
      "Notify authorities within 72 hours of becoming aware of breach",
    status: "Compliant",
    lastAudited: "2024-11-10T11:00:00Z",
    nextAuditDue: "2025-02-10T11:00:00Z",
    responsiblePerson: "Security Team",
    documentationUrl: "/docs/gdpr/article-33.pdf",
    priority: "Critical",
  },
];

export const dataProtectionSettings: DataProtectionSetting[] = [
  {
    id: "setting-1",
    category: "Encryption",
    settingName: "Database Encryption at Rest",
    description: "All database data is encrypted using AES-256",
    currentValue: true,
    recommendedValue: true,
    isCompliant: true,
    dataTypes: ["Customer Data", "Payment Info", "Personal Info"],
    lastUpdated: "2024-01-15T10:00:00Z",
    updatedBy: "System Admin",
    impact: "High",
    requiresApproval: true,
  },
  {
    id: "setting-2",
    category: "Data Retention",
    settingName: "Customer Data Retention Period",
    description:
      "Number of years to retain customer data after account closure",
    currentValue: "7 years",
    recommendedValue: "3 years",
    isCompliant: false,
    dataTypes: ["Customer Records", "Booking History"],
    lastUpdated: "2024-03-20T14:00:00Z",
    updatedBy: "Legal Team",
    impact: "Medium",
    requiresApproval: true,
  },
  {
    id: "setting-3",
    category: "Access Control",
    settingName: "Role-Based Access Control (RBAC)",
    description: "Enable strict role-based access to sensitive data",
    currentValue: true,
    recommendedValue: true,
    isCompliant: true,
    dataTypes: ["All Data Types"],
    lastUpdated: "2024-06-10T09:00:00Z",
    updatedBy: "Security Team",
    impact: "High",
    requiresApproval: false,
  },
  {
    id: "setting-4",
    category: "Right to Erasure",
    settingName: "Automated Data Deletion",
    description: "Enable automated data deletion upon user request",
    currentValue: false,
    recommendedValue: true,
    isCompliant: false,
    dataTypes: ["Personal Info", "Account Data"],
    lastUpdated: "2024-08-15T11:30:00Z",
    updatedBy: "Technical Team",
    impact: "High",
    requiresApproval: true,
  },
];

export const privacyPolicies: PrivacyPolicy[] = [
  {
    id: "policy-1",
    policyName: "General Privacy Policy",
    version: "3.2",
    effectiveDate: "2024-06-01T00:00:00Z",
    status: "Active",
    language: "English",
    jurisdiction: ["United States", "European Union"],
    lastUpdated: "2024-05-15T10:00:00Z",
    updatedBy: "Legal Team",
    approvedBy: "Chief Legal Officer",
    approvedAt: "2024-05-20T14:00:00Z",
    acceptanceRequired: true,
    acceptanceCount: 45678,
    documentUrl: "/policies/privacy-policy-v3.2.pdf",
    changes:
      "Updated data retention policies and third-party sharing disclosures",
  },
  {
    id: "policy-2",
    policyName: "Cookie Policy",
    version: "2.1",
    effectiveDate: "2024-03-01T00:00:00Z",
    status: "Active",
    language: "English",
    jurisdiction: ["European Union"],
    lastUpdated: "2024-02-15T09:00:00Z",
    updatedBy: "Compliance Team",
    approvedBy: "Data Protection Officer",
    approvedAt: "2024-02-20T11:00:00Z",
    acceptanceRequired: true,
    acceptanceCount: 52341,
    documentUrl: "/policies/cookie-policy-v2.1.pdf",
    changes: "Added new analytics cookies and updated consent mechanisms",
  },
  {
    id: "policy-3",
    policyName: "GDPR Compliance Policy",
    version: "1.5",
    effectiveDate: "2024-09-01T00:00:00Z",
    status: "Active",
    language: "English",
    jurisdiction: ["European Union"],
    lastUpdated: "2024-08-20T13:00:00Z",
    updatedBy: "DPO Team",
    approvedBy: "Data Protection Officer",
    approvedAt: "2024-08-25T15:00:00Z",
    acceptanceRequired: false,
    acceptanceCount: 0,
    documentUrl: "/policies/gdpr-compliance-v1.5.pdf",
    changes:
      "Enhanced user rights procedures and data breach notification process",
  },
];

export const userConsents: UserConsent[] = [
  {
    id: "consent-1",
    userId: "user-1001",
    userName: "Alice Johnson",
    userEmail: "alice@example.com",
    consentType: "Marketing",
    consentGiven: true,
    consentedAt: "2024-06-15T10:30:00Z",
    ipAddress: "192.168.1.100",
    consentVersion: "3.2",
    status: "Active",
    communicationChannel: "Email",
  },
  {
    id: "consent-2",
    userId: "user-1002",
    userName: "Bob Smith",
    userEmail: "bob@example.com",
    consentType: "Data Processing",
    consentGiven: true,
    consentedAt: "2024-07-20T14:15:00Z",
    ipAddress: "10.0.0.50",
    consentVersion: "3.2",
    status: "Active",
    communicationChannel: "In-App",
  },
  {
    id: "consent-3",
    userId: "user-1003",
    userName: "Carol White",
    userEmail: "carol@example.com",
    consentType: "Marketing",
    consentGiven: false,
    revokedAt: "2024-09-10T09:00:00Z",
    ipAddress: "203.0.113.45",
    consentVersion: "3.2",
    status: "Revoked",
    communicationChannel: "Email",
  },
  {
    id: "consent-4",
    userId: "user-1004",
    userName: "David Brown",
    userEmail: "david@example.com",
    consentType: "Cookies",
    consentGiven: true,
    consentedAt: "2024-03-15T11:45:00Z",
    ipAddress: "192.168.1.105",
    consentVersion: "2.1",
    expiresAt: "2025-03-15T11:45:00Z",
    status: "Active",
    communicationChannel: "In-App",
  },
];

export const complianceFrameworks: ComplianceFramework[] = [
  {
    id: "framework-1",
    frameworkName: "GDPR",
    industry: "All Industries",
    description:
      "General Data Protection Regulation compliance for EU data protection",
    applicableTo: ["All Facilities", "All Users"],
    requirements: 99,
    completedRequirements: 94,
    complianceScore: 95,
    status: "Compliant",
    certificationDate: "2024-05-01T00:00:00Z",
    nextAuditDate: "2025-05-01T00:00:00Z",
    auditor: "EU Compliance Auditors",
    documentationUrl: "/compliance/gdpr/certificate.pdf",
  },
  {
    id: "framework-2",
    frameworkName: "SOC 2",
    industry: "Technology",
    description:
      "Service Organization Control 2 for security, availability, and confidentiality",
    applicableTo: ["All Systems"],
    requirements: 64,
    completedRequirements: 58,
    complianceScore: 91,
    status: "Partially Compliant",
    certificationDate: "2024-03-15T00:00:00Z",
    expiryDate: "2025-03-15T00:00:00Z",
    nextAuditDate: "2025-01-15T00:00:00Z",
    auditor: "Big Four Audit Firm",
    documentationUrl: "/compliance/soc2/report.pdf",
  },
  {
    id: "framework-3",
    frameworkName: "ISO 27001",
    industry: "Information Security",
    description: "International standard for information security management",
    applicableTo: ["IT Infrastructure", "Security Systems"],
    requirements: 114,
    completedRequirements: 102,
    complianceScore: 89,
    status: "In Progress",
    nextAuditDate: "2025-03-01T00:00:00Z",
    auditor: "ISO Certification Body",
  },
  {
    id: "framework-4",
    frameworkName: "PCI DSS",
    industry: "Payment Processing",
    description:
      "Payment Card Industry Data Security Standard for payment data protection",
    applicableTo: ["Payment Systems", "Customer Billing"],
    requirements: 12,
    completedRequirements: 12,
    complianceScore: 100,
    status: "Compliant",
    certificationDate: "2024-07-01T00:00:00Z",
    expiryDate: "2025-07-01T00:00:00Z",
    nextAuditDate: "2025-06-01T00:00:00Z",
    auditor: "QSA Certified Auditor",
    documentationUrl: "/compliance/pci/certificate.pdf",
  },
];

export const complianceReports: ComplianceReport[] = [
  {
    id: "report-1",
    reportName: "Q3 2024 Compliance Assessment",
    reportType: "Quarterly Review",
    framework: ["GDPR", "SOC 2"],
    generatedAt: "2024-10-01T09:00:00Z",
    generatedBy: "Compliance Team",
    period: "Q3 2024 (July - September)",
    status: "Final",
    findings: 12,
    criticalFindings: 2,
    complianceScore: 92,
    recommendations: [
      "Implement automated data deletion process",
      "Enhance access control monitoring",
      "Update privacy policy documentation",
    ],
    documentUrl: "/reports/q3-2024-compliance.pdf",
    submittedTo: "Board of Directors",
    submittedAt: "2024-10-05T14:00:00Z",
  },
  {
    id: "report-2",
    reportName: "Annual Security Audit 2024",
    reportType: "Annual Review",
    framework: ["ISO 27001", "SOC 2"],
    generatedAt: "2024-11-15T10:00:00Z",
    generatedBy: "External Auditor",
    period: "FY 2024 (January - December)",
    status: "Under Review",
    findings: 8,
    criticalFindings: 1,
    complianceScore: 88,
    recommendations: [
      "Strengthen incident response procedures",
      "Implement additional security controls",
      "Conduct regular security training",
    ],
    documentUrl: "/reports/annual-security-2024.pdf",
  },
  {
    id: "report-3",
    reportName: "GDPR Compliance Audit",
    reportType: "Audit Report",
    framework: ["GDPR"],
    generatedAt: "2024-09-20T11:00:00Z",
    generatedBy: "Data Protection Officer",
    period: "2024 Annual Audit",
    status: "Final",
    findings: 6,
    criticalFindings: 0,
    complianceScore: 96,
    recommendations: [
      "Automate consent management",
      "Enhance data subject request handling",
    ],
    documentUrl: "/reports/gdpr-audit-2024.pdf",
    submittedTo: "Supervisory Authority",
    submittedAt: "2024-09-25T15:00:00Z",
  },
];

export const certificates: Certificate[] = [
  {
    id: "cert-1",
    certificateName: "api.petcare.com",
    certificateType: "SSL/TLS",
    issuer: "Let's Encrypt",
    issuedTo: "*.petcare.com",
    issuedAt: "2024-09-01T00:00:00Z",
    expiresAt: "2025-09-01T00:00:00Z",
    status: "Valid",
    serialNumber: "04:C5:8F:9E:D2:A1:3B:7F",
    fingerprint: "SHA256:AB:CD:EF:12:34:56:78:90",
    keySize: 2048,
    algorithm: "RSA",
    usedBy: ["API Gateway", "Web Server"],
    autoRenew: true,
    lastRenewed: "2024-09-01T00:00:00Z",
    daysUntilExpiry: 276,
  },
  {
    id: "cert-2",
    certificateName: "Code Signing Certificate",
    certificateType: "Code Signing",
    issuer: "DigiCert",
    issuedTo: "PetCare Platform Inc.",
    issuedAt: "2024-01-15T00:00:00Z",
    expiresAt: "2025-01-15T00:00:00Z",
    status: "Valid",
    serialNumber: "08:A2:B4:C6:D8:E0:F2:14",
    fingerprint: "SHA256:12:34:56:78:90:AB:CD:EF",
    keySize: 4096,
    algorithm: "RSA",
    usedBy: ["Software Releases", "Mobile Apps"],
    autoRenew: false,
    daysUntilExpiry: 48,
  },
  {
    id: "cert-3",
    certificateName: "Internal API Certificate",
    certificateType: "API",
    issuer: "Internal CA",
    issuedTo: "internal-api.petcare.local",
    issuedAt: "2024-06-01T00:00:00Z",
    expiresAt: "2024-12-01T00:00:00Z",
    status: "Expiring Soon",
    serialNumber: "0A:1B:2C:3D:4E:5F:60:71",
    fingerprint: "SHA256:FE:DC:BA:98:76:54:32:10",
    keySize: 2048,
    algorithm: "RSA",
    usedBy: ["Internal Services"],
    autoRenew: true,
    lastRenewed: "2024-06-01T00:00:00Z",
    daysUntilExpiry: 3,
  },
  {
    id: "cert-4",
    certificateName: "Old SSL Certificate",
    certificateType: "SSL/TLS",
    issuer: "Comodo",
    issuedTo: "legacy.petcare.com",
    issuedAt: "2023-08-01T00:00:00Z",
    expiresAt: "2024-08-01T00:00:00Z",
    status: "Expired",
    serialNumber: "0C:2D:4E:6F:80:91:A2:B3",
    fingerprint: "SHA256:00:11:22:33:44:55:66:77",
    keySize: 2048,
    algorithm: "RSA",
    usedBy: ["Legacy Systems"],
    autoRenew: false,
    daysUntilExpiry: -119,
  },
];

export const auditTrails: AuditTrail[] = [
  {
    id: "audit-1",
    eventType: "Configuration Change",
    description: "Modified password policy settings",
    userId: "user-101",
    userName: "John Admin",
    userRole: "Super Admin",
    timestamp: "2024-11-28T09:30:00Z",
    ipAddress: "192.168.1.100",
    resource: "Password Policy",
    action: "UPDATE",
    result: "Success",
    complianceRelevant: true,
    retentionPeriod: 2555,
    dataClassification: "Confidential",
  },
  {
    id: "audit-2",
    eventType: "Access",
    description: "Accessed customer personal data",
    userId: "user-102",
    userName: "Sarah Manager",
    userRole: "Facility Admin",
    timestamp: "2024-11-28T08:15:00Z",
    ipAddress: "10.0.0.50",
    resource: "Customer Records",
    action: "READ",
    result: "Success",
    complianceRelevant: true,
    retentionPeriod: 2555,
    dataClassification: "Restricted",
  },
  {
    id: "audit-3",
    eventType: "Deletion",
    description: "Deleted user account per GDPR request",
    userId: "user-103",
    userName: "Mike Support",
    userRole: "Support Staff",
    timestamp: "2024-11-28T07:45:00Z",
    ipAddress: "203.0.113.45",
    resource: "User Account",
    action: "DELETE",
    result: "Success",
    complianceRelevant: true,
    retentionPeriod: 2555,
    dataClassification: "Restricted",
  },
  {
    id: "audit-4",
    eventType: "Export",
    description: "Exported compliance report",
    userId: "user-104",
    userName: "Emily Tech",
    userRole: "Compliance Officer",
    timestamp: "2024-11-27T16:20:00Z",
    ipAddress: "192.168.1.120",
    resource: "Compliance Reports",
    action: "EXPORT",
    result: "Success",
    complianceRelevant: true,
    retentionPeriod: 2555,
    dataClassification: "Confidential",
  },
];

// Helper functions
export const getActiveMFA = () =>
  mfaSettings.filter((m) => m.status === "Active");
export const getActiveIPs = () =>
  ipWhitelist.filter((ip) => ip.status === "Active");
export const getBlockedIPs = () =>
  ipWhitelist.filter((ip) => ip.status === "Blocked");
export const getActiveSessions = () =>
  activeSessions.filter((s) => s.status === "Active");
export const getActivePasswordPolicies = () =>
  passwordPolicies.filter((p) => p.status === "Active");
export const getCriticalAlerts = () =>
  securityAlerts.filter((a) => a.severity === "Critical");
export const getCompliantAreas = () =>
  gdprCompliance.filter((g) => g.status === "Compliant");
export const getNonCompliantSettings = () =>
  dataProtectionSettings.filter((s) => !s.isCompliant);
export const getActivePolicies = () =>
  privacyPolicies.filter((p) => p.status === "Active");
export const getActiveConsents = () =>
  userConsents.filter((c) => c.status === "Active");
export const getCompliantFrameworks = () =>
  complianceFrameworks.filter((f) => f.status === "Compliant");
export const getExpiringCertificates = () =>
  certificates.filter((c) => c.daysUntilExpiry <= 30 && c.daysUntilExpiry > 0);
