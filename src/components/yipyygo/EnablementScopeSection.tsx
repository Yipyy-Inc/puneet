"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { YipyyGoConfig, ServiceYipyyGoConfig, ServiceType } from "@/data/yipyygo-config";
import {
  SERVICE_TYPE_LABELS,
  REQUIREMENT_LABELS,
  type YipyyGoRequirement,
} from "@/data/yipyygo-config";

interface EnablementScopeSectionProps {
  config: YipyyGoConfig;
  onConfigChange: (updates: Partial<YipyyGoConfig>) => void;
}

export function EnablementScopeSection({
  config,
  onConfigChange,
}: EnablementScopeSectionProps) {
  const handleServiceToggle = (serviceType: ServiceType, enabled: boolean) => {
    const updated = config.serviceConfigs.map((sc) =>
      sc.serviceType === serviceType ? { ...sc, enabled } : sc
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const handleRequirementChange = (serviceType: ServiceType, requirement: YipyyGoRequirement) => {
    const updated = config.serviceConfigs.map((sc) =>
      sc.serviceType === serviceType ? { ...sc, requirement } : sc
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const handleAddCustomService = () => {
    const newService: ServiceYipyyGoConfig = {
      serviceType: "custom",
      customServiceName: "",
      enabled: true,
      requirement: "optional",
    };
    onConfigChange({
      serviceConfigs: [...config.serviceConfigs, newService],
    });
  };

  const handleRemoveCustomService = (index: number) => {
    const updated = config.serviceConfigs.filter((_, i) => i !== index);
    onConfigChange({ serviceConfigs: updated });
  };

  const handleCustomServiceNameChange = (index: number, name: string) => {
    const updated = config.serviceConfigs.map((sc, i) =>
      i === index ? { ...sc, customServiceName: name } : sc
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const standardServices: ServiceType[] = ["daycare", "boarding", "grooming", "training"];
  const customServices = config.serviceConfigs.filter((sc) => sc.serviceType === "custom");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Service Scope</CardTitle>
          <CardDescription>
            Select which services require YipyyGo pre-check-in forms and whether they are mandatory or optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Standard Services */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Standard Services</Label>
            {standardServices.map((serviceType) => {
              const serviceConfig = config.serviceConfigs.find(
                (sc) => sc.serviceType === serviceType
              );
              if (!serviceConfig) return null;

              return (
                <div
                  key={serviceType}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={serviceConfig.enabled}
                      onCheckedChange={(enabled) => handleServiceToggle(serviceType, enabled)}
                    />
                    <div className="flex-1">
                      <Label className="text-base font-medium cursor-pointer">
                        {SERVICE_TYPE_LABELS[serviceType]}
                      </Label>
                      {serviceConfig.enabled && (
                        <div className="mt-2 flex items-center gap-3">
                          <Select
                            value={serviceConfig.requirement}
                            onValueChange={(value: YipyyGoRequirement) =>
                              handleRequirementChange(serviceType, value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mandatory">
                                {REQUIREMENT_LABELS.mandatory}
                              </SelectItem>
                              <SelectItem value="optional">
                                {REQUIREMENT_LABELS.optional}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge
                            variant={
                              serviceConfig.requirement === "mandatory"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {REQUIREMENT_LABELS[serviceConfig.requirement]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Services */}
          {customServices.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Custom Services</Label>
              </div>
              {customServices.map((serviceConfig, index) => {
                const actualIndex = config.serviceConfigs.findIndex(
                  (sc) => sc === serviceConfig
                );
                return (
                  <div
                    key={`custom-${actualIndex}`}
                    className="flex items-center gap-3 p-4 border rounded-lg"
                  >
                    <Switch
                      checked={serviceConfig.enabled}
                      onCheckedChange={(enabled) => {
                        const updated = config.serviceConfigs.map((sc, i) =>
                          i === actualIndex ? { ...sc, enabled } : sc
                        );
                        onConfigChange({ serviceConfigs: updated });
                      }}
                    />
                    <Input
                      placeholder="Custom service name"
                      value={serviceConfig.customServiceName || ""}
                      onChange={(e) => handleCustomServiceNameChange(actualIndex, e.target.value)}
                      className="flex-1"
                    />
                    {serviceConfig.enabled && (
                      <Select
                        value={serviceConfig.requirement}
                        onValueChange={(value: YipyyGoRequirement) => {
                          const updated = config.serviceConfigs.map((sc, i) =>
                            i === actualIndex ? { ...sc, requirement: value } : sc
                          );
                          onConfigChange({ serviceConfigs: updated });
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mandatory">
                            {REQUIREMENT_LABELS.mandatory}
                          </SelectItem>
                          <SelectItem value="optional">
                            {REQUIREMENT_LABELS.optional}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCustomService(actualIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Custom Service Button */}
          <Button
            variant="outline"
            onClick={handleAddCustomService}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Service
          </Button>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Mandatory:</strong> Booking cannot be checked-in without completion (staff can override if needed).
              <br />
              <strong>Optional:</strong> Recommended, doesn't block check-in.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
