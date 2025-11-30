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
    },
    {
      key: "category",
      label: "Category",
      icon: Tag,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => (
        <Badge variant="outline" className="capitalize">
          {item.category}
        </Badge>
      ),
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => (
        <span className="font-medium">${item.basePrice.toFixed(2)}</span>
      ),
    },
    {
      key: "pricingType",
      label: "Pricing Type",
      icon: Clock,
      defaultVisible: true,
      render: (item: ServiceWithRecord) => (
        <span className="capitalize">{item.pricingType.replace("_", " ")}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item: ServiceWithRecord) => {
        const variant =
          item.status === "active"
            ? "default"
            : item.status === "seasonal"
            ? "secondary"
            : "outline";
        return (
          <Badge variant={variant} className="capitalize">
            {item.status}
          </Badge>
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesPricingStats.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {servicesPricingStats.activeServices} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add-Ons</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesPricingStats.totalAddOns}</div>
            <p className="text-xs text-muted-foreground">Available extras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages Sold</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesPricingStats.packagesSold}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promo Codes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesPricingStats.activePromoCodes}</div>
            <p className="text-xs text-muted-foreground">
              {servicesPricingStats.totalPromoRedemptions} redemptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Services vs Add-ons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "services" ? "default" : "outline"}
            onClick={() => setActiveTab("services")}
          >
            <Package className="mr-2 h-4 w-4" />
            Services ({mainServices.length})
          </Button>
          <Button
            variant={activeTab === "addons" ? "default" : "outline"}
            onClick={() => setActiveTab("addons")}
          >
            <Layers className="mr-2 h-4 w-4" />
            Add-Ons ({addOnServices.length})
          </Button>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab === "services" ? "Service" : "Add-On"}
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={currentData.map((s) => ({ ...s } as ServiceWithRecord))}
        columns={columns}
        filters={filters}
        searchKey={"name" as keyof ServiceWithRecord}
        searchPlaceholder="Search services..."
        actions={(item: ServiceWithRecord) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(item as Service)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteClick(item as Service)}
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
              {editingService ? "Edit" : "Add"} {formData.isAddOn ? "Add-On" : "Service"}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
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
                    setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })
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
                    setFormData({ ...formData, maxPetsPerSlot: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
            {!formData.isAddOn && (
              <div className="space-y-3">
                <Label>Size-Based Pricing Adjustments ($)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="sizeSmall" className="text-xs text-muted-foreground">
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
                    <Label htmlFor="sizeMedium" className="text-xs text-muted-foreground">
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
                    <Label htmlFor="sizeLarge" className="text-xs text-muted-foreground">
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
                    <Label htmlFor="sizeGiant" className="text-xs text-muted-foreground">
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
            <Button variant="outline" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingService ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingService?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
