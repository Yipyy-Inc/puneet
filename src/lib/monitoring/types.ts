// Shared view-model types for the live system-status page. Kept free of any
// Node-only imports so client components can import them with `import type`.

export type HealthStatus =
  | "operational"
  | "degraded"
  | "down"
  | "not_configured";

export interface HealthMetric {
  label: string;
  value: string;
}

export interface HealthComponent {
  id: string;
  name: string;
  category: "application" | "data" | "ai" | "infrastructure";
  status: HealthStatus;
  detail: string;
  /** Probe latency in ms, when applicable. */
  latencyMs: number | null;
  /** Real CPU usage %, when applicable (application only). */
  cpuPercent: number | null;
  /** Real memory usage %, when applicable (application only). */
  memoryPercent: number | null;
  metrics: HealthMetric[];
}

export interface HealthResponse {
  checkedAt: string; // ISO
  durationMs: number;
  /** True when no component is degraded or down. */
  healthy: boolean;
  /** External monitoring provider connection (env-driven). */
  provider: { configured: boolean; name: string | null };
  components: HealthComponent[];
}

/** One accumulated real sample for a component's live trend chart. */
export interface TrendSample {
  t: string; // local time label
  cpu: number | null;
  mem: number | null;
  latency: number | null;
}
