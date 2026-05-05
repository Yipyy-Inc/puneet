// Types re-exported from @/types/incidents (single source of truth)
export type { Incident, FollowUpTask } from "@/types/incidents";
import type { Incident, FollowUpTask } from "@/types/incidents";

export const incidents: Incident[] = [
  {
    id: "INC-001",
    type: "injury",
    severity: "medium",
    status: "resolved",
    title: "Minor scratch during playtime",
    description:
      "Buddy received a minor scratch on his left front paw during group play. The scratch is superficial and was cleaned immediately with antiseptic.",
    internalNotes:
      "Incident occurred during outdoor playtime at 2:30 PM. Max (another dog) and Buddy were playing chase when Buddy slipped near the fence. Staff Sarah immediately separated them and examined Buddy. Applied antiseptic spray. Monitor for next 24 hours.",
    clientFacingNotes:
      "During playtime, Buddy got a small scratch on his paw. We cleaned it right away and he's doing great! No vet visit needed, but we're keeping an eye on it.",
    petIds: [1],
    petNames: ["Buddy"],
    staffInvolved: ["Sarah Johnson", "Mike Davis"],
    reportedBy: "Sarah Johnson",
    incidentDate: "2024-02-21T14:30:00Z",
    reportedDate: "2024-02-21T14:45:00Z",
    resolvedDate: "2024-02-21T16:00:00Z",
    photos: [
      {
        id: "photo-001",
        url: "/images/incidents/scratch-001.jpg",
        caption: "Scratch on left front paw - cleaned with antiseptic",
        isClientVisible: true,
      },
    ],
    followUpTasks: [
      {
        id: "task-001",
        incidentId: "INC-001",
        title: "Monitor scratch healing",
        description: "Check paw condition during each shift for next 24 hours",
        assignedTo: "Sarah Johnson",
        dueDate: "2024-02-22T14:30:00Z",
        status: "completed",
        completedDate: "2024-02-22T10:00:00Z",
        completedBy: "Sarah Johnson",
        notes: "Scratch healing well, no signs of infection",
      },
    ],
    managerNotified: true,
    managersNotified: ["Emma Wilson - Manager"],
    clientNotified: true,
    clientNotificationDate: "2024-02-21T15:00:00Z",
    createdAt: "2024-02-21T14:45:00Z",
    updatedAt: "2024-02-22T10:00:00Z",
    closedBy: "Emma Wilson",
  },
  {
    id: "INC-002",
    type: "illness",
    severity: "high",
    status: "investigating",
    title: "Vomiting and lethargy",
    description:
      "Max vomited twice this morning and is showing signs of lethargy. Refusing food and water.",
    internalNotes:
      "Max vomited at 8:15 AM and again at 9:30 AM. Appears lethargic and not interested in breakfast. Temperature taken: 102.5°F (slightly elevated). Called owner at 9:45 AM. Owner requested vet visit. Appointment scheduled at City Vet Clinic for 11:00 AM today. Staff Mike to transport.",
    clientFacingNotes:
      "Max isn't feeling well this morning - he's been sick and not eating. We've scheduled a vet visit for 11 AM and will keep you updated on what the vet says.",
    petIds: [2],
    petNames: ["Max"],
    staffInvolved: ["Emily Brown", "Mike Davis"],
    reportedBy: "Emily Brown",
    incidentDate: "2024-02-22T08:15:00Z",
    reportedDate: "2024-02-22T09:45:00Z",
    photos: [],
    followUpTasks: [
      {
        id: "task-002",
        incidentId: "INC-002",
        title: "Transport to vet",
        description: "Take Max to City Vet Clinic appointment at 11:00 AM",
        assignedTo: "Mike Davis",
        dueDate: "2024-02-22T11:00:00Z",
        status: "in_progress",
      },
      {
        id: "task-003",
        incidentId: "INC-002",
        title: "Update owner with vet results",
        description:
          "Call owner immediately after vet visit with diagnosis and treatment plan",
        assignedTo: "Emily Brown",
        dueDate: "2024-02-22T13:00:00Z",
        status: "pending",
      },
    ],
    managerNotified: true,
    managersNotified: ["Emma Wilson - Manager"],
    clientNotified: true,
    clientNotificationDate: "2024-02-22T09:45:00Z",
    createdAt: "2024-02-22T09:45:00Z",
    updatedAt: "2024-02-22T10:30:00Z",
  },
  {
    id: "INC-003",
    type: "behavioral",
    severity: "low",
    status: "closed",
    title: "Excessive barking during naptime",
    description:
      "Luna was barking excessively during designated quiet time, disturbing other dogs.",
    internalNotes:
      "Luna barked continuously from 1:00-1:30 PM during naptime. Tried calming techniques: moved to quieter kennel, provided favorite toy, covered kennel partially. Eventually settled after 30 minutes. May be separation anxiety. Recommend noting in profile for future stays.",
    clientFacingNotes:
      "Luna had a bit of trouble settling down for naptime today. She was vocal for about 30 minutes but we helped her calm down. She did great the rest of the afternoon!",
    petIds: [3],
    petNames: ["Luna"],
    staffInvolved: ["Sarah Johnson"],
    reportedBy: "Sarah Johnson",
    incidentDate: "2024-02-20T13:00:00Z",
    reportedDate: "2024-02-20T13:45:00Z",
    resolvedDate: "2024-02-20T14:30:00Z",
    closedDate: "2024-02-21T09:00:00Z",
    photos: [],
    followUpTasks: [
      {
        id: "task-004",
        incidentId: "INC-003",
        title: "Update pet profile with behavior note",
        description:
          "Add note about separation anxiety during quiet time to Luna's profile",
        assignedTo: "Sarah Johnson",
        dueDate: "2024-02-21T12:00:00Z",
        status: "completed",
        completedDate: "2024-02-21T09:15:00Z",
        completedBy: "Sarah Johnson",
        notes: "Added to behavioral notes in profile",
      },
    ],
    managerNotified: false,
    managersNotified: [],
    clientNotified: true,
    clientNotificationDate: "2024-02-20T17:00:00Z",
    createdAt: "2024-02-20T13:45:00Z",
    updatedAt: "2024-02-21T09:15:00Z",
    closedBy: "Sarah Johnson",
  },
  {
    id: "INC-004",
    type: "fight",
    severity: "critical",
    status: "open",
    title: "Dog altercation - multiple dogs involved",
    description:
      "Altercation between three dogs during outdoor play. Two dogs sustained minor injuries.",
    internalNotes:
      "At 10:45 AM, Rocky, Duke, and Bear got into a scuffle in the large play yard. Staff Mike and Sarah intervened immediately. Rocky has a small bite mark on ear (bleeding stopped). Duke has scratches on shoulder. Bear appears uninjured but shaken. All three separated and examined. Rocky's owner contacted - coming to pick up early. Duke's owner notified - approved monitoring here. Vet clearance obtained for Duke via phone consult. Reviewing play group assignments - these three should not be grouped together in future.",
    clientFacingNotes:
      "We had an incident during playtime where Rocky got into a scuffle with two other dogs. Rocky has a small injury on his ear that we treated. We'd like you to pick him up early today so you can monitor him at home. We're very sorry this happened.",
    petIds: [10, 11, 12],
    petNames: ["Rocky", "Duke", "Bear"],
    staffInvolved: ["Mike Davis", "Sarah Johnson", "Emily Brown"],
    reportedBy: "Mike Davis",
    incidentDate: "2024-02-22T10:45:00Z",
    reportedDate: "2024-02-22T11:00:00Z",
    photos: [
      {
        id: "photo-002",
        url: "/images/incidents/bite-001.jpg",
        caption: "Rocky - bite mark on right ear",
        isClientVisible: false,
      },
      {
        id: "photo-003",
        url: "/images/incidents/scratch-002.jpg",
        caption: "Duke - scratches on shoulder",
        isClientVisible: false,
      },
    ],
    followUpTasks: [
      {
        id: "task-005",
        incidentId: "INC-004",
        title: "Immediate: Contact Rocky's owner for early pickup",
        description: "Call owner, explain situation, arrange immediate pickup",
        assignedTo: "Mike Davis",
        dueDate: "2024-02-22T11:30:00Z",
        status: "completed",
        completedDate: "2024-02-22T11:15:00Z",
        completedBy: "Mike Davis",
        notes: "Owner on the way - ETA 30 minutes",
      },
      {
        id: "task-006",
        incidentId: "INC-004",
        title: "Review and update play group assignments",
        description:
          "Ensure Rocky, Duke, and Bear are never in the same play group",
        assignedTo: "Emma Wilson",
        dueDate: "2024-02-22T17:00:00Z",
        status: "pending",
      },
      {
        id: "task-007",
        incidentId: "INC-004",
        title: "Follow-up with all three owners in 24 hours",
        description: "Check on all three dogs' condition and wellbeing at home",
        assignedTo: "Sarah Johnson",
        dueDate: "2024-02-23T11:00:00Z",
        status: "pending",
      },
    ],
    managerNotified: true,
    managersNotified: ["Emma Wilson - Manager", "John Smith - Owner"],
    clientNotified: true,
    clientNotificationDate: "2024-02-22T11:15:00Z",
    createdAt: "2024-02-22T11:00:00Z",
    updatedAt: "2024-02-22T11:30:00Z",
  },
  {
    id: "INC-005",
    type: "accident",
    severity: "low",
    status: "closed",
    title: "Spilled water bowl",
    description: "Water bowl knocked over in kennel, bedding got wet.",
    internalNotes:
      "Bella knocked over her water bowl at around 3:00 PM. Bedding and floor area wet. Cleaned up spill, replaced bedding with fresh dry bedding, refilled water bowl and secured it properly. Bella unharmed, just clumsy!",
    clientFacingNotes:
      "Just a heads up - Bella had a little accident with her water bowl today! Everything is cleaned up and she has fresh bedding. She's doing great!",
    petIds: [4],
    petNames: ["Bella"],
    staffInvolved: ["Emily Brown"],
    reportedBy: "Emily Brown",
    incidentDate: "2024-02-21T15:00:00Z",
    reportedDate: "2024-02-21T15:15:00Z",
    resolvedDate: "2024-02-21T15:30:00Z",
    closedDate: "2024-02-21T15:30:00Z",
    photos: [],
    followUpTasks: [],
    managerNotified: false,
    managersNotified: [],
    clientNotified: false,
    createdAt: "2024-02-21T15:15:00Z",
    updatedAt: "2024-02-21T15:30:00Z",
    closedBy: "Emily Brown",
  },
  {
    id: "INC-006",
    type: "fight",
    severity: "high",
    status: "open",
    title: "Altercation during group play — Buddy vs. Cooper",
    description:
      "Buddy got into an altercation with Cooper during the afternoon group play session. Buddy initiated with growling and then snapped. Cooper sustained a small scratch near his right eye. Both dogs were immediately separated and examined.",
    internalNotes:
      "Incident occurred at 14:20 in the outdoor play yard (South section). Staff Sarah and Mike were present and intervened within 30 seconds. Buddy had been showing escalating stress signals (stiff tail, hard stare) for ~5 minutes prior but the situation escalated quickly. Cooper has a superficial scratch near right eye — cleaned with antiseptic, no vet visit needed at this time. Buddy placed in isolated kennel for the remainder of the day. Recommend separating these two dogs for future group play sessions.",
    clientFacingNotes:
      "We want to let you know that Buddy had a scuffle with another dog during afternoon group play today. It was brief and our staff intervened immediately. Buddy is doing well and has been resting comfortably in his kennel. We'd love to chat with you when you come for pick-up to go over what happened.",
    petIds: [1, 5],
    petNames: ["Buddy", "Cooper"],
    staffInvolved: ["Sarah Johnson", "Mike Davis"],
    reportedBy: "Sarah Johnson",
    incidentDate: "2026-04-28T12:20:00Z",
    reportedDate: "2026-04-28T12:35:00Z",
    photos: [
      {
        id: "photo-inc006-01",
        url: "/images/incidents/inc006-buddy.jpg",
        caption: "Buddy shortly after separation — calm but tense",
        isClientVisible: false,
      },
      {
        id: "photo-inc006-02",
        url: "/images/incidents/inc006-cooper-eye.jpg",
        caption: "Cooper — superficial scratch near right eye",
        isClientVisible: true,
      },
    ],
    followUpTasks: [
      {
        id: "task-inc006-01",
        incidentId: "INC-006",
        title: "Notify Buddy's owner — same-day call",
        description:
          "Call owner to explain the incident and what steps we are taking. Offer to provide written summary on pickup.",
        assignedTo: "Mike Davis",
        dueDate: "2026-04-28T13:35:00Z",
        status: "completed",
        completedDate: "2026-04-28T13:42:00Z",
        completedBy: "Mike Davis",
        protocolId: "proto-critical-incident",
        protocolStepId: "step-crit-1",
        protocolName: "Critical Incident Follow-Up",
        stepOrder: 1,
        contactMethod: "phone",
        instructions:
          "Be calm, lead with the pet's current condition, then describe what happened.",
        questionsToAsk: [
          "Has your pet had any prior incidents like this?",
          "Are there any concerns we should know about?",
        ],
        attemptCount: 1,
        escalated: false,
        scheduledFor: "2026-04-28T13:35:00Z",
        surfacedToDailyTasks: true,
        conversationLog: [
          {
            id: "conv-inc006-01",
            loggedAt: "2026-04-28T13:42:00Z",
            loggedBy: "Mike Davis",
            contactMethod: "phone",
            reachedClient: true,
            summary:
              "Owner appreciative we called fast — wants written summary at pickup, no vet needed yet.",
            customerStatement:
              "She thanked us for letting her know right away. Said Buddy can be reactive when he's overstimulated and that this isn't the first time at a daycare. Asked if Cooper was OK and if we'd be charging her for anything extra.",
            staffResponse:
              "Confirmed Cooper is fine — only a superficial scratch. Reassured her there's no extra charge. Promised written incident summary will be ready at pickup tomorrow.",
            sentiment: "concerned",
            topics: ["reactivity history", "pickup", "written summary"],
            customerRequests:
              "Would like a written summary ready at pickup. Wants to chat with manager Emma briefly.",
            nextSteps:
              "Have written summary printed and ready. Notify Emma to be available for pickup.",
            durationMinutes: 12,
          },
        ],
      },
      {
        id: "task-inc006-02",
        incidentId: "INC-006",
        title: "12-hour status update call",
        description: "Update owner with any new info; confirm Buddy is settled.",
        assignedTo: "Emma Wilson",
        dueDate: "2026-04-29T00:20:00Z",
        status: "completed",
        completedDate: "2026-04-29T01:05:00Z",
        completedBy: "Emma Wilson",
        protocolId: "proto-critical-incident",
        protocolStepId: "step-crit-2",
        protocolName: "Critical Incident Follow-Up",
        stepOrder: 2,
        contactMethod: "phone",
        instructions:
          "Even if there's no news, call. Silence after a critical incident is what damages trust.",
        questionsToAsk: [
          "How are you feeling about everything?",
          "Has your pet shown any new symptoms?",
        ],
        attemptCount: 1,
        escalated: false,
        scheduledFor: "2026-04-29T00:20:00Z",
        surfacedToDailyTasks: true,
        conversationLog: [
          {
            id: "conv-inc006-02",
            loggedAt: "2026-04-29T01:05:00Z",
            loggedBy: "Emma Wilson",
            contactMethod: "phone",
            reachedClient: true,
            summary:
              "Owner calmer — Buddy settled overnight. Confirmed pickup tomorrow at 4pm. Wants Emma there.",
            customerStatement:
              "Said she felt better after Mike's call earlier. Buddy slept fine in his kennel per our update. She is still anxious about reintroducing him to group play in future stays. Mentioned her vet recommended a behaviorist last year but she didn't follow through.",
            staffResponse:
              "Suggested we set up a 1-on-1 daycare arrangement for his next visit so he doesn't have to go into group play. Offered to share a behaviorist contact list.",
            sentiment: "neutral",
            topics: [
              "pickup",
              "future visits",
              "behaviorist referral",
              "1-on-1 daycare",
            ],
            customerRequests:
              "Email her the behaviorist contact list. Reserve a 1-on-1 slot for next visit.",
            nextSteps:
              "Email behaviorist list before pickup. Flag Buddy's profile: 1-on-1 only going forward.",
            durationMinutes: 8,
          },
        ],
      },
      {
        id: "task-inc006-03",
        incidentId: "INC-006",
        title: "24-hour wellness check + written summary handoff",
        description:
          "Walk owner through the written incident report at pickup; confirm next-visit arrangements.",
        assignedTo: "Emma Wilson",
        dueDate: "2026-04-29T20:00:00Z",
        status: "pending",
        protocolId: "proto-critical-incident",
        protocolStepId: "step-crit-3",
        protocolName: "Critical Incident Follow-Up",
        stepOrder: 3,
        contactMethod: "in_person",
        instructions:
          "In-person at pickup. Hand over the printed summary and walk through it. Confirm the 1-on-1 arrangement for next visit and that the behaviorist email landed.",
        questionsToAsk: [
          "Did you receive the behaviorist email?",
          "Anything in the summary that doesn't match your understanding?",
          "How is Buddy doing today?",
        ],
        attemptCount: 0,
        escalated: false,
        scheduledFor: "2026-04-29T20:00:00Z",
        surfacedToDailyTasks: true,
        conversationLog: [],
      },
      {
        id: "task-inc006-04",
        incidentId: "INC-006",
        title: "3-day recovery check-in call",
        description:
          "Confirm physical and behavioral recovery — ask about behavioral changes specifically.",
        assignedTo: "Emma Wilson",
        dueDate: "2026-05-01T12:20:00Z",
        status: "pending",
        protocolId: "proto-critical-incident",
        protocolStepId: "step-crit-4",
        protocolName: "Critical Incident Follow-Up",
        stepOrder: 4,
        contactMethod: "phone",
        instructions:
          "Ask specifically about behavioral changes — fear, anxiety, sleep, appetite. Many issues only surface a few days later.",
        questionsToAsk: [
          "Any behavioral changes — fear, anxiety, sleep changes?",
          "Is your pet eating normally?",
          "How are YOU doing through all this?",
        ],
        attemptCount: 0,
        escalated: false,
        scheduledFor: "2026-05-01T12:20:00Z",
        surfacedToDailyTasks: true,
        conversationLog: [],
      },
    ],
    managerNotified: true,
    managersNotified: ["Emma Wilson - Manager"],
    clientNotified: false,
    createdAt: "2026-04-28T12:35:00Z",
    updatedAt: "2026-04-28T12:35:00Z",
    boardingGuestId: "buddy-001",
    reservationId: "RES-001",
  },
];

// Statistics
export const getIncidentStats = () => {
  const total = incidents.length;
  const open = incidents.filter((i) => i.status === "open").length;
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const thisMonth = incidents.filter((i) => {
    const date = new Date(i.incidentDate);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  return { total, open, critical, thisMonth };
};

// Get incidents linked to a boarding guest
export const getIncidentsForGuest = (boardingGuestId: string): Incident[] =>
  incidents.filter((i) => i.boardingGuestId === boardingGuestId);

// Get pending follow-up tasks
export const getPendingFollowUpTasks = (): FollowUpTask[] => {
  const allTasks: FollowUpTask[] = [];
  incidents.forEach((incident) => {
    incident.followUpTasks.forEach((task) => {
      if (task.status !== "completed") {
        allTasks.push(task);
      }
    });
  });
  return allTasks;
};
