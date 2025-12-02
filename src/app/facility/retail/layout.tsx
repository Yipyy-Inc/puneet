"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardList,
} from "lucide-react";

const retailTabs = [
  {
    name: "POS",
    href: "/facility/retail",
    icon: ShoppingCart,
  },
  {
    name: "Products",
    href: "/facility/retail/products",
    icon: Package,
  },
  {
    name: "Inventory",
    href: "/facility/retail/inventory",
    icon: Warehouse,
  },
  {
    name: "Orders",
    href: "/facility/retail/orders",
    icon: ClipboardList,
  },
];

export default function RetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === "/facility/retail") {
      return pathname === "/facility/retail";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Retail / POS</h2>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {retailTabs.map((tab) => {
            const isActive = isActiveTab(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                )}
              >
                <tab.icon
                  className={cn(
                    "h-4 w-4",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
