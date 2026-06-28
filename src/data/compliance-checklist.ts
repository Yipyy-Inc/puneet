// Regulatory compliance requirements checklist (GDPR / PIPEDA / PCI-DSS) with
// current status. Items not "Met" carry a "Fix This" target — either an in-page
// tab (fixTab) or an external settings route (fixHref). Read-only status.

export type ComplianceFrameworkKey = "GDPR" | "PIPEDA" | "PCI-DSS";
export type RequirementStatus = "Met" | "In Progress" | "Not Met";

export interface ComplianceRequirement {
  id: string;
  framework: ComplianceFrameworkKey;
  requirement: string;
  description: string;
  status: RequirementStatus;
  fixTab?: string; // in-page Compliance Tools tab id
  fixHref?: string; // external settings route
}

export const complianceRequirements: ComplianceRequirement[] = [
  // ---- GDPR ----
  {
    id: "gdpr-1",
    framework: "GDPR",
    requirement: "Lawful basis for processing (Art. 6)",
    description:
      "Every processing activity is mapped to a documented lawful basis.",
    status: "Met",
  },
  {
    id: "gdpr-2",
    framework: "GDPR",
    requirement: "Right to data portability (Art. 20)",
    description:
      "Users can export their data in a structured, machine-readable format.",
    status: "Met",
  },
  {
    id: "gdpr-3",
    framework: "GDPR",
    requirement: "Right to erasure (Art. 17)",
    description:
      "Automated deletion of personal data on request / when no longer needed.",
    status: "In Progress",
    fixHref: "/dashboard/system-admin/data-management",
  },
  {
    id: "gdpr-4",
    framework: "GDPR",
    requirement: "Storage limitation (Art. 5)",
    description:
      "Personal data is retained no longer than necessary per a defined policy.",
    status: "Not Met",
    fixTab: "data-retention",
  },
  {
    id: "gdpr-5",
    framework: "GDPR",
    requirement: "Breach notification within 72 hours (Art. 33)",
    description:
      "Incident workflow notifies the supervisory authority within 72h.",
    status: "Met",
  },

  // ---- PIPEDA ----
  {
    id: "pipeda-1",
    framework: "PIPEDA",
    requirement: "Consent for collection",
    description:
      "Meaningful consent is captured before collecting personal information.",
    status: "Met",
  },
  {
    id: "pipeda-2",
    framework: "PIPEDA",
    requirement: "Access to personal information",
    description:
      "Individuals can request access to the information held about them.",
    status: "Met",
    fixTab: "data-subject-requests",
  },
  {
    id: "pipeda-3",
    framework: "PIPEDA",
    requirement: "Safeguards (encryption at rest & in transit)",
    description:
      "Security safeguards protect personal information appropriate to sensitivity.",
    status: "In Progress",
    fixHref: "/dashboard/security-compliance/security-management",
  },
  {
    id: "pipeda-4",
    framework: "PIPEDA",
    requirement: "Limiting retention & disposal",
    description:
      "Information is disposed of when no longer required for the stated purpose.",
    status: "Not Met",
    fixTab: "data-retention",
  },
  {
    id: "pipeda-5",
    framework: "PIPEDA",
    requirement: "Accountability (privacy officer)",
    description: "A designated individual is accountable for compliance.",
    status: "Met",
  },

  // ---- PCI-DSS ----
  {
    id: "pci-1",
    framework: "PCI-DSS",
    requirement: "Encrypt cardholder data (Req. 3 & 4)",
    description:
      "Cardholder data is encrypted at rest and across open networks.",
    status: "Met",
  },
  {
    id: "pci-2",
    framework: "PCI-DSS",
    requirement: "Restrict access by need-to-know (Req. 7)",
    description:
      "Access to cardholder data is limited to roles that require it.",
    status: "Met",
  },
  {
    id: "pci-3",
    framework: "PCI-DSS",
    requirement: "Multi-factor authentication for admins (Req. 8)",
    description: "MFA is enforced for all administrative and remote access.",
    status: "In Progress",
    fixHref: "/dashboard/security-compliance/security-management",
  },
  {
    id: "pci-4",
    framework: "PCI-DSS",
    requirement: "Maintain a firewall configuration (Req. 1)",
    description:
      "Network segmentation and firewall rules protect the cardholder data environment.",
    status: "Met",
  },
  {
    id: "pci-5",
    framework: "PCI-DSS",
    requirement: "Track & monitor access / audit logs (Req. 10)",
    description:
      "All access to systems and cardholder data is logged and monitored.",
    status: "Met",
  },
];
