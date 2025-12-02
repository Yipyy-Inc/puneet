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
import { Badge } from "@/components/ui/badge";
import { PhoneForwarded } from "lucide-react";

interface RoutingRuleModalProps {
  onClose: () => void;
}

export function RoutingRuleModal({ onClose }: RoutingRuleModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
    priority: 1,
    callerType: "",
    timeStart: "",
    timeEnd: "",
    selectedDays: [] as string[],
    action: "ai_handles" as
      | "ai_handles"
      | "transfer_to_staff"
      | "voicemail"
      | "specific_extension",
    destination: "",
  });

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const handleSave = () => {
    console.log("Saving routing rule:", formData);
    onClose();
  };

  const toggleDay = (day: string) => {
    if (formData.selectedDays.includes(day)) {
      setFormData({
        ...formData,
        selectedDays: formData.selectedDays.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        selectedDays: [...formData.selectedDays, day],
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Routing Rule</DialogTitle>
        <DialogDescription>
          Configure how incoming calls are handled based on conditions
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
            placeholder="e.g., VIP Customers Direct to Manager"
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: parseInt(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Lower numbers = higher priority. Rules are evaluated in priority
            order.
          </p>
        </div>

        {/* Conditions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base">Conditions</Label>
            <p className="text-sm text-muted-foreground">
              When should this rule apply? Leave empty to match all.
            </p>

            {/* Caller Type */}
            <div className="space-y-2">
              <Label htmlFor="callerType">Caller Type (Optional)</Label>
              <Select
                value={formData.callerType}
                onValueChange={(value) =>
                  setFormData({ ...formData, callerType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any caller type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="new">New Callers</SelectItem>
                  <SelectItem value="existing">Existing Customers</SelectItem>
                  <SelectItem value="vip">VIP Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time of Day */}
            <div className="space-y-2">
              <Label>Time of Day (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="timeStart"
                    className="text-xs text-muted-foreground"
                  >
                    Start Time
                  </Label>
                  <Input
                    id="timeStart"
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) =>
                      setFormData({ ...formData, timeStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="timeEnd"
                    className="text-xs text-muted-foreground"
                  >
                    End Time
                  </Label>
                  <Input
                    id="timeEnd"
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, timeEnd: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Days of Week */}
            <div className="space-y-2">
              <Label>Days of Week (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <Badge
                    key={day}
                    variant={
                      formData.selectedDays.includes(day)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer capitalize"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        <div className="space-y-2">
          <Label htmlFor="action">Action *</Label>
          <Select
            value={formData.action}
            onValueChange={(
              value:
                | "ai_handles"
                | "transfer_to_staff"
                | "voicemail"
                | "specific_extension",
            ) => setFormData({ ...formData, action: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai_handles">AI Handles Call</SelectItem>
              <SelectItem value="transfer_to_staff">
                Transfer to Staff
              </SelectItem>
              <SelectItem value="voicemail">Send to Voicemail</SelectItem>
              <SelectItem value="specific_extension">
                Specific Extension
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Destination (if transfer) */}
        {(formData.action === "transfer_to_staff" ||
          formData.action === "specific_extension") && (
          <div className="space-y-2">
            <Label htmlFor="destination">
              {formData.action === "transfer_to_staff"
                ? "Staff Member"
                : "Extension Number"}{" "}
              *
            </Label>
            {formData.action === "transfer_to_staff" ? (
              <Select
                value={formData.destination}
                onValueChange={(value) =>
                  setFormData({ ...formData, destination: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah">Manager - Sarah Johnson</SelectItem>
                  <SelectItem value="mike">Staff - Mike Davis</SelectItem>
                  <SelectItem value="emily">Groomer - Emily Brown</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                placeholder="e.g., 101"
              />
            )}
          </div>
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
            Enable this routing rule
          </label>
        </div>

        {/* Preview */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-base mb-3 block">Rule Preview</Label>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div>
                <strong>If:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  {formData.callerType && (
                    <li>
                      • Caller is:{" "}
                      <Badge variant="outline" className="ml-1 capitalize">
                        {formData.callerType}
                      </Badge>
                    </li>
                  )}
                  {formData.timeStart && formData.timeEnd && (
                    <li>
                      • Time between: {formData.timeStart} - {formData.timeEnd}
                    </li>
                  )}
                  {formData.selectedDays.length > 0 && (
                    <li>
                      • On days:{" "}
                      {formData.selectedDays
                        .map((d) => d.slice(0, 3))
                        .join(", ")}
                    </li>
                  )}
                  {!formData.callerType &&
                    !formData.timeStart &&
                    formData.selectedDays.length === 0 && (
                      <li>• Any call (no conditions set)</li>
                    )}
                </ul>
              </div>
              <div>
                <strong>Then:</strong>
                <div className="ml-4 mt-1">
                  •{" "}
                  {formData.action.replace(/_/g, " ").charAt(0).toUpperCase() +
                    formData.action.replace(/_/g, " ").slice(1)}
                  {formData.destination && ` → ${formData.destination}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.name}>
          <PhoneForwarded className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </DialogFooter>
    </>
  );
}
