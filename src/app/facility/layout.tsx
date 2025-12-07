import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FacilitySidebar } from "@/components/layout/facility-admin-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { BookingModalProviderWrapper } from "@/components/providers/BookingModalProviderWrapper";

export default async function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  // If user is not facility_admin, redirect to main dashboard
  if (userRole !== "facility_admin") {
    redirect("/dashboard");
  }

  return (
    <BookingModalProviderWrapper>
      <SidebarProvider>
        <FacilitySidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-linear-to-r from-background to-muted/20 px-6 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1 hover:bg-accent/50 rounded-lg transition-colors" />
            <HeaderDropdown />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </BookingModalProviderWrapper>
  );
}
