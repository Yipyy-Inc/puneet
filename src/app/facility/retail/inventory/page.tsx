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
  type InventoryMovement,
  type LowStockAlert,
  type Product,
  type ProductVariant,
} from "@/data/retail";

type InventoryMovementWithRecord = InventoryMovement & Record<string, unknown>;
type LowStockAlertWithRecord = LowStockAlert & Record<string, unknown>;

export default function InventoryPage() {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "movements" | "alerts"
  >("overview");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAlertDetailModalOpen, setIsAlertDetailModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlert | null>(
    null,
  );

  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: "",
    variantId: "",
    quantity: 0,
    reason: "",
  });

  const inventoryValue = getInventoryValue();
  const lowStockItems = getLowStockProducts();
  const pendingAlerts = lowStockAlerts.filter((a) => a.status === "pending");

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
        const date = new Date(item.createdAt as string);
        return (
          <div>
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">
              {date.toLocaleTimeString()}
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
      render: (item) => new Date(item.createdAt as string).toLocaleDateString(),
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
                          {new Date(movement.createdAt).toLocaleDateString()}
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
                  <DropdownMenuItem>Create Purchase Order</DropdownMenuItem>
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
                    {new Date(selectedAlert.createdAt).toLocaleDateString()}
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
                      {new Date(
                        selectedAlert.acknowledgedAt,
                      ).toLocaleDateString()}{" "}
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
            <Button>Create Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
