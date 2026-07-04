// Seed saved replies for the Support chat composer (Task 12). The management UI
// (create/edit/delete) is Task 18 — these are read-only for now. Bodies use
// {{facility_name}} / {{contact_name}} merge fields, resolved at insert time
// against the active conversation.

import type { SupportSavedReply } from "@/types/support-saved-replies";

export const supportSavedReplies: SupportSavedReply[] = [
  // --- Technical -----------------------------------------------------------
  {
    id: "sr-password-reset",
    shortcut: "password-reset",
    title: "Password reset steps",
    body: "Hi {{contact_name}}, you can reset your password from the login screen at app.yipyy.com — click “Forgot password” and follow the emailed link. If it doesn't arrive within a few minutes, check your spam folder or reply here and we'll trigger it manually for {{facility_name}}.",
    category: "technical",
    useCount: 42,
  },
  {
    id: "sr-clear-cache",
    shortcut: "clear-cache",
    title: "Clear cache / hard refresh",
    body: "Thanks for flagging this. A quick hard refresh usually clears it: press Ctrl+Shift+R (Cmd+Shift+R on Mac). If the issue persists, let us know your browser and we'll dig in.",
    category: "technical",
    useCount: 28,
  },
  {
    id: "sr-integration-sync",
    shortcut: "integration-sync",
    title: "Integration re-sync",
    body: "We've re-queued the sync for {{facility_name}}. It can take up to 15 minutes to reflect. We'll confirm here once it completes.",
    category: "technical",
    useCount: 15,
  },

  // --- Billing -------------------------------------------------------------
  {
    id: "sr-invoice-copy",
    shortcut: "invoice-copy",
    title: "Send invoice copy",
    body: "Hi {{contact_name}}, I've re-sent the latest invoice for {{facility_name}} to your billing email. You can also download past invoices anytime under Settings → Subscription & Billing.",
    category: "billing",
    useCount: 37,
  },
  {
    id: "sr-refund-eta",
    shortcut: "refund-eta",
    title: "Refund timeline",
    body: "Your refund has been approved and processed. Depending on your bank, it typically posts within 5–7 business days. Let us know if it hasn't appeared by then.",
    category: "billing",
    useCount: 21,
  },
  {
    id: "sr-plan-change",
    shortcut: "plan-change",
    title: "Plan change confirmation",
    body: "The plan change for {{facility_name}} is now active. Your next invoice will reflect the updated rate, prorated for the current cycle.",
    category: "billing",
    useCount: 12,
  },

  // --- Onboarding ----------------------------------------------------------
  {
    id: "sr-welcome",
    shortcut: "welcome",
    title: "Onboarding welcome",
    body: "Welcome aboard, {{contact_name}}! I'm your onboarding contact for {{facility_name}}. When you have 20 minutes, book a kickoff call and we'll get your services, staff and bookings set up together.",
    category: "onboarding",
    useCount: 33,
  },
  {
    id: "sr-import-data",
    shortcut: "import-data",
    title: "Data import offer",
    body: "We can import your existing clients and pets for you. Send an export (CSV) and we'll load it into {{facility_name}} — usually within one business day.",
    category: "onboarding",
    useCount: 18,
  },

  // --- General -------------------------------------------------------------
  {
    id: "sr-thanks",
    shortcut: "thanks",
    title: "Thanks & follow-up",
    body: "Thanks for reaching out! I've noted this on {{facility_name}}'s account. Is there anything else I can help with today?",
    category: "general",
    useCount: 51,
  },
  {
    id: "sr-escalate",
    shortcut: "escalate",
    title: "Escalation notice",
    body: "Thanks for your patience — I'm escalating this to our specialist team and will follow up here as soon as I have an update for {{facility_name}}.",
    category: "general",
    useCount: 24,
  },
];
