export type LeadSource =
  | "website"
  | "phone"
  | "referral"
  | "event"
  | "social_media"
  | "advertisement"
  | "cold_outreach"
  | "partner";

export type PipelineStage =
  | "new_lead"
  | "contacted"
  | "demo_scheduled"
  | "demo_completed"
  | "proposal_sent"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type ServiceType =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "veterinary";

export type ExpectedTier = "beginner" | "pro" | "enterprise" | "custom";

export interface Lead {
  id: string;
  facilityName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  source: LeadSource;
  businessSize: number;
  servicesOffered: ServiceType[];
  notes: string;
  status: PipelineStage;
  assignedTo: string;
  expectedTier: ExpectedTier;
  modulesInterested: string[];
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  expectedCloseDate: string;
  probability: number;
  createdAt: string;
  updatedAt: string;
}

export const leadSourceLabels: Record<LeadSource, string> = {
  website: "Website",
  phone: "Phone Inquiry",
  referral: "Referral",
  event: "Trade Show/Event",
  social_media: "Social Media",
  advertisement: "Advertisement",
  cold_outreach: "Cold Outreach",
  partner: "Partner",
};

export const pipelineStageLabels: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  demo_scheduled: "Demo Scheduled",
  demo_completed: "Demo Completed",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const pipelineStageColors: Record<PipelineStage, string> = {
  new_lead: "bg-blue-500",
  contacted: "bg-cyan-500",
  demo_scheduled: "bg-purple-500",
  demo_completed: "bg-indigo-500",
  proposal_sent: "bg-amber-500",
  negotiation: "bg-orange-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-500",
};

export const pipelineStageOrder: PipelineStage[] = [
  "new_lead",
  "contacted",
  "demo_scheduled",
  "demo_completed",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export const serviceTypeLabels: Record<ServiceType, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  veterinary: "Veterinary",
};

export const expectedTierLabels: Record<ExpectedTier, string> = {
  beginner: "Beginner",
  pro: "Pro",
  enterprise: "Enterprise",
  custom: "Custom",
};

export const leads: Lead[] = [
  {
    id: "lead-001",
    facilityName: "Happy Paws Pet Resort",
    contactPerson: "Sarah Mitchell",
    email: "sarah@happypaws.com",
    phone: "(555) 123-4567",
    address: "123 Pet Lane, Austin, TX 78701",
    source: "website",
    businessSize: 50,
    servicesOffered: ["boarding", "daycare", "grooming"],
    notes:
      "Looking to upgrade from spreadsheets. Very interested in automated booking.",
    status: "demo_scheduled",
    assignedTo: "rep-001",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-financial-reporting",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-02-15",
    probability: 60,
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2025-01-15T14:30:00Z",
  },
  {
    id: "lead-002",
    facilityName: "Bark & Play Daycare",
    contactPerson: "Michael Chen",
    email: "mchen@barkplay.com",
    phone: "(555) 234-5678",
    address: "456 Canine Court, Seattle, WA 98101",
    source: "referral",
    businessSize: 30,
    servicesOffered: ["daycare", "training"],
    notes:
      "Referred by existing customer Paws & Play. Small operation but growing fast.",
    status: "new_lead",
    assignedTo: "rep-002",
    expectedTier: "beginner",
    modulesInterested: ["module-booking", "module-customer-management"],
    estimatedMonthlyValue: 29,
    estimatedAnnualValue: 299,
    expectedCloseDate: "2025-02-28",
    probability: 30,
    createdAt: "2025-01-18T11:00:00Z",
    updatedAt: "2025-01-18T11:00:00Z",
  },
  {
    id: "lead-003",
    facilityName: "Elite Pet Spa & Hotel",
    contactPerson: "Jennifer Rodriguez",
    email: "jrodriguez@elitepetspa.com",
    phone: "(555) 345-6789",
    address: "789 Luxury Blvd, Miami, FL 33101",
    source: "event",
    businessSize: 150,
    servicesOffered: ["boarding", "daycare", "grooming", "training"],
    notes:
      "Met at PetExpo 2025. Large operation with 3 locations. Needs enterprise features.",
    status: "proposal_sent",
    assignedTo: "rep-001",
    expectedTier: "enterprise",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-inventory-management",
    ],
    estimatedMonthlyValue: 199,
    estimatedAnnualValue: 2149,
    expectedCloseDate: "2025-02-01",
    probability: 75,
    createdAt: "2025-01-05T10:00:00Z",
    updatedAt: "2025-01-17T16:45:00Z",
  },
  {
    id: "lead-004",
    facilityName: "Whiskers & Wags",
    contactPerson: "David Thompson",
    email: "david@whiskersandwags.com",
    phone: "(555) 456-7890",
    address: "321 Pet Street, Denver, CO 80201",
    source: "social_media",
    businessSize: 25,
    servicesOffered: ["grooming", "daycare"],
    notes:
      "Found us on Instagram. Currently using a competitor but unhappy with support.",
    status: "contacted",
    assignedTo: "rep-003",
    expectedTier: "beginner",
    modulesInterested: ["module-booking", "module-communication"],
    estimatedMonthlyValue: 29,
    estimatedAnnualValue: 299,
    expectedCloseDate: "2025-03-01",
    probability: 40,
    createdAt: "2025-01-16T14:00:00Z",
    updatedAt: "2025-01-17T09:15:00Z",
  },
  {
    id: "lead-005",
    facilityName: "Pawfect Care Center",
    contactPerson: "Amanda Wilson",
    email: "amanda@pawfectcare.com",
    phone: "(555) 567-8901",
    address: "654 Animal Ave, Portland, OR 97201",
    source: "phone",
    businessSize: 75,
    servicesOffered: ["boarding", "daycare", "grooming", "veterinary"],
    notes:
      "Called in asking about veterinary integration. Has in-house vet services.",
    status: "demo_completed",
    assignedTo: "rep-002",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-financial-reporting",
      "module-grooming-management",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-02-10",
    probability: 70,
    createdAt: "2025-01-08T08:30:00Z",
    updatedAt: "2025-01-16T11:00:00Z",
  },
  {
    id: "lead-006",
    facilityName: "Canine Kingdom",
    contactPerson: "Robert Martinez",
    email: "rob@caninekingdom.com",
    phone: "(555) 678-9012",
    address: "987 Dog Park Rd, Phoenix, AZ 85001",
    source: "advertisement",
    businessSize: 100,
    servicesOffered: ["boarding", "training", "daycare"],
    notes:
      "Saw our Google ad. Large training facility with boarding. Needs scheduling features.",
    status: "negotiation",
    assignedTo: "rep-001",
    expectedTier: "enterprise",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-training-education",
    ],
    estimatedMonthlyValue: 199,
    estimatedAnnualValue: 2149,
    expectedCloseDate: "2025-01-25",
    probability: 85,
    createdAt: "2025-01-02T13:00:00Z",
    updatedAt: "2025-01-18T10:30:00Z",
  },
  {
    id: "lead-007",
    facilityName: "Fluffy Friends Grooming",
    contactPerson: "Lisa Park",
    email: "lisa@fluffyfriends.com",
    phone: "(555) 789-0123",
    address: "147 Groomer Lane, San Diego, CA 92101",
    source: "referral",
    businessSize: 15,
    servicesOffered: ["grooming"],
    notes:
      "Small grooming-only shop. Looking for simple booking and payment solution.",
    status: "closed_won",
    assignedTo: "rep-003",
    expectedTier: "beginner",
    modulesInterested: ["module-booking", "module-communication"],
    estimatedMonthlyValue: 29,
    estimatedAnnualValue: 299,
    expectedCloseDate: "2025-01-15",
    probability: 100,
    createdAt: "2024-12-20T10:00:00Z",
    updatedAt: "2025-01-15T14:00:00Z",
  },
  {
    id: "lead-008",
    facilityName: "Pet Paradise Resort",
    contactPerson: "Thomas Baker",
    email: "tbaker@petparadise.com",
    phone: "(555) 890-1234",
    address: "258 Resort Way, Las Vegas, NV 89101",
    source: "cold_outreach",
    businessSize: 200,
    servicesOffered: ["boarding", "daycare", "grooming", "training"],
    notes:
      "Cold email outreach. Premium resort with high-end clientele. Budget not a concern.",
    status: "demo_scheduled",
    assignedTo: "rep-001",
    expectedTier: "enterprise",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-inventory-management",
    ],
    estimatedMonthlyValue: 199,
    estimatedAnnualValue: 2149,
    expectedCloseDate: "2025-02-20",
    probability: 50,
    createdAt: "2025-01-12T15:00:00Z",
    updatedAt: "2025-01-17T12:00:00Z",
  },
  {
    id: "lead-009",
    facilityName: "Neighborhood Pet Care",
    contactPerson: "Karen White",
    email: "karen@neighborhoodpet.com",
    phone: "(555) 901-2345",
    address: "369 Community Dr, Chicago, IL 60601",
    source: "partner",
    businessSize: 40,
    servicesOffered: ["daycare", "grooming"],
    notes:
      "Referred by our partner PetSupplies Inc. Interested in loyalty program features.",
    status: "contacted",
    assignedTo: "rep-002",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-02-25",
    probability: 45,
    createdAt: "2025-01-14T09:30:00Z",
    updatedAt: "2025-01-16T16:00:00Z",
  },
  {
    id: "lead-010",
    facilityName: "The Dog House",
    contactPerson: "James Anderson",
    email: "james@thedoghouse.com",
    phone: "(555) 012-3456",
    address: "741 Bone Street, Nashville, TN 37201",
    source: "website",
    businessSize: 60,
    servicesOffered: ["boarding", "daycare"],
    notes:
      "Submitted contact form. Growing business, looking for scalable solution.",
    status: "closed_lost",
    assignedTo: "rep-003",
    expectedTier: "pro",
    modulesInterested: ["module-booking", "module-staff-scheduling"],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-01-10",
    probability: 0,
    createdAt: "2024-12-15T11:00:00Z",
    updatedAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "lead-011",
    facilityName: "Purrfect Stay Cat Hotel",
    contactPerson: "Emily Davis",
    email: "emily@purrfectstay.com",
    phone: "(555) 111-2222",
    address: "852 Feline Way, Boston, MA 02101",
    source: "event",
    businessSize: 35,
    servicesOffered: ["boarding", "grooming"],
    notes:
      "Cat-only facility. Met at CatCon. Needs specialized cat boarding features.",
    status: "new_lead",
    assignedTo: "rep-001",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-grooming-management",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-03-10",
    probability: 25,
    createdAt: "2025-01-19T10:00:00Z",
    updatedAt: "2025-01-19T10:00:00Z",
  },
  {
    id: "lead-012",
    facilityName: "All Creatures Pet Services",
    contactPerson: "Steven Clark",
    email: "steven@allcreatures.com",
    phone: "(555) 333-4444",
    address: "963 Animal Kingdom Blvd, Atlanta, GA 30301",
    source: "website",
    businessSize: 80,
    servicesOffered: [
      "boarding",
      "daycare",
      "grooming",
      "training",
      "veterinary",
    ],
    notes:
      "Full-service facility. Interested in all modules. Decision maker is the owner.",
    status: "proposal_sent",
    assignedTo: "rep-002",
    expectedTier: "enterprise",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
      "module-grooming-management",
      "module-inventory-management",
    ],
    estimatedMonthlyValue: 199,
    estimatedAnnualValue: 2149,
    expectedCloseDate: "2025-02-05",
    probability: 65,
    createdAt: "2025-01-06T14:00:00Z",
    updatedAt: "2025-01-17T15:30:00Z",
  },
];

// Helper functions
export function getLeadsCountByStage(): Record<PipelineStage, number> {
  return pipelineStageOrder.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((lead) => lead.status === stage).length;
      return acc;
    },
    {} as Record<PipelineStage, number>,
  );
}

export function getTotalPipelineValue(): number {
  return leads
    .filter(
      (lead) => lead.status !== "closed_won" && lead.status !== "closed_lost",
    )
    .reduce((sum, lead) => sum + lead.estimatedAnnualValue, 0);
}

export function getWeightedPipelineValue(): number {
  return leads
    .filter(
      (lead) => lead.status !== "closed_won" && lead.status !== "closed_lost",
    )
    .reduce(
      (sum, lead) => sum + lead.estimatedAnnualValue * (lead.probability / 100),
      0,
    );
}
