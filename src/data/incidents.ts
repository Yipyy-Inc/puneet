// Types re-exported from @/types/incidents (single source of truth)
export type {
  Incident,
  FollowUpTask,
  IncidentCareAction,
  IncidentMedication,
  IncidentCareLog,
} from "@/types/incidents";
import type { Incident, FollowUpTask } from "@/types/incidents";

// ============================================================================
// EMPTY, on purpose (2026-09-10).
//
// This held fourteen invented incidents, read by numeric id — and real pet 1,
// client 15 and booking 1 exist, so real records wore invented bites and
// fights. Incidents are rows now (`/api/incidents`, public.incidents), and
// every screen that lists them reads that.
//
// The array stays, empty, for staff-tasks.ts's follow-up list. In-stay care
// is rows since 20260914130556 (incident_care_items, incident_care_logs); its
// in-memory helpers and incident-billing.ts are gone.
// ============================================================================
export const incidents: Incident[] = [];

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

// Get incidents for an owner account (powers customer-level grouping, 2E)
export const getIncidentsForClient = (clientId: number): Incident[] =>
  incidents.filter((i) => i.clientId === clientId);

// Persist a newly reported incident (mock/in-memory). The caller supplies the
// id (so generated follow-up tasks / care actions reference the same one);
// createdAt/updatedAt are stamped here. Returns the stored incident.
export const addIncident = (
  data: Omit<Incident, "createdAt" | "updatedAt">,
): Incident => {
  const now = new Date().toISOString();
  const incident: Incident = { ...data, createdAt: now, updatedAt: now };
  incidents.push(incident);
  return incident;
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
