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
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoForm } from "@/data/yipyygo-forms";
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
} from "lucide-react";
import { toast } from "sonner";

function CheckInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");

  const payload = useMemo(() => (token ? validateCheckInToken(token) : null), [token]);
  const booking = useMemo(
    () => (payload ? bookings.find((b) => b.id === payload.bookingId) : null),
    [payload]
  );
  const form = useMemo(
    () => (payload ? getYipyyGoForm(payload.bookingId) : null),
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

  const [medsAck, setMedsAck] = useState(false);
  const [belongingsAck, setBelongingsAck] = useState(false);
  const [requiredAck, setRequiredAck] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const hasRequiredFields = Boolean(
    form?.submittedAt || form?.staffStatus === "approved" || form?.manuallyCompletedAt
  );
  const hasMeds = Boolean(form && !form.noMedications && form.medications?.length > 0);
  const checklistComplete =
    requiredAck &&
    (hasMeds ? medsAck : true) &&
    belongingsAck;

  const handleCheckIn = useCallback(() => {
    if (!payload || !booking || !checklistComplete) return;
    setCheckingIn(true);
    try {
      recordQrCheckIn(payload.bookingId, payload.facilityId);
      setCheckedIn(true);
      toast.success("Check-in complete");
      // Apply add-ons/tips per facility rules (in production: update invoice)
      if (config?.addOnsApproval === "auto" && form?.addOns?.filter((a) => a.selected)?.length) {
        toast.info("Add-ons will be added to invoice per facility rules.");
      }
    } catch (e) {
      toast.error("Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }, [payload, booking, checklistComplete, config, form]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid link
            </CardTitle>
            <CardDescription>
              This check-in link is missing or invalid. Scan the customer’s QR code again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
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
            <CardTitle>Invalid or expired token</CardTitle>
            <CardDescription>
              This check-in link may have expired. Ask the customer to show their QR again from the
              portal.
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/facility/dashboard">Go to dashboard</Link>
              </Link>
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
          <Badge variant="secondary">QR Check-in</Badge>
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

        {form && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">YipyyGo summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
              disabled={!checklistComplete || checkingIn}
              onClick={handleCheckIn}
            >
              <LogIn className="h-5 w-5" />
              {checkingIn ? "Checking in…" : "Check in"}
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
