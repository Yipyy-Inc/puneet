import { TierType } from "@/data/subscription-tiers";

export type DealStage =
  | "qualification"
  | "needs_analysis"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface Deal {
  [key: string]: unknown;
  id: string;
  leadId: string;
  facilityName: string;
  contactPerson: string;
  email: string;
  phone: string;
  expectedTier: TierType;
  modulesInterested: string[];
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  expectedCloseDate: string;
  probability: number;
  stage: DealStage;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const dealStages: { value: DealStage; label: string; color: string }[] =
  [
    { value: "qualification", label: "Qualification", color: "bg-slate-500" },
    { value: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
    { value: "proposal", label: "Proposal", color: "bg-purple-500" },
    { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
    { value: "closed_won", label: "Closed Won", color: "bg-green-500" },
    { value: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
  ];

export const deals: Deal[] = [
  {
    id: "deal-001",
    leadId: "lead-001",
    facilityName: "Paws & Play Resort",
    contactPerson: "Sarah Johnson",
    email: "sarah@pawsplayresort.com",
    phone: "(555) 123-4567",
    expectedTier: "enterprise",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
      "module-financial-reporting",
    ],
    estimatedMonthlyValue: 199,
    estimatedAnnualValue: 2149,
    expectedCloseDate: "2025-02-15",
    probability: 75,
    stage: "negotiation",
    assignedTo: "rep-001",
    notes:
      "Very interested in multi-location support. Decision expected next week.",
    createdAt: "2025-01-10T09:00:00Z",
    updatedAt: "2025-01-18T14:30:00Z",
  },
  {
    id: "deal-002",
    leadId: "lead-002",
    facilityName: "Happy Tails Daycare",
    contactPerson: "Michael Chen",
    email: "michael@happytails.com",
    phone: "(555) 234-5678",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-grooming-management",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-02-28",
    probability: 60,
    stage: "proposal",
    assignedTo: "rep-002",
    notes: "Sent proposal on Jan 15. Waiting for feedback from their team.",
    createdAt: "2025-01-05T11:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "deal-003",
    leadId: "lead-003",
    facilityName: "Bark Avenue Grooming",
    contactPerson: "Emily Rodriguez",
    email: "emily@barkavenue.com",
    phone: "(555) 345-6789",
    expectedTier: "beginner",
    modulesInterested: ["module-booking", "module-customer-management"],
    estimatedMonthlyValue: 29,
    estimatedAnnualValue: 299,
    expectedCloseDate: "2025-02-10",
    probability: 90,
    stage: "closed_won",
    assignedTo: "rep-001",
    notes: "Signed contract on Jan 17. Starting onboarding next week.",
    createdAt: "2025-01-03T14:00:00Z",
    updatedAt: "2025-01-17T16:00:00Z",
  },
  {
    id: "deal-004",
    leadId: "lead-004",
    facilityName: "Pet Paradise Hotel",
    contactPerson: "David Kim",
    email: "david@petparadise.com",
    phone: "(555) 456-7890",
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
    expectedCloseDate: "2025-03-15",
    probability: 40,
    stage: "needs_analysis",
    assignedTo: "rep-003",
    notes:
      "Large chain with 5 locations. Need to understand their specific workflow.",
    createdAt: "2025-01-12T10:00:00Z",
    updatedAt: "2025-01-16T09:00:00Z",
  },
  {
    id: "deal-005",
    leadId: "lead-005",
    facilityName: "Whiskers & Waggs",
    contactPerson: "Lisa Thompson",
    email: "lisa@whiskerswaggs.com",
    phone: "(555) 567-8901",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-customer-management",
      "module-communication",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-02-20",
    probability: 50,
    stage: "qualification",
    assignedTo: "rep-002",
    notes: "Initial call completed. Scheduling demo for next week.",
    createdAt: "2025-01-14T13:00:00Z",
    updatedAt: "2025-01-14T13:30:00Z",
  },
  {
    id: "deal-006",
    leadId: "lead-006",
    facilityName: "Furry Friends Boarding",
    contactPerson: "James Wilson",
    email: "james@furryfriends.com",
    phone: "(555) 678-9012",
    expectedTier: "beginner",
    modulesInterested: ["module-booking", "module-communication"],
    estimatedMonthlyValue: 29,
    estimatedAnnualValue: 299,
    expectedCloseDate: "2025-01-25",
    probability: 10,
    stage: "closed_lost",
    assignedTo: "rep-001",
    notes: "Chose competitor due to lower pricing. May revisit in 6 months.",
    createdAt: "2025-01-02T09:00:00Z",
    updatedAt: "2025-01-18T11:00:00Z",
  },
  {
    id: "deal-007",
    leadId: "lead-007",
    facilityName: "Canine Castle",
    contactPerson: "Amanda Foster",
    email: "amanda@caninecastle.com",
    phone: "(555) 789-0123",
    expectedTier: "pro",
    modulesInterested: [
      "module-booking",
      "module-staff-scheduling",
      "module-customer-management",
    ],
    estimatedMonthlyValue: 79,
    estimatedAnnualValue: 849,
    expectedCloseDate: "2025-03-01",
    probability: 65,
    stage: "proposal",
    assignedTo: "rep-003",
    notes: "Custom proposal sent with training package. Very engaged.",
    createdAt: "2025-01-08T15:00:00Z",
    updatedAt: "2025-01-17T12:00:00Z",
  },
  {
    id: "deal-008",
    leadId: "lead-008",
    facilityName: "The Pet Spa",
    contactPerson: "Robert Martinez",
    email: "robert@thepetspa.com",
    phone: "(555) 890-1234",
    expectedTier: "custom",
    modulesInterested: [
      "module-booking",
      "module-grooming-management",
      "module-inventory-management",
      "module-customer-management",
    ],
    estimatedMonthlyValue: 149,
    estimatedAnnualValue: 1599,
    expectedCloseDate: "2025-02-25",
    probability: 70,
    stage: "negotiation",
    assignedTo: "rep-001",
    notes: "Wants custom grooming-focused package. Discussing pricing.",
    createdAt: "2025-01-06T10:00:00Z",
    updatedAt: "2025-01-18T15:00:00Z",
  },
];

// Helper functions
export function getDealById(dealId: string): Deal | undefined {
  return deals.find((deal) => deal.id === dealId);
}

export function getDealsByStage(stage: DealStage): Deal[] {
  return deals.filter((deal) => deal.stage === stage);
}

export function getDealsByAssignee(repId: string): Deal[] {
  return deals.filter((deal) => deal.assignedTo === repId);
}

export function calculatePipelineValue(dealsList: Deal[]): number {
  return dealsList.reduce((sum, deal) => {
    if (deal.stage !== "closed_lost") {
      return sum + deal.estimatedAnnualValue * (deal.probability / 100);
    }
    return sum;
  }, 0);
}

export function getWonDeals(): Deal[] {
  return deals.filter((deal) => deal.stage === "closed_won");
}

export function getLostDeals(): Deal[] {
  return deals.filter((deal) => deal.stage === "closed_lost");
}

export function getActiveDeals(): Deal[] {
  return deals.filter(
    (deal) => deal.stage !== "closed_won" && deal.stage !== "closed_lost",
  );
}
