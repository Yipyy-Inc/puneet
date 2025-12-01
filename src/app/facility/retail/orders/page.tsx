"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Truck,
  Building2,
  Package,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  purchaseOrders,
  suppliers,
  products,
  getActiveSuppliers,
  getPendingOrders,
  type PurchaseOrder,
  type Supplier,
  type PurchaseOrderItem,
} from "@/data/retail";

type PurchaseOrderWithRecord = PurchaseOrder & Record<string, unknown>;
type SupplierWithRecord = Supplier & Record<string, unknown>;

export default function OrdersPage() {
  const [selectedTab, setSelectedTab] = useState<"orders" | "suppliers">(
    "orders",
  );
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    items: [] as PurchaseOrderItem[],
    notes: "",
    expectedDelivery: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    website: "",
    paymentTerms: "Net 30",
    leadTimeDays: 7,
    notes: "",
  });

  const activeSuppliers = getActiveSuppliers();
  const pendingOrders = getPendingOrders();

  const handleCreateOrder = () => {
    setOrderForm({
      supplierId: "",
      items: [],
      notes: "",
      expectedDelivery: "",
    });
    setIsOrderModalOpen(true);
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      website: "",
      paymentTerms: "Net 30",
      leadTimeDays: 7,
      notes: "",
    });
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      website: supplier.website || "",
      paymentTerms: supplier.paymentTerms,
      leadTimeDays: supplier.leadTimeDays,
      notes: supplier.notes,
    });
    setIsSupplierModalOpen(true);
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsViewOrderModalOpen(true);
  };

  const handleSaveOrder = () => {
    // In a real app, this would save to the backend
    setIsOrderModalOpen(false);
  };

  const handleSaveSupplier = () => {
    // In a real app, this would save to the backend
    setIsSupplierModalOpen(false);
  };

  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "ordered":
        return "default";
      case "shipped":
        return "outline";
      case "received":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "ordered":
        return <Package className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "received":
        return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const orderColumns: ColumnDef<PurchaseOrderWithRecord>[] = [
    {
      key: "orderNumber",
      label: "Order #",
      defaultVisible: true,
      render: (item) => (
        <span className="font-mono font-medium">{item.orderNumber}</span>
      ),
    },
    {
      key: "supplierName",
      label: "Supplier",
      icon: Building2,
      defaultVisible: true,
    },
    {
      key: "items",
      label: "Items",
      defaultVisible: true,
      render: (item) => {
        const items = item.items as PurchaseOrderItem[];
        return <span>{items.length} items</span>;
      },
    },
    {
      key: "total",
      label: "Total",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => `$${(item.total as number).toFixed(2)}`,
    },
    {
      key: "orderedAt",
      label: "Order Date",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => new Date(item.orderedAt as string).toLocaleDateString(),
    },
    {
      key: "expectedDelivery",
      label: "Expected",
      defaultVisible: true,
      render: (item) =>
        new Date(item.expectedDelivery as string).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            getOrderStatusVariant(item.status as string) as
              | "default"
              | "secondary"
              | "destructive"
              | "outline"
          }
          className="gap-1"
        >
          {getOrderStatusIcon(item.status as string)}
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const supplierColumns: ColumnDef<SupplierWithRecord>[] = [
    {
      key: "name",
      label: "Supplier",
      icon: Building2,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-muted-foreground">
            {item.contactName}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact",
      icon: Mail,
      defaultVisible: true,
      render: (item) => (
        <div className="text-sm">
          <div>{item.email}</div>
          <div className="text-muted-foreground">{item.phone}</div>
        </div>
      ),
    },
    {
      key: "city",
      label: "Location",
      icon: MapPin,
      defaultVisible: true,
      render: (item) => `${item.city}, ${item.country}`,
    },
    {
      key: "paymentTerms",
      label: "Terms",
      defaultVisible: true,
    },
    {
      key: "leadTimeDays",
      label: "Lead Time",
      defaultVisible: true,
      render: (item) => `${item.leadTimeDays} days`,
    },
    {
      key: "totalOrders",
      label: "Orders",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={item.status === "active" ? "default" : "secondary"}>
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const orderFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "ordered", label: "Ordered" },
        { value: "shipped", label: "Shipped" },
        { value: "received", label: "Received" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ];

  const supplierFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  // Calculate stats
  const totalOrderValue = purchaseOrders.reduce((sum, o) => sum + o.total, 0);
  const receivedOrders = purchaseOrders.filter(
    (o) => o.status === "received",
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {receivedOrders} received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total ordered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeSuppliers.length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          setSelectedTab(value as "orders" | "suppliers")
        }
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={
              selectedTab === "orders" ? handleCreateOrder : handleAddSupplier
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {selectedTab === "orders" ? "New Order" : "Add Supplier"}
          </Button>
        </div>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <DataTable
            data={purchaseOrders as PurchaseOrderWithRecord[]}
            columns={orderColumns}
            filters={orderFilters}
            searchKey="orderNumber"
            searchPlaceholder="Search by order number..."
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleViewOrder(item as PurchaseOrder)}
                  >
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>Edit Order</DropdownMenuItem>
                  {item.status === "shipped" && (
                    <DropdownMenuItem>Mark as Received</DropdownMenuItem>
                  )}
                  {(item.status === "pending" || item.status === "ordered") && (
                    <DropdownMenuItem className="text-destructive">
                      Cancel Order
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-4">
          <DataTable
            data={suppliers as SupplierWithRecord[]}
            columns={supplierColumns}
            filters={supplierFilters}
            searchKey="name"
            searchPlaceholder="Search suppliers..."
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEditSupplier(item as Supplier)}
                  >
                    Edit Supplier
                  </DropdownMenuItem>
                  <DropdownMenuItem>View Orders</DropdownMenuItem>
                  <DropdownMenuItem>Create New Order</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    {item.status === "active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Create Order Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new order to restock inventory from a supplier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select
                value={orderForm.supplierId}
                onValueChange={(value) =>
                  setOrderForm({ ...orderForm, supplierId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((supplier) => (
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
                value={orderForm.expectedDelivery}
                onChange={(e) =>
                  setOrderForm({
                    ...orderForm,
                    expectedDelivery: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Products</Label>
              <p className="text-sm text-muted-foreground">
                Add products to this order. Select from available products
                below.
              </p>
              <div className="border rounded-lg p-4 space-y-2">
                {products.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/30"
                  >
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (Cost: ${product.baseCostPrice.toFixed(2)})
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Qty"
                      className="w-20"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={orderForm.notes}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, notes: e.target.value })
                }
                placeholder="Any special instructions or notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOrderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier details below."
                : "Enter the supplier information."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  placeholder="e.g., PetSupply Wholesale"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactName">Contact Person</Label>
                <Input
                  id="contactName"
                  value={supplierForm.contactName}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      contactName: e.target.value,
                    })
                  }
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                  placeholder="orders@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={supplierForm.city}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, city: e.target.value })
                  }
                  placeholder="e.g., Chicago, IL"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={supplierForm.country}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      country: e.target.value,
                    })
                  }
                  placeholder="e.g., USA"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                value={supplierForm.website}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, website: e.target.value })
                }
                placeholder="www.company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={supplierForm.paymentTerms}
                  onValueChange={(value) =>
                    setSupplierForm({ ...supplierForm, paymentTerms: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Due on Receipt">
                      Due on Receipt
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min={1}
                  value={supplierForm.leadTimeDays}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      leadTimeDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, notes: e.target.value })
                }
                placeholder="Any additional notes about this supplier..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSupplierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSupplier}>
              {editingSupplier ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Modal */}
      <Dialog
        open={isViewOrderModalOpen}
        onOpenChange={setIsViewOrderModalOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold font-mono">
                    {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedOrder.supplierName}
                  </p>
                </div>
                <Badge
                  variant={
                    getOrderStatusVariant(selectedOrder.status) as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                  }
                  className="gap-1"
                >
                  {getOrderStatusIcon(selectedOrder.status)}
                  {selectedOrder.status.charAt(0).toUpperCase() +
                    selectedOrder.status.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.orderedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Expected Delivery
                  </p>
                  <p className="font-medium">
                    {new Date(
                      selectedOrder.expectedDelivery,
                    ).toLocaleDateString()}
                  </p>
                </div>
                {selectedOrder.receivedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.receivedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedOrder.createdBy}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3"
                    >
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
                          {item.quantity} × ${item.unitCost.toFixed(2)}
                        </p>
                        <p className="font-medium">
                          ${item.totalCost.toFixed(2)}
                        </p>
                        {selectedOrder.status === "received" && (
                          <p className="text-xs text-green-600">
                            Received: {item.receivedQuantity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-lg bg-muted">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>${selectedOrder.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewOrderModalOpen(false)}
            >
              Close
            </Button>
            {selectedOrder?.status === "shipped" && (
              <Button>Mark as Received</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
