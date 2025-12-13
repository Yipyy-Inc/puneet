"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  Package,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Star,
  TrendingUp,
  Edit2,
  Image as ImageIcon,
} from "lucide-react";
import { daycarePackages, DaycarePackage } from "@/data/daycare";

interface AddOn {
  id: string;
  name: string;
  description: string;
  image: string;
  hasUnits: boolean;
  pricePerUnit?: number;
  unit?: string;
  basePrice?: number;
}

export default function DaycarePackagesPage() {
  const [activeTab, setActiveTab] = useState("packages");
  const [packages, setPackages] = useState<DaycarePackage[]>(daycarePackages);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<DaycarePackage | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState<DaycarePackage | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rateType: "full-day" as "hourly" | "half-day" | "full-day",
    quantity: 5,
    price: 0,
    savings: 0,
    validityDays: 60,
    isActive: true,
    popular: false,
  });

  // Add-ons state
  const [addOns, setAddOns] = useState<AddOn[]>([
    {
      id: "extended-walk",
      name: "Extended Walk",
      description:
        "Additional 30-minute walk session for your pet to burn extra energy and explore",
      image: "/images/addons/extended-walk.jpg",
      hasUnits: true,
      pricePerUnit: 15,
      unit: "walk",
    },
    {
      id: "playtime-plus",
      name: "Playtime Plus",
      description:
        "Extra supervised play session with interactive toys and games",
      image: "/images/addons/playtime-plus.jpg",
      hasUnits: true,
      pricePerUnit: 12,
      unit: "session",
    },
    {
      id: "training-session",
      name: "Mini Training Session",
      description:
        "Quick 15-minute basic obedience training session during daycare",
      image: "/images/addons/training-session.jpg",
      hasUnits: false,
      basePrice: 25,
    },
  ]);

  const [addOnDialogOpen, setAddOnDialogOpen] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);
  const [addOnForm, setAddOnForm] = useState<AddOn>({
    id: "",
    name: "",
    description: "",
    image: "",
    hasUnits: true,
    pricePerUnit: 0,
    unit: "",
    basePrice: 0,
  });

  const handleAddNew = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      rateType: "full-day",
      quantity: 5,
      price: 0,
      savings: 0,
      validityDays: 60,
      isActive: true,
      popular: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (pkg: DaycarePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      rateType: pkg.rateType,
      quantity: pkg.quantity,
      price: pkg.price,
      savings: pkg.savings,
      validityDays: pkg.validityDays,
      isActive: pkg.isActive,
      popular: pkg.popular || false,
    });
    setIsModalOpen(true);
  };

  const openAddOnDialog = (addOn?: AddOn) => {
    if (addOn) {
      setEditingAddOn(addOn);
      setAddOnForm(addOn);
    } else {
      setEditingAddOn(null);
      setAddOnForm({
        id: `addon-${Date.now()}`,
        name: "",
        description: "",
        image: "",
        hasUnits: true,
        pricePerUnit: 0,
        unit: "",
        basePrice: 0,
      });
    }
    setAddOnDialogOpen(true);
  };

  const saveAddOn = () => {
    if (editingAddOn) {
      setAddOns(addOns.map((a) => (a.id === addOnForm.id ? addOnForm : a)));
    } else {
      setAddOns([...addOns, addOnForm]);
    }
    setAddOnDialogOpen(false);
  };

  const deleteAddOn = (id: string) => {
    setAddOns(addOns.filter((a) => a.id !== id));
  };

  const handleAddOnImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddOnForm({ ...addOnForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (editingPackage) {
      setPackages(
        packages.map((p) =>
          p.id === editingPackage.id
            ? {
                ...p,
                ...formData,
              }
            : p,
        ),
      );
    } else {
      const newPackage: DaycarePackage = {
        id: `pkg-${Date.now()}`,
        ...formData,
      };
      setPackages([...packages, newPackage]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (pkg: DaycarePackage) => {
    setDeletingPackage(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingPackage) {
      setPackages(packages.filter((p) => p.id !== deletingPackage.id));
    }
    setIsDeleteModalOpen(false);
    setDeletingPackage(null);
  };

  const handleToggleActive = (pkgId: string) => {
    setPackages(
      packages.map((p) =>
        p.id === pkgId ? { ...p, isActive: !p.isActive } : p,
      ),
    );
  };

  const handleTogglePopular = (pkgId: string) => {
    setPackages(
      packages.map((p) => (p.id === pkgId ? { ...p, popular: !p.popular } : p)),
    );
  };

  const columns: ColumnDef<DaycarePackage>[] = [
    {
      key: "name",
      label: "Package Name",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${item.isActive ? "bg-success" : "bg-muted"}`}
          />
          <span className="font-medium">{item.name}</span>
          {item.popular && (
            <Badge variant="warning" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "rateType",
      label: "Type",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            item.rateType === "full-day"
              ? "default"
              : item.rateType === "half-day"
                ? "secondary"
                : "outline"
          }
        >
          {item.rateType.replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "quantity",
      label: "Quantity",
      defaultVisible: true,
      render: (item) => (
        <span>
          {item.quantity} {item.rateType === "hourly" ? "hours" : "days"}
        </span>
      ),
    },
    {
      key: "price",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => <span className="font-semibold">${item.price}</span>,
    },
    {
      key: "savings",
      label: "Savings",
      icon: TrendingUp,
      defaultVisible: true,
      render: (item) => (
        <Badge variant="success" className="text-xs">
          Save ${item.savings}
        </Badge>
      ),
    },
    {
      key: "validityDays",
      label: "Validity",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => <span>{item.validityDays} days</span>,
    },
    {
      key: "isActive",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Switch
          checked={item.isActive}
          onCheckedChange={() => handleToggleActive(item.id)}
        />
      ),
    },
  ];

  // Summary stats
  const activePackages = packages.filter((p) => p.isActive).length;
  const popularPackages = packages.filter((p) => p.popular).length;
  const totalSavings = packages.reduce((acc, p) => acc + p.savings, 0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{packages.length}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Packages
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Package className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activePackages}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Star className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{popularPackages}</p>
                    <p className="text-sm text-muted-foreground">Featured</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${totalSavings}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Savings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Package Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages
              .filter((p) => p.isActive)
              .map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden hover:shadow-md transition-shadow ${
                    pkg.popular ? "ring-2 ring-warning" : ""
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="warning">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      pkg.rateType === "full-day"
                        ? "bg-primary"
                        : pkg.rateType === "half-day"
                          ? "bg-secondary"
                          : "bg-muted-foreground"
                    }`}
                  />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">${pkg.price}</span>
                        <Badge variant="success" className="text-xs">
                          Save ${pkg.savings}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pkg.description}
                      </p>
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Includes:
                          </span>
                          <span className="font-medium">
                            {pkg.quantity}{" "}
                            {pkg.rateType === "hourly" ? "hours" : "days"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Valid for:
                          </span>
                          <span className="font-medium">
                            {pkg.validityDays} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Rate type:
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {pkg.rateType.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(pkg)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePopular(pkg.id)}
                        >
                          <Star
                            className={`h-4 w-4 ${pkg.popular ? "fill-warning text-warning" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Packages Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Packages</CardTitle>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={packages}
                columns={columns}
                searchKey="name"
                searchPlaceholder="Search packages..."
                actions={(item) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Add/Edit Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? "Edit Package" : "Add New Package"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., 10-Day Pass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what's included..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rate Type</Label>
                    <Select
                      value={formData.rateType}
                      onValueChange={(
                        value: "hourly" | "half-day" | "full-day",
                      ) => setFormData({ ...formData, rateType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="half-day">Half-Day</SelectItem>
                        <SelectItem value="full-day">Full-Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Quantity (
                      {formData.rateType === "hourly" ? "hours" : "days"})
                    </Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Package Price ($)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Savings Amount ($)</Label>
                    <Input
                      type="number"
                      value={formData.savings}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          savings: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Validity (days)</Label>
                  <Input
                    type="number"
                    value={formData.validityDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validityDays: parseInt(e.target.value) || 30,
                      })
                    }
                    placeholder="60"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.popular}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, popular: checked })
                      }
                    />
                    <Label>Mark as Popular</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.name}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingPackage ? "Save Changes" : "Add Package"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Modal */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Package</DialogTitle>
              </DialogHeader>
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deletingPackage?.name}</span>?
                This action cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="addons" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Add-on Services</h3>
              <p className="text-sm text-muted-foreground">
                Additional services clients can purchase with daycare
              </p>
            </div>
            <Button onClick={() => openAddOnDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {addOns.map((addOn) => (
              <Card key={addOn.id}>
                <CardContent className="p-0">
                  {addOn.image && (
                    <div className="relative w-full h-48 rounded-t-lg overflow-hidden">
                      <Image
                        src={addOn.image}
                        alt={addOn.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{addOn.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {addOn.description}
                    </p>
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Pricing:
                        </span>
                        <span className="font-semibold text-lg">
                          {addOn.hasUnits
                            ? `$${addOn.pricePerUnit} per ${addOn.unit}`
                            : `$${addOn.basePrice}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openAddOnDialog(addOn)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteAddOn(addOn.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {addOns.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground mb-4">
                  No add-on services configured yet
                </p>
                <Button onClick={() => openAddOnDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Service
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Add-on Dialog */}
          <Dialog open={addOnDialogOpen} onOpenChange={setAddOnDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingAddOn ? "Edit Add-on Service" : "Add Add-on Service"}
                </DialogTitle>
                <DialogDescription>
                  Configure additional service details and pricing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    value={addOnForm.name}
                    onChange={(e) =>
                      setAddOnForm({ ...addOnForm, name: e.target.value })
                    }
                    placeholder="e.g., Extended Walk"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={addOnForm.description}
                    onChange={(e) =>
                      setAddOnForm({
                        ...addOnForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of the service"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Image</Label>
                  {addOnForm.image && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 border">
                      <Image
                        src={addOnForm.image}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={addOnForm.image}
                      onChange={(e) =>
                        setAddOnForm({ ...addOnForm, image: e.target.value })
                      }
                      placeholder="/images/addons/..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("addonImageUpload")?.click()
                      }
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <input
                      id="addonImageUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAddOnImageUpload}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={addOnForm.hasUnits}
                    onCheckedChange={(checked) =>
                      setAddOnForm({ ...addOnForm, hasUnits: checked })
                    }
                  />
                  <Label>Unit-based Pricing</Label>
                </div>
                {addOnForm.hasUnits ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price per Unit ($)</Label>
                      <Input
                        type="number"
                        value={addOnForm.pricePerUnit || 0}
                        onChange={(e) =>
                          setAddOnForm({
                            ...addOnForm,
                            pricePerUnit: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Name</Label>
                      <Input
                        value={addOnForm.unit || ""}
                        onChange={(e) =>
                          setAddOnForm({ ...addOnForm, unit: e.target.value })
                        }
                        placeholder="e.g., walk, session"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Base Price ($)</Label>
                    <Input
                      type="number"
                      value={addOnForm.basePrice || 0}
                      onChange={(e) =>
                        setAddOnForm({
                          ...addOnForm,
                          basePrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="25"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddOnDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveAddOn}>Save Service</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
