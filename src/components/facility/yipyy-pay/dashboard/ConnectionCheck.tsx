"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleHelp,
  Loader2,
  ShieldQuestion,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// What this merchant account is actually allowed to do.
//
// ── WHY A BUTTON AND NOT A BADGE ──────────────────────────────────────────
//
// Establishing this costs five round trips to Clover, one of which is a write
// probe. That is not something to run on every render of a settings tab, and a
// permanently-green badge is exactly how people stop reading one. It answers
// when somebody asks.
//
// ── "NOT TESTED" IS A REAL ANSWER AND IS SHOWN AS ONE ─────────────────────
//
// Taking a payment cannot be proved without taking one, so it is reported as
// untested — in grey, with the reason. Rendering it green because the other
// five passed would be inventing a result, which is the failure
// `check:success-claims` exists to catch.
// ============================================================================

type CapabilityState = "ok" | "missing" | "unreachable" | "untested";

interface Capability {
  key: string;
  label: string;
  state: CapabilityState;
  detail: string;
}

interface CapabilityReport {
  environment: "sandbox" | "production" | null;
  merchantId: string | null;
  capabilities: Capability[];
  granted: string[];
}

const ICON: Record<CapabilityState, typeof CheckCircle2> = {
  ok: CheckCircle2,
  missing: XCircle,
  unreachable: TriangleAlert,
  untested: CircleHelp,
};

const TONE: Record<CapabilityState, string> = {
  ok: "text-emerald-600",
  missing: "text-red-600",
  unreachable: "text-amber-600",
  untested: "text-muted-foreground",
};

export function ConnectionCheck() {
  const check = useMutation({
    mutationFn: async (): Promise<CapabilityReport> => {
      const response = await fetch("/api/payments/clover/capabilities", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | (CapabilityReport & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(
          payload?.error ?? "The connection could not be checked.",
        );
      }
      return payload;
    },
  });

  const report = check.data;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Connection check</p>
            <p className="text-muted-foreground text-sm">
              Asks Clover what this account is permitted to do. Takes no money
              and stores no card.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => check.mutate()}
            disabled={check.isPending}
          >
            {check.isPending ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <ShieldQuestion className="mr-2 size-3.5" />
            )}
            {check.isPending ? "Checking…" : "Check now"}
          </Button>
        </div>

        {check.error && (
          <p className="text-destructive text-sm" role="alert">
            {check.error.message}
          </p>
        )}

        {report && (
          <div className="space-y-3">
            {/* Which estate this is. A facility taking test cards while
                believing it is live is the most expensive possible confusion
                on this screen, so the environment is stated, not implied. */}
            <p className="text-muted-foreground text-xs">
              Merchant {report.merchantId ?? "—"} ·{" "}
              {report.environment === "production" ? (
                "live"
              ) : (
                <span className="font-semibold text-amber-600">
                  sandbox — test cards only, no real money moves
                </span>
              )}
            </p>

            <ul className="space-y-2">
              {report.capabilities.map((capability) => {
                const Icon = ICON[capability.state];
                return (
                  <li key={capability.key} className="flex items-start gap-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        TONE[capability.state],
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{capability.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {capability.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
