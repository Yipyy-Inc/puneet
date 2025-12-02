"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, CheckCircle2 } from "lucide-react";
import { messageTemplates } from "@/data/communications-hub";

interface AutomationRuleModalProps {
  rule?: any;
  onClose: () => void;
}

export function AutomationRuleModal({
  rule,
  onClose,
}: AutomationRuleModalProps) {
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    trigger: rule?.trigger || "booking_created",
    enabled: rule?.enabled ?? true,
    messageType: rule?.messageType || "email",
    templateId: rule?.templateId || "",
    hoursBefore: rule?.schedule?.hoursBefore || 24,
    daysBeforeExpiry: rule?.schedule?.daysBeforeExpiry || 30,
  });

  const triggerOptions = [
    {
      value: "booking_created",
      label: "Booking Created",
      desc: "When a new booking is created",
    },
    {
      value: "24h_before",
      label: "24-Hour Reminder",
      desc: "24 hours before appointment",
    },
    { value: "check_in", label: "Check-In", desc: "When pet is checked in" },
    { value: "check_out", label: "Check-Out", desc: "When pet is checked out" },
    {
      value: "payment_received",
      label: "Payment Received",
      desc: "When payment is processed",
    },
    {
      value: "vaccination_expiry",
      label: "Vaccination Expiry",
      desc: "Before vaccination expires",
    },
    {
      value: "appointment_reminder",
      label: "Appointment Reminder",
      desc: "For grooming/training appointments",
    },
  ];

  const handleSave = () => {
    console.log("Saving automation rule:", formData);
    onClose();
  };

  const selectedTrigger = triggerOptions.find(
    (t) => t.value === formData.trigger,
  );
  const showHoursBefore =
    formData.trigger === "24h_before" ||
    formData.trigger === "appointment_reminder";
  const showDaysBeforeExpiry = formData.trigger === "vaccination_expiry";

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {rule ? "Edit Automation Rule" : "Create Automation Rule"}
        </DialogTitle>
        <DialogDescription>
          Automatically send messages when specific events occur
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Rule Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Booking Confirmation Email"
          />
        </div>

        {/* Trigger */}
        <div className="space-y-2">
          <Label htmlFor="trigger">Trigger Event *</Label>
          <Select
            value={formData.trigger}
            onValueChange={(value) =>
              setFormData({ ...formData, trigger: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {triggerOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.desc}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrigger && (
            <p className="text-sm text-muted-foreground">
              {selectedTrigger.desc}
            </p>
          )}
        </div>

        {/* Message Type */}
        <div className="space-y-2">
          <Label htmlFor="messageType">Message Type *</Label>
          <Select
            value={formData.messageType}
            onValueChange={(value: any) =>
              setFormData({ ...formData, messageType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="both">Both (Email + SMS)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template */}
        <div className="space-y-2">
          <Label htmlFor="template">Message Template *</Label>
          <Select
            value={formData.templateId}
            onValueChange={(value) =>
              setFormData({ ...formData, templateId: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {messageTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Settings */}
        {(showHoursBefore || showDaysBeforeExpiry) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label className="text-base">Schedule Settings</Label>

              {showHoursBefore && (
                <div className="space-y-2">
                  <Label htmlFor="hoursBefore">
                    Send How Many Hours Before?
                  </Label>
                  <Input
                    id="hoursBefore"
                    type="number"
                    min="1"
                    value={formData.hoursBefore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hoursBefore: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Message will be sent {formData.hoursBefore} hours before the
                    appointment
                  </p>
                </div>
              )}

              {showDaysBeforeExpiry && (
                <div className="space-y-2">
                  <Label htmlFor="daysBeforeExpiry">
                    Send How Many Days Before Expiry?
                  </Label>
                  <Input
                    id="daysBeforeExpiry"
                    type="number"
                    min="1"
                    value={formData.daysBeforeExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daysBeforeExpiry: parseInt(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Warning sent {formData.daysBeforeExpiry} days before
                    vaccination expires
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enable/Disable */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enabled: checked as boolean })
            }
          />
          <label
            htmlFor="enabled"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Enable this automation rule
          </label>
        </div>

        {/* Stats (if viewing existing rule) */}
        {rule && (
          <Card>
            <CardContent className="pt-6">
              <Label className="text-base mb-4 block">Statistics</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Sent
                  </div>
                  <div className="text-2xl font-bold">
                    {rule.stats.totalSent}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Last Triggered
                  </div>
                  <div className="text-sm font-medium">
                    {rule.stats.lastTriggered
                      ? new Date(rule.stats.lastTriggered).toLocaleString()
                      : "Never"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.name || !formData.templateId}
        >
          <Zap className="h-4 w-4 mr-2" />
          {rule ? "Update" : "Create"} Rule
        </Button>
      </DialogFooter>
    </>
  );
}
