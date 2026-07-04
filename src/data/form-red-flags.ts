import type { RedFlagConfig } from "@/types/forms";

// ── Configurable red-flag mapping for the intake-safety notification ─────────
// Editable in Settings → Form Notifications → "Configure red-flag keywords and
// responses". Replaces the previously opaque, hardcoded definition.

export const redFlagConfig: RedFlagConfig = {
  keywords: ["aggression", "bite", "bitten", "seizure", "allergic reaction"],
  rules: [],
};

export function getRedFlagConfig(): RedFlagConfig {
  return redFlagConfig;
}

export function saveRedFlagConfig(next: RedFlagConfig): RedFlagConfig {
  redFlagConfig.keywords = next.keywords.map((k) => k.trim()).filter(Boolean);
  redFlagConfig.rules = next.rules.map((r) => ({ ...r }));
  return redFlagConfig;
}
