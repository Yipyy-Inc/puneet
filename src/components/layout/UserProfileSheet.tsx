"use client";

import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
import { useState, useEffect, useTransition } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  Building2,
  Shield,
  FileSignature,
  Receipt,
  CreditCard,
  Download,
  LifeBuoy,
  MapPin,
  Globe,
  Check,
} from "lucide-react";
import { useUiText } from "@/hooks/use-ui-text";
import { useLocationContext } from "@/hooks/use-location-context";
import { openSupportDrawer } from "@/lib/support-drawer-store";
import { cn } from "@/lib/utils";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// Role → avatar tint for quick visual ID (spec Table 24).
//
// Only `super_admin` is reachable today: the finer roles were keyed off the
// `user_role` cookie, and nothing writes that any more. The rest are kept
// because the map is what a session-derived facility role would plug into, and
// deleting them would make that a bigger change than it needs to be.
const ROLE_AVATAR_COLOR: Record<string, string> = {
  super_admin: "bg-slate-700",
  facility_admin: "bg-indigo-600",
  owner: "bg-indigo-600",
  manager: "bg-blue-600",
  groomer: "bg-pink-600",
  trainer: "bg-emerald-600",
  receptionist: "bg-amber-600",
};

function roleAvatarColor(role: string | null | undefined): string {
  return (role && ROLE_AVATAR_COLOR[role]) || "bg-primary";
}

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

/**
 * Who is signed in, resolved on the server and handed down.
 *
 * Passed as a prop rather than read here because this is a client component and
 * the answer lives in the session. Every layout that renders this already has a
 * `Viewer` — see src/lib/auth/viewer.ts — so nothing new is fetched.
 */
export interface ProfileViewer {
  name: string | null;
  email: string | null;
  /** True only for a real platform membership, never for an absent cookie. */
  isPlatformAdmin: boolean;
  /**
   * May this person act on the FACILITY'S OWN account — its subscription, its
   * payment method, its data export, its Yipyy agreements?
   *
   * The menu group below used to appear when the `user_role` cookie said
   * "facility_admin", while the pages it linked to were guarded by
   * `canManageFacilityAccount` reading the session. Two different answers to
   * one question, and the browser could change the first. This is that same
   * function's answer, computed on the server, so the menu and the gate agree.
   */
  canManageAccount: boolean;
}

function initialsFor(viewer: ProfileViewer): string {
  const source = viewer.name?.trim() || viewer.email?.trim() || "";
  if (!source) return "?";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserProfileSheet({
  showNotifications = true,
  viewer,
}: {
  showNotifications?: boolean;
  viewer: ProfileViewer;
}) {
  const settingsPath = useSettingsHref();
  const signOutEverywhere = useSignOutEverywhere();
  const { t } = useUiText();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ── THIS USED TO BE `!currentRole || currentRole === "super_admin"` ──────
  //
  // An ABSENT cookie meant super admin — the same "absent means allow" shape as
  // the facility_role gate that opened the subscription and the data export to
  // every member. Cosmetic here, since the portal gates stopped reading cookies
  // entirely: it decided which notifications and which switcher items were
  // drawn, so a customer whose cookie had never been set was shown the
  // platform-admin menu.
  //
  // It comes from the session now, which is also the only thing RLS believes.
  const isSuperAdmin = viewer.isPlatformAdmin;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Safe hook — returns FALLBACK (isMultiLocation=false) when there is no
  // LocationContextProvider (e.g. the super-admin portal), so this never throws.
  const {
    isMultiLocation,
    isHQView,
    currentLocation,
    locations,
    setHQView,
    setLocation,
  } = useLocationContext();
  // The tint used to come from the `user_role` cookie. Nothing writes that
  // cookie any more — /facility/set-role, the page whose two buttons wrote it,
  // is gone — so the read had become "always null, always the default tint" for
  // everyone. It answers from the session now, which is the only identity left.
  const avatarBg = roleAvatarColor(
    viewer.isPlatformAdmin ? "super_admin" : null,
  );
  const initials = initialsFor(viewer);

  // Update notifications when role changes
  useEffect(() => {
    setNotifications(getInitialNotifications(isSuperAdmin));
  }, [isSuperAdmin]);

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
        return <CheckCircle className="text-success size-4" />;
      case "warning":
        return <AlertCircle className="text-warning size-4" />;
      default:
        return <Info className="text-info size-4" />;
    }
  };

  const handleLogout = () => {
    void signOutEverywhere();
  };

  return (
    <div className="flex items-center gap-3">
      {/* Notification Bell Icon */}
      {showNotifications && (
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted relative size-9 rounded-xl transition-colors"
          onClick={() => setIsSheetOpen(true)}
        >
          <Bell className="text-muted-foreground size-5" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-xs font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* An icon-only trigger with no accessible name: a screen reader
              announced it as "button". Named for the same reason the initials
              inside it are now the person's own — this is the control that says
              who you are signed in as. */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account menu"
            className="size-9 rounded-full"
          >
            <Avatar className="size-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback
                className={cn("text-sm font-medium text-white", avatarBg)}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage src="" alt="User" />
              <AvatarFallback
                className={cn("text-sm font-medium text-white", avatarBg)}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {viewer.name ?? viewer.email ?? t("Signed in")}
              </span>
              {viewer.email && (
                <span className="text-muted-foreground truncate text-xs">
                  {viewer.email}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center gap-2">
              <User className="size-4" />
              {t("Profile Settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={settingsPath("notifications")}
              className="flex items-center gap-2"
            >
              <Bell className="size-4" />
              {t("Notification Preferences")}
            </Link>
          </DropdownMenuItem>
          {isMultiLocation && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <MapPin className="size-4" />
                {t("Switch Location")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem
                  onClick={setHQView}
                  className="flex items-center gap-2"
                >
                  <Globe className="size-4 text-sky-500" />
                  {t("All Locations (HQ)")}
                  {isHQView && (
                    <Check className="text-primary ml-auto size-3.5" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {locations.map((loc) => (
                  <DropdownMenuItem
                    key={loc.id}
                    onClick={() => setLocation(loc.id)}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="text-muted-foreground size-4" />
                    <span className="truncate">{loc.name}</span>
                    {!isHQView && currentLocation?.id === loc.id && (
                      <Check className="text-primary ml-auto size-3.5" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem
            onClick={() => openSupportDrawer("faq")}
            className="flex items-center gap-2"
          >
            <LifeBuoy className="size-4" />
            {t("Help & Support")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2"
            >
              <Settings className="size-4" />
              {t("System Settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {viewer.canManageAccount && (
            <>
              <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs">
                {t("Owner Account")}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href="/facility/documents"
                  className="flex items-center gap-2"
                >
                  <FileSignature className="size-4" />
                  {t("Yipyy Agreements")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/facility/account/subscription"
                  className="flex items-center gap-2"
                >
                  <Receipt className="size-4" />
                  {t("My Subscription")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/facility/account/payment-method"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="size-4" />
                  {t("Payment Method")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/facility/account/export"
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  {t("Export Data")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={settingsPath("my-profile")}
                  className="flex items-center gap-2"
                >
                  <Settings className="size-4" />
                  {t("Account Settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {/* ── VIEW AS, AND ONLY FOR SOMEBODY WHO REALLY MAY ──────────────
              This was a "Context Switcher" that wrote the `user_role` cookie
              and reloaded. The cookie decides no access any more — the gates
              read the session — so switching "to Facility Admin" only worked
              because a platform admin is admitted to /facility anyway, and the
              facility-admin arm offered "Switch to Super Admin", a button that
              set a cookie claiming a role its owner did not have and landed
              them on a portal that then refused them.

              These are plain links now, shown only to a platform admin, and
              each one goes somewhere their own session already opens.

              The EMPLOYEE PORTALS list that sat below is gone. It read
              `src/data/facility-staff` — a fixture — and let anyone seat
              themselves as any of eight staff members by writing
              `employee_staff_id`. The employee shell takes its identity from
              the session now and only falls back to a picker for somebody with
              no staff record at all, which is what /employee/select is for. */}
          {isSuperAdmin && (
            <>
              <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs">
                {t("View as")}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href="/facility/dashboard"
                  className="flex items-center gap-2"
                >
                  <Building2 className="size-4" />
                  {t("Facility portal")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/customer/dashboard"
                  className="flex items-center gap-2"
                >
                  <User className="size-4" />
                  {t("Customer portal")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/employee" className="flex items-center gap-2">
                  <Shield className="size-4" />
                  {t("Staff portal")}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            {t("Logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications Sheet */}
      {showNotifications && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-md">
            <div className="flex h-full flex-col">
              {/* Header */}
              <SheetHeader className="p-6 pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Bell className="size-5" />
                  {t("Notifications")}
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} {t("new")}
                    </Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              {/* Notifications Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4 p-6">
                  {unreadCount > 0 && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground text-xs"
                        onClick={markAllAsRead}
                      >
                        {t("Mark all as read")}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-muted-foreground p-8 text-center text-sm">
                        {t("No notifications")}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={notification.link || "#"}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group hover:bg-muted/50 block cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors ${!notification.read ? "bg-primary/5" : ""} `}
                        >
                          <div className="mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm/tight font-medium">
                              {t(notification.title)}
                            </p>
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                              {t(notification.message)}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {t(notification.timestamp)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0 max-lg:size-12"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                          >
                            <X className="size-3" />
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
