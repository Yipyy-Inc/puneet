"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type {
  CalendarCardFieldKey,
  CalendarVisualConfig,
  ManualFacilityEvent,
} from "@/lib/operations-calendar";

export interface ManualEventDraft {
  title: string;
  subtype: ManualFacilityEvent["subtype"];
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  privateToUser: boolean;
  location: string;
  staff: string;
}

const CARD_FIELD_LABELS: Record<CalendarCardFieldKey, string> = {
  petNames: "Pet name(s)",
  customerName: "Owner / customer",
  serviceName: "Service name",
  time: "Time",
  staff: "Staff assigned",
  location: "Location / resource",
  status: "Status badge",
  tagChips: "Tag chips",
  addOnIcons: "Add-on quick icons",
};

interface OperationsCalendarConfigPanelProps {
  open: boolean;
  visualConfig: CalendarVisualConfig;
  onColorModeChange: (value: CalendarVisualConfig["colorMode"]) => void;
  onColorStyleChange: (value: CalendarVisualConfig["colorStyle"]) => void;
  onAddOnDisplayModeChange: (value: CalendarVisualConfig["addOnDisplayMode"]) => void;
  onZoomLevelChange: (value: CalendarVisualConfig["zoomLevel"]) => void;
  onCompletedTaskDecorationChange: (
    value: CalendarVisualConfig["completedTaskDecoration"],
  ) => void;
  onToggleCardField: (fieldKey: CalendarCardFieldKey) => void;
  showEventCreator: boolean;
  onToggleEventCreator: () => void;
  manualEventDraft: ManualEventDraft;
  onManualEventDraftChange: (next: ManualEventDraft) => void;
  onCreateManualEvent: () => void;
  onClose: () => void;
}

export function OperationsCalendarConfigPanel({
  open,
  visualConfig,
  onColorModeChange,
  onColorStyleChange,
  onAddOnDisplayModeChange,
  onZoomLevelChange,
  onCompletedTaskDecorationChange,
  onToggleCardField,
  showEventCreator,
  onToggleEventCreator,
  manualEventDraft,
  onManualEventDraftChange,
  onCreateManualEvent,
  onClose,
}: OperationsCalendarConfigPanelProps) {
  if (!open) {
    return null;
  }

  const updateDraft = (updates: Partial<ManualEventDraft>) => {
    onManualEventDraftChange({
      ...manualEventDraft,
      ...updates,
    });
  };

  return (
    <Card className="border-slate-200 bg-slate-50/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Calendar Config</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Color Mode</p>
            <Select value={visualConfig.colorMode} onValueChange={onColorModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service-type">By service type</SelectItem>
                <SelectItem value="staff-member">By staff member</SelectItem>
                <SelectItem value="status">By status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Color Style</p>
            <Select value={visualConfig.colorStyle} onValueChange={onColorStyleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="full-background">Full background</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Add-on Display</p>
            <Select
              value={visualConfig.addOnDisplayMode}
              onValueChange={onAddOnDisplayModeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nested">Mode A - Nested</SelectItem>
                <SelectItem value="separate">Mode B - Separate sub-events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Zoom Level</p>
            <Select value={visualConfig.zoomLevel} onValueChange={onZoomLevelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="expanded">Expanded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Completed Task Style</p>
            <Select
              value={visualConfig.completedTaskDecoration}
              onValueChange={onCompletedTaskDecorationChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="checkmark">Checkmark</SelectItem>
                <SelectItem value="strikethrough">Strikethrough</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white/90 p-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.keys(CARD_FIELD_LABELS).map((fieldKey) => {
            const key = fieldKey as CalendarCardFieldKey;
            return (
              <label
                key={fieldKey}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1"
              >
                <span className="text-xs text-slate-700">{CARD_FIELD_LABELS[key]}</span>
                <Switch
                  checked={visualConfig.cardFields[key]}
                  onCheckedChange={() => onToggleCardField(key)}
                />
              </label>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white/90 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Custom Facility Event</h3>
            <Button variant="outline" size="sm" onClick={onToggleEventCreator}>
              {showEventCreator ? "Hide" : "Create event"}
            </Button>
          </div>

          {showEventCreator && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <Input
                value={manualEventDraft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Event title"
                className="xl:col-span-2"
              />

              <Select
                value={manualEventDraft.subtype}
                onValueChange={(value) =>
                  updateDraft({ subtype: value as ManualEventDraft["subtype"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocked-time">Blocked time</SelectItem>
                  <SelectItem value="staff-meeting">Staff meeting</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="holiday-closure">Holiday closure</SelectItem>
                  <SelectItem value="personal-reminder">Personal reminder</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={manualEventDraft.date}
                onChange={(event) => updateDraft({ date: event.target.value })}
              />

              <Input
                type="time"
                value={manualEventDraft.startTime}
                onChange={(event) => updateDraft({ startTime: event.target.value })}
              />

              <Input
                type="time"
                value={manualEventDraft.endTime}
                onChange={(event) => updateDraft({ endTime: event.target.value })}
              />

              <Input
                value={manualEventDraft.location}
                onChange={(event) => updateDraft({ location: event.target.value })}
                placeholder="Location / resource"
              />

              <Input
                value={manualEventDraft.staff}
                onChange={(event) => updateDraft({ staff: event.target.value })}
                placeholder="Staff / owner"
              />

              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
                All day
                <Switch
                  checked={manualEventDraft.allDay}
                  onCheckedChange={(checked) => updateDraft({ allDay: checked })}
                />
              </label>

              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
                Private reminder
                <Switch
                  checked={manualEventDraft.privateToUser}
                  onCheckedChange={(checked) => updateDraft({ privateToUser: checked })}
                />
              </label>

              <Button className="xl:col-span-4" onClick={onCreateManualEvent}>
                Add Facility Event
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
