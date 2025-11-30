"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { InfoCard } from "@/components/ui/DateCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Building,
  Mail,
  Clock,
  Phone,
  CalendarDays,
  Shield,
  Key,
  MapPin,
  Monitor,
  Globe,
} from "lucide-react";
import {
  AdminUser,
  roleDisplayNames,
  accessLevelDescriptions,
} from "@/data/admin-users";

interface AdminUserModalProps {
  user: AdminUser;
}

export function AdminUserModal({ user }: AdminUserModalProps) {
  return (
    <DetailsModal
      title={user.name}
      badges={[
        <StatusBadge key="role" type="adminRole" value={user.role} showIcon />,
        <StatusBadge key="status" type="status" value={user.status} showIcon />,
      ]}
      linkHref={`/dashboard/user-management/${user.id}`}
      linkText="View Full Profile"
    >
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <InfoCard
            title="Last Login"
            value={new Date(user.lastLogin).toLocaleDateString()}
            subtitle="Last activity"
            icon={Clock}
            variant="info"
          />
          <InfoCard
            title="Created"
            value={user.createdAt}
            subtitle="Account created"
            icon={CalendarDays}
            variant="success"
          />
          <InfoCard
            title="Access Level"
            value={user.accessLevel.replace("_", " ").toUpperCase()}
            subtitle={
              accessLevelDescriptions[user.accessLevel].slice(0, 30) + "..."
            }
            icon={Key}
            variant="primary"
          />
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-info/10 text-info">
                  <Building className="h-4 w-4" />
                </div>
                Department & Role
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <div className="p-3 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="text-base font-semibold">{user.department}</div>
                <p className="text-xs text-muted-foreground mt-1">Department</p>
              </div>
              <div className="p-3 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="text-base font-semibold">
                  {roleDisplayNames[user.role]}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Role</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{user.phone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                <MapPin className="h-4 w-4" />
              </div>
              Responsibility Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {user.responsibilityAreas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="text-xs hover:bg-purple-500 hover:text-white transition-colors cursor-default"
                >
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                <Shield className="h-4 w-4" />
              </div>
              User Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <Badge
                  key={permission}
                  variant="secondary"
                  className="capitalize text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
                >
                  {permission.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
                <Monitor className="h-4 w-4" />
              </div>
              Recent Login History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {user.loginHistory.slice(0, 3).map((login, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-background/60 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        {login.device}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {login.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {login.ip}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(login.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DetailsModal>
  );
}
