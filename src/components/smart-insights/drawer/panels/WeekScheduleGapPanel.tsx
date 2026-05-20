"use client";

import { useState } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.2 Take Action — week schedule view with peak days highlighted.
 * Manager adds shifts directly into the peak gaps.
 */

interface PeakDay {
  label: string;
  date: string;
  peakWindow: string;
  bookings: number;
  staff: number;
  needsCoverage: boolean;
}

const WEEK: PeakDay[] = [
  { label: "Mon May 25", date: "2026-05-25", peakWindow: "8:00 – 10:00 AM", bookings: 41, staff: 2, needsCoverage: true },
  { label: "Tue May 26", date: "2026-05-26", peakWindow: "8:00 – 10:00 AM", bookings: 38, staff: 2, needsCoverage: true },
  { label: "Wed May 27", date: "2026-05-27", peakWindow: "8:00 – 10:00 AM", bookings: 35, staff: 2, needsCoverage: true },
  { label: "Thu May 28", date: "2026-05-28", peakWindow: "8:00 – 10:00 AM", bookings: 22, staff: 2, needsCoverage: false },
  { label: "Fri May 29", date: "2026-05-29", peakWindow: "8:00 – 10:00 AM", bookings: 18, staff: 2, needsCoverage: false },
];

export function WeekScheduleGapPanel({
  insight,
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("07:30");
  const [endTime, setEndTime] = useState<string>("10:30");
  const [step, setStep] = useState<"week" | "form" | "confirm">("week");

  const selectedDay = WEEK.find((d) => d.date === selectedDate);
  const eligibleStaff = staffMembers.filter((s) => s.isActive);
  const selectedStaff = eligibleStaff.find((s) => s.id === staffId);

  if (step === "week") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <CalendarRange className="size-3.5" />
            Week of May 25 · {insight.locationName}
          </div>
          <p className="text-muted-foreground text-xs">
            Days with peak-window understaffing are highlighted. Click to add a
            shift.
          </p>
        </div>

        <ul className="space-y-2">
          {WEEK.map((d) => (
            <li
              key={d.date}
              data-needs={d.needsCoverage}
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm data-[needs=true]:border-red-200 data-[needs=true]:bg-red-50/30"
            >
              <div>
                <p className="font-semibold">{d.label}</p>
                <p className="text-muted-foreground text-xs">
                  Peak {d.peakWindow} · {d.bookings} bookings · {d.staff} staff
                </p>
              </div>
              <div className="flex items-center gap-2">
                {d.needsCoverage && (
                  <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800">
                    Gap
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.date);
                    setStep("form");
                  }}
                  className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  <Plus className="size-3" />
                  Add shift
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <DrawerFooter primaryLabel="Close" onPrimary={onCancel} />
        </div>
      </div>
    );
  }

  if (step === "form") {
    const valid = staffId && startTime && endTime && endTime > startTime;
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Adding shift to
          </p>
          <p className="font-semibold">{selectedDay?.label}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wsg-staff">Staff member</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger id="wsg-staff">
              <SelectValue placeholder="Pick a staff member" />
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
            <Label htmlFor="wsg-start">Start</Label>
            <Input
              id="wsg-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wsg-end">End</Label>
            <Input
              id="wsg-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review shift"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!valid}
            secondaryLabel="Back"
            onSecondary={() => setStep("week")}
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
          { field: "Date", to: selectedDay?.label ?? "—" },
          { field: "Location", to: insight.locationName },
          { field: "Staff", to: selectedStaff ? `${selectedStaff.name} (${selectedStaff.role})` : "—" },
          { field: "Time", to: `${startTime} – ${endTime}` },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Save shift"
          onPrimary={() => onComplete()}
          secondaryLabel="Back"
          onSecondary={() => setStep("form")}
        />
      </div>
    </div>
  );
}
