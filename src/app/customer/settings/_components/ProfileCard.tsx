"use client";

import { Mail, MapPin, Phone, User, UserCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import type { ProfileData } from "./types";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface ProfileCardProps {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
  isEditing: boolean;
  errors: Record<string, string>;
}

export function ProfileCard({
  profileData,
  setProfileData,
  isEditing,
  errors,
}: ProfileCardProps) {
  const { t } = useCustomerText("settings");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          {t("profileInformation")}
        </CardTitle>
        <CardDescription>{t("profileHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("fullName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
              disabled={!isEditing}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{t(errors.name)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {t("email")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) =>
                  setProfileData({ ...profileData, email: e.target.value })
                }
                disabled={!isEditing}
                className="pl-9"
                aria-invalid={errors.email ? "true" : "false"}
              />
            </div>
            {errors.email && (
              <p className="text-destructive text-sm">{t(errors.email)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <div className="relative">
              <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
                disabled={!isEditing}
                className="pl-9"
                placeholder="(555) 123-4567"
                aria-invalid={errors.phone ? "true" : "false"}
              />
            </div>
            {errors.phone && (
              <p className="text-destructive text-sm">{t(errors.phone)}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-5" />
            <Label className="text-base font-semibold">{t("address")}</Label>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">{t("streetAddress")}</Label>
              <Input
                id="street"
                value={profileData.address.street}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    address: {
                      ...profileData.address,
                      street: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder={t("str123MainStreet")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t("city")}</Label>
              <Input
                id="city"
                value={profileData.address.city}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    address: {
                      ...profileData.address,
                      city: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder={t("springfield")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">{t("state")}</Label>
              <Input
                id="state"
                value={profileData.address.state}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    address: {
                      ...profileData.address,
                      state: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="IL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">{t("zipCode")}</Label>
              <Input
                id="zip"
                value={profileData.address.zip}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    address: {
                      ...profileData.address,
                      zip: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="62701"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t("country")}</Label>
              <Select
                value={profileData.address.country}
                onValueChange={(value) =>
                  setProfileData({
                    ...profileData,
                    address: { ...profileData.address, country: value },
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">{t("unitedStates")}</SelectItem>
                  <SelectItem value="CAN">{t("canada")}</SelectItem>
                  <SelectItem value="MEX">{t("mexico")}</SelectItem>
                  <SelectItem value="GBR">{t("unitedKingdom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCircle className="text-muted-foreground size-5" />
            <Label className="text-base font-semibold">
              {t("additionalContacts")}
            </Label>
          </div>
          <AdditionalContactsManager
            value={profileData.additionalContacts}
            onChange={(contacts) =>
              setProfileData({
                ...profileData,
                additionalContacts: contacts,
              })
            }
            disabled={!isEditing}
            heading=""
            description={t("addPeopleWhoCanBe")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
