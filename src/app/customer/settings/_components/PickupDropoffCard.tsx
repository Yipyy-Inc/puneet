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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-5" />
          Pick-up & Drop-off Instructions
        </CardTitle>
        <CardDescription>
          Let the facility know who is allowed to pick up your pets and any
          special instructions for boarding or daycare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="authorizedPickup">
              Who is allowed to pick up?{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (Names of family, friends, pet transport services)
              </span>
            </Label>
            <Textarea
              id="authorizedPickup"
              placeholder="Example: Robert Johnson (spouse), Sarah Lee (sister), Paws Taxi Service"
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
              Additional instructions (optional)
            </Label>
            <Textarea
              id="pickupNotes"
              placeholder="Gate code, parking details, which door to use, special handling notes..."
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
        <p className="text-muted-foreground text-xs">
          Staff will use this information at check-in and pick-up. Make sure
          the people you list bring a valid ID when picking up your pet.
        </p>
      </CardContent>
    </Card>
  );
}
