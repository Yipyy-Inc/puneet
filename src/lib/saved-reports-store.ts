"use client";

import { useSyncExternalStore } from "react";

import type { ReportConfig } from "@/lib/report-data-sources";

// Persisted saved-report configurations for the custom Report Builder.
// localStorage + BroadcastChannel, mirroring the other module stores.

export interface SavedReport {
  id: string;
  name: string;
  config: ReportConfig;
  createdAt: string;
  updatedAt: string;
  lastRun: string | null;
}

const STORAGE_KEY = "yipyy-saved-reports";
const CHANNEL = "yipyy-saved-reports";

let reports: SavedReport[] = [];
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
const EMPTY: SavedReport[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) reports = JSON.parse(raw) as SavedReport[];
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
}

function commit(broadcast: boolean) {
  persist();
  emit();
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "sync" });
  }
}

export function createSavedReport(
  name: string,
  config: ReportConfig,
): SavedReport {
  ensureReady();
  const now = new Date().toISOString();
  const report: SavedReport = {
    id: `report_${Date.now()}`,
    name: name.trim() || "Untitled Report",
    config,
    createdAt: now,
    updatedAt: now,
    lastRun: null,
  };
  reports = [report, ...reports];
  commit(true);
  return report;
}

export function updateSavedReport(
  id: string,
  patch: Partial<Pick<SavedReport, "name" | "config" | "lastRun">>,
) {
  ensureReady();
  reports = reports.map((r) =>
    r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
  );
  commit(true);
}

export function markReportRun(id: string) {
  ensureReady();
  const now = new Date().toISOString();
  reports = reports.map((r) => (r.id === id ? { ...r, lastRun: now } : r));
  commit(true);
}

export function deleteSavedReport(id: string) {
  ensureReady();
  reports = reports.filter((r) => r.id !== id);
  commit(true);
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SavedReport[] {
  return reports;
}

function getServerSnapshot(): SavedReport[] {
  return EMPTY;
}

export function useSavedReports(): SavedReport[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
