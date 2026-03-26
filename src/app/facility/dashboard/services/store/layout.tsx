"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Store, ShoppingBag, Settings } from "lucide-react";

const tabs = [
  {
    name: "Store",
    href: "/facility/dashboard/services/store",
    icon: ShoppingBag,
  },
  {
    name: "Settings",
    href: "/facility/dashboard/services/store/settings",
    icon: Settings,
  },
];

export default function StoreLayout({
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-purple-500">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Store Module
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your online store and inventory
              </p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/facility/dashboard/services/store" &&
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
