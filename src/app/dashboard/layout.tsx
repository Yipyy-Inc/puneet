import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/super-admin-sidebar";
import { Metadata } from "next";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserProfileSheet } from "@/components/layout/UserProfileSheet";
import { GlobalSearchNext } from "@/components/search/GlobalSearchNext";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";

export const metadata: Metadata = {
  title: "Yipyy - Admin Dashboard",
};

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

          <GlobalSearchNext className="max-w-[520px]" />

          <div className="flex items-center">
            {/* User Profile & Notifications */}
            <TopBarIconsNext
              inboxHref="/dashboard/communication/live-support"
              notificationsHref="/dashboard/system-health/alerts-notifications"
            />
            <UserProfileSheet showNotifications={false} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
