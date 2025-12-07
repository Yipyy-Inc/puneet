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
    invoice: "INV-2025-001",
  },
  {
    id: 2,
    date: "2024-12-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "INV-2024-012",
  },
  {
    id: 3,
    date: "2024-11-01",
    description: "Premium Plan - Monthly",
    amount: 299.99,
    status: "paid",
    invoice: "INV-2024-011",
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
    <Card className="border-0 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing & Subscription
        </CardTitle>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscription Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowSubscriptionDialog(true)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Change
              </Button>
            </div>
            <div className="mt-1">
              <StatusBadge type="plan" value={facility.plan} />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="font-semibold mt-1">{facility.dayJoined}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Next Billing</p>
            <p className="font-semibold mt-1">
              {facility.subscriptionEnd || "N/A"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Monthly Cost</p>
            <p className="font-bold text-lg mt-1">
              ${monthlySubscriptionCost.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Base: ${planPrices[facility.plan]?.toFixed(2) ?? "0.00"} + Modules
            </p>
          </div>
        </div>

        {/* Plan Limits */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Plan Limits</h4>
            <Button variant="outline" size="sm" onClick={handleEditLimits}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Limits
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <Building2 className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">
                {facility.limits?.locations === -1
                  ? "∞"
                  : (facility.limits?.locations ?? "N/A")}
              </p>
              <p className="text-xs text-muted-foreground">Locations</p>
              <p className="text-[10px] text-primary mt-1">
                {facility.locationsList.length} used
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">
                {facility.limits?.staff === -1
                  ? "∞"
                  : (facility.limits?.staff ?? "N/A")}
              </p>
              <p className="text-xs text-muted-foreground">Staff</p>
              <p className="text-[10px] text-primary mt-1">
                {facility.usersList.length} used
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <UserCheck className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">
                {facility.limits?.clients === -1
                  ? "∞"
                  : (facility.limits?.clients ?? "N/A")}
              </p>
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="text-[10px] text-primary mt-1">
                {facility.clients.length} used
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <PawPrint className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">
                {facility.limits?.pets === -1
                  ? "∞"
                  : (facility.limits?.pets ?? "N/A")}
              </p>
              <p className="text-xs text-muted-foreground">Pets</p>
              <p className="text-[10px] text-muted-foreground mt-1">Per plan</p>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Billing History</h4>
          <div className="space-y-3">
            {billingHistory.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium">{bill.description}</h4>
                    <p className="text-xs text-muted-foreground">
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
          <Settings className="h-4 w-4 mr-2" />
          Manage Subscription
        </Button>
      </CardContent>

      {/* Manage Subscription Dialog */}
      <Dialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      >
        <DialogContent className="min-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {facility.name}. Current plan:{" "}
              <span className="font-semibold">{facility.plan}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
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
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                            isSelected ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <CreditCard
                            className={`h-5 w-5 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
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
                          <p className="text-xs text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          ${plan.pricing[0]?.basePrice ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>
                          {formatLimit(plan.limits.locations)} locations
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits?.staff)} staff</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits?.clients)} clients</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PawPrint className="h-3.5 w-3.5" />
                        <span>{formatLimit(plan.limits.pets)} pets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPlan.toLowerCase() !== facility.plan.toLowerCase() && (
              <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Plan Change Notice</p>
                    <p className="text-xs text-muted-foreground mt-1">
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
            <div className="flex items-center gap-2 mr-auto text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
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
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="limit-locations"
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
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
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.locationsList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-staff"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
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
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.usersList.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="limit-clients"
                  className="flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
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
                <p className="text-[10px] text-muted-foreground">
                  Currently using: {facility.clients.length}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-pets" className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4" />
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
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
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
