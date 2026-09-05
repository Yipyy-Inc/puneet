"use client";

import Link from "next/link";

import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { subscription } from "@/data/settings";

export function SubscriptionSection() {
  const { addons, updateAddons } = useSettings();
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between rounded-lg bg-linear-to-br from-blue-50 to-purple-50 p-6">
            <div>
              <div className="text-2xl font-bold">{subscription.planName}</div>
              <div className="text-muted-foreground mt-1 capitalize">
                {subscription.billingCycle} billing
              </div>
              <div className="mt-4">
                <Badge
                  variant={
                    subscription.status === "active" ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {subscription.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">${subscription.price}</div>
              <div className="text-muted-foreground text-sm">
                per {subscription.billingCycle === "monthly" ? "month" : "year"}
              </div>
              <div className="text-muted-foreground mt-2 text-xs">
                Next billing:{" "}
                {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </div>
            </div>
          </div>
          {/* Both of these were alert() describing a screen that already
              exists. /facility/account/subscription and .../change-plan are
              real routes over the real subscription — this card was the only
              place in the product that did not know. */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/facility/account/subscription/change-plan">
                Change plan
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/facility/account/subscription">Billing history</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Module Add-ons</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Enable additional modules to extend functionality
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {addons.map((addon) => (
            <div key={addon.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{addon.name}</span>
                    {addon.isIncludedInPlan && (
                      <Badge variant="default">Included in Plan</Badge>
                    )}
                    {addon.isEnabled && !addon.isIncludedInPlan && (
                      <Badge variant="secondary">Active Add-on</Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {addon.description}
                  </div>
                  {!addon.isIncludedInPlan && (
                    <div className="mt-2 text-sm font-medium">
                      ${addon.monthlyPrice}/month
                    </div>
                  )}
                </div>
                <Switch
                  checked={addon.isEnabled}
                  disabled={addon.isIncludedInPlan}
                  onCheckedChange={(checked) =>
                    updateAddons(
                      addons.map((a) =>
                        a.id === addon.id ? { ...a, isEnabled: checked } : a,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
