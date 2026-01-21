export type BookingRequestStatus = "pending" | "declined" | "waitlisted" | "scheduled";

export type BookingRequestService = "daycare" | "boarding" | "grooming" | "training";

export interface BookingRequest {
  id: string;
  facilityId: number;
  createdAt: string; // ISO
  appointmentAt: string; // ISO
  clientId: number;
  clientName: string;
  clientContact: string; // phone or email
  petId: number;
  petName: string;
  services: BookingRequestService[];
  status: BookingRequestStatus; // Pending by default
  notes?: string;
}

export const BOOKING_REQUESTS: BookingRequest[] = [
  {
    id: "br-001",
    facilityId: 11,
    createdAt: "2024-03-10T10:12:00Z",
    appointmentAt: "2024-03-12T14:30:00Z",
    clientId: 15,
    clientName: "John Smith",
    clientContact: "john.smith@email.com",
    petId: 1,
    petName: "Buddy",
    services: ["daycare"],
    status: "pending",
    notes: "First time daycare, please call if questions.",
  },
  {
    id: "br-002",
    facilityId: 11,
    createdAt: "2024-03-10T09:44:00Z",
    appointmentAt: "2024-03-11T09:00:00Z",
    clientId: 29,
    clientName: "Sarah Johnson",
    clientContact: "(555) 222-1033",
    petId: 14,
    petName: "Max",
    services: ["grooming"],
    status: "pending",
  },
  {
    id: "br-003",
    facilityId: 11,
    createdAt: "2024-03-09T18:05:00Z",
    appointmentAt: "2024-03-13T08:00:00Z",
    clientId: 16,
    clientName: "Emily Davis",
    clientContact: "emily.davis@email.com",
    petId: 3,
    petName: "Luna",
    services: ["boarding"],
    status: "pending",
    notes: "Needs late check-in after 6pm.",
  },
  {
    id: "br-004",
    facilityId: 11,
    createdAt: "2024-03-09T16:22:00Z",
    appointmentAt: "2024-03-12T11:00:00Z",
    clientId: 28,
    clientName: "Mike Chen",
    clientContact: "mike.chen@email.com",
    petId: 13,
    petName: "Charlie",
    services: ["training"],
    status: "pending",
  },
  {
    id: "br-005",
    facilityId: 11,
    createdAt: "2024-03-08T13:10:00Z",
    appointmentAt: "2024-03-12T15:00:00Z",
    clientId: 21,
    clientName: "Alex Martinez",
    clientContact: "(555) 555-0112",
    petId: 8,
    petName: "Rocky",
    services: ["daycare", "grooming"],
    status: "pending",
  },
  {
    id: "br-006",
    facilityId: 11,
    createdAt: "2024-03-08T09:30:00Z",
    appointmentAt: "2024-03-14T10:30:00Z",
    clientId: 18,
    clientName: "Olivia Brown",
    clientContact: "olivia.brown@email.com",
    petId: 6,
    petName: "Bella",
    services: ["boarding"],
    status: "pending",
  },
  {
    id: "br-007",
    facilityId: 11,
    createdAt: "2024-03-07T20:11:00Z",
    appointmentAt: "2024-03-11T16:00:00Z",
    clientId: 24,
    clientName: "David Wilson",
    clientContact: "(555) 333-7722",
    petId: 10,
    petName: "Daisy",
    services: ["daycare"],
    status: "pending",
  },
  {
    id: "br-008",
    facilityId: 11,
    createdAt: "2024-03-07T12:45:00Z",
    appointmentAt: "2024-03-15T09:00:00Z",
    clientId: 19,
    clientName: "Lisa Rodriguez",
    clientContact: "lisa.rodriguez@email.com",
    petId: 7,
    petName: "Cooper",
    services: ["grooming"],
    status: "pending",
  },
];

