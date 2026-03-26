"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Users,
  UserCheck,
  CreditCard,
  MessageSquare,
  GraduationCap,
  Scissors,
  Package,
  Puzzle,
  Edit,
  CheckCircle,
} from "lucide-react";
import { availableModules } from "@/data/facilities";

interface ModuleUsageData {
  usage: string;
  lastUsed: string;
  actions: number;
}

interface ModulesTabProps {
  facilityName: string;
  enabledModules: string[];
  moduleUsageData: Record<string, ModuleUsageData>;
  getModulePrice: (moduleId: string) => number;
  hasCustomPrice: (moduleId: string) => boolean;
  onModulesChange: (modules: string[]) => void;
}

const getModuleIcon = (iconName: string) => {
  switch (iconName) {
    case "Calendar":
      return Calendar;
    case "Users":
      return Users;
    case "UserCheck":
      return UserCheck;
    case "CreditCard":
      return CreditCard;
    case "MessageSquare":
      return MessageSquare;
    case "GraduationCap":
      return GraduationCap;
    case "Scissors":
      return Scissors;
    case "Package":
      return Package;
    default:
      return Puzzle;
  }
};

export function ModulesTab({
  facilityName,
  enabledModules,
  moduleUsageData,
  getModulePrice,
  hasCustomPrice,
  onModulesChange,
}: ModulesTabProps) {
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [localEnabledModules, setLocalEnabledModules] =
    useState<string[]>(enabledModules);

  const handleOpenDialog = () => {
    setLocalEnabledModules(enabledModules);
    setShowModulesDialog(true);
  };

  const toggleModule = (moduleId: string) => {
    setLocalEnabledModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleSave = () => {
    onModulesChange(localEnabledModules);
    setShowModulesDialog(false);
  };
  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Puzzle className="h-5 w-5" />
          Enabled Modules
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleOpenDialog}>
          <Edit className="mr-2 size-4" />
          Manage Modules
        </Button>
      </CardHeader>
      <CardContent>
        {enabledModules.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {availableModules
              .filter((m) => enabledModules.includes(m.id))
              .map((module) => {
                const Icon = getModuleIcon(module.icon);
                const usage = moduleUsageData[module.id];
                return (
                  <div
                    key={module.id}
                    className="bg-muted/50 hover:bg-muted rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{module.name}</h4>
                          <span className="text-primary text-xs font-semibold">
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    {usage && (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                        <div>
                          <p className="text-muted-foreground text-xs">Usage</p>
                          <p className="text-sm font-semibold">
                            {usage.usage.split(" ")[0]}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {usage.usage.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Actions
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.actions}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            this month
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Last Used
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.lastUsed.split(" ")[0]}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {usage.lastUsed.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Puzzle className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground">No modules enabled</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleOpenDialog}
            >
              Enable Modules
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modules Edit Dialog */}
      <Dialog open={showModulesDialog} onOpenChange={setShowModulesDialog}>
        <DialogContent className="flex max-h-[85vh] min-w-5xl flex-col">
          <DialogHeader>
            <DialogTitle>Manage Facility Modules</DialogTitle>
            <DialogDescription>
              Enable or disable modules for {facilityName}. Changes will
              immediately affect which features are available to this facility.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid gap-3">
              {availableModules.map((module) => {
                const Icon = getModuleIcon(module.icon);
                const isEnabled = localEnabledModules.includes(module.id);
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
                      isEnabled
                        ? "border-primary/20 bg-primary/5 border"
                        : "bg-muted/50"
                    } `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${isEnabled ? "bg-primary/10" : "bg-muted"} `}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isEnabled ? "text-primary" : "text-muted-foreground"
                          } `}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.name}</h4>
                          <span
                            className={`text-xs font-semibold ${
                              isEnabled
                                ? `text-primary`
                                : `text-muted-foreground`
                            } `}
                          >
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              Quoted
                            </Badge>
                          )}
                          {!hasCustomPrice(module.id) && (
                            <span className="text-muted-foreground text-[10px]">
                              (Base price)
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="mr-auto flex flex-col gap-1 text-xs">
              <div className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="text-success size-4" />
                {localEnabledModules.length} of {availableModules.length}{" "}
                modules enabled
              </div>
              <div className="text-muted-foreground">
                Modules cost:{" "}
                <span className="text-foreground font-semibold">
                  $
                  {localEnabledModules
                    .reduce((sum, id) => sum + getModulePrice(id), 0)
                    .toFixed(2)}
                  /mo
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowModulesDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
