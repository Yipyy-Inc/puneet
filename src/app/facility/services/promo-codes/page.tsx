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

type PromoWithRecord = PromoCode & Record<string, unknown>;

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
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">
            {item.code as string}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyCode(item.code as string);
            }}
          >
            {copiedCode === item.code ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
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
        <div>
          <div className="font-medium">{item.name as string}</div>
          <div className="text-xs text-muted-foreground max-w-[200px] truncate">
            {item.description as string}
          </div>
        </div>
      ),
    },
    {
      key: "discountValue",
      label: "Discount",
      icon: Percent,
      defaultVisible: true,
      render: (item: PromoWithRecord) => (
        <Badge variant="secondary">
          {(item.discountType as string) === "percentage"
            ? `${item.discountValue}%`
            : `$${item.discountValue}`}{" "}
          off
        </Badge>
      ),
    },
    {
      key: "usedCount",
      label: "Usage",
      icon: Users,
      defaultVisible: true,
      render: (item: PromoWithRecord) => {
        const used = item.usedCount as number;
        const limit = item.usageLimit as number | undefined;
        if (!limit) return <span>{used} used</span>;
        const percentage = (used / limit) * 100;
        return (
          <div className="space-y-1">
            <span>
              {used} / {limit}
            </span>
            <div className="h-1.5 w-16 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
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
        <div className="text-sm">
          <div>{item.startDate as string}</div>
          <div className="text-muted-foreground">
            to {item.endDate as string}
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
        if (categories.length === 0)
          return <Badge variant="outline">All</Badge>;
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="outline" className="capitalize text-xs">
                {cat}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{categories.length - 2}
              </Badge>
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

        if (!isActive) return <Badge variant="outline">Inactive</Badge>;
        if (isExpired) return <Badge variant="destructive">Expired</Badge>;
        if (isExhausted) return <Badge variant="secondary">Exhausted</Badge>;
        return <Badge variant="default">Active</Badge>;
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Promo Codes
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodes.length}</div>
            <p className="text-xs text-muted-foreground">
              {activePromos} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Redemptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Redemption Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRedemptionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Of limited codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              First-Time Only
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promoCodes.filter((p) => p.isFirstTimeOnly).length}
            </div>
            <p className="text-xs text-muted-foreground">New customer codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Promo Code
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={promoCodes.map((p) => ({ ...p }) as PromoWithRecord)}
        columns={columns}
        filters={filters}
        searchKey={"code" as keyof PromoWithRecord}
        searchPlaceholder="Search promo codes..."
        actions={(item: PromoWithRecord) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleCopyCode(item.code as string)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(item as unknown as PromoCode)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteClick(item as unknown as PromoCode)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <p className="text-xs text-muted-foreground">
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
