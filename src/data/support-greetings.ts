import type { VoicemailGreeting } from "@/types/calling";

// Voicemail greetings for the Yipyy support line (reuses the VoicemailGreeting
// shape). The Main Greeting (default) is the auto-managed one that plays during
// business hours; the others are switched in for after-hours, holidays, and
// temporary closures.

export const supportGreetings: VoicemailGreeting[] = [
  {
    id: "sg-default",
    type: "default",
    name: "Main Greeting",
    transcription:
      "Thanks for calling Yipyy Support. All of our specialists are currently helping other facilities. Please leave your facility name, number, and a brief description of the issue, and we'll get back to you as soon as possible.",
    isActive: true,
    lastUpdated: "2026-05-02T10:00:00Z",
  },
  {
    id: "sg-after-hours",
    type: "after_hours",
    name: "After Hours",
    transcription:
      "You've reached Yipyy Support outside our business hours. Our team is available Monday to Friday, 9 AM to 6 PM Eastern. Please leave a message and we'll return your call the next business day. For urgent platform outages, press 1.",
    isActive: false,
    lastUpdated: "2026-04-18T09:00:00Z",
  },
  {
    id: "sg-holiday",
    type: "holiday",
    name: "Holiday Season",
    transcription:
      "Happy holidays from the Yipyy team! We're operating with limited support hours during the holiday period. Please leave a message and we'll get back to you, or check status.yipyy.com for live updates.",
    isActive: false,
    lastUpdated: "2025-12-20T08:00:00Z",
  },
  {
    id: "sg-temporary",
    type: "temporary",
    name: "Temporary Closure",
    transcription:
      "Yipyy Support is briefly offline for scheduled maintenance. We expect to be back shortly. For critical issues, please email urgent@yipyy.com and we'll prioritize your request.",
    isActive: false,
    lastUpdated: "2026-03-01T07:00:00Z",
  },
];
