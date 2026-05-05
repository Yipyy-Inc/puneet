"use client";

import Link from "next/link";
import { Smartphone, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { facilities } from "@/data/facilities";

const facility = facilities.find((f) => f.id === 11);
const credits = (facility as Record<string, unknown>)?.smsCredits as
  | {
      monthlyAllowance: number;
      used: number;
      purchased: number;
      autoReload: boolean;
      autoReloadThreshold: number;
      autoReloadAmount: number;
    }
  | undefined;

const total = credits ? credits.monthlyAllowance + (credits.purchased ?? 0) : 0;
const remaining = credits ? total - credits.used : 0;

const RED_THRESHOLD = 50;
const YELLOW_THRESHOLD = 200;

export function SmsCreditBanner() {
  if (!credits) return null;

  const tone =
    remaining <= RED_THRESHOLD
      ? "red"
      : remaining <= YELLOW_THRESHOLD
        ? "yellow"
        : "neutral";

  const palette =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "yellow"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-700";

  const dot =
    tone === "red"
      ? "bg-red-500"
      : tone === "yellow"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-6 py-2 text-xs",
        palette,
      )}
    >
      <span className={cn("size-2 rounded-full", dot)} />
      <Smartphone className="size-3.5" />
      <span className="font-semibold">SMS Credits:</span>
      <span className="font-bold tabular-nums">
        {remaining.toLocaleString()} of {total.toLocaleString()}
      </span>
      <span className="text-slate-300">·</span>
      <span className="text-slate-500">
        {credits.monthlyAllowance.toLocaleString()} plan + {credits.purchased.toLocaleString()} extra
      </span>

      {tone === "red" && (
        <>
          <AlertTriangle className="ml-2 size-3.5" />
          <span className="font-semibold">
            Critical — messages may fail. Top up now.
          </span>
        </>
      )}
      {tone === "yellow" && (
        <>
          <AlertTriangle className="ml-2 size-3.5" />
          <span className="font-semibold">Running low — consider topping up.</span>
        </>
      )}

      {credits.autoReload && (
        <span className="ml-2 flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
          <RefreshCw className="size-2.5" />
          Auto-reload at {credits.autoReloadThreshold}
        </span>
      )}

      <Link
        href="/facility/dashboard/billing"
        className={cn(
          "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
          tone === "red"
            ? "bg-red-600 text-white hover:bg-red-700"
            : tone === "yellow"
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "bg-slate-900 text-white hover:bg-slate-800",
        )}
      >
        Top up
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
