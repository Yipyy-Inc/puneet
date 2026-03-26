"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Scissors,
  Calendar,
  Users,
  Package,
  BoxesIcon,
  Settings,
  LogIn,
  LogOut,
  FileText,
} from "lucide-react";

const tabs = [
  {
    name: "Calendar",
    href: "/facility/dashboard/services/grooming",
    icon: Calendar,
  },
  {
    name: "Check-In",
    href: "/facility/dashboard/services/grooming/check-in",
    icon: LogIn,
  },
  {
    name: "Check-Out",
    href: "/facility/dashboard/services/grooming/check-out",
    icon: LogOut,
  },
  {
    name: "Stylists",
    href: "/facility/dashboard/services/grooming/stylists",
    icon: Users,
  },
  {
    name: "Packages",
    href: "/facility/dashboard/services/grooming/packages",
    icon: Package,
  },
  {
    name: "Inventory",
    href: "/facility/dashboard/services/grooming/inventory",
    icon: BoxesIcon,
  },
  {
    name: "Report Cards",
    href: "/facility/dashboard/services/grooming/report-cards",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/grooming/settings",
    icon: Settings,
  },
];

export default function GroomingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-pink-500 to-rose-500">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Grooming Module
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage appointments, stylists, and grooming packages
              </p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/grooming" &&
                pathname.startsWith(tab.href));
            const Icon = tab.icon;

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
                <Icon className="size-4" />
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
