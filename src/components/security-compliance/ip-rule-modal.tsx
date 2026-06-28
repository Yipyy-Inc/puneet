"use client";

import { useState } from "react";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IPWhitelist } from "@/data/security-compliance";
import type { IpRuleInput } from "@/lib/security-store";

const STATUSES: IPWhitelist["status"][] = ["Active", "Inactive", "Blocked"];

export function IpRuleModal({
  open,
  target,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  target: IPWhitelist | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: IpRuleInput) => void;
}) {
  const isEdit = !!target;
  const [form, setForm] = useState<IpRuleInput>(
    target
      ? {
          ipAddress: target.ipAddress,
          description: target.description,
          status: target.status,
        }
      : { ipAddress: "", description: "", status: "Active" },
  );

  const set = (patch: Partial<IpRuleInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const valid = form.ipAddress.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            {isEdit ? "Edit IP Rule" : "Add IP Address"}
          </DialogTitle>
          <DialogDescription>
            Control access to the platform by IP address or CIDR range.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ip-address">IP address / CIDR</Label>
            <Input
              id="ip-address"
              value={form.ipAddress}
              onChange={(e) => set({ ipAddress: e.target.value })}
              placeholder="203.0.113.0/24"
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ip-description">Description</Label>
            <Input
              id="ip-description"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="e.g. HQ office network"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set({ status: v as IPWhitelist["status"] })}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!valid}
            onClick={() => onSubmit(form)}
          >
            {isEdit ? "Save Changes" : "Add IP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
