"use client";

import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { roleDisplayNames, type AdminRole } from "@/data/admin-users";
import { useCustomRoles } from "@/lib/custom-roles-store";
import { setMfaRequiredForRole, useSecurity } from "@/lib/security-store";

export function EnforceMfaModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mfaRequiredByRole } = useSecurity();
  const customRoles = useCustomRoles();

  const roles: { id: string; name: string; builtIn: boolean }[] = [
    ...(Object.keys(roleDisplayNames) as AdminRole[]).map((id) => ({
      id,
      name: roleDisplayNames[id],
      builtIn: true,
    })),
    ...customRoles.map((r) => ({ id: r.id, name: r.name, builtIn: false })),
  ];

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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{role.name}</span>
                {!role.builtIn && (
                  <Badge variant="outline" className="text-xs">
                    Custom
                  </Badge>
                )}
              </div>
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
