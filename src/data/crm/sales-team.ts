export interface SalesTeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: "sales_rep" | "sales_manager" | "account_executive";
  department: string;
  status: "active" | "inactive" | "on_leave";
  hireDate: string;
  targets: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  performance: {
    leadsAssigned: number;
    leadsConverted: number;
    dealsWon: number;
    dealsLost: number;
    totalRevenue: number;
    avgDealSize: number;
    conversionRate: number;
    avgTimeToClose: number; // in days
  };
  currentLeads: string[]; // lead IDs
  currentDeals: string[]; // deal IDs
}

export interface TeamGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  period: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string;
  assignedTo: string | "team"; // member ID or "team" for team-wide goals
  status: "on_track" | "at_risk" | "behind" | "completed";
}

export const salesTeamMembers: SalesTeamMember[] = [
  {
    id: "rep-001",
    name: "Sarah Johnson",
    email: "sarah.johnson@petcare.com",
    phone: "+1 (555) 123-4567",
    role: "sales_manager",
    department: "Sales",
    status: "active",
    hireDate: "2023-01-15",
    targets: {
      monthly: 50000,
      quarterly: 150000,
      yearly: 600000,
    },
    performance: {
      leadsAssigned: 45,
      leadsConverted: 18,
      dealsWon: 18,
      dealsLost: 12,
      totalRevenue: 127500,
      avgDealSize: 7083,
      conversionRate: 40,
      avgTimeToClose: 21,
    },
    currentLeads: ["lead-001", "lead-004", "lead-007"],
    currentDeals: ["deal-001", "deal-004"],
  },
  {
    id: "rep-002",
    name: "Michael Chen",
    email: "michael.chen@petcare.com",
    phone: "+1 (555) 234-5678",
    role: "account_executive",
    department: "Sales",
    status: "active",
    hireDate: "2023-06-01",
    targets: {
      monthly: 40000,
      quarterly: 120000,
      yearly: 480000,
    },
    performance: {
      leadsAssigned: 38,
      leadsConverted: 14,
      dealsWon: 14,
      dealsLost: 10,
      totalRevenue: 89600,
      avgDealSize: 6400,
      conversionRate: 36.8,
      avgTimeToClose: 25,
    },
    currentLeads: ["lead-002", "lead-005", "lead-008"],
    currentDeals: ["deal-002", "deal-005"],
  },
  {
    id: "rep-003",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@petcare.com",
    phone: "+1 (555) 345-6789",
    role: "sales_rep",
    department: "Sales",
    status: "active",
    hireDate: "2024-02-15",
    targets: {
      monthly: 30000,
      quarterly: 90000,
      yearly: 360000,
    },
    performance: {
      leadsAssigned: 28,
      leadsConverted: 9,
      dealsWon: 9,
      dealsLost: 8,
      totalRevenue: 52200,
      avgDealSize: 5800,
      conversionRate: 32.1,
      avgTimeToClose: 28,
    },
    currentLeads: ["lead-003", "lead-006", "lead-009"],
    currentDeals: ["deal-003"],
  },
  {
    id: "rep-004",
    name: "David Kim",
    email: "david.kim@petcare.com",
    phone: "+1 (555) 456-7890",
    role: "sales_rep",
    department: "Sales",
    status: "active",
    hireDate: "2024-01-10",
    targets: {
      monthly: 30000,
      quarterly: 90000,
      yearly: 360000,
    },
    performance: {
      leadsAssigned: 32,
      leadsConverted: 11,
      dealsWon: 11,
      dealsLost: 9,
      totalRevenue: 68200,
      avgDealSize: 6200,
      conversionRate: 34.4,
      avgTimeToClose: 24,
    },
    currentLeads: ["lead-010", "lead-011"],
    currentDeals: ["deal-006", "deal-007"],
  },
  {
    id: "rep-005",
    name: "Jessica Martinez",
    email: "jessica.martinez@petcare.com",
    phone: "+1 (555) 567-8901",
    role: "account_executive",
    department: "Sales",
    status: "on_leave",
    hireDate: "2023-09-01",
    targets: {
      monthly: 40000,
      quarterly: 120000,
      yearly: 480000,
    },
    performance: {
      leadsAssigned: 25,
      leadsConverted: 10,
      dealsWon: 10,
      dealsLost: 6,
      totalRevenue: 75000,
      avgDealSize: 7500,
      conversionRate: 40,
      avgTimeToClose: 22,
    },
    currentLeads: [],
    currentDeals: [],
  },
];

export const teamGoals: TeamGoal[] = [
  {
    id: "goal-001",
    title: "Q1 Revenue Target",
    description: "Achieve total team revenue of $500,000 for Q1 2025",
    targetValue: 500000,
    currentValue: 412500,
    period: "quarterly",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    assignedTo: "team",
    status: "on_track",
  },
  {
    id: "goal-002",
    title: "New Enterprise Clients",
    description: "Sign 5 new enterprise-tier clients this quarter",
    targetValue: 5,
    currentValue: 3,
    period: "quarterly",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    assignedTo: "team",
    status: "on_track",
  },
  {
    id: "goal-003",
    title: "Lead Conversion Rate",
    description: "Improve team conversion rate to 40%",
    targetValue: 40,
    currentValue: 36.7,
    period: "quarterly",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    assignedTo: "team",
    status: "at_risk",
  },
  {
    id: "goal-004",
    title: "Monthly Target - Sarah",
    description: "Achieve $50,000 in closed deals",
    targetValue: 50000,
    currentValue: 42500,
    period: "monthly",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    assignedTo: "rep-001",
    status: "on_track",
  },
  {
    id: "goal-005",
    title: "Monthly Target - Michael",
    description: "Achieve $40,000 in closed deals",
    targetValue: 40000,
    currentValue: 28000,
    period: "monthly",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    assignedTo: "rep-002",
    status: "at_risk",
  },
];

// Helper functions
export function getActiveTeamMembers(): SalesTeamMember[] {
  return salesTeamMembers.filter((member) => member.status === "active");
}

export function getTeamTotalRevenue(): number {
  return salesTeamMembers.reduce(
    (sum, member) => sum + member.performance.totalRevenue,
    0,
  );
}

export function getTeamAvgConversionRate(): number {
  const activeMembers = getActiveTeamMembers();
  if (activeMembers.length === 0) return 0;
  const totalRate = activeMembers.reduce(
    (sum, member) => sum + member.performance.conversionRate,
    0,
  );
  return totalRate / activeMembers.length;
}
