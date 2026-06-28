"use client";

import { useState } from "react";
import {
  BarChart3,
  Building,
  DollarSign,
  Headphones,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import {
  ALL_PERMISSIONS,
  groupPermissionsByCategory,
} from "@/lib/role-permissions-catalog";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditorMode = "view" | "edit" | "create" | "duplicate";

export interface RoleView {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isCustom: boolean;
  memberCount: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Tenant Management": Building,
  "Commercial & Billing": DollarSign,
  "Platform Control": SlidersHorizontal,
  "Support Operations": Headphones,
  "Team & Access": Users,
  "Reports & Analytics": BarChart3,
  "System & Security": Shield,
};

interface RoleEditorDialogProps {
  state: { mode: EditorMode; role: RoleView | null } | null;
  onClose: () => void;
  onSaveExisting: (role: RoleView, permissions: string[]) => void;
  onCreate: (data: {
    name: string;
    description: string;
    permissions: string[];
  }) => void;
}

export function RoleEditorDialog({
  state,
  onClose,
  onSaveExisting,
  onCreate,
}: RoleEditorDialogProps) {
  return (
    <Dialog
      open={!!state}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] min-w-5xl overflow-y-auto">
        {state && (
          <RoleEditorBody
            key={`${state.mode}-${state.role?.id ?? "new"}`}
            mode={state.mode}
            role={state.role}
            onClose={onClose}
            onSaveExisting={onSaveExisting}
            onCreate={onCreate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleEditorBody({
  mode,
  role,
  onClose,
  onSaveExisting,
  onCreate,
}: {
  mode: EditorMode;
  role: RoleView | null;
  onClose: () => void;
  onSaveExisting: (role: RoleView, permissions: string[]) => void;
  onCreate: (data: {
    name: string;
    description: string;
    permissions: string[];
  }) => void;
}) {
  const isCreate = mode === "create" || mode === "duplicate";
  const editable = mode !== "view";

  const [name, setName] = useState(
    mode === "duplicate" && role
      ? `Copy of ${role.name}`
      : isCreate
        ? ""
        : (role?.name ?? ""),
  );
  const [description, setDescription] = useState(
    mode === "create" ? "" : (role?.description ?? ""),
  );
  const [draft, setDraft] = useState<string[]>(
    mode === "create" ? [] : [...(role?.permissions ?? [])],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const groups = groupPermissionsByCategory();
  const total = ALL_PERMISSIONS.length;

  const toggle = (id: string, checked: boolean) =>
    setDraft((d) =>
      checked ? [...new Set([...d, id])] : d.filter((p) => p !== id),
    );

  const title =
    mode === "create"
      ? "Create Role"
      : mode === "duplicate"
        ? "Duplicate Role"
        : `${role?.name} — ${mode === "edit" ? "Edit Permissions" : "View Permissions"}`;

  const handlePrimary = () => {
    if (isCreate) {
      onCreate({
        name: name.trim(),
        description: description.trim(),
        permissions: draft,
      });
      return;
    }
    if (!role) return;
    // Built-in roles with members get the impact confirmation; otherwise save.
    if (role.memberCount > 0) {
      setConfirmOpen(true);
    } else {
      onSaveExisting(role, draft);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          {title}
        </DialogTitle>
        <DialogDescription>
          {isCreate
            ? "Choose a name and the permissions this role grants."
            : (role?.description ?? "")}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-6">
        {isCreate ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="role-name">
                Role name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Regional Manager"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is responsible for"
              />
            </div>
          </div>
        ) : (
          role && (
            <div className="bg-muted/30 text-muted-foreground flex items-center gap-3 rounded-lg p-4 text-sm">
              <span className="font-medium">
                {role.memberCount}{" "}
                {role.memberCount === 1 ? "member" : "members"}
              </span>
              <span>•</span>
              <span>
                {editable ? draft.length : role.permissions.length} permissions
              </span>
            </div>
          )
        )}

        <div className="space-y-4">
          {groups.map(({ category, perms }) => {
            const CatIcon = CATEGORY_ICONS[category] ?? Settings;
            return (
              <div key={category}>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <CatIcon className="size-4" />
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map((perm) => {
                    const isEnabled = draft.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className={`flex items-center gap-2 rounded-lg p-2 ${
                          isEnabled
                            ? "bg-green-50 dark:bg-green-950/20"
                            : "bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          id={perm.id}
                          checked={isEnabled}
                          disabled={!editable}
                          onCheckedChange={(c) => toggle(perm.id, c === true)}
                        />
                        <label
                          htmlFor={perm.id}
                          className={`text-sm ${
                            isEnabled ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {perm.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {editable && (
          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <p className="text-muted-foreground text-xs">
              {draft.length} of {total} permissions selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePrimary}
                disabled={isCreate && !name.trim()}
                className={
                  isCreate
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : undefined
                }
              >
                {isCreate ? "Create Role" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Member-impact confirmation (built-in roles with assigned members) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Update {role?.name} permissions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will affect {role?.memberCount} team member
              {role?.memberCount === 1 ? "" : "s"} currently assigned to this
              role. Their permissions change immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (role) onSaveExisting(role, draft);
                setConfirmOpen(false);
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
