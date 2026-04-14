"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  membershipPlans as seedPlans,
  type MembershipPlan,
  type MembershipBillingCycle,
} from "@/data/services-pricing";
import { PlanCard } from "./PlanCard";
import { PlanBuilderDialog } from "./PlanBuilderDialog";
import type { PlanBuilderData } from "./use-plan-builder";

const BILLING_OPTIONS: { value: MembershipBillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annual" },
];

function makeId() {
  return `plan-${Math.random().toString(36).slice(2, 8)}`;
}

function dataToPlan(
  data: PlanBuilderData,
  base?: MembershipPlan,
): MembershipPlan {
  return {
    id: base?.id ?? makeId(),
    subscriberCount: base?.subscriberCount ?? 0,
    createdAt: base?.createdAt ?? new Date().toISOString(),
    name: data.name,
    tierLabel: data.tierLabel,
    description: data.description,
    monthlyPrice: data.monthlyPrice,
    quarterlyPrice: data.quarterlyPrice,
    annualPrice: data.annualPrice,
    credits: data.credits,
    discountPercentage: data.discountPercentage,
    perks: data.perks,
    applicableServices: data.applicableServices,
    isPopular: data.isPopular,
    isActive: data.isActive,
    billingCycle: data.billingCycle,
    weeklyBillingDay: data.weeklyBillingDay,
    weeklyBillingTime: data.weeklyBillingTime,
    taxAmount: data.taxAmount,
    termsText: data.termsText || undefined,
    termsUrl: data.termsUrl || undefined,
    discountRules: data.discountRules,
    includedItems: data.includedItems,
    availableOnline: data.availableOnline,
    gracePeriodDays: data.gracePeriodDays,
    cancellationPolicy: data.cancellationPolicy,
    badgeColor: data.badgeColor,
  };
}

export function PlansTab() {
  const [plans, setPlans] = useState<MembershipPlan[]>(seedPlans);
  const [query, setQuery] = useState("");
  const [cycleView, setCycleView] = useState<MembershipBillingCycle>("monthly");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | undefined>(
    undefined,
  );
  const [deletingPlan, setDeletingPlan] = useState<MembershipPlan | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tierLabel ?? "").toLowerCase().includes(q),
    );
  }, [plans, query]);

  const openNew = () => {
    setEditingPlan(undefined);
    setBuilderOpen(true);
  };
  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setBuilderOpen(true);
  };
  const duplicate = (plan: MembershipPlan) => {
    const copy: MembershipPlan = {
      ...plan,
      id: makeId(),
      name: `${plan.name} (copy)`,
      subscriberCount: 0,
      isPopular: false,
      createdAt: new Date().toISOString(),
    };
    setPlans((prev) => [copy, ...prev]);
    toast.success("Plan duplicated", { description: copy.name });
  };
  const toggleActive = (plan: MembershipPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p)),
    );
    toast.success(plan.isActive ? "Plan deactivated" : "Plan activated");
  };
  const confirmDelete = () => {
    if (!deletingPlan) return;
    setPlans((prev) => prev.filter((p) => p.id !== deletingPlan.id));
    toast.success("Plan deleted", { description: deletingPlan.name });
    setDeletingPlan(null);
  };
  const handleSave = (data: PlanBuilderData) => {
    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id ? dataToPlan(data, editingPlan) : p,
        ),
      );
    } else {
      setPlans((prev) => [dataToPlan(data), ...prev]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plans..."
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground text-xs">Show pricing as</div>
          <Select
            value={cycleView}
            onValueChange={(v) => setCycleView(v as MembershipBillingCycle)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew}>
            <Plus className="mr-2 size-4" />
            New plan
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          No plans match your search.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycleView}
              onEdit={() => openEdit(plan)}
              onDuplicate={() => duplicate(plan)}
              onToggleActive={() => toggleActive(plan)}
              onDelete={() => setDeletingPlan(plan)}
            />
          ))}
        </div>
      )}

      <PlanBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        plan={editingPlan}
        onSave={handleSave}
      />

      <Dialog
        open={!!deletingPlan}
        onOpenChange={(o) => !o && setDeletingPlan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingPlan?.name}</span>? This
              action cannot be undone. Existing subscribers will keep access
              until their next billing date.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
