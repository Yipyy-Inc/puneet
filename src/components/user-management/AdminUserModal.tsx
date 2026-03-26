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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <div className="bg-info/10 text-info rounded-lg p-1.5">
                  <Building className="size-4" />
                </div>
                Department & Role
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5">
              <div className="bg-background/60 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-base font-semibold">{user.department}</div>
                <p className="text-muted-foreground mt-1 text-xs">Department</p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-base font-semibold">
                  {roleDisplayNames[user.role]}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">Role</p>
              </div>
            </CardContent>
          </Card>

          <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <div className="bg-primary/10 text-primary rounded-lg p-1.5">
                  <Mail className="size-4" />
                </div>
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              <div className="bg-background/60 flex items-center gap-3 rounded-lg p-2.5 backdrop-blur-sm">
                <div className="bg-muted rounded-lg p-2">
                  <Mail className="text-muted-foreground size-4" />
                </div>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="bg-background/60 flex items-center gap-3 rounded-lg p-2.5 backdrop-blur-sm">
                <div className="bg-muted rounded-lg p-2">
                  <Phone className="text-muted-foreground size-4" />
                </div>
                <span className="text-sm font-medium">{user.phone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-500">
                <MapPin className="size-4" />
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
                  className="cursor-default text-xs transition-colors hover:bg-purple-500 hover:text-white"
                >
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="bg-warning/10 text-warning rounded-lg p-1.5">
                <Shield className="size-4" />
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
                  className="hover:bg-primary hover:text-primary-foreground cursor-default text-xs capitalize transition-colors"
                >
                  {permission.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="rounded-lg bg-green-500/10 p-1.5 text-green-500">
                <Monitor className="size-4" />
              </div>
              Recent Login History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {user.loginHistory.slice(0, 3).map((login, index) => (
                <div
                  key={index}
                  className="bg-background/60 flex items-center justify-between rounded-lg p-2.5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-lg p-2">
                      <Globe className="text-muted-foreground size-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        {login.device}
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {login.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-xs">
                      {login.ip}
                    </span>
                    <p className="text-muted-foreground text-xs">
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
