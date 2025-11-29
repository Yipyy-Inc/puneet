// Customer Acquisition Analytics
interface AcquisitionMetrics {
  period: string;
  totalNewCustomers: number;
  growthRate: number;
  monthlyGrowthRate: number;
  yearlyGrowthRate: number;
  channelBreakdown: {
    channel: string;
    customers: number;
    percentage: number;
    cac: number; // Customer Acquisition Cost
    ltv: number; // Lifetime Value
  }[];
  averageLifetimeValue: number;
  averageRetentionRate: number;
}

// Reservation Analytics
interface SystemReservationMetrics {
  period: string;
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  pendingReservations: number;
  cancellationRate: number;
  completionRate: number;
  averageBookingValue: number;
  totalRevenue: number;
  peakUsageTimes: { timeSlot: string; reservations: number }[];
  trends: { month: string; reservations: number; cancellations: number }[];
}

// Facility Utilization
interface FacilityUtilization {
  id: string;
  facilityId: string;
  facilityName: string;
  period: string;
  totalCapacity: number;
  utilizationRate: number;
  occupancyRate: number;
  averageOccupancy: number;
  peakOccupancy: number;
  resourceEfficiency: number;
  availableHours: number;
  bookedHours: number;
  utilizationTrend: { date: string; rate: number }[];
}

interface UtilizationComparison {
  facilities: {
    facilityId: string;
    facilityName: string;
    utilizationRate: number;
    occupancyRate: number;
    efficiency: number;
  }[];
  systemAverage: number;
  topPerformer: string;
  lowPerformer: string;
}

// Performance Metrics
export interface FacilityPerformance {
  id: string;
  facilityId: string;
  facilityName: string;
  period: string;
  totalRevenue: number;
  revenueGrowth: number;
  monthlyGrowthRate: number;
  yearlyGrowthRate: number;
  staffEfficiency: number;
  customerSatisfaction: number;
  averageResponseTime: number;
  serviceQuality: number;
  employeeCount: number;
  revenuePerEmployee: number;
  customerRetention: number;
  nps: number; // Net Promoter Score
}

interface SystemPerformance {
  period: string;
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  pageLoadTime: number;
  apiResponseTime: number;
  uptimeTrend: { date: string; uptime: number }[];
  errorTrend: { date: string; errors: number }[];
}

// Custom Reports
export interface CustomReport {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  lastRun: string;
  category: "Financial" | "Operations" | "Customer" | "Performance" | "Custom";
  status: "Draft" | "Active" | "Scheduled" | "Archived";
  schedule?: {
    frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly";
    nextRun: string;
    recipients: string[];
  };
  parameters: {
    dateRange: { start: string; end: string };
    facilities: string[];
    metrics: string[];
    groupBy: string;
    filters: Record<string, unknown>;
  };
  visualizations: {
    type: "Table" | "Line Chart" | "Bar Chart" | "Pie Chart" | "Area Chart";
    title: string;
    dataSource: string;
  }[];
  exportFormats: ("PDF" | "Excel" | "CSV" | "JSON")[];
}

export const acquisitionMetrics: AcquisitionMetrics = {
  period: "2025-11",
  totalNewCustomers: 1250,
  growthRate: 18.5,
  monthlyGrowthRate: 12.3,
  yearlyGrowthRate: 145.2,
  channelBreakdown: [
    {
      channel: "Social Media",
      customers: 385,
      percentage: 30.8,
      cac: 45,
      ltv: 2400,
    },
    {
      channel: "Referral",
      customers: 325,
      percentage: 26.0,
      cac: 25,
      ltv: 2800,
    },
    {
      channel: "Paid Ads",
      customers: 275,
      percentage: 22.0,
      cac: 75,
      ltv: 2200,
    },
    {
      channel: "Organic Search",
      customers: 165,
      percentage: 13.2,
      cac: 35,
      ltv: 2500,
    },
    { channel: "Direct", customers: 80, percentage: 6.4, cac: 20, ltv: 2600 },
    { channel: "Other", customers: 20, percentage: 1.6, cac: 50, ltv: 1800 },
  ],
  averageLifetimeValue: 2450,
  averageRetentionRate: 84.5,
};

export const systemReservationMetrics: SystemReservationMetrics = {
  period: "2025-11",
  totalReservations: 8290,
  completedReservations: 7461,
  cancelledReservations: 746,
  pendingReservations: 83,
  cancellationRate: 9.0,
  completionRate: 90.0,
  averageBookingValue: 118,
  totalRevenue: 978220,
  peakUsageTimes: [
    { timeSlot: "9:00 AM", reservations: 1245 },
    { timeSlot: "2:00 PM", reservations: 1132 },
    { timeSlot: "5:00 PM", reservations: 1089 },
    { timeSlot: "11:00 AM", reservations: 956 },
  ],
  trends: [
    { month: "Jan", reservations: 642, cancellations: 68 },
    { month: "Feb", reservations: 698, cancellations: 72 },
    { month: "Mar", reservations: 745, cancellations: 75 },
    { month: "Apr", reservations: 812, cancellations: 78 },
    { month: "May", reservations: 856, cancellations: 82 },
    { month: "Jun", reservations: 923, cancellations: 85 },
    { month: "Jul", reservations: 987, cancellations: 89 },
    { month: "Aug", reservations: 945, cancellations: 86 },
    { month: "Sep", reservations: 912, cancellations: 83 },
    { month: "Oct", reservations: 967, cancellations: 88 },
    { month: "Nov", reservations: 1024, cancellations: 92 },
    { month: "Dec", reservations: 1089, cancellations: 95 },
  ],
};

export const facilityUtilization: FacilityUtilization[] = [
  {
    id: "fu-1",
    facilityId: "1",
    facilityName: "Pawsome Care NYC",
    period: "2025-11",
    totalCapacity: 50,
    utilizationRate: 78.5,
    occupancyRate: 82.3,
    averageOccupancy: 41,
    peakOccupancy: 48,
    resourceEfficiency: 85.2,
    availableHours: 3600,
    bookedHours: 2826,
    utilizationTrend: [
      { date: "Week 1", rate: 75.2 },
      { date: "Week 2", rate: 78.8 },
      { date: "Week 3", rate: 80.1 },
      { date: "Week 4", rate: 79.3 },
    ],
  },
  {
    id: "fu-2",
    facilityId: "2",
    facilityName: "Happy Tails LA",
    period: "2025-11",
    totalCapacity: 45,
    utilizationRate: 72.8,
    occupancyRate: 76.5,
    averageOccupancy: 34,
    peakOccupancy: 43,
    resourceEfficiency: 81.3,
    availableHours: 3240,
    bookedHours: 2359,
    utilizationTrend: [
      { date: "Week 1", rate: 70.5 },
      { date: "Week 2", rate: 72.2 },
      { date: "Week 3", rate: 74.8 },
      { date: "Week 4", rate: 73.7 },
    ],
  },
  {
    id: "fu-3",
    facilityId: "3",
    facilityName: "Pet Paradise Miami",
    period: "2025-11",
    totalCapacity: 60,
    utilizationRate: 85.2,
    occupancyRate: 88.7,
    averageOccupancy: 53,
    peakOccupancy: 58,
    resourceEfficiency: 89.5,
    availableHours: 4320,
    bookedHours: 3681,
    utilizationTrend: [
      { date: "Week 1", rate: 83.5 },
      { date: "Week 2", rate: 85.8 },
      { date: "Week 3", rate: 86.9 },
      { date: "Week 4", rate: 84.6 },
    ],
  },
];

export const utilizationComparison: UtilizationComparison = {
  facilities: [
    {
      facilityId: "3",
      facilityName: "Pet Paradise Miami",
      utilizationRate: 85.2,
      occupancyRate: 88.7,
      efficiency: 89.5,
    },
    {
      facilityId: "1",
      facilityName: "Pawsome Care NYC",
      utilizationRate: 78.5,
      occupancyRate: 82.3,
      efficiency: 85.2,
    },
    {
      facilityId: "2",
      facilityName: "Happy Tails LA",
      utilizationRate: 72.8,
      occupancyRate: 76.5,
      efficiency: 81.3,
    },
  ],
  systemAverage: 78.8,
  topPerformer: "Pet Paradise Miami",
  lowPerformer: "Happy Tails LA",
};

export const facilityPerformance: FacilityPerformance[] = [
  {
    id: "fp-1",
    facilityId: "1",
    facilityName: "Pawsome Care NYC",
    period: "2025-11",
    totalRevenue: 145000,
    revenueGrowth: 12.5,
    monthlyGrowthRate: 8.2,
    yearlyGrowthRate: 98.5,
    staffEfficiency: 87.5,
    customerSatisfaction: 4.6,
    averageResponseTime: 2.3,
    serviceQuality: 92.5,
    employeeCount: 24,
    revenuePerEmployee: 6041,
    customerRetention: 88.5,
    nps: 72,
  },
  {
    id: "fp-2",
    facilityId: "2",
    facilityName: "Happy Tails LA",
    period: "2025-11",
    totalRevenue: 132000,
    revenueGrowth: 10.8,
    monthlyGrowthRate: 7.5,
    yearlyGrowthRate: 89.2,
    staffEfficiency: 84.2,
    customerSatisfaction: 4.5,
    averageResponseTime: 2.5,
    serviceQuality: 90.2,
    employeeCount: 22,
    revenuePerEmployee: 6000,
    customerRetention: 86.2,
    nps: 68,
  },
  {
    id: "fp-3",
    facilityId: "3",
    facilityName: "Pet Paradise Miami",
    period: "2025-11",
    totalRevenue: 168000,
    revenueGrowth: 15.2,
    monthlyGrowthRate: 10.5,
    yearlyGrowthRate: 125.8,
    staffEfficiency: 91.8,
    customerSatisfaction: 4.8,
    averageResponseTime: 1.8,
    serviceQuality: 95.2,
    employeeCount: 28,
    revenuePerEmployee: 6000,
    customerRetention: 92.5,
    nps: 78,
  },
];

export const systemPerformance: SystemPerformance = {
  period: "2025-11",
  systemUptime: 99.8,
  averageResponseTime: 245,
  errorRate: 0.12,
  totalRequests: 1245000,
  successfulRequests: 1243506,
  failedRequests: 1494,
  activeUsers: 8540,
  totalSessions: 45230,
  averageSessionDuration: 18.5,
  pageLoadTime: 1.2,
  apiResponseTime: 185,
  uptimeTrend: [
    { date: "Week 1", uptime: 99.9 },
    { date: "Week 2", uptime: 99.8 },
    { date: "Week 3", uptime: 99.7 },
    { date: "Week 4", uptime: 99.9 },
  ],
  errorTrend: [
    { date: "Week 1", errors: 342 },
    { date: "Week 2", errors: 385 },
    { date: "Week 3", errors: 428 },
    { date: "Week 4", errors: 339 },
  ],
};

export const customReports: CustomReport[] = [
  {
    id: "cr-1",
    name: "Monthly Revenue Summary",
    description:
      "Comprehensive revenue analysis across all facilities with growth trends",
    createdBy: "Admin User",
    createdAt: "2025-10-15",
    lastRun: "2025-11-26",
    category: "Financial",
    status: "Active",
    schedule: {
      frequency: "Monthly",
      nextRun: "2025-12-01",
      recipients: ["admin@pawsome.com", "finance@pawsome.com"],
    },
    parameters: {
      dateRange: { start: "2025-11-01", end: "2025-11-30" },
      facilities: ["1", "2", "3"],
      metrics: ["revenue", "growth", "transactions"],
      groupBy: "facility",
      filters: { status: "active" },
    },
    visualizations: [
      {
        type: "Line Chart",
        title: "Revenue Trend",
        dataSource: "revenue_data",
      },
      {
        type: "Bar Chart",
        title: "Facility Comparison",
        dataSource: "facility_revenue",
      },
    ],
    exportFormats: ["PDF", "Excel"],
  },
  {
    id: "cr-2",
    name: "Customer Acquisition Report",
    description: "Track new customer sign-ups and acquisition channels",
    createdBy: "Marketing Team",
    createdAt: "2025-10-20",
    lastRun: "2025-11-25",
    category: "Customer",
    status: "Active",
    schedule: {
      frequency: "Weekly",
      nextRun: "2025-12-02",
      recipients: ["marketing@pawsome.com"],
    },
    parameters: {
      dateRange: { start: "2025-11-01", end: "2025-11-30" },
      facilities: ["all"],
      metrics: ["new_customers", "channels", "ltv"],
      groupBy: "channel",
      filters: {},
    },
    visualizations: [
      {
        type: "Pie Chart",
        title: "Channel Distribution",
        dataSource: "acquisition_channels",
      },
      {
        type: "Area Chart",
        title: "Sign-up Trends",
        dataSource: "signup_trends",
      },
    ],
    exportFormats: ["PDF", "CSV"],
  },
  {
    id: "cr-3",
    name: "System Performance Dashboard",
    description: "Monitor system health, uptime, and performance metrics",
    createdBy: "IT Team",
    createdAt: "2025-09-10",
    lastRun: "2025-11-27",
    category: "Performance",
    status: "Active",
    schedule: {
      frequency: "Daily",
      nextRun: "2025-11-28",
      recipients: ["it@pawsome.com", "ops@pawsome.com"],
    },
    parameters: {
      dateRange: { start: "2025-11-27", end: "2025-11-27" },
      facilities: ["all"],
      metrics: ["uptime", "response_time", "error_rate"],
      groupBy: "hour",
      filters: {},
    },
    visualizations: [
      {
        type: "Line Chart",
        title: "Uptime Monitoring",
        dataSource: "uptime_data",
      },
      {
        type: "Bar Chart",
        title: "Error Distribution",
        dataSource: "error_data",
      },
    ],
    exportFormats: ["PDF", "JSON"],
  },
];
