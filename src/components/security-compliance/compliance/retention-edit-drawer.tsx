"use client";

import { useState } from "react";

import { Archive } from "lucide-react";
import { toast } from "sonner";

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
import type { RetentionPolicy } from "@/data/system-administration";
import {
  updateRetentionPolicy,
  type RetentionPatch,
} from "@/lib/compliance-store";

const ACTIONS: RetentionPolicy["action"][] = ["Archive", "Purge", "Anonymize"];
const STATUSES: RetentionPolicy["status"][] = ["Active", "Inactive", "Draft"];

export function RetentionEditDrawer({
  policy,
  onOpenChange,
}: {
  policy: RetentionPolicy | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<RetentionPatch>(
    policy
      ? {
          retentionPeriod: policy.retentionPeriod,
          action: policy.action,
          status: policy.status,
        }
      : {},
  );

  const set = (patch: RetentionPatch) => setForm((f) => ({ ...f, ...patch }));
  const days = form.retentionPeriod ?? 0;

  const save = () => {
    if (!policy) return;
    updateRetentionPolicy(policy.id, form);
    toast.success("Retention policy updated");
    onOpenChange(false);
  };

  return (
    <Sheet open={!!policy} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Archive className="size-5" />
            Edit Retention Policy
          </SheetTitle>
          <SheetDescription>{policy?.policyName}</SheetDescription>
        </SheetHeader>

        {policy && (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            <div>
              <p className="text-muted-foreground text-xs">Data type</p>
              <p className="font-medium">{policy.dataType}</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="retention-period">Retention period (days)</Label>
              <Input
                id="retention-period"
                type="number"
                min={1}
                value={form.retentionPeriod ?? 0}
                onChange={(e) =>
                  set({ retentionPeriod: Number(e.target.value) })
                }
              />
              <p className="text-muted-foreground text-xs">
                ≈ {(days / 365).toFixed(1)} years
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label>Action at end of period</Label>
              <Select
                value={form.action}
                onValueChange={(v) =>
                  set({ action: v as RetentionPolicy["action"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  set({ status: v as RetentionPolicy["status"] })
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
            onClick={save}
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
