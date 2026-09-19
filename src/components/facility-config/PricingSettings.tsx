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

// ============================================================================
// Platform pricing — tax only.
//
// ── WHAT LEFT, AND WHY ────────────────────────────────────────────────────
//
// A "Default Pricing" block used to sit above the tax settings: a base price
// and an additional-pet price for boarding, daycare and grooming, under a
// checkbox reading "Enforce on all facilities — facilities cannot customize
// prices".
//
// Nothing read any of it. `config.pricing.defaultPricing` had exactly one
// reader, this file; the numbers (boarding 50, daycare 30, grooming 40) came
// from the `src/data/facility-config.ts` fixture, were never written to
// `facility_settings`, and never reached a booking. The enforcement checkbox
// enforced nothing. So the screen offered Yipyy's team a way to set every
// facility's prices, warned that doing so was destructive, and then did not
// do it.
//
// It is also not the product: a facility prices its own work. Rooms carry
// their nightly rates, daycare its rate cards, grooming its services, and a
// facility that has set none of those has no prices yet — which is the
// correct state for a business that has just been created, not something for
// the platform to fill in.
// ============================================================================

type FacilityConfig = typeof facilityConfig;

interface PricingSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

export function PricingSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: PricingSettingsProps) {
  const [editing, setEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<FacilityConfig | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    changes: Record<string, string | number | boolean> | null;
  }>({
    isOpen: false,
    changes: null,
  });

  const handleToggle = () => {
    if (isOpen) {
      setEditing(false);
      setTempConfig(null);
    }
    onToggle();
  };

  const startEditing = () => {
    setEditing(true);
    setTempConfig(config);
  };

  const cancelEditing = () => {
    setEditing(false);
    setTempConfig(null);
  };

  const updateTaxField = (
    subField: "taxRate" | "taxIncluded",
    value: number | boolean,
  ) => {
    if (!tempConfig) return;
    const newConfig = { ...tempConfig };
    if (subField === "taxRate") {
      newConfig.pricing.taxSettings.taxRate = value as number;
    } else {
      newConfig.pricing.taxSettings.taxIncluded = value as boolean;
    }
    setTempConfig(newConfig);
  };

  const confirmPricingChange = () => {
    if (confirmationModal.changes && tempConfig) {
      const newConfig = { ...tempConfig };
      Object.entries(confirmationModal.changes).forEach(([key, value]) => {
        if (key === "taxRate") {
          newConfig.pricing.taxSettings.taxRate = value as number;
        } else if (key === "taxIncluded") {
          newConfig.pricing.taxSettings.taxIncluded = value as boolean;
        }
      });

      setConfig(newConfig);
      onSave();
    }
    setConfirmationModal({ isOpen: false, changes: null });
    setEditing(false);
    setTempConfig(null);
  };

  const cancelModal = () => {
    setConfirmationModal({ isOpen: false, changes: null });
  };

  const handleSaveClick = () => {
    if (!editing || !tempConfig) return;
    const changes: Record<string, string | number | boolean> = {};

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
      setConfirmationModal({ isOpen: true, changes });
    } else {
      setEditing(false);
      setTempConfig(null);
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
              <DollarSign className="size-5" />
              Tax Settings
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground size-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p>
                      The tax defaults new facilities start from. What each
                      service costs is the facility&apos;s own to set, in its
                      rooms, rates and services.
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">Tax</h4>
                  <p className="text-muted-foreground text-sm">
                    Applied where a facility has not set its own
                  </p>
                </div>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Edit className="mr-1 size-3" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveClick}
                    >
                      <Check className="mr-1 size-3" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      <X className="mr-1 size-3" />
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
                      updateTaxField(
                        "taxRate",
                        parseFloat(e.target.value) / 100 || 0,
                      )
                    }
                    disabled={!editing}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxIncluded"
                    checked={currentConfig.pricing.taxSettings.taxIncluded}
                    onCheckedChange={(checked) =>
                      updateTaxField("taxIncluded", !!checked)
                    }
                    disabled={!editing}
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
        title="Confirm Tax Changes"
        description="You are about to change the tax defaults new facilities start from. A facility that has set its own tax keeps it."
        confirmText="Confirm Changes"
      />
    </TooltipProvider>
  );
}
