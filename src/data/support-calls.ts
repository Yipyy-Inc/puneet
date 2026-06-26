import { facilities } from "@/data/facilities";
import type {
  ResolvedCaller,
  SupportCallStats,
  SupportMissedCall,
  SupportQueuedCall,
} from "@/types/support-call";

// Last-10-digits comparison so "(555) 123-4567" matches "555-123-4567" etc.
function digits(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

/** Match a calling number against the facility phone-number directory. */
export function lookupFacilityByPhone(number: string): ResolvedCaller | null {
  const target = digits(number);
  if (target.length < 7) return null;
  const match = facilities.find(
    (f) =>
      digits((f as { contact?: { phone?: string } }).contact?.phone) ===
        target ||
      digits((f as { owner?: { phone?: string } }).owner?.phone) === target,
  );
  return match ? { facilityId: match.id, facilityName: match.name } : null;
}

// Recognized callers use real facility contact numbers; the rest are unknown.
export const supportCallQueue: SupportQueuedCall[] = [
  { id: "q-1", callerNumber: "(555) 123-4567", waitSeconds: 40 },
  { id: "q-2", callerNumber: "(604) 555-0199", waitSeconds: 12 },
];

export const supportMissedCalls: SupportMissedCall[] = [
  {
    id: "m-1",
    callerNumber: "(555) 234-5678",
    minutesAgo: 6,
    autoSmsSent: true,
    status: "unresolved",
  },
  {
    id: "m-2",
    callerNumber: "(415) 555-0142",
    minutesAgo: 22,
    autoSmsSent: true,
    status: "pending",
  },
  {
    id: "m-3",
    callerNumber: "(555) 345-6789",
    minutesAgo: 48,
    autoSmsSent: false,
    status: "called_back",
  },
  {
    id: "m-4",
    callerNumber: "(312) 555-0188",
    minutesAgo: 95,
    autoSmsSent: true,
    status: "unresolved",
  },
];

export const supportCallStats: SupportCallStats = {
  online: true,
  voicemails: 3,
  todayInbound: 26,
  todayOutbound: 9,
};
