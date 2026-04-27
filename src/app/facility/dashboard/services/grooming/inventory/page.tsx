"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Scissors,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  groomingProducts,
  groomingPackages,
  inventoryOrders,
  getInventoryStats,
  getLowStockProducts,
  type GroomingProduct,
  type ProductCategory,
  type MeasurementUnit,
  type ItemType,
  type ToolCondition,
  type InventoryOrder,
} from "@/data/grooming";
import { DatePicker } from "@/components/ui/date-picker";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const conditionConfig: Record<ToolCondition, { label: string; color: string; icon: React.ElementType }> = {
  good: { label: "Good", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  "needs-service": { label: "Needs Service", color: "bg-yellow-100 text-yellow-700", icon: Wrench },
  retired: { label: "Retired", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const measurementUnitLabels: Record<MeasurementUnit, string> = {
  ml: "ml",
  oz: "oz",
  g: "g",
  liter: "L",
  gallon: "gal",
  count: "units",
  pack: "packs",
  pair: "pairs",
};

const MEASUREMENT_UNITS: MeasurementUnit[] = ["ml", "oz", "g", "liter", "gallon", "count", "pack", "pair"];
const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "consumable", label: "Consumable (used up during grooming)" },
  { value: "tool", label: "Tool (reusable equipment)" },
];
const TOOL_CONDITIONS: { value: ToolCondition; label: string }[] = [
  { value: "good", label: "Good — in regular use" },
  { value: "needs-service", label: "Needs Service — due for maintenance" },
  { value: "retired", label: "Retired — out of service" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatStock(product: GroomingProduct): string {
  const unit = measurementUnitLabels[product.measurementUnit];
  return `${product.currentStock.toLocaleString()} ${unit}`;
}

function formatStockRange(product: GroomingProduct): string {
  const unit = measurementUnitLabels[product.measurementUnit];
  return `${product.currentStock.toLocaleString()} / ${product.maxStock.toLocaleString()} ${unit}`;
}

/** Find all package names that use a given product */
function getUsedInServices(productId: string): string[] {
  return groomingPackages
    .filter((pkg) => pkg.productUsage?.some((u) => u.productId === productId))
    .map((pkg) => pkg.name);
}

function getStockLevel(product: GroomingProduct): "critical" | "low" | "medium" | "good" {
  if (product.currentStock <= product.minStock) return "critical";
  const pct = (product.currentStock / product.maxStock) * 100;
  if (pct <= 30) return "low";
  if (pct <= 60) return "medium";
  return "good";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockCell({ product }: { product: GroomingProduct }) {
  const level = getStockLevel(product);
  const pct = Math.min((product.currentStock / product.maxStock) * 100, 100);
  return (
    <div className="min-w-36 space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium tabular-nums">{formatStockRange(product)}</span>
        {level === "critical" && <AlertTriangle className="ml-1 size-4 text-red-500 shrink-0" />}
      </div>
      <Progress value={pct} className="h-1.5" />
      {product.currentStock <= product.minStock && (
        <p className="text-[11px] text-red-600">
          Below min ({product.minStock.toLocaleString()} {measurementUnitLabels[product.measurementUnit]})
        </p>
      )}
    </div>
  );
}

function UsedInCell({ productId }: { productId: string }) {
  const services = getUsedInServices(productId);
  if (services.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <Badge key={s} variant="outline" className="text-[10px] h-4 px-1.5">
          {s}
        </Badge>
      ))}
    </div>
  );
}

// ─── Form state types ─────────────────────────────────────────────────────────

const emptyForm = {
  name: "",
  brand: "",
  category: "shampoo" as ProductCategory,
  description: "",
  sku: "",
  itemType: "consumable" as ItemType,
  measurementUnit: "ml" as MeasurementUnit,
  currentStock: 0,
  minStock: 0,
  maxStock: 0,
  unitPrice: 0,
  costPrice: 0,
  supplier: "",
  notes: "",
  condition: "good" as ToolCondition,
  lastServiced: "",
  expiryDate: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GroomingProduct | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<GroomingProduct | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderingProduct, setOrderingProduct] = useState<GroomingProduct | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderProductId, setNewOrderProductId] = useState("");
  const [newOrderData, setNewOrderData] = useState({ quantity: 0, notes: "" });
  const [formData, setFormData] = useState(emptyForm);
  const [orderData, setOrderData] = useState({ quantity: 0, notes: "" });

  const stats = getInventoryStats();
  const lowStockProducts = getLowStockProducts();

  const consumables = useMemo(
    () => groomingProducts.filter((p) => p.itemType === "consumable"),
    [],
  );
  const tools = useMemo(
    () => groomingProducts.filter((p) => p.itemType === "tool"),
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddNew(defaultType?: ItemType) {
    setEditingProduct(null);
    setFormData({ ...emptyForm, itemType: defaultType ?? "consumable" });
    setIsAddEditModalOpen(true);
  }

  function handleEdit(product: GroomingProduct) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
      sku: product.sku,
      itemType: product.itemType,
      measurementUnit: product.measurementUnit,
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      supplier: product.supplier,
      notes: product.notes ?? "",
      condition: product.condition ?? "good",
      lastServiced: product.lastServiced ?? "",
      expiryDate: product.expiryDate ?? "",
    });
    setIsAddEditModalOpen(true);
  }

  function handleSave() {
    setIsAddEditModalOpen(false);
  }

  function handleDeleteClick(product: GroomingProduct) {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  }

  function handleDeleteConfirm() {
    setIsDeleteModalOpen(false);
  }

  function handleOrderClick(product: GroomingProduct) {
    setOrderingProduct(product);
    setOrderData({ quantity: product.maxStock - product.currentStock, notes: "" });
    setIsOrderModalOpen(true);
  }

  function handlePlaceOrder() {
    setIsOrderModalOpen(false);
  }

  function handleOpenNewOrder() {
    setNewOrderProductId("");
    setNewOrderData({ quantity: 0, notes: "" });
    setIsNewOrderModalOpen(true);
  }

  function handlePlaceNewOrder() {
    setIsNewOrderModalOpen(false);
  }

  const newOrderProduct = useMemo(
    () => groomingProducts.find((p) => p.id === newOrderProductId) ?? null,
    [newOrderProductId],
  );

  function updateForm<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // ── Column definitions ─────────────────────────────────────────────────────

  const consumableColumns: ColumnDef<ProductWithRecord>[] = [
    {
      key: "name",
      label: "Product",
      icon: Package,
      defaultVisible: true,
      render: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-muted-foreground text-xs">{p.brand}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (p) => (
        <Badge className={categoryColors[p.category]}>
          {categoryLabels[p.category]}
        </Badge>
      ),
    },
    {
      key: "measurementUnit",
      label: "Unit",
      defaultVisible: true,
      render: (p) => (
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
          {measurementUnitLabels[p.measurementUnit]}
        </span>
      ),
    },
    {
      key: "currentStock",
      label: "Stock Level",
      defaultVisible: true,
      render: (p) => <StockCell product={p} />,
    },
    {
      key: "productUsage",
      label: "Used In Services",
      defaultVisible: true,
      render: (p) => <UsedInCell productId={p.id} />,
    },
    {
      key: "supplier",
      label: "Supplier",
      defaultVisible: true,
    },
    {
      key: "costPrice",
      label: "Cost",
      defaultVisible: false,
      render: (p) => `$${p.costPrice.toFixed(2)} / unit`,
    },
    {
      key: "expiryDate",
      label: "Expires",
      defaultVisible: false,
      render: (p) =>
        p.expiryDate
          ? new Date(p.expiryDate).toLocaleDateString()
          : "—",
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (p) => <ActionsMenu product={p} onEdit={handleEdit} onOrder={handleOrderClick} onDelete={handleDeleteClick} />,
    },
  ];

  const toolColumns: ColumnDef<ProductWithRecord>[] = [
    {
      key: "name",
      label: "Tool",
      icon: Scissors,
      defaultVisible: true,
      render: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-muted-foreground text-xs">{p.brand}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (p) => (
        <Badge className={categoryColors[p.category]}>
          {categoryLabels[p.category]}
        </Badge>
      ),
    },
    {
      key: "currentStock",
      label: "Count",
      defaultVisible: true,
      render: (p) => (
        <div className="space-y-1">
          <span className="font-medium tabular-nums">
            {p.currentStock} / {p.maxStock}
          </span>
          {p.currentStock <= p.minStock && (
            <p className="text-[11px] text-yellow-600">Low — min {p.minStock}</p>
          )}
        </div>
      ),
    },
    {
      key: "condition",
      label: "Condition",
      defaultVisible: true,
      render: (p) => {
        const cond = (p.condition ?? "good") as ToolCondition;
        const cfg = conditionConfig[cond];
        const Icon = cfg.icon;
        return (
          <Badge className={`${cfg.color} gap-1`}>
            <Icon className="size-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "lastServiced",
      label: "Last Serviced",
      defaultVisible: true,
      render: (p) =>
        p.lastServiced
          ? new Date(p.lastServiced).toLocaleDateString()
          : "—",
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
      render: (p) => <ActionsMenu product={p} onEdit={handleEdit} onOrder={handleOrderClick} onDelete={handleDeleteClick} />,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        ...Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l })),
      ],
    },
  ];

  const toolFilters: FilterDef[] = [
    {
      key: "condition",
      label: "Condition",
      options: [
        { value: "all", label: "All Conditions" },
        { value: "good", label: "Good" },
        { value: "needs-service", label: "Needs Service" },
        { value: "retired", label: "Retired" },
      ],
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumables</CardTitle>
            <BoxesIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConsumables}</div>
            <p className="text-muted-foreground text-xs">
              {stats.lowStockCount > 0
                ? `${stats.lowStockCount} low stock`
                : "All well stocked"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tools & Equipment</CardTitle>
            <Scissors className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTools}</div>
            <p className="text-muted-foreground text-xs">
              {stats.toolsNeedingService > 0
                ? `${stats.toolsNeedingService} need service`
                : "All in good condition"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.lowStockCount}
            </div>
            <p className="text-muted-foreground text-xs">
              {stats.outOfStockCount} out of stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-muted-foreground text-xs">Awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="size-4" />
              Low Stock Alert — {lowStockProducts.length} item{lowStockProducts.length > 1 ? "s" : ""} need reordering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  onClick={() => handleOrderClick(p)}
                >
                  {p.name} ({formatStock(p)} / min {p.minStock.toLocaleString()} {measurementUnitLabels[p.measurementUnit]})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="consumables">
        <TabsList>
          <TabsTrigger value="consumables" className="gap-1.5">
            <BoxesIcon className="size-3.5" />
            Consumables
            <Badge variant="secondary" className="ml-1 text-[10px]">{consumables.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5">
            <Scissors className="size-3.5" />
            Tools & Equipment
            <Badge variant="secondary" className="ml-1 text-[10px]">{tools.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingCart className="size-3.5" />
            Orders
          </TabsTrigger>
        </TabsList>

        {/* ── Consumables Tab ─────────────────────────────────────────────── */}
        <TabsContent value="consumables" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Consumable Products</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Products used during grooming services. Stock is automatically deducted when a service completes.
                </p>
              </div>
              <Button onClick={() => handleAddNew("consumable")}>
                <Plus className="mr-2 size-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={consumables as ProductWithRecord[]}
                columns={consumableColumns}
                filters={filters}
                searchPlaceholder="Search consumables..."
                searchKey={"name" as keyof ProductWithRecord}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tools Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="tools" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tools & Equipment</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Reusable grooming equipment. Track counts, condition, and maintenance schedules.
                </p>
              </div>
              <Button onClick={() => handleAddNew("tool")}>
                <Plus className="mr-2 size-4" />
                Add Tool
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={tools as ProductWithRecord[]}
                columns={toolColumns}
                filters={toolFilters}
                searchPlaceholder="Search tools..."
                searchKey={"name" as keyof ProductWithRecord}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orders Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={handleOpenNewOrder}>
                <Plus className="mr-2 size-4" />
                New Order
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                        <Package className="text-muted-foreground size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{order.productName}</p>
                        <p className="text-muted-foreground text-sm">
                          {order.quantity} units from {order.supplier}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Ordered by {order.orderedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${order.totalPrice.toFixed(2)}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(order.orderedAt).toLocaleDateString()}
                        </p>
                        {order.expectedDelivery && (
                          <p className="text-muted-foreground text-xs">
                            ETA: {new Date(order.expectedDelivery).toLocaleDateString()}
                          </p>
                        )}
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
        </TabsContent>
      </Tabs>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? `Edit ${editingProduct.itemType === "tool" ? "Tool" : "Product"}`
                : "Add New Item"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the details below."
                : "Add a consumable product or a reusable tool to your grooming inventory."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Item type selector (only when adding new) */}
            {!editingProduct && (
              <div className="space-y-2">
                <Label>Item Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ITEM_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("itemType", value)}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        formData.itemType === value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <p className="font-medium capitalize">{value === "consumable" ? "Consumable" : "Tool / Equipment"}</p>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">{label.split("(")[1]?.replace(")", "") ?? ""}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Identifiers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => updateForm("brand", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => updateForm("category", v as ProductCategory)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => updateForm("sku", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateForm("description", e.target.value)}
                rows={2}
              />
            </div>

            {/* Measurement unit + stock (consumables) */}
            {formData.itemType === "consumable" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="measurementUnit">Measurement Unit</Label>
                  <Select
                    value={formData.measurementUnit}
                    onValueChange={(v) => updateForm("measurementUnit", v as MeasurementUnit)}
                  >
                    <SelectTrigger id="measurementUnit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u} — {u === "ml" ? "millilitres" : u === "oz" ? "ounces" : u === "g" ? "grams" : u === "liter" ? "litres" : u === "gallon" ? "gallons" : u === "count" ? "individual units" : u === "pack" ? "packs/boxes" : "pairs"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-[11px]">
                    All stock quantities below are in this unit (e.g., if ml, enter 500 for 500 ml).
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentStock">
                      Current Stock ({measurementUnitLabels[formData.measurementUnit]})
                    </Label>
                    <Input
                      id="currentStock"
                      type="number"
                      min={0}
                      value={formData.currentStock || ""}
                      onChange={(e) => updateForm("currentStock", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minStock">
                      Min Threshold ({measurementUnitLabels[formData.measurementUnit]})
                    </Label>
                    <Input
                      id="minStock"
                      type="number"
                      min={0}
                      value={formData.minStock || ""}
                      onChange={(e) => updateForm("minStock", parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-muted-foreground text-[11px]">Alert when below this</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxStock">
                      Max Stock ({measurementUnitLabels[formData.measurementUnit]})
                    </Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min={0}
                      value={formData.maxStock || ""}
                      onChange={(e) => updateForm("maxStock", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Expiry Date (optional)</Label>
                  <DatePicker
                    value={formData.expiryDate}
                    onValueChange={(v) => updateForm("expiryDate", v ?? "")}
                    displayMode="dialog"
                    placeholder="Select expiry date"
                    popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                    calendarClassName="p-1"
                    showQuickPresets={false}
                    showManualInput={false}
                  />
                </div>
              </>
            )}

            {/* Tool-specific fields */}
            {formData.itemType === "tool" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentStock">Quantity on Hand</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      min={0}
                      value={formData.currentStock || ""}
                      onChange={(e) => updateForm("currentStock", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minStock">Minimum Required</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min={0}
                      value={formData.minStock || ""}
                      onChange={(e) => updateForm("minStock", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxStock">Maximum (capacity)</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min={0}
                      value={formData.maxStock || ""}
                      onChange={(e) => updateForm("maxStock", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(v) => updateForm("condition", v as ToolCondition)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOOL_CONDITIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Serviced Date</Label>
                    <DatePicker
                      value={formData.lastServiced}
                      onValueChange={(v) => updateForm("lastServiced", v ?? "")}
                      displayMode="dialog"
                      placeholder="Select service date"
                      max={new Date().toISOString().split("T")[0]}
                      popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                      calendarClassName="p-1"
                      showQuickPresets={false}
                      showManualInput={false}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Pricing & supplier */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.costPrice || ""}
                  onChange={(e) => updateForm("costPrice", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">Retail Price ($)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.unitPrice || ""}
                  onChange={(e) => updateForm("unitPrice", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => updateForm("supplier", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingProduct ? "Save Changes" : `Add ${formData.itemType === "tool" ? "Tool" : "Product"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reorder Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {orderingProduct?.itemType === "tool" ? "Order Replacement" : "Reorder Product"}
            </DialogTitle>
            <DialogDescription>
              Place a restock order for {orderingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {orderingProduct && (
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{orderingProduct.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {orderingProduct.brand} · {orderingProduct.sku}
                    </p>
                  </div>
                  <Badge className={categoryColors[orderingProduct.category]}>
                    {categoryLabels[orderingProduct.category]}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-medium">{formatStock(orderingProduct)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min</p>
                    <p className="font-medium">
                      {orderingProduct.minStock.toLocaleString()} {measurementUnitLabels[orderingProduct.measurementUnit]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max</p>
                    <p className="font-medium">
                      {orderingProduct.maxStock.toLocaleString()} {measurementUnitLabels[orderingProduct.measurementUnit]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orderQuantity">
                  Order Quantity ({measurementUnitLabels[orderingProduct.measurementUnit]})
                </Label>
                <Input
                  id="orderQuantity"
                  type="number"
                  value={orderData.quantity}
                  onChange={(e) => setOrderData({ ...orderData, quantity: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-muted-foreground text-xs">
                  Suggested: {(orderingProduct.maxStock - orderingProduct.currentStock).toLocaleString()} {measurementUnitLabels[orderingProduct.measurementUnit]} to reach max
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orderNotes">Notes</Label>
                <Textarea
                  id="orderNotes"
                  placeholder="Any special instructions..."
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="bg-muted rounded-lg p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier</span>
                  <span className="font-medium">{orderingProduct.supplier}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">Cost per unit</span>
                  <span className="font-medium">${orderingProduct.costPrice.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2">
                  <span className="font-medium">Estimated Total</span>
                  <span className="font-bold">
                    ${(orderData.quantity * orderingProduct.costPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder}>
              <ShoppingCart className="mr-2 size-4" />
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Order Modal ───────────────────────────────────────────────────── */}
      <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new restock order for any inventory item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="newOrderProduct">Product / Tool</Label>
              <Select value={newOrderProductId} onValueChange={setNewOrderProductId}>
                <SelectTrigger id="newOrderProduct">
                  <SelectValue placeholder="Select an item to order…" />
                </SelectTrigger>
                <SelectContent>
                  {groomingProducts
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          ({p.currentStock.toLocaleString()} {measurementUnitLabels[p.measurementUnit]} in stock)
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {newOrderProduct && (
              <>
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{newOrderProduct.name}</p>
                      <p className="text-muted-foreground text-xs">{newOrderProduct.brand} · {newOrderProduct.sku}</p>
                    </div>
                    <Badge className={categoryColors[newOrderProduct.category]}>
                      {categoryLabels[newOrderProduct.category]}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-medium">{formatStock(newOrderProduct)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min threshold</p>
                      <p className={`font-medium ${newOrderProduct.currentStock <= newOrderProduct.minStock ? "text-red-600" : ""}`}>
                        {newOrderProduct.minStock.toLocaleString()} {measurementUnitLabels[newOrderProduct.measurementUnit]}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supplier</p>
                      <p className="font-medium truncate">{newOrderProduct.supplier}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newOrderQty">
                    Order Quantity ({measurementUnitLabels[newOrderProduct.measurementUnit]})
                  </Label>
                  <Input
                    id="newOrderQty"
                    type="number"
                    min={1}
                    value={newOrderData.quantity || ""}
                    onChange={(e) =>
                      setNewOrderData((d) => ({ ...d, quantity: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Suggested:{" "}
                    {Math.max(0, newOrderProduct.maxStock - newOrderProduct.currentStock).toLocaleString()}{" "}
                    {measurementUnitLabels[newOrderProduct.measurementUnit]} to reach max stock
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newOrderNotes">Notes (optional)</Label>
                  <Textarea
                    id="newOrderNotes"
                    placeholder="Special instructions, preferred delivery date…"
                    value={newOrderData.notes}
                    onChange={(e) =>
                      setNewOrderData((d) => ({ ...d, notes: e.target.value }))
                    }
                    rows={2}
                  />
                </div>

                <div className="bg-muted rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-medium">{newOrderProduct.supplier}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between">
                    <span className="text-muted-foreground">Cost per unit</span>
                    <span className="font-medium">${newOrderProduct.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between border-t pt-1.5">
                    <span className="font-medium">Estimated Total</span>
                    <span className="font-bold">
                      ${(newOrderData.quantity * newOrderProduct.costPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceNewOrder} disabled={!newOrderProductId || newOrderData.quantity <= 0}>
              <ShoppingCart className="mr-2 size-4" />
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ──────────────────────────────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Inventory</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{deletingProduct?.name}&quot;? This cannot be undone.
              {getUsedInServices(deletingProduct?.id ?? "").length > 0 && (
                <span className="mt-2 block text-yellow-700 dark:text-yellow-400">
                  ⚠ This product is used in {getUsedInServices(deletingProduct?.id ?? "").join(", ")}. Removing it will affect those services.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="mr-2 size-4" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Actions dropdown (extracted to avoid inline closures in render) ──────────

function ActionsMenu({
  product,
  onEdit,
  onOrder,
  onDelete,
}: {
  product: GroomingProduct;
  onEdit: (p: GroomingProduct) => void;
  onOrder: (p: GroomingProduct) => void;
  onDelete: (p: GroomingProduct) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(product)}>
          <Edit className="mr-2 size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOrder(product)}>
          <ShoppingCart className="mr-2 size-4" />
          {product.itemType === "tool" ? "Order Replacement" : "Reorder"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(product)} className="text-red-600">
          <Trash2 className="mr-2 size-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
