"use client";

import { SaveBar } from "@/components/ui/save-bar";
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
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Booking Approval Settings Component
export function BookingApprovalSettingsCard() {
  const t = useSettingsText().section("booking-rules");
  const BUILT_IN_SERVICES = [
    { key: "boarding", label: t("svcBoarding") },
    { key: "daycare", label: t("svcDaycare") },
    { key: "grooming", label: t("svcGrooming") },
    { key: "training", label: t("svcTraining") },
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
          <CardTitle>{t("approvalTitle")}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("approvalHelp")}
          </p>
        </div>
        {/* Edit alone in the header; save and discard live at the card's
            foot in SaveBar, the same place they sit on every other screen. */}
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {t("edit")}
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
                    {svc.enabled ? t("requiresApproval") : t("directBooking")}
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
                    <Label className="text-xs">{t("responseTime")}</Label>
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
                    <Label className="text-xs">{t("autoConfirmAfter")}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t("never")}
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
                      {t("leaveEmptyManual")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* `dirty` derived from the draft against the committed config — no
            third copy of the truth, and nothing captured before a query
            answered. */}
        {isEditing && (
          <SaveBar
            placement="card"
            dirty={JSON.stringify(draft) !== JSON.stringify(config)}
            onSave={handleSave}
            onReset={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  );
}
