// The permission catalog for the Roles & Permissions editor, organized into the
// platform's seven permission domains. Permission ids match the strings used in
// rolePermissions (src/data/admin-users.ts); only the grouping/labels live here.

export interface PermissionDef {
  id: string;
  label: string;
  category: string;
}

export const PERMISSION_CATEGORY_ORDER = [
  "Tenant Management",
  "Commercial & Billing",
  "Platform Control",
  "Support Operations",
  "Team & Access",
  "Reports & Analytics",
  "System & Security",
] as const;

export const ALL_PERMISSIONS: PermissionDef[] = [
  // Tenant Management
  { id: "view_clients", label: "View Clients", category: "Tenant Management" },
  {
    id: "manage_clients",
    label: "Manage Clients",
    category: "Tenant Management",
  },
  { id: "view_leads", label: "View Leads", category: "Tenant Management" },
  { id: "manage_leads", label: "Manage Leads", category: "Tenant Management" },

  // Commercial & Billing
  {
    id: "create_quotes",
    label: "Create Quotes",
    category: "Commercial & Billing",
  },
  {
    id: "manage_subscriptions",
    label: "Manage Subscriptions",
    category: "Commercial & Billing",
  },
  {
    id: "view_billing",
    label: "View Billing",
    category: "Commercial & Billing",
  },
  {
    id: "manage_billing",
    label: "Manage Billing",
    category: "Commercial & Billing",
  },
  {
    id: "view_transactions",
    label: "View Transactions",
    category: "Commercial & Billing",
  },

  // Platform Control
  {
    id: "full_system_access",
    label: "Full System Access",
    category: "Platform Control",
  },
  {
    id: "system_configuration",
    label: "System Configuration",
    category: "Platform Control",
  },
  {
    id: "backup_restore",
    label: "Backup & Restore",
    category: "Platform Control",
  },
  {
    id: "view_system_logs",
    label: "View System Logs",
    category: "Platform Control",
  },

  // Support Operations
  { id: "view_tickets", label: "View Tickets", category: "Support Operations" },
  {
    id: "manage_tickets",
    label: "Manage Tickets",
    category: "Support Operations",
  },
  {
    id: "access_knowledge_base",
    label: "Access Knowledge Base",
    category: "Support Operations",
  },
  {
    id: "remote_assistance",
    label: "Remote Assistance",
    category: "Support Operations",
  },
  {
    id: "escalate_issues",
    label: "Escalate Issues",
    category: "Support Operations",
  },
  {
    id: "send_communications",
    label: "Send Communications",
    category: "Support Operations",
  },
  {
    id: "answer_support_calls",
    label: "Can answer support calls",
    category: "Support Operations",
  },
  {
    id: "manage_chat_inbox",
    label: "Can manage chat inbox",
    category: "Support Operations",
  },
  {
    id: "assign_escalate_tickets",
    label: "Can assign/escalate tickets",
    category: "Support Operations",
  },
  {
    id: "configure_ivr",
    label: "Can configure IVR",
    category: "Support Operations",
  },
  {
    id: "access_call_recordings",
    label: "Can access call recordings",
    category: "Support Operations",
  },
  {
    id: "process_gdpr_requests",
    label: "Can process GDPR requests",
    category: "Support Operations",
  },

  // Team & Access
  { id: "manage_users", label: "Manage Users", category: "Team & Access" },
  { id: "manage_roles", label: "Manage Roles", category: "Team & Access" },

  // Reports & Analytics
  {
    id: "view_reports",
    label: "View Reports",
    category: "Reports & Analytics",
  },
  {
    id: "compliance_reports",
    label: "Compliance Reports",
    category: "Reports & Analytics",
  },
  {
    id: "export_financial_data",
    label: "Export Financial Data",
    category: "Reports & Analytics",
  },

  // System & Security
  {
    id: "audit_trail_access",
    label: "Audit Trail Access",
    category: "System & Security",
  },
  {
    id: "audit_all_actions",
    label: "Audit All Actions",
    category: "System & Security",
  },
  {
    id: "security_settings",
    label: "Security Settings",
    category: "System & Security",
  },
];

/** Permissions grouped by category, in PERMISSION_CATEGORY_ORDER. */
export function groupPermissionsByCategory(): {
  category: string;
  perms: PermissionDef[];
}[] {
  return PERMISSION_CATEGORY_ORDER.map((category) => ({
    category,
    perms: ALL_PERMISSIONS.filter((p) => p.category === category),
  })).filter((g) => g.perms.length > 0);
}
