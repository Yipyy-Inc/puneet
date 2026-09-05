"use client";

import { useState } from "react";

import {
  getApprovalConfig,
  saveApprovalConfig,
  type ServiceApprovalConfig,
} from "@/data/facility-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

// Booking Approval Settings Component
export function BookingApprovalSettingsCard() {
  const BUILT_IN_SERVICES = [
    { key: "boarding", label: "Boarding" },
    { key: "daycare", label: "Daycare" },
    { key: "grooming", label: "Grooming" },
    { key: "training", label: "Training" },
  ];

  const [config, setConfig] = useState(() => getApprovalConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(config);

  const handleSave = () => {
    saveApprovalConfig(draft);
    setConfig(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(config);
    setIsEditing(false);
  };

  const updateService = (
    key: string,
    updates: Partial<ServiceApprovalConfig>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          enabled: false,
          estimatedResponseTime: 24,
          autoConfirmAfterHours: null,
        }),
        ...updates,
      },
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Booking Approval by Service</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose which services require approval before a booking is
            confirmed. When enabled, customer bookings go to a request queue for
            staff review.
          </p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {BUILT_IN_SERVICES.map(({ key, label }) => {
          const svc = draft[key] ?? {
            enabled: false,
            estimatedResponseTime: 24,
            autoConfirmAfterHours: null,
          };
          return (
            <div key={key} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-muted-foreground text-sm">
                    {svc.enabled
                      ? "Requires approval — bookings go to request queue"
                      : "Direct booking — customers are confirmed instantly"}
                  </div>
                </div>
                <Switch
                  checked={svc.enabled}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    updateService(key, { enabled: checked })
                  }
                />
              </div>
              {svc.enabled && (
                <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Estimated response time (hours)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={svc.estimatedResponseTime}
                      onChange={(e) =>
                        updateService(key, {
                          estimatedResponseTime: parseInt(e.target.value) || 24,
                        })
                      }
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Auto-confirm after (hours)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Never"
                      value={svc.autoConfirmAfterHours ?? ""}
                      onChange={(e) =>
                        updateService(key, {
                          autoConfirmAfterHours: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave empty to require manual approval
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
