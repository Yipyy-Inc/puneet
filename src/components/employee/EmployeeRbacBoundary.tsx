"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, X } from "lucide-react";
import { FacilityRbacProvider } from "@/hooks/use-facility-rbac";
import {
  readRolePreview,
  endRolePreview,
  type RolePreviewPayload,
} from "@/lib/role-preview";

// ============================================================================
// Section 7 — the /employee shell's RBAC boundary.
//
// Normally seeds the provider from the signed-in employee (the cookie). When a
// manager launches "Preview as employee" from the Roles Studio, the payload is
// picked up here and every permission decision in the tree resolves from the
// previewed role's map instead — same nav, same modules, same scoped data —
// with a persistent bar to exit.
//
// sessionStorage is client-only, which is why this boundary is a client
// component sitting just inside the (server) shell layout.
// ============================================================================

export function EmployeeRbacBoundary({
  staffId,
  children,
}: {
  staffId: string;
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<RolePreviewPayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreview(readRolePreview());
    setReady(true);
  }, []);

  const exitPreview = () => {
    endRolePreview();
    setPreview(null);
    // Reload so any data read outside React state re-resolves unscoped.
    if (typeof window !== "undefined") window.location.reload();
  };

  // Until sessionStorage has been read, render with the real viewer. Avoids a
  // hydration mismatch and a flash of un-previewed content.
  const activePreview = ready ? preview : null;

  return (
    <FacilityRbacProvider
      initialViewerId={staffId}
      previewPermissions={activePreview?.permissions ?? null}
    >
      {activePreview && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100">
          <span className="flex items-center gap-2 font-medium">
            <Eye className="size-4 shrink-0" />
            Previewing as {activePreview.label} — this is what a staff member
            with this role sees.
          </span>
          <button
            type="button"
            onClick={exitPreview}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-400 px-2 py-1 text-xs font-semibold transition-colors hover:bg-amber-200 dark:border-amber-700 dark:hover:bg-amber-900"
          >
            <X className="size-3.5" />
            Exit preview
          </button>
        </div>
      )}
      {children}
    </FacilityRbacProvider>
  );
}
