/**
 * Security & Compliance domain types.
 * Single source of truth — data files re-export from here.
 */

import { z } from "zod";

// ========================================
// ACCESS CONTROL
// ========================================

export const mfaMethodEnum = z.enum([
  "Authenticator App",
  "SMS",
  "Email",
  "Hardware Token",
]);

export const mfaSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
  mfaEnabled: z.boolean(),
  mfaMethod: mfaMethodEnum,
  enrolledAt: z.string(),
  lastUsed: z.string(),
  backupCodes: z.number(),
  status: z.enum(["Active", "Inactive", "Pending Setup"]),
});
export type MFASettings = z.infer<typeof mfaSettingsSchema>;

export const ipWhitelistSchema = z.object({
  id: z.string(),
  ipAddress: z.string(),
  description: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  facilityId: z.string().optional(),
  facilityName: z.string().optional(),
  addedBy: z.string(),
  addedAt: z.string(),
  lastUsed: z.string(),
  accessCount: z.number(),
  status: z.enum(["Active", "Inactive", "Blocked"]),
  expiresAt: z.string().optional(),
});
export type IPWhitelist = z.infer<typeof ipWhitelistSchema>;

export const sessionManagementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
  sessionToken: z.string(),
  ipAddress: z.string(),
  deviceType: z.enum(["Desktop", "Mobile", "Tablet"]),
  browser: z.string(),
  location: z.string(),
  startedAt: z.string(),
  lastActivity: z.string(),
  expiresAt: z.string(),
  status: z.enum(["Active", "Expired", "Terminated"]),
  duration: z.string(),
});
export type SessionManagement = z.infer<typeof sessionManagementSchema>;

export const passwordPolicySchema = z.object({
  id: z.string(),
  policyName: z.string(),
  description: z.string(),
  minLength: z.number(),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSpecialChars: z.boolean(),
  expirationDays: z.number(),
  preventReuse: z.number(),
  maxAttempts: z.number(),
  lockoutDuration: z.number(),
  applicableTo: z.array(z.string()),
  createdBy: z.string(),
  createdAt: z.string(),
  lastModified: z.string(),
  status: z.enum(["Active", "Inactive", "Draft"]),
});
export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;

// ========================================
// SECURITY MONITORING
// ========================================

export const failedLoginAttemptSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  email: z.string(),
  ipAddress: z.string(),
  location: z.string(),
  attemptTime: z.string(),
  failureReason: z.enum([
    "Invalid Password",
    "Invalid Username",
    "Account Locked",
    "MFA Failed",
    "IP Blocked",
  ]),
  deviceType: z.string(),
  browser: z.string(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  isBlocked: z.boolean(),
  attemptCount: z.number(),
});
export type FailedLoginAttempt = z.infer<typeof failedLoginAttemptSchema>;

export const securityAlertSchema = z.object({
  id: z.string(),
  alertType: z.enum([
    "Suspicious Login",
    "Multiple Failed Logins",
    "Unusual Activity",
    "Data Access Violation",
    "Permission Escalation",
    "Malware Detection",
  ]),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  title: z.string(),
  description: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  ipAddress: z.string(),
  location: z.string(),
  detectedAt: z.string(),
  status: z.enum(["New", "Investigating", "Resolved", "Dismissed"]),
  assignedTo: z.string().optional(),
  resolvedAt: z.string().optional(),
  actionsTaken: z.string().optional(),
  affectedResources: z.array(z.string()),
});
export type SecurityAlert = z.infer<typeof securityAlertSchema>;

// ========================================
// DATA PRIVACY
// ========================================

export const gdprComplianceSchema = z.object({
  id: z.string(),
  complianceArea: z.enum([
    "Data Collection",
    "Data Storage",
    "Data Processing",
    "User Rights",
    "Data Breach",
    "Consent Management",
  ]),
  requirement: z.string(),
  description: z.string(),
  status: z.enum([
    "Compliant",
    "Partially Compliant",
    "Non-Compliant",
    "In Progress",
  ]),
  lastAudited: z.string(),
  nextAuditDue: z.string(),
  responsiblePerson: z.string(),
  documentationUrl: z.string().optional(),
  findings: z.string().optional(),
  remediationPlan: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
});
export type GDPRCompliance = z.infer<typeof gdprComplianceSchema>;

export const dataProtectionSettingSchema = z.object({
  id: z.string(),
  category: z.enum([
    "Encryption",
    "Access Control",
    "Data Retention",
    "Backup",
    "Anonymization",
    "Right to Erasure",
  ]),
  settingName: z.string(),
  description: z.string(),
  currentValue: z.union([z.string(), z.boolean()]),
  recommendedValue: z.union([z.string(), z.boolean()]),
  isCompliant: z.boolean(),
  dataTypes: z.array(z.string()),
  lastUpdated: z.string(),
  updatedBy: z.string(),
  impact: z.enum(["Low", "Medium", "High"]),
  requiresApproval: z.boolean(),
});
export type DataProtectionSetting = z.infer<typeof dataProtectionSettingSchema>;

export const privacyPolicySchema = z.object({
  id: z.string(),
  policyName: z.string(),
  version: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  status: z.enum(["Draft", "Active", "Archived", "Under Review"]),
  language: z.string(),
  jurisdiction: z.array(z.string()),
  lastUpdated: z.string(),
  updatedBy: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  acceptanceRequired: z.boolean(),
  acceptanceCount: z.number(),
  documentUrl: z.string(),
  changes: z.string().optional(),
});
export type PrivacyPolicy = z.infer<typeof privacyPolicySchema>;

export const userConsentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  consentType: z.enum([
    "Marketing",
    "Data Processing",
    "Cookies",
    "Third Party Sharing",
    "Analytics",
    "Terms of Service",
  ]),
  consentGiven: z.boolean(),
  consentedAt: z.string().optional(),
  revokedAt: z.string().optional(),
  ipAddress: z.string(),
  consentVersion: z.string(),
  expiresAt: z.string().optional(),
  status: z.enum(["Active", "Revoked", "Expired"]),
  communicationChannel: z.enum(["Email", "SMS", "Push Notification", "In-App"]),
});
export type UserConsent = z.infer<typeof userConsentSchema>;

// ========================================
// REGULATORY COMPLIANCE
// ========================================

export const complianceFrameworkSchema = z.object({
  id: z.string(),
  frameworkName: z.enum([
    "GDPR",
    "HIPAA",
    "SOC 2",
    "ISO 27001",
    "PCI DSS",
    "CCPA",
    "SOX",
    "Other",
  ]),
  industry: z.string(),
  description: z.string(),
  applicableTo: z.array(z.string()),
  requirements: z.number(),
  completedRequirements: z.number(),
  complianceScore: z.number(),
  status: z.enum([
    "Compliant",
    "Partially Compliant",
    "Non-Compliant",
    "In Progress",
  ]),
  certificationDate: z.string().optional(),
  expiryDate: z.string().optional(),
  nextAuditDate: z.string(),
  auditor: z.string().optional(),
  documentationUrl: z.string().optional(),
});
export type ComplianceFramework = z.infer<typeof complianceFrameworkSchema>;

export const complianceReportSchema = z.object({
  id: z.string(),
  reportName: z.string(),
  reportType: z.enum([
    "Audit Report",
    "Compliance Assessment",
    "Risk Assessment",
    "Incident Report",
    "Quarterly Review",
    "Annual Review",
  ]),
  framework: z.array(z.string()),
  generatedAt: z.string(),
  generatedBy: z.string(),
  period: z.string(),
  status: z.enum(["Draft", "Final", "Submitted", "Under Review"]),
  findings: z.number(),
  criticalFindings: z.number(),
  complianceScore: z.number(),
  recommendations: z.array(z.string()),
  documentUrl: z.string().optional(),
  submittedTo: z.string().optional(),
  submittedAt: z.string().optional(),
});
export type ComplianceReport = z.infer<typeof complianceReportSchema>;

export const certificateSchema = z.object({
  id: z.string(),
  certificateName: z.string(),
  certificateType: z.enum([
    "SSL/TLS",
    "Code Signing",
    "Email",
    "Client Authentication",
    "Compliance",
    "API",
  ]),
  issuer: z.string(),
  issuedTo: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["Valid", "Expiring Soon", "Expired", "Revoked"]),
  serialNumber: z.string(),
  fingerprint: z.string(),
  keySize: z.number(),
  algorithm: z.string(),
  usedBy: z.array(z.string()),
  autoRenew: z.boolean(),
  lastRenewed: z.string().optional(),
  daysUntilExpiry: z.number(),
});
export type Certificate = z.infer<typeof certificateSchema>;

export const auditTrailSchema = z.object({
  id: z.string(),
  eventType: z.enum([
    "Access",
    "Modification",
    "Deletion",
    "Export",
    "Configuration Change",
    "User Action",
  ]),
  description: z.string(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.string(),
  timestamp: z.string(),
  ipAddress: z.string(),
  resource: z.string(),
  action: z.string(),
  result: z.enum(["Success", "Failed", "Denied"]),
  complianceRelevant: z.boolean(),
  retentionPeriod: z.number(),
  dataClassification: z.enum([
    "Public",
    "Internal",
    "Confidential",
    "Restricted",
  ]),
});
export type AuditTrail = z.infer<typeof auditTrailSchema>;

// ========================================
// DATA SUBJECT REQUESTS (GDPR)
// ========================================

export const dataSubjectRequestSchema = z.object({
  id: z.string(),
  requestType: z.enum([
    "Export",
    "Deletion",
    "Rectification",
    "Restriction",
    "Objection",
  ]),
  requesterId: z.string(),
  requesterName: z.string(),
  requesterEmail: z.string(),
  facilityId: z.string().optional(),
  facilityName: z.string().optional(),
  submittedAt: z.string(),
  deadline: z.string(),
  status: z.enum([
    "Pending",
    "In Progress",
    "Completed",
    "Rejected",
    "Extended",
  ]),
  assignedTo: z.string().optional(),
  assignedAt: z.string().optional(),
  completedAt: z.string().optional(),
  dataCategories: z.array(z.string()),
  verificationStatus: z.enum(["Pending", "Verified", "Failed"]),
  verificationMethod: z.string().optional(),
  verifiedAt: z.string().optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  extensionReason: z.string().optional(),
  exportFileUrl: z.string().optional(),
  deletionConfirmation: z.boolean().optional(),
  auditLogId: z.string().optional(),
});
export type DataSubjectRequest = z.infer<typeof dataSubjectRequestSchema>;

export interface DataSubjectRequestStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  avgCompletionDays: number;
  exportRequests: number;
  deletionRequests: number;
  rectificationRequests: number;
  complianceRate: number;
  overdueRequests: number;
  thisMonthRequests: number;
  lastMonthRequests: number;
}
