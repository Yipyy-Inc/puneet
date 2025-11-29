"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PawPrint,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Settings,
  BarChart3,
  Package,
  Save,
  X,
  Edit,
  Plus,
  Trash2,
  Info,
} from "lucide-react";

interface ServiceLocation {
  name: string;
  address: string;
}

interface ServicePackage {
  id: string;
  name: string;
  price: number;
  duration?: number;
  description: string;
  includes: string[];
}

interface ServiceSession {
  id: string;
  date: string;
  time: string;
  staff: string[];
  pets: string[];
  status: "scheduled" | "completed" | "cancelled";
  capacity?: number;
  bookedCount?: number;
}

export interface ServiceSettings {
  enabled: boolean;
  basePrice?: number;
  pricePerDay?: number;
  pricePerNight?: number;
  maxCapacity?: number;
  operatingHours?: {
    start: string;
    end: string;
  };
  checkInTime?: string;
  checkOutTime?: string;
  availableLocations: string[];
  description: string;
  rules: string;
  packages?: ServicePackage[];
  sessions: ServiceSession[];
  requirements?: string[];
  amenities?: string[];
}

interface ServiceSettingsComponentProps {
  serviceName: string;
  serviceIcon: React.ReactNode;
  locations: ServiceLocation[];
  settings: ServiceSettings;
  onSave: (settings: ServiceSettings) => void;
  priceLabel?: string;
  showCapacity?: boolean;
  showOperatingHours?: boolean;
  showCheckInOut?: boolean;
  showPackages?: boolean;
}

export function ServiceSettingsComponent({
  serviceName,
  serviceIcon,
  locations,
  settings: initialSettings,
  onSave,
  priceLabel = "Base Price",
  showCapacity = true,
  showOperatingHours = true,
  showCheckInOut = false,
  showPackages = true,
}: ServiceSettingsComponentProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [tempSettings, setTempSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState("general");

  const handleEdit = () => {
    setIsEditing(true);
    setTempSettings(settings);
  };

  const handleSave = () => {
    setSettings(tempSettings);
    setIsEditing(false);
    onSave(tempSettings);
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setIsEditing(false);
  };

  const handleLocationChange = (locationName: string, checked: boolean) => {
    const currentLocations = tempSettings.availableLocations;
    if (checked) {
      setTempSettings({
        ...tempSettings,
        availableLocations: [...currentLocations, locationName],
      });
    } else {
      setTempSettings({
        ...tempSettings,
        availableLocations: currentLocations.filter(
          (loc) => loc !== locationName,
        ),
      });
    }
  };

  const handleAddPackage = () => {
    const newPackage: ServicePackage = {
      id: `pkg-${Date.now()}`,
      name: "New Package",
      price: 0,
      description: "",
      includes: [],
    };
    setTempSettings({
      ...tempSettings,
      packages: [...(tempSettings.packages || []), newPackage],
    });
  };

  const handleRemovePackage = (packageId: string) => {
    setTempSettings({
      ...tempSettings,
      packages: (tempSettings.packages || []).filter((p) => p.id !== packageId),
    });
  };

  const handleUpdatePackage = (
    packageId: string,
    updates: Partial<ServicePackage>,
  ) => {
    setTempSettings({
      ...tempSettings,
      packages: (tempSettings.packages || []).map((p) =>
        p.id === packageId ? { ...p, ...updates } : p,
      ),
    });
  };

  const currentSettings = isEditing ? tempSettings : settings;

  // Calculate analytics
  const totalSessions = currentSettings.sessions.length;
  const completedSessions = currentSettings.sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const upcomingSessions = currentSettings.sessions.filter(
    (s) => s.status === "scheduled",
  ).length;
  const totalRevenue = currentSettings.sessions
    .filter((s) => s.status === "completed")
    .reduce((sum, session) => {
      const price =
        currentSettings.basePrice ||
        currentSettings.pricePerDay ||
        currentSettings.pricePerNight ||
        0;
      return sum + price * session.pets.length;
    }, 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {serviceIcon}
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {serviceName} Service
              </h2>
              <p className="text-muted-foreground">
                Manage your {serviceName.toLowerCase()} service settings,
                pricing, and availability
              </p>
            </div>
          </div>
        </div>
        <Badge
          variant={settings.enabled ? "default" : "secondary"}
          className="text-sm px-3 py-1"
        >
          {settings.enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Analytics Overview */}
      {!isEditing && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sessions
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingSessions}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSessions}</div>
              <p className="text-xs text-muted-foreground">Finished sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
          {showPackages && (
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Packages
            </TabsTrigger>
          )}
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">Enable Service</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this service available for booking
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={currentSettings.enabled}
                    onCheckedChange={(checked) =>
                      setTempSettings({ ...tempSettings, enabled: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{priceLabel} ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={
                      currentSettings.basePrice ||
                      currentSettings.pricePerDay ||
                      currentSettings.pricePerNight ||
                      0
                    }
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (currentSettings.basePrice !== undefined) {
                        setTempSettings({ ...tempSettings, basePrice: value });
                      } else if (currentSettings.pricePerDay !== undefined) {
                        setTempSettings({
                          ...tempSettings,
                          pricePerDay: value,
                        });
                      } else if (currentSettings.pricePerNight !== undefined) {
                        setTempSettings({
                          ...tempSettings,
                          pricePerNight: value,
                        });
                      }
                    }}
                    disabled={!isEditing}
                  />
                  <p className="text-sm text-muted-foreground">
                    Standard rate for this service
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Capacity */}
            {showCapacity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Maximum Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={currentSettings.maxCapacity || 0}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          maxCapacity: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum number of pets that can be accommodated
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operating Hours */}
            {showOperatingHours && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Operating Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start Time</Label>
                      <Input
                        id="start"
                        type="time"
                        value={currentSettings.operatingHours?.start || ""}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            operatingHours: {
                              ...tempSettings.operatingHours!,
                              start: e.target.value,
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End Time</Label>
                      <Input
                        id="end"
                        type="time"
                        value={currentSettings.operatingHours?.end || ""}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            operatingHours: {
                              ...tempSettings.operatingHours!,
                              end: e.target.value,
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Check-in/Check-out Times */}
            {showCheckInOut && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Check-in/Check-out
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkin">Check-in Time</Label>
                      <Input
                        id="checkin"
                        type="time"
                        value={currentSettings.checkInTime || ""}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            checkInTime: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout">Check-out Time</Label>
                      <Input
                        id="checkout"
                        type="time"
                        value={currentSettings.checkOutTime || ""}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            checkOutTime: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={currentSettings.description}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      description: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Describe what this service includes..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rules">Rules & Requirements</Label>
                <Textarea
                  id="rules"
                  value={currentSettings.rules}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      rules: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                  rows={3}
                  placeholder="List any rules or requirements for this service..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Available Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No locations available</p>
                  <p className="text-sm">Add locations in facility settings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div
                      key={location.name}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      data-selected={currentSettings.availableLocations.includes(
                        location.name,
                      )}
                    >
                      <Checkbox
                        id={`location-${location.name}`}
                        checked={currentSettings.availableLocations.includes(
                          location.name,
                        )}
                        onCheckedChange={(checked) =>
                          handleLocationChange(
                            location.name,
                            checked as boolean,
                          )
                        }
                        disabled={!isEditing}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`location-${location.name}`}
                          className="font-medium cursor-pointer"
                        >
                          {location.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {location.address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                Select the locations where this service is available
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        {showPackages && (
          <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Service Packages
                </CardTitle>
                {isEditing && (
                  <Button
                    onClick={handleAddPackage}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Package
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentSettings.packages ||
                currentSettings.packages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No packages configured</p>
                    {isEditing && (
                      <p className="text-sm">
                        Click &ldquo;Add Package&rdquo; to create one
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {currentSettings.packages.map((pkg) => (
                      <Card key={pkg.id} className="relative">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isEditing ? (
                                <Input
                                  value={pkg.name}
                                  onChange={(e) =>
                                    handleUpdatePackage(pkg.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="font-semibold text-lg mb-2"
                                  placeholder="Package name"
                                />
                              ) : (
                                <CardTitle>{pkg.name}</CardTitle>
                              )}
                            </div>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePackage(pkg.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={pkg.price}
                                onChange={(e) =>
                                  handleUpdatePackage(pkg.id, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="text-lg font-bold"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="text-lg font-bold">
                                ${pkg.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={pkg.description}
                              onChange={(e) =>
                                handleUpdatePackage(pkg.id, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Package description"
                              rows={2}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {pkg.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSettings.sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No sessions scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentSettings.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">{session.date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="font-medium">{session.time}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Staff</p>
                          <p className="font-medium">
                            {session.staff.join(", ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pets</p>
                          <p className="font-medium">
                            {session.pets.length} booked
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "default"
                            : session.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {isEditing && "Make changes and click save to apply"}
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Settings
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
