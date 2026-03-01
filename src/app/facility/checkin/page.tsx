"use client";

import { useCallback, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { validateCheckInToken, recordQrCheckIn } from "@/lib/qr-checkin";
import { runPostCheckInAutomation } from "@/lib/post-checkin-automation";
import { logStaffOverride } from "@/lib/checkin-audit";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoForm, getYipyyGoDisplayStatusForBooking } from "@/data/yipyygo-forms";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import {
  CheckCircle2,
  Package,
  Utensils,
  Pill,
  AlertCircle,
  LogIn,
  ArrowLeft,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_FACILITY_ID = 11;

function CheckInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");

  const [manualBookingId, setManualBookingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const payload = useMemo(() => {
    if (token) return validateCheckInToken(token);
    if (manualBookingId == null) return null;
    const b = bookings.find((x) => x.id === manualBookingId);
    if (!b) return null;
    const petId = Array.isArray(b.petId) ? b.petId[0] : b.petId;
    return { bookingId: b.id, petId, facilityId: b.facilityId };
  }, [token, manualBookingId]);

  const booking = useMemo(
    () => (payload ? bookings.find((b) => b.id === payload.bookingId) : null),
    [payload]
  );
  const form = useMemo(
    () => (payload ? getYipyyGoForm(payload.bookingId, payload.petId) : null),
    [payload]
  );
  const client = useMemo(
    () => (booking ? clients.find((c) => c.id === booking.clientId) : null),
    [booking]
  );
  const pet = useMemo(() => {
    if (!client || !booking) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return client.pets?.find((p) => p.id === pid);
  }, [client, booking]);

  const config = useMemo(
    () => (booking ? getYipyyGoConfig(booking.facilityId) : null),
    [booking]
  );

  const isMandatoryPreCheck = useMemo(() => {
    if (!config?.enabled || !booking?.service) return false;
    const svc = booking.service.toLowerCase() as "daycare" | "boarding" | "grooming" | "training";
    const sc = config.serviceConfigs.find((s) => s.serviceType === svc);
    return Boolean(sc?.enabled && sc?.requirement === "mandatory");
  }, [config, booking]);

  const hasRequiredFields = Boolean(
    form?.submittedAt || form?.staffStatus === "approved" || form?.manuallyCompletedAt
  );
  const isPreCheckMissing = isMandatoryPreCheck && !hasRequiredFields;

  const [medsAck, setMedsAck] = useState(false);
  const [belongingsAck, setBelongingsAck] = useState(false);
  const [requiredAck, setRequiredAck] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const hasMeds = Boolean(form && !form.noMedications && form.medications?.length > 0);
  const checklistComplete =
    requiredAck &&
    (hasMeds ? medsAck : true) &&
    belongingsAck;
  const overrideComplete = !isPreCheckMissing || overrideReason.trim().length > 0;
  const canCheckIn = (checklistComplete || isPreCheckMissing) && overrideComplete;

  const handleCheckIn = useCallback(() => {
    if (!payload || !booking || !canCheckIn) return;
    setCheckingIn(true);
    try {
      const source = token ? "qr" : "manual";
      if (isPreCheckMissing && overrideReason.trim()) {
        logStaffOverride({
          facilityId: payload.facilityId,
          bookingId: payload.bookingId,
          petId: payload.petId,
          staffUserId: 1,
          staffUserName: "Staff",
          reason: overrideReason.trim(),
        });
      }
      recordQrCheckIn(payload.bookingId, payload.facilityId);

      const serviceType = booking.service?.toLowerCase() as "daycare" | "boarding" | "grooming" | "training";
      const { tasksCreated } = runPostCheckInAutomation({
        bookingId: payload.bookingId,
        facilityId: payload.facilityId,
        petId: payload.petId,
        serviceType: serviceType || "daycare",
        source,
        staffUserId: 1,
        staffUserName: "Staff",
        assignToStaffId: 1,
        assignToStaffName: "Staff",
      });

      setCheckedIn(true);
      toast.success("Check-in complete");
      if (tasksCreated > 0) {
        toast.info(`${tasksCreated} stay task(s) created (feeding, meds, etc.).`);
      }
      if (config?.addOnsApproval === "auto" && form?.addOns?.filter((a) => a.selected)?.length) {
        toast.info("Add-ons will be added to invoice per facility rules.");
      }
    } catch (e) {
      toast.error("Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }, [payload, booking, canCheckIn, config, form, isPreCheckMissing, overrideReason, token]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    const byId = bookings.filter(
      (b) => b.facilityId === DEFAULT_FACILITY_ID && String(b.id) === searchQuery.trim()
    );
    const byName = bookings.filter((b) => {
      if (b.facilityId !== DEFAULT_FACILITY_ID) return false;
      const c = clients.find((x) => x.id === b.clientId);
      const petIds = Array.isArray(b.petId) ? b.petId : [b.petId];
      const petNames = petIds
        .map((pid) => c?.pets?.find((p) => p.id === pid)?.name)
        .filter(Boolean);
      return (
        c?.name?.toLowerCase().includes(q) ||
        petNames.some((n) => (n as string).toLowerCase().includes(q))
      );
    });
    const seen = new Set<number>();
    return [...byId, ...byName].filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [searchQuery]);

  if (!token && manualBookingId == null) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-6">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/facility/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <Badge variant="outline">Manual check-in</Badge>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find booking
              </CardTitle>
              <CardDescription>
                QR not available? Search by booking ID or client/pet name to check in manually.
                YipyyGo status and form contents will still be shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Booking ID or client / pet name</Label>
                <input
                  id="search"
                  type="text"
                  placeholder="e.g. 5 or Smith or Bella"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select a booking</p>
                  <ul className="border rounded-md divide-y max-h-48 overflow-auto">
                    {searchResults.map((b) => {
                      const c = clients.find((x) => x.id === b.clientId);
                      const pid = Array.isArray(b.petId) ? b.petId[0] : b.petId;
                      const petName = c?.pets?.find((p) => p.id === pid)?.name ?? "—";
                      const status = getYipyyGoDisplayStatusForBooking(b.id, {
                        facilityId: b.facilityId,
                        service: b.service,
                      });
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                            onClick={() => {
                              setManualBookingId(b.id);
                              setSearchQuery("");
                            }}
                          >
                            <span>
                              #{b.id} · {c?.name ?? "—"} · {petName} · {b.service}
                            </span>
                            <Badge variant={status === "precheck_missing" ? "destructive" : "secondary"} className="text-xs">
                              {status === "precheck_missing" ? "PreCheck Missing" : status.replace("_", " ")}
                            </Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Or scan the customer’s QR code with <code className="bg-muted px-1">?t=...</code> for fast-track check-in.
          </p>
        </div>
      </div>
    );
  }

  if (token && (!payload || !booking)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid or expired token</CardTitle>
            <CardDescription>
              This check-in link may have expired. Use manual check-in below or ask the customer to show their QR again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild>
              <Link href="/facility/checkin">Manual check-in (search booking)</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/facility/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Booking not found</CardTitle>
            <CardDescription>
              The selected booking could not be loaded. Try manual check-in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/facility/checkin">Manual check-in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Checked in</h2>
            <p className="text-muted-foreground mb-4">
              {pet?.name} · Booking #{booking.id}
            </p>
            <Button asChild>
              <Link href={`/facility/dashboard/bookings/${booking.id}`}>
                Open reservation
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="mt-2 w-full" asChild>
              <Link href="/facility/dashboard">Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedAddOns = form?.addOns?.filter((a) => a.selected) ?? [];
  const tipLabel = form?.tip
    ? form.tip.type === "percentage"
      ? `${form.tip.percentage}%`
      : `$${form.tip.customAmount ?? 0}`
    : null;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/facility/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
          </Button>
          <Badge variant="secondary">{token ? "QR Check-in" : "Manual check-in"}</Badge>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reservation</CardTitle>
            <CardDescription>
              Booking #{booking.id} · {booking.service}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Pet:</strong> {pet?.name ?? "—"}
            </p>
            <p>
              <strong>Client:</strong> {client?.name ?? "—"}
            </p>
            <p>
              <strong>Date:</strong> {booking.startDate} · {booking.checkInTime ?? "—"}
            </p>
          </CardContent>
        </Card>

        {(form || isPreCheckMissing) && (
          <Card className={isPreCheckMissing ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {isPreCheckMissing && <AlertCircle className="h-4 w-4 text-destructive" />}
                YipyyGo {form ? "summary" : "— PreCheck missing"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {form ? (
                <>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Belongings</p>
                  {form.belongings?.length ? (
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {form.belongings.map((b) => (
                        <li key={b.id}>
                          {b.type.replace("_", " ")} {b.quantity ? `× ${b.quantity}` : ""}
                          {b.notes ? ` – ${b.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">None listed</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Utensils className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Feeding</p>
                  <p className="text-muted-foreground">
                    {form.feedingInstructions?.foodType
                      ? `${form.feedingInstructions.foodType} – ${form.feedingInstructions.portionSize} ${form.feedingInstructions.portionUnit}`
                      : "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Pill className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Medications</p>
                  {form.noMedications || !form.medications?.length ? (
                    <p className="text-muted-foreground">None</p>
                  ) : (
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {form.medications.map((m) => (
                        <li key={m.id}>
                          {m.name} – {m.dosage}, {m.frequency}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {(selectedAddOns.length > 0 || tipLabel) && (
                <div>
                  <p className="font-medium">Add-ons & tip</p>
                  <p className="text-muted-foreground">
                    {selectedAddOns.map((a) => a.name).join(", ") || "—"}
                    {tipLabel ? ` · Tip: ${tipLabel}` : ""}
                  </p>
                </div>
              )}
                </>
              ) : (
                <p className="text-muted-foreground">No form submitted. Use override below to check in with a reason.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Ready to check-in
            </CardTitle>
            <CardDescription>
              Verify the following before completing check-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isPreCheckMissing && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={requiredAck}
                  onCheckedChange={(v) => setRequiredAck(!!v)}
                />
                <Label htmlFor="required" className="cursor-pointer font-normal">
                  Required fields complete
                  {hasRequiredFields ? " (form submitted or approved)" : " (mandatory form if applicable)"}
                </Label>
              </div>
            )}
            {isPreCheckMissing && (
              <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <Label className="text-destructive font-medium">PreCheck missing (mandatory)</Label>
                <p className="text-sm text-muted-foreground">
                  Customer did not submit the pre-check form. You can complete manually from the booking detail, or override and check in with a reason below (logged for audit).
                </p>
                <Textarea
                  placeholder="e.g. Customer completed form verbally at desk; running late, form not sent in time"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
            {hasMeds && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meds"
                  checked={medsAck}
                  onCheckedChange={(v) => setMedsAck(!!v)}
                />
                <Label htmlFor="meds" className="cursor-pointer font-normal">
                  Meds / feeding acknowledged
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="belongings"
                checked={belongingsAck}
                onCheckedChange={(v) => setBelongingsAck(!!v)}
              />
              <Label htmlFor="belongings" className="cursor-pointer font-normal">
                Belongings confirmed
              </Label>
            </div>

            <Button
              className="w-full mt-4 gap-2"
              size="lg"
              disabled={!canCheckIn || checkingIn}
              onClick={handleCheckIn}
            >
              <LogIn className="h-5 w-5" />
              {checkingIn ? "Checking in…" : isPreCheckMissing ? "Override and check in" : "Check in"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Scanned from phone? Open this link on your facility desktop to complete check-in there.
        </p>
      </div>
    </div>
  );
}

export default function FacilityCheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}
