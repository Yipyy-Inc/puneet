"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Lock,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ShiftOpportunity,
  ShiftOpportunityClaimMode,
  Department,
  Position,
  ScheduleEmployee,
} from "@/types/scheduling";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: Department[];
  positions: Position[];
  employees: ScheduleEmployee[];
  onPost: (opp: ShiftOpportunity) => void;
  defaultDepartmentId?: string;
  canViewPayRates?: boolean;
}

interface PostForm {
  departmentId: string;
  positionId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  reason: string;
  notes: string;
  urgency: "normal" | "urgent" | "critical";
  originalEmployeeId: string;
  setExpiry: boolean;
  expiryHours: number;
  claimMode: ShiftOpportunityClaimMode;
  invitedEmployeeIds: string[];
}

const emptyForm: PostForm = {
  departmentId: "",
  positionId: "",
  date: "",
  startTime: "09:00",
  endTime: "17:00",
  breakMinutes: 30,
  reason: "",
  notes: "",
  urgency: "normal",
  originalEmployeeId: "",
  setExpiry: true,
  expiryHours: 2,
  claimMode: "open",
  invitedEmployeeIds: [],
};

export function PostShiftOpportunityDialog({
  open,
  onOpenChange,
  departments,
  positions,
  employees,
  onPost,
  defaultDepartmentId,
  canViewPayRates = true,
}: Props) {
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Pre-fill department when dialog opens
  useEffect(() => {
    if (open && defaultDepartmentId) {
      setForm((p) => ({ ...p, departmentId: p.departmentId || defaultDepartmentId }));
    }
  }, [open, defaultDepartmentId]);

  const deptPositions = positions.filter(
    (p) => !form.departmentId || p.departmentId === form.departmentId,
  );

  const deptEmployees = employees.filter(
    (e) =>
      e.status === "active" &&
      (!form.departmentId || e.departmentIds.includes(form.departmentId)),
  );

  const invitedEmployees = employees.filter((e) =>
    form.invitedEmployeeIds.includes(e.id),
  );

  const toggleInvited = (id: string) => {
    setForm((p) => ({
      ...p,
      invitedEmployeeIds: p.invitedEmployeeIds.includes(id)
        ? p.invitedEmployeeIds.filter((x) => x !== id)
        : [...p.invitedEmployeeIds, id],
    }));
  };

  const isValid =
    form.departmentId &&
    form.positionId &&
    form.date &&
    form.startTime &&
    form.endTime &&
    form.reason.trim() &&
    (form.claimMode === "open" || form.invitedEmployeeIds.length > 0);

  const handleSubmit = () => {
    if (!isValid) return;

    const hasOriginal =
      form.originalEmployeeId && form.originalEmployeeId !== "none";
    const originalEmp = hasOriginal
      ? employees.find((e) => e.id === form.originalEmployeeId)
      : null;

    let expiresAt: string | undefined;
    if (form.setExpiry) {
      const shiftStart = new Date(`${form.date}T${form.startTime}:00`);
      shiftStart.setHours(shiftStart.getHours() - form.expiryHours);
      expiresAt = shiftStart.toISOString();
    }

    const opp: ShiftOpportunity = {
      id: `opp-${Date.now()}`,
      facilityId: 1,
      departmentId: form.departmentId,
      positionId: form.positionId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      breakMinutes: form.breakMinutes,
      reason: form.reason,
      notes: form.notes || undefined,
      urgency: form.urgency,
      status: "open",
      claimMode: form.claimMode,
      invitedEmployeeIds:
        form.claimMode === "invite_only" ? form.invitedEmployeeIds : [],
      originalEmployeeId: hasOriginal ? form.originalEmployeeId : undefined,
      originalEmployeeName: originalEmp?.name,
      postedBy: "emp-1", // manager
      postedByName: "Sarah Johnson",
      postedAt: new Date().toISOString(),
      expiresAt,
    };

    onPost(opp);
    toast.success("Shift opportunity posted!", {
      description:
        form.claimMode === "invite_only"
          ? `${form.invitedEmployeeIds.length} invited employee${form.invitedEmployeeIds.length === 1 ? "" : "s"} will be notified.`
          : "Eligible employees will be notified.",
    });
    setForm(emptyForm);
    onOpenChange(false);
  };

  const handleClose = () => {
    setForm(emptyForm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/20 backdrop-blur-[2px]" />
        <DialogContent className="max-h-[85vh] overflow-y-auto duration-300 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Post Shift Opportunity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      departmentId: v,
                      positionId: "",
                      originalEmployeeId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Position Needed</Label>
                <Select
                  value={form.positionId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, positionId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptPositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                          {canViewPayRates && p.hourlyRate && (
                            <span className="text-muted-foreground">
                              ${p.hourlyRate}/hr
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Times */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker
                  value={form.date}
                  onValueChange={(v) => setForm((p) => ({ ...p, date: v }))}
                  displayMode="dialog"
                  showQuickPresets={false}
                  popoverClassName="!w-[300px]"
                  calendarClassName="p-1 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Break & Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Break (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  step={15}
                  value={form.breakMinutes}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      breakMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      urgency: v as "normal" | "urgent" | "critical",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-blue-500" />
                        Normal
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3 text-amber-500" />
                        Urgent
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-1.5">
                        <Zap className="size-3 text-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Original Employee (optional) */}
            <div className="space-y-1.5">
              <Label>Covering For (optional)</Label>
              <Select
                value={form.originalEmployeeId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, originalEmployeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee being replaced" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — new shift</SelectItem>
                  {deptEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Why is this shift available? e.g., Employee called in sick"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Additional Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Any special requirements or instructions"
              />
            </div>

            {/* Who can claim */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Who can claim</p>
                <p className="text-muted-foreground text-xs">
                  Open to anyone in the department, or invite specific staff.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "open",
                      label: "Open to all",
                      hint: "Any eligible employee can claim",
                      icon: Globe,
                    },
                    {
                      value: "invite_only",
                      label: "Invite only",
                      hint: "Only employees you pick",
                      icon: Lock,
                    },
                  ] as const
                ).map((mode) => {
                  const active = form.claimMode === mode.value;
                  const Icon = mode.icon;
                  return (
                    <button
                      type="button"
                      key={mode.value}
                      onClick={() =>
                        setForm((p) => ({ ...p, claimMode: mode.value }))
                      }
                      className={cn(
                        "flex items-start gap-2 rounded-md border p-2.5 text-left transition-all",
                        active
                          ? "border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-300/40 dark:border-indigo-500/60 dark:bg-indigo-950/30"
                          : "hover:bg-muted/40 border-border",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          active
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs font-semibold",
                            active && "text-indigo-700 dark:text-indigo-300",
                          )}
                        >
                          {mode.label}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight">
                          {mode.hint}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {form.claimMode === "invite_only" && (
                <div className="space-y-2 pt-1">
                  <Popover open={inviteOpen} onOpenChange={setInviteOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!form.departmentId}
                        className="h-9 w-full justify-between font-normal"
                      >
                        <span
                          className={cn(
                            "truncate text-xs",
                            form.invitedEmployeeIds.length === 0 &&
                              "text-muted-foreground",
                          )}
                        >
                          {!form.departmentId
                            ? "Select department first"
                            : form.invitedEmployeeIds.length === 0
                              ? "Pick employees to invite…"
                              : `${form.invitedEmployeeIds.length} invited`}
                        </span>
                        <ChevronDown className="size-3.5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search employees…"
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No employees found.</CommandEmpty>
                          <CommandGroup>
                            {deptEmployees.map((emp) => {
                              const checked = form.invitedEmployeeIds.includes(
                                emp.id,
                              );
                              return (
                                <CommandItem
                                  key={emp.id}
                                  value={`${emp.name} ${emp.role}`}
                                  onSelect={() => toggleInvited(emp.id)}
                                  className="gap-2"
                                >
                                  <div
                                    className={cn(
                                      "flex size-4 shrink-0 items-center justify-center rounded border",
                                      checked
                                        ? "border-indigo-500 bg-indigo-500 text-white"
                                        : "border-input",
                                    )}
                                  >
                                    {checked && <Check className="size-3" />}
                                  </div>
                                  <Avatar className="size-6 shrink-0">
                                    <AvatarImage
                                      src={emp.avatar}
                                      alt={emp.name}
                                    />
                                    <AvatarFallback className="text-[9px]">
                                      {emp.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {emp.name}
                                    </p>
                                    <p className="text-muted-foreground truncate text-[10px]">
                                      {emp.role}
                                    </p>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {invitedEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {invitedEmployees.map((emp) => (
                        <Badge
                          key={emp.id}
                          variant="secondary"
                          className="gap-1 pr-1 text-[10px]"
                        >
                          <Avatar className="size-4">
                            <AvatarImage src={emp.avatar} alt={emp.name} />
                            <AvatarFallback className="text-[8px]">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          {emp.name}
                          <button
                            type="button"
                            onClick={() => toggleInvited(emp.id)}
                            className="hover:bg-muted ml-0.5 rounded-full p-0.5"
                          >
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expiry */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Auto-expire</p>
                <p className="text-muted-foreground text-xs">
                  Automatically expire this opportunity before the shift starts
                </p>
              </div>
              <div className="flex items-center gap-2">
                {form.setExpiry && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={48}
                      value={form.expiryHours}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          expiryHours: Number(e.target.value),
                        }))
                      }
                      className="h-7 w-16 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">
                      hrs before
                    </span>
                  </div>
                )}
                <Switch
                  checked={form.setExpiry}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, setExpiry: v }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid}>
              Post Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
