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
} from "lucide-react";
import { users } from "@/data/users";

interface UserModalProps {
  user: (typeof users)[number];
}

export function UserModal({ user }: UserModalProps) {
  return (
    <DetailsModal
      title={user.name}
      badges={[
        <StatusBadge key="role" type="role" value={user.role} showIcon />,
        <StatusBadge key="status" type="status" value={user.status} showIcon />,
      ]}
      linkHref={`/dashboard/users/${user.id}`}
      linkText="View Full Profile"
    >
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <InfoCard
            title="Last Login"
            value={user.lastLogin}
            subtitle="Last activity"
            icon={Clock}
            variant="info"
          />
          <InfoCard
            title="Hire Date"
            value={user.hireDate}
            subtitle="Joined company"
            icon={CalendarDays}
            variant="success"
          />
          <InfoCard
            title="Role"
            value={user.role}
            subtitle="Position"
            icon={Shield}
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
                Facility
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="p-3 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="text-base font-semibold">{user.facility}</div>
                <p className="text-xs text-muted-foreground mt-1">Works at</p>
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
      </div>
    </DetailsModal>
  );
}
