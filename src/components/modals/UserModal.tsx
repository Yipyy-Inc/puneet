import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { InfoCard } from "@/components/ui/DateCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Building,
  Mail,
  Clock,
  Phone,
  CalendarDays,
  Shield,
  User,
  Key,
} from "lucide-react";
import { users } from "@/data/users";

interface UserModalProps {
  user: (typeof users)[number];
}

export function UserModal({ user }: UserModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    {
      id: "overview",
      name: "Overview",
      icon: User,
    },
    {
      id: "contact",
      name: "Contact",
      icon: Mail,
    },
    {
      id: "permissions",
      name: "Permissions",
      icon: Key,
    },
  ];

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <nav className="flex gap-1 overflow-x-auto px-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors`,
                    "hover:bg-muted/50",
                    isActive
                      ? "border-primary bg-background text-primary border-b-2"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
        </TabsContent>

        <TabsContent value="contact" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="from-card to-muted/20 border-none bg-linear-to-br shadow-sm transition-all duration-200 hover:shadow-md">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="bg-info/10 text-info rounded-lg p-1.5">
                    <Building className="size-4" />
                  </div>
                  Facility
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="bg-background/60 rounded-lg p-3 backdrop-blur-sm">
                  <div className="text-base font-semibold">{user.facility}</div>
                  <p className="text-muted-foreground mt-1 text-xs">Works at</p>
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
        </TabsContent>

        <TabsContent value="permissions" className="mt-6 space-y-6">
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
        </TabsContent>
      </Tabs>
    </DetailsModal>
  );
}
