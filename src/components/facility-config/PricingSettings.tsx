"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { facilityConfig } from "@/data/facility-config";
import {
  DollarSign,
  Edit,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { WarningModal } from "./WarningModal";

type FacilityConfig = typeof facilityConfig;

interface PricingSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

type PricingField = "boarding" | "daycare" | "grooming";

export function PricingSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: PricingSettingsProps) {
  const [editingField, setEditingField] = useState<PricingField | null>(null);
  const [tempConfig, setTempConfig] = useState<FacilityConfig | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    field: PricingField | null;
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

  const startEditing = (field: PricingField) => {
    setEditingField(field);
    setTempConfig(config);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempConfig(null);
  };

  const updatePricingField = (
    field: PricingField,
    subField: string,
    value: string | number | boolean,
  ) => {
    if (tempConfig) {
      const newConfig = { ...tempConfig };
      if (subField === "basePrice" || subField === "additionalPet") {
        newConfig.pricing.defaultPricing[field][subField] = value as number;
      } else if (subField === "taxRate") {
        newConfig.pricing.taxSettings.taxRate = value as number;
      } else if (subField === "taxIncluded") {
        newConfig.pricing.taxSettings.taxIncluded = value as boolean;
      }
      setTempConfig(newConfig);
    }
  };

  const confirmPricingChange = () => {
    if (confirmationModal.changes && tempConfig) {
      const newConfig = { ...tempConfig };

      if (confirmationModal.field) {
        // Apply changes to the specific field
        Object.entries(confirmationModal.changes!).forEach(([key, value]) => {
          if (key === "basePrice" || key === "additionalPet") {
            newConfig.pricing.defaultPricing[confirmationModal.field!][key] =
              value as number;
          } else if (key === "taxRate") {
            newConfig.pricing.taxSettings.taxRate = value as number;
          } else if (key === "taxIncluded") {
            newConfig.pricing.taxSettings.taxIncluded = value as boolean;
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
      pricing: {
        ...config.pricing,
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
    if (checked !== config.pricing.enforceOnAll) {
      setEnforcementModal({
        isOpen: true,
        newValue: checked,
      });
    }
  };

  const handleSaveClick = () => {
    if (editingField && tempConfig) {
      const changes: Record<string, string | number | boolean> = {};

      // Compare default pricing
      if (
        tempConfig.pricing.defaultPricing[editingField].basePrice !==
        config.pricing.defaultPricing[editingField].basePrice
      ) {
        changes.basePrice =
          tempConfig.pricing.defaultPricing[editingField].basePrice;
      }
      if (
        tempConfig.pricing.defaultPricing[editingField].additionalPet !==
        config.pricing.defaultPricing[editingField].additionalPet
      ) {
        changes.additionalPet =
          tempConfig.pricing.defaultPricing[editingField].additionalPet;
      }

      // Compare tax settings
      if (
        tempConfig.pricing.taxSettings.taxRate !==
        config.pricing.taxSettings.taxRate
      ) {
        changes.taxRate = tempConfig.pricing.taxSettings.taxRate;
      }
      if (
        tempConfig.pricing.taxSettings.taxIncluded !==
        config.pricing.taxSettings.taxIncluded
      ) {
        changes.taxIncluded = tempConfig.pricing.taxSettings.taxIncluded;
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
              <DollarSign className="h-5 w-5" />
              Pricing Structures
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground size-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p>
                      Configure default pricing for services and tax settings
                      that apply across all facilities.
                    </p>
                    <p>
                      Use the enforcement toggle to control whether facilities
                      can customize these prices or must use the defaults.
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
                <h4 className="text-base font-medium">Default Pricing</h4>
                <p className="text-muted-foreground text-sm">
                  Set default pricing for services across all facilities
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enforcePricing"
                  checked={currentConfig.pricing.enforceOnAll || false}
                  onCheckedChange={handleEnforcementChange}
                />
                <Label htmlFor="enforcePricing" className="text-sm">
                  Enforce on all facilities
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground size-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <p>
                        <strong>When enabled:</strong> These pricing settings
                        are mandatory for all facilities. Facilities cannot
                        customize prices.
                      </p>
                      <p>
                        <strong>When disabled:</strong> These become default
                        prices that facilities can customize for their needs.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {Object.entries(currentConfig.pricing.defaultPricing).map(
              ([service, pricing]) => (
                <div key={service} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium capitalize">
                      {service} Pricing
                    </h5>
                    {!editingField && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(service as PricingField)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                    {editingField === service && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSaveClick}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-4">
                    <div>
                      <Label className="text-sm">Base Price ($)</Label>
                      <Input
                        type="number"
                        value={pricing.basePrice}
                        onChange={(e) =>
                          updatePricingField(
                            service as PricingField,
                            "basePrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        disabled={editingField !== service}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Additional Pet ($)</Label>
                      <Input
                        type="number"
                        value={pricing.additionalPet}
                        onChange={(e) =>
                          updatePricingField(
                            service as PricingField,
                            "additionalPet",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        disabled={editingField !== service}
                      />
                    </div>
                  </div>
                </div>
              ),
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-medium">Tax Settings</h4>
                {!editingField && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing("boarding" as PricingField)} // Use any field to enable tax editing
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
                {editingField && (
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
                <div>
                  <Label className="text-sm">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentConfig.pricing.taxSettings.taxRate * 100}
                    onChange={(e) =>
                      updatePricingField(
                        "boarding" as PricingField, // Use any field
                        "taxRate",
                        parseFloat(e.target.value) / 100 || 0,
                      )
                    }
                    disabled={!editingField}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxIncluded"
                    checked={currentConfig.pricing.taxSettings.taxIncluded}
                    onCheckedChange={(checked) =>
                      updatePricingField(
                        "boarding" as PricingField, // Use any field
                        "taxIncluded",
                        !!checked,
                      )
                    }
                    disabled={!editingField}
                  />
                  <Label htmlFor="taxIncluded" className="text-sm">
                    Tax Included in Price
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <WarningModal
        isOpen={confirmationModal.isOpen}
        onClose={cancelModal}
        onConfirm={confirmPricingChange}
        title="Confirm Pricing Changes"
        description={`You are about to update pricing settings. This will affect how services are priced across facilities. ${
          currentConfig.pricing.enforceOnAll
            ? "These prices will be enforced on all facilities."
            : "Facilities can customize these default prices."
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
        } pricing enforcement across facilities. ${
          enforcementModal.newValue
            ? "All facilities will be required to use these exact pricing settings. Any existing custom pricing will be overridden."
            : "Facilities will be able to customize these default prices. This gives facilities more flexibility but may lead to inconsistent pricing."
        }`}
        confirmText="Confirm Change"
      />
    </TooltipProvider>
  );
}
