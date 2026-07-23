"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  disconnectQuickBooks,
  useQuickBooksConnection,
  QUICKBOOKS_DISCONNECT_CONFIRMATION,
  QUICKBOOKS_EXPIRED_BANNER,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { reconnectQuickBooks } from "@/lib/quickbooks/oauth-mock";
import { clearQuickBooksData } from "@/lib/quickbooks/qb-data-cache";

import { QuickBooksEntryPoint } from "./QuickBooksEntryPoint";

// Section 3A RULE: the entry point is a PRE-connection screen. Once a facility
// has connected, this route is their integration surface, not a sales pitch.
//
// The full management dashboard — status header, KPI tiles, sync activity log,
// error panel, manage-mappings — is Phase 5. Until then a connected facility
// gets the connection facts that already exist rather than a mock dashboard
// standing in for one.

function ConnectedSummary({ scope }: { scope: QuickBooksScope }) {
  const connection = useQuickBooksConnection(scope);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const expired = connection.status === "expired";
  const outage = connection.status === "outage";

  async function handleReconnect() {
    setBusy(true);
    await reconnectQuickBooks(scope);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {expired && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 font-medium">
            {QUICKBOOKS_EXPIRED_BANNER}
          </p>
          <Button size="sm" onClick={handleReconnect} disabled={busy}>
            {busy && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Reconnect
          </Button>
        </div>
      )}

      {outage && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <WifiOff className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            Can&apos;t reach QuickBooks right now. Syncing is paused — nothing
            has failed, and queued entries will send once it responds.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">
              {connection.companyName ?? "QuickBooks Online"}
            </CardTitle>
            <Badge
              variant="outline"
              className={
                connection.status === "connected"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }
            >
              {connection.status === "connected" ? (
                <CheckCircle2 className="mr-1 size-3" />
              ) : (
                <AlertTriangle className="mr-1 size-3" />
              )}
              {connection.status === "connected"
                ? "Connected"
                : expired
                  ? "Expired"
                  : "Paused"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Company</dt>
              <dd className="font-medium">{connection.companyName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Currency</dt>
              <dd className="font-medium">
                {connection.companyCurrency ?? "—"}
                {connection.companyCountry
                  ? ` · ${connection.companyCountry}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Company ID</dt>
              <dd className="font-mono text-xs">{connection.realmId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Last synced</dt>
              <dd className="font-medium">
                {connection.lastSyncAt
                  ? new Date(connection.lastSyncAt).toLocaleString()
                  : "Not yet"}
              </dd>
            </div>
          </dl>

          <p className="text-muted-foreground bg-muted/40 rounded-md border p-3 text-xs">
            Setup and the sync dashboard — mapping, activity log and sync
            settings — aren&apos;t built yet. This page will host them.
          </p>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
            <AlertDialogDescription>
              {QUICKBOOKS_DISCONNECT_CONFIRMATION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                disconnectQuickBooks(scope);
                // The cached chart of accounts belongs to the company that was
                // just released; keeping it would let the next connect open on
                // another company's accounts.
                clearQuickBooksData(scope);
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function QuickBooksIntegrationView({
  scope,
}: {
  scope: QuickBooksScope;
}) {
  const connection = useQuickBooksConnection(scope);

  // "Never connected" is the only state the pitch belongs in. An expired or
  // interrupted connection is still a connection — showing the sales page there
  // would lose the facility their mappings and their reconnect path.
  if (connection.status === "disconnected") {
    return <QuickBooksEntryPoint scope={scope} />;
  }
  return <ConnectedSummary scope={scope} />;
}
