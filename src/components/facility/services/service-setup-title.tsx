"use client";

import { Badge } from "@/components/ui/badge";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A SERVICE MODULE'S TITLE — "Daycare setup", never "Daycare Module".
//
// Client feedback, 2026-09-26: "Module" told a facility nothing, and the
// header should say plainly that this is where the service is set up. Seven
// layouts carried their own hardcoded English title, one of them already
// different ("Grooming"), so they share this one and cannot drift apart
// again — and a French facility reads it in French.
//
// ── NO "ENABLED" ──────────────────────────────────────────────────────────
//
// Boarding and daycare printed an Enabled badge on every visit. A facility on
// the page is using the module, so the badge said nothing, and the client
// asked for it gone. What stays is the one state worth reporting: a module
// the platform has switched off, which is why its screens may be missing.
//
// A client component because `useStaffText` reads the locale on the client;
// the grooming layout is a server component and renders this as it is.
// ============================================================================

export type ServiceSetupKey =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "retail"
  | "store"
  | "veterinary";

export function ServiceSetupTitle({
  service,
  disabled = false,
}: {
  service: ServiceSetupKey;
  /** The platform has switched this module off for the facility. */
  disabled?: boolean;
}) {
  const { t } = useStaffText("serviceSetup");

  return (
    <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
      {t(service)}
      {disabled ? <Badge variant="destructive">{t("disabled")}</Badge> : null}
    </h1>
  );
}
