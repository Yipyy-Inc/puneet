import { redirect } from "next/navigation";
import {
  canAccessAdminPortal,
  getViewer,
  isAuthEnforced,
} from "@/lib/auth/viewer";
import { AppSidebar } from "@/components/layout/super-admin-sidebar";
import { Metadata } from "next";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserProfileSheet } from "@/components/layout/UserProfileSheet";
import { AdminGlobalSearch } from "@/components/search/AdminGlobalSearch";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { SupportNotificationBell } from "@/components/layout/SupportNotificationBell";

export const metadata: Metadata = {
  title: "Yipyy - Admin Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  // Until AUTH_ENFORCED is on this is the old rule verbatim: facility admins
  // get sent to their own portal, everyone else is let through. After it, the
  // only way in is the platform-admin flag on the profile.
  if (!canAccessAdminPortal(viewer)) {
    redirect(
      isAuthEnforced() && viewer.source !== "session"
        ? "/customer/auth/login"
        : "/facility/dashboard",
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <header className="border-border/50 bg-background/80 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors" />
          </div>

          <AdminGlobalSearch className="max-w-[520px]" />

          <div className="flex items-center">
            {/* User Profile & Notifications */}
            <TopBarIconsNext messagesHref="/dashboard/communication/live-support" />
            <SupportNotificationBell />
            <HeaderDropdown />
            <UserProfileSheet showNotifications={false} />
          </div>
        </header>
        <main className="flex-1">
          <SettingsProviderWrapper>{children}</SettingsProviderWrapper>
        </main>
        <footer className="text-muted-foreground flex items-center justify-center border-t px-4 py-3 text-xs">
          © 2026 Yipyy. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
