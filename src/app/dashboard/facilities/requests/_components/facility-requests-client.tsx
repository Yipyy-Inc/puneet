"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ClipboardCheck } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { facilityQueries } from "@/lib/api/facility";
import type { FacilityRequest } from "@/types/facility";
import { BUSINESS_TYPES } from "@/components/admin/facility-onboarding/wizard-config";
import type { FacilityDraft } from "@/components/admin/facility-onboarding/wizard-types";

import {
  RejectRequestDialog,
  type RejectionDetails,
} from "./reject-request-dialog";

// Lazy-loaded — the wizard chunk only loads when an application is approved.
const FacilityOnboardingWizard = dynamic(
  () =>
    import("@/components/admin/facility-onboarding-wizard").then(
      (m) => m.FacilityOnboardingWizard,
    ),
  { ssr: false },
);

const BUSINESS_TYPE_IDS = new Set<string>(BUSINESS_TYPES.map((b) => b.id));
const TIER_IDS = new Set<string>(["free", "basic", "premium", "enterprise"]);

// Map an application to the wizard's draft so Approve opens it prefilled.
function requestToPrefill(r: FacilityRequest): Partial<FacilityDraft> {
  const parts = (r.adminName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() ?? "";
  const last = parts.join(" ");
  const businessTypeId = (r.businessType ?? "").toLowerCase();
  const planId = (r.requestedPlan ?? r.plan ?? "").toLowerCase();
  const country = (r.country ?? "").toUpperCase().includes("US") ? "US" : "CA";

  return {
    legalName: r.facilityName,
    displayName: r.facilityName,
    address: r.address ?? "",
    city: r.city ?? "",
    province: r.state ?? "",
    postalCode: r.zipCode ?? "",
    country,
    phone: r.phone ?? "",
    businessTypes: BUSINESS_TYPE_IDS.has(businessTypeId)
      ? [businessTypeId]
      : [],
    tierId: TIER_IDS.has(planId) ? planId : "",
    adminFirstName: first,
    adminLastName: last,
    adminEmail: r.adminEmail ?? r.email ?? "",
  };
}

export function FacilityRequestsClient() {
  const { data: allRequests = [], isLoading } = useQuery(
    facilityQueries.requests(),
  );
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [wizardPrefill, setWizardPrefill] =
    useState<Partial<FacilityDraft> | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FacilityRequest | null>(
    null,
  );

  const pending = useMemo(
    () =>
      allRequests.filter((r) => r.status === "pending" && !dismissed.has(r.id)),
    [allRequests, dismissed],
  );

  const handleApprove = (r: FacilityRequest) =>
    setWizardPrefill(requestToPrefill(r));

  const confirmReject = (details: RejectionDetails) => {
    if (rejectTarget) {
      setDismissed((prev) => new Set(prev).add(rejectTarget.id));
      toast.success(
        `Application from ${rejectTarget.facilityName} rejected` +
          (details.sendEmail ? " — rejection email sent." : "."),
      );
    }
    setRejectTarget(null);
  };

  const columns: ColumnDef<FacilityRequest>[] = [
    {
      key: "facilityName",
      label: "Business Name",
      defaultVisible: true,
      render: (r) => <span className="font-medium">{r.facilityName}</span>,
    },
    { key: "adminName", label: "Primary Contact", defaultVisible: true },
    {
      key: "adminEmail",
      label: "Email",
      defaultVisible: true,
      render: (r) => (
        <span className="text-muted-foreground">{r.adminEmail}</span>
      ),
    },
    {
      key: "businessType",
      label: "Business Types",
      defaultVisible: true,
      render: (r) => <Badge variant="secondary">{r.businessType}</Badge>,
    },
    {
      key: "plan",
      label: "Plan Interest",
      defaultVisible: true,
      render: (r) => (
        <Badge variant="outline">{r.requestedPlan ?? r.plan}</Badge>
      ),
    },
    {
      key: "time",
      label: "Date Applied",
      defaultVisible: true,
      render: (r) => <span className="text-muted-foreground">{r.time}</span>,
    },
  ];

  return (
    <div className="flex-1 space-y-5 p-4 pt-6 md:p-8">
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="w-min" asChild>
          <Link href="/dashboard/facilities">
            <ArrowLeft className="size-4" />
            Back to Facilities
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Facility Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            Review and action pending facility applications.
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <AlertTriangle className="size-5" />
          </span>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {pending.length} application{pending.length === 1 ? "" : "s"}{" "}
            awaiting review.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : (
        <DataTable
          data={pending}
          columns={columns}
          searchKey="facilityName"
          searchPlaceholder="Search applications…"
          itemsPerPage={10}
          emptyState={{
            icon: ClipboardCheck,
            title: "No pending applications",
            description:
              "New facility applications will appear here for review.",
          }}
          actions={(r) => (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" onClick={() => handleApprove(r)}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectTarget(r)}
              >
                Reject
              </Button>
            </div>
          )}
        />
      )}

      <RejectRequestDialog
        key={rejectTarget?.id ?? "none"}
        facilityName={rejectTarget?.facilityName ?? ""}
        open={rejectTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRejectTarget(null);
        }}
        onConfirm={confirmReject}
      />

      {wizardPrefill && (
        <FacilityOnboardingWizard
          prefill={wizardPrefill}
          onClose={() => setWizardPrefill(null)}
        />
      )}
    </div>
  );
}
