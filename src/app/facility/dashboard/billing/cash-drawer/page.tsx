import Link from "next/link";
import { ArrowLeft, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { locations } from "@/data/locations";
import { DailyRegisterClient } from "@/components/billing/cash-drawer/DailyRegisterClient";

export default function DailyRegisterPage() {
  const facilityId = 11;
  const location = locations.find((l) => l.facilityId === facilityId && l.isPrimary)!;
  const currency = location.country === "CA" ? "CAD" : "USD";
  const staffName =
    location.staffAssignments.find((s) => s.role === "front_desk")?.staffName ??
    location.staffAssignments[0]?.staffName ??
    "Staff";
  // Mock auth gate — real backend would resolve from the signed-in user.
  const isManager = true;

  return (
    <div className="flex-1 space-y-5 p-4 pt-6">
      {/* Page header — distinct from MoeGo: name is "Daily Register" and the
          status pill carries currency, not the title bar. */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/facility/dashboard/billing">
            <ArrowLeft className="mr-1.5 size-4" />
            Billing
          </Link>
        </Button>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Vault className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Daily Register</h2>
              <p className="text-muted-foreground text-sm">
                {location.name} · open / close the day, track cash sales,
                reconcile the drawer
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {currency} ·{" "}
            {location.country === "CA"
              ? "Canadian denominations"
              : "US denominations"}
          </Badge>
        </div>
      </div>

      <DailyRegisterClient
        facilityId={facilityId}
        locationId={location.id}
        locationName={location.name}
        currency={currency as "CAD" | "USD"}
        staffName={staffName}
        isManager={isManager}
      />
    </div>
  );
}
