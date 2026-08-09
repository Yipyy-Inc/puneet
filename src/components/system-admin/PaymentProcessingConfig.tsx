"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Repeat,
  ShieldCheck,
  Smartphone,
  Webhook,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  cloverPlatformQueries,
  type CloverEstateStatus,
} from "@/lib/api/clover-platform";
import { updateCloverConfig, useCloverConfig } from "@/lib/clover-config-store";

// ============================================================================
// Clover, as this deployment is actually configured.
//
// ── WHAT THIS SCREEN USED TO BE ────────────────────────────────────────────
//
// A form. It took a Merchant ID, a Private App Secret and an App ID, wrote all
// three to window.localStorage in plaintext, and toasted "Clover credentials
// saved (encrypted)." Nothing server-side ever read them. Beside it sat a "Test
// Connection" button that slept 500ms and reported success if the three fields
// were non-empty, and a "Send Test Charge of $0.01" button that slept, invented
// `txn_test_<timestamp>` and `refund_test_<timestamp>`, and announced that a
// charge had succeeded and been refunded.
//
// No card was ever charged. That is the most dangerous shape an admin screen
// can take: it is precisely the check somebody runs to convince themselves
// payments work before going live, and it always passes.
//
// The webhook section was wrong in a way that would have failed silently in
// production — it displayed `https://app.yipyy.com/api/clover/webhook`, and the
// route is `/api/webhooks/clover`. An admin who followed it configured Clover
// to POST at a 404. It also offered to "Generate webhook secret", producing a
// `whsec_…` value nothing reads, in a format Clover does not use: Clover does
// not sign deliveries at all, it repeats a static header.
//
// ── WHAT IT IS NOW ─────────────────────────────────────────────────────────
//
// A report. Credentials belong to the deployment, so they are environment
// variables and this screen tells you which ones resolve — never what they are.
// A secret that is not sent to a browser cannot leak from one, which is a
// stronger guarantee than masking it after arrival.
// ============================================================================

const CURRENCY_NOTE =
  "Currency comes from the merchant's own Clover account, per connection — a facility in Canada charges CAD because Clover says so.";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value);
  toast.success(`${label} copied`);
}

/** Set / not set, said plainly. Never a value. */
function StatusLine({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
      </div>
    </div>
  );
}

function EstateCard({
  estate,
  isDefault,
}: {
  estate: CloverEstateStatus;
  isDefault: boolean;
}) {
  const live = estate.environment === "production";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold capitalize">{estate.environment}</p>
        {isDefault && (
          <Badge variant="secondary" className="text-[10px]">
            New connections go here
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            live
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          {live ? "Real cards" : "Test cards only"}
        </Badge>
      </div>

      <div className="space-y-2.5">
        <StatusLine
          ok={estate.configured}
          label={
            estate.configured ? "App credentials resolve" : "No app credentials"
          }
          detail={
            estate.configured
              ? `CLOVER_${estate.environment.toUpperCase()}_APP_ID and _APP_SECRET are both set.`
              : `Set CLOVER_${estate.environment.toUpperCase()}_APP_ID and _APP_SECRET. Until then this estate refuses every payment.`
          }
        />
        <StatusLine
          ok={estate.terminalsEnabled}
          label={
            estate.terminalsEnabled
              ? "Card-present enabled"
              : "Card-present disabled"
          }
          detail={
            estate.terminalsEnabled
              ? "A Remote Application ID is set, so physical terminals can be charged."
              : `Set CLOVER_${estate.environment.toUpperCase()}_REMOTE_APPLICATION_ID. Online payments still work; every terminal call answers 401 without it.`
          }
        />
      </div>

      <div className="flex items-center gap-4 border-t pt-3">
        <div>
          <p className="text-lg font-semibold tabular-nums">
            {estate.connectedFacilities}
          </p>
          <p className="text-muted-foreground text-xs">
            {estate.connectedFacilities === 1 ? "facility" : "facilities"}{" "}
            connected
          </p>
        </div>
        {estate.facilitiesInError > 0 && (
          <div>
            <p className="text-lg font-semibold text-rose-600 tabular-nums">
              {estate.facilitiesInError}
            </p>
            <p className="text-xs text-rose-600">cannot take a card</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentProcessingConfig() {
  const cfg = useCloverConfig();
  const { data, isPending, error } = useQuery(cloverPlatformQueries.status());

  return (
    <div className="space-y-6">
      {/* 1. Credentials — reported, not edited. */}
      <SectionCard
        icon={KeyRound}
        title="Clover app credentials"
        description="Set where this app is deployed, never in a browser. This screen reports whether they resolve — it is not shown their values."
      >
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">
            {error instanceof Error
              ? error.message
              : "Could not read the configuration."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {data?.estates.map((estate) => (
                <EstateCard
                  key={estate.environment}
                  estate={estate}
                  isDefault={estate.environment === data.defaultEnvironment}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Both estates serve traffic at once. A connection is served by the
              estate it was made against, stored on its own row — so sandbox
              merchants keep working after real ones start connecting, and there
              is always somewhere to test without touching a real card.
            </p>
          </>
        )}
      </SectionCard>

      {/* 2. How a facility connects. */}
      <SectionCard
        icon={ShieldCheck}
        title="How a facility connects"
        description="Each facility authorises Yipyy against their OWN Clover merchant account. Yipyy never holds their card credentials."
      >
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            A facility owner opens their payment settings and authorises through
            Clover. Their access and refresh tokens are stored per facility in
            Supabase Vault and never leave the server.
          </p>
          <p>{CURRENCY_NOTE}</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <a
            href="https://sandbox.dev.clover.com/developers"
            target="_blank"
            rel="noreferrer"
          >
            Clover developer dashboard
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </SectionCard>

      {/* 3. Webhook — the real URL, derived. */}
      <SectionCard
        icon={Webhook}
        title="Webhook"
        description="Paste this into your Clover app's Webhooks settings. It is how the ledger self-corrects when money moves at Clover rather than here."
      >
        <div className="space-y-1.5">
          <Label>Delivery URL</Label>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-xs">
              {data?.webhookUrl ?? "—"}
            </code>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.webhookUrl}
              onClick={() => copy(data!.webhookUrl, "Webhook URL")}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Derived from this deployment&rsquo;s public address, so it cannot
            drift from the route that actually answers.
          </p>
        </div>

        {!isPending && !error && (
          <div className="space-y-1.5">
            <Label>Authentication</Label>
            {data?.webhookAuthConfigured ? (
              <StatusLine
                ok
                label="Auth header configured"
                detail="Deliveries that do not carry the expected X-Clover-Auth value are rejected. Clover does not sign its deliveries — this is a static shared secret repeated on every message."
              />
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    CLOVER_WEBHOOK_SIGNING_SECRET is not set
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    The verification handshake is open so the URL can be
                    verified, and it closes the moment this is set. Set it
                    straight after Clover verifies the endpoint — the code
                    Clover sends is written to payment_webhook_events.outcome,
                    so you can read it out of the database rather than the logs.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 4. Terminals. */}
      <SectionCard
        icon={Smartphone}
        title="Terminals"
        description="A facility's own Clover devices, discovered from their merchant account — nothing to register here."
      >
        <p className="text-muted-foreground text-sm">
          Terminals appear automatically once a facility connects and their
          device runs Cloud Pay Display. Staff name them and pick a default in
          the facility&rsquo;s own settings. Card-present needs the Remote
          Application ID above; without it every terminal call answers 401 while
          online payments carry on working.
        </p>
      </SectionCard>

      {/* 5. Subscription billing — honestly labelled as unwired. */}
      <SectionCard
        icon={Repeat}
        title="Subscription billing"
        description="How Yipyy would invoice facilities for their own subscription. Separate from the payments above, which are a facility charging its customers."
      >
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
          <AlertTriangle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground text-xs">
            Not wired. These preferences persist in this browser and nothing
            reads them — no invoice is generated and no card is charged on a due
            date. They are kept as a record of the intended behaviour rather
            than removed, and are labelled so nobody mistakes them for a live
            setting.
          </p>
        </div>
        <div className="divide-y rounded-lg border opacity-70">
          <ToggleRow
            label="Invoice generation"
            hint="Auto-generate an invoice at the start of each billing cycle"
            checked={cfg.autoInvoice}
            onChange={(v) => updateCloverConfig({ autoInvoice: v })}
          />
          <ToggleRow
            label="Payment collection"
            hint="Auto-charge the card on file on the invoice due date"
            checked={cfg.autoCharge}
            onChange={(v) => updateCloverConfig({ autoCharge: v })}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
