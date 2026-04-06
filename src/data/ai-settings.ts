import type {
  AiPlatformConfig,
  AiFacilityConfig,
  AiUsageRecord,
  AiFacilityUsageSummary,
} from "@/types/ai-settings";

// ── Platform-level config ────────────────────────────────────────────────────

export const aiPlatformConfig: AiPlatformConfig = {
  platformApiKey: "", // Set via super admin, stored securely
  defaultModel: "claude-haiku-4-5-20251001",
  enabled: true,
  maxTokensPerRequest: 500,
  defaultMonthlyLimit: 50000,
};

// ── Per-facility configs ─────────────────────────────────────────────────────

export const aiFacilityConfigs: AiFacilityConfig[] = [
  {
    facilityId: 11,
    facilityName: "PawCare Facility",
    customApiKey: "",
    enabled: true,
    monthlyTokenLimit: 50000,
    tone: "warm",
    enabledFeatures: {
      evaluationSummaries: true,
      reportCardSummaries: true,
      chatReplies: true,
      emailMarketing: true,
      incidentNotes: true,
      generalNotes: true,
    },
  },
  {
    facilityId: 12,
    facilityName: "Happy Paws Daycare",
    customApiKey: "",
    enabled: true,
    monthlyTokenLimit: 30000,
    tone: "playful",
    enabledFeatures: {
      evaluationSummaries: true,
      reportCardSummaries: true,
      chatReplies: true,
      emailMarketing: false,
      incidentNotes: true,
      generalNotes: true,
    },
  },
  {
    facilityId: 13,
    facilityName: "Elite Pet Resort",
    customApiKey: "sk-ant-custom-key-for-elite",
    enabled: true,
    monthlyTokenLimit: 100000,
    tone: "professional",
    enabledFeatures: {
      evaluationSummaries: true,
      reportCardSummaries: true,
      chatReplies: true,
      emailMarketing: true,
      incidentNotes: true,
      generalNotes: true,
    },
  },
];

// ── Mock usage records ───────────────────────────────────────────────────────

const HAIKU_INPUT_COST = 0.001; // per 1K tokens
const HAIKU_OUTPUT_COST = 0.005; // per 1K tokens

function estimateCost(input: number, output: number): number {
  return (
    (input / 1000) * HAIKU_INPUT_COST + (output / 1000) * HAIKU_OUTPUT_COST
  );
}

export const aiUsageRecords: AiUsageRecord[] = [
  {
    id: "usage-1",
    facilityId: 11,
    facilityName: "PawCare Facility",
    timestamp: "2026-04-06T09:15:00Z",
    type: "evaluation_summary",
    inputTokens: 850,
    outputTokens: 320,
    totalTokens: 1170,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(850, 320),
  },
  {
    id: "usage-2",
    facilityId: 11,
    facilityName: "PawCare Facility",
    timestamp: "2026-04-06T10:30:00Z",
    type: "report_card_summary",
    inputTokens: 620,
    outputTokens: 180,
    totalTokens: 800,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(620, 180),
  },
  {
    id: "usage-3",
    facilityId: 11,
    facilityName: "PawCare Facility",
    timestamp: "2026-04-06T11:45:00Z",
    type: "chat_reply",
    inputTokens: 380,
    outputTokens: 120,
    totalTokens: 500,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(380, 120),
  },
  {
    id: "usage-4",
    facilityId: 11,
    facilityName: "PawCare Facility",
    timestamp: "2026-04-05T14:20:00Z",
    type: "email_marketing",
    inputTokens: 540,
    outputTokens: 280,
    totalTokens: 820,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(540, 280),
  },
  {
    id: "usage-5",
    facilityId: 12,
    facilityName: "Happy Paws Daycare",
    timestamp: "2026-04-06T08:00:00Z",
    type: "evaluation_summary",
    inputTokens: 900,
    outputTokens: 350,
    totalTokens: 1250,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(900, 350),
  },
  {
    id: "usage-6",
    facilityId: 12,
    facilityName: "Happy Paws Daycare",
    timestamp: "2026-04-05T16:30:00Z",
    type: "chat_reply",
    inputTokens: 290,
    outputTokens: 95,
    totalTokens: 385,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(290, 95),
  },
  {
    id: "usage-7",
    facilityId: 13,
    facilityName: "Elite Pet Resort",
    timestamp: "2026-04-06T12:00:00Z",
    type: "evaluation_summary",
    inputTokens: 780,
    outputTokens: 310,
    totalTokens: 1090,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(780, 310),
  },
  {
    id: "usage-8",
    facilityId: 13,
    facilityName: "Elite Pet Resort",
    timestamp: "2026-04-06T13:15:00Z",
    type: "email_marketing",
    inputTokens: 460,
    outputTokens: 240,
    totalTokens: 700,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(460, 240),
  },
  {
    id: "usage-9",
    facilityId: 13,
    facilityName: "Elite Pet Resort",
    timestamp: "2026-04-05T09:45:00Z",
    type: "report_card_summary",
    inputTokens: 680,
    outputTokens: 200,
    totalTokens: 880,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(680, 200),
  },
  {
    id: "usage-10",
    facilityId: 13,
    facilityName: "Elite Pet Resort",
    timestamp: "2026-04-04T11:00:00Z",
    type: "incident_note",
    inputTokens: 520,
    outputTokens: 190,
    totalTokens: 710,
    model: "claude-haiku-4-5-20251001",
    cost: estimateCost(520, 190),
  },
];

// ── Computed summaries ───────────────────────────────────────────────────────

export function getAiFacilityUsageSummaries(): AiFacilityUsageSummary[] {
  return aiFacilityConfigs.map((config) => {
    const records = aiUsageRecords.filter(
      (r) => r.facilityId === config.facilityId,
    );
    const currentMonth = records.filter((r) => {
      const d = new Date(r.timestamp);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    return {
      facilityId: config.facilityId,
      facilityName: config.facilityName,
      currentMonthTokens: currentMonth.reduce((s, r) => s + r.totalTokens, 0),
      monthlyLimit: config.monthlyTokenLimit,
      totalRequests: records.length,
      estimatedCost: currentMonth.reduce((s, r) => s + r.cost, 0),
      lastUsed: records[0]?.timestamp ?? "",
      usesCustomKey: !!config.customApiKey,
    };
  });
}
