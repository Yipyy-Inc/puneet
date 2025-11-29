export interface Contact {
  [key: string]: unknown;
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  facilityId: string | null;
  facilityName: string | null;
  isDecisionMaker: boolean;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationRecord {
  id: string;
  contactId: string;
  type: "email" | "call" | "meeting" | "note";
  subject: string;
  content: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  userId: string;
}

export const contactTags = [
  "decision-maker",
  "influencer",
  "technical",
  "financial",
  "operations",
  "hot-lead",
  "cold-lead",
  "referral",
  "vip",
  "competitor-user",
] as const;

export type ContactTag = (typeof contactTags)[number];

export const contacts: Contact[] = [
  {
    id: "contact-001",
    name: "Sarah Mitchell",
    title: "Owner",
    email: "sarah@pawsparadise.com",
    phone: "(555) 123-4567",
    facilityId: "lead-001",
    facilityName: "Paws Paradise Boarding",
    isDecisionMaker: true,
    tags: ["decision-maker", "hot-lead"],
    notes: "Very interested in our enterprise features. Has 3 locations.",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-20T14:30:00Z",
  },
  {
    id: "contact-002",
    name: "Michael Chen",
    title: "Operations Manager",
    email: "m.chen@happytails.com",
    phone: "(555) 234-5678",
    facilityId: "lead-002",
    facilityName: "Happy Tails Daycare",
    isDecisionMaker: false,
    tags: ["operations", "influencer"],
    notes:
      "Technical contact. Will evaluate the software before owner decides.",
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2025-01-18T11:00:00Z",
  },
  {
    id: "contact-003",
    name: "Jennifer Lopez",
    title: "Founder & CEO",
    email: "jlopez@petpalace.com",
    phone: "(555) 345-6789",
    facilityId: "lead-003",
    facilityName: "Pet Palace Grooming",
    isDecisionMaker: true,
    tags: ["decision-maker", "vip", "referral"],
    notes: "Referred by Happy Tails. Looking to upgrade from spreadsheets.",
    createdAt: "2025-01-08T14:00:00Z",
    updatedAt: "2025-01-22T09:15:00Z",
  },
  {
    id: "contact-004",
    name: "Robert Williams",
    title: "Finance Director",
    email: "rwilliams@furryfriendsvet.com",
    phone: "(555) 456-7890",
    facilityId: "lead-004",
    facilityName: "Furry Friends Veterinary",
    isDecisionMaker: true,
    tags: ["decision-maker", "financial"],
    notes: "Concerned about pricing. Needs detailed ROI analysis.",
    createdAt: "2025-01-05T11:00:00Z",
    updatedAt: "2025-01-19T16:45:00Z",
  },
  {
    id: "contact-005",
    name: "Amanda Foster",
    title: "General Manager",
    email: "amanda@waggingworld.com",
    phone: "(555) 567-8901",
    facilityId: "lead-005",
    facilityName: "Wagging World Resort",
    isDecisionMaker: false,
    tags: ["operations", "technical"],
    notes: "Will handle implementation. Very tech-savvy.",
    createdAt: "2025-01-12T13:00:00Z",
    updatedAt: "2025-01-21T10:30:00Z",
  },
  {
    id: "contact-006",
    name: "David Park",
    title: "Owner",
    email: "david@barkboutique.com",
    phone: "(555) 678-9012",
    facilityId: "lead-006",
    facilityName: "Bark Boutique",
    isDecisionMaker: true,
    tags: ["decision-maker", "cold-lead"],
    notes: "Initial interest but hasn't responded to follow-ups.",
    createdAt: "2025-01-03T10:00:00Z",
    updatedAt: "2025-01-10T14:00:00Z",
  },
  {
    id: "contact-007",
    name: "Lisa Thompson",
    title: "Co-Owner",
    email: "lisa@caninecorner.com",
    phone: "(555) 789-0123",
    facilityId: "lead-007",
    facilityName: "Canine Corner Training",
    isDecisionMaker: true,
    tags: ["decision-maker", "hot-lead"],
    notes: "Ready to sign. Waiting for contract review.",
    createdAt: "2025-01-18T09:00:00Z",
    updatedAt: "2025-01-23T11:00:00Z",
  },
  {
    id: "contact-008",
    name: "James Wilson",
    title: "IT Manager",
    email: "jwilson@petperfection.com",
    phone: "(555) 890-1234",
    facilityId: "lead-008",
    facilityName: "Pet Perfection Center",
    isDecisionMaker: false,
    tags: ["technical", "influencer"],
    notes: "Asking about API integrations and data migration.",
    createdAt: "2025-01-14T15:00:00Z",
    updatedAt: "2025-01-20T09:00:00Z",
  },
  {
    id: "contact-009",
    name: "Emily Davis",
    title: "Owner",
    email: "emily@pawsandclaws.com",
    phone: "(555) 901-2345",
    facilityId: "lead-009",
    facilityName: "Paws & Claws Spa",
    isDecisionMaker: true,
    tags: ["decision-maker", "competitor-user"],
    notes: "Currently using competitor software. Unhappy with support.",
    createdAt: "2025-01-16T10:00:00Z",
    updatedAt: "2025-01-22T14:00:00Z",
  },
  {
    id: "contact-010",
    name: "Christopher Brown",
    title: "Regional Manager",
    email: "cbrown@tailsandtrails.com",
    phone: "(555) 012-3456",
    facilityId: "lead-010",
    facilityName: "Tails & Trails Adventure",
    isDecisionMaker: false,
    tags: ["operations", "influencer"],
    notes: "Managing 5 locations. Needs multi-site features.",
    createdAt: "2025-01-11T11:00:00Z",
    updatedAt: "2025-01-19T13:00:00Z",
  },
  {
    id: "contact-011",
    name: "Patricia Martinez",
    title: "Owner",
    email: "patricia@snugglehouse.com",
    phone: "(555) 111-2222",
    facilityId: null,
    facilityName: null,
    isDecisionMaker: true,
    tags: ["decision-maker"],
    notes: "Met at trade show. Interested but no facility details yet.",
    createdAt: "2025-01-20T16:00:00Z",
    updatedAt: "2025-01-20T16:00:00Z",
  },
  {
    id: "contact-012",
    name: "Kevin Anderson",
    title: "Business Development",
    email: "kevin@petindustryassoc.org",
    phone: "(555) 222-3333",
    facilityId: null,
    facilityName: null,
    isDecisionMaker: false,
    tags: ["influencer", "referral"],
    notes: "Industry association contact. Can provide referrals.",
    createdAt: "2025-01-17T14:00:00Z",
    updatedAt: "2025-01-21T10:00:00Z",
  },
];

export const communicationHistory: CommunicationRecord[] = [
  {
    id: "comm-001",
    contactId: "contact-001",
    type: "email",
    subject: "Welcome to PetCare Platform",
    content: "Thank you for your interest in our platform...",
    direction: "outbound",
    timestamp: "2025-01-15T10:30:00Z",
    userId: "user-001",
  },
  {
    id: "comm-002",
    contactId: "contact-001",
    type: "call",
    subject: "Discovery Call",
    content:
      "Discussed current pain points and needs. They handle 50+ pets daily.",
    direction: "outbound",
    timestamp: "2025-01-16T14:00:00Z",
    userId: "user-001",
  },
  {
    id: "comm-003",
    contactId: "contact-001",
    type: "meeting",
    subject: "Product Demo",
    content:
      "Showed boarding and daycare modules. Very impressed with check-in feature.",
    direction: "outbound",
    timestamp: "2025-01-18T11:00:00Z",
    userId: "user-001",
  },
  {
    id: "comm-004",
    contactId: "contact-002",
    type: "email",
    subject: "RE: Technical Questions",
    content: "Answered questions about API and integrations.",
    direction: "outbound",
    timestamp: "2025-01-12T09:00:00Z",
    userId: "user-002",
  },
  {
    id: "comm-005",
    contactId: "contact-003",
    type: "call",
    subject: "Follow-up Call",
    content: "Checking in after demo. Ready to move forward.",
    direction: "inbound",
    timestamp: "2025-01-22T10:00:00Z",
    userId: "user-001",
  },
  {
    id: "comm-006",
    contactId: "contact-004",
    type: "email",
    subject: "ROI Analysis Document",
    content: "Sent detailed ROI analysis as requested.",
    direction: "outbound",
    timestamp: "2025-01-19T15:00:00Z",
    userId: "user-003",
  },
  {
    id: "comm-007",
    contactId: "contact-007",
    type: "meeting",
    subject: "Contract Review Meeting",
    content: "Walked through contract terms. Minor revisions requested.",
    direction: "outbound",
    timestamp: "2025-01-23T10:00:00Z",
    userId: "user-001",
  },
  {
    id: "comm-008",
    contactId: "contact-009",
    type: "call",
    subject: "Competitor Comparison",
    content:
      "Discussed differences from their current provider. Main issues: support response time.",
    direction: "outbound",
    timestamp: "2025-01-20T11:00:00Z",
    userId: "user-002",
  },
];

// Helper functions
export function getContactById(contactId: string): Contact | undefined {
  return contacts.find((contact) => contact.id === contactId);
}

export function getContactsByFacility(facilityId: string): Contact[] {
  return contacts.filter((contact) => contact.facilityId === facilityId);
}

export function getContactsByTag(tag: ContactTag): Contact[] {
  return contacts.filter((contact) => contact.tags.includes(tag));
}

export function getDecisionMakers(): Contact[] {
  return contacts.filter((contact) => contact.isDecisionMaker);
}

export function getCommunicationByContact(
  contactId: string,
): CommunicationRecord[] {
  return communicationHistory.filter(
    (record) => record.contactId === contactId,
  );
}

export function getRecentCommunications(
  limit: number = 10,
): CommunicationRecord[] {
  return [...communicationHistory]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);
}
