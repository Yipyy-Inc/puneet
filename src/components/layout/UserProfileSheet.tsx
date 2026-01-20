"use client";

import { useState, useEffect, useTransition } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  User,
  Settings,
  ArrowRightLeft,
} from "lucide-react";
import { getUserRole, setUserRole, type UserRole } from "@/lib/role-utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  timestamp: string;
  bookingId?: string; // For booking-related notifications
  link?: string; // Link to navigate to
}

const getInitialNotifications = (isSuperAdmin: boolean): Notification[] => {
  if (isSuperAdmin) {
    return [
      {
        id: "1",
        title: "New Facility Request",
        message: "HealthFirst Clinic has requested to join the platform",
        type: "info",
        read: false,
        timestamp: "2 min ago",
        link: "/dashboard/facilities",
      },
      {
        id: "2",
        title: "Subscription Renewed",
        message: "FitLife Gym subscription has been renewed",
        type: "success",
        read: false,
        timestamp: "15 min ago",
        link: "/dashboard/subscriptions",
      },
      {
        id: "3",
        title: "SLA Warning",
        message: "Ticket #TKT-003 is approaching SLA deadline",
        type: "warning",
        read: false,
        timestamp: "1 hour ago",
        link: "/dashboard/support",
      },
      {
        id: "4",
        title: "System Update Complete",
        message: "Platform has been updated to version 2.1.0",
        type: "success",
        read: true,
        timestamp: "3 hours ago",
      },
    ];
  } else {
    // Facility Admin notifications
    return [
      {
        id: "1",
        title: "New Booking Request",
        message: "Sarah Johnson requested an appointment for her dog Max",
        type: "info",
        read: false,
        timestamp: "5 min ago",
        link: "/facility/dashboard/bookings?highlight=19",
      },
      {
        id: "2",
        title: "Staff Schedule Updated",
        message: "Dr. Smith's schedule has been updated for tomorrow",
        type: "success",
        read: false,
        timestamp: "30 min ago",
        link: "/facility/dashboard/staff",
      },
      {
        id: "3",
        title: "Inventory Alert",
        message: "Dog food inventory is running low (5 items remaining)",
        type: "warning",
        read: false,
        timestamp: "1 hour ago",
        link: "/facility/dashboard/inventory",
      },
      {
        id: "4",
        title: "Customer Feedback",
        message: "New 5-star review from Happy Paws customer",
        type: "success",
        read: true,
        timestamp: "2 hours ago",
        link: "/facility/dashboard/reviews",
      },
    ];
  }
};

export function UserProfileSheet({
  showNotifications = true,
}: {
  showNotifications?: boolean;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const currentRole = getUserRole();
  const isSuperAdmin = !currentRole || currentRole === "super_admin";
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update notifications when role changes
  useEffect(() => {
    setNotifications(getInitialNotifications(isSuperAdmin));
  }, [isSuperAdmin]);

  const switchRole = (role: UserRole) => {
    startTransition(() => {
      setUserRole(role);
      window.location.reload();
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    setIsSheetOpen(false); // Close the sheet
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const handleLogout = () => {
    // Implement logout logic here
    console.log("Logout clicked");
  };

  return (
    <div className="flex items-center gap-3">
      {/* Notification Bell Icon */}
      {showNotifications && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-muted transition-colors relative"
          onClick={() => setIsSheetOpen(true)}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                SA
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                SA
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">Super Admin</span>
              <span className="text-xs text-muted-foreground">
                admin@yipyy.com
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              System Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
            Context Switcher
          </DropdownMenuLabel>
          {isSuperAdmin && (
            <DropdownMenuItem
              onClick={() => switchRole("facility_admin")}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Switch to Facility Admin
            </DropdownMenuItem>
          )}
          {currentRole === "facility_admin" && (
            <DropdownMenuItem
              onClick={() => switchRole("super_admin")}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Switch to Super Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications Sheet */}
      {showNotifications && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>

            {/* Notifications Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {unreadCount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.link || "#"}
                        onClick={() => handleNotificationClick(notification)}
                        className={`group block items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                          !notification.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
