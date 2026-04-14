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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type {
  ShiftOpportunityNotificationSettings,
  Department,
  ScheduleEmployee,
} from "@/types/scheduling";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: ShiftOpportunityNotificationSettings;
  departments: Department[];
  employees: ScheduleEmployee[];
  onSave: (settings: ShiftOpportunityNotificationSettings) => void;
}

export function ShiftOpportunityNotificationSettingsDialog({
  open,
  onOpenChange,
  settings,
  departments,
  employees,
  onSave,
}: Props) {
  const [form, setForm] =
    useState<ShiftOpportunityNotificationSettings>(settings);

  const activeEmployees = employees.filter((e) => e.status === "active");
  const managersExcluded = employees.filter(
    (e) => e.role === "Manager" || e.role === "Supervisor",
  );

  const isEligible = (empId: string) =>
    form.eligibleEmployeeIds.includes(empId);

  const isExcluded = (empId: string) =>
    form.excludedEmployeeIds.includes(empId);

  const toggleEligible = (empId: string) => {
    setForm((p) => ({
      ...p,
      eligibleEmployeeIds: isEligible(empId)
        ? p.eligibleEmployeeIds.filter((id) => id !== empId)
        : [...p.eligibleEmployeeIds, empId],
    }));
  };

  const toggleExcluded = (empId: string) => {
    setForm((p) => ({
      ...p,
      excludedEmployeeIds: isExcluded(empId)
        ? p.excludedEmployeeIds.filter((id) => id !== empId)
        : [...p.excludedEmployeeIds, empId],
    }));
  };

  const selectAll = () => {
    setForm((p) => ({
      ...p,
      eligibleEmployeeIds: activeEmployees.map((e) => e.id),
    }));
  };

  const deselectAll = () => {
    setForm((p) => ({ ...p, eligibleEmployeeIds: [] }));
  };

  const handleSave = () => {
    onSave(form);
    toast.success("Notification settings saved");
    onOpenChange(false);
  };

  const getDeptName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return "";
    const dept = departments.find((d) => emp.departmentIds.includes(d.id));
    return dept?.name ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-4" />
            Shift Opportunity Notifications
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-1">
          <div className="space-y-5 py-2">
            {/* Master toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable Notifications</p>
                <p className="text-muted-foreground text-xs">
                  Send notifications to employees when shift opportunities are
                  posted
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
              />
            </div>

            {form.enabled && (
              <>
                <Separator />

                {/* Notification channels */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Notification Channels
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          channels: { ...p.channels, inApp: !p.channels.inApp },
                        }))
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                        form.channels.inApp
                          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <Bell
                        className={`size-5 ${
                          form.channels.inApp
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-medium">In-App</span>
                      {form.channels.inApp && (
                        <CheckCircle2 className="size-3.5 text-blue-600" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          channels: { ...p.channels, email: !p.channels.email },
                        }))
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                        form.channels.email
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <Mail
                        className={`size-5 ${
                          form.channels.email
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-medium">Email</span>
                      {form.channels.email && (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          channels: { ...p.channels, sms: !p.channels.sms },
                        }))
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                        form.channels.sms
                          ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30"
                          : "border-muted hover:bg-muted/50"
                      }`}
                    >
                      <Smartphone
                        className={`size-5 ${
                          form.channels.sms
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-medium">SMS</span>
                      {form.channels.sms && (
                        <CheckCircle2 className="size-3.5 text-purple-600" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Notification scope */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Who Gets Notified
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">Notify all active employees</p>
                        <p className="text-muted-foreground text-xs">
                          Every active employee receives shift opportunity
                          notifications
                        </p>
                      </div>
                      <Switch
                        checked={form.notifyAllActive}
                        onCheckedChange={(v) =>
                          setForm((p) => ({ ...p, notifyAllActive: v }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">Filter by department</p>
                        <p className="text-muted-foreground text-xs">
                          Only notify employees in the same department as the
                          open shift
                        </p>
                      </div>
                      <Switch
                        checked={form.notifyByDepartment}
                        onCheckedChange={(v) =>
                          setForm((p) => ({ ...p, notifyByDepartment: v }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">Filter by position</p>
                        <p className="text-muted-foreground text-xs">
                          Only notify employees who hold the same position as
                          the open shift
                        </p>
                      </div>
                      <Switch
                        checked={form.notifyByPosition}
                        onCheckedChange={(v) =>
                          setForm((p) => ({ ...p, notifyByPosition: v }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Eligible employees */}
                {!form.notifyAllActive && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        Eligible Employees
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {form.eligibleEmployeeIds.length} /{" "}
                          {activeEmployees.length}
                        </Badge>
                      </Label>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={selectAll}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={deselectAll}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-[200px] space-y-1 overflow-auto rounded-lg border p-2">
                      {activeEmployees.map((emp) => (
                        <label
                          key={emp.id}
                          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5"
                        >
                          <Checkbox
                            checked={isEligible(emp.id)}
                            onCheckedChange={() => toggleEligible(emp.id)}
                          />
                          <Avatar className="size-6">
                            <AvatarImage src={emp.avatar} alt={emp.name} />
                            <AvatarFallback className="bg-slate-100 text-[8px] dark:bg-slate-800">
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {emp.name}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {emp.role} · {getDeptName(emp.id)}
                            </p>
                          </div>
                          {(emp.role === "Manager" ||
                            emp.role === "Supervisor") && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[9px]"
                            >
                              {emp.role}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Approval settings */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Approval Rules
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">Require manager approval</p>
                        <p className="text-muted-foreground text-xs">
                          Manager must approve before the shift claim is
                          finalized
                        </p>
                      </div>
                      <Switch
                        checked={form.requireManagerApproval}
                        onCheckedChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            requireManagerApproval: v,
                            autoApprove: v ? false : p.autoApprove,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm">Auto-approve claims</p>
                        <p className="text-muted-foreground text-xs">
                          Automatically approve claims from eligible employees
                          (faster coverage)
                        </p>
                      </div>
                      <Switch
                        checked={form.autoApprove}
                        disabled={form.requireManagerApproval}
                        onCheckedChange={(v) =>
                          setForm((p) => ({ ...p, autoApprove: v }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Claim limits */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">
                    Max Claims Per Employee Per Week
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Limit how many shift opportunities an employee can claim per
                    week to prevent overwork
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxClaimsPerWeek}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        maxClaimsPerWeek: Number(e.target.value),
                      }))
                    }
                    className="w-24"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
