import { CashDrawerClient } from "@/components/billing/cash-drawer/CashDrawerClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { locations } from "@/data/locations";
import { payments } from "@/data/payments";

export default function CashDrawerPage() {
  const facilityId = 11;
  const location = locations.find((l) => l.facilityId === facilityId && l.isPrimary)!;
  const currency = location.country === "CA" ? "CAD" : "USD";

  // Mock: sum today's completed cash payments as the reported total
  const today = new Date().toISOString().split("T")[0];
  const reportedCashSales = payments
    .filter(
      (p) =>
        p.facilityId === facilityId &&
        p.paymentMethod === "cash" &&
        p.status === "completed" &&
        p.createdAt.startsWith(today),
    )
    .reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/facility/dashboard/billing">
            <ArrowLeft className="mr-1.5 size-4" />
            Billing
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Cash Drawer Balance</h2>
              <p className="text-muted-foreground text-sm">{location.name}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {currency} · {location.country === "CA" ? "Canadian Denominations" : "US Denominations"}
          </Badge>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-muted-foreground text-xs font-medium">Today&apos;s Cash Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="price-value text-xl font-semibold tabular-nums">
              {currency === "CAD" ? "CA$" : "$"}{reportedCashSales.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-xs">From POS — auto-updated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-muted-foreground text-xs font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm font-medium">{location.name}</p>
            <p className="text-muted-foreground text-xs">{location.address}, {location.city}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-muted-foreground text-xs font-medium">Staff on Duty</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm font-medium">
              {location.staffAssignments.find((s) => s.role === "front_desk")?.staffName ??
                location.staffAssignments[0]?.staffName ??
                "Unknown"}
            </p>
            <p className="text-muted-foreground text-xs capitalize">
              {location.staffAssignments.find((s) => s.role === "front_desk")?.role.replace("_", " ") ?? "Staff"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main drawer workflow */}
      <Card>
        <CardContent className="p-6">
          <CashDrawerClient
            facilityId={facilityId}
            locationId={location.id}
            currency={currency as "CAD" | "USD"}
            locationName={location.name}
            staffName={
              location.staffAssignments.find((s) => s.role === "front_desk")?.staffName ??
              location.staffAssignments[0]?.staffName ??
              "Staff"
            }
            reportedCashSales={reportedCashSales}
          />
        </CardContent>
      </Card>
    </div>
  );
}
