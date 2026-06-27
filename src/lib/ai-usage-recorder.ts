import { facilities } from "@/data/facilities";
import { estimateCost } from "@/data/ai-settings";
import type { AiUsageRecord } from "@/types/ai-settings";

// Server-side recorder for REAL Anthropic API usage. The AI routes call
// recordAiUsage() with the token counts returned on each Messages API response;
// GET /api/ai/usage exposes the records, which the admin console merges onto the
// seeded baseline. In-memory (no DB) — shared across API routes in one process.

let liveRecords: AiUsageRecord[] = [];
let seq = 0;

export function recordAiUsage(input: {
  facilityId?: number;
  type: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): AiUsageRecord {
  const facility =
    input.facilityId != null
      ? facilities.find((f) => f.id === input.facilityId)
      : undefined;
  const record: AiUsageRecord = {
    id: `live-${Date.now()}-${seq++}`,
    facilityId: input.facilityId ?? 0,
    facilityName: facility?.name ?? "Platform",
    timestamp: new Date().toISOString(),
    type: input.type,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.inputTokens + input.outputTokens,
    model: input.model,
    cost: estimateCost(input.model, input.inputTokens, input.outputTokens),
  };
  // Newest first; cap to keep memory bounded.
  liveRecords = [record, ...liveRecords].slice(0, 500);
  return record;
}

export function getLiveAiUsage(): AiUsageRecord[] {
  return liveRecords;
}
