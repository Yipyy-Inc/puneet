"use client";

import { useState } from "react";
import {
  Warehouse,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Eye,
  ShoppingCart,
  FileText,
  CheckSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  products,
  inventoryMovements,
  lowStockAlerts,
  getLowStockProducts,
  getInventoryValue,
  suppliers,
  getActiveSuppliers,
  type InventoryMovement,
  type LowStockAlert,
  type Product,
  type ProductVariant,
  type PurchaseOrderItem,
} from "@/data/retail";

type InventoryMovementWithRecord = InventoryMovement & Record<string, unknown>;
type LowStockAlertWithRecord = LowStockAlert & Record<string, unknown>;

export default function InventoryPage() {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "movements" | "alerts"
  >("overview");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAlertDetailModalOpen, setIsAlertDetailModalOpen] = useState(false);
  const [isReorderListModalOpen, setIsReorderListModalOpen] = useState(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(
    null,
  );
  const [selectedAlertsForReorder, setSelectedAlertsForReorder] = useState<
    Set<string>
  >(new Set());
  const [reorderItems, setReorderItems] = useState<
    Array<{
      alertId: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      sku: string;
      currentStock: number;
      minStock: number;
      maxStock: number;
      suggestedQuantity: number;
      unitCost: number;
      selected: boolean;
    }>
  >([]);
  const [poForm, setPoForm] = useState({
    supplierId: "",
    expectedDelivery: "",
    notes: "",
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: "",
    variantId: "",
    quantity: 0,
    reason: "",
  });

  const inventoryValue = getInventoryValue();
  const lowStockItems = getLowStockProducts();
  const pendingAlerts = lowStockAlerts.filter((a) => a.status === "pending");

  // Format date consistently to avoid hydration errors
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  };

  // Format time consistently
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleAdjustStock = () => {
    // In a real app, this would save to the backend
    setIsAdjustmentModalOpen(false);
    setAdjustmentForm({
      productId: "",
      variantId: "",
      quantity: 0,
      reason: "",
    });
  };

  const handleAcknowledgeAlert = (alert: LowStockAlert) => {
    // In a real app, this would update the alert status
    console.log("Acknowledging alert:", alert.id);
  };

  const handleGenerateReorderList = () => {
    // Convert pending alerts to reorder items with suggested quantities
    const items = pendingAlerts.map((alert) => {
      // Find the product/variant to get cost and max stock
      let product: Product | undefined;
      let variant: ProductVariant | undefined;
      
      if (alert.variantId) {
        product = products.find((p) => p.id === alert.productId);
        variant = product?.variants.find((v) => v.id === alert.variantId);
      } else {
        product = products.find((p) => p.id === alert.productId);
      }

      const maxStock = variant?.maxStock || product?.maxStock || alert.minStock * 3;
      const unitCost = variant?.costPrice || product?.baseCostPrice || 0;
      
      // Suggested quantity: enough to reach max stock (or at least min stock * 2)
      const suggestedQuantity = Math.max(
        maxStock - alert.currentStock,
        alert.minStock * 2 - alert.currentStock
      );

      return {
        alertId: alert.id,
        productId: alert.productId,
        productName: alert.productName,
        variantId: alert.variantId,
        variantName: alert.variantName,
        sku: alert.sku,
        currentStock: alert.currentStock,
        minStock: alert.minStock,
        maxStock,
        suggestedQuantity: Math.max(1, suggestedQuantity),
        unitCost,
        selected: true,
      };
    });

    setReorderItems(items);
    setSelectedAlertsForReorder(new Set(items.map((item) => item.alertId)));
    setIsReorderListModalOpen(true);
  };

  const handleCreatePOFromReorderList = () => {
    const selectedItems = reorderItems.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      alert("Please select at least one item to create a purchase order.");
      return;
    }
    setIsReorderListModalOpen(false);
    setIsCreatePOModalOpen(true);
  };

  const handleToggleReorderItem = (alertId: string) => {
    setReorderItems((prev) =>
      prev.map((item) =>
        item.alertId === alertId ? { ...item, selected: !item.selected } : item
      )
    );
    setSelectedAlertsForReorder((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const handleUpdateReorderQuantity = (alertId: string, quantity: number) => {
    setReorderItems((prev) =>
      prev.map((item) =>
        item.alertId === alertId
          ? { ...item, suggestedQuantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const handleAddSingleAlertToReorder = (alert: LowStockAlert) => {
    const product = products.find((p) => p.id === alert.productId);
    const variant = alert.variantId
      ? product?.variants.find((v) => v.id === alert.variantId)
      : undefined;
    const maxStock = variant?.maxStock || product?.maxStock || alert.minStock * 3;
    const unitCost = variant?.costPrice || product?.baseCostPrice || 0;
    const suggestedQuantity = Math.max(
      maxStock - alert.currentStock,
      alert.minStock * 2 - alert.currentStock
    );
    
    const newItem = {
      alertId: alert.id,
      productId: alert.productId,
      productName: alert.productName,
      variantId: alert.variantId,
      variantName: alert.variantName,
      sku: alert.sku,
      currentStock: alert.currentStock,
      minStock: alert.minStock,
      maxStock,
      suggestedQuantity: Math.max(1, suggestedQuantity),
      unitCost,
      selected: true,
    };

    setReorderItems((prev) => {
      // Check if item already exists
      const existingIndex = prev.findIndex((item) => item.alertId === alert.id);
      if (existingIndex >= 0) {
        return prev;
      }
      return [...prev, newItem];
    });
    setSelectedAlertsForReorder((prev) => {
      const newSet = new Set(prev);
      newSet.add(alert.id);
      return newSet;
    });
    setIsReorderListModalOpen(true);
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case "purchase":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "adjustment":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "return":
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      case "transfer":
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getMovementTypeVariant = (type: string) => {
    switch (type) {
      case "sale":
        return "destructive";
      case "purchase":
        return "default";
      case "adjustment":
        return "secondary";
      case "return":
        return "outline";
      case "transfer":
        return "outline";
      default:
        return "outline";
    }
  };

  const getAlertStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "acknowledged":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const movementColumns: ColumnDef<InventoryMovementWithRecord>[] = [
    {
      key: "createdAt",
      label: "Date",
      defaultVisible: true,
      render: (item) => {
        const dateString = item.createdAt as string;
        return (
          <div>
            <div className="font-medium">{formatDate(dateString)}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(dateString)}
            </div>
          </div>
        );
      },
    },
    {
      key: "productName",
      label: "Product",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.productName}</div>
          {item.variantName && (
            <div className="text-sm text-muted-foreground">
              {item.variantName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      defaultVisible: true,
    },
    {
      key: "movementType",
      label: "Type",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            getMovementTypeVariant(item.movementType as string) as
              | "default"
              | "secondary"
              | "destructive"
              | "outline"
          }
          className="gap-1"
        >
          {getMovementTypeIcon(item.movementType as string)}
          {(item.movementType as string).charAt(0).toUpperCase() +
            (item.movementType as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: "quantity",
      label: "Quantity",
      defaultVisible: true,
      render: (item) => {
        const qty = item.quantity as number;
        return (
          <span
            className={
              qty > 0
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {qty > 0 ? `+${qty}` : qty}
          </span>
        );
      },
    },
    {
      key: "previousStock",
      label: "Stock Change",
      defaultVisible: true,
      render: (item) => (
        <span className="text-sm">
          {item.previousStock} → {item.newStock}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      defaultVisible: true,
    },
    {
      key: "createdBy",
      label: "By",
      defaultVisible: true,
    },
  ];

  const alertColumns: ColumnDef<LowStockAlertWithRecord>[] = [
    {
      key: "createdAt",
      label: "Date",
      defaultVisible: true,
      render: (item) => formatDate(item.createdAt as string),
    },
    {
      key: "productName",
      label: "Product",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.productName}</div>
          {item.variantName && (
            <div className="text-sm text-muted-foreground">
              {item.variantName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      defaultVisible: true,
    },
    {
      key: "currentStock",
      label: "Current Stock",
      defaultVisible: true,
      render: (item) => (
        <span className="text-red-600 font-medium">{item.currentStock}</span>
      ),
    },
    {
      key: "minStock",
      label: "Min Stock",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            item.status === "pending"
              ? "destructive"
              : item.status === "acknowledged"
                ? "secondary"
                : "default"
          }
          className="gap-1"
        >
          {getAlertStatusIcon(item.status as string)}
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const movementFilters: FilterDef[] = [
    {
      key: "movementType",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "sale", label: "Sale" },
        { value: "purchase", label: "Purchase" },
        { value: "adjustment", label: "Adjustment" },
        { value: "return", label: "Return" },
        { value: "transfer", label: "Transfer" },
      ],
    },
  ];

  const alertFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "acknowledged", label: "Acknowledged" },
        { value: "resolved", label: "Resolved" },
      ],
    },
  ];

  // Get all products with variants flattened for dropdown
  const allProductOptions = products.flatMap((product) => {
    if (product.hasVariants && product.variants.length > 0) {
      return product.variants.map((variant) => ({
        productId: product.id,
        variantId: variant.id,
        label: `${product.name} - ${variant.name}`,
        sku: variant.sku,
      }));
    }
    return [
      {
        productId: product.id,
        variantId: "",
        label: product.name,
        sku: product.sku,
      },
    ];
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value (Retail)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${inventoryValue.retail.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost: ${inventoryValue.cost.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                ((inventoryValue.retail - inventoryValue.cost) /
                  inventoryValue.retail) *
                100
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Potential profit: $
              {(inventoryValue.retail - inventoryValue.cost).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <Badge
              variant={lowStockItems.length > 0 ? "destructive" : "secondary"}
            >
              {lowStockItems.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Alerts
            </CardTitle>
            <Badge
              variant={pendingAlerts.length > 0 ? "destructive" : "secondary"}
            >
              {pendingAlerts.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Unacknowledged alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          setSelectedTab(value as "overview" | "movements" | "alerts")
        }
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Warehouse className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Movement Log
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
              {pendingAlerts.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 w-5 p-0 text-xs"
                >
                  {pendingAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => setIsAdjustmentModalOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Low Stock Items Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Low Stock Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    All items are well stocked!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 5).map((item, index) => {
                      const isVariant = "variantType" in item;
                      const product = isVariant
                        ? products.find((p) =>
                            p.variants.some(
                              (v) => v.id === (item as ProductVariant).id,
                            ),
                          )
                        : (item as Product);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {isVariant
                                ? `${product?.name} - ${(item as ProductVariant).name}`
                                : (item as Product).name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              SKU:{" "}
                              {isVariant
                                ? (item as ProductVariant).sku
                                : (item as Product).sku}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-red-600">
                              {isVariant
                                ? (item as ProductVariant).stock
                                : (item as Product).stock}{" "}
                              left
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Min:{" "}
                              {isVariant
                                ? (item as ProductVariant).minStock
                                : (item as Product).minStock}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {lowStockItems.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{lowStockItems.length - 5} more items
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Movements Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Recent Movements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventoryMovements.slice(0, 5).map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        {getMovementTypeIcon(movement.movementType)}
                        <div>
                          <p className="font-medium text-sm">
                            {movement.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {movement.reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            movement.quantity > 0
                              ? "font-medium text-green-600"
                              : "font-medium text-red-600"
                          }
                        >
                          {movement.quantity > 0
                            ? `+${movement.quantity}`
                            : movement.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="mt-4">
          <DataTable
            data={inventoryMovements as InventoryMovementWithRecord[]}
            columns={movementColumns}
            filters={movementFilters}
            searchKey="productName"
            searchPlaceholder="Search by product name..."
            actions={() => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
              <p className="text-sm text-muted-foreground">
                {pendingAlerts.length} pending alerts need attention
              </p>
            </div>
            {pendingAlerts.length > 0 && (
              <Button onClick={handleGenerateReorderList}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Generate Reorder List
              </Button>
            )}
          </div>
          <DataTable
            data={lowStockAlerts as LowStockAlertWithRecord[]}
            columns={alertColumns}
            filters={alertFilters}
            searchKey="productName"
            searchPlaceholder="Search by product name..."
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedAlert(item as LowStockAlert);
                      setIsAlertDetailModalOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {item.status === "pending" && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleAcknowledgeAlert(item as LowStockAlert)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Acknowledge
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleAddSingleAlertToReorder(item as LowStockAlert)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Reorder List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Modal */}
      <Dialog
        open={isAdjustmentModalOpen}
        onOpenChange={setIsAdjustmentModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Make a manual adjustment to inventory levels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Product</Label>
              <Select
                value={`${adjustmentForm.productId}|${adjustmentForm.variantId}`}
                onValueChange={(value) => {
                  const [productId, variantId] = value.split("|");
                  setAdjustmentForm({
                    ...adjustmentForm,
                    productId,
                    variantId: variantId || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {allProductOptions.map((option) => (
                    <SelectItem
                      key={`${option.productId}-${option.variantId}`}
                      value={`${option.productId}|${option.variantId}`}
                    >
                      {option.label} ({option.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">
                Quantity Adjustment (use negative for decrease)
              </Label>
              <Input
                id="quantity"
                type="number"
                value={adjustmentForm.quantity}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    reason: e.target.value,
                  })
                }
                placeholder="e.g., Damaged goods, Inventory count correction..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAdjustStock}>Apply Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Detail Modal */}
      <Dialog
        open={isAlertDetailModalOpen}
        onOpenChange={setIsAlertDetailModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Low Stock Alert</DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedAlert.productName}</h3>
                  {selectedAlert.variantName && (
                    <p className="text-sm text-muted-foreground">
                      {selectedAlert.variantName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm text-muted-foreground">Current Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {selectedAlert.currentStock}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Stock</p>
                  <p className="text-2xl font-bold">{selectedAlert.minStock}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SKU:</span>
                  <span>{selectedAlert.sku}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Alert Created:</span>
                  <span>
                    {formatDate(selectedAlert.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      selectedAlert.status === "pending"
                        ? "destructive"
                        : selectedAlert.status === "acknowledged"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {selectedAlert.status.charAt(0).toUpperCase() +
                      selectedAlert.status.slice(1)}
                  </Badge>
                </div>
                {selectedAlert.acknowledgedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Acknowledged:</span>
                    <span>
                      {formatDate(selectedAlert.acknowledgedAt)}{" "}
                      by {selectedAlert.acknowledgedBy}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAlertDetailModalOpen(false)}
            >
              Close
            </Button>
            {selectedAlert?.status === "pending" && (
              <Button onClick={() => handleAcknowledgeAlert(selectedAlert)}>
                Acknowledge Alert
              </Button>
            )}
            <Button
              onClick={() => {
                if (selectedAlert) {
                  handleAddSingleAlertToReorder(selectedAlert);
                  setIsAlertDetailModalOpen(false);
                }
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder List Modal */}
      <Dialog
        open={isReorderListModalOpen}
        onOpenChange={setIsReorderListModalOpen}
      >
        <DialogContent className="w-[98vw] max-w-none sm:max-w-none max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reorder List</DialogTitle>
            <DialogDescription>
              Select items and adjust quantities to create a purchase order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reorderItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No items in reorder list
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReorderItems((prev) =>
                          prev.map((item) => ({ ...item, selected: true }))
                        );
                        setSelectedAlertsForReorder(
                          new Set(reorderItems.map((item) => item.alertId))
                        );
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReorderItems((prev) =>
                          prev.map((item) => ({ ...item, selected: false }))
                        );
                        setSelectedAlertsForReorder(new Set());
                      }}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reorderItems.filter((item) => item.selected).length} of{" "}
                    {reorderItems.length} selected
                  </div>
                </div>

                <div className="space-y-2 border rounded-lg divide-y">
                  {reorderItems.map((item) => (
                    <div
                      key={item.alertId}
                      className={`p-4 ${
                        item.selected ? "bg-blue-50 border-blue-200" : "bg-background"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleReorderItem(item.alertId)}
                            className="rounded h-4 w-4"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{item.productName}</p>
                            {item.variantName && (
                              <Badge variant="outline" className="text-xs">
                                {item.variantName}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground mb-2">
                            <div>
                              <span className="font-medium">SKU:</span> {item.sku}
                            </div>
                            <div>
                              <span className="font-medium">Current:</span>{" "}
                              <span className="text-red-600">{item.currentStock}</span>
                            </div>
                            <div>
                              <span className="font-medium">Min:</span> {item.minStock}
                            </div>
                            <div>
                              <span className="font-medium">Max:</span> {item.maxStock}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Reorder Quantity:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.suggestedQuantity}
                                onChange={(e) =>
                                  handleUpdateReorderQuantity(
                                    item.alertId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-24 h-8"
                                disabled={!item.selected}
                              />
                              <span className="text-xs text-muted-foreground">
                                (Suggested: {item.suggestedQuantity})
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Unit Cost:</span>{" "}
                              <span className="font-medium">
                                ${item.unitCost.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Total:</span>{" "}
                              <span className="font-medium">
                                $
                                {(item.suggestedQuantity * item.unitCost).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setReorderItems((prev) =>
                              prev.filter((i) => i.alertId !== item.alertId)
                            );
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">
                      {reorderItems.filter((item) => item.selected).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span className="font-medium">
                      {reorderItems
                        .filter((item) => item.selected)
                        .reduce((sum, item) => sum + item.suggestedQuantity, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Estimated Total Cost:</span>
                    <span>
                      $
                      {reorderItems
                        .filter((item) => item.selected)
                        .reduce(
                          (sum, item) =>
                            sum + item.suggestedQuantity * item.unitCost,
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReorderListModalOpen(false);
                setReorderItems([]);
                setSelectedAlertsForReorder(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePOFromReorderList}
              disabled={
                reorderItems.length === 0 ||
                reorderItems.filter((item) => item.selected).length === 0
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Order Modal */}
      <Dialog open={isCreatePOModalOpen} onOpenChange={setIsCreatePOModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a purchase order from the selected reorder items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select
                value={poForm.supplierId}
                onValueChange={(value) =>
                  setPoForm({ ...poForm, supplierId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {getActiveSuppliers().map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.paymentTerms})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={poForm.expectedDelivery}
                onChange={(e) =>
                  setPoForm({ ...poForm, expectedDelivery: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Order Items</Label>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {reorderItems
                  .filter((item) => item.selected)
                  .map((item) => (
                    <div key={item.alertId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-sm text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p>
                            {item.suggestedQuantity} × ${item.unitCost.toFixed(2)}
                          </p>
                          <p className="font-medium">
                            $
                            {(item.suggestedQuantity * item.unitCost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>
                  $
                  {reorderItems
                    .filter((item) => item.selected)
                    .reduce(
                      (sum, item) =>
                        sum + item.suggestedQuantity * item.unitCost,
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>
                  $
                  {reorderItems
                    .filter((item) => item.selected)
                    .reduce(
                      (sum, item) =>
                        sum + item.suggestedQuantity * item.unitCost,
                      0
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatePOModalOpen(false);
                setReorderItems([]);
                setSelectedAlertsForReorder(new Set());
                setPoForm({ supplierId: "", expectedDelivery: "", notes: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // In a real app, this would create the purchase order
                const selectedItems = reorderItems.filter((item) => item.selected);
                alert(
                  `Purchase order created successfully with ${selectedItems.length} items!`
                );
                setIsCreatePOModalOpen(false);
                setReorderItems([]);
                setSelectedAlertsForReorder(new Set());
                setPoForm({ supplierId: "", expectedDelivery: "", notes: "" });
              }}
              disabled={!poForm.supplierId || !poForm.expectedDelivery}
            >
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
