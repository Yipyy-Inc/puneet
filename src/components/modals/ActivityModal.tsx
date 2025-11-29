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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Clock,
} from "lucide-react";
import { Activity, ActivityType, ActivityStatus } from "@/data/crm/activities";
import { salesTeamMembers } from "@/data/crm/sales-team";

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Partial<Activity>;
  leadId?: string;
  dealId?: string;
  contactId?: string;
  onSave: (activity: Partial<Activity>) => void;
  mode?: "create" | "edit";
}

const activityTypeOptions: {
  value: ActivityType;
  label: string;
  icon: typeof Phone;
}[] = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "note", label: "Note", icon: FileText },
  { value: "task", label: "Task", icon: CheckSquare },
];

export function ActivityModal({
  open,
  onOpenChange,
  activity,
  leadId,
  dealId,
  contactId,
  onSave,
  mode = "create",
}: ActivityModalProps) {
  const [type, setType] = useState<ActivityType>(activity?.type || "call");
  const [subject, setSubject] = useState(activity?.subject || "");
  const [description, setDescription] = useState(activity?.description || "");
  const [assignedTo, setAssignedTo] = useState(activity?.assignedTo || "");
  const [dueDate, setDueDate] = useState(
    activity?.dueDate
      ? new Date(activity.dueDate).toISOString().slice(0, 16)
      : "",
  );
  const [duration, setDuration] = useState<number>(activity?.duration || 15);
  const [notes, setNotes] = useState(activity?.notes || "");
  const [outcome, setOutcome] = useState(activity?.outcome || "");
  const [isCompleted, setIsCompleted] = useState(
    activity?.status === "completed",
  );
  const [setReminder, setSetReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(30);

  const handleSave = () => {
    const selectedMember = salesTeamMembers.find((m) => m.id === assignedTo);

    const activityData: Partial<Activity> = {
      id: activity?.id,
      type,
      subject,
      description,
      leadId: leadId || activity?.leadId,
      dealId: dealId || activity?.dealId,
      contactId: contactId || activity?.contactId,
      assignedTo,
      assignedToName: selectedMember?.name || "",
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      duration: ["call", "meeting"].includes(type) ? duration : undefined,
      notes: notes || undefined,
      outcome: isCompleted ? outcome : undefined,
      status: isCompleted ? "completed" : "pending",
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      createdAt: activity?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(activityData);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setType("call");
    setSubject("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setDuration(15);
    setNotes("");
    setOutcome("");
    setIsCompleted(false);
    setSetReminder(false);
    setReminderMinutes(30);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (mode === "create") {
      resetForm();
    }
  };

  const isValid = subject.trim() !== "" && assignedTo !== "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Log Activity" : "Edit Activity"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {activityTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={type === option.value ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 px-2"
                    onClick={() => setType(option.value)}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-xs">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                type === "call"
                  ? "e.g., Discovery Call"
                  : type === "email"
                    ? "e.g., Follow-up Email"
                    : type === "meeting"
                      ? "e.g., Product Demo"
                      : type === "task"
                        ? "e.g., Send Proposal"
                        : "e.g., Meeting Notes"
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this activity..."
              rows={2}
            />
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">
              Assigned To <span className="text-red-500">*</span>
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {salesTeamMembers
                  .filter((m) => m.status === "active")
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date (for tasks, meetings, calls) */}
          {["task", "meeting", "call"].includes(type) && (
            <div className="space-y-2">
              <Label htmlFor="dueDate">
                {type === "task" ? "Due Date" : "Scheduled Date & Time"}
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Duration (for calls and meetings) */}
          {["call", "meeting"].includes(type) && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={duration.toString()}
                onValueChange={(v) => setDuration(parseInt(v))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Set Reminder */}
          {["task", "meeting", "call"].includes(type) && dueDate && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="setReminder"
                  className="font-normal cursor-pointer"
                >
                  Set reminder
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {setReminder && (
                  <Select
                    value={reminderMinutes.toString()}
                    onValueChange={(v) => setReminderMinutes(parseInt(v))}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 min before</SelectItem>
                      <SelectItem value="15">15 min before</SelectItem>
                      <SelectItem value="30">30 min before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Switch
                  id="setReminder"
                  checked={setReminder}
                  onCheckedChange={setSetReminder}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Mark as Completed */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label htmlFor="isCompleted" className="font-normal cursor-pointer">
              Mark as completed
            </Label>
            <Switch
              id="isCompleted"
              checked={isCompleted}
              onCheckedChange={setIsCompleted}
            />
          </div>

          {/* Outcome (if completed) */}
          {isCompleted && (
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="What was the result of this activity?"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {mode === "create" ? "Log Activity" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
