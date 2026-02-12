"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useSettings } from "@/hooks/use-settings";

export default function TrainingSettingsPage() {
  const { settings, updateModuleStatus } = useSettings();
  const training = settings?.modules?.find((m) => m.id === "training");

  const handleToggleModule = (enabled: boolean) => {
    if (training) {
      updateModuleStatus("training", enabled);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Training Settings</h2>
        <p className="text-muted-foreground">
          Configure your training module settings and course catalog
        </p>
      </div>

      {/* Module Status */}
      <Card>
        <CardHeader>
          <CardTitle>Module Status</CardTitle>
          <CardDescription>
            Enable or disable the training module for your facility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="module-enabled">Training Module Enabled</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, clients can book training classes and enroll in courses
              </p>
            </div>
            <Switch
              id="module-enabled"
              checked={training?.status?.disabled !== true}
              onCheckedChange={handleToggleModule}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Course Catalog Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Catalog Configuration
          </CardTitle>
          <CardDescription>
            Manage your training course types (class definitions). These are the courses
            you offer to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure course types with custom names, descriptions, duration, age
              requirements, vaccine requirements, and prerequisites. Each course type
              defines a class that can be scheduled and offered to clients.
            </p>
            <Button asChild>
              <Link href="/facility/dashboard/services/training/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Course Catalog
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Additional Settings
          </CardTitle>
          <CardDescription>
            More configuration options coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Future settings will include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Class capacity limits</li>
            <li>Waitlist management</li>
            <li>Auto-enrollment rules</li>
            <li>Progress tracking settings</li>
            <li>Certificate generation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
