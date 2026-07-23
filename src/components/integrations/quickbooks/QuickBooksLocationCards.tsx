"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings2,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  PAUSE_REASON_TEXT,
  QUICKBOOKS_DISCONNECT_CONFIRMATION,
  useQuickBooksConnections,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { timeAgo } from "@/lib/quickbooks/dashboard-metrics";
import {
  locationConnectionStates,
  rollupLocationConnections,
  type LocationConnectionState,
} from "@/lib/quickbooks/location-scopes";
import { clearQuickBooksMappings } from "@/lib/quickbooks/mappings-store";
import {
  connectQuickBooks,
  reconnectQuickBooks,
} from "@/lib/quickbooks/oauth-mock";
import { clearQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import { resetQuickBooksSetup } from "@/lib/quickbooks/setup-store";

// ============================================================================
// One QuickBooks company per location, on the HQ surface (Section 6B).
//
// Each branch gets its own card because each branch genuinely has its own
// everything: its own OAuth grant, its own chart of accounts, its own mappings.
// The point the layout has to make is that these are INDEPENDENT — one card
// showing "connection expired" next to three showing "syncing" is the whole
// feature, and it is why the status lives on the card rather than in a single
// banner at the top.
// ============================================================================

function StatusBadge({ state }: { state: LocationConnectionState }) {
  const { connection, setupComplete, paused } = state;

  if (connection.status === "disconnected")
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <WifiOff className="size-3" />
        Not connected
      </Badge>
    );

  if (paused)
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="size-3" />
        {connection.status === "expired" ? "Expired" : "Unreachable"}
      </Badge>
    );

  if (!setupComplete)
    return (
      <Badge
        variant="outline"
        className="gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
      >
        Setup unfinished
      </Badge>
    );

  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    >
      <CheckCircle2 className="size-3" />
      Syncing
    </Badge>
  );
}

function LocationCard({
  state,
  onDisconnect,
}: {
  state: LocationConnectionState;
  onDisconnect: (scope: QuickBooksScope, name: string) => void;
}) {
  const { location, scope, connection, setupComplete, paused } = state;
  const [busy, setBusy] = useState(false);

  const configureHref = `/facility/dashboard/settings/integrations/quickbooks?location=${location.id}`;

  async function handleConnect() {
    setBusy(true);
    await connectQuickBooks(scope);
    setBusy(false);
  }

  async function handleReconnect() {
    setBusy(true);
    await reconnectQuickBooks(scope);
    setBusy(false);
  }

  return (
    <Card
      data-status={connection.status}
      className="data-[status=disconnected]:border-border border-amber-500/40 data-[status=connected]:border-emerald-500/25"
    >
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: location.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{location.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {location.shortCode} · {location.city}
            </p>
          </div>
          <StatusBadge state={state} />
        </div>

        {/* Which company this branch's money actually goes to. Naming it is the
            point of the card: two branches pointed at the same company is a
            mistake nobody notices from a status pill. */}
        <div className="text-muted-foreground space-y-0.5 text-xs">
          {connection.status === "disconnected" ? (
            <p>No QuickBooks company connected for this location yet.</p>
          ) : (
            <>
              <p className="text-foreground truncate">
                {connection.companyName ?? "QuickBooks company"}
              </p>
              <p>Last synced: {timeAgo(connection.lastSyncAt)}</p>
            </>
          )}
          {paused && state.pauseReason && (
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {PAUSE_REASON_TEXT[state.pauseReason]} Other locations keep
              syncing.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {connection.status === "disconnected" ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleConnect}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Connect
            </Button>
          ) : (
            <>
              {paused && (
                <Button size="sm" disabled={busy} onClick={handleReconnect}>
                  {busy ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 size-3.5" />
                  )}
                  Reconnect
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={configureHref}>
                  <Settings2 className="mr-1.5 size-3.5" />
                  {setupComplete ? "Mapping & settings" : "Finish setup"}
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => onDisconnect(scope, location.name)}
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickBooksLocationCards({
  facilityId,
}: {
  facilityId: string;
}) {
  // Subscribing to the whole connection store is what makes one card's
  // reconnect re-render its siblings' status without a reload.
  useQuickBooksConnections();
  const states = locationConnectionStates(facilityId);
  const rollup = rollupLocationConnections(states);
  const [confirm, setConfirm] = useState<{
    scope: QuickBooksScope;
    name: string;
  } | null>(null);

  if (states.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This facility has no locations set up yet.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Building2 className="text-muted-foreground size-4" />
            {rollup.connected} of {rollup.total} locations syncing
          </span>
          {rollup.needsAttention > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {rollup.needsAttention} need
              {rollup.needsAttention === 1 ? "s" : ""} attention
            </span>
          )}
          {rollup.notConnected > 0 && (
            <span className="text-muted-foreground">
              {rollup.notConnected} not connected
            </span>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {states.map((state) => (
            <LocationCard
              key={state.location.id}
              state={state}
              onDisconnect={(scope, name) => setConfirm({ scope, name })}
            />
          ))}
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect QuickBooks for {confirm?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {QUICKBOOKS_DISCONNECT_CONFIRMATION} Your other locations are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                // Scope-keyed, so this reaches one location's records only.
                disconnectQuickBooks(confirm.scope);
                clearQuickBooksData(confirm.scope);
                clearQuickBooksMappings(confirm.scope);
                resetQuickBooksSetup(confirm.scope);
                setConfirm(null);
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
