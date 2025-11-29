import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/super-admin-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { Bell } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  // If user is facility_admin, redirect to facility dashboard
  if (userRole === "facility_admin") {
    redirect("/facility/dashboard");
  }

  // Allow access for super_admin or no role (defaults to super_admin)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="w-full overflow-x-hidden">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-muted transition-colors" />
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-border/50" />

            {/* User Dropdown */}
            <HeaderDropdown />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
