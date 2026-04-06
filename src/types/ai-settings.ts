// AI integration settings for multi-tenant platform

export interface AiPlatformConfig {
  /** Platform-level Anthropic API key (Yipyy's master key) */
  platformApiKey: string;
  /** Default model for all facilities */
  defaultModel: string;
  /** Whether AI features are enabled platform-wide */
  enabled: boolean;
  /** Max tokens per request */
  maxTokensPerRequest: number;
  /** Default monthly token limit per facility */
  defaultMonthlyLimit: number;
}

export interface AiFacilityConfig {
  facilityId: number;
  facilityName: string;
  /** Override: facility's own API key (BYOK). Empty = use platform key */
  customApiKey: string;
  /** Whether AI is enabled for this facility */
  enabled: boolean;
  /** Monthly token limit (0 = unlimited) */
  monthlyTokenLimit: number;
  /** Preferred AI tone */
  tone: "warm" | "professional" | "playful";
  /** Which AI features are enabled */
  enabledFeatures: {
    evaluationSummaries: boolean;
    reportCardSummaries: boolean;
    chatReplies: boolean;
    emailMarketing: boolean;
    incidentNotes: boolean;
    generalNotes: boolean;
  };
}

export interface AiUsageRecord {
  id: string;
  facilityId: number;
  facilityName: string;
  timestamp: string;
  type: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: number; // estimated USD
}

export interface AiFacilityUsageSummary {
  facilityId: number;
  facilityName: string;
  currentMonthTokens: number;
  monthlyLimit: number;
  totalRequests: number;
  estimatedCost: number;
  lastUsed: string;
  usesCustomKey: boolean;
}
