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
    <Card className="border-0 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Enabled Modules
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleOpenDialog}>
          <Edit className="h-4 w-4 mr-2" />
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
                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{module.name}</h4>
                          <span className="text-xs font-semibold text-primary">
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    {usage && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Usage</p>
                          <p className="text-sm font-semibold">
                            {usage.usage.split(" ")[0]}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {usage.usage.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Actions
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.actions}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            this month
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Last Used
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.lastUsed.split(" ")[0]}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
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
          <div className="text-center py-8">
            <Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
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
        <DialogContent className="min-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Facility Modules</DialogTitle>
            <DialogDescription>
              Enable or disable modules for {facilityName}. Changes will
              immediately affect which features are available to this facility.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="grid gap-3">
              {availableModules.map((module) => {
                const Icon = getModuleIcon(module.icon);
                const isEnabled = localEnabledModules.includes(module.id);
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      isEnabled
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                          isEnabled ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isEnabled ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.name}</h4>
                          <span
                            className={`text-xs font-semibold ${isEnabled ? "text-primary" : "text-muted-foreground"}`}
                          >
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Quoted
                            </Badge>
                          )}
                          {!hasCustomPrice(module.id) && (
                            <span className="text-[10px] text-muted-foreground">
                              (Base price)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
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
            <div className="flex flex-col gap-1 mr-auto text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                {localEnabledModules.length} of {availableModules.length}{" "}
                modules enabled
              </div>
              <div className="text-muted-foreground">
                Modules cost:{" "}
                <span className="font-semibold text-foreground">
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
