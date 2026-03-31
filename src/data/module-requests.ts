import type { ModuleRequest } from "@/types/module-request";

// ============================================================================
// Mock data
// ============================================================================

export const moduleRequests: ModuleRequest[] = [
  {
    id: "req-001",
    facilityId: 11,
    facilityName: "Example Pet Care Facility",
    requestedAt: "2026-03-25T14:30:00Z",
    requestedBy: "Alice Johnson",
    serviceName: "Puppy Socialization Class",
    description:
      "We want to offer supervised puppy socialization sessions for dogs under 6 months. Groups of 6-8 puppies, 45-minute sessions with a trainer. Need temperament assessment before enrollment.",
    suggestedCategory: "event_based",
    priority: "normal",
    status: "pending",
  },
  {
    id: "req-002",
    facilityId: 11,
    facilityName: "Example Pet Care Facility",
    requestedAt: "2026-03-22T09:00:00Z",
    requestedBy: "Alice Johnson",
    serviceName: "Pet Taxi",
    description:
      "Need a door-to-door pet transport service similar to our Paws Express but with scheduled routes and multi-stop capability. Clients should be able to book pickup and drop-off separately.",
    suggestedCategory: "transport",
    priority: "urgent",
    status: "completed",
    completedModuleId: "csm-paws-express",
    notes: "Built as Paws Express — published to facility on Mar 26.",
  },
  {
    id: "req-003",
    facilityId: 1,
    facilityName: "Paws & Play Daycare",
    requestedAt: "2026-03-28T11:00:00Z",
    requestedBy: "Maria Thompson",
    serviceName: "Cat Boarding Suite",
    description:
      "We're expanding to cats. Need a separate boarding module for cats with smaller rooms, different feeding schedules, and cat-specific temperament tracking.",
    suggestedCategory: "stay_based",
    priority: "normal",
    status: "pending",
  },
];

// ============================================================================
// CRUD with localStorage
// ============================================================================

const STORAGE_KEY = "yipyy_module_requests";

function loadCustomRequests(): ModuleRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomRequests(requests: ModuleRequest[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    /* ignore */
  }
}

export function getAllRequests(): ModuleRequest[] {
  return [...moduleRequests, ...loadCustomRequests()].sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export function getRequestsForFacility(facilityId: number): ModuleRequest[] {
  return getAllRequests().filter((r) => r.facilityId === facilityId);
}

export function getPendingRequests(): ModuleRequest[] {
  return getAllRequests().filter(
    (r) => r.status === "pending" || r.status === "in_progress",
  );
}

export function submitRequest(
  request: Omit<ModuleRequest, "id" | "requestedAt" | "status">,
): ModuleRequest {
  const newReq: ModuleRequest = {
    ...request,
    id: `req-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  const custom = loadCustomRequests();
  custom.push(newReq);
  saveCustomRequests(custom);
  return newReq;
}

export function updateRequestStatus(
  id: string,
  status: ModuleRequest["status"],
  extra?: Partial<ModuleRequest>,
) {
  const custom = loadCustomRequests();
  const idx = custom.findIndex((r) => r.id === id);
  if (idx >= 0) {
    custom[idx] = { ...custom[idx], status, ...extra };
    saveCustomRequests(custom);
  }
}
