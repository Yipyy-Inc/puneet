"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useCustomServices } from "@/hooks/use-custom-services";
import { resolveIcon } from "@/lib/service-registry";
import { getGradientStyle, getCategoryMeta } from "@/data/custom-services";
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

  const module = getModuleBySlug(slug ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [disableReason, setDisableReason] = useState("");

  if (!module) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Service Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No custom service module exists for slug &ldquo;{slug}&rdquo;.
          </p>
        </div>
        <Link
          href="/facility/dashboard/services"
          className="text-sm text-primary hover:underline"
        >
          Back to Services
        </Link>
      </div>
    );
  }

  const catMeta = getCategoryMeta(module.category);
  const basePath = `/facility/dashboard/services/custom/${module.slug}`;
  const isEnabled = module.status === "active";

  const Icon = resolveIcon(module.icon);

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
      show: module.calendar.enabled,
    },
    {
      name: "Check-In/Out",
      href: `${basePath}/check-in`,
      icon: LogIn,
      show: module.checkInOut.enabled,
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
      show: module.staffAssignment.taskGeneration.length > 0,
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
      setModuleStatus(
        module.id,
        pendingEnabled ? "active" : "disabled",
        !pendingEnabled ? disableReason : undefined,
      );
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
    module.status === "active"
      ? "default"
      : module.status === "disabled"
        ? "destructive"
        : "secondary";

  const statusLabel =
    module.status === "active"
      ? "Enabled"
      : module.status === "disabled"
        ? "Disabled"
        : module.status === "draft"
          ? "Draft"
          : "Archived";

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-16 z-10 border-b bg-background">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg"
                style={{
                  ...getGradientStyle(module.iconColor, module.iconColorTo),
                }}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 truncate">
                  {module.name}
                  <Badge variant={statusVariant} className="shrink-0">{statusLabel}</Badge>
                </h1>
                <p className="text-sm text-muted-foreground truncate flex items-center">
                  {catMeta && (
                    <Badge className={cn("text-[10px] mr-2 shrink-0", catMeta.badgeClass)}>
                      {catMeta.name}
                    </Badge>
                  )}
                  {module.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-sm font-medium">Enabled</span>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          </div>
        </div>

        <nav aria-label="Service navigation" className="px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none">
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
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? cn("bg-background border-b-2 border-primary", catMeta?.textClass ?? "text-primary")
                    : "text-muted-foreground",
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 p-4 sm:p-6">{children}</div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={pendingEnabled ? "confirmation" : "warning"}
        title={
          pendingEnabled
            ? `Enable ${module.name}`
            : `Disable ${module.name}`
        }
        description={
          pendingEnabled
            ? `Are you sure you want to enable ${module.name}? This will make the service available for booking.`
            : `Are you sure you want to disable ${module.name}? This will prevent new bookings and may affect existing operations.`
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
              placeholder={`Please provide a reason for disabling ${module.name}...`}
              rows={3}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
