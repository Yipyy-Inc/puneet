import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PawPrint,
  FileText,
  FileCheck,
  Save,
  ChevronDown,
  ChevronRight,
  Edit,
  X,
  Info,
} from "lucide-react";
import { facilityConfig } from "@/data/facility-config";
import { WarningModal } from "./WarningModal";
import { DestructiveModal } from "./DestructiveModal";

type FacilityConfig = typeof facilityConfig;

interface AdvancedSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

export function AdvancedSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: AdvancedSettingsProps) {
  const [editingPetCategories, setEditingPetCategories] = useState(false);
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [editingWaivers, setEditingWaivers] = useState(false);
  const [destructiveModal, setDestructiveModal] = useState<{
    isOpen: boolean;
    description: string;
  }>({
    isOpen: false,
    description: "",
  });
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    type: "petCategories" | "customFields" | "waivers";
  }>({
    isOpen: false,
    type: "petCategories",
  });

  const handleSavePetCategories = () => {
    // Check if weight limits are being made more restrictive (could affect existing pets)
    const hasRestrictiveChange = Object.entries(
      config.petCategories.weightLimits,
    ).some(([size, limits]) => {
      const originalLimits =
        facilityConfig.petCategories.weightLimits[
          size as keyof typeof facilityConfig.petCategories.weightLimits
        ];
      return (
        limits.min > originalLimits.min ||
        (limits.max !== Infinity && limits.max < originalLimits.max)
      );
    });

    if (hasRestrictiveChange) {
      setDestructiveModal({
        isOpen: true,
        description:
          "You are about to make weight limits more restrictive. This may affect existing pets and bookings. Existing pets outside these limits may need special handling.",
      });
    } else {
      setWarningModal({ isOpen: true, type: "petCategories" });
    }
  };

  const handleCancelPetCategories = () => {
    setEditingPetCategories(false);
  };

  const handleSaveCustomFields = () => {
    setWarningModal({ isOpen: true, type: "customFields" });
  };

  const handleCancelCustomFields = () => {
    setEditingCustomFields(false);
  };

  const handleSaveWaivers = () => {
    // Check if required waivers are being made optional
    const originalRequired = Object.values(
      facilityConfig.waiversAndContracts.templates,
    ).map((t) => t.required);
    const currentRequired = Object.values(
      config.waiversAndContracts.templates,
    ).map((t) => t.required);
    const hasDestructiveChange = originalRequired.some(
      (orig, idx) => orig && !currentRequired[idx],
    );

    if (hasDestructiveChange) {
      setDestructiveModal({
        isOpen: true,
        description:
          "You are about to make required waivers optional. This may affect legal compliance and existing bookings. Please ensure this aligns with your legal requirements.",
      });
    } else {
      setWarningModal({ isOpen: true, type: "waivers" });
    }
  };

  const handleCancelWaivers = () => {
    setEditingWaivers(false);
  };

  const confirmDestructive = () => {
    if (destructiveModal.description.includes("weight limits")) {
      setEditingPetCategories(false);
    } else {
      setEditingWaivers(false);
    }
    setDestructiveModal({ isOpen: false, description: "" });
    onSave();
  };

  const confirmWarning = () => {
    if (warningModal.type === "petCategories") {
      setEditingPetCategories(false);
    } else if (warningModal.type === "customFields") {
      setEditingCustomFields(false);
    } else {
      setEditingWaivers(false);
    }
    onSave();
  };

  const cancelModal = () => {
    setDestructiveModal({ isOpen: false, description: "" });
    setWarningModal({ isOpen: false, type: "petCategories" });
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Advanced Settings
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground size-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <div>
                          <strong>Pet Categories:</strong> Define weight limits
                          for pet sizes. Changes may affect existing pet
                          classifications.
                        </div>
                        <div>
                          <strong>Custom Fields:</strong> Configure additional
                          data fields for pets, customers, and bookings.
                        </div>
                        <div>
                          <strong>Waivers & Contracts:</strong> Set required
                          legal documents. Changes may affect compliance
                          requirements.
                        </div>
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
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Pet Categories & Restrictions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PawPrint className="h-5 w-5" />
                    Pet Categories & Restrictions
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground size-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Set weight limits for different pet sizes. Making
                          limits more restrictive may affect existing pets.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  {!editingPetCategories ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPetCategories(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelPetCategories}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSavePetCategories}>
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Weight Limits (lbs)</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {Object.entries(config.petCategories.weightLimits).map(
                        ([size, limits]) => (
                          <div key={size} className="space-y-2">
                            <Label className="text-sm capitalize">{size}</Label>
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Min"
                                type="number"
                                value={limits.min}
                                disabled={!editingPetCategories}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    petCategories: {
                                      ...prev.petCategories,
                                      weightLimits: {
                                        ...prev.petCategories.weightLimits,
                                        [size]: {
                                          ...limits,
                                          min: parseInt(e.target.value) || 0,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                              <Input
                                placeholder="Max"
                                type="number"
                                value={
                                  limits.max === Infinity ? "" : limits.max
                                }
                                disabled={!editingPetCategories}
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    petCategories: {
                                      ...prev.petCategories,
                                      weightLimits: {
                                        ...prev.petCategories.weightLimits,
                                        [size]: {
                                          ...limits,
                                          max: e.target.value
                                            ? parseInt(e.target.value)
                                            : Infinity,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Fields */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Custom Fields
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground size-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Configure additional fields for data collection.
                          Changes affect new entries only.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  {!editingCustomFields ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCustomFields(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelCustomFields}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveCustomFields}>
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pet Custom Fields</Label>
                    <div className="mt-2 space-y-2">
                      {config.customFields.pets.map((field, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <Input
                            value={field.name}
                            disabled={!editingCustomFields}
                            className="flex-1"
                            onChange={(e) =>
                              setConfig((prev) => {
                                const newPets = [...prev.customFields.pets];
                                newPets[index] = {
                                  ...field,
                                  name: e.target.value,
                                };
                                return {
                                  ...prev,
                                  customFields: {
                                    ...prev.customFields,
                                    pets: newPets,
                                  },
                                };
                              })
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            {field.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Waivers & Contracts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileCheck className="h-5 w-5" />
                    Waivers & Contracts
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground size-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Set which legal documents are required. Making
                          required waivers optional may affect legal compliance.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  {!editingWaivers ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingWaivers(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelWaivers}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveWaivers}>
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(config.waiversAndContracts.templates).map(
                    ([key, template]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={template.required}
                          disabled={!editingWaivers}
                          onCheckedChange={(checked) =>
                            setConfig((prev) => ({
                              ...prev,
                              waiversAndContracts: {
                                ...prev.waiversAndContracts,
                                templates: {
                                  ...prev.waiversAndContracts.templates,
                                  [key]: { ...template, required: !!checked },
                                },
                              },
                            }))
                          }
                        />
                        <Label htmlFor={key}>{template.name}</Label>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <DestructiveModal
        isOpen={destructiveModal.isOpen}
        onClose={cancelModal}
        onConfirm={confirmDestructive}
        title="Confirm Destructive Changes"
        description={destructiveModal.description}
        confirmText="Proceed Anyway"
      />

      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={cancelModal}
        onConfirm={confirmWarning}
        title={`Confirm ${warningModal.type === "petCategories" ? "Pet Category" : warningModal.type === "customFields" ? "Custom Field" : "Waiver"} Changes`}
        description={`You are about to save changes to ${
          warningModal.type === "petCategories"
            ? "pet categories and restrictions"
            : warningModal.type === "customFields"
              ? "custom fields"
              : "waivers and contracts"
        }. Please review your changes carefully before proceeding.`}
        confirmText="Confirm Changes"
      />
    </TooltipProvider>
  );
}
