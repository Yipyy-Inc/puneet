"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileAppSettings } from "@/components/additional-features/MobileAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Building2,
  DollarSign,
  Bell,
  Plug,
  CreditCard,
  History,
  Save,
  MapPin,
  Clock,
  Shield,
  Mail,
  Phone,
  Zap,
  Download,
  Smartphone,
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
  businessProfile,
  businessHours,
  locations,
  bookingRules,
  kennelTypes,
  petSizeClasses,
  vaccinationRules,
  paymentGateways,
  taxRates,
  currencySettings,
  roles,
  notificationToggles,
  integrations,
  subscription,
  moduleAddons,
  auditLog,
} from "@/data/settings";

export default function SettingsPage() {
  const [profile, setProfile] = useState(businessProfile);
  const [hours, setHours] = useState(businessHours);
  const [rules, setRules] = useState(bookingRules);
  const [notifications, setNotifications] = useState(notificationToggles);
  const [integrationsData, setIntegrationsData] = useState(integrations);
  const [addons, setAddons] = useState(moduleAddons);

  const handleSave = (section: string) => {
    console.log(`Saving ${section} settings...`);
    // In a real app, would save to backend
  };

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
          <div className="text-green-600 font-medium">{row.original.newValue}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your facility settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="business">
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="mobile-app">
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile App
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Business Configuration Tab */}
        <TabsContent value="business" className="space-y-6">
          {/* Business Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Business Profile</CardTitle>
                <Button onClick={() => handleSave("Business Profile")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={profile.businessName}
                    onChange={(e) =>
                      setProfile({ ...profile, businessName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profile.website}
                    onChange={(e) =>
                      setProfile({ ...profile, website: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) =>
                    setProfile({ ...profile, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Street Address"
                    value={profile.address.street}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, street: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="City"
                    value={profile.address.city}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, city: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="State"
                    value={profile.address.state}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, state: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={profile.address.zipCode}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: {
                          ...profile.address,
                          zipCode: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Social Media</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Facebook URL"
                    value={profile.socialMedia.facebook}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialMedia: {
                          ...profile.socialMedia,
                          facebook: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="Instagram URL"
                    value={profile.socialMedia.instagram}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialMedia: {
                          ...profile.socialMedia,
                          instagram: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="Twitter URL"
                    value={profile.socialMedia.twitter}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        socialMedia: {
                          ...profile.socialMedia,
                          twitter: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Business Hours</CardTitle>
                <Button onClick={() => handleSave("Business Hours")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(hours).map(([day, schedule]) => (
                <div
                  key={day}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-32 font-medium capitalize">{day}</div>
                    <Switch
                      checked={schedule.isOpen}
                      onCheckedChange={(checked) =>
                        setHours({
                          ...hours,
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
                            setHours({
                              ...hours,
                              [day]: { ...schedule, openTime: e.target.value },
                            })
                          }
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) =>
                            setHours({
                              ...hours,
                              [day]: { ...schedule, closeTime: e.target.value },
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                    {!schedule.isOpen && (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        {location.name}
                        {location.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {location.address}
                      </div>
                      <div className="text-sm mt-2">
                        Phone: {location.phone} • Capacity: {location.capacity}{" "}
                        pets
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Booking Rules */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Rules & Policies</CardTitle>
                <Button onClick={() => handleSave("Booking Rules")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Advance Booking (hours)</Label>
                  <Input
                    type="number"
                    value={rules.minimumAdvanceBooking}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        minimumAdvanceBooking: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Advance Booking (days)</Label>
                  <Input
                    type="number"
                    value={rules.maximumAdvanceBooking}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        maximumAdvanceBooking: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Policy (hours before)</Label>
                  <Input
                    type="number"
                    value={rules.cancelPolicyHours}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        cancelPolicyHours: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Fee (%)</Label>
                  <Input
                    type="number"
                    value={rules.cancelFeePercentage}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        cancelFeePercentage: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Percentage (%)</Label>
                  <Input
                    type="number"
                    value={rules.depositPercentage}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        depositPercentage: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facility Capacity Limit</Label>
                  <Input
                    type="number"
                    value={rules.capacityLimit}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        capacityLimit: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Require Deposit</div>
                  <div className="text-sm text-muted-foreground">
                    Require deposit at booking
                  </div>
                </div>
                <Switch
                  checked={rules.depositRequired}
                  onCheckedChange={(checked) =>
                    setRules({ ...rules, depositRequired: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Allow Overbooking</div>
                  <div className="text-sm text-muted-foreground">
                    Accept bookings beyond capacity
                  </div>
                </div>
                <Switch
                  checked={rules.allowOverBooking}
                  onCheckedChange={(checked) =>
                    setRules({ ...rules, allowOverBooking: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Kennel Types */}
          <Card>
            <CardHeader>
              <CardTitle>Kennel Types & Amenities</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visual kennel map available in Kennel View
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {kennelTypes.map((kennel) => (
                <div key={kennel.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{kennel.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Size: {kennel.dimensions} • {kennel.quantity} available
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {kennel.amenities.map((amenity, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${kennel.dailyRate}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        per night
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pet Size Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Pet Size Classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {petSizeClasses.map((size) => (
                <div
                  key={size.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="font-medium">{size.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {size.weightMin} - {size.weightMax} {size.unit}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vaccination Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Vaccination Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vaccinationRules.map((vax) => (
                <div key={vax.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{vax.vaccineName}</span>
                        {vax.required && (
                          <Badge variant="destructive">Required</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Expiry warning: {vax.expiryWarningDays} days before
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
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
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial" className="space-y-6">
          {/* Payment Gateways */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateways</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentGateways.map((gateway, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
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
              <div className="flex items-center justify-between">
                <CardTitle>Tax Rates</CardTitle>
                <Button onClick={() => handleSave("Tax Rates")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {taxRates.map((tax) => (
                <div key={tax.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tax.name}</span>
                        {tax.isDefault && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold mt-2">{tax.rate}%</div>
                      <div className="flex flex-wrap gap-1 mt-2">
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
                    <Button variant="outline" size="sm">
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
              <div className="flex items-center justify-between">
                <CardTitle>Currency Settings</CardTitle>
                <Button onClick={() => handleSave("Currency")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
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
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
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
                  <div className="p-2 border rounded bg-muted font-mono">
                    {currencySettings.symbol}1
                    {currencySettings.thousandSeparator}234
                    {currencySettings.decimalSeparator}56
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="p-4 border rounded-lg">
                  <div className="font-semibold mb-3">{role.name}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(role.permissions).map(
                      ([permission, granted]) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${
                              granted ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <span className="text-xs capitalize">
                            {permission.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial Data Lock-down */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Data Lock-down</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Prevent editing of financial records after a certain period
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Enable Financial Lock-down</div>
                  <div className="text-sm text-muted-foreground">
                    Lock financial data after end of month
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Lock Period (days after month end)</Label>
                <Input type="number" defaultValue={7} />
                <p className="text-xs text-muted-foreground">
                  Financial records will be locked 7 days after the month ends
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notification Settings</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure which notifications are sent and through which
                    channels
                  </p>
                </div>
                <Button onClick={() => handleSave("Notifications")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group by category */}
              {["client", "staff", "system"].map((category) => (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold mb-3 capitalize">
                    {category} Notifications
                  </h3>
                  <div className="space-y-3">
                    {notifications
                      .filter((n) => n.category === category)
                      .map((notif) => (
                        <div key={notif.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-medium">{notif.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {notif.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Email</span>
                              <Switch
                                checked={notif.email}
                                onCheckedChange={(checked) =>
                                  setNotifications(
                                    notifications.map((n) =>
                                      n.id === notif.id
                                        ? { ...n, email: checked }
                                        : n
                                    )
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">SMS</span>
                              <Switch
                                checked={notif.sms}
                                onCheckedChange={(checked) =>
                                  setNotifications(
                                    notifications.map((n) =>
                                      n.id === notif.id
                                        ? { ...n, sms: checked }
                                        : n
                                    )
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Push</span>
                              <Switch
                                checked={notif.push}
                                onCheckedChange={(checked) =>
                                  setNotifications(
                                    notifications.map((n) =>
                                      n.id === notif.id
                                        ? { ...n, push: checked }
                                        : n
                                    )
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
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Template Editor</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Customize email and SMS templates (linked to Communications →
                Templates)
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Open Template Editor</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Communication Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationsData
                .filter((i) => i.category === "communication")
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{integration.name}</div>
                        {integration.isEnabled && (
                          <Badge variant="default">Connected</Badge>
                        )}
                      </div>
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={(checked) =>
                          setIntegrationsData(
                            integrationsData.map((i) =>
                              i.id === integration.id
                                ? { ...i, isEnabled: checked }
                                : i
                            )
                          )
                        }
                      />
                    </div>
                    {integration.isEnabled && (
                      <div className="text-sm text-muted-foreground">
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
                <Phone className="h-5 w-5" />
                VOIP & Phone System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationsData
                .filter((i) => i.category === "phone")
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{integration.name}</div>
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
                          {integration.config.phoneNumber}
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
                <DollarSign className="h-5 w-5" />
                Accounting Integration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                QuickBooks Online integration (Phase 2)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationsData
                .filter((i) => i.category === "accounting")
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{integration.name}</div>
                        {integration.isEnabled ? (
                          <Badge variant="default">Connected</Badge>
                        ) : (
                          <Badge variant="secondary">Not Connected</Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        {integration.isEnabled ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
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
                <Zap className="h-5 w-5" />
                AI Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationsData
                .filter((i) => i.category === "ai")
                .map((integration) => (
                  <div
                    key={integration.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{integration.name}</div>
                        {integration.isEnabled && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <Switch checked={integration.isEnabled} />
                    </div>
                    {integration.isEnabled && (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Model:</strong> {integration.config.model}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Enabled Features:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(integration.config.features).map(
                              ([feature, enabled]) =>
                                enabled ? (
                                  <Badge
                                    key={feature}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {feature.replace(/([A-Z])/g, " $1").trim()}
                                  </Badge>
                                ) : null
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile App Tab */}
        <TabsContent value="mobile-app" className="space-y-6">
          <MobileAppSettings />
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-6 bg-linear-to-br from-blue-50 to-purple-50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold">
                    {subscription.planName}
                  </div>
                  <div className="text-muted-foreground capitalize mt-1">
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
                  <div className="text-sm text-muted-foreground">
                    per{" "}
                    {subscription.billingCycle === "monthly" ? "month" : "year"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Next billing:{" "}
                    {new Date(
                      subscription.nextBillingDate
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">Billing History</Button>
              </div>
            </CardContent>
          </Card>

          {/* Module Add-ons */}
          <Card>
            <CardHeader>
              <CardTitle>Module Add-ons</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Enable additional modules to extend functionality
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {addons.map((addon) => (
                <div key={addon.id} className="p-4 border rounded-lg">
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
                      <div className="text-sm text-muted-foreground mt-1">
                        {addon.description}
                      </div>
                      {!addon.isIncludedInPlan && (
                        <div className="text-sm font-medium mt-2">
                          ${addon.monthlyPrice}/month
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={addon.isEnabled}
                      disabled={addon.isIncludedInPlan}
                      onCheckedChange={(checked) =>
                        setAddons(
                          addons.map((a) =>
                            a.id === addon.id ? { ...a, isEnabled: checked } : a
                          )
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete history of all setting changes
                  </p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

