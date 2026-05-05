import type { FollowUpProtocol } from "@/types/incidents";

export type { FollowUpProtocol } from "@/types/incidents";

/**
 * Facility-defined follow-up protocols.
 * Each protocol is a reusable procedure that, when triggered by an incident,
 * generates a series of follow-up tasks. Steps are scheduled relative to the
 * incident time and assigned by role so the right person sees them on their
 * daily task list when the time comes.
 */
export const followUpProtocols: FollowUpProtocol[] = [
  {
    id: "proto-injury-standard",
    name: "Standard Injury Follow-Up",
    description:
      "Default protocol for low/medium injuries — same-day notification, 24h check-in, and a 3-day wellness call.",
    severityScopes: ["low", "medium"],
    typeScopes: ["injury", "accident"],
    isDefault: true,
    isActive: true,
    createdBy: "Emma Wilson",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-04-12T15:30:00Z",
    steps: [
      {
        id: "step-injury-1",
        order: 1,
        title: "Notify owner same-day",
        description:
          "Call the owner before pickup to explain what happened and reassure them.",
        instructions:
          "1) Be calm and matter-of-fact.\n2) Lead with the pet's current condition (\"she's resting comfortably\").\n3) Describe what happened in 2 sentences.\n4) Tell them what you did to help.\n5) Invite questions and offer to walk them through the incident report at pickup.",
        daysAfterIncident: 0,
        hoursAfterIncident: 1,
        contactMethod: "phone",
        assigneeRole: "reporter",
        questionsToAsk: [
          "Has your pet had any prior incidents like this?",
          "Are there any concerns we should know about?",
          "Would you like a written incident summary?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
        escalateAfterAttempts: 2,
      },
      {
        id: "step-injury-2",
        order: 2,
        title: "24-hour wellness check-in",
        description:
          "Call to check how the pet is recovering at home and answer any new questions.",
        instructions:
          "Ask open-ended questions. Listen for any signs of complications (lethargy, refusing food, swelling). If anything is concerning, escalate to a manager and recommend a vet visit.",
        daysAfterIncident: 1,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "shift_lead",
        questionsToAsk: [
          "How is your pet doing today?",
          "Are they eating and drinking normally?",
          "Any signs of pain or limping?",
          "Have you noticed anything unusual?",
          "Is there anything you'd like us to do differently next time?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
        escalateAfterAttempts: 2,
      },
      {
        id: "step-injury-3",
        order: 3,
        title: "3-day follow-up — confirm recovery",
        description:
          "Final check-in to confirm full recovery and close the loop with the owner.",
        instructions:
          "Reference the previous conversation. Mention any specific concerns the owner raised earlier. End by thanking them for their patience.",
        daysAfterIncident: 3,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "shift_lead",
        questionsToAsk: [
          "Has your pet fully recovered?",
          "Were you happy with how we handled this?",
          "Anything we can do better?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
    ],
  },
  {
    id: "proto-critical-incident",
    name: "Critical Incident Follow-Up",
    description:
      "Mandatory protocol for high/critical severity — immediate manager-led contact, 12h, 24h, 3-day, 7-day check-ins.",
    severityScopes: ["high", "critical"],
    typeScopes: ["injury", "fight", "escape", "illness"],
    isDefault: true,
    isActive: true,
    createdBy: "Emma Wilson",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-04-20T11:00:00Z",
    steps: [
      {
        id: "step-crit-1",
        order: 1,
        title: "Immediate manager-led call to owner",
        description:
          "Manager personally calls the owner within 30 minutes of the incident.",
        instructions:
          "Manager identifies themselves by name and role. Lead with the pet's current condition. Be transparent — do not minimize. Offer to cover any vet bills if applicable. Document everything the owner says.",
        daysAfterIncident: 0,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "manager",
        questionsToAsk: [
          "Where would you like your pet to receive vet care?",
          "Would you like to come in person now?",
          "Do you authorize emergency vet treatment?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
        escalateAfterAttempts: 1,
      },
      {
        id: "step-crit-2",
        order: 2,
        title: "12-hour status update",
        description: "Update owner with any new information from vet/staff.",
        instructions:
          "Even if there's no news, call. The silence after a critical incident is what damages trust the most.",
        daysAfterIncident: 0,
        hoursAfterIncident: 12,
        contactMethod: "phone",
        assigneeRole: "manager",
        questionsToAsk: [
          "How are you feeling about everything?",
          "Has your pet shown any new symptoms?",
          "What would help you most right now?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
      {
        id: "step-crit-3",
        order: 3,
        title: "24-hour wellness check + written summary",
        description:
          "Send a written incident summary and call to walk through it.",
        instructions:
          "Email/text the written summary first, then call within 30 minutes to walk through it. Confirm they received it and answer any questions.",
        daysAfterIncident: 1,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "manager",
        questionsToAsk: [
          "Did you receive the written summary?",
          "Anything in there that doesn't match your understanding?",
          "How is your pet doing?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
      {
        id: "step-crit-4",
        order: 4,
        title: "3-day recovery check-in",
        description: "Confirm physical and behavioral recovery.",
        instructions:
          "Ask specifically about behavioral changes — fear, anxiety, sleep, appetite. Many issues only surface a few days later.",
        daysAfterIncident: 3,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "manager",
        questionsToAsk: [
          "Any behavioral changes — fear, anxiety, sleep changes?",
          "Is your pet eating normally?",
          "How are YOU doing through all this?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
      {
        id: "step-crit-5",
        order: 5,
        title: "7-day relationship check-in",
        description:
          "Final formal follow-up. Ask about future plans with the facility.",
        instructions:
          "This is where you find out if you've kept the client. Listen carefully — even a 'we're fine' delivered coolly tells you something. Document their stated future plans.",
        daysAfterIncident: 7,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "owner_contact",
        questionsToAsk: [
          "Is there anything still unresolved on your end?",
          "Would you bring your pet back to us?",
          "What would have made this better?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
    ],
  },
  {
    id: "proto-behavioral",
    name: "Behavioral Issue Follow-Up",
    description:
      "For behavioral incidents — pickup conversation, profile update, and 1-week check.",
    severityScopes: ["low", "medium", "high"],
    typeScopes: ["behavioral"],
    isDefault: true,
    isActive: true,
    createdBy: "Emma Wilson",
    createdAt: "2026-02-05T10:30:00Z",
    updatedAt: "2026-02-05T10:30:00Z",
    steps: [
      {
        id: "step-beh-1",
        order: 1,
        title: "Discuss at pickup",
        description:
          "Have an in-person conversation with the owner at pickup.",
        instructions:
          "Privately, away from other clients. Frame this as 'helping us care for your pet better next time'.",
        daysAfterIncident: 0,
        hoursAfterIncident: 0,
        contactMethod: "in_person",
        assigneeRole: "reporter",
        questionsToAsk: [
          "Is this behavior new or familiar?",
          "What works at home to calm them?",
          "Any recent changes — new home, new pet, schedule shifts?",
          "Have they worked with a trainer or behaviorist?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
      {
        id: "step-beh-2",
        order: 2,
        title: "Update pet profile with insights",
        description:
          "Add notes from the owner conversation to the pet's profile.",
        instructions:
          "Capture what triggered it, what calms them, and any care adjustments to make next visit.",
        daysAfterIncident: 0,
        hoursAfterIncident: 4,
        contactMethod: "other",
        assigneeRole: "reporter",
        questionsToAsk: [],
        requiresPhoto: false,
        requiresClientResponse: false,
      },
      {
        id: "step-beh-3",
        order: 3,
        title: "1-week behavioral follow-up",
        description: "Check on the pet's behavior after the visit.",
        instructions:
          "Ask if they've noticed any lingering effects from the visit. This shows the owner you take it seriously.",
        daysAfterIncident: 7,
        hoursAfterIncident: 0,
        contactMethod: "phone",
        assigneeRole: "shift_lead",
        questionsToAsk: [
          "Any lingering effects since the visit?",
          "Is your pet behaving differently at home?",
          "Anything you'd like us to do differently next time?",
        ],
        requiresPhoto: false,
        requiresClientResponse: true,
      },
    ],
  },
  {
    id: "proto-minor-acknowledgement",
    name: "Minor Incident Acknowledgement",
    description:
      "Lightweight protocol for low-severity accidents — single SMS notification.",
    severityScopes: ["low"],
    typeScopes: ["accident", "other"],
    isDefault: false,
    isActive: true,
    createdBy: "Emma Wilson",
    createdAt: "2026-02-15T14:00:00Z",
    updatedAt: "2026-02-15T14:00:00Z",
    steps: [
      {
        id: "step-minor-1",
        order: 1,
        title: "Send SMS to owner",
        description: "Friendly heads-up — no action needed.",
        instructions:
          "Keep it light: '[Pet] had a tiny mishap today (water bowl tipped over!). Everyone's fine, just FYI 😊'",
        daysAfterIncident: 0,
        hoursAfterIncident: 1,
        contactMethod: "sms",
        assigneeRole: "reporter",
        questionsToAsk: [],
        requiresPhoto: false,
        requiresClientResponse: false,
      },
    ],
  },
];

export const getActiveProtocols = (): FollowUpProtocol[] =>
  followUpProtocols.filter((p) => p.isActive);

export const getProtocolById = (id: string): FollowUpProtocol | undefined =>
  followUpProtocols.find((p) => p.id === id);

/**
 * Suggest the best protocols for a given incident severity & type.
 * Returns active protocols whose scopes match, sorted by isDefault first.
 */
export const suggestProtocols = (
  severity: string,
  type: string,
): FollowUpProtocol[] => {
  return followUpProtocols
    .filter(
      (p) =>
        p.isActive &&
        p.severityScopes.includes(
          severity as FollowUpProtocol["severityScopes"][number],
        ) &&
        p.typeScopes.includes(
          type as FollowUpProtocol["typeScopes"][number],
        ),
    )
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
};
