import { z } from "zod";

import { followUpProtocols } from "@/data/follow-up-protocols";
import {
  followUpProtocolSchema,
  type FollowUpProtocol,
} from "@/types/incidents";

// ============================================================================
// The follow-up protocols a facility runs after an incident.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// The Protocols tab edited a `useState` seeded from src/data, so an edited or
// deleted protocol was back on reload and on every other device; and the
// incident form suggested protocols from that fixture list, whatever the
// facility had changed. The follow-up TASKS a protocol generates were already
// real (they go on the task board) — only the protocols themselves were not.
//
// ── THE FALLBACK IS THE SHIPPED SET, ON PURPOSE ────────────────────────────
//
// Like the Daily Care routine: a facility that has never opened the tab gets
// the recommended protocols, because an empty list is an incident form that
// suggests nothing. The first save stores the facility's own list, and from
// then on that is all it reads.
// ============================================================================

export const incidentProtocolsSchema = z.object({
  protocols: z.array(followUpProtocolSchema).max(100),
});

export type IncidentProtocols = z.infer<typeof incidentProtocolsSchema>;

export const SHIPPED_INCIDENT_PROTOCOLS: IncidentProtocols = {
  protocols: structuredClone(followUpProtocols),
};

/**
 * The best protocols for an incident's severity and type: active ones whose
 * scopes match, defaults first.
 */
export function suggestProtocols(
  protocols: readonly FollowUpProtocol[],
  severity: string,
  type: string,
): FollowUpProtocol[] {
  return protocols
    .filter(
      (p) =>
        p.isActive &&
        p.severityScopes.includes(
          severity as FollowUpProtocol["severityScopes"][number],
        ) &&
        p.typeScopes.includes(type as FollowUpProtocol["typeScopes"][number]),
    )
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
