"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Camera,
  Download,
  Globe,
  Phone,
  Share2,
  ShieldOff,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PhotoUsageScope, PrivacyPreferences } from "./types";

interface PrivacyConsentCardProps {
  privacyPreferences: PrivacyPreferences;
  setPrivacyPreferences: (next: PrivacyPreferences) => void;
  isEditing: boolean;
}

const PHOTO_OPTIONS: {
  value: PhotoUsageScope;
  label: string;
  description: string;
}[] = [
  {
    value: "all",
    label: "All marketing channels",
    description:
      "Photos may appear on the website, social media, ads, and printed materials.",
  },
  {
    value: "facility",
    label: "Facility website only",
    description:
      "Photos may appear on the facility website and lobby boards — not on social media or ads.",
  },
  {
    value: "none",
    label: "Don’t use my pet’s photos",
    description: "Photos are kept for internal records and report cards only.",
  },
];

export function PrivacyConsentCard({
  privacyPreferences,
  setPrivacyPreferences,
  isEditing,
}: PrivacyConsentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = <K extends keyof PrivacyPreferences>(
    key: K,
    value: PrivacyPreferences[K],
  ) => {
    setPrivacyPreferences({ ...privacyPreferences, [key]: value });
  };

  const handleExportData = () => {
    toast.success(
      "Data export requested. We'll email you a download link within 48 hours.",
    );
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    toast.success(
      "Account deletion requested. Our team will reach out within 5 business days to confirm.",
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldOff className="size-5" />
          Privacy & Consent
        </CardTitle>
        <CardDescription>
          Control how your data and your pet&apos;s photos may be used. Your facility
          honors these preferences across all communications and marketing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo & media usage */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="text-muted-foreground size-5" />
            <Label className="text-base font-semibold">
              Photo & media usage
            </Label>
          </div>
          <RadioGroup
            value={privacyPreferences.photoUsage}
            onValueChange={(value) =>
              update("photoUsage", value as PhotoUsageScope)
            }
            disabled={!isEditing}
            className="space-y-2"
          >
            {PHOTO_OPTIONS.map((option) => (
              <label
                key={option.value}
                htmlFor={`photo-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  privacyPreferences.photoUsage === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/30",
                  !isEditing && "cursor-default",
                )}
              >
                <RadioGroupItem
                  id={`photo-${option.value}`}
                  value={option.value}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Granular toggles */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Visibility & sharing</Label>
          <div className="divide-border/70 overflow-hidden rounded-xl border divide-y">
            <PrivacyToggleRow
              icon={Share2}
              iconClass="bg-pink-50 text-pink-600"
              title="Social media tagging"
              description="Allow the facility to tag your pet's name in their social media posts."
              checked={privacyPreferences.socialMediaTagging}
              onCheckedChange={(checked) =>
                update("socialMediaTagging", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Globe}
              iconClass="bg-violet-50 text-violet-600"
              title="Lobby boards & client wall"
              description="Show your pet on the facility's in-house displays (welcome board, birthday celebrations)."
              checked={privacyPreferences.lobbyBoardVisibility}
              onCheckedChange={(checked) =>
                update("lobbyBoardVisibility", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Building2}
              iconClass="bg-blue-50 text-blue-600"
              title="Cross-location sharing"
              description="Share your profile and pet records with sister locations of this facility, so you can book at any of them seamlessly."
              checked={privacyPreferences.crossLocationSharing}
              onCheckedChange={(checked) =>
                update("crossLocationSharing", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Phone}
              iconClass="bg-amber-50 text-amber-600"
              title="Call recording"
              description="Allow inbound and outbound calls to be recorded for quality and training. You'll always be notified at the start of a recorded call."
              checked={privacyPreferences.callRecording}
              onCheckedChange={(checked) => update("callRecording", checked)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <Separator />

        {/* Your data — independent action buttons, not gated by edit mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Your data</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Request a copy of everything we have on file, or close your
                account permanently.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleExportData}
            >
              <Download className="mr-2 size-4" />
              Export my data
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive justify-start"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete my account
            </Button>
          </div>
          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Account deletion is reviewed manually. Outstanding bookings or
            balances must be settled first.
          </p>
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends a deletion request to your facility. Your pets&apos;
              records, booking history, and saved payment methods will be
              removed once the request is approved. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Request deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface PrivacyToggleRowProps {
  icon: typeof Share2;
  iconClass: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function PrivacyToggleRow({
  icon: Icon,
  iconClass,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: PrivacyToggleRowProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          iconClass,
          !checked && "opacity-60",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            !checked && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs/relaxed">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
    </div>
  );
}
