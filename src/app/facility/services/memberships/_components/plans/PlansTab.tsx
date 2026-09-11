"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableEmptyState } from "@/components/ui/table-empty-state";
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
import type {
  MembershipPlan,
  MembershipBillingCycle,
} from "@/data/services-pricing";
import {
  useDeleteMembershipPlan,
  useMembershipPlans,
  useSaveMembershipPlan,
} from "@/lib/api/memberships";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { NO_ITEMS } from "@/lib/no-items";
import { PlanCard } from "./PlanCard";
import { PlanBuilderDialog } from "./PlanBuilderDialog";
import type { PlanBuilderData } from "./use-plan-builder";

const BILLING_OPTIONS: { value: MembershipBillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annual" },
];

// ── THE PLANS ARE THE FACILITY'S ─────────────────────────────────────────
//
// This tab copied `membershipPlans` from `@/data/services-pricing` into
// `useState`: creating, editing, duplicating, activating and deleting a plan
// changed the screen, toasted, and was gone on reload. Each is a write to
// `membership_plans` now (20260911161036), the toast waits for it, and the
// subscriber count is counted by the route from who is actually on the plan.

/** What the editor produced, as the plan the route stores. */
function dataToPlan(data: PlanBuilderData): Partial<MembershipPlan> {
  return {
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
    instabookServices: data.instabookServices,
    changePolicy: data.changePolicy,
    upgradePlanIds: data.upgradePlanIds,
    downgradePlanIds: data.downgradePlanIds,
  };
}

export function PlansTab() {
  const { t } = useStaffText("memberships");
  const { data, isPending, isError } = useMembershipPlans();
  const plans = data ?? NO_ITEMS;
  const savePlan = useSaveMembershipPlan();
  const deletePlan = useDeleteMembershipPlan();
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
  const failed = (key: string) => (error: unknown) =>
    toast.error(t(key), {
      description: error instanceof Error ? error.message : undefined,
    });
  const duplicate = (plan: MembershipPlan) => {
    const {
      id: _id,
      subscriberCount: _count,
      createdAt: _createdAt,
      ...rest
    } = plan;
    const name = `${plan.name} (copy)`;
    savePlan.mutate(
      { plan: { ...rest, name, isPopular: false } },
      {
        onSuccess: () =>
          toast.success("Plan duplicated", { description: name }),
        onError: failed("notSaved"),
      },
    );
  };
  const toggleActive = (plan: MembershipPlan) => {
    savePlan.mutate(
      { id: plan.id, plan: { isActive: !plan.isActive } },
      {
        onSuccess: () =>
          toast.success(plan.isActive ? "Plan deactivated" : "Plan activated"),
        onError: failed("notSaved"),
      },
    );
  };
  const confirmDelete = () => {
    if (!deletingPlan) return;
    const gone = deletingPlan;
    deletePlan.mutate(gone.id, {
      onSuccess: () => {
        toast.success("Plan deleted", { description: gone.name });
        setDeletingPlan(null);
      },
      onError: failed("notDeleted"),
    });
  };
  const handleSave = async (data: PlanBuilderData): Promise<boolean> => {
    try {
      await savePlan.mutateAsync({
        id: editingPlan?.id,
        plan: dataToPlan(data),
      });
      return true;
    } catch (error) {
      failed("notSaved")(error);
      return false;
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

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <TableEmptyState
          pose="error"
          title={t("plansFailed")}
          description={t("plansFailedHint")}
        />
      ) : plans.length === 0 ? (
        <TableEmptyState
          pose="presenting"
          title={t("noPlans")}
          description={t("noPlansHint")}
          action={{ label: t("createFirstPlan"), onClick: openNew, icon: Plus }}
        />
      ) : filtered.length === 0 ? (
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
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePlan.isPending}
            >
              Delete plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
