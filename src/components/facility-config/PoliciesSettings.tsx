import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Shield,
  Users,
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

interface PoliciesSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

export function PoliciesSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: PoliciesSettingsProps) {
  const [editingVaccinations, setEditingVaccinations] = useState(false);
  const [editingRoles, setEditingRoles] = useState(false);
  const [destructiveModal, setDestructiveModal] = useState<{
    isOpen: boolean;
    description: string;
  }>({
    isOpen: false,
    description: "",
  });
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    type: "vaccinations" | "roles";
  }>({
    isOpen: false,
    type: "vaccinations",
  });

  const handleSaveVaccinations = () => {
    // Check if any required vaccinations are being made optional
    const originalRequired =
      config.vaccinationRequirements.requiredVaccinations.map(
        (v) => v.required,
      );
    const currentRequired =
      config.vaccinationRequirements.requiredVaccinations.map(
        (v) => v.required,
      );
    const hasDestructiveChange = originalRequired.some(
      (orig, idx) => orig && !currentRequired[idx],
    );

    if (hasDestructiveChange) {
      setDestructiveModal({
        isOpen: true,
        description:
          "You are about to make one or more vaccination requirements optional. This may affect pet care standards and existing bookings. This action cannot be easily undone.",
      });
    } else {
      setWarningModal({ isOpen: true, type: "vaccinations" });
    }
  };

  const handleCancelVaccinations = () => {
    setEditingVaccinations(false);
  };

  const handleSaveRoles = () => {
    setWarningModal({ isOpen: true, type: "roles" });
  };

  const handleCancelRoles = () => {
    setEditingRoles(false);
  };

  const confirmDestructive = () => {
    setEditingVaccinations(false);
    onSave();
  };

  const confirmWarning = () => {
    if (warningModal.type === "vaccinations") {
      setEditingVaccinations(false);
    } else {
      setEditingRoles(false);
    }
    onSave();
  };

  const cancelModal = () => {
    setDestructiveModal({ isOpen: false, description: "" });
    setWarningModal({ isOpen: false, type: "vaccinations" });
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Policies & Requirements
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground size-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <div>
                          <strong>Vaccination Requirements:</strong> Set
                          mandatory vaccinations for pets. Changes may affect
                          booking eligibility and care standards.
                        </div>
                        <div>
                          <strong>User Roles & Permissions:</strong> Define what
                          each user role can do in the system. Changes affect
                          access control immediately.
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
              {/* Vaccination Requirements */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5" />
                    Vaccination Requirements
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground size-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Configure which vaccinations are required for pet
                          services. Making required vaccinations optional may
                          affect pet eligibility and care standards.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  {!editingVaccinations ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingVaccinations(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelVaccinations}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveVaccinations}>
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mandatoryRecords"
                      checked={config.vaccinationRequirements.mandatoryRecords}
                      disabled={!editingVaccinations}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({
                          ...prev,
                          vaccinationRequirements: {
                            ...prev.vaccinationRequirements,
                            mandatoryRecords: !!checked,
                          },
                        }))
                      }
                    />
                    <Label htmlFor="mandatoryRecords">
                      Mandatory Vaccination Records
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Required Vaccinations</Label>
                    {config.vaccinationRequirements.requiredVaccinations.map(
                      (vac, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`vac-${index}`}
                            checked={vac.required}
                            disabled={!editingVaccinations}
                            onCheckedChange={(checked) =>
                              setConfig((prev) => {
                                const newVacs = [
                                  ...prev.vaccinationRequirements
                                    .requiredVaccinations,
                                ];
                                newVacs[index] = {
                                  ...vac,
                                  required: !!checked,
                                };
                                return {
                                  ...prev,
                                  vaccinationRequirements: {
                                    ...prev.vaccinationRequirements,
                                    requiredVaccinations: newVacs,
                                  },
                                };
                              })
                            }
                          />
                          <Label htmlFor={`vac-${index}`}>
                            {vac.name} ({vac.frequency})
                          </Label>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* User Roles & Permissions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    User Roles & Permissions
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground size-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Define permissions for each user role. Changes take
                          effect immediately and may affect user access to
                          features.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  {!editingRoles ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRoles(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelRoles}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveRoles}>
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(config.userRoles.defaultPermissions).map(
                    ([role, permissions]) => (
                      <div key={role} className="space-y-2">
                        <Label className="font-medium capitalize">
                          {role} Permissions
                        </Label>
                        <div className="grid grid-cols-2 gap-4 pl-4">
                          {Object.entries(permissions).map(
                            ([perm, enabled]) => (
                              <div
                                key={perm}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`${role}-${perm}`}
                                  checked={enabled}
                                  disabled={!editingRoles}
                                  onCheckedChange={(checked) =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      userRoles: {
                                        ...prev.userRoles,
                                        defaultPermissions: {
                                          ...prev.userRoles.defaultPermissions,
                                          [role]: {
                                            ...permissions,
                                            [perm]: !!checked,
                                          },
                                        },
                                      },
                                    }))
                                  }
                                />
                                <Label
                                  htmlFor={`${role}-${perm}`}
                                  className="text-sm capitalize"
                                >
                                  {perm
                                    .replace(/([A-Z])/g, " $1")
                                    .toLowerCase()}
                                </Label>
                              </div>
                            ),
                          )}
                        </div>
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
        title={`Confirm ${warningModal.type === "vaccinations" ? "Vaccination" : "Role"} Changes`}
        description={`You are about to save changes to ${
          warningModal.type === "vaccinations"
            ? "vaccination requirements"
            : "user role permissions"
        }. Please review your changes carefully before proceeding.`}
        confirmText="Confirm Changes"
      />
    </TooltipProvider>
  );
}
