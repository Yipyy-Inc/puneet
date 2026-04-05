"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Plus,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export interface WeatherAlertEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  message: string;
  triggeredAt: string;
  triggeredBy: "current" | "forecast";
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actionsTaken: string[];
  notes?: string;
  autoTasksCreated: string[];
}

// ── Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY = "weather-alert-log";

function loadLog(): WeatherAlertEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WeatherAlertEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(log: WeatherAlertEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export function addAlertToLog(entry: Omit<WeatherAlertEntry, "id">) {
  const log = loadLog();
  // Don't duplicate if same rule triggered in last 30 minutes
  const recent = log.find(
    (e) =>
      e.ruleId === entry.ruleId &&
      Date.now() - new Date(e.triggeredAt).getTime() < 30 * 60 * 1000,
  );
  if (recent) return;
  log.unshift({ ...entry, id: `alert-${Date.now()}` });
  saveLog(log.slice(0, 100)); // keep last 100
}

// ── Component ────────────────────────────────────────────────────────

export function WeatherAlertLog() {
  const [log, setLog] = useState<WeatherAlertEntry[]>(loadLog);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState("");

  const refresh = () => setLog(loadLog());

  const acknowledge = (id: string) => {
    const updated = log.map((e) =>
      e.id === id
        ? {
            ...e,
            acknowledged: true,
            acknowledgedBy: "Staff",
            acknowledgedAt: new Date().toISOString(),
          }
        : e,
    );
    saveLog(updated);
    setLog(updated);
  };

  const addAction = (id: string) => {
    if (!actionDraft.trim()) return;
    const updated = log.map((e) =>
      e.id === id
        ? { ...e, actionsTaken: [...e.actionsTaken, actionDraft.trim()] }
        : e,
    );
    saveLog(updated);
    setLog(updated);
    setActionDraft("");
  };

  const clearOld = () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = log.filter(
      (e) => new Date(e.triggeredAt).getTime() > cutoff,
    );
    saveLog(filtered);
    setLog(filtered);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  if (log.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-8 text-center">
          <History className="text-muted-foreground/30 size-8" />
          <p className="text-muted-foreground mt-2 text-sm">
            No weather alerts recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-200">
            <History className="size-4 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-bold">Alert History</p>
            <p className="text-muted-foreground text-xs">
              {log.length} alert{log.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={clearOld}
        >
          <Trash2 className="mr-1 size-3" />
          Clear 24h+
        </Button>
      </div>

      {log.slice(0, 20).map((entry) => {
        const isExpanded = expanded === entry.id;
        return (
          <Card
            key={entry.id}
            className="overflow-hidden transition-shadow hover:shadow-sm"
          >
            <CardContent className="p-0">
              <div
                className="flex cursor-pointer items-center justify-between px-4 py-3"
                onClick={() => setExpanded(isExpanded ? null : entry.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg ${
                      entry.severity === "critical"
                        ? "bg-red-50"
                        : entry.severity === "warning"
                          ? "bg-amber-50"
                          : "bg-blue-50"
                    }`}
                  >
                    <AlertTriangle
                      className={`size-4 ${
                        entry.severity === "critical"
                          ? "text-red-600"
                          : entry.severity === "warning"
                            ? "text-amber-600"
                            : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{entry.ruleName}</p>
                      <Badge
                        className={`text-[9px] ${
                          entry.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : entry.severity === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {entry.severity}
                      </Badge>
                      {entry.acknowledged && (
                        <Badge className="bg-emerald-100 text-[9px] text-emerald-800">
                          <CheckCircle2 className="mr-0.5 size-2.5" />
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDate(entry.triggeredAt)} at{" "}
                      {formatTime(entry.triggeredAt)}
                      {entry.triggeredBy === "forecast" && " (forecast)"}
                      {entry.autoTasksCreated.length > 0 &&
                        ` · ${entry.autoTasksCreated.length} task${entry.autoTasksCreated.length > 1 ? "s" : ""} created`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!entry.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledge(entry.id);
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground size-4" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-3 border-t bg-slate-50/50 px-4 py-3">
                  <p className="text-xs">{entry.message}</p>

                  {/* Actions taken */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                      Actions Taken
                    </p>
                    {entry.actionsTaken.length === 0 ? (
                      <p className="text-muted-foreground text-[11px] italic">
                        No actions logged yet
                      </p>
                    ) : (
                      entry.actionsTaken.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                          {action}
                        </div>
                      ))
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={actionDraft}
                        onChange={(e) => setActionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addAction(entry.id);
                          }
                        }}
                        placeholder="Log action taken..."
                        className="h-7 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={() => addAction(entry.id)}
                        disabled={!actionDraft.trim()}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Auto tasks */}
                  {entry.autoTasksCreated.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                        Auto-Created Tasks
                      </p>
                      {entry.autoTasksCreated.map((task, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <ClipboardList className="size-3 shrink-0 text-blue-500" />
                          {task}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  {entry.acknowledgedBy && (
                    <p className="text-muted-foreground text-[10px]">
                      Acknowledged by {entry.acknowledgedBy} at{" "}
                      {formatTime(entry.acknowledgedAt!)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
