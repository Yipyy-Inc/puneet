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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  BoxesIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  groomingProducts,
  inventoryOrders,
  getInventoryStats,
  getLowStockProducts,
  type GroomingProduct,
  type ProductCategory,
  type InventoryOrder,
} from "@/data/grooming";

type ProductWithRecord = GroomingProduct & Record<string, unknown>;

const categoryLabels: Record<ProductCategory, string> = {
  shampoo: "Shampoo",
  conditioner: "Conditioner",
  styling: "Styling",
  tools: "Tools",
  accessories: "Accessories",
  health: "Health",
  cleaning: "Cleaning",
};

const categoryColors: Record<ProductCategory, string> = {
  shampoo: "bg-blue-100 text-blue-700",
  conditioner: "bg-purple-100 text-purple-700",
  styling: "bg-pink-100 text-pink-700",
  tools: "bg-gray-100 text-gray-700",
  accessories: "bg-yellow-100 text-yellow-700",
  health: "bg-green-100 text-green-700",
  cleaning: "bg-cyan-100 text-cyan-700",
};

const orderStatusColors: Record<InventoryOrder["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  ordered: "bg-blue-100 text-blue-700",
  shipped: "bg-yellow-100 text-yellow-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function InventoryPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GroomingProduct | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] =
    useState<GroomingProduct | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderingProduct, setOrderingProduct] =
    useState<GroomingProduct | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "shampoo" as ProductCategory,
    description: "",
    sku: "",
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitPrice: 0,
    costPrice: 0,
    unit: "",
    supplier: "",
    notes: "",
  });

  const [orderData, setOrderData] = useState({
    quantity: 0,
    notes: "",
  });

  const stats = getInventoryStats();
  const lowStockProducts = getLowStockProducts();

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      brand: "",
      category: "shampoo",
      description: "",
      sku: "",
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      unitPrice: 0,
      costPrice: 0,
      unit: "",
      supplier: "",
      notes: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (product: GroomingProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
      sku: product.sku,
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      unit: product.unit,
      supplier: product.supplier,
      notes: product.notes || "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (product: GroomingProduct) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
  };

  const handleOrderClick = (product: GroomingProduct) => {
    setOrderingProduct(product);
    setOrderData({
      quantity: product.maxStock - product.currentStock,
      notes: "",
    });
    setIsOrderModalOpen(true);
  };

  const handlePlaceOrder = () => {
    setIsOrderModalOpen(false);
  };

  const getStockLevel = (product: GroomingProduct) => {
    const percentage = (product.currentStock / product.maxStock) * 100;
    if (product.currentStock <= product.minStock) return "critical";
    if (percentage <= 30) return "low";
    if (percentage <= 60) return "medium";
    return "good";
  };

  const columns: ColumnDef<ProductWithRecord>[] = [
    {
      key: "name",
      label: "Product",
      icon: Package,
      defaultVisible: true,
      render: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (product) => (
        <Badge className={categoryColors[product.category]}>
          {categoryLabels[product.category]}
        </Badge>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      defaultVisible: true,
    },
    {
      key: "currentStock",
      label: "Stock Level",
      defaultVisible: true,
      render: (product) => {
        const level = getStockLevel(product);
        const percentage = Math.min(
          (product.currentStock / product.maxStock) * 100,
          100,
        );
        return (
          <div className="space-y-1 min-w-32">
            <div className="flex items-center justify-between text-sm">
              <span>
                {product.currentStock} / {product.maxStock}
              </span>
              {level === "critical" && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <Progress value={percentage} className={`h-2`} />
            {product.currentStock <= product.minStock && (
              <p className="text-xs text-red-600">
                Below minimum ({product.minStock})
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "unitPrice",
      label: "Unit Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (product) => `$${product.unitPrice.toFixed(2)}`,
    },
    {
      key: "costPrice",
      label: "Cost",
      defaultVisible: false,
      render: (product) => `$${product.costPrice.toFixed(2)}`,
    },
    {
      key: "supplier",
      label: "Supplier",
      defaultVisible: true,
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(product)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOrderClick(product)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Reorder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(product)}
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
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "shampoo", label: "Shampoo" },
        { value: "conditioner", label: "Conditioner" },
        { value: "styling", label: "Styling" },
        { value: "tools", label: "Tools" },
        { value: "accessories", label: "Accessories" },
        { value: "health", label: "Health" },
        { value: "cleaning", label: "Cleaning" },
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
              Total Products
            </CardTitle>
            <BoxesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.outOfStockCount} out of stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalInventoryValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Retail: ${stats.totalRetailValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert - {lowStockProducts.length} products need
              reordering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <Badge
                  key={product.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-yellow-100"
                  onClick={() => handleOrderClick(product)}
                >
                  {product.name} ({product.currentStock}/{product.minStock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Product Inventory</CardTitle>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={groomingProducts as ProductWithRecord[]}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search products..."
            searchKey={"name" as keyof ProductWithRecord}
          />
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{order.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.quantity} units from {order.supplier}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      ${order.totalPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.orderedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={orderStatusColors[order.status]}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the product details below."
                : "Add a new product to your grooming inventory."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as ProductCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
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
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Min Stock</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input
                  id="maxStock"
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g., bottle"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Retail Price ($)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
              />
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
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reorder Product</DialogTitle>
            <DialogDescription>
              Place a restock order for {orderingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {orderingProduct && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{orderingProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {orderingProduct.brand} • {orderingProduct.sku}
                    </p>
                  </div>
                  <Badge className={categoryColors[orderingProduct.category]}>
                    {categoryLabels[orderingProduct.category]}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="font-medium">
                      {orderingProduct.currentStock}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min Stock</p>
                    <p className="font-medium">{orderingProduct.minStock}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Stock</p>
                    <p className="font-medium">{orderingProduct.maxStock}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderQuantity">Order Quantity</Label>
                <Input
                  id="orderQuantity"
                  type="number"
                  value={orderData.quantity}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Suggested:{" "}
                  {orderingProduct.maxStock - orderingProduct.currentStock}{" "}
                  units to reach max stock
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNotes">Notes</Label>
                <Textarea
                  id="orderNotes"
                  placeholder="Any special instructions..."
                  value={orderData.notes}
                  onChange={(e) =>
                    setOrderData({ ...orderData, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Supplier:</span>
                  <span className="font-medium">
                    {orderingProduct.supplier}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span>Unit Cost:</span>
                  <span className="font-medium">
                    ${orderingProduct.costPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">
                    $
                    {(orderData.quantity * orderingProduct.costPrice).toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOrderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingProduct?.name}
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
