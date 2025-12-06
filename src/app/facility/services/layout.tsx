"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Package, Layers, CreditCard, Ticket } from "lucide-react";

const servicesTabs = [
  {
    name: "Catalog",
    href: "/facility/services",
    icon: Package,
  },
  {
    name: "Packages",
    href: "/facility/services/packages",
    icon: Layers,
  },
  {
    name: "Memberships",
    href: "/facility/services/memberships",
    icon: CreditCard,
  },
  {
    name: "Promo Codes",
    href: "/facility/services/promo-codes",
    icon: Ticket,
  },
];

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === "/facility/services") {
      return (
        pathname === "/facility/services" ||
        pathname === "/facility/services/catalog"
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Services & Pricing
        </h2>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {servicesTabs.map((tab) => {
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
