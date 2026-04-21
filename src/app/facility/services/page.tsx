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
  Package,
  DollarSign,
  Clock,
  Tag,
  Edit,
  Trash2,
  MoreHorizontal,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  services,
  servicesPricingStats,
  type Service,
  type ServiceCategory,
  type PricingType,
  type ServiceStatus,
} from "@/data/services-pricing";
import { StatusBadge } from "@/components/ui/StatusBadge";

const CATEGORY_STYLES: Record<
  ServiceCategory,
  { chip: string; ring: string; iconBg: string; icon: string }
> = {
  boarding: {
    chip: "border-violet-200 bg-violet-50/80 text-violet-700",
    ring: "ring-violet-100",
    iconBg: "bg-violet-50",
    icon: "text-violet-600",
  },
  daycare: {
    chip: "border-sky-200 bg-sky-50/80 text-sky-700",
    ring: "ring-sky-100",
    iconBg: "bg-sky-50",
    icon: "text-sky-600",
  },
  grooming: {
    chip: "border-rose-200 bg-rose-50/80 text-rose-700",
    ring: "ring-rose-100",
    iconBg: "bg-rose-50",
    icon: "text-rose-600",
  },
  training: {
    chip: "border-amber-200 bg-amber-50/80 text-amber-700",
    ring: "ring-amber-100",
    iconBg: "bg-amber-50",
    icon: "text-amber-600",
  },
  retail: {
    chip: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    ring: "ring-emerald-100",
    iconBg: "bg-emerald-50",
    icon: "text-emerald-600",
  },
};

const PRICING_TYPE_STYLES: Record<PricingType, string> = {
  flat: "border-slate-200 bg-slate-50 text-slate-700",
  per_hour: "border-amber-200 bg-amber-50/80 text-amber-700",
  per_day: "border-sky-200 bg-sky-50/80 text-sky-700",
  per_session: "border-indigo-200 bg-indigo-50/80 text-indigo-700",
};

type ServiceWithRecord = Service & Record<string, unknown>;

export default function ServicesCatalogPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState<"services" | "addons">("services");

  const [formData, setFormData] = useState({
    name: "",
    category: "daycare" as ServiceCategory,
    description: "",
    basePrice: 0,
    pricingType: "per_day" as PricingType,
    duration: 0,
    status: "active" as ServiceStatus,
    isAddOn: false,
    requiresBooking: true,
    maxPetsPerSlot: 10,
    sizePricing: {
      small: 0,
      medium: 0,
      large: 0,
      giant: 0,
    },
  });

  const mainServices = services.filter((s) => !s.isAddOn);
  const addOnServices = services.filter((s) => s.isAddOn);

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
      name: "",
      category: "daycare",
      description: "",
      basePrice: 0,
      pricingType: "per_day",
      duration: 0,
      status: "active",
      isAddOn: activeTab === "addons",
      requiresBooking: true,
      maxPetsPerSlot: 10,
      sizePricing: {
        small: 0,
        medium: 0,
        large: 0,
        giant: 0,
      },
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const sizePricing = {
      small: 0,
      medium: 0,
      large: 0,
      giant: 0,
    };
    service.sizePricing.forEach((sp) => {
      sizePricing[sp.size] = sp.priceModifier;
    });
    setFormData({
      name: service.name,
      category: service.category,
      description: service.description,
      basePrice: service.basePrice,
      pricingType: service.pricingType,
      duration: service.duration || 0,
      status: service.status,
      isAddOn: service.isAddOn,
      requiresBooking: service.requiresBooking,
      maxPetsPerSlot: service.maxPetsPerSlot || 10,
      sizePricing,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (service: Service) => {
    setDeletingService(service);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    // In a real app, this would delete from the backend
    setIsDeleteModalOpen(false);
    setDeletingService(null);
  };

  const columns: ColumnDef<ServiceWithRecord>[] = [
    {
      key: "name",
      label: "Service Name",
      icon: Package,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => {
        const styles = CATEGORY_STYLES[item.category as ServiceCategory];
        return (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full ring-2",
                styles.iconBg,
                styles.ring,
              )}
            >
              {item.isAddOn ? (
                <Layers className={cn("size-4", styles.icon)} />
              ) : (
                <Package className={cn("size-4", styles.icon)} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {item.name}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {item.description}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      label: "Category",
      icon: Tag,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => {
        const styles = CATEGORY_STYLES[item.category as ServiceCategory];
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-medium capitalize",
              styles.chip,
            )}
          >
            {item.category}
          </Badge>
        );
      },
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <DollarSign className="size-3.5 text-emerald-500" />
          {item.basePrice.toFixed(2)}
        </span>
      ),
    },
    {
      key: "pricingType",
      label: "Pricing Type",
      icon: Clock,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => (
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium capitalize",
            PRICING_TYPE_STYLES[item.pricingType as PricingType],
          )}
        >
          <Clock className="size-3" />
          {item.pricingType.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item: ServiceWithRecord) => {
        if (item.status === "seasonal") {
          return (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50/80 text-[11px] font-medium text-amber-700 capitalize"
            >
              Seasonal
            </Badge>
          );
        }
        return (
          <StatusBadge
            type="status"
            value={item.status as "active" | "inactive"}
          />
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "boarding", label: "Boarding" },
        { value: "daycare", label: "Daycare" },
        { value: "grooming", label: "Grooming" },
        { value: "training", label: "Training" },
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "seasonal", label: "Seasonal" },
      ],
    },
  ];

  const currentData = activeTab === "services" ? mainServices : addOnServices;

  return (
    <div className="space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-sky-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Services
            </CardTitle>
            <Package className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servicesPricingStats.totalServices}
            </div>
            <p className="text-muted-foreground text-xs">
              {servicesPricingStats.activeServices} active
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-emerald-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add-Ons</CardTitle>
            <Layers className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servicesPricingStats.totalAddOns}
            </div>
            <p className="text-muted-foreground text-xs">Available extras</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-violet-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages Sold</CardTitle>
            <Tag className="size-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servicesPricingStats.packagesSold}
            </div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-indigo-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Promo Codes
            </CardTitle>
            <DollarSign className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {servicesPricingStats.activePromoCodes}
            </div>
            <p className="text-muted-foreground text-xs">
              {servicesPricingStats.totalPromoRedemptions} redemptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services & Add-Ons Directory */}
      <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {activeTab === "services"
                  ? "Services Catalog"
                  : "Add-Ons Catalog"}
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Showing {currentData.length}{" "}
                {activeTab === "services" ? "services" : "add-ons"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Catalog type"
                className="inline-flex rounded-lg border border-slate-200/80 bg-slate-50/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "services"}
                  onClick={() => setActiveTab("services")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "services"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                      : "text-muted-foreground hover:text-slate-900",
                  )}
                >
                  <Package
                    className={cn(
                      "size-3.5",
                      activeTab === "services"
                        ? "text-sky-600"
                        : "text-muted-foreground",
                    )}
                  />
                  Services
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 rounded-full px-1.5 text-[10px] font-medium",
                      activeTab === "services"
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {mainServices.length}
                  </Badge>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "addons"}
                  onClick={() => setActiveTab("addons")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "addons"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                      : "text-muted-foreground hover:text-slate-900",
                  )}
                >
                  <Layers
                    className={cn(
                      "size-3.5",
                      activeTab === "addons"
                        ? "text-emerald-600"
                        : "text-muted-foreground",
                    )}
                  />
                  Add-Ons
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 rounded-full px-1.5 text-[10px] font-medium",
                      activeTab === "addons"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {addOnServices.length}
                  </Badge>
                </button>
              </div>

              <Button size="sm" className="shadow-sm" onClick={handleAddNew}>
                <Plus className="mr-2 size-4" />
                Add {activeTab === "services" ? "Service" : "Add-On"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative rounded-xl border border-slate-200/80 bg-linear-to-br from-sky-50/60 via-white to-indigo-50/50 p-2.5">
            <div className="overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="[&_tbody_td]:py-3 [&_tbody_td]:align-middle [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200 [&_thead_th]:bg-slate-50/90 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 [&_thead_th]:uppercase">
                <DataTable
                  data={currentData.map(
                    (s) => ({ ...s }) as ServiceWithRecord,
                  )}
                  columns={columns}
                  filters={filters}
                  searchKey={"name" as keyof ServiceWithRecord}
                  searchPlaceholder={
                    activeTab === "services"
                      ? "Search services..."
                      : "Search add-ons..."
                  }
                  rowClassName={() =>
                    "border-b border-slate-100/80 bg-white/95 [&>td]:py-3"
                  }
                  actions={(item: ServiceWithRecord) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(item as Service)}
                        >
                          <Edit className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(item as Service)}
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
              {editingService ? "Edit" : "Add"}{" "}
              {formData.isAddOn ? "Add-On" : "Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the service details below."
                : "Fill in the details to create a new service."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Service name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ServiceCategory) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boarding">Boarding</SelectItem>
                    <SelectItem value="daycare">Daycare</SelectItem>
                    <SelectItem value="grooming">Grooming</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
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
                placeholder="Describe the service..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricingType">Pricing Type</Label>
                <Select
                  value={formData.pricingType}
                  onValueChange={(value: PricingType) =>
                    setFormData({ ...formData, pricingType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="per_hour">Per Hour</SelectItem>
                    <SelectItem value="per_day">Per Day</SelectItem>
                    <SelectItem value="per_session">Per Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ServiceStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPets">Max Pets per Slot</Label>
                <Input
                  id="maxPets"
                  type="number"
                  min="1"
                  value={formData.maxPetsPerSlot}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxPetsPerSlot: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            {!formData.isAddOn && (
              <div className="space-y-3">
                <Label>Size-Based Pricing Adjustments ($)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="sizeSmall"
                      className="text-muted-foreground text-xs"
                    >
                      Small
                    </Label>
                    <Input
                      id="sizeSmall"
                      type="number"
                      min="0"
                      value={formData.sizePricing.small}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sizePricing: {
                            ...formData.sizePricing,
                            small: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="sizeMedium"
                      className="text-muted-foreground text-xs"
                    >
                      Medium
                    </Label>
                    <Input
                      id="sizeMedium"
                      type="number"
                      min="0"
                      value={formData.sizePricing.medium}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sizePricing: {
                            ...formData.sizePricing,
                            medium: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="sizeLarge"
                      className="text-muted-foreground text-xs"
                    >
                      Large
                    </Label>
                    <Input
                      id="sizeLarge"
                      type="number"
                      min="0"
                      value={formData.sizePricing.large}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sizePricing: {
                            ...formData.sizePricing,
                            large: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="sizeGiant"
                      className="text-muted-foreground text-xs"
                    >
                      Giant
                    </Label>
                    <Input
                      id="sizeGiant"
                      type="number"
                      min="0"
                      value={formData.sizePricing.giant}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sizePricing: {
                            ...formData.sizePricing,
                            giant: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="requiresBooking"
                checked={formData.requiresBooking}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresBooking: checked })
                }
              />
              <Label htmlFor="requiresBooking">Requires Advance Booking</Label>
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
              {editingService ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingService?.name}
              &quot;? This action cannot be undone.
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
