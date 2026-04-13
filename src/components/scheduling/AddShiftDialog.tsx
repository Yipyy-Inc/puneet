"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, Briefcase, Calendar, MessageSquare } from "lucide-react";
import type {
  ScheduleEmployee,
  Position,
  ScheduleShift,
} from "@/types/scheduling";

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: ScheduleEmployee[];
  positions: Position[];
  defaultDate?: string;
  defaultEmployeeId?: string;
  editingShift?: ScheduleShift | null;
  onSave: (shift: Omit<ScheduleShift, "id">) => void;
  onDelete?: (shiftId: string) => void;
}

export function AddShiftDialog({
  open,
  onOpenChange,
  employees,
  positions,
  defaultDate,
  defaultEmployeeId,
  editingShift,
  onSave,
  onDelete,
}: AddShiftDialogProps) {
  const [employeeId, setEmployeeId] = useState(
    editingShift?.employeeId || defaultEmployeeId || "",
  );
  const [positionId, setPositionId] = useState(
    editingShift?.positionId || "",
  );
  const [date, setDate] = useState(
    editingShift?.date || defaultDate || new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState(
    editingShift?.startTime || "09:00",
  );
  const [endTime, setEndTime] = useState(editingShift?.endTime || "17:00");
  const [breakMinutes, setBreakMinutes] = useState(
    editingShift?.breakMinutes?.toString() || "30",
  );
  const [notes, setNotes] = useState(editingShift?.notes || "");

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const availablePositions = selectedEmployee
    ? positions.filter((p) => selectedEmployee.positionIds.includes(p.id))
    : positions;

  const handleSave = () => {
    if (!employeeId || !positionId || !date || !startTime || !endTime) return;
    const employee = employees.find((e) => e.id === employeeId);
    onSave({
      employeeId,
      departmentId: employee?.departmentIds[0] || "",
      positionId,
      date,
      startTime,
      endTime,
      breakMinutes: parseInt(breakMinutes) || 0,
      notes: notes || undefined,
      status: "draft",
    });
    onOpenChange(false);
  };

  const isEditing = !!editingShift;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <Clock className="size-4 text-white" />
            </div>
            {isEditing ? "Edit Shift" : "Add New Shift"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <User className="size-3" /> Employee
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((e) => e.status === "active")
                  .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-[8px] text-white">
                            {emp.initials}
                          </AvatarFallback>
                        </Avatar>
                        {emp.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Briefcase className="size-3" /> Position
            </Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {availablePositions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: pos.color }}
                      />
                      {pos.name}
                      {pos.hourlyRate && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          ${pos.hourlyRate}/hr
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="size-3" /> Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Start Time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Break */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Break (minutes)
            </Label>
            <Input
              type="number"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              min={0}
              max={120}
              step={15}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MessageSquare className="size-3" /> Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add shift notes or instructions..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          {isEditing && onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(editingShift!.id);
                onOpenChange(false);
              }}
            >
              Delete Shift
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!employeeId || !positionId || !date}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
            >
              {isEditing ? "Update Shift" : "Add Shift"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
