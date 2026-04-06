"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Moon,
  UserPlus,
  CalendarCheck,
  LogIn,
} from "lucide-react";
import { estimates } from "@/data/estimates";
import { businessProfile } from "@/data/settings";
import { EstimatePdfDownload } from "@/components/estimates/EstimatePdfDownload";
import Link from "next/link";

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function CustomerEstimateViewPage() {
  const params = useParams();
  const token = params.token as string;

  const estimate = useMemo(
    () => estimates.find((e) => e.estimateToken === token),
    [token],
  );

  if (!estimate) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Estimate Not Found</h1>
          <p className="text-muted-foreground mt-2">
            This estimate link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  const isExpired =
    estimate.expiresAt && new Date(estimate.expiresAt) < new Date();
  const nights =
    estimate.service === "boarding" && estimate.startDate && estimate.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(estimate.endDate).getTime() -
              new Date(estimate.startDate).getTime()) /
              86400000,
          ),
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-lg">
          {/* Header */}
          <div className="border-b bg-slate-50 px-6 py-5 text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {businessProfile.businessName}
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-800">
              Estimate for{" "}
              {estimate.petNames.length > 0
                ? estimate.petNames.join(", ")
                : (estimate.guestPetInfo?.name ?? "Your Pet")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Prepared by {estimate.createdBy} ·{" "}
              {new Date(estimate.createdAt).toLocaleDateString()}
            </p>
            {isExpired && (
              <Badge className="mt-2 bg-red-100 text-red-700">Expired</Badge>
            )}
            <div className="mt-3">
              <EstimatePdfDownload estimate={estimate} variant="outline" />
            </div>
          </div>

          {/* Service details */}
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800 capitalize">
                {estimate.service}
                {estimate.serviceType && ` — ${estimate.serviceType}`}
              </p>
              <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5" />
                  <span>
                    {fmtDate(estimate.startDate)}
                    {estimate.endDate &&
                      estimate.endDate !== estimate.startDate &&
                      ` to ${fmtDate(estimate.endDate)}`}
                  </span>
                </div>
                {estimate.checkInTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5" />
                    <span>
                      Check-in: {fmtTime(estimate.checkInTime)}
                      {estimate.checkOutTime &&
                        ` · Check-out: ${fmtTime(estimate.checkOutTime)}`}
                    </span>
                  </div>
                )}
                {nights && (
                  <div className="flex items-center gap-2">
                    <Moon className="size-3.5" />
                    <span>
                      {nights} night{nights !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                Pricing
              </p>
              <div className="space-y-2">
                {estimate.lineItems.map((li, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{li.label}</span>
                      {li.description && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {li.description}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums">
                      ${li.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-1 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    ${estimate.subtotal.toFixed(2)}
                  </span>
                </div>
                {estimate.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      -${estimate.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({(estimate.taxRate * 100).toFixed(0)}%)
                  </span>
                  <span className="tabular-nums">
                    ${estimate.taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Estimated Total</span>
                  <span className="tabular-nums">
                    ${estimate.total.toFixed(2)}
                  </span>
                </div>
                {estimate.depositRequired && estimate.depositRequired > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span className="font-medium">Deposit Required</span>
                    <span className="font-semibold tabular-nums">
                      ${estimate.depositRequired.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Public note */}
            {estimate.publicNote && (
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-sm/relaxed text-amber-800 italic">
                  &ldquo;{estimate.publicNote}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          {!isExpired && (
            <div className="border-t bg-slate-50 px-6 py-5">
              <div className="space-y-3 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Ready to book?
                </p>

                {/* Primary: Book Now — pre-fills booking from estimate */}
                <Button
                  asChild
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                  size="lg"
                >
                  <Link
                    href={`/customer/bookings/new?fromEstimate=${estimate.id}&service=${estimate.service}&startDate=${estimate.startDate}&endDate=${estimate.endDate}&token=${token}`}
                  >
                    <CalendarCheck className="size-4" />
                    Book Now
                  </Link>
                </Button>

                {/* Secondary: Set up account first */}
                {estimate.isGuestEstimate && (
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link
                      href={`/customer/auth/signup?email=${encodeURIComponent(estimate.guestEmail ?? estimate.clientEmail)}&from=estimate&token=${token}`}
                    >
                      <UserPlus className="size-4" />
                      Set Up Your Account First
                    </Link>
                  </Button>
                )}

                <p className="text-muted-foreground text-xs">
                  Already have an account?{" "}
                  <Link
                    href={`/customer/auth/login?from=estimate&token=${token}`}
                    className="text-primary font-medium hover:underline"
                  >
                    <LogIn className="mr-1 inline-block size-3" />
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
            {estimate.expiresAt && (
              <p>
                This estimate expires on{" "}
                {new Date(estimate.expiresAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="mt-1">
              Questions? Call {businessProfile.phone} or email{" "}
              {businessProfile.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
