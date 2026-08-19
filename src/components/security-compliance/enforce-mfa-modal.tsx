"use client";

import { ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  PLATFORM_ROLE_LABEL,
  type PlatformRole,
} from "@/lib/auth/platform-role";
import { setMfaRequiredForRole, useSecurity } from "@/lib/security-store";

// The four roles of public.platform_role. This listed five job-flavoured labels
// from src/data/admin-users.ts plus any "custom role" created in this browser's
// localStorage — none of which exist as a role anybody can hold, so the
// switches were keyed to identifiers no member could ever match.
//
// NOTE what is still not true here: `mfaRequiredByRole` is a localStorage
// store. Turning a switch on records a preference and enforces nothing —
// enrolment is WorkOS's to require. Naming the right roles at least means the
// preference is about something real when a server-side rule arrives to read
// it. Recorded in docs/quality/debt-map.md.
const ROLE_ORDER: PlatformRole[] = [
  "superadmin",
  "support",
  "billing",
  "readonly",
];

export function EnforceMfaModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mfaRequiredByRole } = useSecurity();

  const roles = ROLE_ORDER.map((id) => ({
    id,
    name: PLATFORM_ROLE_LABEL[id],
  }));

  const requiredCount = roles.filter((r) => mfaRequiredByRole[r.id]).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Enforce MFA by Role
          </DialogTitle>
          <DialogDescription>
            Members of a role with MFA required must enroll in two-factor
            authentication before they can sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <span className="text-sm font-medium">{role.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {mfaRequiredByRole[role.id] ? "Required" : "Optional"}
                </span>
                <Switch
                  checked={!!mfaRequiredByRole[role.id]}
                  onCheckedChange={(v) => setMfaRequiredForRole(role.id, v)}
                  aria-label={`MFA required for ${role.name}`}
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <span className="text-muted-foreground self-center text-xs">
            {requiredCount} of {roles.length} roles require MFA
          </span>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
