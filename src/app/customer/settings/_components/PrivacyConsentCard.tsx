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
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface PrivacyConsentCardProps {
  privacyPreferences: PrivacyPreferences;
  setPrivacyPreferences: (next: PrivacyPreferences) => void;
  isEditing: boolean;
}

// Each option's words, by CATALOGUE KEY.
const PHOTO_OPTIONS: {
  value: PhotoUsageScope;
  labelKey: string;
  descriptionKey: string;
}[] = [
  { value: "all", labelKey: "photosAll", descriptionKey: "photosAllHint" },
  {
    value: "facility",
    labelKey: "photosFacility",
    descriptionKey: "photosFacilityHint",
  },
  { value: "none", labelKey: "photosNone", descriptionKey: "photosNoneHint" },
];

export function PrivacyConsentCard({
  privacyPreferences,
  setPrivacyPreferences,
  isEditing,
}: PrivacyConsentCardProps) {
  const { t } = useCustomerText("settings");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = <K extends keyof PrivacyPreferences>(
    key: K,
    value: PrivacyPreferences[K],
  ) => {
    setPrivacyPreferences({ ...privacyPreferences, [key]: value });
  };

  const handleExportData = () => {
    toast.success(t("dataExportRequested"));
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    toast.success(t("accountDeletionRequested"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldOff className="size-5" />
          {t("privacyAndConsent")}
        </CardTitle>
        <CardDescription>{t("privacyHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo & media usage */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="text-muted-foreground size-5" />
            <Label className="text-base font-semibold">
              {t("photoMediaUsage")}
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
                  <p className="text-sm font-medium">{t(option.labelKey)}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t(option.descriptionKey)}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Granular toggles */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            {t("visibilityAndSharing")}
          </Label>
          <div className="divide-border/70 divide-y overflow-hidden rounded-xl border">
            <PrivacyToggleRow
              icon={Share2}
              iconClass="bg-pink-50 text-pink-600"
              title={t("socialMediaTagging")}
              description={t("allowTheFacilityToTag")}
              checked={privacyPreferences.socialMediaTagging}
              onCheckedChange={(checked) =>
                update("socialMediaTagging", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Globe}
              iconClass="bg-violet-50 text-violet-600"
              title={t("lobbyBoardsClientWall")}
              description={t("showYourPetOnThe")}
              checked={privacyPreferences.lobbyBoardVisibility}
              onCheckedChange={(checked) =>
                update("lobbyBoardVisibility", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Building2}
              iconClass="bg-blue-50 text-blue-600"
              title={t("crossLocationSharing")}
              description={t("shareYourProfileAndPet")}
              checked={privacyPreferences.crossLocationSharing}
              onCheckedChange={(checked) =>
                update("crossLocationSharing", checked)
              }
              disabled={!isEditing}
            />
            <PrivacyToggleRow
              icon={Phone}
              iconClass="bg-amber-50 text-amber-600"
              title={t("callRecording")}
              description={t("allowInboundAndOutboundCalls")}
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
              <Label className="text-base font-semibold">{t("yourData")}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("yourDataHint")}
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
              {t("exportMyData")}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive justify-start"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 size-4" />
              {t("deleteMyAccount")}
            </Button>
          </div>
          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {t("accountDeletionReviewed")}
          </p>
        </div>
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteYourAccount")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAccountWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("requestDeletion")}
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
    <div className="hover:bg-muted/20 flex items-start gap-3 px-4 py-3.5 transition-colors">
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
