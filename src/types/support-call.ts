// Types for the admin "Yipyy Support Calls" module (facilities phoning Yipyy
// support). Distinct from the facility-side calling module.

export type MissedCallStatus = "unresolved" | "called_back" | "pending";

export interface SupportQueuedCall {
  id: string;
  callerNumber: string;
  /** Seconds already spent waiting when the page loaded (ticks up live). */
  waitSeconds: number;
}

export interface SupportMissedCall {
  id: string;
  callerNumber: string;
  minutesAgo: number;
  autoSmsSent: boolean;
  status: MissedCallStatus;
}

export interface SupportCallStats {
  online: boolean;
  voicemails: number;
  todayInbound: number;
  todayOutbound: number;
}

/** A caller resolved against the facility phone-number directory. */
export interface ResolvedCaller {
  facilityId: number;
  facilityName: string;
}
