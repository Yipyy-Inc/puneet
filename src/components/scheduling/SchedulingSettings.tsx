"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw, Users, ClipboardList, AlertTriangle } from "lucide-react";

export default function SchedulingSettings() {
  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = () => {
      if (typeof document === "undefined") return;
      const cookies = document.cookie.split("; ");
      const roleCookie = cookies.find((cookie) => cookie.startsWith("user_role="));
      if (roleCookie) {
        const role = roleCookie.split("=")[1];
        setIsAdmin(role === "super_admin" || role === "facility_admin");
      }
    };
    checkAdmin();
  }, []);

  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    allowSelfScheduling: true,
    requireManagerApproval: false,
    autoApproveSwaps: false,

    // Shift Settings
    defaultShiftDuration: 8,
    minShiftDuration: 4,
    maxShiftDuration: 12,
    minTimeBetweenShifts: 8,
    maxHoursPerWeek: 40,
    maxConsecutiveDays: 6,

    // Coverage Rules
    // Daycare
    daycareStaffPerDogs: 10, // 1 staff per X dogs
    daycareMinStaff: 1, // Minimum staff required for daycare
    
    // Boarding
    boardingMinStaffPerShift: 1, // Minimum attendants per shift block
    boardingMorningMinStaff: 1, // Morning shift minimum
    boardingAfternoonMinStaff: 1, // Afternoon shift minimum
    boardingEveningMinStaff: 1, // Evening shift minimum
    
    // Front Desk
    frontDeskCoverageWindows: [
      { start: "08:00", end: "10:00", minStaff: 1 },
      { start: "16:00", end: "18:00", minStaff: 1 },
    ], // Coverage windows for front desk
    
    // Grooming
    showGroomingSchedule: true, // Show grooming schedule in main view
    
    // Coverage Thresholds (for heatmap)
    understaffedThreshold: 0.7, // Below 70% of required staff = understaffed
    overstaffedThreshold: 1.3, // Above 130% of required staff = overstaffed

    // Overtime Settings
    enableOvertimeTracking: true,
    overtimeThresholdDaily: 8,
    overtimeThresholdWeekly: 40,
    requireOvertimeApproval: true,

    // Break Settings
    enableBreakTracking: true,
    breakDurationMinutes: 30,
    breakRequiredAfterHours: 5,
    paidBreaks: false,

    // Time Off
    enableTimeOffRequests: true,
    minAdvanceNoticeForTimeOff: 14,
    maxPendingTimeOffRequests: 3,
    allowPartialDayTimeOff: true,

    // Shift Swaps
    enableShiftSwaps: true,
    requireSwapApproval: true,
    swapRequestDeadlineHours: 24,
    allowCrossRoleSwaps: false,

    // Sick Call-Ins
    enableSickCallIns: true,
    sickCallDeadlineMinutes: 60,
    requireSickNote: false,
    autoFindCoverage: true,

    // Notifications
    sendSchedulePublishedNotification: true,
    sendShiftReminderNotification: true,
    shiftReminderHoursBefore: 24,
    sendSwapRequestNotification: true,
    sendTimeOffApprovalNotification: true,

    // Display Settings
    weekStartsOn: "sunday",
    defaultCalendarView: "week",
    showStaffPhotos: true,
    colorCodeByRole: true,

    // Policies
    schedulingPolicy:
      "Schedules are published every Friday for the following week. Please review and report any conflicts within 24 hours.",
    timeOffPolicy:
      "Time off requests must be submitted at least 2 weeks in advance. Requests during blackout periods may be denied.",
    swapPolicy:
      "Shift swaps must be approved by a manager. Both parties must agree to the swap before submission.",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Save to backend
    setIsEditing(false);
  };

  const handleReset = () => {
    // TODO: Reset to saved values
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "System Configuration" : "Scheduling Settings"}
          </h2>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "System-level scheduling configuration and controls"
              : "Configure staff scheduling preferences and policies"}
          </p>
          {isAdmin && (
            <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800">
              Admin Configuration Panel
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic scheduling configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Staff Scheduling</Label>
                <p className="text-sm text-muted-foreground">
                  Allow scheduling functionality for staff
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Self-Scheduling</Label>
                <p className="text-sm text-muted-foreground">
                  Staff can pick up open shifts
                </p>
              </div>
              <Switch
                checked={settings.allowSelfScheduling}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowSelfScheduling: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Manager Approval</Label>
                <p className="text-sm text-muted-foreground">
                  All schedule changes require manager approval
                </p>
              </div>
              <Switch
                checked={settings.requireManagerApproval}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireManagerApproval: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shift Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Settings</CardTitle>
            <CardDescription>
              Configure shift duration and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Default Shift Duration (hours)</Label>
                <Input
                  type="number"
                  value={settings.defaultShiftDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultShiftDuration: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Shift Duration (hours)</Label>
                <Input
                  type="number"
                  value={settings.minShiftDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minShiftDuration: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Shift Duration (hours)</Label>
                <Input
                  type="number"
                  value={settings.maxShiftDuration}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxShiftDuration: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Time Between Shifts (hours)</Label>
                <Input
                  type="number"
                  value={settings.minTimeBetweenShifts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minTimeBetweenShifts: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Hours Per Week</Label>
                <Input
                  type="number"
                  value={settings.maxHoursPerWeek}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxHoursPerWeek: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Consecutive Days</Label>
                <Input
                  type="number"
                  value={settings.maxConsecutiveDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxConsecutiveDays: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overtime Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Overtime Settings</CardTitle>
            <CardDescription>
              Configure overtime tracking and thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Overtime Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track overtime hours automatically
                </p>
              </div>
              <Switch
                checked={settings.enableOvertimeTracking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableOvertimeTracking: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableOvertimeTracking && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Overtime Threshold (hours)</Label>
                    <Input
                      type="number"
                      value={settings.overtimeThresholdDaily}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          overtimeThresholdDaily: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekly Overtime Threshold (hours)</Label>
                    <Input
                      type="number"
                      value={settings.overtimeThresholdWeekly}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          overtimeThresholdWeekly:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Overtime Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager must approve overtime scheduling
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireOvertimeApproval}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        requireOvertimeApproval: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Break Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Break Settings</CardTitle>
            <CardDescription>Configure break requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Break Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track staff breaks during shifts
                </p>
              </div>
              <Switch
                checked={settings.enableBreakTracking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableBreakTracking: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableBreakTracking && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Break Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.breakDurationMinutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          breakDurationMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Break Required After (hours)</Label>
                    <Input
                      type="number"
                      value={settings.breakRequiredAfterHours}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          breakRequiredAfterHours:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Paid Breaks</Label>
                    <p className="text-sm text-muted-foreground">
                      Breaks are included in paid time
                    </p>
                  </div>
                  <Switch
                    checked={settings.paidBreaks}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, paidBreaks: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Time Off */}
        <Card>
          <CardHeader>
            <CardTitle>Time Off</CardTitle>
            <CardDescription>
              Configure time off request settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Time Off Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Staff can submit time off requests
                </p>
              </div>
              <Switch
                checked={settings.enableTimeOffRequests}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableTimeOffRequests: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableTimeOffRequests && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Advance Notice (days)</Label>
                    <Input
                      type="number"
                      value={settings.minAdvanceNoticeForTimeOff}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          minAdvanceNoticeForTimeOff:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Pending Requests</Label>
                    <Input
                      type="number"
                      value={settings.maxPendingTimeOffRequests}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxPendingTimeOffRequests:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Partial Day Time Off</Label>
                    <p className="text-sm text-muted-foreground">
                      Staff can request time off for part of a day
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowPartialDayTimeOff}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        allowPartialDayTimeOff: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shift Swaps */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Swaps</CardTitle>
            <CardDescription>Configure shift swap settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Shift Swaps</Label>
                <p className="text-sm text-muted-foreground">
                  Staff can swap shifts with each other
                </p>
              </div>
              <Switch
                checked={settings.enableShiftSwaps}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableShiftSwaps: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableShiftSwaps && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Swap Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Manager must approve shift swaps
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireSwapApproval}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireSwapApproval: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Swap Request Deadline (hours before shift)</Label>
                  <Input
                    type="number"
                    value={settings.swapRequestDeadlineHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        swapRequestDeadlineHours: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Cross-Role Swaps</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow swaps between staff of different roles
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowCrossRoleSwaps}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, allowCrossRoleSwaps: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sick Call-Ins */}
        <Card>
          <CardHeader>
            <CardTitle>Sick Call-Ins</CardTitle>
            <CardDescription>Configure sick call-in settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Sick Call-Ins</Label>
                <p className="text-sm text-muted-foreground">
                  Staff can report sick through the system
                </p>
              </div>
              <Switch
                checked={settings.enableSickCallIns}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableSickCallIns: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableSickCallIns && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Sick Call Deadline (minutes before shift)</Label>
                  <Input
                    type="number"
                    value={settings.sickCallDeadlineMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sickCallDeadlineMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Sick Note</Label>
                    <p className="text-sm text-muted-foreground">
                      Require doctor&apos;s note for sick leave
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireSickNote}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireSickNote: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Find Coverage</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically suggest available staff for coverage
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoFindCoverage}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoFindCoverage: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure scheduling notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Schedule Published Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify staff when new schedule is published
                </p>
              </div>
              <Switch
                checked={settings.sendSchedulePublishedNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendSchedulePublishedNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shift Reminder Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Send reminder before scheduled shifts
                </p>
              </div>
              <Switch
                checked={settings.sendShiftReminderNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendShiftReminderNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendShiftReminderNotification && (
              <div className="space-y-2">
                <Label>Reminder Time (hours before shift)</Label>
                <Input
                  type="number"
                  value={settings.shiftReminderHoursBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shiftReminderHoursBefore: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Swap Request Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when swap requests are submitted
                </p>
              </div>
              <Switch
                checked={settings.sendSwapRequestNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendSwapRequestNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Time Off Approval Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when time off is approved/denied
                </p>
              </div>
              <Switch
                checked={settings.sendTimeOffApprovalNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendTimeOffApprovalNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Configure calendar display options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week Starts On</Label>
                <Select
                  value={settings.weekStartsOn}
                  onValueChange={(value) =>
                    setSettings({ ...settings, weekStartsOn: value })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Calendar View</Label>
                <Select
                  value={settings.defaultCalendarView}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultCalendarView: value })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Staff Photos</Label>
                <p className="text-sm text-muted-foreground">
                  Display staff profile photos in calendar
                </p>
              </div>
              <Switch
                checked={settings.showStaffPhotos}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showStaffPhotos: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Color Code by Role</Label>
                <p className="text-sm text-muted-foreground">
                  Use different colors for different staff roles
                </p>
              </div>
              <Switch
                checked={settings.colorCodeByRole}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, colorCodeByRole: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coverage Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Rules</CardTitle>
            <CardDescription>
              Define minimum staffing requirements by role and workload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daycare Coverage */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Daycare Coverage</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Staff per Dogs Ratio</Label>
                  <p className="text-xs text-muted-foreground">
                    1 staff member per X dogs
                  </p>
                  <Input
                    type="number"
                    value={settings.daycareStaffPerDogs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        daycareStaffPerDogs: parseInt(e.target.value) || 10,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Staff Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Always have at least this many staff for daycare
                  </p>
                  <Input
                    type="number"
                    value={settings.daycareMinStaff}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        daycareMinStaff: parseInt(e.target.value) || 1,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Boarding Coverage */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Boarding Coverage</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Morning Shift Minimum</Label>
                  <p className="text-xs text-muted-foreground">
                    Minimum staff for morning shift (e.g., 06:00-14:00)
                  </p>
                  <Input
                    type="number"
                    value={settings.boardingMorningMinStaff}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        boardingMorningMinStaff: parseInt(e.target.value) || 1,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Afternoon Shift Minimum</Label>
                  <p className="text-xs text-muted-foreground">
                    Minimum staff for afternoon shift (e.g., 14:00-22:00)
                  </p>
                  <Input
                    type="number"
                    value={settings.boardingAfternoonMinStaff}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        boardingAfternoonMinStaff: parseInt(e.target.value) || 1,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Evening Shift Minimum</Label>
                  <p className="text-xs text-muted-foreground">
                    Minimum staff for evening shift (e.g., 22:00-06:00)
                  </p>
                  <Input
                    type="number"
                    value={settings.boardingEveningMinStaff}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        boardingEveningMinStaff: parseInt(e.target.value) || 1,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Front Desk Coverage */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Front Desk Coverage Windows</h4>
              <p className="text-xs text-muted-foreground">
                Define time windows when front desk must be staffed
              </p>
              <div className="space-y-2">
                {settings.frontDeskCoverageWindows.map((window, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={window.start}
                      onChange={(e) => {
                        const newWindows = [...settings.frontDeskCoverageWindows];
                        newWindows[index].start = e.target.value;
                        setSettings({ ...settings, frontDeskCoverageWindows: newWindows });
                      }}
                      disabled={!isEditing}
                      className="w-32"
                    />
                    <span className="text-sm">to</span>
                    <Input
                      type="time"
                      value={window.end}
                      onChange={(e) => {
                        const newWindows = [...settings.frontDeskCoverageWindows];
                        newWindows[index].end = e.target.value;
                        setSettings({ ...settings, frontDeskCoverageWindows: newWindows });
                      }}
                      disabled={!isEditing}
                      className="w-32"
                    />
                    <span className="text-sm">Min staff:</span>
                    <Input
                      type="number"
                      value={window.minStaff}
                      onChange={(e) => {
                        const newWindows = [...settings.frontDeskCoverageWindows];
                        newWindows[index].minStaff = parseInt(e.target.value) || 1;
                        setSettings({ ...settings, frontDeskCoverageWindows: newWindows });
                      }}
                      disabled={!isEditing}
                      className="w-20"
                    />
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newWindows = settings.frontDeskCoverageWindows.filter((_, i) => i !== index);
                          setSettings({ ...settings, frontDeskCoverageWindows: newWindows });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newWindows = [
                        ...settings.frontDeskCoverageWindows,
                        { start: "09:00", end: "17:00", minStaff: 1 },
                      ];
                      setSettings({ ...settings, frontDeskCoverageWindows: newWindows });
                    }}
                  >
                    Add Coverage Window
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Grooming */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Grooming Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Display grooming appointments in the main schedule view
                </p>
              </div>
              <Switch
                checked={settings.showGroomingSchedule}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showGroomingSchedule: checked })
                }
                disabled={!isEditing}
              />
            </div>

            <Separator />

            {/* Coverage Thresholds */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Coverage Heatmap Thresholds</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Understaffed Threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Below this percentage of required staff = understaffed (0.0-1.0)
                  </p>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings.understaffedThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        understaffedThreshold: parseFloat(e.target.value) || 0.7,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overstaffed Threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Above this percentage of required staff = overstaffed (1.0+)
                  </p>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={settings.overstaffedThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        overstaffedThreshold: parseFloat(e.target.value) || 1.3,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>
              Define scheduling policies displayed to staff
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scheduling Policy</Label>
              <Textarea
                value={settings.schedulingPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, schedulingPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Off Policy</Label>
              <Textarea
                value={settings.timeOffPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, timeOffPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Shift Swap Policy</Label>
              <Textarea
                value={settings.swapPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, swapPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Admin-Only Settings */}
        {isAdmin && (
          <>
            {/* Roles & Departments Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Roles & Departments (Admin Only)
                </CardTitle>
                <CardDescription>
                  Configure roles, departments, and staff permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Admin Configuration:</strong> Define roles, departments, and assign permissions to staff members.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Available Roles</Label>
                  <p className="text-sm text-muted-foreground">
                    Boarding, Daycare, Grooming, Front Desk, Training, Admin, Manager
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Staff Permissions</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure who can be employee vs manager vs admin
                  </p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Employee can view own schedule</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Manager can edit schedules</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Admin can override locked schedules</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conflict Detection Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Conflict Detection Rules (Admin Only)
                </CardTitle>
                <CardDescription>
                  Configure rules for detecting scheduling conflicts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Enable Conflict Detection</Label>
                  <Switch
                    defaultChecked
                    disabled={!isEditing}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Conflict Types to Detect</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Double-booked staff</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Overlapping shifts</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Scheduling during approved time off</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Role mismatch</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Max hours per day exceeded</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Min rest between shifts violated</span>
                      <Switch defaultChecked disabled={!isEditing} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Task Templates (Admin Only)
                </CardTitle>
                <CardDescription>
                  Create reusable task templates for opening/closing/med rounds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Template Categories</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 border rounded">
                      <p className="text-sm font-medium">Opening Tasks</p>
                      <p className="text-xs text-muted-foreground">Morning setup, feeding rounds</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-sm font-medium">Closing Tasks</p>
                      <p className="text-xs text-muted-foreground">Evening cleanup, final checks</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-sm font-medium">Medication Rounds</p>
                      <p className="text-xs text-muted-foreground">Scheduled medication administration</p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="text-sm font-medium">Cleaning Tasks</p>
                      <p className="text-xs text-muted-foreground">Sanitization, deep cleaning</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" disabled={!isEditing}>
                  Manage Task Templates
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
