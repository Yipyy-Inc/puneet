// Seed for the platform email-template system (Task 55). Automated senders such
// as the dunning sequence resolve templates by id from here, so the same
// content powers both the Email Templates admin page and the senders.

import type { EmailTemplate } from "@/types/email-templates";

const UPDATED = "2026-06-01T00:00:00Z";

export const emailTemplates: EmailTemplate[] = [
  // --- Onboarding ----------------------------------------------------------
  {
    id: "tmpl-facility-welcome",
    name: "Facility Welcome",
    category: "Onboarding",
    subject: "Welcome to Yipyy, {{facility_name}}!",
    body: "Hi {{primary_admin_name}},\n\nYour {{plan_name}} workspace is ready. Sign in to finish setting up bookings, staff and services.\n\n— The Yipyy Team",
    mergeTags: ["facility_name", "primary_admin_name", "plan_name"],
    trigger: "Onboarding wizard completion",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },

  // --- Trial Lifecycle -----------------------------------------------------
  {
    id: "tmpl-trial-expiry",
    name: "Trial Expiry — 14/7/3 Days",
    category: "Trial Lifecycle",
    subject: "Your Yipyy trial ends in {{days_remaining}} days",
    body: "Hi {{primary_admin_name}},\n\n{{facility_name}}'s free trial ends on {{trial_end_date}}. Add a payment method to keep your {{plan_name}} features active.",
    mergeTags: [
      "facility_name",
      "primary_admin_name",
      "plan_name",
      "days_remaining",
      "trial_end_date",
    ],
    trigger: "Automated (14/7/3 days before trial end)",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-trial-expired",
    name: "Trial Expired",
    category: "Trial Lifecycle",
    subject: "Your Yipyy trial has ended",
    body: "Hi {{primary_admin_name}},\n\n{{facility_name}}'s trial has ended. Upgrade now to restore full access to your data and features.",
    mergeTags: ["facility_name", "primary_admin_name"],
    trigger: "On trial_end if not converted",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },

  // --- Billing -------------------------------------------------------------
  {
    id: "tmpl-invoice-generated",
    name: "Invoice Generated",
    category: "Billing",
    subject: "Invoice {{invoice_number}} for {{facility_name}}",
    body: "Hi,\n\nInvoice {{invoice_number}} for {{amount_due}} is now available. Payment is due {{due_date}}.",
    mergeTags: ["facility_name", "invoice_number", "amount_due", "due_date"],
    trigger: "Billing cycle start",
    recipient: "Billing contact",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-invoice-overdue-day-1",
    name: "Invoice Overdue — Day 1",
    category: "Billing",
    subject: "Reminder: invoice {{invoice_number}} is past due",
    body: "Hi,\n\nInvoice {{invoice_number}} for {{amount_due}} was due {{due_date}} and is now 1 day overdue. Please submit payment to avoid interruption to {{facility_name}}.",
    mergeTags: [
      "facility_name",
      "invoice_number",
      "amount_due",
      "due_date",
      "days_overdue",
    ],
    trigger: "Automated dunning — 1 day past due",
    recipient: "Billing contact",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-invoice-overdue-day-7",
    name: "Invoice Overdue — Day 7",
    category: "Billing",
    subject: "Second notice: invoice {{invoice_number}} is 7 days overdue",
    body: "Hi,\n\nInvoice {{invoice_number}} for {{amount_due}} is now {{days_overdue}} days past due. Please pay within 7 days to keep {{facility_name}} active and avoid suspension.",
    mergeTags: [
      "facility_name",
      "invoice_number",
      "amount_due",
      "due_date",
      "days_overdue",
    ],
    trigger: "Automated dunning — 7 days past due",
    recipient: "Billing contact",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-invoice-overdue-day-14",
    name: "Invoice Overdue — Day 14",
    category: "Billing",
    subject: "Final notice: invoice {{invoice_number}} — account at risk",
    body: "Hi,\n\nInvoice {{invoice_number}} for {{amount_due}} is {{days_overdue}} days past due. This is the final notice: {{facility_name}} has been flagged for suspension and access will be restricted unless payment is received.",
    mergeTags: [
      "facility_name",
      "invoice_number",
      "amount_due",
      "due_date",
      "days_overdue",
    ],
    trigger: "Automated dunning — 14 days past due (flags for suspension)",
    recipient: "Billing contact",
    updatedAt: UPDATED,
  },

  // --- Account Management --------------------------------------------------
  {
    id: "tmpl-account-suspended",
    name: "Account Suspended",
    category: "Account Management",
    subject: "{{facility_name}} has been suspended",
    body: "Hi {{primary_admin_name}},\n\n{{facility_name}} has been suspended due to an unpaid balance ({{amount_due}}). Settle invoice {{invoice_number}} to restore access.",
    mergeTags: [
      "facility_name",
      "primary_admin_name",
      "invoice_number",
      "amount_due",
    ],
    trigger: "On suspension",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-password-reset",
    name: "Password Reset",
    category: "Account Management",
    subject: "Reset your Yipyy password",
    body: "Hi {{staff_name}},\n\nUse the link below to reset your password. It expires in 30 minutes.",
    mergeTags: ["staff_name"],
    trigger: "On request",
    recipient: "Requesting staff",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-staff-invitation",
    name: "Staff Invitation",
    category: "Account Management",
    subject: "You've been invited to {{facility_name}} on Yipyy",
    body: "Hi {{staff_name}},\n\n{{primary_admin_name}} invited you to join {{facility_name}}. Accept the invitation to set up your account.",
    mergeTags: ["facility_name", "primary_admin_name", "staff_name"],
    trigger: "On account creation",
    recipient: "Invited staff",
    updatedAt: UPDATED,
  },

  // --- Support -------------------------------------------------------------
  {
    id: "tmpl-ticket-opened",
    name: "Support Ticket Opened",
    category: "Support",
    subject: "We've received your ticket {{ticket_id}}",
    body: "Hi {{primary_admin_name}},\n\nTicket {{ticket_id}} has been opened. Our team will respond shortly.",
    mergeTags: ["primary_admin_name", "ticket_id"],
    trigger: "On ticket create",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },
  {
    id: "tmpl-ticket-resolved",
    name: "Ticket Resolved",
    category: "Support",
    subject: "Ticket {{ticket_id}} has been resolved",
    body: "Hi {{primary_admin_name}},\n\nTicket {{ticket_id}} is now resolved. Reply if you need anything else.",
    mergeTags: ["primary_admin_name", "ticket_id"],
    trigger: "On resolve",
    recipient: "Primary admin",
    updatedAt: UPDATED,
  },
];

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return emailTemplates.find((t) => t.id === id);
}
