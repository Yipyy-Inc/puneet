import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Plug } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// What the merchant sees when they come back from Clover.
//
// Five outcomes, and they are deliberately not collapsed into "worked" and
// "didn't". Each one has a different next action, and a page that says "an
// error occurred" for all four failures makes the person guess which.
//
// A server component: there is nothing interactive here, and the connection has
// already happened by the time this renders.
// ============================================================================

export type CloverOutcome =
  | { kind: "connected"; merchantId: string; environment: string }
  | { kind: "not-connected"; lastError: string | null }
  | { kind: "failed"; title: string; detail: string }
  | { kind: "signed-out" }
  | { kind: "unconfigured" };

function Shell({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center p-6">
      <Card className="w-full border-0 shadow-lg">
        <CardHeader>
          <div
            className={`mb-2 flex size-11 items-center justify-center rounded-xl ${tone}`}
          >
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && (
          <CardContent className="space-y-3">{children}</CardContent>
        )}
      </Card>
    </div>
  );
}

export function CloverResult({ outcome }: { outcome: CloverOutcome }) {
  if (outcome.kind === "connected") {
    return (
      <Shell
        icon={<CheckCircle2 className="size-5 text-white" />}
        tone="bg-emerald-600"
        title="Clover is connected"
        description="Card payments for this facility will go through this merchant account."
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Merchant</span>
            <span className="font-mono">{outcome.merchantId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Environment</span>
            <Badge
              variant="outline"
              className={
                outcome.environment === "production"
                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 text-amber-700 dark:text-amber-300"
              }
            >
              {outcome.environment}
            </Badge>
          </div>
        </div>
        {outcome.environment === "sandbox" && (
          <p className="text-muted-foreground text-xs">
            This is a sandbox merchant. Cards are simulated and no money moves.
          </p>
        )}
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href="/facility/dashboard">Back to your dashboard</Link>
        </Button>

        {/* ── A CONNECTED FACILITY COULD NOT CHANGE ITS MERCHANT ────────────
            The connect link only existed in the not-connected branch, so the
            first account a facility chose was the only one it could ever have.
            That is not an edge case: picking the wrong merchant from Clover's
            list, moving to a new merchant account, or replacing a revoked one
            are all ordinary, and every one of them ended here with no way
            forward and nothing explaining why. */}
        <div className="space-y-2 border-t pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/api/payments/clover/connect">
              Connect a different merchant account
            </Link>
          </Button>
          <p className="text-muted-foreground text-xs/relaxed">
            This replaces the account above, so new payments go to the new one.
            Payments already taken stay where they were taken and are not moved.
          </p>
        </div>
      </Shell>
    );
  }

  if (outcome.kind === "not-connected") {
    return (
      <Shell
        icon={<Plug className="size-5 text-white" />}
        tone="bg-slate-600"
        title="No Clover account connected"
        description="Connect a Clover merchant account to take card payments through Yipyy."
      >
        {outcome.lastError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
            The last attempt reported: {outcome.lastError}
          </p>
        )}
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href="/api/payments/clover/connect">Connect Clover</Link>
        </Button>
      </Shell>
    );
  }

  if (outcome.kind === "signed-out") {
    return (
      <Shell
        icon={<CreditCard className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Sign in to manage payments"
        description="Connecting a merchant account decides where your money lands, so it is limited to a facility's owner or administrator."
      >
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </Shell>
    );
  }

  if (outcome.kind === "unconfigured") {
    return (
      <Shell
        icon={<AlertTriangle className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Payments are not set up on this deployment"
        description="Yipyy has no Clover credentials configured, so no facility can connect an account here. Nothing is wrong with your merchant."
      />
    );
  }

  return (
    <Shell
      icon={<AlertTriangle className="size-5 text-white" />}
      tone="bg-amber-600"
      title={outcome.title}
      description={outcome.detail}
    >
      <Button asChild variant="outline" className="w-full">
        <Link href="/facility/dashboard/billing/payment-settings">
          Back to payment settings
        </Link>
      </Button>
    </Shell>
  );
}
