"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WarningModal } from "./WarningModal";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { facilityConfig } from "@/data/facility-config";
import {
  Calendar,
  Edit,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";

type FacilityConfig = typeof facilityConfig;

interface BookingRulesSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

type BookingField = "cutOffTimes" | "deposits" | "cancellationPolicies";

export function BookingRulesSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: BookingRulesSettingsProps) {
  const [editingField, setEditingField] = useState<BookingField | null>(null);
  const [tempConfig, setTempConfig] = useState<FacilityConfig | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    field: BookingField | null;
    changes: Record<string, string | number | boolean> | null;
  }>({
    isOpen: false,
    field: null,
    changes: null,
  });
  const [enforcementModal, setEnforcementModal] = useState<{
    isOpen: boolean;
    newValue: boolean;
  }>({
    isOpen: false,
    newValue: false,
  });

  const handleToggle = () => {
    if (isOpen) {
      setEditingField(null);
      setTempConfig(null);
    }
    onToggle();
  };

  const startEditing = (field: BookingField) => {
    setEditingField(field);
    setTempConfig(config);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempConfig(null);
  };

  const updateBookingField = (
    field: BookingField,
    subField: string,
    value: string | number | boolean,
  ) => {
    if (tempConfig) {
      const newConfig = { ...tempConfig };
      if (field === "cutOffTimes" && typeof value === "number") {
        newConfig.bookingRules.cutOffTimes[
          subField as keyof typeof newConfig.bookingRules.cutOffTimes
        ] = value;
      } else if (field === "deposits") {
        if (subField === "required" && typeof value === "boolean") {
          newConfig.bookingRules.deposits.required = value;
        } else if (subField === "percentage" && typeof value === "number") {
          newConfig.bookingRules.deposits.percentage = value;
        }
      }
      setTempConfig(newConfig);
    }
  };

  const confirmBookingChange = () => {
    if (confirmationModal.changes && tempConfig) {
      const newConfig = { ...tempConfig };

      if (confirmationModal.field) {
        // Apply changes to the specific field
        Object.entries(confirmationModal.changes!).forEach(([key, value]) => {
          if (
            confirmationModal.field === "cutOffTimes" &&
            typeof value === "number"
          ) {
            newConfig.bookingRules.cutOffTimes[
              key as keyof typeof newConfig.bookingRules.cutOffTimes
            ] = value;
          } else if (confirmationModal.field === "deposits") {
            if (key === "required" && typeof value === "boolean") {
              newConfig.bookingRules.deposits.required = value;
            } else if (key === "percentage" && typeof value === "number") {
              newConfig.bookingRules.deposits.percentage = value;
            }
          }
        });
      }

      setConfig(newConfig);
      onSave();
    }
    setConfirmationModal({
      isOpen: false,
      field: null,
      changes: null,
    });
    setEditingField(null);
    setTempConfig(null);
  };

  const confirmEnforcementChange = () => {
    setConfig({
      ...config,
      bookingRules: {
        ...config.bookingRules,
        enforceOnAll: enforcementModal.newValue,
      },
    });
    onSave();
  };

  const cancelModal = () => {
    setConfirmationModal({
      isOpen: false,
      field: null,
      changes: null,
    });
    setEnforcementModal({
      isOpen: false,
      newValue: false,
    });
  };

  const handleEnforcementChange = (checked: boolean) => {
    if (checked !== config.bookingRules.enforceOnAll) {
      setEnforcementModal({
        isOpen: true,
        newValue: checked,
      });
    }
  };

  const handleSaveClick = () => {
    if (editingField && tempConfig) {
      const changes: Record<string, string | number | boolean> = {};

      if (editingField === "cutOffTimes") {
        Object.entries(tempConfig.bookingRules.cutOffTimes).forEach(
          ([service, hours]) => {
            if (
              hours !==
              config.bookingRules.cutOffTimes[
                service as keyof typeof config.bookingRules.cutOffTimes
              ]
            ) {
              changes[service] = hours;
            }
          },
        );
      } else if (editingField === "deposits") {
        if (
          tempConfig.bookingRules.deposits.required !==
          config.bookingRules.deposits.required
        ) {
          changes.required = tempConfig.bookingRules.deposits.required;
        }
        if (
          tempConfig.bookingRules.deposits.percentage !==
          config.bookingRules.deposits.percentage
        ) {
          changes.percentage = tempConfig.bookingRules.deposits.percentage;
        }
      }

      if (Object.keys(changes).length > 0) {
        setConfirmationModal({
          isOpen: true,
          field: editingField,
          changes,
        });
      } else {
        // No changes, just close
        setEditingField(null);
        setTempConfig(null);
      }
    }
  };

  const currentConfig = tempConfig || config;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader
          className="cursor-pointer transition-colors"
          onClick={handleToggle}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Rules
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground size-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p>
                      Configure booking policies including cut-off times,
                      deposit requirements, and cancellation policies.
                    </p>
                    <p>
                      Use the enforcement toggle to control whether facilities
                      must follow these rules or can set their own policies.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </CardTitle>
        </CardHeader>
        {isOpen && (
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-medium">Booking Rules</h4>
                <p className="text-muted-foreground text-sm">
                  Configure booking policies and requirements
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enforceBooking"
                  checked={currentConfig.bookingRules.enforceOnAll || false}
                  onCheckedChange={handleEnforcementChange}
                />
                <Label htmlFor="enforceBooking" className="text-sm">
                  Enforce on all facilities
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground size-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <p>
                        <strong>When enabled:</strong> These booking rules are
                        mandatory for all facilities. Facilities cannot set
                        their own policies.
                      </p>
                      <p>
                        <strong>When disabled:</strong> These become default
                        rules that facilities can customize for their needs.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">Cut-off Times</h5>
                {!editingField && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing("cutOffTimes")}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
                {editingField === "cutOffTimes" && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveClick}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 pl-4">
                {Object.entries(currentConfig.bookingRules.cutOffTimes).map(
                  ([service, hours]) => (
                    <div key={service}>
                      <Label className="text-sm capitalize">{service}</Label>
                      <Input
                        type="number"
                        value={hours}
                        onChange={(e) =>
                          updateBookingField(
                            "cutOffTimes",
                            service,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        disabled={editingField !== "cutOffTimes"}
                        placeholder="hours"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">Deposit Requirements</h5>
                {!editingField && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing("deposits")}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
                {editingField === "deposits" && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveClick}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="depositRequired"
                    checked={currentConfig.bookingRules.deposits.required}
                    onCheckedChange={(checked) =>
                      updateBookingField("deposits", "required", !!checked)
                    }
                    disabled={editingField !== "deposits"}
                  />
                  <Label htmlFor="depositRequired" className="text-sm">
                    Deposit Required
                  </Label>
                </div>
                <div>
                  <Label className="text-sm">Deposit Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentConfig.bookingRules.deposits.percentage * 100}
                    onChange={(e) =>
                      updateBookingField(
                        "deposits",
                        "percentage",
                        parseFloat(e.target.value) / 100 || 0,
                      )
                    }
                    disabled={editingField !== "deposits"}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <WarningModal
        isOpen={confirmationModal.isOpen}
        onClose={cancelModal}
        onConfirm={confirmBookingChange}
        title="Confirm Booking Rules Changes"
        description={`You are about to update booking rules. This will affect how bookings are managed across facilities. ${
          currentConfig.bookingRules.enforceOnAll
            ? "These rules will be enforced on all facilities."
            : "Facilities can customize these default rules."
        }`}
        confirmText="Confirm Changes"
      />

      <WarningModal
        isOpen={enforcementModal.isOpen}
        onClose={cancelModal}
        onConfirm={confirmEnforcementChange}
        title="Confirm Enforcement Change"
        description={`You are about to ${
          enforcementModal.newValue ? "enable" : "disable"
        } booking rules enforcement across facilities. ${
          enforcementModal.newValue
            ? "All facilities will be required to use these exact booking rules. Any existing custom policies will be overridden."
            : "Facilities will be able to customize these default rules. This gives facilities more flexibility but may lead to inconsistent booking policies."
        }`}
        confirmText="Confirm Change"
      />
    </TooltipProvider>
  );
}
