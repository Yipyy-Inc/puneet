// Real health checks for the running application. Server-only (uses node:os
// and process). These produce genuine values — process uptime/memory, a real
// data-layer read probe, and real config checks — never hard-coded statuses.

import os from "node:os";

import type { HealthComponent, HealthResponse, HealthStatus } from "./types";

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(s % 60)}s`;
}

function fmtBytes(b: number): string {
  const mb = b / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

/** Measure real CPU utilisation over a short window (% of all cores). */
async function measureCpuPercent(sampleMs = 80): Promise<number> {
  const startUsage = process.cpuUsage();
  const startT = process.hrtime.bigint();
  await new Promise((r) => setTimeout(r, sampleMs));
  const diff = process.cpuUsage(startUsage); // microseconds
  const elapsedUs = Number(process.hrtime.bigint() - startT) / 1000;
  const cores = os.cpus().length || 1;
  const usedUs = diff.user + diff.system;
  const pct = (usedUs / (elapsedUs * cores)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

export async function runHealthChecks(): Promise<HealthResponse> {
  const t0 = Date.now();
  const checkedAt = new Date().toISOString();
  const components: HealthComponent[] = [];

  // --- Application server: real process metrics ---
  const cpuPercent = await measureCpuPercent();
  const mem = process.memoryUsage();
  // Heap utilisation is the actionable memory-pressure signal for a Node
  // process; RSS over total host memory is always a tiny, meaningless fraction.
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 1000) / 10;
  const rssPercent = Math.round((mem.rss / os.totalmem()) * 1000) / 10;
  const memoryPercent = heapPercent;
  const appStatus: HealthStatus =
    cpuPercent > 92 || heapPercent > 95 ? "degraded" : "operational";
  components.push({
    id: "app-server",
    name: "Application Server",
    category: "application",
    status: appStatus,
    detail: `Node ${process.version} · up ${fmtUptime(process.uptime())}`,
    latencyMs: null,
    cpuPercent,
    memoryPercent,
    metrics: [
      { label: "Uptime", value: fmtUptime(process.uptime()) },
      { label: "CPU", value: `${cpuPercent}%` },
      {
        label: "Heap utilisation",
        value: `${fmtBytes(mem.heapUsed)} / ${fmtBytes(mem.heapTotal)} · ${heapPercent}%`,
      },
      { label: "RSS", value: `${fmtBytes(mem.rss)} · ${rssPercent}% of host` },
      { label: "Node", value: process.version },
      { label: "Platform", value: `${os.type()} ${os.arch()}` },
    ],
  });

  // --- Data layer: real read probe. The module is import-cached, so do
  // representative real work each call (read AND serialise every record) so the
  // latency reflects genuine effort, not a no-op cache hit. A single elapsed
  // measurement drives both the status threshold and the reported value.
  const dStart = Date.now();
  try {
    const mod = await import("@/data/facilities");
    const records = Array.isArray(mod.facilities) ? mod.facilities : [];
    let bytes = 0;
    for (const r of records) bytes += JSON.stringify(r).length;
    const dataLatency = Date.now() - dStart;
    components.push({
      id: "data-layer",
      name: "Data Layer",
      category: "data",
      status: dataLatency > 100 ? "degraded" : "operational",
      detail: `${records.length} records (${(bytes / 1024).toFixed(1)} KB) read in ${dataLatency}ms`,
      latencyMs: dataLatency,
      cpuPercent: null,
      memoryPercent: null,
      metrics: [
        { label: "Probe latency", value: `${dataLatency}ms` },
        { label: "Records", value: `${records.length}` },
      ],
    });
  } catch (err) {
    components.push({
      id: "data-layer",
      name: "Data Layer",
      category: "data",
      status: "down",
      detail: `Read failed: ${(err as Error).message}`,
      latencyMs: Date.now() - dStart,
      cpuPercent: null,
      memoryPercent: null,
      metrics: [],
    });
  }

  // --- AI service: real config check (Anthropic API key presence) ---
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  components.push({
    id: "ai-service",
    name: "AI Service (Anthropic)",
    category: "ai",
    status: aiConfigured ? "operational" : "not_configured",
    detail: aiConfigured
      ? "ANTHROPIC_API_KEY present — generation routes enabled"
      : "ANTHROPIC_API_KEY not set — AI routes disabled",
    latencyMs: null,
    cpuPercent: null,
    memoryPercent: null,
    metrics: [
      { label: "API key", value: aiConfigured ? "Configured" : "Not set" },
    ],
  });

  // --- External monitoring provider connection (env-driven) ---
  const providerName = process.env.MONITORING_PROVIDER?.trim() || null;
  const provider = { configured: Boolean(providerName), name: providerName };

  const healthy = components.every(
    (c) => c.status !== "degraded" && c.status !== "down",
  );

  return {
    checkedAt,
    durationMs: Date.now() - t0,
    healthy,
    provider,
    components,
  };
}
