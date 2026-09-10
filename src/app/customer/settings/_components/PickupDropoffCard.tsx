"use client";

import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileData } from "./types";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface PickupDropoffCardProps {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  isEditing: boolean;
}

export function PickupDropoffCard({
  profileData,
  setProfileData,
  isEditing,
}: PickupDropoffCardProps) {
  const { t } = useCustomerText("settings");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-5" />
          {t("pickUpDropOffInstructions")}
        </CardTitle>
        <CardDescription>{t("pickupHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="authorizedPickup">
              {t("whoMayPickUp")}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (Names of family, friends, pet transport services)
              </span>
            </Label>
            <Textarea
              id="authorizedPickup"
              placeholder={t("exampleRobertJohnsonSpouseSarah")}
              rows={4}
              value={profileData.pickupDropoff.authorizedPickupPeople}
              onChange={(e) =>
                setProfileData({
                  ...profileData,
                  pickupDropoff: {
                    ...profileData.pickupDropoff,
                    authorizedPickupPeople: e.target.value,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickupNotes">
              {t("additionalInstructionsOptional")}
            </Label>
            <Textarea
              id="pickupNotes"
              placeholder={t("gateCodeParkingDetailsWhich")}
              rows={4}
              value={profileData.pickupDropoff.notes}
              onChange={(e) =>
                setProfileData({
                  ...profileData,
                  pickupDropoff: {
                    ...profileData.pickupDropoff,
                    notes: e.target.value,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{t("pickupStaffHint")}</p>
      </CardContent>
    </Card>
  );
}
