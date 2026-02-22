"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Star,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  groomingPackages,
  type GroomingPackage,
  getActiveStylists,
  groomingProducts,
  type ProductUsage,
} from "@/data/grooming";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Users, FileCheck } from "lucide-react";

type PackageWithRecord = GroomingPackage & Record<string, unknown>;

export default function GroomingPackagesPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<GroomingPackage | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] =
    useState<GroomingPackage | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: 0,
    duration: 60,
    sizePricing: {
      small: 0,
      medium: 0,
      large: 0,
      giant: 0,
    },
    includes: "",
    isActive: true,
    isPopular: false,
    assignedStylistIds: [] as string[],
    requiresEvaluation: false,
    productUsage: [] as ProductUsage[],
  });

  const [newProductUsage, setNewProductUsage] = useState({
    productId: "",
    quantity: 0,
    unit: "",
    isOptional: false,
  });

  const activeStylists = getActiveStylists();
  const activeProducts = groomingProducts.filter((p) => p.isActive);

  // Stats
  const activePackages = groomingPackages.filter((p) => p.isActive).length;
  const totalSold = groomingPackages.reduce(
    (sum, p) => sum + p.purchaseCount,
    0,
  );
  const avgPrice =
    groomingPackages.reduce((sum, p) => sum + p.basePrice, 0) /
    groomingPackages.length;
  const popularPackage = groomingPackages.reduce((prev, curr) =>
    curr.purchaseCount > prev.purchaseCount ? curr : prev,
  );

  const handleAddNew = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      basePrice: 0,
      duration: 60,
      sizePricing: {
        small: 0,
        medium: 0,
        large: 0,
        giant: 0,
      },
      includes: "",
      isActive: true,
      isPopular: false,
      assignedStylistIds: [],
      requiresEvaluation: false,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (pkg: GroomingPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      basePrice: pkg.basePrice,
      duration: pkg.duration,
      sizePricing: { ...pkg.sizePricing },
      includes: pkg.includes.join("\n"),
      isActive: pkg.isActive,
      isPopular: pkg.isPopular || false,
      assignedStylistIds: pkg.assignedStylistIds || [],
      requiresEvaluation: pkg.requiresEvaluation || false,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (pkg: GroomingPackage) => {
    setDeletingPackage(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    // In a real app, this would delete from the backend
    setIsDeleteModalOpen(false);
  };

  const columns: ColumnDef<PackageWithRecord>[] = [
    {
      key: "name",
      label: "Package",
      icon: Package,
      defaultVisible: true,
      render: (pkg) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{pkg.name}</span>
            {pkg.isPopular && (
              <Badge className="bg-yellow-100 text-yellow-700">
                <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                Popular
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-xs">
            {pkg.description}
          </p>
        </div>
      ),
    },
    {
      key: "basePrice",
      label: "Base Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (pkg) => `$${pkg.basePrice}`,
    },
    {
      key: "sizePricing",
      label: "Size Pricing",
      defaultVisible: true,
      render: (pkg) => (
        <div className="text-sm space-y-0.5">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              S: ${pkg.sizePricing.small}
            </Badge>
            <Badge variant="outline" className="text-xs">
              M: ${pkg.sizePricing.medium}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              L: ${pkg.sizePricing.large}
            </Badge>
            <Badge variant="outline" className="text-xs">
              XL: ${pkg.sizePricing.giant}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      icon: Clock,
      defaultVisible: true,
      render: (pkg) => (
        <div className="flex items-center gap-2">
          <span>{pkg.duration} min</span>
          <Badge variant="outline" className="text-xs">
            Auto-scheduled
          </Badge>
        </div>
      ),
    },
    {
      key: "stylists",
      label: "Assigned Stylists",
      icon: Users,
      defaultVisible: false,
      render: (pkg) => {
        if (!pkg.assignedStylistIds || pkg.assignedStylistIds.length === 0) {
          return <Badge variant="outline">All Stylists</Badge>;
        }
        return (
          <Badge variant="secondary">
            {pkg.assignedStylistIds.length} stylist(s)
          </Badge>
        );
      },
    },
    {
      key: "evaluation",
      label: "Evaluation",
      icon: FileCheck,
      defaultVisible: false,
      render: (pkg) =>
        pkg.requiresEvaluation ? (
          <Badge className="bg-orange-100 text-orange-700">Required</Badge>
        ) : (
          <Badge variant="outline">Not Required</Badge>
        ),
    },
    {
      key: "purchaseCount",
      label: "Sold",
      icon: TrendingUp,
      defaultVisible: true,
      render: (pkg) => pkg.purchaseCount.toLocaleString(),
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (pkg) =>
        pkg.isActive ? (
          <Badge className="bg-green-100 text-green-700">Active</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (pkg) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(pkg)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(pkg)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "isActive",
      label: "Status",
      options: [
        { value: "all", label: "All Packages" },
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePackages}</div>
            <p className="text-xs text-muted-foreground">
              of {groomingPackages.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSold.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPrice.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Base price average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {popularPackage.name}
            </div>
            <p className="text-xs text-muted-foreground">
              {popularPackage.purchaseCount} sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grooming Packages</CardTitle>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={groomingPackages as PackageWithRecord[]}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search packages..."
            searchKey={"name" as keyof PackageWithRecord}
          />
        </CardContent>
      </Card>

      {/* Package Details Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groomingPackages
          .filter((p) => p.isActive)
          .map((pkg) => (
            <Card key={pkg.id} className="relative overflow-hidden">
              {pkg.isPopular && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {pkg.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${pkg.basePrice}</span>
                  <span className="text-muted-foreground">base price</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{pkg.duration} minutes</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Includes:</p>
                  <ul className="text-sm space-y-1">
                    {pkg.includes.slice(0, 5).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                    {pkg.includes.length > 5 && (
                      <li className="text-muted-foreground">
                        +{pkg.includes.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Price by size:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      Small: ${pkg.sizePricing.small}
                    </Badge>
                    <Badge variant="secondary">
                      Medium: ${pkg.sizePricing.medium}
                    </Badge>
                    <Badge variant="secondary">
                      Large: ${pkg.sizePricing.large}
                    </Badge>
                    <Badge variant="secondary">
                      Giant: ${pkg.sizePricing.giant}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Add New Package"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below."
                : "Create a new grooming package for customers to book."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  Duration (minutes)
                  <Badge variant="outline" className="text-xs">
                    Auto-scheduled
                  </Badge>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This duration is automatically used when scheduling appointments.
                  End time is calculated as start time + duration.
                </p>
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
            <div className="space-y-2">
              <Label>Pricing by Size</Label>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="priceSmall" className="text-xs">
                    Small
                  </Label>
                  <Input
                    id="priceSmall"
                    type="number"
                    value={formData.sizePricing.small}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          small: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="priceMedium" className="text-xs">
                    Medium
                  </Label>
                  <Input
                    id="priceMedium"
                    type="number"
                    value={formData.sizePricing.medium}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          medium: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="priceLarge" className="text-xs">
                    Large
                  </Label>
                  <Input
                    id="priceLarge"
                    type="number"
                    value={formData.sizePricing.large}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          large: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="priceGiant" className="text-xs">
                    Giant
                  </Label>
                  <Input
                    id="priceGiant"
                    type="number"
                    value={formData.sizePricing.giant}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sizePricing: {
                          ...formData.sizePricing,
                          giant: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="includes">Services Included (one per line)</Label>
              <Textarea
                id="includes"
                placeholder="Shampoo & conditioner&#10;Nail trim&#10;Ear cleaning"
                value={formData.includes}
                onChange={(e) =>
                  setFormData({ ...formData, includes: e.target.value })
                }
                rows={5}
              />
            </div>

            <Separator />

            {/* Stylist Assignment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign to Specific Stylists (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Leave empty for all stylists
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {activeStylists.map((stylist) => (
                  <div
                    key={stylist.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`stylist-${stylist.id}`}
                      checked={formData.assignedStylistIds.includes(stylist.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            assignedStylistIds: [
                              ...formData.assignedStylistIds,
                              stylist.id,
                            ],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedStylistIds: formData.assignedStylistIds.filter(
                              (id) => id !== stylist.id,
                            ),
                          });
                        }
                      }}
                    />
                    <Label
                      htmlFor={`stylist-${stylist.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <div className="flex items-center justify-between">
                        <span>{stylist.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {stylist.capacity?.skillLevel || "intermediate"}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              {formData.assignedStylistIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.assignedStylistIds.length} stylist(s) selected. Only
                  these stylists can be assigned to appointments using this
                  package.
                </p>
              )}
            </div>

            <Separator />

            {/* Evaluation Requirement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requiresEvaluation" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Requires Evaluation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If enabled, pets must have a valid evaluation before booking
                    this package
                  </p>
                </div>
                <Switch
                  id="requiresEvaluation"
                  checked={formData.requiresEvaluation}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiresEvaluation: checked })
                  }
                />
              </div>
              {formData.requiresEvaluation && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Pets without a valid evaluation will not be able to book
                    this package. Ensure evaluation requirements are clearly
                    communicated to customers.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Product Usage Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Usage (Auto-deducted on completion)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Configure products used for this package
                </p>
              </div>

              {/* Existing Product Usage */}
              {formData.productUsage.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  {formData.productUsage.map((usage, index) => {
                    const product = activeProducts.find((p) => p.id === usage.productId);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-muted"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {usage.productName}
                            </span>
                            {usage.isOptional && (
                              <Badge variant="outline" className="text-xs">
                                Optional
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {usage.quantity} {usage.unit} per service
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveProductUsage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Product Usage */}
              <div className="space-y-2 p-3 border-2 border-dashed rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="product-select" className="text-xs">
                      Product
                    </Label>
                    <Select
                      value={newProductUsage.productId}
                      onValueChange={(value) => {
                        const product = activeProducts.find((p) => p.id === value);
                        setNewProductUsage({
                          ...newProductUsage,
                          productId: value,
                          unit: product?.unit || "",
                        });
                      }}
                    >
                      <SelectTrigger id="product-select" className="h-8">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.brand}) - Stock: {product.currentStock} {product.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quantity" className="text-xs">
                      Quantity per service
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProductUsage.quantity || ""}
                      onChange={(e) =>
                        setNewProductUsage({
                          ...newProductUsage,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="unit" className="text-xs">
                      Unit
                    </Label>
                    <Input
                      id="unit"
                      value={newProductUsage.unit}
                      onChange={(e) =>
                        setNewProductUsage({
                          ...newProductUsage,
                          unit: e.target.value,
                        })
                      }
                      placeholder="ml, oz, bottle, etc."
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isOptional"
                        checked={newProductUsage.isOptional}
                        onCheckedChange={(checked) =>
                          setNewProductUsage({
                            ...newProductUsage,
                            isOptional: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="isOptional" className="text-xs">
                        Optional
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddProductUsage}
                  disabled={!newProductUsage.productId || newProductUsage.quantity <= 0}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Product
                </Button>
              </div>

              {formData.productUsage.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Products will be automatically deducted from inventory when an appointment using this package is completed.
                </p>
            </div>

            <Separator />

            {/* Status Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPopular: checked })
                  }
                />
                <Label htmlFor="isPopular">Mark as Popular</Label>
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
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingPackage?.name}
              &quot;? This action cannot be undone. Existing bookings with this
              package will not be affected.
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
