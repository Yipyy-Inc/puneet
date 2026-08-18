"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PLATFORM_ROLE_BLURB,
  PLATFORM_ROLE_LABEL,
  revokePlatformInvitation,
  type PlatformTeamRow,
} from "@/lib/api/platform-team";

// ============================================================================
// One person on the platform team, and everything actually known about them.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// `AdminUserModal` — five tabs over the fixture: a login history with invented
// IP addresses, devices and cities, an activity log with severities, a
// permission matrix, a department. None of it had a source; `platform_memberships`
// records a profile, a role, who granted it and when.
//
// So this is short on purpose. Reproducing those tabs against real rows would
// have meant either empty panels or invented ones, and the second is how a
// screen stops being trustworthy for everything else it says.
//
// ── REVOKE IS THE ONE ACTION, AND ONLY FOR AN INVITATION ──────────────────
//
// A pending invitation can be withdrawn — `public.revoke_platform_invitation`,
// superadmin-only, deletes the row and with it the token's only meaning.
//
// Removing a MEMBER is deliberately absent. `public.revoke_platform_role`
// exists and guards the last superadmin, but taking somebody off the platform
// team is not the same act as cancelling an unopened invitation, and giving
// both the same button in the same dialog is how the wrong one gets pressed.
// ============================================================================

interface PlatformMemberSheetProps {
  row: PlatformTeamRow | null;
  onOpenChange: (open: boolean) => void;
  onRevoked: () => void;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function PlatformMemberSheet({
  row,
  onOpenChange,
  onRevoked,
}: PlatformMemberSheetProps) {
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    if (!row) return;
    setRevoking(true);
    try {
      await revokePlatformInvitation(row.id);
      toast.success(`Invitation to ${row.email} revoked`);
      onRevoked();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row?.name ?? row?.email ?? ""}</DialogTitle>
          <DialogDescription>
            {row?.status === "invited"
              ? "Invited, and has not set up their account yet."
              : "On the Yipyy platform team."}
          </DialogDescription>
        </DialogHeader>

        {row && (
          <div className="divide-y">
            <Line label="Email" value={row.email} />
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="text-muted-foreground shrink-0 text-sm">
                Role
              </span>
              <div className="text-right">
                <Badge variant="secondary" className="font-normal">
                  {PLATFORM_ROLE_LABEL[row.role] ?? row.role}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">
                  {PLATFORM_ROLE_BLURB[row.role]}
                </p>
              </div>
            </div>
            <Line
              label={row.status === "invited" ? "Invited" : "Joined"}
              value={new Date(row.since).toLocaleString()}
            />
            {row.invitedByEmail && (
              <Line label="Invited by" value={row.invitedByEmail} />
            )}
            {row.expiresAt && (
              <Line
                label="Link expires"
                value={new Date(row.expiresAt).toLocaleString()}
              />
            )}
          </div>
        )}

        {row?.kind === "invitation" && (
          <Button
            variant="outline"
            onClick={handleRevoke}
            disabled={revoking}
            className="border-red-600/40 text-red-600 hover:bg-red-600/10 hover:text-red-700"
          >
            {revoking ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Revoke this invitation
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
