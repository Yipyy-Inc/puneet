"use client";

import { useState } from "react";
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { companyProfile as initial } from "@/data/scheduling";
import type { CompanyProfile, FacilityLocation } from "@/types/scheduling";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

const PAY_PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "semimonthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
];

export function CompanyProfileView() {
  const [profile, setProfile] = useState<CompanyProfile>(initial);

  const setField = <K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const setLocation = (id: string, patch: Partial<FacilityLocation>) => {
    setProfile((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id === id ? { ...l, ...patch } : l,
      ),
    }));
  };

  const setLocationHour = (
    locId: string,
    dayOfWeek: number,
    patch: Partial<FacilityLocation["operatingHours"][number]>,
  ) => {
    setProfile((prev) => ({
      ...prev,
      locations: prev.locations.map((l) =>
        l.id !== locId
          ? l
          : {
              ...l,
              operatingHours: l.operatingHours.map((h) =>
                h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h,
              ),
            },
      ),
    }));
  };

  const handleSave = () => {
    setProfile((p) => ({
      ...p,
      updatedAt: new Date().toISOString().split("T")[0],
    }));
    toast.success("Company profile saved");
  };

  const addLocation = () => {
    const id = `loc-${Date.now()}`;
    setProfile((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          id,
          name: "New Location",
          address: "",
          city: "",
          region: "",
          postalCode: "",
          country: "Canada",
          phone: "",
          timezone: prev.defaultTimezone,
          operatingHours: Array.from({ length: 7 }, (_, dow) => ({
            dayOfWeek: dow,
            isOpen: dow !== 0,
            openTime: "09:00",
            closeTime: "17:00",
          })),
          isPrimary: false,
        },
      ],
    }));
    toast.info("New location added — fill in the details");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Company Profile
          </h2>
          <p className="text-muted-foreground text-sm">
            Business identity, locations, and operating hours.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-1.5 size-3.5" />
          Save changes
        </Button>
      </div>

      {/* Company info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" /> Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Company name">
            <Input
              value={profile.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Legal name">
            <Input
              value={profile.legalName ?? ""}
              onChange={(e) => setField("legalName", e.target.value)}
            />
          </Field>
          <Field label="Industry">
            <Input
              value={profile.industry}
              onChange={(e) => setField("industry", e.target.value)}
            />
          </Field>
          <Field label="Tax / Business ID">
            <Input
              value={profile.taxId ?? ""}
              onChange={(e) => setField("taxId", e.target.value)}
            />
          </Field>
          <Field label="Contact email" icon={Mail}>
            <Input
              type="email"
              value={profile.contactEmail}
              onChange={(e) => setField("contactEmail", e.target.value)}
            />
          </Field>
          <Field label="Contact phone" icon={Phone}>
            <Input
              value={profile.contactPhone ?? ""}
              onChange={(e) => setField("contactPhone", e.target.value)}
            />
          </Field>
          <Field label="Website" icon={Globe}>
            <Input
              value={profile.website ?? ""}
              onChange={(e) => setField("website", e.target.value)}
            />
          </Field>
          <Field label="Default timezone">
            <Select
              value={profile.defaultTimezone}
              onValueChange={(v) => setField("defaultTimezone", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Week starts on">
            <Select
              value={String(profile.weekStartsOn)}
              onValueChange={(v) => setField("weekStartsOn", parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pay period">
            <Select
              value={profile.payPeriod}
              onValueChange={(v) =>
                setField("payPeriod", v as CompanyProfile["payPeriod"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Locations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Locations</h3>
          <Button variant="outline" size="sm" onClick={addLocation}>
            <Plus className="mr-1 size-3.5" /> Add location
          </Button>
        </div>

        {profile.locations.map((loc) => (
          <Card key={loc.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="size-4" />
                  <Input
                    value={loc.name}
                    onChange={(e) =>
                      setLocation(loc.id, { name: e.target.value })
                    }
                    className="h-8 w-auto min-w-[200px] text-base font-semibold"
                  />
                  {loc.isPrimary && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Star className="size-3" /> Primary
                    </Badge>
                  )}
                </CardTitle>
                {!loc.isPrimary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        locations: p.locations.map((l) => ({
                          ...l,
                          isPrimary: l.id === loc.id,
                        })),
                      }))
                    }
                  >
                    Make primary
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Address" className="md:col-span-2">
                  <Input
                    value={loc.address}
                    onChange={(e) =>
                      setLocation(loc.id, { address: e.target.value })
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={loc.phone ?? ""}
                    onChange={(e) =>
                      setLocation(loc.id, { phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={loc.city}
                    onChange={(e) =>
                      setLocation(loc.id, { city: e.target.value })
                    }
                  />
                </Field>
                <Field label="Region / State">
                  <Input
                    value={loc.region}
                    onChange={(e) =>
                      setLocation(loc.id, { region: e.target.value })
                    }
                  />
                </Field>
                <Field label="Postal / ZIP">
                  <Input
                    value={loc.postalCode}
                    onChange={(e) =>
                      setLocation(loc.id, { postalCode: e.target.value })
                    }
                  />
                </Field>
                <Field label="Country">
                  <Input
                    value={loc.country}
                    onChange={(e) =>
                      setLocation(loc.id, { country: e.target.value })
                    }
                  />
                </Field>
                <Field label="Timezone">
                  <Select
                    value={loc.timezone}
                    onValueChange={(v) => setLocation(loc.id, { timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">
                  Operating hours
                </Label>
                <div className="space-y-1.5">
                  {loc.operatingHours.map((h) => (
                    <div
                      key={h.dayOfWeek}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-12 font-medium">
                        {DAYS[h.dayOfWeek]}
                      </div>
                      <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={h.isOpen}
                          onChange={(e) =>
                            setLocationHour(loc.id, h.dayOfWeek, {
                              isOpen: e.target.checked,
                            })
                          }
                          className="size-3.5 rounded-sm"
                        />
                        Open
                      </label>
                      {h.isOpen ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={h.openTime ?? ""}
                            onChange={(e) =>
                              setLocationHour(loc.id, h.dayOfWeek, {
                                openTime: e.target.value,
                              })
                            }
                            className="h-7 w-28 text-xs"
                          />
                          <span className="text-muted-foreground">→</span>
                          <Input
                            type="time"
                            value={h.closeTime ?? ""}
                            onChange={(e) =>
                              setLocationHour(loc.id, h.dayOfWeek, {
                                closeTime: e.target.value,
                              })
                            }
                            className="h-7 w-28 text-xs"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Closed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: typeof Mail;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
