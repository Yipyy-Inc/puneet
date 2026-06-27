import { facilities } from "@/data/facilities";
import type { AiPlatformConfig, AiFacilityConfig } from "@/types/ai-settings";

// ── Platform-level config ────────────────────────────────────────────────────

export const aiPlatformConfig: AiPlatformConfig = {
  platformApiKey: "", // Set via super admin, stored securely
  defaultModel: "claude-haiku-4-5-20251001",
  enabled: true,
  maxTokensPerRequest: 500,
  defaultMonthlyLimit: 50000,
};

// ── Per-model pricing (per 1K tokens) ────────────────────────────────────────
// Matches Anthropic list pricing per-MTok: Haiku $1/$5, Sonnet $3/$15, Opus $5/$25.
export const AI_PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 0.001, output: 0.005 },
  "claude-haiku-4-5": { input: 0.001, output: 0.005 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "claude-opus-4-6": { input: 0.005, output: 0.025 },
  "claude-opus-4-8": { input: 0.005, output: 0.025 },
};
const DEFAULT_PRICE = { input: 0.001, output: 0.005 };

/** Estimated USD cost for a request, priced by the model that served it. */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = AI_PRICING[model] ?? DEFAULT_PRICE;
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}

// ── Per-facility configs (derived from the real facility roster) ─────────────

function stableInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (Math.abs(h) % (max - min + 1));
}

const TONES: AiFacilityConfig["tone"][] = ["warm", "professional", "playful"];
const LIMITS = [30000, 50000, 100000];

// A deterministic ~3/4 of real facilities have AI enabled (these are the
// "facilities using AI"). The rest have no AI config.
export const aiFacilityConfigs: AiFacilityConfig[] = facilities
  .filter((f) => stableInt(`ai-on-${f.id}`, 0, 3) !== 0)
  .map((f) => ({
    facilityId: f.id,
    facilityName: f.name,
    customApiKey:
      stableInt(`byok-${f.id}`, 0, 5) === 0 ? "sk-ant-byok-•••" : "",
    enabled: true,
    monthlyTokenLimit: LIMITS[stableInt(`lim-${f.id}`, 0, LIMITS.length - 1)],
    tone: TONES[stableInt(`tone-${f.id}`, 0, TONES.length - 1)],
    enabledFeatures: {
      evaluationSummaries: true,
      reportCardSummaries: true,
      chatReplies: true,
      emailMarketing: stableInt(`em-${f.id}`, 0, 1) === 1,
      incidentNotes: true,
      generalNotes: stableInt(`gn-${f.id}`, 0, 3) !== 0,
    },
  }));

export { stableInt };
