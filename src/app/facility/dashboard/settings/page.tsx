"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettings } from "@/hooks/use-settings";
import type {
  ServiceDateBlock,
  ScheduleTimeOverride,
  DropOffPickUpOverride,
} from "@/types/facility";
import { SettingsBlock } from "@/components/ui/settings-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileAppSettings } from "@/components/additional-features/MobileAppSettings";
import { YipyyGoSettings } from "@/components/yipyygo/YipyyGoSettings";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { FormRequirementsSettings } from "@/components/forms/FormRequirementsSettings";
import { FormPermissionsPanel } from "@/components/forms/FormPermissionsPanel";
import { TagNotesSettings } from "@/components/facility-config/TagNotesSettings";
import { FormNotificationSettings } from "@/components/forms/FormNotificationSettings";
import { SettingsSidebar } from "@/components/facility/SettingsSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  Zap,
  Download,
  CalendarX,
  Clock,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  locations,
  vaccinationRules,
  paymentGateways,
  taxRates,
  currencySettings,
  subscription,
  auditLog,
  reportCardSectionMeta,
} from "@/data/settings";
import { useCustomServices } from "@/hooks/use-custom-services";
import type {
  ReportCardSectionId,
  ReportCardServiceConfig,
  ReportCardCustomQuestion,
  CustomFeedbackType,
} from "@/types/facility";

// Business Profile Component
function BusinessProfileCard() {
  const { profile, updateProfile } = useSettings();

  return (
    <SettingsBlock
      title="Business Profile"
      data={profile}
      onSave={updateProfile}
    >
      {(isEditing, localProfile, setLocalProfile) => (
        <div className="space-y-4">
          {/* Facility Logo */}
          <div className="space-y-2">
            <Label>Facility Logo</Label>
            <div className="flex items-center gap-4">
              <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-lg text-lg font-semibold">
                {(localProfile.businessName || "F")
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isEditing}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/png,image/jpeg,image/svg+xml";
                    input.click();
                  }}
                >
                  Upload Logo
                </Button>
                <p className="text-muted-foreground text-xs">
                  Recommended: 200×200px, square format
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={localProfile.businessName}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    businessName: e.target.value,
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={localProfile.email}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, email: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={localProfile.phone}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, phone: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={localProfile.website}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, website: e.target.value })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={localProfile.description}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  description: e.target.value,
                })
              }
              rows={3}
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Street Address"
                value={localProfile.address.street}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: {
                      ...localProfile.address,
                      street: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="City"
                value={localProfile.address.city}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: { ...localProfile.address, city: e.target.value },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="State"
                value={localProfile.address.state}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: { ...localProfile.address, state: e.target.value },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="ZIP Code"
                value={localProfile.address.zipCode}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    address: {
                      ...localProfile.address,
                      zipCode: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Social Media</Label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="Facebook URL"
                value={localProfile.socialMedia.facebook}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      facebook: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="Instagram URL"
                value={localProfile.socialMedia.instagram}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      instagram: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
              <Input
                placeholder="Twitter URL"
                value={localProfile.socialMedia.twitter}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    socialMedia: {
                      ...localProfile.socialMedia,
                      twitter: e.target.value,
                    },
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

// Business Hours Component
function BusinessHoursCard() {
  const { hours, updateHours } = useSettings();

  return (
    <SettingsBlock title="Business Hours" data={hours} onSave={updateHours}>
      {(isEditing, localHours, setLocalHours) => (
        <div className="space-y-3">
          {Object.entries(localHours).map(
            ([day, schedule]: [
              string,
              { isOpen: boolean; openTime: string; closeTime: string },
            ]) => (
              <div
                key={day}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-1 items-center gap-4">
                  <div className="w-32 font-medium capitalize">{day}</div>
                  <Switch
                    checked={schedule.isOpen}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalHours({
                        ...localHours,
                        [day]: { ...schedule, isOpen: checked },
                      })
                    }
                  />
                  {schedule.isOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.openTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, openTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={schedule.closeTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, closeTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                    </div>
                  )}
                  {!schedule.isOpen && (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </SettingsBlock>
  );
}

const SERVICE_BLOCK_OPTIONS: { id: string; label: string }[] = [
  { id: "daycare", label: "Daycare" },
  { id: "boarding", label: "Boarding" },
  { id: "grooming", label: "Grooming" },
  { id: "training", label: "Training" },
  { id: "evaluation", label: "Evaluation" },
];

type BlockType = "full" | "check_in" | "check_out";

// Service-Specific Day Blocking (override regular schedule)
function ServiceDayBlockingCard() {
  const { serviceDateBlocks, updateServiceDateBlocks } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newBlockType, setNewBlockType] = useState<BlockType>("full");
  const [newClosureMessage, setNewClosureMessage] = useState("");

  const includesBoarding = newServices.includes("boarding");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const block: ServiceDateBlock = {
      id: `block-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      closed: includesBoarding ? newBlockType === "full" : true,
      blockCheckIn: includesBoarding ? newBlockType === "check_in" : undefined,
      blockCheckOut: includesBoarding
        ? newBlockType === "check_out"
        : undefined,
      closureMessage: newClosureMessage.trim() || undefined,
    };
    updateServiceDateBlocks([...serviceDateBlocks, block]);
    setNewDate("");
    setNewServices([]);
    setNewBlockType("full");
    setNewClosureMessage("");
  };

  const handleRemove = (id: string) => {
    updateServiceDateBlocks(serviceDateBlocks.filter((b) => b.id !== id));
  };

  const toggleService = (id: string) => {
    setNewServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="size-5" />
          Service-Specific Day Blocking
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Block specific calendar days for one or more services (e.g. daycare
          closed on Christmas) without changing the regular weekly schedule. On
          blocked dates, customers cannot book and staff cannot create bookings
          unless overridden by admin/manager.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add block</Label>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services affected (per service, multiple, or all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear all"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`block-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`block-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {includesBoarding && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Boarding block type
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={newBlockType === "full" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("full")}
                  >
                    Fully close
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_in" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_in")}
                  >
                    Block check-in only
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_out" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_out")}
                  >
                    Block check-out only
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Fully close = no check-in or check-out. Or block only check-in
                  or only check-out dates.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Closure message (customer-facing)
              </Label>
              <Input
                value={newClosureMessage}
                onChange={(e) => setNewClosureMessage(e.target.value)}
                placeholder="e.g. Closed for Christmas, Closed for staff training"
                className="max-w-sm"
              />
              <p className="text-muted-foreground text-xs">
                Shown when a customer hovers over or focuses the blocked date in
                the booking calendar.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Add block
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Blocked dates</Label>
          {serviceDateBlocks.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No service-specific blocks. Add a date and service(s) above.
            </p>
          ) : (
            <ul className="space-y-2">
              {serviceDateBlocks
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {new Date(
                            block.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {block.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
                            block.services.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                  ?.label ?? s}
                              </Badge>
                            ))
                          )}
                        </div>
                        {block.services.includes("boarding") ? (
                          <Badge variant="outline" className="text-xs">
                            {block.closed
                              ? "Fully closed"
                              : block.blockCheckIn && block.blockCheckOut
                                ? "Check-in & check-out blocked"
                                : block.blockCheckIn
                                  ? "Check-in blocked"
                                  : block.blockCheckOut
                                    ? "Check-out blocked"
                                    : "Closed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Closed</Badge>
                        )}
                      </div>
                      {block.closureMessage && (
                        <p className="text-muted-foreground text-sm">
                          “{block.closureMessage}”
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(block.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// One-Day Schedule Time Override (Special Hours)
function OneDayScheduleOverrideCard() {
  const { scheduleTimeOverrides, updateScheduleTimeOverrides } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewScheduleServices] = useState<string[]>([]);
  const [newOpenTime, setNewOpenTime] = useState("08:00");
  const [newCloseTime, setNewCloseTime] = useState("17:00");

  const handleAdd = () => {
    if (!newDate) return;
    const override: ScheduleTimeOverride = {
      id: `override-${Date.now()}`,
      date: newDate,
      services:
        newServices.length === 0 ||
        newServices.length === SERVICE_BLOCK_OPTIONS.length
          ? undefined
          : [...newServices],
      openTime: newOpenTime,
      closeTime: newCloseTime,
    };
    updateScheduleTimeOverrides([...scheduleTimeOverrides, override]);
    setNewDate("");
    setNewScheduleServices([]);
    setNewOpenTime("08:00");
    setNewCloseTime("17:00");
  };

  const handleRemove = (id: string) => {
    updateScheduleTimeOverrides(
      scheduleTimeOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleScheduleService = (id: string) => {
    setNewScheduleServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          One-Day Schedule Time Override (Special Hours)
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Set custom opening and closing times for a specific date (e.g.
          Halloween 10:00 AM – 3:00 PM) without changing the regular weekly
          schedule. Choose per service, multiple services, or all services.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add override</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services (optional — leave empty for all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewScheduleServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear / All"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`sched-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleScheduleService(opt.id)}
                    />
                    <Label
                      htmlFor={`sched-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Opening time
              </Label>
              <Input
                type="time"
                value={newOpenTime}
                onChange={(e) => setNewOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Closing time
              </Label>
              <Input
                type="time"
                value={newCloseTime}
                onChange={(e) => setNewCloseTime(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAdd} disabled={!newDate}>
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special hours</Label>
          {scheduleTimeOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No one-day overrides. Add a date and times above.
            </p>
          ) : (
            <ul className="space-y-2">
              {scheduleTimeOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {new Date(
                            override.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {override.services &&
                        override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        ) : override.services &&
                          override.services.length > 0 ? (
                          override.services.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs"
                            >
                              {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                ?.label ?? s}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {override.openTime} – {override.closeTime}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(override.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Drop-Off & Pick-Up Time Overrides
function DropOffPickUpOverrideCard() {
  const { dropOffPickUpOverrides, updateDropOffPickUpOverrides } =
    useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newDropOffStart, setNewDropOffStart] = useState("07:30");
  const [newDropOffEnd, setNewDropOffEnd] = useState("10:00");
  const [newPickUpStart, setNewPickUpStart] = useState("16:00");
  const [newPickUpEnd, setNewPickUpEnd] = useState("18:00");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const override: DropOffPickUpOverride = {
      id: `dropoff-pickup-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      dropOffStart: newDropOffStart,
      dropOffEnd: newDropOffEnd,
      pickUpStart: newPickUpStart,
      pickUpEnd: newPickUpEnd,
    };
    updateDropOffPickUpOverrides([...dropOffPickUpOverrides, override]);
    setNewDate("");
    setNewServices([]);
    setNewDropOffStart("07:30");
    setNewDropOffEnd("10:00");
    setNewPickUpStart("16:00");
    setNewPickUpEnd("18:00");
  };

  const handleRemove = (id: string) => {
    updateDropOffPickUpOverrides(
      dropOffPickUpOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleService = (id: string) => {
    setNewServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-5" />
          Drop-Off &amp; Pick-Up Time Overrides
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Override drop-off and pick-up windows for specific dates (e.g. holiday
          hours). Customers only see valid time options for each date. Apply
          overrides per service.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add override</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services (per service, multiple, or all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear all"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`dopo-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`dopo-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off start
                </Label>
                <Input
                  type="time"
                  value={newDropOffStart}
                  onChange={(e) => setNewDropOffStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off end
                </Label>
                <Input
                  type="time"
                  value={newDropOffEnd}
                  onChange={(e) => setNewDropOffEnd(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up start
                </Label>
                <Input
                  type="time"
                  value={newPickUpStart}
                  onChange={(e) => setNewPickUpStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up end
                </Label>
                <Input
                  type="time"
                  value={newPickUpEnd}
                  onChange={(e) => setNewPickUpEnd(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Overrides</Label>
          {dropOffPickUpOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No drop-off/pick-up overrides. Add a date and service(s) above.
            </p>
          ) : (
            <ul className="space-y-2">
              {dropOffPickUpOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {new Date(
                            override.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
                            override.services.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="text-xs"
                              >
                                {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                  ?.label ?? s}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        Drop-off {override.dropOffStart}–{override.dropOffEnd} ·
                        Pick-up {override.pickUpStart}–{override.pickUpEnd}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(override.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Booking Rules Component
function BookingRulesCard() {
  const { rules, updateRules } = useSettings();

  return (
    <SettingsBlock
      title="Booking Rules & Policies"
      data={rules}
      onSave={updateRules}
    >
      {(isEditing, localRules, setLocalRules) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Advance Booking (hours)</Label>
              <Input
                type="number"
                value={localRules.minimumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    minimumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Advance Booking (days)</Label>
              <Input
                type="number"
                value={localRules.maximumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    maximumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation Policy (hours before)</Label>
              <Input
                type="number"
                value={localRules.cancelPolicyHours}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelPolicyHours: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation Fee (%)</Label>
              <Input
                type="number"
                value={localRules.cancelFeePercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelFeePercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit Percentage (%)</Label>
              <Input
                type="number"
                value={localRules.depositPercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    depositPercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Facility Capacity Limit</Label>
              <Input
                type="number"
                value={localRules.capacityLimit}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    capacityLimit: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Daily Capacity Limit</Label>
            <Input
              type="number"
              value={localRules.dailyCapacityLimit}
              onChange={(e) =>
                setLocalRules({
                  ...localRules,
                  dailyCapacityLimit: parseInt(e.target.value),
                })
              }
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Require Deposit</div>
              <div className="text-muted-foreground text-sm">
                Require deposit at booking
              </div>
            </div>
            <Switch
              checked={localRules.depositRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, depositRequired: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Allow Overbooking</div>
              <div className="text-muted-foreground text-sm">
                Accept bookings beyond capacity
              </div>
            </div>
            <Switch
              checked={localRules.allowOverBooking}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, allowOverBooking: checked })
              }
            />
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

// Evaluation Settings Component
function EvaluationSettingsCard() {
  const { evaluation, updateEvaluation } = useSettings();

  return (
    <SettingsBlock
      title="Evaluation Settings"
      data={evaluation}
      onSave={updateEvaluation}
    >
      {(isEditing, localEvaluation, setLocalEvaluation) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Internal Name (Staff-Facing)</Label>
              <Input
                value={localEvaluation.internalName}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    internalName: e.target.value,
                  })
                }
                placeholder="e.g., Pet Evaluation"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer-Facing Name</Label>
              <Input
                value={localEvaluation.customerName}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    customerName: e.target.value,
                  })
                }
                placeholder="e.g., Pet Evaluation"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={localEvaluation.description}
              onChange={(e) =>
                setLocalEvaluation({
                  ...localEvaluation,
                  description: e.target.value,
                })
              }
              rows={3}
              placeholder="Describe the evaluation process..."
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={localEvaluation.price}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0 for free"
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={localEvaluation.duration}
                disabled={!isEditing}
                onValueChange={(value: "half-day" | "full-day" | "custom") =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    duration: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="half-day">Half-Day</SelectItem>
                  <SelectItem value="full-day">Full-Day</SelectItem>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {localEvaluation.duration === "custom" && (
            <div className="space-y-2">
              <Label>Custom Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={localEvaluation.customHours || ""}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    customHours: parseFloat(e.target.value) || undefined,
                  })
                }
                placeholder="e.g., 2.5"
                className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                readOnly={!isEditing}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Taxable</div>
              <div className="text-muted-foreground text-sm">
                Apply tax to evaluation price
              </div>
            </div>
            <Switch
              checked={localEvaluation.taxSettings.taxable}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalEvaluation({
                  ...localEvaluation,
                  taxSettings: {
                    ...localEvaluation.taxSettings,
                    taxable: checked,
                  },
                })
              }
            />
          </div>
          {localEvaluation.taxSettings.taxable && (
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={localEvaluation.taxSettings.taxRate || ""}
                onChange={(e) =>
                  setLocalEvaluation({
                    ...localEvaluation,
                    taxSettings: {
                      ...localEvaluation.taxSettings,
                      taxRate: parseFloat(e.target.value) || undefined,
                    },
                  })
                }
                placeholder="e.g., 8.25"
                className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                readOnly={!isEditing}
              />
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Evaluation Scheduling Rules</div>
                <div className="text-muted-foreground text-sm">
                  Configure duration options, time windows, and slot logic.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration Options (hours)</Label>
                <Input
                  value={localEvaluation.schedule.durationOptionsMinutes
                    .map((m) => m / 60)
                    .join(", ")}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(",")
                      .map((v) => Number(v.trim()))
                      .filter((v) => Number.isFinite(v) && v > 0)
                      .map((v) => Math.round(v * 60));
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        durationOptionsMinutes: parsed,
                        defaultDurationMinutes:
                          localEvaluation.schedule.defaultDurationMinutes ??
                          parsed[0],
                      },
                    });
                  }}
                  placeholder="2, 4"
                  readOnly={!isEditing}
                  className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Duration</Label>
                <Select
                  value={String(
                    localEvaluation.schedule.defaultDurationMinutes ??
                      localEvaluation.schedule.durationOptionsMinutes[0] ??
                      "",
                  )}
                  disabled={!isEditing}
                  onValueChange={(value) =>
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        defaultDurationMinutes: Number(value),
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {localEvaluation.schedule.durationOptionsMinutes.map(
                      (m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m / 60}h
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed Time Windows</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {localEvaluation.schedule.timeWindows.map((window, idx) => (
                  <div key={window.id} className="grid grid-cols-3 gap-2">
                    <Input
                      value={window.label}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          label: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      placeholder="Label"
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <Input
                      type="time"
                      value={window.startTime}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          startTime: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                    <Input
                      type="time"
                      value={window.endTime}
                      onChange={(e) => {
                        const next = [...localEvaluation.schedule.timeWindows];
                        next[idx] = {
                          ...window,
                          endTime: e.target.value,
                        };
                        setLocalEvaluation({
                          ...localEvaluation,
                          schedule: {
                            ...localEvaluation.schedule,
                            timeWindows: next,
                          },
                        });
                      }}
                      readOnly={!isEditing}
                      className={
                        !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                      }
                    />
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [
                        ...localEvaluation.schedule.timeWindows,
                        {
                          id: `window-${Date.now()}`,
                          label: "New Window",
                          startTime: "09:00",
                          endTime: "12:00",
                        },
                      ];
                      setLocalEvaluation({
                        ...localEvaluation,
                        schedule: {
                          ...localEvaluation.schedule,
                          timeWindows: next,
                        },
                      });
                    }}
                  >
                    Add Time Window
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slot Logic</Label>
                <Select
                  value={localEvaluation.schedule.slotMode}
                  disabled={!isEditing}
                  onValueChange={(value: "fixed" | "window") =>
                    setLocalEvaluation({
                      ...localEvaluation,
                      schedule: {
                        ...localEvaluation.schedule,
                        slotMode: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed start times</SelectItem>
                    <SelectItem value="window">
                      Any time within window
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {localEvaluation.schedule.slotMode === "fixed" && (
                <div className="space-y-2">
                  <Label>Fixed Start Times</Label>
                  <Input
                    value={localEvaluation.schedule.fixedStartTimes.join(", ")}
                    onChange={(e) => {
                      const parsed = e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean);
                      setLocalEvaluation({
                        ...localEvaluation,
                        schedule: {
                          ...localEvaluation.schedule,
                          fixedStartTimes: parsed,
                        },
                      });
                    }}
                    placeholder="09:00, 11:00, 13:00"
                    readOnly={!isEditing}
                    className={
                      !isEditing ? "cursor-not-allowed bg-gray-100" : ""
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}

function ReportCardSettingsCard() {
  const { reportCards, updateReportCards } = useSettings();
  const { activeModules: customServices } = useCustomServices();
  const [sectionServiceId, setSectionServiceId] = useState("daycare");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<CustomFeedbackType>("text");
  const [newOptionText, setNewOptionText] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newConditionOption, setNewConditionOption] = useState<
    Record<string, string>
  >({});
  const [newFeedbackOption, setNewFeedbackOption] = useState("");

  const themeOptions = [
    { id: "everyday", label: "Everyday" },
    { id: "christmas", label: "Christmas" },
    { id: "halloween", label: "Halloween" },
    { id: "easter", label: "Easter" },
    { id: "thanksgiving", label: "Thanksgiving" },
    { id: "new_year", label: "New Year" },
    { id: "valentines", label: "Valentine’s Day" },
  ] as const;

  const standardServices = [
    { id: "daycare", label: "Daycare" },
    { id: "boarding", label: "Boarding" },
    { id: "grooming", label: "Grooming" },
    { id: "training", label: "Training" },
  ];

  const allServices = [
    ...standardServices,
    ...customServices.map((cs) => ({ id: cs.id, label: cs.name })),
  ];

  const allSectionIds: ReportCardSectionId[] = [
    "todaysVibe",
    "friendsAndFun",
    "careMetrics",
    "holidaySparkle",
    "closingNote",
    "overallFeedback",
    "customFeedback",
    "petCondition",
    "nextAppointment",
    "reviewBooster",
    "photoShowcase",
  ];

  const getServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
  ): ReportCardServiceConfig => {
    return (
      cfg.serviceConfigs?.find((s) => s.serviceId === serviceId) ?? {
        serviceId,
        enabled: false,
        enabledSections: [
          "todaysVibe",
          "closingNote",
          "photoShowcase",
        ] as ReportCardSectionId[],
      }
    );
  };

  const updateServiceConfig = (
    cfg: typeof reportCards,
    serviceId: string,
    updates: Partial<ReportCardServiceConfig>,
  ) => {
    const configs = cfg.serviceConfigs ?? [];
    const existing = configs.find((s) => s.serviceId === serviceId);
    if (existing) {
      return {
        ...cfg,
        serviceConfigs: configs.map((s) =>
          s.serviceId === serviceId ? { ...s, ...updates } : s,
        ),
      };
    }
    return {
      ...cfg,
      serviceConfigs: [
        ...configs,
        {
          serviceId,
          enabled: false,
          enabledSections: [
            "todaysVibe",
            "closingNote",
            "photoShowcase",
          ] as ReportCardSectionId[],
          ...updates,
        },
      ],
    };
  };

  return (
    <SettingsBlock
      title="Report Card Builder"
      description="Configure report card themes, sections, feedback, and delivery for each service."
      data={reportCards}
      onSave={updateReportCards}
    >
      {(isEditing, localConfig, setLocalConfig) => {
        const brand = localConfig.brand ?? {
          reportTitle: "Daily Report Card",
          accentColor: "#6366f1",
          showFacilityLogo: true,
        };
        const overallFeedback = localConfig.overallFeedback ?? {
          title: "Overall Experience",
          responseOptions: ["Excellent", "Good", "Fair", "Needs Attention"],
        };
        const customQuestions = localConfig.customQuestions ?? [];
        const petCondition = localConfig.petCondition ?? { categories: [] };
        const reviewBooster = localConfig.reviewBooster ?? {
          ratingThreshold: 4,
          reviewUrl: "",
          reviewPromptText: "",
        };

        return (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="condition">Condition</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            {/* ── General Tab ─────────────────────────────── */}
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Brand Styling</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Report Title</Label>
                    <Input
                      value={brand.reportTitle}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          brand: { ...brand, reportTitle: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand.accentColor}
                        disabled={!isEditing}
                        className="h-9 w-12 cursor-pointer rounded-sm border disabled:cursor-not-allowed"
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            brand: { ...brand, accentColor: e.target.value },
                          })
                        }
                      />
                      <Input
                        value={brand.accentColor}
                        readOnly={!isEditing}
                        className="flex-1"
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            brand: { ...brand, accentColor: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="rc-show-logo"
                    checked={brand.showFacilityLogo}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        brand: { ...brand, showFacilityLogo: checked },
                      })
                    }
                  />
                  <Label htmlFor="rc-show-logo">
                    Show Facility Logo on Report Cards
                  </Label>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Enabled Services
                </Label>
                <p className="text-muted-foreground text-sm">
                  Choose which services can have report cards.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {allServices.map((svc) => {
                    const svcCfg = getServiceConfig(localConfig, svc.id);
                    return (
                      <div key={svc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`rc-svc-${svc.id}`}
                          checked={svcCfg.enabled}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            setLocalConfig(
                              updateServiceConfig(localConfig, svc.id, {
                                enabled: checked === true,
                              }),
                            )
                          }
                        />
                        <Label htmlFor={`rc-svc-${svc.id}`}>{svc.label}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Enabled Themes
                </Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {themeOptions.map((theme) => (
                    <div key={theme.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`theme-${theme.id}`}
                        checked={localConfig.enabledThemes.includes(theme.id)}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          setLocalConfig({
                            ...localConfig,
                            enabledThemes: enabled
                              ? [...localConfig.enabledThemes, theme.id]
                              : localConfig.enabledThemes.filter(
                                  (t) => t !== theme.id,
                                ),
                          });
                        }}
                      />
                      <Label htmlFor={`theme-${theme.id}`}>{theme.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Sections Tab ─────────────────────────────── */}
            <TabsContent value="sections" className="space-y-6">
              <div className="space-y-2">
                <Label>Configure sections for</Label>
                <Select
                  value={sectionServiceId}
                  onValueChange={setSectionServiceId}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allServices.map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                {allSectionIds.map((sectionId) => {
                  const meta = reportCardSectionMeta[sectionId];
                  const svcCfg = getServiceConfig(
                    localConfig,
                    sectionServiceId,
                  );
                  const isOn = svcCfg.enabledSections.includes(sectionId);
                  return (
                    <div
                      key={sectionId}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {meta?.label ?? sectionId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {meta?.description}
                        </p>
                      </div>
                      <Switch
                        checked={isOn}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => {
                          const newSections = (
                            checked
                              ? [...svcCfg.enabledSections, sectionId]
                              : svcCfg.enabledSections.filter(
                                  (s) => s !== sectionId,
                                )
                          ) as ReportCardSectionId[];
                          setLocalConfig(
                            updateServiceConfig(localConfig, sectionServiceId, {
                              enabledSections: newSections,
                            }),
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── Feedback Tab ─────────────────────────────── */}
            <TabsContent value="feedback" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Overall Feedback
                </Label>
                <div className="space-y-2">
                  <Label>Feedback Title</Label>
                  <Input
                    value={overallFeedback.title}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        overallFeedback: {
                          ...overallFeedback,
                          title: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Response Options</Label>
                  <div className="space-y-1">
                    {overallFeedback.responseOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          readOnly={!isEditing}
                          className="flex-1"
                          onChange={(e) => {
                            const updated = [
                              ...overallFeedback.responseOptions,
                            ];
                            updated[idx] = e.target.value;
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: updated,
                              },
                            });
                          }}
                        />
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated =
                                overallFeedback.responseOptions.filter(
                                  (_, i) => i !== idx,
                                );
                              setLocalConfig({
                                ...localConfig,
                                overallFeedback: {
                                  ...overallFeedback,
                                  responseOptions: updated,
                                },
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder="New option..."
                          value={newFeedbackOption}
                          onChange={(e) => setNewFeedbackOption(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!newFeedbackOption.trim()}
                          onClick={() => {
                            setLocalConfig({
                              ...localConfig,
                              overallFeedback: {
                                ...overallFeedback,
                                responseOptions: [
                                  ...overallFeedback.responseOptions,
                                  newFeedbackOption.trim(),
                                ],
                              },
                            });
                            setNewFeedbackOption("");
                          }}
                        >
                          <Plus className="mr-1 size-4" /> Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Custom Questions
                </Label>
                <p className="text-muted-foreground text-sm">
                  Create your own feedback questions that staff fill out per
                  report card.
                </p>
                <div className="space-y-2">
                  {customQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{q.question}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {q.type.replace("_", "/")}
                          </Badge>
                          {q.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {q.type === "select" && q.options && (
                            <span className="text-muted-foreground text-xs">
                              {q.options.length} options
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setLocalConfig({
                              ...localConfig,
                              customQuestions: customQuestions.filter(
                                (cq) => cq.id !== q.id,
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <Label className="text-sm font-medium">
                        Add New Question
                      </Label>
                      <Input
                        placeholder="Question text..."
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={newQuestionType}
                            onValueChange={(v) =>
                              setNewQuestionType(v as CustomFeedbackType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="rating">
                                Rating (1-5)
                              </SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="yes_no">Yes / No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newQuestionType === "select" && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Options (comma-separated)
                            </Label>
                            <Input
                              placeholder="Option A, Option B, ..."
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!newQuestionText.trim()}
                        onClick={() => {
                          const newQ: ReportCardCustomQuestion = {
                            id: `q-${Date.now()}`,
                            question: newQuestionText.trim(),
                            type: newQuestionType,
                            options:
                              newQuestionType === "select"
                                ? newOptionText
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean)
                                : undefined,
                            required: false,
                          };
                          setLocalConfig({
                            ...localConfig,
                            customQuestions: [...customQuestions, newQ],
                          });
                          setNewQuestionText("");
                          setNewOptionText("");
                        }}
                      >
                        <Plus className="mr-1 size-4" /> Add Question
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ── Condition Tab ─────────────────────────────── */}
            <TabsContent value="condition" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Pet Condition Categories
                </Label>
                <p className="text-muted-foreground text-sm">
                  Document health, coat, skin, and other observations on each
                  report card.
                </p>
                {petCondition.categories.map((cat) => (
                  <Card key={cat.id}>
                    <CardHeader className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setLocalConfig({
                                ...localConfig,
                                petCondition: {
                                  categories: petCondition.categories.filter(
                                    (c) => c.id !== cat.id,
                                  ),
                                },
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {cat.options.map((opt, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="gap-1 text-xs"
                          >
                            {opt}
                            {isEditing && (
                              <button
                                className="hover:text-destructive ml-1"
                                onClick={() => {
                                  const updatedCats =
                                    petCondition.categories.map((c) =>
                                      c.id === cat.id
                                        ? {
                                            ...c,
                                            options: c.options.filter(
                                              (_, i) => i !== idx,
                                            ),
                                          }
                                        : c,
                                    );
                                  setLocalConfig({
                                    ...localConfig,
                                    petCondition: { categories: updatedCats },
                                  });
                                }}
                              >
                                x
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            placeholder="New option..."
                            className="h-8 text-sm"
                            value={newConditionOption[cat.id] ?? ""}
                            onChange={(e) =>
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: e.target.value,
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={
                              !(newConditionOption[cat.id] ?? "").trim()
                            }
                            onClick={() => {
                              const updatedCats = petCondition.categories.map(
                                (c) =>
                                  c.id === cat.id
                                    ? {
                                        ...c,
                                        options: [
                                          ...c.options,
                                          (
                                            newConditionOption[cat.id] ?? ""
                                          ).trim(),
                                        ],
                                      }
                                    : c,
                              );
                              setLocalConfig({
                                ...localConfig,
                                petCondition: { categories: updatedCats },
                              });
                              setNewConditionOption({
                                ...newConditionOption,
                                [cat.id]: "",
                              });
                            }}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New category label..."
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!newCategoryLabel.trim()}
                      onClick={() => {
                        setLocalConfig({
                          ...localConfig,
                          petCondition: {
                            categories: [
                              ...petCondition.categories,
                              {
                                id: `cat-${Date.now()}`,
                                label: newCategoryLabel.trim(),
                                options: ["Normal"],
                              },
                            ],
                          },
                        });
                        setNewCategoryLabel("");
                      }}
                    >
                      <Plus className="mr-1 size-4" /> Add Category
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Delivery Tab ─────────────────────────────── */}
            <TabsContent value="delivery" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Auto-send Timing
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={localConfig.autoSend.mode}
                    disabled={!isEditing}
                    onValueChange={(value: "immediate" | "scheduled") =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: { ...localConfig.autoSend, mode: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        Send immediately
                      </SelectItem>
                      <SelectItem value="scheduled">
                        Schedule for time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={localConfig.autoSend.sendTime ?? "18:00"}
                    readOnly={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                    }
                    className={
                      !isEditing || localConfig.autoSend.mode !== "scheduled"
                        ? "cursor-not-allowed bg-gray-100"
                        : ""
                    }
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        autoSend: {
                          ...localConfig.autoSend,
                          sendTime: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  {(["email", "message", "sms"] as const).map((ch) => (
                    <div key={ch} className="flex items-center gap-2">
                      <Checkbox
                        id={`rc-send-${ch}`}
                        checked={localConfig.autoSend.channels[ch]}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalConfig({
                            ...localConfig,
                            autoSend: {
                              ...localConfig.autoSend,
                              channels: {
                                ...localConfig.autoSend.channels,
                                [ch]: checked === true,
                              },
                            },
                          })
                        }
                      />
                      <Label htmlFor={`rc-send-${ch}`} className="capitalize">
                        {ch}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Review Booster
                </Label>
                <p className="text-muted-foreground text-sm">
                  Prompt happy customers to leave reviews on external platforms.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Min Rating to Show Prompt</Label>
                    <Select
                      value={String(reviewBooster.ratingThreshold)}
                      disabled={!isEditing}
                      onValueChange={(v) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            ratingThreshold: Number(v),
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} star{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Review Site URL</Label>
                    <Input
                      placeholder="https://g.page/your-business/review"
                      value={reviewBooster.reviewUrl}
                      readOnly={!isEditing}
                      onChange={(e) =>
                        setLocalConfig({
                          ...localConfig,
                          reviewBooster: {
                            ...reviewBooster,
                            reviewUrl: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Review Prompt Text</Label>
                  <Textarea
                    value={reviewBooster.reviewPromptText}
                    readOnly={!isEditing}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        reviewBooster: {
                          ...reviewBooster,
                          reviewPromptText: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Template Wording (by Theme)
                </Label>
                <div className="space-y-4">
                  {themeOptions.map((theme) => (
                    <Card key={theme.id}>
                      <CardHeader className="cursor-pointer px-4 py-3">
                        <CardTitle className="text-sm">{theme.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pt-0 pb-4">
                        {(
                          [
                            "todaysVibe",
                            "friendsAndFun",
                            "careMetrics",
                            "holidaySparkle",
                            "closingNote",
                          ] as const
                        ).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">
                              {field.replace(/([A-Z])/g, " $1").trim()}
                            </Label>
                            <Textarea
                              value={localConfig.templates[theme.id][field]}
                              readOnly={!isEditing}
                              className="min-h-[60px] text-sm"
                              onChange={(e) =>
                                setLocalConfig({
                                  ...localConfig,
                                  templates: {
                                    ...localConfig.templates,
                                    [theme.id]: {
                                      ...localConfig.templates[theme.id],
                                      [field]: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );
      }}
    </SettingsBlock>
  );
}
// Facility booking access & evaluation requirements
function FacilityBookingFlowCard() {
  const { bookingFlow, updateBookingFlow } = useSettings();

  const serviceOptions = [
    { id: "daycare", label: "Daycare" },
    { id: "boarding", label: "Boarding" },
    { id: "grooming", label: "Grooming" },
    { id: "training", label: "Training" },
  ];

  const toggleService = (
    list: string[],
    serviceId: string,
    checked: boolean,
  ) => {
    if (checked) return [...list, serviceId];
    return list.filter((item) => item !== serviceId);
  };

  return (
    <SettingsBlock
      title="Booking Access & Evaluation Rules"
      description="Control when evaluations are required and which services appear in online booking."
      data={bookingFlow}
      onSave={updateBookingFlow}
    >
      {(isEditing, localFlow, setLocalFlow) => (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Evaluation Required</div>
              <div className="text-muted-foreground text-sm">
                Require evaluation before any service booking.
              </div>
            </div>
            <Switch
              checked={localFlow.evaluationRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalFlow({ ...localFlow, evaluationRequired: checked })
              }
            />
          </div>

          {localFlow.evaluationRequired ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">
                  Hide Services Until Evaluation Completed
                </div>
                <div className="text-muted-foreground text-sm">
                  Show only the Evaluation service until it is completed or
                  booked.
                </div>
              </div>
              <Switch
                checked={localFlow.hideServicesUntilEvaluationCompleted}
                disabled={!isEditing}
                onCheckedChange={(checked) =>
                  setLocalFlow({
                    ...localFlow,
                    hideServicesUntilEvaluationCompleted: checked,
                  })
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Services Requiring Evaluation First</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {serviceOptions.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`eval-${service.id}`}
                        checked={localFlow.servicesRequiringEvaluation.includes(
                          service.id,
                        )}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalFlow({
                            ...localFlow,
                            servicesRequiringEvaluation: toggleService(
                              localFlow.servicesRequiringEvaluation,
                              service.id,
                              !!checked,
                            ),
                          })
                        }
                      />
                      <Label htmlFor={`eval-${service.id}`}>
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hidden From Online Booking</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {serviceOptions.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`hidden-${service.id}`}
                        checked={localFlow.hiddenServices.includes(service.id)}
                        disabled={!isEditing}
                        onCheckedChange={(checked) =>
                          setLocalFlow({
                            ...localFlow,
                            hiddenServices: toggleService(
                              localFlow.hiddenServices,
                              service.id,
                              !!checked,
                            ),
                          })
                        }
                      />
                      <Label htmlFor={`hidden-${service.id}`}>
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsBlock>
  );
}

// Notification Settings Component
function NotificationSettingsCard() {
  const { notifications, updateNotifications } = useSettings();

  return (
    <SettingsBlock
      title="Notification Settings"
      description="Configure which notifications are sent and through which channels"
      data={notifications}
      onSave={updateNotifications}
    >
      {(isEditing, localNotifications, setLocalNotifications) => (
        <div>
          {/* Group by category */}
          {["client", "staff", "system"].map((category) => (
            <div key={category} className="mb-6">
              <h3 className="mb-3 font-semibold capitalize">
                {category} Notifications
              </h3>
              <div className="space-y-3">
                {localNotifications
                  .filter((n) => n.category === category)
                  .map((notif) => (
                    <div key={notif.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="font-medium">{notif.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {notif.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground size-4" />
                          <span className="text-sm">Email</span>
                          <Switch
                            checked={notif.email}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, email: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground size-4" />
                          <span className="text-sm">SMS</span>
                          <Switch
                            checked={notif.sms}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, sms: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="text-muted-foreground size-4" />
                          <span className="text-sm">Push</span>
                          <Switch
                            checked={notif.push}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, push: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsBlock>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSection = searchParams.get("section") ?? "business";
  const [activeSection, setActiveSection] = useState(initialSection);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    router.replace(`/facility/dashboard/settings?section=${section}`, {
      scroll: false,
    });
  };

  const { integrations, updateIntegrations, addons, updateAddons } =
    useSettings();

  // Audit Log Columns
  const auditColumns: ColumnDef<(typeof auditLog)[0]>[] = [
    {
      accessorKey: "timestamp",
      header: "Date & Time",
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "userName",
      header: "User",
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.action === "created"
              ? "default"
              : row.original.action === "updated"
                ? "secondary"
                : "destructive"
          }
          className="capitalize"
        >
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: "section",
      header: "Section",
    },
    {
      accessorKey: "settingName",
      header: "Setting",
    },
    {
      accessorKey: "changes",
      header: "Changes",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.oldValue && (
            <div className="text-red-600">
              <s>{row.original.oldValue}</s>
            </div>
          )}
          <div className="font-medium text-green-600">
            {row.original.newValue}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your facility settings and preferences
          </p>
        </div>
      </div>

      {/* Sidebar + Content layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        <div className="min-w-0 flex-1 space-y-6">
          {/* Business Configuration */}
          {activeSection === "business" && (
            <div className="space-y-6">
              <BusinessProfileCard />

              <BusinessHoursCard />

              <ServiceDayBlockingCard />
              <OneDayScheduleOverrideCard />
              <DropOffPickUpOverrideCard />

              {/* Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5" />
                    Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            {location.name}
                            {location.isActive && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {location.address}
                          </div>
                          <div className="mt-2 text-sm">
                            Phone: {location.phone} • Capacity:{" "}
                            {location.capacity} pets
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            alert(
                              `Edit location "${location.name}" - Opens location editor`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <BookingRulesCard />

              <FacilityBookingFlowCard />

              {/* Vaccination Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Vaccination Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vaccinationRules.map((vax) => (
                    <div key={vax.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{vax.vaccineName}</div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            Expiry warning: {vax.expiryWarningDays} days before
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {vax.applicableServices.map((service, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <EvaluationSettingsCard />

              <ReportCardSettingsCard />
            </div>
          )}

          {/* Financial Settings */}
          {activeSection === "financial" && (
            <div className="space-y-6">
              {/* Payment Gateways */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Gateways</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentGateways.map((gateway, idx) => (
                    <div key={idx} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold capitalize">
                            {gateway.provider}
                          </div>
                          {gateway.isEnabled && (
                            <Badge variant="default">Active</Badge>
                          )}
                          {gateway.testMode && (
                            <Badge variant="secondary">Test Mode</Badge>
                          )}
                        </div>
                        <Switch checked={gateway.isEnabled} />
                      </div>
                      {gateway.isEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">API Key</Label>
                            <Input
                              type="password"
                              value={gateway.apiKey}
                              readOnly
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Webhook Secret</Label>
                            <Input
                              type="password"
                              value={gateway.webhookSecret}
                              readOnly
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tax Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Rates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taxRates.map((tax) => (
                    <div key={tax.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tax.name}</span>
                            {tax.isDefault && (
                              <Badge variant="default">Default</Badge>
                            )}
                          </div>
                          <div className="mt-2 text-2xl font-bold">
                            {tax.rate}%
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tax.applicableServices.map((service, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            alert(
                              `Edit tax rate "${tax.name}" - Opens tax rate editor`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Currency Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Currency Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={currencySettings.currency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">
                            GBP - British Pound
                          </SelectItem>
                          <SelectItem value="CAD">
                            CAD - Canadian Dollar
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input value={currencySettings.symbol} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Decimal Places</Label>
                      <Input
                        type="number"
                        value={currencySettings.decimalPlaces}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Format Preview</Label>
                      <div className="bg-muted rounded-sm border p-2 font-mono">
                        {currencySettings.symbol}1
                        {currencySettings.thousandSeparator}234
                        {currencySettings.decimalSeparator}56
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Data Lock-down */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Data Lock-down</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Prevent editing of financial records after a certain period
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">
                        Enable Financial Lock-down
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Lock financial data after end of month
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label>Lock Period (days after month end)</Label>
                    <Input type="number" defaultValue={7} />
                    <p className="text-muted-foreground text-xs">
                      Financial records will be locked 7 days after the month
                      ends
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <NotificationSettingsCard />

              {/* Template Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Template Editor</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Customize email and SMS templates (linked to Communications
                    → Templates)
                  </p>
                </CardHeader>
                <CardContent>
                  <Link href="/facility/dashboard/communications">
                    <Button variant="outline">Open Template Editor</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Integrations */}
          {activeSection === "integrations" && (
            <div className="space-y-6">
              {/* Communication Integrations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-5" />
                    Communication Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "communication")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Connected</Badge>
                            )}
                          </div>
                          <Switch
                            checked={integration.isEnabled}
                            onCheckedChange={(checked) =>
                              updateIntegrations(
                                integrations.map((i) =>
                                  i.id === integration.id
                                    ? { ...i, isEnabled: checked }
                                    : i,
                                ),
                              )
                            }
                          />
                        </div>
                        {integration.isEnabled && (
                          <div className="text-muted-foreground text-sm">
                            Connected and operational
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Phone Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="size-5" />
                    VOIP & Phone System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "phone")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Connected</Badge>
                            )}
                          </div>
                          <Switch checked={integration.isEnabled} />
                        </div>
                        {integration.isEnabled && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Phone Number:</strong>{" "}
                              {String(integration.config.phoneNumber)}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <strong>Call Recording:</strong>
                              {integration.config.recordCalls ? (
                                <Badge variant="default" className="text-xs">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Accounting Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="size-5" />
                    Accounting Integration
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    QuickBooks Online integration (Phase 2)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "accounting")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled ? (
                              <Badge variant="default">Connected</Badge>
                            ) : (
                              <Badge variant="secondary">Not Connected</Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateIntegrations(
                                integrations.map((i) =>
                                  i.id === integration.id
                                    ? { ...i, isEnabled: !i.isEnabled }
                                    : i,
                                ),
                              );
                              alert(
                                `${integration.name} ${integration.isEnabled ? "disconnected" : "connected"} successfully!`,
                              );
                            }}
                          >
                            {integration.isEnabled ? "Disconnect" : "Connect"}
                          </Button>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          Sync frequency: Daily
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* AI Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="size-5" />
                    AI Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations
                    .filter((i) => i.category === "ai")
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">
                              {integration.name}
                            </div>
                            {integration.isEnabled && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <Switch checked={integration.isEnabled} />
                        </div>
                        {integration.isEnabled && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Model:</strong>{" "}
                              {String(integration.config.model)}
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                Enabled Features:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(
                                  integration.config.features,
                                ).map(([feature, enabled]) =>
                                  enabled ? (
                                    <Badge
                                      key={feature}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {feature
                                        .replace(/([A-Z])/g, " $1")
                                        .trim()}
                                    </Badge>
                                  ) : null,
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Mobile App */}
          {activeSection === "mobile-app" && (
            <div className="space-y-6">
              <MobileAppSettings />
            </div>
          )}

          {/* Subscription */}
          {activeSection === "subscription" && (
            <div className="space-y-6">
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between rounded-lg bg-linear-to-br from-blue-50 to-purple-50 p-6">
                    <div>
                      <div className="text-2xl font-bold">
                        {subscription.planName}
                      </div>
                      <div className="text-muted-foreground mt-1 capitalize">
                        {subscription.billingCycle} billing
                      </div>
                      <div className="mt-4">
                        <Badge
                          variant={
                            subscription.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">
                        ${subscription.price}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        per{" "}
                        {subscription.billingCycle === "monthly"
                          ? "month"
                          : "year"}
                      </div>
                      <div className="text-muted-foreground mt-2 text-xs">
                        Next billing:{" "}
                        {new Date(
                          subscription.nextBillingDate,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        alert(
                          "Opens plan selection modal - Choose from Starter, Professional, and Enterprise plans",
                        );
                      }}
                    >
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        alert(
                          "Opens billing history - Shows all past invoices and payment history",
                        );
                      }}
                    >
                      Billing History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Module Add-ons */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Add-ons</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Enable additional modules to extend functionality
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addons.map((addon) => (
                    <div key={addon.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{addon.name}</span>
                            {addon.isIncludedInPlan && (
                              <Badge variant="default">Included in Plan</Badge>
                            )}
                            {addon.isEnabled && !addon.isIncludedInPlan && (
                              <Badge variant="secondary">Active Add-on</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {addon.description}
                          </div>
                          {!addon.isIncludedInPlan && (
                            <div className="mt-2 text-sm font-medium">
                              ${addon.monthlyPrice}/month
                            </div>
                          )}
                        </div>
                        <Switch
                          checked={addon.isEnabled}
                          disabled={addon.isIncludedInPlan}
                          onCheckedChange={(checked) =>
                            updateAddons(
                              addons.map((a) =>
                                a.id === addon.id
                                  ? { ...a, isEnabled: checked }
                                  : a,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Log */}
          {activeSection === "audit" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Audit Log</CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Complete history of all setting changes
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 size-4" />
                      Export Log
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={auditColumns}
                    data={auditLog}
                    searchColumn="settingName"
                    searchPlaceholder="Search audit log..."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* YipyyGo */}
          {activeSection === "yipyygo" && (
            <div className="space-y-6">
              <YipyyGoSettingsWrapper />
            </div>
          )}

          {/* Form Requirements */}
          {activeSection === "form-requirements" && (
            <div className="space-y-6">
              <FormRequirementsSettings />
            </div>
          )}

          {/* Form Permissions */}
          {activeSection === "form-permissions" && (
            <div className="space-y-6">
              <FormPermissionsPanel />
            </div>
          )}

          {/* Form Notifications */}
          {activeSection === "form-notifications" && (
            <div className="space-y-6">
              <FormNotificationSettings />
            </div>
          )}

          {/* Tags & Notes */}
          {activeSection === "tags-notes" && (
            <div className="space-y-6">
              <TagNotesSettings />
            </div>
          )}

          {/* Service settings placeholder sections */}
          {activeSection === "boarding" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Boarding Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Boarding module configuration — pricing, evaluation, media,
                    and basic info.
                  </p>
                  <Link
                    href="/facility/dashboard/services/boarding"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Boarding Module →
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "daycare" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daycare Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Daycare module configuration — pricing, evaluation, media,
                    and basic info.
                  </p>
                  <Link
                    href="/facility/dashboard/services/daycare"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Daycare Module →
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "grooming" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grooming Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Grooming module configuration — scheduling, pricing,
                    add-ons, stylists, and policies.
                  </p>
                  <Link
                    href="/facility/dashboard/services/grooming"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Grooming Module →
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "training" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Training module configuration — courses, session types, and
                    trainer management.
                  </p>
                  <Link
                    href="/facility/dashboard/services/training"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Go to Training Module →
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// YipyyGo Settings Wrapper Component
function YipyyGoSettingsWrapper() {
  const facilityId = 11; // TODO: Get from auth context
  const [config, setConfig] = useState(() => getYipyyGoConfig(facilityId)!);

  return (
    <YipyyGoSettings
      config={config}
      onConfigChange={setConfig}
      facilityId={facilityId}
    />
  );
}
