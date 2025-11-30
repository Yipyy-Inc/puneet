import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building,
  Building2,
  Users,
  UserCheck,
  MapPin,
  Calendar,
  Clock,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  TrendingUp,
  Scissors,
  Dog,
  Home,
  Globe,
  User,
  PawPrint,
} from "lucide-react";
import { facilities } from "@/data/facilities";

interface FacilityModalProps {
  facility: (typeof facilities)[number];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgStyle,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBgStyle: React.CSSProperties;
  trend?: { value: string; isPositive: boolean };
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${
                    trend.isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 mr-0.5 ${!trend.isPositive && "rotate-180"}`}
                  />
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-300 group-hover:scale-110"
            style={iconBgStyle}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FacilityModal({ facility }: FacilityModalProps) {
  const activeClients = facility.clients.filter(
    (c) => c.status === "active",
  ).length;
  const services = facility.locationsList.flatMap((l) => l.services);
  const uniqueServices = [...new Set(services)];

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "grooming":
        return Scissors;
      case "daycare":
        return Dog;
      case "boarding":
        return Home;
      default:
        return Building;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              }}
            >
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{facility.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge type="status" value={facility.status} showIcon />
                <StatusBadge type="plan" value={facility.plan} showIcon />
              </div>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/facilities/${facility.id}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Full Details
          </Button>
        </Link>
      </div>

      {/* Services */}
      {uniqueServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueServices.map((service) => {
            const Icon = getServiceIcon(service);
            return (
              <Badge
                key={service}
                variant="secondary"
                className="capitalize py-1.5 px-3"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {service}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Staff Members"
          value={facility.usersList.length}
          subtitle={`of ${facility.limits?.staff === -1 ? "∞" : (facility.limits?.staff ?? "N/A")} limit`}
          icon={Users}
          iconBgStyle={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          }}
        />
        <StatCard
          title="Active Clients"
          value={activeClients}
          subtitle={`of ${facility.limits?.clients === -1 ? "∞" : (facility.limits?.clients ?? "N/A")} limit`}
          icon={UserCheck}
          iconBgStyle={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          }}
        />
        <StatCard
          title="Locations"
          value={facility.locationsList.length}
          subtitle={`of ${facility.limits?.locations === -1 ? "∞" : (facility.limits?.locations ?? "N/A")} limit`}
          icon={MapPin}
          iconBgStyle={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          }}
        />
        <StatCard
          title="Services"
          value={uniqueServices.length}
          subtitle="Offered"
          icon={Briefcase}
          iconBgStyle={{
            background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
          }}
        />
      </div>

      {/* Plan Limits */}
      {facility.limits && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Plan Limits</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {facility.limits.locations === -1
                    ? "∞"
                    : facility.limits.locations}
                </p>
                <p className="text-[10px] text-muted-foreground">Locations</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {facility.limits.staff === -1 ? "∞" : facility.limits.staff}
                </p>
                <p className="text-[10px] text-muted-foreground">Staff</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <UserCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {facility.limits.clients === -1
                    ? "∞"
                    : facility.limits.clients}
                </p>
                <p className="text-[10px] text-muted-foreground">Clients</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <PawPrint className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {facility.limits.pets === -1 ? "∞" : facility.limits.pets}
                </p>
                <p className="text-[10px] text-muted-foreground">Pets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact & Owner Info */}
      <div className="grid grid-cols-2 gap-3">
        {/* Contact Information */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs truncate">
                {facility.contact?.email || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                {facility.contact?.phone || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs truncate">
                {facility.contact?.website || "Not provided"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Owner / Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white"
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
              <span className="text-xs font-medium">
                {facility.owner?.name || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs truncate">
                {facility.owner?.email || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                {facility.owner?.phone || "Not provided"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Info */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="font-semibold">{facility.dayJoined}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription Ends</p>
              <p className="font-semibold">
                {facility.subscriptionEnd || "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto bg-muted/50">
          <TabsTrigger
            value="locations"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Locations</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {facility.locationsList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {facility.clients.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="gap-2 data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {facility.usersList.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-4">
          <div className="space-y-3">
            {facility.locationsList.map((location, index: number) => (
              <Card
                key={index}
                className="border-0 shadow-card hover:shadow-elevated transition-all duration-200 group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl transition-transform group-hover:scale-110"
                      style={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                      }}
                    >
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{location.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {location.address}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {location.services.map((service: string) => (
                          <Badge
                            key={service}
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <div className="space-y-3">
            {facility.clients.map((client, index: number) => (
              <Card
                key={index}
                className="border-0 shadow-card hover:shadow-elevated transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-semibold text-sm">
                        {client.person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold">{client.person.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.person.email}
                          </span>
                          {client.person.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.person.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        client.status === "active" ? "default" : "secondary"
                      }
                      className={
                        client.status === "active"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {client.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="space-y-3">
            {facility.usersList.map((user, index: number) => (
              <Card
                key={index}
                className="border-0 shadow-card hover:shadow-elevated transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
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
                        <h4 className="font-semibold">{user.person.name}</h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.person.email}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={user.role === "Admin" ? "default" : "secondary"}
                      className={
                        user.role === "Admin"
                          ? "bg-primary"
                          : user.role === "Manager"
                            ? "bg-info text-info-foreground"
                            : ""
                      }
                    >
                      {user.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
