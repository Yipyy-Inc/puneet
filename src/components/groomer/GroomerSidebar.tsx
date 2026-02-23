"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Scissors, Calendar } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/groomer/dashboard",
    icon: Calendar,
  },
];

export function GroomerSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-pink-500 to-rose-500">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">Groomer</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.url;

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.url}>
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
