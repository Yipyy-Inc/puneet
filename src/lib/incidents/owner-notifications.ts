import { clients } from "@/data/clients";
import type { Incident } from "@/types/incidents";

export interface IncidentOwnerNotification {
  clientId: number;
  clientName: string;
  notified: boolean;
  notifiedAt?: string;
}

/**
 * Per-owner notification status for an incident (2E). Resolves the distinct
 * owner accounts across the incident's pets, then marks each notified from the
 * incident's `clientNotifications` — falling back to the legacy single
 * `clientNotified` flag for owners with no explicit entry.
 */
export function getIncidentOwnerNotifications(
  incident: Incident,
): IncidentOwnerNotification[] {
  // Distinct owner accounts across the incident's pets.
  const ownerIds: number[] = [];
  for (const petId of incident.petIds) {
    const owner = clients.find((c) => c.pets?.some((p) => p.id === petId));
    if (owner && !ownerIds.includes(owner.id)) ownerIds.push(owner.id);
  }
  // Fall back to the incident's own owner account if no pets resolved.
  if (ownerIds.length === 0 && incident.clientId != null) {
    ownerIds.push(incident.clientId);
  }

  return ownerIds.map((clientId) => {
    const client = clients.find((c) => c.id === clientId);
    const record = incident.clientNotifications?.find(
      (n) => n.clientId === clientId,
    );
    return {
      clientId,
      clientName: client?.name ?? `Client #${clientId}`,
      // Explicit per-owner record wins; otherwise the legacy incident-wide flag.
      notified: record ? record.notified : incident.clientNotified,
      notifiedAt: record?.notifiedAt,
    };
  });
}
