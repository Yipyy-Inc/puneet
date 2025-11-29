export type EmailTemplateType =
  | "welcome"
  | "demo_invite"
  | "demo_followup"
  | "proposal"
  | "followup"
  | "onboarding"
  | "check_in";

export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "tpl-1",
    name: "Welcome Email",
    type: "welcome",
    subject: "Welcome to PetCare Platform - Let's Get Started!",
    body: `Hi {{contactName}},

Thank you for your interest in PetCare Platform! We're excited to have {{facilityName}} consider joining our growing community of pet care professionals.

Our platform is designed to help pet care facilities like yours streamline operations, manage bookings, and deliver exceptional service to your clients.

Here's what you can expect next:
- A dedicated account manager will reach out within 24 hours
- We'll schedule a personalized demo at your convenience
- You'll receive access to our resource library

In the meantime, feel free to explore our website or reply to this email with any questions.

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform`,
    variables: ["contactName", "facilityName", "senderName", "senderTitle"],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-2",
    name: "Demo Invitation",
    type: "demo_invite",
    subject: "Your Personalized PetCare Platform Demo - {{demoDate}}",
    body: `Hi {{contactName}},

I hope this email finds you well! I'm reaching out to schedule a personalized demo of PetCare Platform for {{facilityName}}.

During our {{demoDuration}}-minute session, I'll show you:
✓ How to streamline your booking and check-in process
✓ Client and pet management features
✓ Staff scheduling and task management
✓ Reporting and analytics capabilities
✓ Features specific to your services: {{services}}

Proposed Demo Time: {{demoDate}} at {{demoTime}}

Please confirm if this works for you, or suggest an alternative time that fits your schedule.

Looking forward to connecting!

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform

P.S. The demo will be conducted via {{meetingPlatform}}. I'll send the meeting link once confirmed.`,
    variables: [
      "contactName",
      "facilityName",
      "demoDate",
      "demoTime",
      "demoDuration",
      "services",
      "meetingPlatform",
      "senderName",
      "senderTitle",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-3",
    name: "Post-Demo Follow-up",
    type: "demo_followup",
    subject: "Thank You for Your Time - Next Steps for {{facilityName}}",
    body: `Hi {{contactName}},

Thank you for taking the time to join our demo today! It was great learning more about {{facilityName}} and your goals for improving your pet care operations.

As discussed, here's a summary of what we covered:
{{demoSummary}}

Based on your needs, I recommend the {{recommendedTier}} plan, which includes:
{{tierFeatures}}

Next Steps:
1. Review the attached proposal
2. Let me know if you have any questions
3. When ready, we can start the onboarding process

I've attached the proposal document for your review. The pricing we discussed is valid until {{proposalExpiry}}.

Feel free to reach out if you'd like to discuss anything further or schedule a follow-up call.

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform`,
    variables: [
      "contactName",
      "facilityName",
      "demoSummary",
      "recommendedTier",
      "tierFeatures",
      "proposalExpiry",
      "senderName",
      "senderTitle",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-4",
    name: "Proposal Email",
    type: "proposal",
    subject: "Your PetCare Platform Proposal - {{facilityName}}",
    body: `Hi {{contactName}},

As promised, please find attached our proposal for {{facilityName}}.

Proposal Summary:
- Plan: {{selectedTier}}
- Monthly Investment: {{monthlyPrice}}
- Annual Investment: {{annualPrice}} (Save {{annualSavings}}!)
- Included Modules: {{includedModules}}

What's Included:
{{proposalDetails}}

Special Offer:
{{specialOffer}}

This proposal is valid until {{proposalExpiry}}. To proceed, simply reply to this email or click the link below to start your onboarding:

{{signupLink}}

If you have any questions or would like to discuss the proposal further, I'm happy to schedule a call.

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform`,
    variables: [
      "contactName",
      "facilityName",
      "selectedTier",
      "monthlyPrice",
      "annualPrice",
      "annualSavings",
      "includedModules",
      "proposalDetails",
      "specialOffer",
      "proposalExpiry",
      "signupLink",
      "senderName",
      "senderTitle",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-5",
    name: "General Follow-up",
    type: "followup",
    subject: "Checking In - {{facilityName}} & PetCare Platform",
    body: `Hi {{contactName}},

I wanted to follow up on our recent conversation about PetCare Platform for {{facilityName}}.

I understand you're busy running your facility, so I'll keep this brief. I'm here to help answer any questions you might have or address any concerns.

{{customMessage}}

Would you be available for a quick {{followupDuration}}-minute call this week? I'm flexible and can work around your schedule.

Looking forward to hearing from you!

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform

P.S. {{postscript}}`,
    variables: [
      "contactName",
      "facilityName",
      "customMessage",
      "followupDuration",
      "senderName",
      "senderTitle",
      "postscript",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-6",
    name: "Onboarding Welcome",
    type: "onboarding",
    subject: "Welcome to PetCare Platform! Let's Get You Started 🎉",
    body: `Hi {{contactName}},

Congratulations and welcome to PetCare Platform! We're thrilled to have {{facilityName}} join our family.

Your account has been created and here are your next steps:

1. Access Your Dashboard
   Login URL: {{loginUrl}}
   Username: {{username}}
   (You'll be prompted to set your password on first login)

2. Complete Your Setup
   □ Add your facility information
   □ Configure your services and pricing
   □ Set up staff accounts
   □ Import your client data (we can help!)

3. Schedule Your Training
   Book your onboarding session: {{trainingLink}}

Your dedicated account manager is {{accountManager}}, and they'll be reaching out to schedule your training session.

Helpful Resources:
- Getting Started Guide: {{gettingStartedLink}}
- Video Tutorials: {{tutorialsLink}}
- Help Center: {{helpCenterLink}}

We're here to ensure your success. Don't hesitate to reach out!

Welcome aboard!

{{senderName}}
{{senderTitle}}
PetCare Platform`,
    variables: [
      "contactName",
      "facilityName",
      "loginUrl",
      "username",
      "trainingLink",
      "accountManager",
      "gettingStartedLink",
      "tutorialsLink",
      "helpCenterLink",
      "senderName",
      "senderTitle",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "tpl-7",
    name: "Check-in Email",
    type: "check_in",
    subject: "How's Everything Going with PetCare Platform?",
    body: `Hi {{contactName}},

It's been {{daysSinceOnboarding}} days since {{facilityName}} joined PetCare Platform, and I wanted to check in to see how things are going.

Your Usage Highlights:
{{usageStats}}

I noticed {{observation}}. {{suggestion}}

Do you have any questions or need help with anything? I'm here to ensure you're getting the most out of the platform.

Quick Survey:
On a scale of 1-10, how would you rate your experience so far? Simply reply with your rating!

Best regards,
{{senderName}}
{{senderTitle}}
PetCare Platform`,
    variables: [
      "contactName",
      "facilityName",
      "daysSinceOnboarding",
      "usageStats",
      "observation",
      "suggestion",
      "senderName",
      "senderTitle",
    ],
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find((t) => t.id === id);
}

export function getTemplatesByType(type: EmailTemplateType): EmailTemplate[] {
  return emailTemplates.filter((t) => t.type === type && t.isActive);
}

export function getActiveTemplates(): EmailTemplate[] {
  return emailTemplates.filter((t) => t.isActive);
}

export function renderTemplate(
  template: EmailTemplate,
  values: Record<string, string>,
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  return { subject, body };
}
