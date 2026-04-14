"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookmarkPlus,
  Calendar,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/shift-recurrence";
import type { ScheduleShift, Department } from "@/types/scheduling";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ScheduleShift[];
  department: Department;
  dateRangeLabel: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  shifts,
  department,
  dateRangeLabel,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Separate assigned vs unassigned shifts
  const assignedShifts = shifts.filter((s) => !!s.employeeId);
  const unassignedCount = shifts.length - assignedShifts.length;

  // Summary stats
  const uniqueEmployees = new Set(assignedShifts.map((s) => s.employeeId)).size;
  const activeDays = new Set(
    assignedShifts.map((s) => parseLocalDate(s.date).getDay()),
  );

  const handleSave = () => {
    if (!name.trim()) return;

    // In a real app this would persist to a store/API.
    // For the mock layer we just show a success toast.
    toast.success(`Template "${name}" saved`, {
      description: `${assignedShifts.length} shifts saved. Find it on the Templates page.`,
      action: {
        label: "View Templates",
        onClick: () => {
          window.location.href =
            "/facility/dashboard/services/scheduling/templates";
        },
      },
    });

    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-500">
              <BookmarkPlus className="size-4 text-white" />
            </div>
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save the current schedule as a reusable template for future weeks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Source info */}
          <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Saving from
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                style={{
                  borderColor: department.color,
                  color: department.color,
                }}
                className="text-[11px]"
              >
                {department.name}
              </Badge>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Calendar className="size-3" /> {dateRangeLabel}
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {assignedShifts.length} shifts
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {uniqueEmployees} employees
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {activeDays.size} days
              </span>
            </div>

            {/* Day dots */}
            <div className="flex gap-1 pt-0.5">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div
                  key={day}
                  className={`flex size-7 items-center justify-center rounded-sm text-[10px] font-medium ${
                    activeDays.has(day)
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {DAY_NAMES[day]}
                </div>
              ))}
            </div>
          </div>

          {/* Unassigned notice */}
          {unassignedCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {unassignedCount} unassigned open shift
                {unassignedCount !== 1 ? "s" : ""} will not be included —
                templates capture assigned shifts only.
              </p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label>
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regular Week, Holiday Schedule…"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">
              Description{" "}
              <span className="text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || assignedShifts.length === 0}
            className="bg-linear-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-600 hover:to-indigo-600"
          >
            <BookmarkPlus className="mr-1.5 size-4" />
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
