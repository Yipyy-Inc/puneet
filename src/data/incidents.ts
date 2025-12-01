import { clients } from "./clients";

export interface Incident {
  id: string;
  type: "injury" | "illness" | "behavioral" | "accident" | "escape" | "fight" | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  title: string;
  description: string;
  internalNotes: string;
  clientFacingNotes: string;
  
  // Related entities
  petIds: number[];
  petNames: string[];
  staffInvolved: string[];
  reportedBy: string;
  
  // Timestamps
  incidentDate: string;
  reportedDate: string;
  resolvedDate?: string;
  closedDate?: string;
  
  // Evidence
  photos: {
    id: string;
    url: string;
    caption: string;
    isClientVisible: boolean;
  }[];
  
  // Follow-up
  followUpTasks: FollowUpTask[];
  managerNotified: boolean;
  managersNotified: string[];
  
  // Client communication
  clientNotified: boolean;
  clientNotificationDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  closedBy?: string;
}

export interface FollowUpTask {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
  completedDate?: string;
  completedBy?: string;
  notes?: string;
}

export const incidents: Incident[] = [
  {
    id: "INC-001",
    type: "injury",
    severity: "medium",
    status: "resolved",
    title: "Minor scratch during playtime",
    description: "Buddy received a minor scratch on his left front paw during group play. The scratch is superficial and was cleaned immediately with antiseptic.",
    internalNotes: "Incident occurred during outdoor playtime at 2:30 PM. Max (another dog) and Buddy were playing chase when Buddy slipped near the fence. Staff Sarah immediately separated them and examined Buddy. Applied antiseptic spray. Monitor for next 24 hours.",
    clientFacingNotes: "During playtime, Buddy got a small scratch on his paw. We cleaned it right away and he's doing great! No vet visit needed, but we're keeping an eye on it.",
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
    description: "Max vomited twice this morning and is showing signs of lethargy. Refusing food and water.",
    internalNotes: "Max vomited at 8:15 AM and again at 9:30 AM. Appears lethargic and not interested in breakfast. Temperature taken: 102.5°F (slightly elevated). Called owner at 9:45 AM. Owner requested vet visit. Appointment scheduled at City Vet Clinic for 11:00 AM today. Staff Mike to transport.",
    clientFacingNotes: "Max isn't feeling well this morning - he's been sick and not eating. We've scheduled a vet visit for 11 AM and will keep you updated on what the vet says.",
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
        description: "Call owner immediately after vet visit with diagnosis and treatment plan",
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
    description: "Luna was barking excessively during designated quiet time, disturbing other dogs.",
    internalNotes: "Luna barked continuously from 1:00-1:30 PM during naptime. Tried calming techniques: moved to quieter kennel, provided favorite toy, covered kennel partially. Eventually settled after 30 minutes. May be separation anxiety. Recommend noting in profile for future stays.",
    clientFacingNotes: "Luna had a bit of trouble settling down for naptime today. She was vocal for about 30 minutes but we helped her calm down. She did great the rest of the afternoon!",
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
        description: "Add note about separation anxiety during quiet time to Luna's profile",
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
    description: "Altercation between three dogs during outdoor play. Two dogs sustained minor injuries.",
    internalNotes: "At 10:45 AM, Rocky, Duke, and Bear got into a scuffle in the large play yard. Staff Mike and Sarah intervened immediately. Rocky has a small bite mark on ear (bleeding stopped). Duke has scratches on shoulder. Bear appears uninjured but shaken. All three separated and examined. Rocky's owner contacted - coming to pick up early. Duke's owner notified - approved monitoring here. Vet clearance obtained for Duke via phone consult. Reviewing play group assignments - these three should not be grouped together in future.",
    clientFacingNotes: "We had an incident during playtime where Rocky got into a scuffle with two other dogs. Rocky has a small injury on his ear that we treated. We'd like you to pick him up early today so you can monitor him at home. We're very sorry this happened.",
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
        description: "Ensure Rocky, Duke, and Bear are never in the same play group",
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
    internalNotes: "Bella knocked over her water bowl at around 3:00 PM. Bedding and floor area wet. Cleaned up spill, replaced bedding with fresh dry bedding, refilled water bowl and secured it properly. Bella unharmed, just clumsy!",
    clientFacingNotes: "Just a heads up - Bella had a little accident with her water bowl today! Everything is cleaned up and she has fresh bedding. She's doing great!",
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
];

// Statistics
export const getIncidentStats = () => {
  const total = incidents.length;
  const open = incidents.filter((i) => i.status === "open").length;
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const thisMonth = incidents.filter((i) => {
    const date = new Date(i.incidentDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return { total, open, critical, thisMonth };
};

// Get incidents by pet
export const getIncidentsByPet = (petId: number): Incident[] => {
  return incidents.filter((incident) => incident.petIds.includes(petId));
};

// Get incidents by severity
export const getIncidentsBySeverity = (severity: string): Incident[] => {
  return incidents.filter((incident) => incident.severity === severity);
};

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

