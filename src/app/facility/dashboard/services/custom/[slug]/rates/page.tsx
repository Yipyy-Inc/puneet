"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCustomServices } from "@/hooks/use-custom-services";
import { PRICING_MODEL_LABELS } from "@/data/custom-services";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

function StatusIndicator({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle2 className="text-success size-4" />
            <span className="text-success text-sm font-medium">Enabled</span>
          </>
        ) : (
          <>
            <XCircle className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">Disabled</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomServiceRatesPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  if (!serviceModule) return null;

  const { pricing } = serviceModule;
  const modelLabel = PRICING_MODEL_LABELS[pricing.model] ?? pricing.model;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Rates &amp; Pricing</h2>
        <p className="text-muted-foreground text-sm">
          Current pricing configuration for {serviceModule.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pricing Model Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              Pricing Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Model Type</span>
              <Badge variant="secondary" className="font-medium">
                {modelLabel}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Base Price</span>
              <span className="text-2xl font-bold">
                ${pricing.basePrice.toFixed(2)}
              </span>
            </div>

            {/* Duration tiers for duration_based */}
            {pricing.model === "duration_based" &&
              pricing.durationTiers &&
              pricing.durationTiers.length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-4" />
                    Duration Tiers
                  </p>
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                            Duration
                          </th>
                          <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pricing.durationTiers.map((tier) => (
                          <tr key={tier.durationMinutes}>
                            <td className="px-3 py-2">
                              {tier.durationMinutes} min
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              ${tier.price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Per-booking single price display */}
            {(pricing.model === "per_booking" ||
              pricing.model === "flat_rate") && (
              <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                Clients are charged a single{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per{" "}
                {pricing.model === "per_booking" ? "booking" : "session"}.
              </div>
            )}

            {/* Per-route */}
            {pricing.model === "per_route" && (
              <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                Clients are charged{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per route,
                regardless of number of pets.
              </div>
            )}

            {/* Per-pet */}
            {pricing.model === "per_pet" && (
              <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                Clients are charged{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per pet in the
                booking.
              </div>
            )}

            {/* Peak pricing rules */}
            {pricing.peakPricingRules &&
              pricing.peakPricingRules.length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <TrendingUp className="size-4" />
                    Peak Pricing Rules
                  </p>
                  <div className="space-y-1">
                    {pricing.peakPricingRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-muted/40 flex items-center justify-between rounded-sm p-2 text-sm"
                      >
                        <span>{rule.name}</span>
                        <Badge variant="warning">
                          {rule.adjustmentType === "percentage"
                            ? `+${rule.adjustment}%`
                            : `+$${rule.adjustment}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Billing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Billing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <StatusIndicator enabled={pricing.taxable} label="Tax Applied" />
            <StatusIndicator
              enabled={pricing.tipAllowed}
              label="Tips Allowed"
            />
            <StatusIndicator
              enabled={pricing.membershipDiscountEligible}
              label="Membership Discounts"
            />
            <StatusIndicator
              enabled={serviceModule.onlineBooking.depositRequired}
              label="Deposit Required"
            />
            {serviceModule.onlineBooking.depositRequired &&
              serviceModule.onlineBooking.depositAmount != null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground text-sm">
                    Deposit Amount
                  </span>
                  <span className="text-sm font-semibold">
                    ${serviceModule.onlineBooking.depositAmount}
                  </span>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Duration Options */}
        {serviceModule.calendar.enabled &&
          serviceModule.calendar.durationOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  Session Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {serviceModule.calendar.durationOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {opt.minutes} minutes
                        </p>
                      </div>
                      {opt.price != null && (
                        <span className="font-semibold">
                          ${opt.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-muted-foreground mt-4 text-sm">
                  Duration mode:{" "}
                  <span className="font-medium capitalize">
                    {serviceModule.calendar.durationMode}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Cancellation Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Cancellation Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Cancel window
              </span>
              <span className="font-medium">
                {
                  serviceModule.onlineBooking.cancellationPolicy
                    .hoursBeforeBooking
                }{" "}
                hours before
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Cancellation fee
              </span>
              <Badge
                variant={
                  serviceModule.onlineBooking.cancellationPolicy.feePercentage >
                  0
                    ? "destructive"
                    : "secondary"
                }
              >
                {serviceModule.onlineBooking.cancellationPolicy.feePercentage}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
