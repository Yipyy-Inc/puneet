"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnablementScopeSection } from "./EnablementScopeSection";
import { TimingRemindersSection } from "./TimingRemindersSection";
import { FormTemplateSection } from "./FormTemplateSection";
import type { YipyyGoConfig } from "@/data/yipyygo-config";
import { saveYipyyGoConfig } from "@/data/yipyygo-config";
import { toast } from "sonner";

interface YipyyGoSettingsProps {
  config: YipyyGoConfig;
  onConfigChange: (config: YipyyGoConfig) => void;
  facilityId: number;
}

export function YipyyGoSettings({ config, onConfigChange, facilityId }: YipyyGoSettingsProps) {
  const [localConfig, setLocalConfig] = useState<YipyyGoConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleEnableToggle = (enabled: boolean) => {
    const updated = { ...localConfig, enabled };
    setLocalConfig(updated);
    setHasChanges(true);
  };

  const handleConfigUpdate = (updates: Partial<YipyyGoConfig>) => {
    const updated = { ...localConfig, ...updates };
    setLocalConfig(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = saveYipyyGoConfig(localConfig);
      onConfigChange(saved);
      setHasChanges(false);
      toast.success("YipyyGo settings saved successfully");
    } catch (error) {
      toast.error("Failed to save YipyyGo settings");
      console.error("Error saving YipyyGo config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Enable Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                YipyyGo Pre-Check-In Forms
              </CardTitle>
              <CardDescription>
                Configure pre-check-in forms that customers complete before arrival.
                Streamline check-in and gather important information in advance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="yipyygo-enabled"
                  checked={localConfig.enabled}
                  onCheckedChange={handleEnableToggle}
                />
                <Label htmlFor="yipyygo-enabled" className="cursor-pointer">
                  {localConfig.enabled ? "Enabled" : "Disabled"}
                </Label>
              </div>
              {hasChanges && (
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {!localConfig.enabled && (
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                YipyyGo is currently disabled. Enable it to configure pre-check-in forms for your services.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {localConfig.enabled && (
        <>
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Mandatory vs Optional:</strong> Mandatory forms must be completed before check-in (staff can override if needed). 
              Optional forms are recommended but don't block check-in.
            </AlertDescription>
          </Alert>

          {/* Configuration Tabs */}
          <Tabs defaultValue="enablement" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="enablement">Enablement & Scope</TabsTrigger>
              <TabsTrigger value="timing">Timing & Reminders</TabsTrigger>
              <TabsTrigger value="template">Form Template</TabsTrigger>
            </TabsList>

            <TabsContent value="enablement" className="space-y-4">
              <EnablementScopeSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>

            <TabsContent value="timing" className="space-y-4">
              <TimingRemindersSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <FormTemplateSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>
          </Tabs>

          {/* Save Button Footer */}
          {hasChanges && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    You have unsaved changes
                  </p>
                  <Button onClick={handleSave} disabled={isSaving} size="lg">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save All Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
