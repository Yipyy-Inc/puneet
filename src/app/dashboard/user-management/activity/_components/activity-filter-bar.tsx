"use client";

import { Search, X } from "lucide-react";

import type { ActivityFilters } from "@/lib/api/team-activity";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
  members: string[];
  actionTypes: string[];
}

export function ActivityFilterBar({
  filters,
  onChange,
  members,
  actionTypes,
}: ActivityFilterBarProps) {
  const set = (patch: Partial<ActivityFilters>) =>
    onChange({ ...filters, ...patch });

  const active =
    filters.member !== "all" ||
    filters.actionType !== "all" ||
    filters.facility.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "";

  return (
    <div className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3">
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-xs">Team Member</Label>
        <Select
          value={filters.member}
          onValueChange={(v) => set({ member: v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Team Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-xs">Action Type</Label>
        <Select
          value={filters.actionType}
          onValueChange={(v) => set({ actionType: v })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Action Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Action Types</SelectItem>
            {actionTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-xs">Target Facility</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            value={filters.facility}
            onChange={(e) => set({ facility: e.target.value })}
            placeholder="Search facility…"
            aria-label="Search target facility"
            className="w-[180px] pl-8"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-xs">From</Label>
        <DatePicker
          value={filters.from || undefined}
          onValueChange={(v) => set({ from: v })}
          placeholder="Start date"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-xs">To</Label>
        <DatePicker
          value={filters.to || undefined}
          onValueChange={(v) => set({ to: v })}
          placeholder="End date"
        />
      </div>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              member: "all",
              actionType: "all",
              facility: "",
              from: "",
              to: "",
            })
          }
        >
          <X className="mr-1 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
