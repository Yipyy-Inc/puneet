"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Users, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffMembers } from "@/data/staff";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.1 Take Action — pre-filtered to the specific understaffed date.
 * Manager adds a shift for a staff member without leaving Smart Insights.
 * Per spec § 10.3, scheduling mutations require a confirmation step.
 */

// The mock insight 3.1 targets Saturday May 24, 2026.
const TARGET_DATE_LABEL = "Saturday, May 24, 2026";
const TARGET_DATE_ISO = "2026-05-24";

export function AddShiftPanel({ insight, onComplete, onCancel }: InsightPanelProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [staffId, setStaffId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("16:00");

  const eligibleStaff = staffMembers.filter(
    (s) => s.isActive && s.role !== "Administrator",
  );
  const selectedStaff = eligibleStaff.find((s) => s.id === staffId);

  const formValid =
    staffId !== "" && startTime !== "" && endTime !== "" && endTime > startTime;

  if (step === "form") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <ContextCard />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Link
              href={insightLinks.schedule(TARGET_DATE_ISO)}
              className="bg-muted/40 hover:border-primary/40 hover:bg-primary/5 flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
            >
              <Calendar className="text-muted-foreground size-4" />
              <span className="font-medium">{TARGET_DATE_LABEL}</span>
              <ExternalLink className="text-muted-foreground ml-auto size-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-select">Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Pick a staff member to add to this shift" />
              </SelectTrigger>
              <SelectContent>
                {eligibleStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review shift"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!formValid}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <ConfirmBeforeModify
        title="Confirm new shift"
        changes={[
          { field: "Date", to: TARGET_DATE_LABEL },
          { field: "Location", to: insight.locationName },
          {
            field: "Staff",
            to: selectedStaff ? `${selectedStaff.name} (${selectedStaff.role})` : "—",
          },
          { field: "Start", to: startTime },
          { field: "End", to: endTime },
        ]}
        note={`This adds the shift to the published schedule for ${TARGET_DATE_ISO}. The Understaffing Risk insight will resolve once the ratio is back within limits.`}
      />

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Save shift"
          onPrimary={() => onComplete()}
          onSecondary={() => setStep("form")}
          secondaryLabel="Back"
        />
      </div>
    </div>
  );
}

function ContextCard() {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-sm">
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <Users className="size-3.5" />
        Current capacity
      </div>
      <ul className="grid grid-cols-2 gap-y-1 text-sm">
        <li>
          <span className="text-muted-foreground">Bookings:</span>{" "}
          <span className="font-semibold">34</span>
        </li>
        <li>
          <span className="text-muted-foreground">Staff scheduled:</span>{" "}
          <span className="font-semibold">2</span>
        </li>
        <li>
          <span className="text-muted-foreground">Max per staff:</span>{" "}
          <span className="font-semibold">12</span>
        </li>
        <li>
          <span className="text-muted-foreground">Capacity:</span>{" "}
          <span className="font-semibold">24</span>
        </li>
        <li className="col-span-2">
          <span className="text-muted-foreground">Shortfall:</span>{" "}
          <span className="font-semibold text-red-600">10 dogs</span>
        </li>
      </ul>
    </div>
  );
}
