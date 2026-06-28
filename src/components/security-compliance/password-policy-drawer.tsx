"use client";

import { useState } from "react";

import { Key } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { PasswordPolicy } from "@/data/security-compliance";

const REQUIREMENTS: {
  key: keyof Pick<
    PasswordPolicy,
    | "requireUppercase"
    | "requireLowercase"
    | "requireNumbers"
    | "requireSpecialChars"
  >;
  label: string;
}[] = [
  { key: "requireUppercase", label: "Require uppercase letter" },
  { key: "requireLowercase", label: "Require lowercase letter" },
  { key: "requireNumbers", label: "Require number" },
  { key: "requireSpecialChars", label: "Require special character" },
];

const NUMBERS: {
  key: keyof Pick<
    PasswordPolicy,
    | "minLength"
    | "expirationDays"
    | "preventReuse"
    | "maxAttempts"
    | "lockoutDuration"
  >;
  label: string;
}[] = [
  { key: "minLength", label: "Minimum length" },
  { key: "expirationDays", label: "Expires after (days)" },
  { key: "preventReuse", label: "Prevent reuse (last N)" },
  { key: "maxAttempts", label: "Max failed attempts" },
  { key: "lockoutDuration", label: "Lockout duration (min)" },
];

const STATUSES: PasswordPolicy["status"][] = ["Active", "Inactive", "Draft"];

export function PasswordPolicyDrawer({
  policy,
  onOpenChange,
  onSave,
}: {
  policy: PasswordPolicy | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<PasswordPolicy>) => void;
}) {
  const [form, setForm] = useState<PasswordPolicy | null>(policy);

  const set = (patch: Partial<PasswordPolicy>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <Sheet open={!!policy} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Edit Password Policy
          </SheetTitle>
          <SheetDescription>{form?.policyName}</SheetDescription>
        </SheetHeader>

        {form && (
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="grid gap-1.5">
              <Label htmlFor="policy-name">Policy name</Label>
              <Input
                id="policy-name"
                value={form.policyName}
                onChange={(e) => set({ policyName: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-desc">Description</Label>
              <Input
                id="policy-desc"
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {NUMBERS.map((n) => (
                <div key={n.key} className="grid gap-1.5">
                  <Label htmlFor={`policy-${n.key}`}>{n.label}</Label>
                  <Input
                    id={`policy-${n.key}`}
                    type="number"
                    min={0}
                    value={form[n.key]}
                    onChange={(e) =>
                      set({
                        [n.key]: Number(e.target.value),
                      } as Partial<PasswordPolicy>)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {REQUIREMENTS.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <Label htmlFor={`policy-${r.key}`} className="cursor-pointer">
                    {r.label}
                  </Label>
                  <Switch
                    id={`policy-${r.key}`}
                    checked={form[r.key]}
                    onCheckedChange={(v) =>
                      set({ [r.key]: v } as Partial<PasswordPolicy>)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  set({ status: v as PasswordPolicy["status"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => {
              if (form) onSave(form.id, form);
            }}
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
