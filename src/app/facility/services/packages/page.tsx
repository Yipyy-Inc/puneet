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
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  Percent,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  servicePackages,
  services,
  type ServicePackage,
  type ServiceStatus,
} from "@/data/services-pricing";

type PackageWithRecord = ServicePackage & Record<string, unknown>;

export default function PackagesPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState<ServicePackage | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    services: [] as { serviceId: string; quantity: number }[],
    packagePrice: 0,
    validDays: 90,
    status: "active" as ServiceStatus,
  });

  const [newServiceEntry, setNewServiceEntry] = useState({
    serviceId: "",
    quantity: 1,
  });

  const mainServices = services.filter((s) => !s.isAddOn);

  const totalPackagesSold = servicePackages.reduce((sum, p) => sum + p.purchaseCount, 0);
  const totalRevenue = servicePackages.reduce(
    (sum, p) => sum + p.packagePrice * p.purchaseCount,
    0
  );
  const avgSavings =
    servicePackages.reduce((sum, p) => sum + p.savingsPercentage, 0) / servicePackages.length;

  const handleAddNew = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      services: [],
      packagePrice: 0,
      validDays: 90,
      status: "active",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      services: [...pkg.services],
      packagePrice: pkg.packagePrice,
      validDays: pkg.validDays,
      status: pkg.status,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (pkg: ServicePackage) => {
    setDeletingPackage(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    setDeletingPackage(null);
  };

  const addServiceToPackage = () => {
    if (!newServiceEntry.serviceId) return;
    const existingIndex = formData.services.findIndex(
      (s) => s.serviceId === newServiceEntry.serviceId
    );
    if (existingIndex >= 0) {
      const updatedServices = [...formData.services];
      updatedServices[existingIndex].quantity += newServiceEntry.quantity;
      setFormData({ ...formData, services: updatedServices });
    } else {
      setFormData({
        ...formData,
        services: [...formData.services, { ...newServiceEntry }],
      });
    }
    setNewServiceEntry({ serviceId: "", quantity: 1 });
  };

  const removeServiceFromPackage = (serviceId: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter((s) => s.serviceId !== serviceId),
    });
  };

  const calculateTotalValue = () => {
    return formData.services.reduce((sum, s) => {
      const service = services.find((srv) => srv.id === s.serviceId);
      return sum + (service?.basePrice || 0) * s.quantity;
    }, 0);
  };

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "Unknown";
  };

  const columns: ColumnDef<PackageWithRecord>[] = [
    {
      key: "name",
      label: "Package Name",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "services",
      label: "Included Services",
      defaultVisible: true,
      render: (item: PackageWithRecord) => (
        <div className="flex flex-wrap gap-1">
          {(item.services as { serviceId: string; quantity: number }[]).map((s) => (
            <Badge key={s.serviceId} variant="secondary" className="text-xs">
              {s.quantity}x {getServiceName(s.serviceId)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "totalValue",
      label: "Value",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: PackageWithRecord) => (
        <span className="text-muted-foreground">${(item.totalValue as number).toFixed(2)}</span>
      ),
    },
    {
      key: "packagePrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item: PackageWithRecord) => (
        <span className="font-medium">${(item.packagePrice as number).toFixed(2)}</span>
      ),
    },
    {
      key: "savingsPercentage",
      label: "Savings",
      icon: Percent,
      defaultVisible: true,
      render: (item: PackageWithRecord) => (
        <Badge variant="outline" className="text-green-600">
          {(item.savingsPercentage as number).toFixed(1)}% off
        </Badge>
      ),
    },
    {
      key: "validDays",
      label: "Validity",
      icon: Calendar,
      defaultVisible: true,
      render: (item: PackageWithRecord) => <span>{item.validDays as number} days</span>,
    },
    {
      key: "purchaseCount",
      label: "Sold",
      icon: ShoppingBag,
      defaultVisible: true,
      render: (item: PackageWithRecord) => (
        <span className="font-medium">{item.purchaseCount as number}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item: PackageWithRecord) => {
        const variant =
          item.status === "active"
            ? "default"
            : item.status === "seasonal"
            ? "secondary"
            : "outline";
        return (
          <Badge variant={variant} className="capitalize">
            {item.status as string}
          </Badge>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
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

  return (
    <div className="space-y-6 pt-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicePackages.length}</div>
            <p className="text-xs text-muted-foreground">
              {servicePackages.filter((p) => p.status === "active").length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPackagesSold}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Package Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From package sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSavings.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Customer discount</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Package
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={servicePackages.map((p) => ({ ...p } as PackageWithRecord))}
        columns={columns}
        filters={filters}
        searchKey={"name" as keyof PackageWithRecord}
        searchPlaceholder="Search packages..."
        actions={(item: PackageWithRecord) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(item as unknown as ServicePackage)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteClick(item as unknown as ServicePackage)}
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
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit" : "Create"} Package</DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below."
                : "Create a new service package with bundled savings."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daycare 10-Pack"
                />
              </div>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the package..."
                rows={2}
              />
            </div>

            {/* Add Services to Package */}
            <div className="space-y-3">
              <Label>Included Services</Label>
              <div className="flex gap-2">
                <Select
                  value={newServiceEntry.serviceId}
                  onValueChange={(value) =>
                    setNewServiceEntry({ ...newServiceEntry, serviceId: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mainServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.basePrice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  placeholder="Qty"
                  value={newServiceEntry.quantity}
                  onChange={(e) =>
                    setNewServiceEntry({
                      ...newServiceEntry,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <Button type="button" variant="secondary" onClick={addServiceToPackage}>
                  Add
                </Button>
              </div>
              {formData.services.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  {formData.services.map((s) => {
                    const service = services.find((srv) => srv.id === s.serviceId);
                    return (
                      <div key={s.serviceId} className="flex items-center justify-between">
                        <span>
                          {s.quantity}x {service?.name} @ ${service?.basePrice}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            = ${((service?.basePrice || 0) * s.quantity).toFixed(2)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeServiceFromPackage(s.serviceId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 font-medium">
                    Total Value: ${calculateTotalValue().toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packagePrice">Package Price ($)</Label>
                <Input
                  id="packagePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.packagePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, packagePrice: parseFloat(e.target.value) || 0 })
                  }
                />
                {formData.packagePrice > 0 && calculateTotalValue() > 0 && (
                  <p className="text-sm text-green-600">
                    Savings: $
                    {(calculateTotalValue() - formData.packagePrice).toFixed(2)} (
                    {(
                      ((calculateTotalValue() - formData.packagePrice) / calculateTotalValue()) *
                      100
                    ).toFixed(1)}
                    % off)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validDays">Validity (days)</Label>
                <Input
                  id="validDays"
                  type="number"
                  min="1"
                  value={formData.validDays}
                  onChange={(e) =>
                    setFormData({ ...formData, validDays: parseInt(e.target.value) || 90 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingPackage ? "Save Changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingPackage?.name}&quot;? This action
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
