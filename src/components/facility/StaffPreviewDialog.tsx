"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { EmployeeHeader } from "@/components/employee/EmployeeHeader";
import { EmployeeDashboard } from "@/components/employee/EmployeeDashboard";
import { facilityStaff } from "@/data/facility-staff";
import { fullNameOf } from "@/app/facility/dashboard/staff/_components/staff-shared";

// "Preview as this staff member" (spec 6.3 / Task 16). Renders a read-only
// simulation of the staff member's Yipyy portal — sidebar + hub — resolved with
// THEIR effective permissions (EmployeeSidebar resolves for the staffId via
// F0.2). The whole simulated tree has pointer events disabled, so nothing can be
// clicked, navigated, or mutated: no writes happen in preview.

interface StaffPreviewValue {
  staffId: string;
  name: string;
}

const StaffPreviewContext = createContext<StaffPreviewValue | null>(null);

/** Non-null while a preview is active — lets descendants detect preview mode. */
export function useStaffPreview(): StaffPreviewValue | null {
  return useContext(StaffPreviewContext);
}

export function StaffPreviewDialog({
  staffId,
  onClose,
}: {
  /** The staff member to preview, or null when the preview is closed. */
  staffId: string | null;
  onClose: () => void;
}) {
  const staff = staffId
    ? facilityStaff.find((s) => s.id === staffId)
    : undefined;

  if (!staffId || !staff) return null;

  const name = fullNameOf(staff);

  return (
    <StaffPreviewContext.Provider value={{ staffId, name }}>
      <div className="bg-background fixed inset-0 z-50 flex flex-col">
        <PreviewBanner onClose={onClose} />

        {/* Read-only simulated portal. `pointer-events-none` on every descendant
            makes it non-interactive; the normally-fixed sidebar is pinned to this
            box (below the banner) instead of the viewport. */}
        <div
          aria-hidden
          className={cn(
            "relative flex-1 overflow-hidden select-none",
            "**:pointer-events-none!",
            "**:data-[slot=sidebar-container]:absolute! **:data-[slot=sidebar-container]:h-full!",
          )}
        >
          <SidebarProvider className="size-full min-h-0!">
            <EmployeeSidebar staffId={staffId} />
            <SidebarInset className="flex h-full min-h-0 flex-col overflow-auto">
              <EmployeeHeader staffId={staffId} />
              <main className="flex-1 overflow-x-hidden">
                <EmployeeDashboard staff={staff} />
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </StaffPreviewContext.Provider>
  );
}

function PreviewBanner({ onClose }: { onClose: () => void }) {
  const preview = useStaffPreview();
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Eye className="size-4 shrink-0" />
        <span className="truncate">
          Previewing as {preview?.name} — read only
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onClose}
        className="bg-background/80 shrink-0"
      >
        <X className="size-3.5" /> Exit preview
      </Button>
    </div>
  );
}
