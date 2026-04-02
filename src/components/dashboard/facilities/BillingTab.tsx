"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Download,
  Edit,
  CheckCircle,
  Building2,
  Users,
  UserCheck,
  PawPrint,
  Settings,
  AlertCircle,
} from "lucide-react";
import { planPrices } from "@/data/facilities";
import { plans } from "@/data/plans";

const billingHistory = [
  {
    id: 1,
    date: "2025-01-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "10032",
  },
  {
    id: 2,
    date: "2024-12-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "10033",
  },
  {
    id: 3,
    date: "2024-11-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "10034",
  },
];

interface BillingTabProps {
  facility: {
    name: string;
    plan: string;
    dayJoined: string;
    subscriptionEnd?: string;
    limits?: {
      locations?: number;
      staff?: number;
      clients?: number;
      pets?: number;
    };
    locationsList: { name: string; address: string; services: string[] }[];
    usersList: { person: { name: string; email: string }; role: string }[];
    clients: {
      person: { name: string; email: string; phone?: string };
      status: string;
    }[];
  };
}

export function BillingTab({ facility }: BillingTabProps) {
  // Calculate monthly subscription cost (base plan only for now)
  const monthlySubscriptionCost = planPrices[facility.plan] ?? 0;
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(facility.plan);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [editableLimits, setEditableLimits] = useState({
    locations: facility.limits?.locations ?? 0,
    staff: facility.limits?.staff ?? 0,
    clients: facility.limits?.clients ?? 0,
    pets: facility.limits?.pets ?? 0,
  });

  const handleEditLimits = () => {
    setEditableLimits({
      locations: facility.limits?.locations ?? 0,
      staff: facility.limits?.staff ?? 0,
      clients: facility.limits?.clients ?? 0,
      pets: facility.limits?.pets ?? 0,
    });
    setShowLimitsDialog(true);
  };
  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="size-5" />
          Billing & Subscription
        </CardTitle>
        <Button variant="outline" size="sm">
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscription Info */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Current Plan</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowSubscriptionDialog(true)}
              >
                <Edit className="mr-1 size-3" />
                Change
              </Button>
            </div>
            <div className="mt-1">
              <StatusBadge type="plan" value={facility.plan} />
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">Member Since</p>
            <p className="mt-1 font-semibold">{facility.dayJoined}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">Next Billing</p>
            <p className="mt-1 font-semibold">
              {facility.subscriptionEnd || "N/A"}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">Monthly Cost</p>
            <p className="mt-1 text-lg font-bold">
              ${monthlySubscriptionCost.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-[10px]">
              Base: ${planPrices[facility.plan]?.toFixed(2) ?? "0.00"} + Modules
            </p>
          </div>
        </div>

        {/* Plan Limits */}
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium">Plan Limits</h4>
            <Button variant="outline" size="sm" onClick={handleEditLimits}>
              <Edit className="mr-2 size-4" />
              Edit Limits
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <Building2 className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="text-lg font-bold">
                {facility.limits?.locations === -1
                  ? "∞"
                  : (facility.limits?.locations ?? "N/A")}
              </p>
              <p className="text-muted-foreground text-xs">Locations</p>
              <p className="text-primary mt-1 text-[10px]">
                {facility.locationsList.length} used
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <Users className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="text-lg font-bold">
                {facility.limits?.staff === -1
                  ? "∞"
                  : (facility.limits?.staff ?? "N/A")}
              </p>
              <p className="text-muted-foreground text-xs">Staff</p>
              <p className="text-primary mt-1 text-[10px]">
                {facility.usersList.length} used
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <UserCheck className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="text-lg font-bold">
                {facility.limits?.clients === -1
                  ? "∞"
                  : (facility.limits?.clients ?? "N/A")}
              </p>
              <p className="text-muted-foreground text-xs">Clients</p>
              <p className="text-primary mt-1 text-[10px]">
                {facility.clients.length} used
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <PawPrint className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="text-lg font-bold">
                {facility.limits?.pets === -1
                  ? "∞"
                  : (facility.limits?.pets ?? "N/A")}
              </p>
              <p className="text-muted-foreground text-xs">Pets</p>
              <p className="text-muted-foreground mt-1 text-[10px]">Per plan</p>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="border-t pt-4">
          <h4 className="mb-3 font-medium">Billing History</h4>
          <div className="space-y-3">
            {billingHistory.map((bill) => (
              <div
                key={bill.id}
                className="bg-muted/50 flex items-center justify-between rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-success/10 flex size-10 items-center justify-center rounded-xl">
                    <CheckCircle className="text-success size-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{bill.description}</h4>
                    <p className="text-muted-foreground text-xs">
                      {bill.date} • {bill.invoice}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${bill.amount.toFixed(2)}</p>
                  <Badge
                    variant="secondary"
                    className="bg-success/10 text-success"
                  >
                    Paid
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => setShowSubscriptionDialog(true)}
        >
          <Settings className="mr-2 size-4" />
          Manage Subscription
        </Button>
      </CardContent>

      {/* Manage Subscription Dialog */}
      <Dialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      >
        <DialogContent className="flex max-h-[85vh] min-w-5xl flex-col">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {facility.name}. Current plan:{" "}
              <span className="font-semibold">{facility.plan}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid gap-3">
              {plans.map((plan) => {
                const isCurrentPlan =
                  facility.plan.toLowerCase() === plan.name.toLowerCase();
                const isSelected =
                  selectedPlan.toLowerCase() === plan.name.toLowerCase();
                const formatLimit = (value: number) =>
                  value === -1 ? "Unlimited" : value.toString();
                return (
                  <div
                    key={plan.id}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : `bg-muted/50 hover:bg-muted border-transparent`
                    } `}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-xl ${isSelected ? "bg-primary/10" : "bg-muted"} `}
                        >
                          <CreditCard
                            className={`size-5 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            } `}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{plan.name}</h4>
                            {isCurrentPlan && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          ${plan.pricing[0]?.basePrice ?? 0}
                        </p>
                        <p className="text-muted-foreground text-xs">/month</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 border-t pt-3">
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Building2 className="size-3.5" />
                        <span>
                          {formatLimit(plan.limits.locations)} locations
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Users className="size-3.5" />
                        <span>{formatLimit(plan.limits?.staff)} staff</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <UserCheck className="size-3.5" />
                        <span>{formatLimit(plan.limits?.clients)} clients</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <PawPrint className="size-3.5" />
                        <span>{formatLimit(plan.limits.pets)} pets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPlan.toLowerCase() !== facility.plan.toLowerCase() && (
              <div className="border-warning/20 bg-warning/10 mt-4 rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-warning mt-0.5 size-5" />
                  <div>
                    <p className="text-sm font-medium">Plan Change Notice</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Changing from <strong>{facility.plan}</strong> to{" "}
                      <strong>{selectedPlan}</strong> will take effect
                      immediately. The billing will be prorated for the
                      remainder of the current billing cycle.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="text-muted-foreground mr-auto flex items-center gap-2 text-xs">
              <CreditCard className="size-4" />
              Next billing: {facility.subscriptionEnd || "N/A"}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPlan(facility.plan);
                setShowSubscriptionDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowSubscriptionDialog(false)}
              disabled={
                selectedPlan.toLowerCase() === facility.plan.toLowerCase()
              }
            >
              {selectedPlan.toLowerCase() === facility.plan.toLowerCase()
                ? "No Changes"
                : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limits Dialog */}
      <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Facility Limits</DialogTitle>
            <DialogDescription>
              Adjust the limits for {facility.name}. Use -1 for unlimited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="limit-locations"
                  className="flex items-center gap-2"
                >
                  <Building2 className="size-4" />
                  Locations
                </Label>
                <Input
                  id="limit-locations"
                  type="number"
                  min="-1"
                  value={editableLimits.locations}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      locations: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-muted-foreground text-[10px]">
                  Currently using: {facility.locationsList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-staff"
                  className="flex items-center gap-2"
                >
                  <Users className="size-4" />
                  Staff
                </Label>
                <Input
                  id="limit-staff"
                  type="number"
                  min="-1"
                  value={editableLimits.staff}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      staff: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-muted-foreground text-[10px]">
                  Currently using: {facility.usersList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-clients"
                  className="flex items-center gap-2"
                >
                  <UserCheck className="size-4" />
                  Clients
                </Label>
                <Input
                  id="limit-clients"
                  type="number"
                  min="-1"
                  value={editableLimits.clients}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      clients: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-muted-foreground text-[10px]">
                  Currently using: {facility.clients.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-pets" className="flex items-center gap-2">
                  <PawPrint className="size-4" />
                  Pets
                </Label>
                <Input
                  id="limit-pets"
                  type="number"
                  min="-1"
                  value={editableLimits.pets}
                  onChange={(e) =>
                    setEditableLimits((prev) => ({
                      ...prev,
                      pets: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-xs">
              <strong>Note:</strong> Enter -1 for unlimited. Changes will apply
              immediately to this facility&apos;s subscription.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLimitsDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowLimitsDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
