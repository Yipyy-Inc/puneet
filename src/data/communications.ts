// Communication history for clients
export interface CommunicationRecord {
  id: string;
  clientId: number;
  facilityId: number;
  type: "email" | "sms" | "call" | "in-app" | "note";
  subject: string;
  content: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  staffName?: string;
  staffId?: number;
  attachments?: string[];
  status?: "sent" | "delivered" | "read" | "failed";
}

export interface CallRecord {
  id: string;
  clientId: number;
  facilityId: number;
  direction: "inbound" | "outbound";
  duration: number; // in seconds
  timestamp: string;
  staffName?: string;
  staffId?: number;
  recordingUrl?: string;
  notes?: string;
  status: "completed" | "missed" | "voicemail";
}

export const clientCommunications: CommunicationRecord[] = [
  {
    id: "comm-001",
    clientId: 15,
    facilityId: 11,
    type: "email",
    subject: "Booking Confirmation - Buddy's Daycare",
    content: "Your booking for Buddy on March 10th has been confirmed.",
    direction: "outbound",
    timestamp: "2024-03-09T10:00:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    status: "read",
  },
  {
    id: "comm-002",
    clientId: 15,
    facilityId: 11,
    type: "sms",
    subject: "Reminder",
    content: "Reminder: Buddy's daycare appointment tomorrow at 8:00 AM",
    direction: "outbound",
    timestamp: "2024-03-09T18:00:00Z",
    status: "delivered",
  },
  {
    id: "comm-003",
    clientId: 15,
    facilityId: 11,
    type: "in-app",
    subject: "Buddy's Daily Update",
    content: "Buddy had a great day! He played with 5 other dogs and took a nice nap.",
    direction: "outbound",
    timestamp: "2024-03-08T15:30:00Z",
    staffName: "Mike Davis",
    staffId: 2,
    status: "read",
  },
  {
    id: "comm-004",
    clientId: 15,
    facilityId: 11,
    type: "note",
    subject: "Customer Inquiry",
    content: "Called to ask about grooming services. Interested in full package.",
    direction: "inbound",
    timestamp: "2024-03-07T11:20:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
  },
  {
    id: "comm-005",
    clientId: 16,
    facilityId: 11,
    type: "email",
    subject: "Vaccination Reminder for Max",
    content: "Max's rabies vaccination is due to expire on April 15th. Please update records.",
    direction: "outbound",
    timestamp: "2024-03-05T09:00:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    status: "read",
  },
  {
    id: "comm-006",
    clientId: 16,
    facilityId: 11,
    type: "call",
    subject: "Booking Discussion",
    content: "Discussed upcoming boarding dates and special dietary requirements.",
    direction: "inbound",
    timestamp: "2024-02-28T14:30:00Z",
    staffName: "Mike Davis",
    staffId: 2,
  },
  {
    id: "comm-007",
    clientId: 29,
    facilityId: 11,
    type: "sms",
    subject: "Pick-up Reminder",
    content: "Fluffy is ready for pick-up! Grooming complete.",
    direction: "outbound",
    timestamp: "2024-03-10T12:00:00Z",
    status: "delivered",
  },
  {
    id: "comm-008",
    clientId: 28,
    facilityId: 11,
    type: "email",
    subject: "Welcome to Paws & Play!",
    content: "Thank you for choosing Paws & Play Daycare. We're excited to meet Rex!",
    direction: "outbound",
    timestamp: "2024-01-15T10:00:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    status: "read",
  },
];

export const clientCallHistory: CallRecord[] = [
  {
    id: "call-001",
    clientId: 15,
    facilityId: 11,
    direction: "inbound",
    duration: 180, // 3 minutes
    timestamp: "2024-03-08T10:15:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    notes: "Asked about availability for boarding next month. Booked March 12-15.",
    status: "completed",
    recordingUrl: "/recordings/call-001.mp3",
  },
  {
    id: "call-002",
    clientId: 15,
    facilityId: 11,
    direction: "outbound",
    duration: 120,
    timestamp: "2024-02-20T14:30:00Z",
    staffName: "Mike Davis",
    staffId: 2,
    notes: "Follow-up on vaccination documentation for Buddy.",
    status: "completed",
    recordingUrl: "/recordings/call-002.mp3",
  },
  {
    id: "call-003",
    clientId: 16,
    facilityId: 11,
    direction: "inbound",
    duration: 0,
    timestamp: "2024-03-05T16:45:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    notes: "Left voicemail regarding Max's grooming appointment.",
    status: "voicemail",
  },
  {
    id: "call-004",
    clientId: 16,
    facilityId: 11,
    direction: "inbound",
    duration: 240,
    timestamp: "2024-02-28T14:30:00Z",
    staffName: "Mike Davis",
    staffId: 2,
    notes: "Discussed upcoming boarding and special dietary needs for Max.",
    status: "completed",
    recordingUrl: "/recordings/call-004.mp3",
  },
  {
    id: "call-005",
    clientId: 29,
    facilityId: 11,
    direction: "outbound",
    duration: 90,
    timestamp: "2024-03-01T11:00:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    notes: "Confirmed grooming appointment for Fluffy.",
    status: "completed",
    recordingUrl: "/recordings/call-005.mp3",
  },
  {
    id: "call-006",
    clientId: 28,
    facilityId: 11,
    direction: "inbound",
    duration: 300,
    timestamp: "2024-01-15T09:30:00Z",
    staffName: "Sarah Johnson",
    staffId: 1,
    notes: "Initial inquiry call. Discussed services and pricing. Signed up for daycare.",
    status: "completed",
    recordingUrl: "/recordings/call-006.mp3",
  },
];

