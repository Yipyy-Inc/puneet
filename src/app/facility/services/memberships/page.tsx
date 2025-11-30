"use client";

import { useState } from "react";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  CreditCard,
  DollarSign,
  Users,
  Star,
  Edit,
  Trash2,
  MoreHorizontal,
  Wallet,
  Calendar,
  Mail,
  User,
  Crown,
  Pause,
  Play,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  membershipPlans,
  memberships,
  prepaidCredits,
  type MembershipPlan,
  type Membership,
  type PrepaidCredits,
  type ServiceCategory,
  type MembershipStatus,
  type MembershipBillingCycle,
} from "@/data/services-pricing";

type PlanWithRecord = MembershipPlan & Record<string, unknown>;
type MembershipWithRecord = Membership & Record<string, unknown>;
type CreditsWithRecord = PrepaidCredits & Record<string, unknown>;

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState("plans");

  // Plan modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    monthlyPrice: 0,
    quarterlyPrice: 0,
    annualPrice: 0,
    credits: 0,
    discountPercentage: 0,
    perks: [] as string[],
    applicableServices: [] as ServiceCategory[],
    isPopular: false,
    isActive: true,
  });
  const [newPerk, setNewPerk] = useState("");

  // Subscription modal state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    planId: "",
    billingCycle: "monthly" as MembershipBillingCycle,
    autoRenew: true,
  });

  // Credits modal state
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [creditsForm, setCreditsForm] = useState({
    customerId: "",
    customerName: "",
    amount: 0,
    expiresAt: "",
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: "plan" | "subscription" | "credits";
    item: MembershipPlan | Membership | PrepaidCredits;
  } | null>(null);

  const totalSubscribers = memberships.filter((m) => m.status === "active").length;
  const monthlyRevenue = memberships
    .filter((m) => m.status === "active")
    .reduce((sum, m) => sum + m.monthlyPrice, 0);
  const totalCreditsOutstanding = prepaidCredits.reduce((sum, c) => sum + c.balance, 0);

  // Plan handlers
  const handleAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      description: "",
      monthlyPrice: 0,
      quarterlyPrice: 0,
      annualPrice: 0,
      credits: 0,
      discountPercentage: 0,
      perks: [],
      applicableServices: [],
      isPopular: false,
      isActive: true,
    });
    setIsPlanModalOpen(true);
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      quarterlyPrice: plan.quarterlyPrice,
      annualPrice: plan.annualPrice,
      credits: plan.credits,
      discountPercentage: plan.discountPercentage,
      perks: [...plan.perks],
      applicableServices: [...plan.applicableServices],
      isPopular: plan.isPopular,
      isActive: plan.isActive,
    });
    setIsPlanModalOpen(true);
  };

  const addPerk = () => {
    if (!newPerk.trim()) return;
    setPlanForm({ ...planForm, perks: [...planForm.perks, newPerk.trim()] });
    setNewPerk("");
  };

  const removePerk = (index: number) => {
    setPlanForm({
      ...planForm,
      perks: planForm.perks.filter((_, i) => i !== index),
    });
  };

  const toggleService = (service: ServiceCategory) => {
    setPlanForm({
      ...planForm,
      applicableServices: planForm.applicableServices.includes(service)
        ? planForm.applicableServices.filter((s) => s !== service)
        : [...planForm.applicableServices, service],
    });
  };

  // Subscription handlers
  const handleAddSubscription = () => {
    setSubscriptionForm({
      customerId: "",
      customerName: "",
      customerEmail: "",
      planId: "",
      billingCycle: "monthly",
      autoRenew: true,
    });
    setIsSubscriptionModalOpen(true);
  };

  // Credits handlers
  const handleAddCredits = () => {
    setCreditsForm({
      customerId: "",
      customerName: "",
      amount: 0,
      expiresAt: "",
    });
    setIsCreditsModalOpen(true);
  };

  const handleDelete = (
    type: "plan" | "subscription" | "credits",
    item: MembershipPlan | Membership | PrepaidCredits
  ) => {
    setDeletingItem({ type, item });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    setDeletingItem(null);
  };

  const getStatusVariant = (status: MembershipStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "expired":
        return "outline";
      default:
        return "outline";
    }
  };

  // Plan columns
  const planColumns: ColumnDef<PlanWithRecord>[] = [
    {
      key: "name",
      label: "Plan Name",
      icon: Crown,
      defaultVisible: true,
      render: (item: PlanWithRecord) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name as string}</span>
          {(item.isPopular as boolean) && (
            <Badge variant="default" className="text-xs">
              <Star className="mr-1 h-3 w-3" />
              Popular
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "monthlyPrice",
      label: "Monthly",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: PlanWithRecord) => (
        <span className="font-medium">${(item.monthlyPrice as number).toFixed(2)}</span>
      ),
    },
    {
      key: "credits",
      label: "Credits/Mo",
      defaultVisible: true,
      render: (item: PlanWithRecord) => {
        const credits = item.credits as number;
        return <span>{credits === -1 ? "Unlimited" : credits}</span>;
      },
    },
    {
      key: "discountPercentage",
      label: "Discount",
      defaultVisible: true,
      render: (item: PlanWithRecord) => (
        <Badge variant="outline">{item.discountPercentage as number}% off</Badge>
      ),
    },
    {
      key: "subscriberCount",
      label: "Subscribers",
      icon: Users,
      defaultVisible: true,
      render: (item: PlanWithRecord) => <span>{item.subscriberCount as number}</span>,
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item: PlanWithRecord) => (
        <Badge variant={(item.isActive as boolean) ? "default" : "outline"}>
          {(item.isActive as boolean) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Subscription columns
  const subscriptionColumns: ColumnDef<MembershipWithRecord>[] = [
    {
      key: "customerName",
      label: "Customer",
      icon: User,
      defaultVisible: true,
      render: (item: MembershipWithRecord) => (
        <div>
          <div className="font-medium">{item.customerName as string}</div>
          <div className="text-xs text-muted-foreground">{item.customerEmail as string}</div>
        </div>
      ),
    },
    {
      key: "planName",
      label: "Plan",
      icon: Crown,
      defaultVisible: true,
    },
    {
      key: "billingCycle",
      label: "Billing",
      defaultVisible: true,
      render: (item: MembershipWithRecord) => (
        <span className="capitalize">{item.billingCycle as string}</span>
      ),
    },
    {
      key: "monthlyPrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: MembershipWithRecord) => (
        <span className="font-medium">${(item.monthlyPrice as number).toFixed(2)}/mo</span>
      ),
    },
    {
      key: "creditsRemaining",
      label: "Credits Left",
      defaultVisible: true,
      render: (item: MembershipWithRecord) => {
        const remaining = item.creditsRemaining as number;
        const total = item.creditsTotal as number;
        if (remaining === -1) return <span>Unlimited</span>;
        return (
          <span>
            {remaining} / {total}
          </span>
        );
      },
    },
    {
      key: "nextBillingDate",
      label: "Next Billing",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item: MembershipWithRecord) => (
        <Badge variant={getStatusVariant(item.status as MembershipStatus)} className="capitalize">
          {item.status as string}
        </Badge>
      ),
    },
  ];

  // Credits columns
  const creditsColumns: ColumnDef<CreditsWithRecord>[] = [
    {
      key: "customerName",
      label: "Customer",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "balance",
      label: "Balance",
      icon: Wallet,
      defaultVisible: true,
      render: (item: CreditsWithRecord) => (
        <span className="font-medium text-green-600">${(item.balance as number).toFixed(2)}</span>
      ),
    },
    {
      key: "totalPurchased",
      label: "Total Purchased",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: CreditsWithRecord) => <span>${(item.totalPurchased as number).toFixed(2)}</span>,
    },
    {
      key: "totalUsed",
      label: "Total Used",
      defaultVisible: true,
      render: (item: CreditsWithRecord) => <span>${(item.totalUsed as number).toFixed(2)}</span>,
    },
    {
      key: "expiresAt",
      label: "Expires",
      icon: Calendar,
      defaultVisible: true,
      render: (item: CreditsWithRecord) => {
        const expires = item.expiresAt as string | undefined;
        if (!expires) return <span className="text-muted-foreground">Never</span>;
        const isExpired = new Date(expires) < new Date();
        return (
          <span className={isExpired ? "text-destructive" : ""}>
            {expires}
            {isExpired && " (Expired)"}
          </span>
        );
      },
    },
    {
      key: "lastUsedAt",
      label: "Last Used",
      defaultVisible: true,
      render: (item: CreditsWithRecord) => {
        const lastUsed = item.lastUsedAt as string | undefined;
        return lastUsed ? <span>{lastUsed}</span> : <span className="text-muted-foreground">Never</span>;
      },
    },
  ];

  const subscriptionFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "cancelled", label: "Cancelled" },
        { value: "expired", label: "Expired" },
      ],
    },
    {
      key: "billingCycle",
      label: "Billing Cycle",
      options: [
        { value: "all", label: "All Cycles" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "annually", label: "Annually" },
      ],
    },
  ];

  const categories: ServiceCategory[] = ["boarding", "daycare", "grooming", "training"];

  return (
    <div className="space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Plans</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membershipPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              {membershipPlans.filter((p) => p.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {memberships.filter((m) => m.status === "paused").length} paused
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From memberships</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prepaid Credits</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditsOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="plans">
              <Crown className="mr-2 h-4 w-4" />
              Plans ({membershipPlans.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <CreditCard className="mr-2 h-4 w-4" />
              Subscriptions ({memberships.length})
            </TabsTrigger>
            <TabsTrigger value="credits">
              <Wallet className="mr-2 h-4 w-4" />
              Prepaid Credits ({prepaidCredits.length})
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => {
              if (activeTab === "plans") handleAddPlan();
              else if (activeTab === "subscriptions") handleAddSubscription();
              else handleAddCredits();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "plans"
              ? "Add Plan"
              : activeTab === "subscriptions"
              ? "Add Subscription"
              : "Add Credits"}
          </Button>
        </div>

        <TabsContent value="plans" className="mt-4">
          <DataTable
            data={membershipPlans.map((p) => ({ ...p } as PlanWithRecord))}
            columns={planColumns}
            searchKey={"name" as keyof PlanWithRecord}
            searchPlaceholder="Search plans..."
            actions={(item: PlanWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEditPlan(item as unknown as MembershipPlan)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete("plan", item as unknown as MembershipPlan)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <DataTable
            data={memberships.map((m) => ({ ...m } as MembershipWithRecord))}
            columns={subscriptionColumns}
            filters={subscriptionFilters}
            searchKey={"customerName" as keyof MembershipWithRecord}
            searchPlaceholder="Search subscriptions..."
            actions={(item: MembershipWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(item.status as MembershipStatus) === "active" && (
                    <DropdownMenuItem>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </DropdownMenuItem>
                  )}
                  {(item.status as MembershipStatus) === "paused" && (
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete("subscription", item as unknown as Membership)}
                    className="text-destructive"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <DataTable
            data={prepaidCredits.map((c) => ({ ...c } as CreditsWithRecord))}
            columns={creditsColumns}
            searchKey={"customerName" as keyof CreditsWithRecord}
            searchPlaceholder="Search credits..."
            actions={(item: CreditsWithRecord) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Credits
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Refund
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete("credits", item as unknown as PrepaidCredits)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Plan Modal */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit" : "Create"} Membership Plan</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update the membership plan details."
                : "Create a new membership plan with credits and perks."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g., Daycare Plus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.discountPercentage}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, discountPercentage: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planDesc">Description</Label>
              <Textarea
                id="planDesc"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly">Monthly Price ($)</Label>
                <Input
                  id="monthly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.monthlyPrice}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, monthlyPrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quarterly">Quarterly Price ($)</Label>
                <Input
                  id="quarterly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.quarterlyPrice}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, quarterlyPrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual">Annual Price ($)</Label>
                <Input
                  id="annual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.annualPrice}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, annualPrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Credits per Month (-1 for unlimited)</Label>
              <Input
                id="credits"
                type="number"
                min="-1"
                value={planForm.credits}
                onChange={(e) =>
                  setPlanForm({ ...planForm, credits: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Applicable Services</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={planForm.applicableServices.includes(cat) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleService(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perks</Label>
              <div className="flex gap-2">
                <Input
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  placeholder="Add a perk..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPerk();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addPerk}>
                  Add
                </Button>
              </div>
              {planForm.perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {planForm.perks.map((perk, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {perk}
                      <button
                        type="button"
                        onClick={() => removePerk(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="popular"
                  checked={planForm.isPopular}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, isPopular: checked })}
                />
                <Label htmlFor="popular">Mark as Popular</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="planActive"
                  checked={planForm.isActive}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, isActive: checked })}
                />
                <Label htmlFor="planActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsPlanModalOpen(false)}>
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Modal */}
      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Add a new customer subscription to a membership plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custName">Customer Name</Label>
              <Input
                id="custName"
                value={subscriptionForm.customerName}
                onChange={(e) =>
                  setSubscriptionForm({ ...subscriptionForm, customerName: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custEmail">Customer Email</Label>
              <Input
                id="custEmail"
                type="email"
                value={subscriptionForm.customerEmail}
                onChange={(e) =>
                  setSubscriptionForm({ ...subscriptionForm, customerEmail: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Membership Plan</Label>
              <Select
                value={subscriptionForm.planId}
                onValueChange={(value) =>
                  setSubscriptionForm({ ...subscriptionForm, planId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {membershipPlans
                    .filter((p) => p.isActive)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.monthlyPrice}/mo
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing">Billing Cycle</Label>
              <Select
                value={subscriptionForm.billingCycle}
                onValueChange={(value: MembershipBillingCycle) =>
                  setSubscriptionForm({ ...subscriptionForm, billingCycle: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRenew"
                checked={subscriptionForm.autoRenew}
                onCheckedChange={(checked) =>
                  setSubscriptionForm({ ...subscriptionForm, autoRenew: checked })
                }
              />
              <Label htmlFor="autoRenew">Auto-Renew</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriptionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsSubscriptionModalOpen(false)}>Create Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credits Modal */}
      <Dialog open={isCreditsModalOpen} onOpenChange={setIsCreditsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Prepaid Credits</DialogTitle>
            <DialogDescription>Add prepaid credits to a customer account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="creditCust">Customer Name</Label>
              <Input
                id="creditCust"
                value={creditsForm.customerName}
                onChange={(e) => setCreditsForm({ ...creditsForm, customerName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Amount ($)</Label>
              <Input
                id="creditAmount"
                type="number"
                min="0"
                step="0.01"
                value={creditsForm.amount}
                onChange={(e) =>
                  setCreditsForm({ ...creditsForm, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Expiration Date (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={creditsForm.expiresAt}
                onChange={(e) => setCreditsForm({ ...creditsForm, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreditsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreditsModalOpen(false)}>Add Credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deletingItem?.type === "plan"
                ? "Delete Plan"
                : deletingItem?.type === "subscription"
                ? "Cancel Subscription"
                : "Delete Credits"}
            </DialogTitle>
            <DialogDescription>
              {deletingItem?.type === "plan" && (
                <>
                  Are you sure you want to delete &quot;
                  {(deletingItem?.item as MembershipPlan)?.name}&quot;? This action cannot be undone.
                </>
              )}
              {deletingItem?.type === "subscription" && (
                <>
                  Are you sure you want to cancel the subscription for &quot;
                  {(deletingItem?.item as Membership)?.customerName}&quot;?
                </>
              )}
              {deletingItem?.type === "credits" && (
                <>
                  Are you sure you want to delete credits for &quot;
                  {(deletingItem?.item as PrepaidCredits)?.customerName}&quot;?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {deletingItem?.type === "subscription" ? "Cancel Subscription" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
