import type {
  MFASettings,
  IPWhitelist,
  SessionManagement,
  PasswordPolicy,
  FailedLoginAttempt,
  SecurityAlert,
  GDPRCompliance,
  DataProtectionSetting,
  PrivacyPolicy,
  UserConsent,
  ComplianceFramework,
  ComplianceReport,
  Certificate,
  AuditTrail,
  DataSubjectRequest,
  DataSubjectRequestStats,
} from "@/types/security";

import {
  mfaSettings,
  ipWhitelist,
  activeSessions,
  passwordPolicies,
  failedLoginAttempts,
  securityAlerts,
  gdprCompliance,
  dataProtectionSettings,
  privacyPolicies,
  userConsents,
  complianceFrameworks,
  complianceReports,
  certificates,
  auditTrails,
  dataSubjectRequests,
  dataSubjectRequestStats,
} from "@/data/security-compliance";

export const securityQueries = {
  mfaSettings: () => ({
    queryKey: ["security", "mfa"] as const,
    queryFn: async (): Promise<MFASettings[]> => mfaSettings,
  }),

  ipWhitelist: () => ({
    queryKey: ["security", "ipWhitelist"] as const,
    queryFn: async (): Promise<IPWhitelist[]> => ipWhitelist,
  }),

  sessions: () => ({
    queryKey: ["security", "sessions"] as const,
    queryFn: async (): Promise<SessionManagement[]> => activeSessions,
  }),

  passwordPolicies: () => ({
    queryKey: ["security", "passwordPolicies"] as const,
    queryFn: async (): Promise<PasswordPolicy[]> => passwordPolicies,
  }),

  failedLogins: () => ({
    queryKey: ["security", "failedLogins"] as const,
    queryFn: async (): Promise<FailedLoginAttempt[]> => failedLoginAttempts,
  }),

  alerts: () => ({
    queryKey: ["security", "alerts"] as const,
    queryFn: async (): Promise<SecurityAlert[]> => securityAlerts,
  }),

  gdprCompliance: () => ({
    queryKey: ["security", "gdpr"] as const,
    queryFn: async (): Promise<GDPRCompliance[]> => gdprCompliance,
  }),

  dataProtection: () => ({
    queryKey: ["security", "dataProtection"] as const,
    queryFn: async (): Promise<DataProtectionSetting[]> =>
      dataProtectionSettings,
  }),

  privacyPolicies: () => ({
    queryKey: ["security", "privacyPolicies"] as const,
    queryFn: async (): Promise<PrivacyPolicy[]> => privacyPolicies,
  }),

  userConsents: () => ({
    queryKey: ["security", "consents"] as const,
    queryFn: async (): Promise<UserConsent[]> => userConsents,
  }),

  complianceFrameworks: () => ({
    queryKey: ["security", "frameworks"] as const,
    queryFn: async (): Promise<ComplianceFramework[]> => complianceFrameworks,
  }),

  complianceReports: () => ({
    queryKey: ["security", "reports"] as const,
    queryFn: async (): Promise<ComplianceReport[]> => complianceReports,
  }),

  certificates: () => ({
    queryKey: ["security", "certificates"] as const,
    queryFn: async (): Promise<Certificate[]> => certificates,
  }),

  auditTrail: () => ({
    queryKey: ["security", "auditTrail"] as const,
    queryFn: async (): Promise<AuditTrail[]> => auditTrails,
  }),

  dataSubjectRequests: () => ({
    queryKey: ["security", "dataSubjectRequests"] as const,
    queryFn: async (): Promise<DataSubjectRequest[]> => dataSubjectRequests,
  }),

  dataSubjectRequestStats: () => ({
    queryKey: ["security", "dataSubjectRequestStats"] as const,
    queryFn: async (): Promise<DataSubjectRequestStats> =>
      dataSubjectRequestStats,
  }),
};
