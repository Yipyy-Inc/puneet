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
import {
  Plus,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  Percent,
  Copy,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  promoCodes,
  type PromoCode,
  type ServiceCategory,
} from "@/data/services-pricing";
import { cn } from "@/lib/utils";

type PromoWithRecord = PromoCode & Record<string, unknown>;

const CATEGORY_CHIP: Record<ServiceCategory, string> = {
  boarding: "border-violet-200 bg-violet-50/80 text-violet-700",
  daycare: "border-sky-200 bg-sky-50/80 text-sky-700",
  grooming: "border-rose-200 bg-rose-50/80 text-rose-700",
  training: "border-amber-200 bg-amber-50/80 text-amber-700",
  retail: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
};

export default function PromoCodesPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPromo, setDeletingPromo] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: 0,
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
    perCustomerLimit: 1,
    applicableCategories: [] as ServiceCategory[],
    startDate: "",
    endDate: "",
    isFirstTimeOnly: false,
    isActive: true,
  });

  const activePromos = promoCodes.filter((p) => p.isActive).length;
  const totalRedemptions = promoCodes.reduce((sum, p) => sum + p.usedCount, 0);
  const avgRedemptionRate =
    promoCodes.reduce((sum, p) => {
      if (p.usageLimit) {
        return sum + (p.usedCount / p.usageLimit) * 100;
      }
      return sum;
    }, 0) / promoCodes.filter((p) => p.usageLimit).length || 0;

  const handleAddNew = () => {
    setEditingPromo(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      minPurchase: 0,
      maxDiscount: 0,
      usageLimit: 0,
      perCustomerLimit: 1,
      applicableCategories: [],
      startDate: "",
      endDate: "",
      isFirstTimeOnly: false,
      isActive: true,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minPurchase: promo.minPurchase || 0,
      maxDiscount: promo.maxDiscount || 0,
      usageLimit: promo.usageLimit || 0,
      perCustomerLimit: promo.perCustomerLimit,
      applicableCategories: promo.applicableCategories,
      startDate: promo.startDate,
      endDate: promo.endDate,
      isFirstTimeOnly: promo.isFirstTimeOnly,
      isActive: promo.isActive,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (promo: PromoCode) => {
    setDeletingPromo(promo);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    setDeletingPromo(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCategory = (category: ServiceCategory) => {
    setFormData({
      ...formData,
      applicableCategories: formData.applicableCategories.includes(category)
        ? formData.applicableCategories.filter((c) => c !== category)
        : [...formData.applicableCategories, category],
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const columns: ColumnDef<PromoWithRecord>[] = [
    {
      key: "code",
      label: "Code",
      icon: Ticket,
      defaultVisible: true,
      render: (item: PromoWithRecord) => (
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-fuchsia-50 ring-2 ring-fuchsia-100">
            <Ticket className="size-4 text-fuchsia-600" />
          </div>
          <code className="rounded-md border border-fuchsia-200 bg-fuchsia-50/80 px-2 py-1 font-mono text-sm font-bold text-fuchsia-700">
            {item.code as string}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyCode(item.code as string);
            }}
          >
            {copiedCode === item.code ? (
              <CheckCircle className="size-3 text-emerald-500" />
            ) : (
              <Copy className="text-muted-foreground size-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      defaultVisible: true,
      render: (item: PromoWithRecord) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {item.name as string}
          </p>
          <p className="text-muted-foreground mt-0.5 max-w-[220px] truncate text-xs">
            {item.description as string}
          </p>
        </div>
      ),
    },
    {
      key: "discountValue",
      label: "Discount",
      icon: Percent,
      defaultVisible: true,
      render: (item: PromoWithRecord) => {
        const isPercentage = (item.discountType as string) === "percentage";
        return (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold",
              isPercentage
                ? "border-rose-200 bg-rose-50/80 text-rose-700"
                : "border-emerald-200 bg-emerald-50/80 text-emerald-700",
            )}
          >
            {isPercentage ? (
              <Percent className="size-3" />
            ) : (
              <DollarSign className="size-3" />
            )}
            {isPercentage
              ? `${item.discountValue}% off`
              : `$${item.discountValue} off`}
          </Badge>
        );
      },
    },
    {
      key: "usedCount",
      label: "Usage",
      icon: Users,
      defaultVisible: true,
      render: (item: PromoWithRecord) => {
        const used = item.usedCount as number;
        const limit = item.usageLimit as number | undefined;
        if (!limit) {
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Users className="size-3.5 text-sky-500" />
              {used} used
            </span>
          );
        }
        const percentage = (used / limit) * 100;
        const barColor =
          percentage >= 90
            ? "bg-rose-500"
            : percentage >= 60
              ? "bg-amber-500"
              : "bg-emerald-500";
        return (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              {used} <span className="text-muted-foreground">/ {limit}</span>
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "startDate",
      label: "Valid Period",
      icon: Calendar,
      defaultVisible: true,
      render: (item: PromoWithRecord) => (
        <div className="inline-flex items-start gap-1.5 text-xs">
          <Calendar className="mt-0.5 size-3.5 text-indigo-500" />
          <div>
            <div className="font-medium text-slate-700">
              {item.startDate as string}
            </div>
            <div className="text-muted-foreground">
              to {item.endDate as string}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "applicableCategories",
      label: "Categories",
      defaultVisible: true,
      render: (item: PromoWithRecord) => {
        const categories = item.applicableCategories as ServiceCategory[];
        if (categories.length === 0) {
          return (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600"
            >
              All
            </Badge>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn(
                  "text-[11px] font-medium capitalize",
                  CATEGORY_CHIP[cat],
                )}
              >
                {cat}
              </Badge>
            ))}
            {categories.length > 2 && (
              <span className="text-muted-foreground px-1 text-xs">
                +{categories.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item: PromoWithRecord) => {
        const isActive = item.isActive as boolean;
        const endDate = new Date(item.endDate as string);
        const isExpired = endDate < new Date();
        const usedCount = item.usedCount as number;
        const usageLimit = item.usageLimit as number | undefined;
        const isExhausted = usageLimit && usedCount >= usageLimit;

        const chipClass =
          "inline-flex items-center gap-1.5 text-[11px] font-medium";

        if (!isActive) {
          return (
            <Badge
              variant="outline"
              className={cn(
                chipClass,
                "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              <span className="size-1.5 rounded-full bg-slate-400" />
              Inactive
            </Badge>
          );
        }
        if (isExpired) {
          return (
            <Badge
              variant="outline"
              className={cn(
                chipClass,
                "border-rose-200 bg-rose-50/80 text-rose-700",
              )}
            >
              <span className="size-1.5 rounded-full bg-rose-500" />
              Expired
            </Badge>
          );
        }
        if (isExhausted) {
          return (
            <Badge
              variant="outline"
              className={cn(
                chipClass,
                "border-amber-200 bg-amber-50/80 text-amber-700",
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              Exhausted
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className={cn(
              chipClass,
              "border-emerald-200 bg-emerald-50/80 text-emerald-700",
            )}
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Active
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "isActive",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
    {
      key: "discountType",
      label: "Discount Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "percentage", label: "Percentage" },
        { value: "flat", label: "Flat Amount" },
      ],
    },
  ];

  const categories: ServiceCategory[] = [
    "boarding",
    "daycare",
    "grooming",
    "training",
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-fuchsia-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Promo Codes
            </CardTitle>
            <Ticket className="size-4 text-fuchsia-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodes.length}</div>
            <p className="text-muted-foreground text-xs">
              {activePromos} active
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-sky-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Redemptions
            </CardTitle>
            <Users className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-emerald-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Redemption Rate
            </CardTitle>
            <TrendingUp className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRedemptionRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">Of limited codes</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-amber-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              First-Time Only
            </CardTitle>
            <DollarSign className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promoCodes.filter((p) => p.isFirstTimeOnly).length}
            </div>
            <p className="text-muted-foreground text-xs">New customer codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Directory */}
      <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Promo Codes</CardTitle>
              <p className="text-muted-foreground text-xs">
                Showing {promoCodes.length} codes · {activePromos} active
              </p>
            </div>
            <Button size="sm" className="shadow-sm" onClick={handleAddNew}>
              <Plus className="mr-2 size-4" />
              Create Promo Code
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative rounded-xl border border-slate-200/80 bg-linear-to-br from-fuchsia-50/50 via-white to-sky-50/50 p-2.5">
            <div className="overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="[&_tbody_td]:py-3 [&_tbody_td]:align-middle [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_thead_th]:bg-slate-50/90 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 [&_thead_th]:uppercase">
                <DataTable
                  data={promoCodes.map((p) => ({ ...p }) as PromoWithRecord)}
                  columns={columns}
                  filters={filters}
                  searchKey={"code" as keyof PromoWithRecord}
                  searchPlaceholder="Search promo codes..."
                  rowClassName={() =>
                    "border-b border-slate-100/80 bg-white/95 [&>td]:py-3"
                  }
                  actions={(item: PromoWithRecord) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCopyCode(item.code as string)}
                        >
                          <Copy className="mr-2 size-4" />
                          Copy Code
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(item as unknown as PromoCode)}
                        >
                          <Edit className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleDeleteClick(item as unknown as PromoCode)
                          }
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? "Edit" : "Create"} Promo Code
            </DialogTitle>
            <DialogDescription>
              {editingPromo
                ? "Update the promo code details."
                : "Create a new promotional discount code."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SUMMER20"
                    className="font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateCode}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Summer Discount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: "percentage" | "flat") =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Discount {formData.discountType === "percentage" ? "%" : "$"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Max Discount ($)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  min="0"
                  value={formData.maxDiscount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchase">Min Purchase ($)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  min="0"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minPurchase: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="No minimum"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      usageLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perCustomer">Per Customer Limit</Label>
                <Input
                  id="perCustomer"
                  type="number"
                  min="1"
                  value={formData.perCustomerLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perCustomerLimit: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={
                      formData.applicableCategories.includes(cat)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Leave empty to apply to all categories
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="firstTime"
                  checked={formData.isFirstTimeOnly}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFirstTimeOnly: checked })
                  }
                />
                <Label htmlFor="firstTime">First-Time Customers Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPromo ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete promo code &quot;
              {deletingPromo?.code}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
