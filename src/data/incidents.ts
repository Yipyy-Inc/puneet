// Types re-exported from @/types/incidents (single source of truth)
export type {
  Incident,
  FollowUpTask,
  IncidentCareAction,
  IncidentMedication,
  IncidentCareLog,
} from "@/types/incidents";
import type {
  Incident,
  IncidentCareAction,
  IncidentMedication,
  IncidentCareLog,
  FollowUpTask,
} from "@/types/incidents";

// ============================================================================
// EMPTY, on purpose (2026-09-10).
//
// This held fourteen invented incidents, read by numeric id — and real pet 1,
// client 15 and booking 1 exist, so real records wore invented bites and
// fights. Incidents are rows now (`/api/incidents`, public.incidents), and
// every screen that lists them reads that.
//
// The array stays, empty, for the in-stay care helpers below and the three
// lib functions that call them (care-completion, care-log-scheduler,
// incident-billing): in-stay care has no table yet, so for a real incident
// they correctly find nothing. See the debt map.
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

// Get incidents involving a specific pet
export const getIncidentsForPet = (petId: number): Incident[] =>
  incidents.filter((i) => i.petIds.includes(petId));

// Get incidents linked to a booking (numeric booking-overview route param)
export const getIncidentsForBooking = (bookingId: number): Incident[] =>
  incidents.filter((i) => i.bookingId === bookingId);

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

// ========================================
// IN-STAY CARE MUTATORS (2B) — mock/in-memory
// ========================================

// Monotonic sequences so ids stay unique even within the same millisecond.
let careActionSeq = 0;
let incidentMedSeq = 0;
let careLogSeq = 0;

const findIncident = (incidentId: string): Incident | undefined =>
  incidents.find((i) => i.id === incidentId);

// Add a care action to an incident (id/incidentId/createdAt are filled here).
export const addCareAction = (
  incidentId: string,
  data: Omit<IncidentCareAction, "id" | "incidentId" | "createdAt">,
): IncidentCareAction | undefined => {
  const incident = findIncident(incidentId);
  if (!incident) return undefined;
  const action: IncidentCareAction = {
    ...data,
    id: `care-${new Date().getTime()}-${(careActionSeq += 1)}`,
    incidentId,
    createdAt: new Date().toISOString(),
  };
  incident.careActions.push(action);
  return action;
};

// Add an incident-scoped medication.
export const addIncidentMedication = (
  incidentId: string,
  data: Omit<IncidentMedication, "id" | "incidentId" | "createdAt">,
): IncidentMedication | undefined => {
  const incident = findIncident(incidentId);
  if (!incident) return undefined;
  const med: IncidentMedication = {
    ...data,
    id: `imed-${new Date().getTime()}-${(incidentMedSeq += 1)}`,
    incidentId,
    createdAt: new Date().toISOString(),
  };
  incident.incidentMedications.push(med);
  return med;
};

// Log an administration of a care action or medication (loggedAt stamped here).
export const logCareAction = (
  incidentId: string,
  data: Omit<IncidentCareLog, "id" | "incidentId" | "loggedAt">,
): IncidentCareLog | undefined => {
  const incident = findIncident(incidentId);
  if (!incident) return undefined;
  const log: IncidentCareLog = {
    ...data,
    id: `carelog-${new Date().getTime()}-${(careLogSeq += 1)}`,
    incidentId,
    loggedAt: new Date().toISOString(),
  };
  incident.careLogs.push(log);
  return log;
};

// Lock in-stay care at checkout (Flow C) — no further edits after this.
export const lockInStayCare = (incidentId: string): Incident | undefined => {
  const incident = findIncident(incidentId);
  if (!incident) return undefined;
  incident.inStayCareLocked = true;
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
