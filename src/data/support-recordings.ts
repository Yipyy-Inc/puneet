import { facilities } from "@/data/facilities";
import type {
  RecordingFlagReason,
  SupportRecording,
} from "@/types/support-call";

// Seed recordings of calls on the Yipyy support line. minutesAgo offsets
// resolve against "now" on the client. Recognized callers reuse real facility
// contact numbers. Flagged rows carry transcripts/sentiment consistent with the
// AI flag reason (shouldAutoFlag: sentiment <= 4 OR a complaint keyword), so the
// "Needs Review" section reads coherently.

interface RecordingSeed {
  id: string;
  agentId: number;
  agentName: string;
  facilityId?: number;
  callerNumber?: string;
  durationSeconds: number;
  qaScore: number | null;
  flagged: boolean;
  flagReason: RecordingFlagReason | null;
  sentimentScore: number;
  transcript: string;
  minutesAgo: number;
}

const SEED: RecordingSeed[] = [
  {
    id: "rec-001",
    agentId: 3,
    agentName: "Michael Chen",
    facilityId: 1,
    durationSeconds: 322,
    qaScore: 4.5,
    flagged: false,
    flagReason: null,
    sentimentScore: 8.2,
    transcript:
      "Walked the facility through re-enabling the booking widget after the morning outage. Confirmed it was loading again on their end and the client sounded relieved and satisfied by the end of the call.",
    minutesAgo: 25,
  },
  {
    id: "rec-002",
    agentId: 2,
    agentName: "Sarah Johnson",
    facilityId: 3,
    durationSeconds: 244,
    qaScore: null,
    flagged: false,
    flagReason: null,
    sentimentScore: 6.5,
    transcript:
      "Reviewed the duplicate charge on last month's invoice. Explained the reversal timeline and promised a corrected invoice by end of day.",
    minutesAgo: 80,
  },
  {
    id: "rec-003",
    agentId: 4,
    agentName: "Emily Davis",
    facilityId: 5,
    durationSeconds: 410,
    qaScore: 2,
    flagged: true,
    flagReason: "low_sentiment",
    sentimentScore: 3.2,
    transcript:
      "The caller was clearly frustrated about repeated outages this week and felt the issue wasn't being taken seriously. Tone stayed tense throughout the call.",
    minutesAgo: 200,
  },
  {
    id: "rec-004",
    agentId: 1,
    agentName: "John Smith",
    facilityId: 2,
    durationSeconds: 150,
    qaScore: 5,
    flagged: false,
    flagReason: null,
    sentimentScore: 9,
    transcript:
      "Quick, friendly walkthrough on adding a second location to their account. Caller was very positive and thanked us for the help.",
    minutesAgo: 300,
  },
  {
    id: "rec-005",
    agentId: 5,
    agentName: "Robert Wilson",
    facilityId: 9,
    durationSeconds: 521,
    qaScore: 3.5,
    flagged: false,
    flagReason: null,
    sentimentScore: 5,
    transcript:
      "Answered a detailed billing question about transaction fees across tiers. Neutral tone; caller wanted to think it over before deciding.",
    minutesAgo: 480,
  },
  {
    id: "rec-006",
    agentId: 3,
    agentName: "Michael Chen",
    facilityId: 4,
    durationSeconds: 280,
    qaScore: null,
    flagged: true,
    flagReason: "low_sentiment",
    sentimentScore: 2.8,
    transcript:
      "Staff couldn't clock in after the update and it was affecting their whole team. The agent struggled to find a fix and the caller grew increasingly impatient.",
    minutesAgo: 600,
  },
  {
    id: "rec-007",
    agentId: 6,
    agentName: "Lisa Martinez",
    callerNumber: "(604) 555-0142",
    durationSeconds: 183,
    qaScore: 4,
    flagged: false,
    flagReason: null,
    sentimentScore: 7.5,
    transcript:
      "New prospect asking about pricing and whether we support multiple locations. Friendly call; sent over a follow-up with the pricing sheet.",
    minutesAgo: 1500,
  },
  {
    id: "rec-008",
    agentId: 2,
    agentName: "Sarah Johnson",
    facilityId: 7,
    durationSeconds: 360,
    qaScore: 1.5,
    flagged: true,
    flagReason: "complaint_keyword",
    sentimentScore: 3.5,
    transcript:
      "I'd like to file a complaint about the support I received last week — nobody followed up and I had to call back three times to get an answer.",
    minutesAgo: 1700,
  },
  {
    id: "rec-009",
    agentId: 4,
    agentName: "Emily Davis",
    facilityId: 6,
    durationSeconds: 95,
    qaScore: null,
    flagged: false,
    flagReason: null,
    sentimentScore: 6,
    transcript:
      "General question about where to find the monthly reports. Pointed them to the analytics dashboard; short and routine.",
    minutesAgo: 1620,
  },
  {
    id: "rec-010",
    agentId: 1,
    agentName: "John Smith",
    facilityId: 8,
    durationSeconds: 300,
    qaScore: 4.5,
    flagged: false,
    flagReason: null,
    sentimentScore: 8,
    transcript:
      "Quarterly account review — covered usage, billing, and the upcoming roadmap. Everything was in good shape and the caller was pleased.",
    minutesAgo: 3000,
  },
  {
    id: "rec-011",
    agentId: 5,
    agentName: "Robert Wilson",
    facilityId: 10,
    durationSeconds: 262,
    qaScore: 3,
    flagged: false,
    flagReason: null,
    sentimentScore: 4.5,
    transcript:
      "Renewal question about the annual plan. Mostly neutral; caller had a few hesitations about the price increase.",
    minutesAgo: 4320,
  },
  {
    id: "rec-012",
    agentId: 3,
    agentName: "Michael Chen",
    callerNumber: "(312) 555-0177",
    durationSeconds: 72,
    qaScore: null,
    flagged: true,
    flagReason: "complaint_keyword",
    sentimentScore: 2.5,
    transcript:
      "The customer was upset that their account looked suspended during a billing issue and threatened to cancel their subscription if it wasn't fixed today.",
    minutesAgo: 5760,
  },
  {
    id: "rec-013",
    agentId: 2,
    agentName: "Sarah Johnson",
    facilityId: 1,
    durationSeconds: 200,
    qaScore: 5,
    flagged: false,
    flagReason: null,
    sentimentScore: 9.2,
    transcript:
      "Caller phoned back just to thank us for the quick fix on the booking widget. Very positive, no further action needed.",
    minutesAgo: 7200,
  },
  {
    id: "rec-014",
    agentId: 6,
    agentName: "Lisa Martinez",
    facilityId: 2,
    durationSeconds: 145,
    qaScore: 4,
    flagged: false,
    flagReason: null,
    sentimentScore: 7,
    transcript:
      "Routine check-in on how the new grooming-package setup is working out. No issues; caller was happy.",
    minutesAgo: 8000,
  },
];

function facilityPhone(facilityId: number): string {
  const f = facilities.find((x) => x.id === facilityId) as
    | { contact?: { phone?: string }; owner?: { phone?: string } }
    | undefined;
  return f?.contact?.phone ?? f?.owner?.phone ?? "";
}

export function buildSupportRecordings(nowMs: number): SupportRecording[] {
  return SEED.map((s) => ({
    id: s.id,
    callerNumber:
      s.callerNumber ??
      (s.facilityId != null ? facilityPhone(s.facilityId) : ""),
    agentId: s.agentId,
    agentName: s.agentName,
    at: new Date(nowMs - s.minutesAgo * 60_000).toISOString(),
    durationSeconds: s.durationSeconds,
    qaScore: s.qaScore,
    flagged: s.flagged,
    flagReason: s.flagReason,
    sentimentScore: s.sentimentScore,
    transcript: s.transcript,
  })).sort((a, b) => (a.at < b.at ? 1 : -1));
}
