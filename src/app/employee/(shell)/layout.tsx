import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { EmployeeHeader } from "@/components/employee/EmployeeHeader";

export default async function EmployeeShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const staffId = cookieStore.get("employee_staff_id")?.value;

  if (!staffId) {
    redirect("/employee/select");
  }

  return (
    <SettingsProviderWrapper>
      <SidebarProvider>
        <EmployeeSidebar staffId={staffId} />
        <SidebarInset className="flex min-h-screen flex-col">
          <EmployeeHeader staffId={staffId} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <footer className="text-muted-foreground flex items-center justify-center border-t px-4 py-3 text-xs">
            © 2026 Yipyy · Employee Portal
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </SettingsProviderWrapper>
  );
}
