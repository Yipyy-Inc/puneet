"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Building, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { locationStyles } from "@/lib/hq/location-styles";
import { useLocationContext } from "@/hooks/use-location-context";
import { OverviewTab } from "@/components/hq/locations/OverviewTab";
import { ServicesPricingTab } from "@/components/hq/locations/ServicesPricingTab";
import { StaffTab } from "@/components/hq/locations/StaffTab";
import { SettingsTab } from "@/components/hq/locations/SettingsTab";

interface Props {
  location: Location;
}

export function LocationDetailView({ location }: Props) {
  const router = useRouter();
  const { setLocation } = useLocationContext();
  const s = locationStyles(location);

  function goToDashboard() {
    setLocation(location.id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facility/hq/locations">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white",
                s.bg,
              )}
            >
              {location.shortCode}
            </span>
            <div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <Link
                  href="/facility/hq/locations"
                  className="hover:text-foreground transition-colors"
                >
                  Locations
                </Link>
                <ChevronRight className="size-3" />
                <span>{location.shortCode}</span>
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Building className="text-muted-foreground size-5" />
                {location.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {location.address}, {location.city}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={goToDashboard} className="gap-1.5">
          Go to Dashboard
          <ArrowUpRight className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services &amp; Pricing</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab location={location} />
        </TabsContent>
        <TabsContent value="services" className="mt-5">
          <ServicesPricingTab location={location} />
        </TabsContent>
        <TabsContent value="staff" className="mt-5">
          <StaffTab location={location} />
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <SettingsTab location={location} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
