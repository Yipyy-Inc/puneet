"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Phone,
  Mail,
  Globe,
  User,
  Activity,
  FileText,
  Key,
  Puzzle,
  ChevronRight,
  Edit,
  Calendar,
  DollarSign,
  Users,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { MapPin } from "lucide-react";

interface OverviewTabProps {
  facility: {
    name: string;
    usersList: { person: { name: string; email: string }; role: string }[];
    clients: { status: string }[];
    locationsList: { name: string; address: string; services: string[] }[];
    contact?: { email?: string; phone?: string; website?: string };
    owner?: { name?: string; email?: string; phone?: string };
  };
  totalRevenue: number;
  activeClients: number;
  recentActivities: {
    id: number;
    type: string;
    title: string;
    description: string;
    time: string;
  }[];
  onNavigateToReports: () => void;
  onNavigateToModules: () => void;
  onNavigateToLogs: () => void;
}

export function OverviewTab({
  facility,
  totalRevenue,
  activeClients,
  recentActivities,
  onNavigateToReports,
  onNavigateToModules,
  onNavigateToLogs,
}: OverviewTabProps) {
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editableContact, setEditableContact] = useState({
    email: facility.contact?.email ?? "",
    phone: facility.contact?.phone ?? "",
    website: facility.contact?.website ?? "",
  });
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">("existing");
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [newOwner, setNewOwner] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleEditContact = () => {
    setEditableContact({
      email: facility.contact?.email ?? "",
      phone: facility.contact?.phone ?? "",
      website: facility.contact?.website ?? "",
    });
    setShowContactDialog(true);
  };

  const handleEditOwner = () => {
    setOwnerMode("existing");
    setSelectedOwnerId(null);
    setNewOwner({ name: "", email: "", phone: "" });
    setShowOwnerDialog(true);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "booking":
        return Calendar;
      case "payment":
        return DollarSign;
      case "user":
        return Users;
      case "client":
        return UserCheck;
      default:
        return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}K`}
          subtitle="Last 6 months"
          icon={DollarSign}
          iconBgStyle={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          }}
          trend={{ value: "+12%", isPositive: true }}
        />
        <StatCard
          title="Staff Members"
          value={facility.usersList.length}
          subtitle="Active users"
          icon={Users}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
        />
        <StatCard
          title="Active Clients"
          value={activeClients}
          subtitle={`of ${facility.clients.length} total`}
          icon={UserCheck}
          iconBgStyle={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          }}
          trend={{ value: "+8%", isPositive: true }}
        />
        <StatCard
          title="Locations"
          value={facility.locationsList.length}
          subtitle="Active branches"
          icon={MapPin}
          iconBgStyle={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          }}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Owner Info */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleEditContact}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">
                      {facility.contact?.email || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                    <Phone className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">
                      {facility.contact?.phone || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10">
                    <Globe className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium">
                      {facility.contact?.website || "Not provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner / Admin Information */}
            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner / Admin
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleEditOwner}>
                  <Edit className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    }}
                  >
                    {facility.owner?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {facility.owner?.name || "Not provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Facility Owner
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">
                      {facility.owner?.email || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10">
                    <Phone className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">
                      {facility.owner?.phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={onNavigateToReports}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Generate Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-xs">Send Notification</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                >
                  <Key className="h-5 w-5" />
                  <span className="text-xs">Reset Password</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={onNavigateToModules}
                >
                  <Puzzle className="h-5 w-5" />
                  <span className="text-xs">Manage Modules</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={onNavigateToLogs}
              >
                View All Activity
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
            <DialogDescription>
              Update the contact details for {facility.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="contact-email"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={editableContact.email}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="contact-phone"
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={editableContact.phone}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="contact-website"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="contact-website"
                type="url"
                placeholder="https://example.com"
                value={editableContact.website}
                onChange={(e) =>
                  setEditableContact((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContactDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowContactDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Owner Dialog */}
      <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
        <DialogContent className="min-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Facility Owner</DialogTitle>
            <DialogDescription>
              Transfer ownership of {facility.name} to an existing staff member
              or create a new owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={ownerMode === "existing" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setOwnerMode("existing")}
              >
                <Users className="h-4 w-4 mr-2" />
                Existing Member
              </Button>
              <Button
                variant={ownerMode === "new" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setOwnerMode("new")}
              >
                <User className="h-4 w-4 mr-2" />
                New Owner
              </Button>
            </div>

            {ownerMode === "existing" ? (
              <div className="space-y-3">
                <Label>Select a staff member to promote to owner</Label>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {facility.usersList.map((user, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                        selectedOwnerId === index
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted",
                      )}
                      onClick={() => setSelectedOwnerId(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm text-white"
                          style={{
                            background:
                              user.role === "Admin"
                                ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                                : user.role === "Manager"
                                  ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                                  : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                          }}
                        >
                          {user.person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.person.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.role}</Badge>
                    </div>
                  ))}
                </div>
                {facility.usersList.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff members available. Create a new owner instead.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="new-owner-name"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="new-owner-name"
                    placeholder="John Doe"
                    value={newOwner.name}
                    onChange={(e) =>
                      setNewOwner((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="new-owner-email"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="new-owner-email"
                    type="email"
                    placeholder="john@example.com"
                    value={newOwner.email}
                    onChange={(e) =>
                      setNewOwner((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="new-owner-phone"
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    id="new-owner-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={newOwner.phone}
                    onChange={(e) =>
                      setNewOwner((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Changing the owner will transfer full administrative control
                  of this facility. The new owner will receive an email
                  notification.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOwnerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowOwnerDialog(false)}
              disabled={
                ownerMode === "existing"
                  ? selectedOwnerId === null
                  : !newOwner.name || !newOwner.email
              }
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
