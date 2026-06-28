"use client";

import { useState } from "react";

import { CalendarClock, Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import {
  updateSchedule,
  useDataManagement,
  type BackupSchedule,
} from "@/lib/data-management-store";

const FREQUENCIES: BackupSchedule["frequency"][] = [
  "Daily",
  "Weekly",
  "Monthly",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BackupScheduleCard() {
  const { schedule } = useDataManagement();
  const [form, setForm] = useState<BackupSchedule>(schedule);
  const [draft, setDraft] = useState("");

  const set = (patch: Partial<BackupSchedule>) =>
    setForm((f) => ({ ...f, ...patch }));

  const addRecipient = () => {
    const email = draft.trim();
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (form.recipients.includes(email)) {
      toast.error("Already a recipient");
      return;
    }
    set({ recipients: [...form.recipients, email] });
    setDraft("");
  };

  const save = () => {
    updateSchedule(form);
    toast.success("Backup schedule saved");
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="size-5" />
              Backup Schedule
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Automated backups run on this schedule and notify the recipients
              below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {form.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set({ enabled: v })}
              aria-label="Enable scheduled backups"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) =>
                set({ frequency: v as BackupSchedule["frequency"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Time</Label>
            <TimePickerLux
              value={form.time}
              onValueChange={(v) => set({ time: v })}
              displayMode="popover"
              stepMinutes={30}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="retention-days">Retention (days)</Label>
            <Input
              id="retention-days"
              type="number"
              min={1}
              value={form.retentionDays}
              onChange={(e) => set({ retentionDays: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="flex items-center gap-1.5">
            <Mail className="size-4" />
            Notification recipients
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {form.recipients.length === 0 && (
              <span className="text-muted-foreground text-xs">
                No recipients
              </span>
            )}
            {form.recipients.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1 pr-1">
                {email}
                <button
                  type="button"
                  aria-label={`Remove ${email}`}
                  className="hover:text-red-600"
                  onClick={() =>
                    set({
                      recipients: form.recipients.filter((r) => r !== email),
                    })
                  }
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
              placeholder="name@company.com"
              aria-label="Add recipient"
              className="max-w-xs"
            />
            <Button variant="outline" onClick={addRecipient}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={save}
          >
            Save schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
