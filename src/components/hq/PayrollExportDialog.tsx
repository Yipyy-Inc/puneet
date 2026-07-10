"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { downloadReportCsv } from "@/lib/report-export";
import type { Location } from "@/types/location";

interface PayrollMember {
  staffId: string;
  name: string;
  role: string;
  upcomingShifts: {
    locationId: string;
    date: string;
    start: string;
    end: string;
  }[];
}

interface Props {
  members: PayrollMember[];
  locations: Location[];
  onOpenChange: (open: boolean) => void;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function shiftHours(start: string, end: string): number {
  return Math.max(0, (toMinutes(end) - toMinutes(start)) / 60);
}

/**
 * Export a payroll-ready CSV of every staff shift worked across all locations
 * for a selected date range. Columns: staff, id, role, location, date, shift,
 * hours — suitable for import into a payroll system.
 */
export function PayrollExportDialog({
  members,
  locations,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(true);

  const allDates = members
    .flatMap((m) => m.upcomingShifts.map((s) => s.date))
    .sort();
  const [from, setFrom] = useState(allDates[0] ?? "");
  const [to, setTo] = useState(allDates[allDates.length - 1] ?? "");

  const locName = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? id;

  const inRange = members.flatMap((m) =>
    m.upcomingShifts.filter((s) => s.date >= from && s.date <= to),
  );
  const totalHours = inRange.reduce(
    (sum, s) => sum + shiftHours(s.start, s.end),
    0,
  );
  const valid = from !== "" && to !== "" && from <= to && inRange.length > 0;

  function close(next: boolean) {
    setOpen(next);
    if (!next) onOpenChange(false);
  }

  function exportCsv() {
    if (!valid) return;
    const header = [
      "Staff",
      "Staff ID",
      "Role",
      "Location",
      "Date",
      "Shift",
      "Hours",
    ];
    const rows = members.flatMap((m) =>
      m.upcomingShifts
        .filter((s) => s.date >= from && s.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => [
          m.name,
          m.staffId,
          m.role,
          locName(s.locationId),
          s.date,
          `${s.start}-${s.end}`,
          shiftHours(s.start, s.end).toFixed(2),
        ]),
    );
    downloadReportCsv(`payroll-${from}_to_${to}`, [header, ...rows]);
    toast.success(
      `Exported ${rows.length} shift rows · ${totalHours.toFixed(1)}h`,
    );
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" />
            Export payroll CSV
          </DialogTitle>
          <DialogDescription>
            Hours worked across all locations for the selected period, ready for
            payroll import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">From</Label>
              <DatePicker
                value={from}
                onValueChange={(v) => setFrom(v)}
                placeholder="Start date"
                max={to || undefined}
                className="h-9 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">To</Label>
              <DatePicker
                value={to}
                onValueChange={(v) => setTo(v)}
                placeholder="End date"
                min={from || undefined}
                className="h-9 w-full"
              />
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
            {valid ? (
              <span>
                <span className="font-semibold tabular-nums">
                  {inRange.length}
                </span>{" "}
                shifts ·{" "}
                <span className="font-semibold tabular-nums">
                  {totalHours.toFixed(1)}
                </span>{" "}
                total hours ·{" "}
                <span className="font-semibold tabular-nums">
                  {members.length}
                </span>{" "}
                staff
              </span>
            ) : (
              <span className="text-muted-foreground">
                {from === "" || to === ""
                  ? "Select a date range to export."
                  : "No shifts in the selected range."}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={exportCsv} disabled={!valid} className="gap-1.5">
            <FileSpreadsheet className="size-4" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
