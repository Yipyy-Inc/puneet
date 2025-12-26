"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useSettings } from "@/hooks/use-settings";
import { facilities } from "@/data/facilities";
import { clients as initialClients } from "@/data/clients";
import { NewBooking as BookingData } from "@/lib/types";
import { Client } from "@/lib/types";
import {
  Sun,
  LogIn,
  DollarSign,
  Package,
  FileText,
  Settings,
  Plus,
  Home,
} from "lucide-react";

const tabs = [
  {
    name: "Dashboard",
    href: "/facility/dashboard/services/daycare",
    icon: Sun,
  },
  {
    name: "Check-In/Out",
    href: "/facility/dashboard/services/daycare/check-in",
    icon: LogIn,
  },
  {
    name: "Rates",
    href: "/facility/dashboard/services/daycare/rates",
    icon: DollarSign,
  },
  {
    name: "Packages",
    href: "/facility/dashboard/services/daycare/packages",
    icon: Package,
  },
  {
    name: "Rooms",
    href: "/facility/dashboard/services/daycare/rooms",
    icon: Home,
  },
  {
    name: "Report Cards",
    href: "/facility/dashboard/services/daycare/report-cards",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/daycare/settings",
    icon: Settings,
  },
];

export default function DaycareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { openBookingModal } = useBookingModal();
  const { daycare, updateDaycare } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [disableReason, setDisableReason] = useState("");

  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const clients = initialClients as Client[];

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const handleCreateBooking = (bookingData: BookingData) => {
    console.log("Booking created:", bookingData);
    // TODO: Handle booking creation, perhaps redirect to bookings page
  };

  const handleToggleEnabled = (checked: boolean) => {
    setPendingEnabled(checked);
    setModalOpen(true);
  };

  const handleConfirmToggle = () => {
    if (pendingEnabled !== null) {
      updateDaycare({
        ...daycare,
        status: {
          ...daycare.status,
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
      <div className="sticky top-16 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-amber-500 to-orange-500">
                <Sun className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  Daycare Module
                  <Badge
                    variant={
                      daycare.status.disabled ? "destructive" : "default"
                    }
                  >
                    {daycare.status.disabled ? "Disabled" : "Enabled"}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage daycare operations, check-ins, rates, and report cards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enabled</span>
                <Switch
                  checked={!daycare.status.disabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>
              <Button
                onClick={() =>
                  openBookingModal({
                    clients: clients.filter(
                      (c) => c.facility === facility.name,
                    ),
                    facilityId: facilityId,
                    facilityName: facility.name,
                    preSelectedService: "daycare",
                    onCreateBooking: handleCreateBooking,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Book
              </Button>
            </div>
          </div>
        </div>
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/daycare" &&
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
          pendingEnabled ? "Enable Daycare Module" : "Disable Daycare Module"
        }
        description={
          pendingEnabled
            ? "Are you sure you want to enable the daycare module? This will make daycare services available for booking."
            : "Are you sure you want to disable the daycare module? This will prevent new daycare bookings and may affect existing operations."
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
              placeholder="Please provide a reason for disabling the daycare module..."
              rows={3}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
