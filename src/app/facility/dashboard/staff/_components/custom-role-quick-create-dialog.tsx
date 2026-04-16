"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Sparkles, Users, SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  ACCENT_CHOICES,
  AccentPicker,
  PermissionsGrid,
} from "@/components/facility/FacilityRolesStudio";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import {
  ALWAYS_ON_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_META,
  ROLE_PRESETS,
  type AccessScope,
  type CustomFacilityRole,
  type FacilityStaffRole,
  type PermissionKey,
} from "@/types/facility-staff";

interface CustomRoleQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Fired after the role is created. Use this to auto-assign it to the staff draft. */
  onCreated: (role: CustomFacilityRole) => void;
}

export function CustomRoleQuickCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CustomRoleQuickCreateDialogProps) {
  const { createCustomRole } = useFacilityRbac();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(ACCENT_CHOICES[0].accent);
  const [ring, setRing] = useState(ACCENT_CHOICES[0].ring);
  const [copyFrom, setCopyFrom] = useState<"blank" | FacilityStaffRole>(
    "blank",
  );
  const [permissions, setPermissions] = useState<
    Partial<Record<PermissionKey, AccessScope>>
  >(() => Object.fromEntries(ALWAYS_ON_PERMISSIONS.map((p) => [p, "anytime"])));
  const [tuneOpen, setTuneOpen] = useState(false);

  function reset() {
    setLabel("");
    setDescription("");
    setAccent(ACCENT_CHOICES[0].accent);
    setRing(ACCENT_CHOICES[0].ring);
    setCopyFrom("blank");
    setPermissions(
      Object.fromEntries(ALWAYS_ON_PERMISSIONS.map((p) => [p, "anytime"])),
    );
    setTuneOpen(false);
  }

  function onCopyFromChange(value: "blank" | FacilityStaffRole) {
    setCopyFrom(value);
    if (value === "blank") {
      setPermissions(
        Object.fromEntries(ALWAYS_ON_PERMISSIONS.map((p) => [p, "anytime"])),
      );
    } else {
      const next: Partial<Record<PermissionKey, AccessScope>> = {};
      for (const [k, scope] of ROLE_PRESETS[value].permissions) {
        next[k] = scope;
      }
      setPermissions(next);
    }
  }

  function submit() {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error("Role name is required");
      return;
    }
    const created = createCustomRole({
      label: trimmed,
      description: description.trim(),
      accent,
      ring,
      icon: "Sparkles",
      permissions,
    });
    toast.success(`${trimmed} role created and assigned`);
    onCreated(created);
    onOpenChange(false);
    reset();
  }

  const grantedCount = Object.keys(permissions).length;
  const totalPerms = PERMISSION_GROUPS.reduce(
    (n, g) => n + g.permissions.length,
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
        style={{ maxWidth: "min(56rem, 95vw)" }}
      >
        <DialogHeader className="bg-card/50 border-b px-6 py-4 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm">
              <Sparkles className="size-4" />
            </span>
            Create a custom role
          </DialogTitle>
          <DialogDescription>
            Build a role tailored to your facility — like &ldquo;Runner&rdquo;,
            &ldquo;Helper&rdquo;, or &ldquo;Shift Lead&rdquo;. Start from a
            preset or blank, then mix and match permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Role name</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Runner, Shift Lead, Senior Groomer"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Start from</Label>
              <Select
                value={copyFrom}
                onValueChange={(v) =>
                  onCopyFromChange(v as "blank" | FacilityStaffRole)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3" /> Blank (core permissions
                      only)
                    </span>
                  </SelectItem>
                  {(Object.keys(ROLE_META) as FacilityStaffRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3" /> Copy from{" "}
                        {ROLE_META[r].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this role do? e.g. Helps reception with checkouts and assists kennel team with feedings."
            />
          </div>

          <div>
            <Label className="text-xs">Accent color</Label>
            <AccentPicker
              accent={accent}
              onChange={(a, r) => {
                setAccent(a);
                setRing(r);
              }}
            />
          </div>

          <Separator />

          <div>
            <button
              type="button"
              onClick={() => setTuneOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-all hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary rounded-lg p-1.5">
                  <SlidersHorizontal className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    Fine-tune permissions
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {grantedCount} of {totalPerms} permissions granted · Click
                    to mix and match
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`size-4 transition-transform ${tuneOpen ? "rotate-180" : ""}`}
              />
            </button>

            {tuneOpen && (
              <div className="mt-3">
                <PermissionsGrid
                  getValue={(key) => permissions[key] ?? "none"}
                  onChange={(key, value) => {
                    setPermissions((prev) => {
                      const next = { ...prev };
                      if (value === "none" || value === "preset" || value === "revoked") {
                        delete next[key];
                      } else {
                        next[key] = value;
                      }
                      return next;
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Plus className="size-3.5" /> Create &amp; assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
