"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  platformCommunicationQueries,
  useVerifyTwilio,
  type TwilioVerification,
} from "@/lib/api/platform-communication";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================================================
// Yipyy's own Twilio account, as it actually is.
//
// This card used to be a form. It took an Account SID and an Auth Token, wrote
// them to a store in the browser, said "Stored securely" underneath, and had a
// Save button that toasted success and saved nothing. Its "Test Connection"
// returned true whenever both fields were non-empty — so it passed against a
// token revoked months ago, and against the placeholder credentials the store
// shipped with.
//
// Credentials are environment variables now, so there is nothing here to edit
// and the fields are gone rather than disabled. What remains is the two things
// a platform admin actually needs: what this deployment is pointed at, and
// whether Twilio agrees.
// ============================================================================

export function TwilioIntegrationCard() {
  const { data, isPending } = useQuery(platformCommunicationQueries.status());
  const verify = useVerifyTwilio();

  const configured = data?.configured ?? false;
  const result: TwilioVerification | undefined = verify.data;

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-wash-error text-destructive flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Phone className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Twilio</h2>
              <Badge variant="secondary">Calling &amp; Messaging</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              The platform account: the support line, and the authority to give
              each facility a number of its own.
            </p>
          </div>
          {isPending ? (
            <Skeleton className="ml-auto h-6 w-28 rounded-full" />
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "ml-auto gap-1",
                configured
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "border-muted bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  configured ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
              {configured ? "Configured" : "Not configured"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {!isPending && !configured && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium">
                This deployment has no Twilio credentials.
              </p>
              <p className="text-muted-foreground text-xs">
                Set <code className="font-mono">TWILIO_ACCOUNT_SID</code> and{" "}
                <code className="font-mono">TWILIO_AUTH_TOKEN</code> in the
                environment and redeploy. They are not editable here — they
                belong to the deployment, not to whoever is signed in.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="Account SID"
            value={data?.accountSid ?? null}
            pending={isPending}
            hint="An identifier, not a credential — it appears in every Twilio API path."
          />
          <ReadOnlyField
            label="Platform sending number"
            value={data?.sendingNumber ?? null}
            pending={isPending}
            hint="Used when no facility is involved, such as status-page alerts."
          />
        </div>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ShieldCheck className="size-3.5 shrink-0" />
          The auth token is held on the server and is never sent to this page,
          in any form.
        </p>

        {/* Facility lines */}
        <div className="space-y-2">
          <Label>Facility lines</Label>
          {isPending ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <LineCount
                label="Connected"
                value={data?.facilityLines.connected ?? 0}
                tone="emerald"
              />
              <LineCount
                label="In error"
                value={data?.facilityLines.inError ?? 0}
                tone="rose"
              />
              <LineCount
                label="Suspended"
                value={data?.facilityLines.suspended ?? 0}
                tone="muted"
              />
              <LineCount
                label="Pending"
                value={data?.facilityLines.pending ?? 0}
                tone="muted"
              />
            </div>
          )}
        </div>

        {/* Webhook URLs */}
        <div className="space-y-2">
          <Label>Twilio webhook URLs</Label>
          <p className="text-muted-foreground text-xs">
            Paste these into the number&apos;s configuration in the Twilio
            console.
          </p>
          {!isPending && data && !data.webhooksReachable && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span>
                These are not HTTPS, so Twilio cannot reach them. Outbound calls
                and messages still work; nothing inbound will ever arrive.
              </span>
            </div>
          )}
          {isPending ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <WebhookRow
                label="Inbound Voice"
                url={data?.webhooks.inboundVoice ?? ""}
                hint="→ IVR menu & support queue"
              />
              <WebhookRow
                label="Outbound / Dialer"
                url={data?.webhooks.outboundDial ?? ""}
                hint="→ Bridges an outbound call"
              />
              <WebhookRow
                label="Status Callback"
                url={data?.webhooks.statusCallback ?? ""}
                hint="Call progress events"
              />
              <WebhookRow
                label="Recording"
                url={data?.webhooks.recording ?? ""}
                hint="Recording & transcription ready"
              />
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="space-y-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => {
              verify.mutate(undefined, {
                onSuccess: (r) => {
                  if (r.ok) toast.success("Twilio accepted the credentials");
                  else toast.error(r.error ?? "Twilio refused the credentials");
                },
                onError: (e) =>
                  toast.error(
                    e instanceof Error ? e.message : "Verification failed",
                  ),
              });
            }}
            disabled={verify.isPending}
          >
            {verify.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            {verify.isPending ? "Asking Twilio…" : "Test connection"}
          </Button>

          {result && (
            <div
              role="status"
              className={cn(
                "rounded-lg border p-3 text-sm",
                result.ok
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10",
              )}
            >
              {result.ok ? (
                <div className="space-y-0.5">
                  <p className="font-medium">
                    Twilio answered as{" "}
                    <span className="font-mono">
                      {result.friendlyName ?? "this account"}
                    </span>
                    .
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Account status: {result.accountStatus ?? "unknown"}
                    {result.accountType ? ` · ${result.accountType}` : ""}
                    {/* A trial account authenticates perfectly and will only
                        message numbers verified by hand, so it is worth naming
                        rather than reporting as a clean pass. */}
                    {result.accountType?.toLowerCase() === "trial" &&
                      " — a trial account only messages numbers you have verified in the console."}
                  </p>
                </div>
              ) : (
                <p>{result.error ?? "Twilio refused the credentials."}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyField({
  label,
  value,
  pending,
  hint,
}: {
  label: string;
  value: string | null;
  pending: boolean;
  hint: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {pending ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : (
        <div className="bg-muted/40 rounded-md border px-3 py-2 font-mono text-sm">
          {value ?? (
            <span className="text-muted-foreground font-sans">Not set</span>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-[11px]">{hint}</p>
    </div>
  );
}

function LineCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "muted";
}) {
  return (
    <div className="rounded-lg border p-2.5">
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
          // Zero is the good number here, so it should not shout in red.
          tone === "rose" && value > 0 && "text-rose-600 dark:text-rose-400",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function WebhookRow({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            toast.success("Webhook URL copied");
          }}
          aria-label={`Copy ${label} URL`}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
      <p className="text-muted-foreground truncate font-mono text-[11px]">
        {url}
      </p>
      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
        <Check className="size-2.5 text-emerald-500" />
        {hint}
      </p>
    </div>
  );
}
