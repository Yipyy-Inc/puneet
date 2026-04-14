"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type {
  ScheduleShift,
  ScheduleEmployee,
  Position,
} from "@/types/scheduling";

interface AssignShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ScheduleShift | null;
  employees: ScheduleEmployee[];
  positions: Position[];
  onAssign: (shiftId: string, employeeId: string | undefined) => void;
}

export function AssignShiftDialog({
  open,
  onOpenChange,
  shift,
  employees,
  positions,
  onAssign,
}: AssignShiftDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<string>("__open__");

  useEffect(() => {
    if (shift) {
      setSelectedEmployeeId(shift.employeeId ?? "__open__");
    }
  }, [shift]);

  if (!shift) return null;

  const position = positions.find((p) => p.id === shift.positionId);
  const isCurrentlyAssigned = !!shift.employeeId;

  const handleSave = () => {
    const empId =
      selectedEmployeeId === "__open__" ? undefined : selectedEmployeeId;
    onAssign(shift.id, empId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyAssigned ? "Reassign Shift" : "Assign Employee"}
          </DialogTitle>
        </DialogHeader>

        {/* Shift info */}
        <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
          <div className="flex items-center gap-2">
            {position && (
              <div
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: position.color }}
              />
            )}
            <span className="text-sm font-medium">
              {position?.name ?? "Unknown Position"}
            </span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              {shift.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {shift.date} · {shift.startTime} – {shift.endTime}
            {shift.breakMinutes > 0 && ` · ${shift.breakMinutes}min break`}
          </p>
          {shift.notes && (
            <p className="text-muted-foreground text-xs italic">
              {shift.notes}
            </p>
          )}
        </div>

        {/* Employee picker */}
        <div className="space-y-2">
          <Label>Assign to</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__open__">
                <span className="text-amber-600">Open Shift (unassigned)</span>
              </SelectItem>
              {employees
                .filter((e) => e.status === "active")
                .map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={emp.avatar} alt={emp.name} />
                        <AvatarFallback className="text-[9px]">
                          {emp.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{emp.name}</span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        {emp.role}
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isCurrentlyAssigned ? "Reassign" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
