import { facilities } from "@/data/facilities";
import type {
  SupportCallHandler,
  SupportCallLogEntry,
} from "@/types/support-call";
import type { FollowUpStatus } from "@/types/communications";
import type {
  SupportCallDirection,
  SupportCallLogStatus,
  SupportDepartment,
} from "@/types/support-call";

// Seed history for the admin Call Log (calls to/from the Yipyy support number).
// minutesAgo offsets are resolved against "now" on the client so the date
// groups and time filters stay meaningful instead of drifting into the past.
// Recognized callers reuse real facility contact numbers; the rest are unknown.

interface CallSeed {
  id: string;
  direction: SupportCallDirection;
  /** Resolve the caller number from a real facility… */
  facilityId?: number;
  /** …or an unrecognized external number. */
  callerNumber?: string;
  status: SupportCallLogStatus;
  department: SupportDepartment;
  durationSeconds: number;
  /** Agent name, "ai", or null (missed). */
  handler: string | "ai" | null;
  team: "Team 1" | "Team 2";
  minutesAgo: number;
  followUpStatus: FollowUpStatus;
  assignedTo: string | null;
  tags: string[];
}

const SEED: CallSeed[] = [
  {
    id: "scl-001",
    direction: "inbound",
    facilityId: 1,
    status: "completed",
    department: "technical",
    durationSeconds: 322,
    handler: "Michael Chen",
    team: "Team 1",
    minutesAgo: 25,
    followUpStatus: "no_action",
    assignedTo: "Michael Chen",
    tags: ["tag-general"],
  },
  {
    id: "scl-002",
    direction: "inbound",
    facilityId: 3,
    status: "missed",
    department: "billing",
    durationSeconds: 0,
    handler: null,
    team: "Team 1",
    minutesAgo: 55,
    followUpStatus: "pending",
    assignedTo: null,
    tags: ["tag-billing"],
  },
  {
    id: "scl-003",
    direction: "outbound",
    facilityId: 3,
    status: "completed",
    department: "billing",
    durationSeconds: 244,
    handler: "Sarah Johnson",
    team: "Team 2",
    minutesAgo: 80,
    followUpStatus: "completed",
    assignedTo: "Sarah Johnson",
    tags: ["tag-billing"],
  },
  {
    id: "scl-004",
    direction: "inbound",
    facilityId: 5,
    status: "voicemail",
    department: "technical",
    durationSeconds: 35,
    handler: null,
    team: "Team 1",
    minutesAgo: 140,
    followUpStatus: "pending",
    assignedTo: null,
    tags: [],
  },
  {
    id: "scl-005",
    direction: "inbound",
    facilityId: 2,
    status: "completed",
    department: "technical",
    durationSeconds: 410,
    handler: "ai",
    team: "Team 2",
    minutesAgo: 200,
    followUpStatus: "no_action",
    assignedTo: null,
    tags: ["tag-general"],
  },
  {
    id: "scl-006",
    direction: "inbound",
    facilityId: 7,
    status: "completed",
    department: "general",
    durationSeconds: 150,
    handler: "Emily Davis",
    team: "Team 1",
    minutesAgo: 300,
    followUpStatus: "scheduled",
    assignedTo: "Emily Davis",
    tags: ["tag-booking"],
  },
  {
    id: "scl-007",
    direction: "inbound",
    callerNumber: "(604) 555-0199",
    status: "missed",
    department: "general",
    durationSeconds: 0,
    handler: null,
    team: "Team 2",
    minutesAgo: 360,
    followUpStatus: "pending",
    assignedTo: null,
    tags: [],
  },
  {
    id: "scl-008",
    direction: "inbound",
    facilityId: 9,
    status: "completed",
    department: "billing",
    durationSeconds: 521,
    handler: "Robert Wilson",
    team: "Team 1",
    minutesAgo: 480,
    followUpStatus: "no_action",
    assignedTo: "Robert Wilson",
    tags: ["tag-billing", "tag-complaint"],
  },
  {
    id: "scl-009",
    direction: "outbound",
    facilityId: 4,
    status: "completed",
    department: "technical",
    durationSeconds: 183,
    handler: "Michael Chen",
    team: "Team 2",
    minutesAgo: 1500,
    followUpStatus: "completed",
    assignedTo: "Michael Chen",
    tags: ["tag-general"],
  },
  {
    id: "scl-010",
    direction: "inbound",
    facilityId: 6,
    status: "voicemail",
    department: "general",
    durationSeconds: 28,
    handler: null,
    team: "Team 1",
    minutesAgo: 1620,
    followUpStatus: "pending",
    assignedTo: null,
    tags: [],
  },
  {
    id: "scl-011",
    direction: "inbound",
    facilityId: 8,
    status: "completed",
    department: "general",
    durationSeconds: 95,
    handler: "ai",
    team: "Team 2",
    minutesAgo: 1700,
    followUpStatus: "no_action",
    assignedTo: null,
    tags: ["tag-general"],
  },
  {
    id: "scl-012",
    direction: "inbound",
    facilityId: 10,
    status: "missed",
    department: "technical",
    durationSeconds: 0,
    handler: null,
    team: "Team 1",
    minutesAgo: 2900,
    followUpStatus: "completed",
    assignedTo: "Lisa Martinez",
    tags: [],
  },
  {
    id: "scl-013",
    direction: "outbound",
    facilityId: 1,
    status: "completed",
    department: "billing",
    durationSeconds: 300,
    handler: "Sarah Johnson",
    team: "Team 2",
    minutesAgo: 3000,
    followUpStatus: "no_action",
    assignedTo: "Sarah Johnson",
    tags: ["tag-billing"],
  },
  {
    id: "scl-014",
    direction: "inbound",
    facilityId: 2,
    status: "completed",
    department: "technical",
    durationSeconds: 262,
    handler: "Lisa Martinez",
    team: "Team 1",
    minutesAgo: 4320,
    followUpStatus: "no_action",
    assignedTo: "Lisa Martinez",
    tags: ["tag-general"],
  },
  {
    id: "scl-015",
    direction: "inbound",
    callerNumber: "(312) 555-0188",
    status: "voicemail",
    department: "general",
    durationSeconds: 42,
    handler: null,
    team: "Team 2",
    minutesAgo: 5760,
    followUpStatus: "pending",
    assignedTo: null,
    tags: [],
  },
  {
    id: "scl-016",
    direction: "inbound",
    facilityId: 5,
    status: "completed",
    department: "billing",
    durationSeconds: 360,
    handler: "ai",
    team: "Team 1",
    minutesAgo: 7200,
    followUpStatus: "no_action",
    assignedTo: null,
    tags: ["tag-billing"],
  },
];

function facilityPhone(facilityId: number): string {
  const f = facilities.find((x) => x.id === facilityId) as
    | { contact?: { phone?: string }; owner?: { phone?: string } }
    | undefined;
  return f?.contact?.phone ?? f?.owner?.phone ?? "";
}

function toHandler(handler: CallSeed["handler"]): SupportCallHandler | null {
  if (handler === null) return null;
  if (handler === "ai") return { kind: "ai", name: "AI Assistant" };
  return { kind: "agent", name: handler };
}

export function buildSupportCallLog(nowMs: number): SupportCallLogEntry[] {
  return SEED.map((s) => ({
    id: s.id,
    direction: s.direction,
    callerNumber:
      s.callerNumber ??
      (s.facilityId != null ? facilityPhone(s.facilityId) : ""),
    status: s.status,
    department: s.department,
    durationSeconds: s.durationSeconds,
    handledBy: toHandler(s.handler),
    team: s.team,
    at: new Date(nowMs - s.minutesAgo * 60_000).toISOString(),
    followUpStatus: s.followUpStatus,
    assignedTo: s.assignedTo,
    tags: s.tags,
    notes: "",
  })).sort((a, b) => (a.at < b.at ? 1 : -1));
}
