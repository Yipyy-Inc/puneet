"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { inventory } from "@/data/inventory";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Download,
  Package,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";

const exportInventoryToCSV = (inventoryData: typeof inventory) => {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Quantity",
    "Unit",
    "Supplier",
    "Status",
    "Reorder Point",
    "Last Restocked",
    "Cost Per Unit",
  ];

  const csvContent = [
    headers.join(","),
    ...inventoryData.map((item) =>
      [
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        item.category,
        item.quantity,
        item.unit,
        `"${item.supplier.replace(/"/g, '""')}"`,
        item.status,
        item.reorderPoint,
        item.lastRestocked,
        item.costPerUnit,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `inventory_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const categories = [
  "Food",
  "Toys",
  "Cleaning",
  "Bedding",
  "Grooming",
  "Litter",
  "Medical",
  "Treats",
  "Accessories",
];

const units = ["pieces", "bags", "bottles", "cans", "boxes", "packs", "beds"];

export default function InventoryPage() {
  const t = useTranslations("inventory");
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    (typeof inventory)[number] | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<
    (typeof inventory)[number] | null
  >(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderingItem, setReorderingItem] = useState<
    (typeof inventory)[number] | null
  >(null);
  const [reorderQuantity, setReorderQuantity] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Food",
    quantity: 0,
    unit: "pieces",
    supplier: "",
    reorderPoint: 0,
    costPerUnit: 0,
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityInventory = inventory.filter(
    (item) => item.facility === facility.name,
  );

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Food",
      quantity: 0,
      unit: "pieces",
      supplier: "",
      reorderPoint: 0,
      costPerUnit: 0,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (item: (typeof inventory)[number]) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      supplier: item.supplier,
      reorderPoint: item.reorderPoint,
      costPerUnit: item.costPerUnit,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveItem = () => {
    // TODO: Save to backend
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (item: (typeof inventory)[number]) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    // TODO: Delete from backend
    setIsDeleteModalOpen(false);
    setDeletingItem(null);
  };

  const handleReorderClick = (item: (typeof inventory)[number]) => {
    setReorderingItem(item);
    setReorderQuantity(item.reorderPoint * 2); // Suggest double the reorder point
    setIsReorderModalOpen(true);
  };

  const handleReorderConfirm = () => {
    // TODO: Create purchase order
    setIsReorderModalOpen(false);
    setReorderingItem(null);
  };

  const columns: ColumnDef<(typeof inventory)[number]>[] = [
    {
      key: "name",
      label: "Name",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "category",
      label: "Category",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "quantity",
      label: "Quantity",
      icon: Package,
      defaultVisible: true,
      render: (item) => {
        const isLow = item.quantity <= item.reorderPoint;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? "text-warning font-semibold" : ""}>
              {item.quantity} {item.unit}
            </span>
            {isLow && <TrendingDown className="h-4 w-4 text-warning" />}
          </div>
        );
      },
    },
    {
      key: "supplier",
      label: "Supplier",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      icon: Package,
      defaultVisible: true,
      render: (item) => <StatusBadge type="inventory" value={item.status} />,
    },
    {
      key: "reorderPoint",
      label: "Reorder Point",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "lastRestocked",
      label: "Last Restocked",
      icon: Package,
      defaultVisible: true,
    },
    {
      key: "costPerUnit",
      label: "Cost/Unit",
      icon: Package,
      defaultVisible: true,
      render: (item) => `$${item.costPerUnit.toFixed(2)}`,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "in_stock", label: "In Stock" },
        { value: "low_stock", label: "Low Stock" },
        { value: "out_of_stock", label: "Out of Stock" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        ...categories.map((cat) => ({ value: cat, label: cat })),
      ],
    },
  ];

  // Calculate stats
  const totalItems = facilityInventory.length;
  const lowStockItems = facilityInventory.filter(
    (item) => item.quantity <= item.reorderPoint,
  ).length;
  const totalValue = facilityInventory.reduce(
    (sum, item) => sum + item.quantity * item.costPerUnit,
    0,
  );
  const uniqueCategories = new Set(
    facilityInventory.map((item) => item.category),
  ).size;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Inventory Management - {facility.name}
          </h2>
          <p className="text-muted-foreground">
            Track and manage your facility supplies and stock levels
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addItem")}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportInventoryToCSV(facilityInventory)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems > 0 && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {lowStockItems} item{lowStockItems > 1 ? "s" : ""} need
              reordering. Review and create purchase orders to maintain stock
              levels.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalValue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("outOfStock")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">
              Different categories
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={facilityInventory}
        columns={columns}
        filters={filters}
        searchKey="name"
        searchPlaceholder={t("searchItems")}
        itemsPerPage={10}
        actions={(item) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {item.quantity <= item.reorderPoint && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReorderClick(item)}
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClick(item)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      {/* Add/Edit Item Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update inventory item details and stock levels."
                : "Add a new item to your facility inventory."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Dog Food - Premium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Current Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point *</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorderPoint: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPerUnit">Cost per Unit ($) *</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPerUnit: parseFloat(e.target.value) || 0,
                    })
                  }
                />
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
            <Button onClick={handleSaveItem}>
              {editingItem ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Modal */}
      <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Reorder {reorderingItem?.name} from {reorderingItem?.supplier}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <div className="text-2xl font-bold">
                  {reorderingItem?.quantity} {reorderingItem?.unit}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <div className="text-2xl font-bold text-warning">
                  {reorderingItem?.reorderPoint} {reorderingItem?.unit}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderQty">Order Quantity *</Label>
              <Input
                id="reorderQty"
                type="number"
                min="1"
                value={reorderQuantity}
                onChange={(e) =>
                  setReorderQuantity(parseInt(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                Suggested: {(reorderingItem?.reorderPoint || 0) * 2}{" "}
                {reorderingItem?.unit}
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cost per unit:</span>
                <span className="font-medium">
                  ${reorderingItem?.costPerUnit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span className="font-medium">{reorderQuantity}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Cost:</span>
                <span>
                  $
                  {(
                    (reorderingItem?.costPerUnit || 0) * reorderQuantity
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReorderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReorderConfirm}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingItem?.name} from your
              inventory? This action cannot be undone.
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
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
