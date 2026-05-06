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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          Profile Information
        </CardTitle>
        <CardDescription>
          Your personal information. Updates will reflect on the facility side
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
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
              <p className="text-destructive text-sm">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
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
              <p className="text-destructive text-sm">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
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
              <p className="text-destructive text-sm">{errors.phone}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-5" />
            <Label className="text-base font-semibold">Address</Label>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
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
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
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
                placeholder="Springfield"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
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
              <Label htmlFor="zip">ZIP Code</Label>
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
              <Label htmlFor="country">Country</Label>
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
                  <SelectItem value="USA">United States</SelectItem>
                  <SelectItem value="CAN">Canada</SelectItem>
                  <SelectItem value="MEX">Mexico</SelectItem>
                  <SelectItem value="GBR">United Kingdom</SelectItem>
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
              Additional Contacts
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
            description="Add people who can be contacted for emergencies, pickup, or drop-off. Tag each contact with what they're authorized to do."
          />
        </div>
      </CardContent>
    </Card>
  );
}
