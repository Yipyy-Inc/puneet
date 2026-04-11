"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useCustomServices } from "@/hooks/use-custom-services";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  LayoutDashboard,
  CalendarDays,
  LogIn,
  DollarSign,
  ClipboardList,
  Settings,
  AlertTriangle,
} from "lucide-react";

export default function CustomServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const pathname = usePathname();
  const { getModuleBySlug, setModuleStatus } = useCustomServices();

  const serviceModule = getModuleBySlug(slug ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [disableReason, setDisableReason] = useState("");

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
  const isEnabled = serviceModule.status === "active";

  // Build tabs dynamically from module config
  const tabs = [
    {
      name: "Dashboard",
      href: basePath,
      icon: LayoutDashboard,
      always: true,
    },
    {
      name: "Bookings",
      href: `${basePath}/bookings`,
      icon: CalendarDays,
      show: serviceModule.calendar.enabled,
    },
    {
      name: "Check-In/Out",
      href: `${basePath}/check-in`,
      icon: LogIn,
      show: serviceModule.checkInOut.enabled,
    },
    {
      name: "Rates",
      href: `${basePath}/rates`,
      icon: DollarSign,
      always: true,
    },
    {
      name: "Tasks",
      href: `${basePath}/tasks`,
      icon: ClipboardList,
      show: serviceModule.staffAssignment.taskGeneration.length > 0,
    },
    {
      name: "Settings",
      href: `${basePath}/settings`,
      icon: Settings,
      always: true,
    },
  ].filter((t) => t.always || t.show);

  const handleToggleEnabled = (checked: boolean) => {
    setPendingEnabled(checked);
    setModalOpen(true);
  };

  const handleConfirmToggle = () => {
    if (pendingEnabled !== null) {
      const result = setModuleStatus(
        serviceModule.id,
        pendingEnabled ? "active" : "disabled",
        !pendingEnabled ? disableReason : undefined,
      );
      if (!result.ok) {
        toast.error(result.reason ?? "Unable to update module status");
        return;
      }
      toast.success(pendingEnabled ? "Service enabled" : "Service disabled");
    }
    setModalOpen(false);
    setPendingEnabled(null);
    setDisableReason("");
  };

  const handleCancelToggle = () => {
    setModalOpen(false);
    setPendingEnabled(null);
    setDisableReason("");
  };

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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Enabled</span>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
              />
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

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={pendingEnabled ? "confirmation" : "warning"}
        title={
          pendingEnabled
            ? `Enable ${serviceModule.name}`
            : `Disable ${serviceModule.name}`
        }
        description={
          pendingEnabled
            ? `Are you sure you want to enable ${serviceModule.name}? This will make the service available for booking.`
            : `Are you sure you want to disable ${serviceModule.name}? This will prevent new bookings and may affect existing operations.`
        }
        actions={{
          primary: {
            label: "Confirm",
            onClick: handleConfirmToggle,
            variant: pendingEnabled ? "default" : "destructive",
            disabled: !pendingEnabled && !disableReason.trim(),
          },
          secondary: {
            label: "Cancel",
            onClick: handleCancelToggle,
            variant: "outline",
          },
        }}
      >
        {!pendingEnabled && (
          <div className="space-y-2">
            <Label htmlFor="disable-reason">Reason for disabling</Label>
            <Textarea
              id="disable-reason"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder={`Please provide a reason for disabling ${serviceModule.name}...`}
              rows={3}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
