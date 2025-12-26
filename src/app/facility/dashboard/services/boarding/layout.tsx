"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useSettings } from "@/hooks/use-settings";
import {
  Bed,
  LogIn,
  DollarSign,
  ClipboardList,
  CreditCard,
  Settings,
} from "lucide-react";

const tabs = [
  {
    name: "Dashboard",
    href: "/facility/dashboard/services/boarding",
    icon: Bed,
  },
  {
    name: "Check-In/Out",
    href: "/facility/dashboard/services/boarding/check-in",
    icon: LogIn,
  },
  {
    name: "Rates",
    href: "/facility/dashboard/services/boarding/rates",
    icon: DollarSign,
  },
  {
    name: "Care Sheets",
    href: "/facility/dashboard/services/boarding/care-sheets",
    icon: ClipboardList,
  },
  {
    name: "Kennel Cards",
    href: "/facility/dashboard/services/boarding/kennel-cards",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/boarding/settings#evaluation",
    icon: Settings,
  },
];

export default function BoardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { boarding, updateBoarding } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const handleToggleEnabled = (checked: boolean) => {
    setPendingEnabled(checked);
    setModalOpen(true);
  };

  const handleConfirmToggle = () => {
    if (pendingEnabled !== null) {
      updateBoarding({
        ...boarding,
        status: {
          ...boarding.status,
          disabled: !pendingEnabled,
          reason: !pendingEnabled ? disableReason : undefined,
        },
      });
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-16 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-purple-500">
                <Bed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  Boarding Module
                  <Badge
                    variant={
                      boarding.status.disabled ? "destructive" : "default"
                    }
                  >
                    {boarding.status.disabled ? "Disabled" : "Enabled"}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage boarding guests, rates, care sheets, and kennel cards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Enabled</span>
              <Switch
                checked={!boarding.status.disabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          </div>
        </div>
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/boarding" &&
                pathname.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? "bg-background border-b-2 border-primary text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
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
          pendingEnabled ? "Enable Boarding Module" : "Disable Boarding Module"
        }
        description={
          pendingEnabled
            ? "Are you sure you want to enable the boarding module? This will make boarding services available for booking."
            : "Are you sure you want to disable the boarding module? This will prevent new boarding bookings and may affect existing operations."
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
              placeholder="Please provide a reason for disabling the boarding module..."
              rows={3}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
