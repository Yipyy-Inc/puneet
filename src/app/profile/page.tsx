"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Bell,
  Settings,
  Edit,
  Save,
  PawPrint,
  Camera,
  Globe,
  Clock,
  CheckCircle2,
  Crown,
  UserCheck,
  ArrowLeft,
} from "lucide-react";

// User type definitions
type UserType = "platform" | "facility" | "client";

interface UserContext {
  type: UserType;
  name: string;
  email: string;
  role: string;
  facility?: string;
  pets?: Array<{ name: string; type: string; age: number }>;
  permissions: string[];
  hireDate: string;
  lastLogin: string;
  phone: string;
  status: "active" | "inactive";
}

// Mock users for different contexts
const userContexts: Record<UserType, UserContext> = {
  platform: {
    type: "platform",
    name: "Alex Thompson",
    email: "alex@platform.com",
    role: "Platform Admin",
    permissions: [
      "manage_platform",
      "manage_facilities",
      "view_global_reports",
      "manage_users",
      "system_admin",
    ],
    hireDate: "2023-01-15",
    lastLogin: "2025-11-15",
    phone: "+1-555-0100",
    status: "active",
  },
  facility: {
    type: "facility",
    name: "Sarah Johnson",
    email: "sarah@pawsplay.com",
    role: "Facility Manager",
    facility: "Paws & Play Daycare",
    permissions: [
      "manage_facility",
      "manage_staff",
      "view_reports",
      "schedule_appointments",
      "handle_bookings",
      "manage_inventory",
    ],
    hireDate: "2024-03-10",
    lastLogin: "2025-11-15",
    phone: "+1-555-0104",
    status: "active",
  },
  client: {
    type: "client",
    name: "Emma Wilson",
    email: "emma.wilson@email.com",
    role: "Pet Owner",
    permissions: ["book_services", "view_bookings", "manage_pets"],
    hireDate: "2024-06-20",
    lastLogin: "2025-11-14",
    phone: "+1-555-0200",
    status: "active",
    pets: [
      { name: "Buddy", type: "Dog", age: 3 },
      { name: "Whiskers", type: "Cat", age: 2 },
    ],
  },
};

export default function ProfilePage() {
  const [currentUserType, setCurrentUserType] = useState<UserType>("platform");
  const currentUser = userContexts[currentUserType];

  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailUpdates: true,
    emailMarketing: false,
    pushBookings: true,
    pushUpdates: false,
    pushReminders: true,
    smsEmergency: true,
    smsReminders: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "America/New_York",
    timeFormat: "12h",
    dateFormat: "MM/DD/YYYY",
    weekStartsOn: "monday",
    currency: "USD",
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: "30",
    loginAlerts: true,
  });

  const handleSave = () => {
    // In a real app, this would save to backend
    setIsEditing(false);
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSecurityChange = (key: string, value: boolean | string) => {
    setSecurity((prev) => ({ ...prev, [key]: value }));
  };

  const handleUserTypeChange = (type: UserType) => {
    setCurrentUserType(type);
    const newUser = userContexts[type];
    setEditData({
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
    });
  };

  const getUserTypeIcon = (type: UserType) => {
    switch (type) {
      case "platform":
        return <Crown className="h-4 w-4" />;
      case "facility":
        return <Building2 className="h-4 w-4" />;
      case "client":
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getUserTypeColor = (type: UserType) => {
    switch (type) {
      case "platform":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "facility":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "client":
        return "bg-green-100 text-green-700 border-green-200";
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      {/* Header with Context Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="sm" asChild className="shadow-sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* User Context Switcher */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Context:</Label>
          <Select
            value={currentUserType}
            onValueChange={(value) => handleUserTypeChange(value as UserType)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Platform Admin
                </div>
              </SelectItem>
              <SelectItem value="facility">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Facility Manager
                </div>
              </SelectItem>
              <SelectItem value="client">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Pet Owner
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-0 shadow-card mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative group">
                <Avatar className="w-32 h-32 mb-4 ring-4 ring-background shadow-xl transition-all duration-300 group-hover:ring-primary/20 group-hover:shadow-2xl">
                  <AvatarImage src="" alt={currentUser.name} />
                  <AvatarFallback className="text-3xl bg-linear-to-br from-primary/20 to-secondary/20">
                    {currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mb-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Active since {currentUser.hireDate}</span>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {currentUser.name}
                  </h2>
                  <Badge
                    className={`shadow-sm ${getUserTypeColor(currentUserType)}`}
                  >
                    {getUserTypeIcon(currentUserType)}
                    <span className="ml-1">{currentUser.role}</span>
                  </Badge>
                </div>
                {currentUser.facility && (
                  <p className="text-muted-foreground mt-1">
                    {currentUser.facility}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="shadow-sm">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {currentUser.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Email
                    </p>
                    <p className="font-medium">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Phone
                    </p>
                    <p className="font-medium">{currentUser.phone}</p>
                  </div>
                </div>

                {currentUser.type === "facility" && currentUser.facility && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Facility
                      </p>
                      <p className="font-medium">{currentUser.facility}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Last Login
                    </p>
                    <p className="font-medium">{currentUser.lastLogin}</p>
                  </div>
                </div>

                {currentUser.type === "client" && currentUser.pets && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <PawPrint className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Pets
                      </p>
                      <p className="font-medium">
                        {currentUser.pets.length} registered
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {currentUser.type === "client" && currentUser.pets && (
                <div className="p-4 rounded-lg bg-linear-gradient-to-r from-primary/5 to-secondary/5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <PawPrint className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium">My Pets</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentUser.pets.map((pet, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="shadow-sm"
                      >
                        <PawPrint className="h-3 w-3 mr-1" />
                        {pet.name} ({pet.type}, {pet.age}y)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList
          className={`grid w-full ${currentUser.type === "client" ? "grid-cols-5" : "grid-cols-4"}`}
        >
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {currentUser.type === "client" && (
            <TabsTrigger value="pets" className="flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              Pets
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="shadow-sm"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="font-medium">{currentUser.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="shadow-sm"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="font-medium">{currentUser.email}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editData.phone}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="shadow-sm"
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <p className="font-medium">{currentUser.phone}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="font-medium">{currentUser.hireDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} className="shadow-sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="shadow-sm"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="shadow-sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions & Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentUser.permissions.map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm capitalize">
                      {permission.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Localization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={preferences.language}
                        onValueChange={(value) =>
                          handlePreferenceChange("language", value)
                        }
                      >
                        <SelectTrigger className="shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Time Zone</Label>
                      <Select
                        value={preferences.timezone}
                        onValueChange={(value) =>
                          handlePreferenceChange("timezone", value)
                        }
                      >
                        <SelectTrigger className="shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">
                            Eastern Time (EST)
                          </SelectItem>
                          <SelectItem value="America/Chicago">
                            Central Time (CST)
                          </SelectItem>
                          <SelectItem value="America/Denver">
                            Mountain Time (MST)
                          </SelectItem>
                          <SelectItem value="America/Los_Angeles">
                            Pacific Time (PST)
                          </SelectItem>
                          <SelectItem value="Europe/London">
                            London (GMT)
                          </SelectItem>
                          <SelectItem value="Europe/Paris">
                            Paris (CET)
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">
                            Tokyo (JST)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {currentUser.type !== "client" && (
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={preferences.currency}
                          onValueChange={(value) =>
                            handlePreferenceChange("currency", value)
                          }
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="CAD">CAD (C$)</SelectItem>
                            <SelectItem value="AUD">AUD (A$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Date & Time
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Time Format</Label>
                      <Select
                        value={preferences.timeFormat}
                        onValueChange={(value) =>
                          handlePreferenceChange("timeFormat", value)
                        }
                      >
                        <SelectTrigger className="shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select
                        value={preferences.dateFormat}
                        onValueChange={(value) =>
                          handlePreferenceChange("dateFormat", value)
                        }
                      >
                        <SelectTrigger className="shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Week Starts On</Label>
                      <Select
                        value={preferences.weekStartsOn}
                        onValueChange={(value) =>
                          handlePreferenceChange("weekStartsOn", value)
                        }
                      >
                        <SelectTrigger className="shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-muted-foreground">
                      Update your account password regularly for security
                    </p>
                  </div>
                  <Button variant="outline" className="shadow-sm">
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security with 2FA
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        security.twoFactorEnabled ? "default" : "secondary"
                      }
                    >
                      {security.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Button
                      variant={
                        security.twoFactorEnabled ? "destructive" : "default"
                      }
                      onClick={() =>
                        handleSecurityChange(
                          "twoFactorEnabled",
                          !security.twoFactorEnabled,
                        )
                      }
                      className="shadow-sm"
                    >
                      {security.twoFactorEnabled ? "Disable" : "Enable"} 2FA
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">
                      Session Timeout
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Automatically log out after period of inactivity
                    </p>
                    <Select
                      value={security.sessionTimeout}
                      onValueChange={(value) =>
                        handleSecurityChange("sessionTimeout", value)
                      }
                    >
                      <SelectTrigger className="shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Login Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified of new login attempts
                      </p>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) =>
                        handleSecurityChange("loginAlerts", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          Booking Confirmations
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive emails when bookings are confirmed or updated
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailBookings}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            emailBookings: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-base">System Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about system maintenance and updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            emailUpdates: checked,
                          }))
                        }
                      />
                    </div>

                    {currentUser.type === "client" && (
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Marketing & Promotions
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Receive emails about new features and special offers
                          </p>
                        </div>
                        <Switch
                          checked={notifications.emailMarketing}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              emailMarketing: checked,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Push Notifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-base">Booking Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Push notifications for booking changes and reminders
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushBookings}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            pushBookings: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-base">General Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about facility news and updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            pushUpdates: checked,
                          }))
                        }
                      />
                    </div>

                    {currentUser.type === "client" && (
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <Label className="text-base">Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            Gentle reminders for upcoming appointments
                          </p>
                        </div>
                        <Switch
                          checked={notifications.pushReminders}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              pushReminders: checked,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    SMS Notifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-base">Emergency Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Critical alerts about pets or facility emergencies
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsEmergency}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            smsEmergency: checked,
                          }))
                        }
                      />
                    </div>

                    {currentUser.type === "client" && (
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Appointment Reminders
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            SMS reminders for upcoming appointments
                          </p>
                        </div>
                        <Switch
                          checked={notifications.smsReminders}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({
                              ...prev,
                              smsReminders: checked,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {currentUser.type === "client" && (
          <TabsContent value="pets" className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Pet Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your pets&apos; information and preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {currentUser.pets?.map((pet, index) => (
                    <Card key={index} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <PawPrint className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {pet.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {pet.type} • {pet.age} years old
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              View History
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <Button className="shadow-sm">
                    <PawPrint className="h-4 w-4 mr-2" />
                    Add New Pet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
