"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

type FreshState = "checking" | "ok" | "degraded" | "error";

// Live probe of the real /api/health endpoint, so "API availability" reflects an
// actual check rather than only seed data.
export function StatusFreshness() {
  const [state, setState] = useState<FreshState>("checking");
  const [checkedAt, setCheckedAt] = useState("");

  const runCheck = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as { healthy?: boolean };
      setState(json?.healthy ? "ok" : "degraded");
    } catch {
      setState("error");
    }
    setCheckedAt(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, []);

  // Defer the initial probe out of the effect body (matches system-status-live).
  useEffect(() => {
    const t = setTimeout(() => void runCheck(), 0);
    return () => clearTimeout(t);
  }, [runCheck]);

  function refresh() {
    setState("checking");
    void runCheck();
  }

  const Icon =
    state === "checking"
      ? Loader2
      : state === "ok"
        ? CheckCircle2
        : AlertTriangle;
  const tone =
    state === "ok"
      ? "text-emerald-600"
      : state === "checking"
        ? "text-muted-foreground"
        : "text-amber-600";
  const label =
    state === "checking"
      ? "Running live health check…"
      : state === "ok"
        ? "Live check: API responding normally"
        : state === "degraded"
          ? "Live check: API reported degraded health"
          : "Live check unavailable";

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <Icon
        className={cn("size-3.5", tone, state === "checking" && "animate-spin")}
      />
      <span className={tone}>{label}</span>
      {checkedAt && <span>· checked {checkedAt}</span>}
      <button
        type="button"
        onClick={refresh}
        className="hover:text-foreground ml-1 inline-flex items-center gap-1 underline-offset-2 hover:underline"
      >
        <RefreshCw className="size-3" />
        Refresh
      </button>
    </div>
  );
}
