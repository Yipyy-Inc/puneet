// ============================================================================
// The recovery queue's data.
// ============================================================================

export const RESOLUTION_CODES = [
  "contacted_apologised",
  "credit_issued",
  "refunded",
  "policy_change",
  "staff_coached",
  "no_contact_possible",
  "client_satisfied",
] as const;

export type ResolutionCode = (typeof RESOLUTION_CODES)[number];

/** What a manager picks from. The vocabulary is closed so it can be counted. */
export const RESOLUTION_LABELS: Record<ResolutionCode, string> = {
  contacted_apologised: "Called and apologised",
  credit_issued: "Gave them a credit",
  refunded: "Refunded them",
  policy_change: "Changed how we do it",
  staff_coached: "Coached the staff member",
  no_contact_possible: "Could not reach them",
  client_satisfied: "They are happy now",
};

export interface EscalationEvent {
  id: number;
  kind: string;
  actor: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface Escalation {
  id: string;
  state: "open" | "acknowledged" | "in_recovery" | "resolved" | "closed";
  service_type: string | null;
  assignee_ids: string[];
  opened_at: string;
  first_response_due_at: string;
  acknowledged_at: string | null;
  resolve_due_at: string;
  resolved_at: string | null;
  resolution_code: ResolutionCode | null;
  resolution_note: string | null;
  breach_notified_at: string | null;
  response: {
    id: string;
    rating: number;
    comment: string | null;
    source: string;
    submitted_at: string;
    staff: { id: string; first_name: string; last_name: string } | null;
    request: {
      id: string;
      business_day: string;
      service_types: string[];
      client: {
        id: string;
        ref: number;
        name: string;
        email: string | null;
        phone: string | null;
      };
    };
  };
  events: EscalationEvent[];
}

async function fetchEscalations(
  scope: "open" | "resolved",
): Promise<Escalation[]> {
  const response = await fetch(`/api/reputation/escalations?scope=${scope}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? "Could not read the recovery queue.");
  }
  const body = (await response.json()) as { escalations: Escalation[] };
  return body.escalations;
}

export const escalationQueries = {
  list: (scope: "open" | "resolved") => ({
    queryKey: ["reputation", "escalations", scope] as const,
    queryFn: () => fetchEscalations(scope),
  }),
};

export type EscalationAction =
  | { action: "acknowledge" }
  | {
      action: "log";
      kind: "call" | "message" | "note" | "credit" | "refund";
      note?: string;
    }
  | { action: "resolve"; resolutionCode: ResolutionCode; note?: string };

export async function actOnEscalation(
  id: string,
  action: EscalationAction,
): Promise<void> {
  const response = await fetch(
    `/api/reputation/escalations/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    },
  );
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? "That could not be saved.");
  }
}

/**
 * How overdue a ticket is, in whole hours, or null when it is not.
 *
 * Derived at read time from `first_response_due_at`, never stored. A stored
 * breach flag needs a job to set it, and a job that stops running turns every
 * breach into an on-time ticket — silently, on the one queue where silence is
 * the failure mode.
 */
export function hoursOverdue(escalation: Escalation): number | null {
  if (escalation.resolved_at) return null;
  const due = new Date(
    escalation.acknowledged_at
      ? escalation.resolve_due_at
      : escalation.first_response_due_at,
  ).getTime();
  const over = Date.now() - due;
  return over > 0 ? Math.floor(over / 3_600_000) : null;
}
