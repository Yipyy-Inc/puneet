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
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Enabled</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Disabled</span>
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
  const module = getModuleBySlug(slug ?? "");

  if (!module) return null;

  const { pricing } = module;
  const modelLabel =
    PRICING_MODEL_LABELS[pricing.model] ?? pricing.model;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Rates &amp; Pricing</h2>
        <p className="text-sm text-muted-foreground">
          Current pricing configuration for {module.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pricing Model Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Model Type</span>
              <Badge variant="secondary" className="font-medium">
                {modelLabel}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Base Price</span>
              <span className="text-2xl font-bold">
                ${pricing.basePrice.toFixed(2)}
              </span>
            </div>

            {/* Duration tiers for duration_based */}
            {pricing.model === "duration_based" &&
              pricing.durationTiers &&
              pricing.durationTiers.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Duration Tiers
                  </p>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                            Duration
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">
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
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                Clients are charged a single{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per{" "}
                {pricing.model === "per_booking" ? "booking" : "session"}.
              </div>
            )}

            {/* Per-route */}
            {pricing.model === "per_route" && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                Clients are charged{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per route,
                regardless of number of pets.
              </div>
            )}

            {/* Per-pet */}
            {pricing.model === "per_pet" && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                Clients are charged{" "}
                <strong>${pricing.basePrice.toFixed(2)}</strong> per pet in the
                booking.
              </div>
            )}

            {/* Peak pricing rules */}
            {pricing.peakPricingRules && pricing.peakPricingRules.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Peak Pricing Rules
                </p>
                <div className="space-y-1">
                  {pricing.peakPricingRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/40"
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
            <StatusIndicator
              enabled={pricing.taxable}
              label="Tax Applied"
            />
            <StatusIndicator
              enabled={pricing.tipAllowed}
              label="Tips Allowed"
            />
            <StatusIndicator
              enabled={pricing.membershipDiscountEligible}
              label="Membership Discounts"
            />
            <StatusIndicator
              enabled={module.onlineBooking.depositRequired}
              label="Deposit Required"
            />
            {module.onlineBooking.depositRequired &&
              module.onlineBooking.depositAmount != null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Deposit Amount
                  </span>
                  <span className="text-sm font-semibold">
                    ${module.onlineBooking.depositAmount}
                  </span>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Duration Options */}
        {module.calendar.enabled &&
          module.calendar.durationOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.calendar.durationOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
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

                <div className="mt-4 text-sm text-muted-foreground">
                  Duration mode:{" "}
                  <span className="font-medium capitalize">
                    {module.calendar.durationMode}
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
              <span className="text-sm text-muted-foreground">
                Cancel window
              </span>
              <span className="font-medium">
                {module.onlineBooking.cancellationPolicy.hoursBeforeBooking}{" "}
                hours before
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Cancellation fee
              </span>
              <Badge
                variant={
                  module.onlineBooking.cancellationPolicy.feePercentage > 0
                    ? "destructive"
                    : "secondary"
                }
              >
                {module.onlineBooking.cancellationPolicy.feePercentage}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
