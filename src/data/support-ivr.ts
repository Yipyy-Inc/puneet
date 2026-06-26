import type { IVRDestination, SupportIvrConfig } from "@/types/support-ivr";

export const DESTINATIONS: { value: IVRDestination; label: string }[] = [
  { value: "route_staff", label: "Route to Staff" },
  { value: "route_department", label: "Route to Department" },
  { value: "send_sms", label: "Send SMS Link" },
  { value: "play_recording", label: "Play Recording" },
];

export const HOLD_MUSIC_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No music (silence)" },
  { value: "ambient", label: "Ambient — calm background" },
  { value: "jazz", label: "Jazz — smooth" },
  { value: "classical", label: "Classical — elegant" },
  { value: "upbeat", label: "Upbeat — energetic" },
];

export const defaultSupportIvrConfig: SupportIvrConfig = {
  enabled: true,
  greeting:
    "Thank you for calling Yipyy Support. Your call is important to us. Please listen carefully as our menu options have recently changed.",
  afterHoursMessage:
    "Thanks for calling Yipyy Support. Our team is available Monday to Friday, 9am to 6pm ET. Please leave a message or email support@yipyy.com and we'll get back to you shortly.",
  holdMusic: "ambient",
  menu: [
    {
      id: "opt-1",
      key: "1",
      label: "Technical Support",
      destination: "route_department",
      target: "Technical Team",
    },
    {
      id: "opt-2",
      key: "2",
      label: "Billing & Payments",
      destination: "route_department",
      target: "Finance Team",
    },
    {
      id: "opt-3",
      key: "3",
      label: "Account & Onboarding",
      destination: "route_department",
      target: "Onboarding Team",
    },
    {
      id: "opt-4",
      key: "4",
      label: "Feature Requests",
      destination: "route_department",
      target: "Product Team",
    },
    {
      id: "opt-0",
      key: "0",
      label: "Speak with an Agent",
      destination: "route_staff",
      target: "Available Agent",
    },
  ],
  rules: [
    {
      id: "rule-1",
      name: "VIP Escalation",
      condition: "Client tag includes VIP → Route to Management",
      enabled: true,
    },
    {
      id: "rule-2",
      name: "Overdue Account",
      condition: "Account has an overdue invoice → Route to Finance Team",
      enabled: true,
    },
    {
      id: "rule-3",
      name: "Trial Facility",
      condition: "Facility on an active trial → Route to Onboarding Team",
      enabled: true,
    },
    {
      id: "rule-4",
      name: "After-Hours Callback",
      condition:
        "Call received outside business hours → Send SMS callback link",
      enabled: false,
    },
  ],
};
