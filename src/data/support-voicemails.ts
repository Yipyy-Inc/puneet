import { facilities } from "@/data/facilities";
import type {
  SupportVoicemail,
  SupportVoicemailStatus,
} from "@/types/support-call";

// Seed voicemails left on the Yipyy support line. Transcripts represent the
// AI/speech-to-text output that arrives via the Twilio recording webhook
// (/api/twilio/recording) in production. minutesAgo offsets resolve against
// "now" on the client so the timestamps stay fresh. Recognized callers reuse
// real facility contact numbers; the rest are unknown.

interface VoicemailSeed {
  id: string;
  facilityId?: number;
  callerNumber?: string;
  durationSeconds: number;
  transcription: string;
  isNew: boolean;
  status: SupportVoicemailStatus;
  minutesAgo: number;
}

const SEED: VoicemailSeed[] = [
  {
    id: "svm-001",
    facilityId: 1,
    durationSeconds: 58,
    transcription:
      "Hi, this is John from Paws and Play Daycare. Our online booking widget stopped loading for clients this morning — it's been down about an hour now. Can someone take a look and call me back? Thanks.",
    isNew: true,
    status: "pending",
    minutesAgo: 35,
  },
  {
    id: "svm-002",
    facilityId: 3,
    durationSeconds: 47,
    transcription:
      "Hello, it's Maria at Happy Tails Boarding. I'm calling about last month's invoice — I think we were double charged. Please give me a call back when you get a chance to sort it out.",
    isNew: true,
    status: "pending",
    minutesAgo: 95,
  },
  {
    id: "svm-003",
    callerNumber: "(604) 555-0142",
    durationSeconds: 41,
    transcription:
      "Hi, my name's Karen — I run a small grooming studio and I'm looking into your platform. I had a couple of questions about pricing and whether you support multiple locations. You can reach me at this number.",
    isNew: true,
    status: "pending",
    minutesAgo: 150,
  },
  {
    id: "svm-004",
    facilityId: 5,
    durationSeconds: 63,
    transcription:
      "Hey, it's Derek from Whisker Wonderland. Staff can't clock in since the latest update and it's affecting our whole team. This is pretty urgent — please call back as soon as you can.",
    isNew: false,
    status: "pending",
    minutesAgo: 280,
  },
  {
    id: "svm-005",
    facilityId: 2,
    durationSeconds: 38,
    transcription:
      "Hi there, Carla from Furry Friends Grooming. Just wanted to ask how to add a second location to our account. No rush, but a callback would be great. Thank you!",
    isNew: false,
    status: "resolved",
    minutesAgo: 1500,
  },
  {
    id: "svm-006",
    facilityId: 4,
    durationSeconds: 52,
    transcription:
      "Good afternoon, this is the front desk at Pet Paradise Vet. We'd like to upgrade our plan but had a question about the transaction fees first. Please ring us back at your convenience.",
    isNew: false,
    status: "pending",
    minutesAgo: 1700,
  },
  {
    id: "svm-007",
    callerNumber: "(312) 555-0177",
    durationSeconds: 72,
    transcription:
      "Hi, this is kind of urgent — our card on file was declined and now our account looks suspended, but we have clients checking in today. Please call me back right away so we can get this fixed.",
    isNew: false,
    status: "resolved",
    minutesAgo: 3000,
  },
];

function facilityPhone(facilityId: number): string {
  const f = facilities.find((x) => x.id === facilityId) as
    | { contact?: { phone?: string }; owner?: { phone?: string } }
    | undefined;
  return f?.contact?.phone ?? f?.owner?.phone ?? "";
}

export function buildSupportVoicemails(nowMs: number): SupportVoicemail[] {
  return SEED.map((s) => ({
    id: s.id,
    callerNumber:
      s.callerNumber ??
      (s.facilityId != null ? facilityPhone(s.facilityId) : ""),
    receivedAt: new Date(nowMs - s.minutesAgo * 60_000).toISOString(),
    durationSeconds: s.durationSeconds,
    transcription: s.transcription,
    isNew: s.isNew,
    status: s.status,
  })).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}
