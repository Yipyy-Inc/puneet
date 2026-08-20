"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { terminalQueries } from "@/lib/api/terminals";

// ============================================================================
// Connecting a Clover merchant account, from the facility's own settings.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Nothing, which was the problem. The whole flow already worked —
// /api/payments/clover/connect redirects to Clover's consent screen and /clover
// takes the return leg — but the only way to reach it was to type the URL.
// Reported as "the clover connection is only accessible by link".
//
// The one Clover card that existed lives in the SUPER-ADMIN portal and answers
// a different question: how many facilities across the estate are connected.
// Useful to Yipyy, useless to a facility.
//
// ── THE BUTTON IS A LINK, DELIBERATELY ────────────────────────────────────
//
// `/connect` is a GET that answers 303 to Clover's authorize URL, so an anchor
// is the whole implementation. No fetch, no client-side redirect, no
// window.open for a popup blocker to eat — and the facility id is sealed into a
// signed state server-side, so there is nothing for this component to pass and
// nothing it could pass wrongly.
//
// ── AND IT SAYS WHICH ESTATE ──────────────────────────────────────────────
//
// Sandbox and production are different Clover worlds with different merchants.
// A facility that connects sandbox and then wonders why no money arrives is a
// support ticket nobody can diagnose from a screenshot, so the badge is loud.
// ============================================================================

interface CloverStatus {
  connected: boolean;
  status: "pending" | "connected" | "revoked" | "error" | "none";
  merchantId: string | null;
  environment: string | null;
  currency: string | null;
  country: string | null;
  connectedAt: string | null;
  lastError: string | null;
  configured: boolean;
}

/** Clover's four-leaf mark, drawn rather than imported — no asset to 404. */
function CloverMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <g fill="currentColor">
        <path d="M24 22.5c0-4 .8-7 2.6-8.9 1.7-1.8 4-2.6 6.6-2.6 2.4 0 4.4.7 5.8 2.2 1.4 1.4 2.1 3.2 2.1 5.3 0 2.3-.8 4.2-2.4 5.6-1.6 1.4-3.8 2.1-6.5 2.1H24v-3.7z" />
        <path d="M25.5 24c4 0 7 .8 8.9 2.6 1.8 1.7 2.6 4 2.6 6.6 0 2.4-.7 4.4-2.2 5.8-1.4 1.4-3.2 2.1-5.3 2.1-2.3 0-4.2-.8-5.6-2.4-1.4-1.6-2.1-3.8-2.1-6.5V24h3.7z" />
        <path d="M24 25.5c0 4-.8 7-2.6 8.9-1.7 1.8-4 2.6-6.6 2.6-2.4 0-4.4-.7-5.8-2.2-1.4-1.4-2.1-3.2-2.1-5.3 0-2.3.8-4.2 2.4-5.6 1.6-1.4 3.8-2.1 6.5-2.1H24v3.7z" />
        <path d="M22.5 24c-4 0-7-.8-8.9-2.6-1.8-1.7-2.6-4-2.6-6.6 0-2.4.7-4.4 2.2-5.8C14.6 7.6 16.4 7 18.5 7c2.3 0 4.2.8 5.6 2.4 1.4 1.6 2.1 3.8 2.1 6.5V24h-3.7z" />
      </g>
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
        {n}
      </span>
      <span className="text-muted-foreground text-sm/relaxed">{children}</span>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </p>
      <p className="truncate font-[tabular-nums] text-sm">{value}</p>
    </div>
  );
}

export function FacilityCloverCard() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["clover", "connection"],
    queryFn: async (): Promise<CloverStatus> => {
      const response = await fetch("/api/payments/clover/status");
      if (!response.ok) throw new Error("Could not read the connection.");
      return (await response.json()) as CloverStatus;
    },
    // A facility authorises in another tab and comes back to this one.
    refetchOnWindowFocus: true,
  });

  // Only asked for once connected — an unconnected facility has no devices and
  // the call would just fail quietly behind the scenes.
  const { data: terminals = [] } = useQuery({
    ...terminalQueries.all(),
    enabled: data?.connected === true,
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/payments/clover/disconnect", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not disconnect.");
      }
    },
    onSuccess: () => {
      toast.success("Clover disconnected. Card payments are off.");
      void queryClient.invalidateQueries({ queryKey: ["clover"] });
      void queryClient.invalidateQueries({ queryKey: ["clover-terminals"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const sandbox = data?.environment === "sandbox";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 bg-[#0b8a3d] px-6 py-4 text-white">
        <CloverMark className="size-8 shrink-0" />
        <div className="min-w-0">
          <p className="leading-tight font-semibold">Clover</p>
          <p className="text-xs text-white/80">
            Card payments on your own terminal
          </p>
        </div>
        {data?.connected && (
          <Badge className="ml-auto border-white/30 bg-white/15 text-white hover:bg-white/15">
            Connected
          </Badge>
        )}
      </div>

      <CardHeader className="sr-only">
        <CardTitle>Clover</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-56" />
          </div>
        )}

        {/* The DEPLOYMENT has no Clover app. Said plainly, because otherwise a
            facility presses Connect, gets a 503, and concludes their own Clover
            account is at fault. */}
        {!isPending && data && !data.configured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-sm/relaxed text-amber-900 dark:text-amber-200">
              Card payments are not available on this deployment yet. Nothing is
              wrong with your Clover account — contact Yipyy support.
            </p>
          </div>
        )}

        {!isPending && data?.configured && !data.connected && (
          <>
            <p className="text-muted-foreground text-sm/relaxed">
              Take card payments on the Clover terminal you already own. You
              sign in with your own Clover account — Yipyy never sees your
              password, and you can disconnect at any time.
            </p>

            <ol className="space-y-2.5">
              <Step n={1}>
                Press <strong>Connect your Clover account</strong> below.
              </Step>
              <Step n={2}>
                Sign in at Clover with your merchant email and password.
              </Step>
              <Step n={3}>
                Approve what Clover asks — reading your devices, and taking
                payments.
              </Step>
              <Step n={4}>Clover sends you straight back here, connected.</Step>
            </ol>

            {data.status === "error" && data.lastError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" />
                <p className="text-sm/relaxed text-rose-900 dark:text-rose-200">
                  {data.lastError}
                </p>
              </div>
            )}

            {/* A plain link: /connect is a GET that 303s to Clover. Nothing to
                fetch, nothing a popup blocker can eat. */}
            <Button asChild size="lg" className="gap-2">
              <a href="/api/payments/clover/connect">
                <CreditCard className="size-4" />
                Connect your Clover account
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            </Button>
          </>
        )}

        {!isPending && data?.connected && (
          <>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="text-sm/relaxed">
                Connected to your Clover merchant account. Card payments are
                live on this facility.
              </p>
            </div>

            {sandbox && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p className="text-sm/relaxed text-amber-900 dark:text-amber-200">
                  This is a <strong>sandbox</strong> account. Cards are not
                  really charged and no money reaches your bank. Reconnect with
                  your live Clover account when you are ready to trade.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Detail label="Merchant" value={data.merchantId ?? "—"} />
              <Detail
                label="Environment"
                value={sandbox ? "Sandbox" : "Production"}
              />
              <Detail
                label="Currency"
                value={
                  [data.currency, data.country].filter(Boolean).join(" · ") ||
                  "—"
                }
              />
              <Detail
                label="Connected"
                value={
                  data.connectedAt
                    ? new Date(data.connectedAt).toLocaleDateString("en-CA", {
                        dateStyle: "medium",
                      })
                    : "—"
                }
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="text-muted-foreground size-4" />
                <p className="text-sm font-semibold">
                  Your terminals
                  {terminals.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      ({terminals.length})
                    </span>
                  )}
                </p>
              </div>
              {terminals.length === 0 ? (
                <p className="text-muted-foreground text-sm/relaxed">
                  No card terminal found on this account yet. A device appears
                  here once it is activated and running Cloud Pay Display.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {terminals.map((terminal) => (
                    <li
                      key={terminal.serial}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate">
                        {terminal.label ?? terminal.model ?? "Terminal"}
                        <span className="text-muted-foreground ml-2 font-[tabular-nums] text-xs">
                          {terminal.serial}
                        </span>
                      </span>
                      {/* An unsupported model is a hardware choice, not a fault
                          they can fix here — so it is stated, not hidden behind
                          a generic "not ready". */}
                      {terminal.supported ? (
                        <Badge variant="secondary">Ready</Badge>
                      ) : (
                        <Badge variant="outline">Not supported</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href="/api/payments/clover/connect">
                  Reconnect a different account
                  <ExternalLink className="size-3.5 opacity-70" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-2"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                {disconnect.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Disconnect
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
