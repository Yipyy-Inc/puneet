"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardList,
  Settings,
  BarChart3,
  FileText,
} from "lucide-react";

const tabs = [
  {
    name: "POS",
    href: "/facility/dashboard/services/retail",
    icon: ShoppingCart,
  },
  {
    name: "Products",
    href: "/facility/dashboard/services/retail/products",
    icon: Package,
  },
  {
    name: "Inventory",
    href: "/facility/dashboard/services/retail/inventory",
    icon: Warehouse,
  },
  {
    name: "Orders",
    href: "/facility/dashboard/services/retail/orders",
    icon: ClipboardList,
  },
  {
    name: "Reports",
    href: "/facility/dashboard/services/retail/reports",
    icon: BarChart3,
  },
  {
    name: "Audit Logs",
    href: "/facility/dashboard/services/retail/audit",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/retail/settings",
    icon: Settings,
  },
];

export default function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500 to-teal-500">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Retail / POS Module
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage point of sale, products, inventory, and orders
              </p>
            </div>
          </div>
        </div>
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/retail" &&
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
    </div>
  );
}
