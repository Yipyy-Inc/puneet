"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCustomServices } from "@/hooks/use-custom-services";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  DollarSign,
  Settings,
  AlertTriangle,
  ClipboardList,
  LogIn,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const pathname = usePathname();
  const { getModuleBySlug, setModuleStatus, isPending } = useCustomServices();

  const serviceModule = getModuleBySlug(slug ?? "");

  // The facility's list arrives from its settings; until then this is not
  // "not found", it is loading (§5s).
  if (!serviceModule && isPending) {
    return <Skeleton className="m-6 h-48 rounded-2xl" />;
  }

  if (!serviceModule) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-muted-foreground size-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Service Not Found</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            No custom service module exists for slug &ldquo;{slug}&rdquo;.
          </p>
        </div>
        <Link
          href="/facility/dashboard/services"
          className="text-primary text-sm hover:underline"
        >
          Back to Services
        </Link>
      </div>
    );
  }

  const basePath = `/facility/dashboard/services/custom/${serviceModule.slug}`;

  const tabs = [
    { name: "Check-In", href: `${basePath}/check-in`, icon: LogIn },
    { name: "Rates", href: `${basePath}/rates`, icon: DollarSign },
    { name: "Tasks", href: `${basePath}/tasks`, icon: ClipboardList },
    { name: "Settings", href: `${basePath}/settings`, icon: Settings },
  ];

  // Status badge
  const statusVariant =
    serviceModule.status === "active"
      ? "default"
      : serviceModule.status === "disabled"
        ? "destructive"
        : "secondary";

  const statusLabel =
    serviceModule.status === "active"
      ? "Enabled"
      : serviceModule.status === "disabled"
        ? "Disabled"
        : serviceModule.status === "draft"
          ? "Draft"
          : "Archived";

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-10 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-teal-500">
                <DynamicIcon
                  name={serviceModule.icon}
                  className="size-5 text-white"
                />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  {serviceModule.name}
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  {serviceModule.description}
                </p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== basePath && pathname.startsWith(tab.href));
            const TabIcon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors`,
                  "hover:bg-muted/50",
                  isActive
                    ? "border-primary bg-background text-primary border-b-2"
                    : "text-muted-foreground",
                )}
              >
                <TabIcon className="size-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
