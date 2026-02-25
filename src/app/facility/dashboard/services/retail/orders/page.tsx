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
  Receipt,
  RotateCcw,
  ArrowLeft,
  User,
  CreditCard,
  Gift,
  Wallet,
  PackageCheck,
  AlertCircle,
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
  getTransactionById,
  createReturn,
  createStoreCredit,
  createGiftCard,
  getStoreCreditBalance,
  customPaymentMethods,
  returns,
  inventoryMovements,
  type PurchaseOrder,
  type Supplier,
  type PurchaseOrderItem,
  type Transaction,
  type Return,
  type ReturnItem,
  type RefundMethod,
  type ReturnReason,
  type CustomPaymentMethod,
  type CartItem,
  getAllTransactions,
  type InventoryMovement,
  type Product,
  type ProductVariant,
} from "@/data/retail";

type PurchaseOrderWithRecord = PurchaseOrder & Record<string, unknown>;
type SupplierWithRecord = Supplier & Record<string, unknown>;

export default function OrdersPage() {
  const [selectedTab, setSelectedTab] = useState<"orders" | "suppliers" | "transactions">(
    "orders",
  );
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReceiveOrderModalOpen, setIsReceiveOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [receivingForm, setReceivingForm] = useState<{
    items: Array<{
      productId: string;
      variantId?: string;
      sku: string;
      orderedQuantity: number;
      receivedQuantity: number;
      newReceivedQuantity: number;
    }>;
  }>({ items: [] });
  
  // Return form state
  const [returnForm, setReturnForm] = useState<{
    items: Array<{
      transactionItemId: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      sku: string;
      quantity: number;
      originalQuantity: number;
      unitPrice: number;
      discount: number;
      discountType: "fixed" | "percent";
      total: number;
      reason: ReturnReason;
      reasonNotes?: string;
      restocked: boolean;
    }>;
    refundMethod: RefundMethod;
    customRefundMethodName?: string;
    storeCreditAmount?: number;
    giftCardNumber?: string;
    notes?: string;
  }>({
    items: [],
    refundMethod: "original_payment",
  });

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
  const allTransactions = getAllTransactions();

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

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Could open a view modal here
  };

  const handleInitiateReturn = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReturnForm({
      items: [],
      refundMethod: "original_payment",
    });
    setIsReturnModalOpen(true);
  };

  const handleProcessReturn = () => {
    if (!selectedTransaction || returnForm.items.length === 0) return;

    const refundTotal = returnForm.items.reduce((sum, item) => {
      const subtotal = item.unitPrice * item.quantity;
      const discountAmount = item.discountType === "percent"
        ? (subtotal * item.discount) / 100
        : item.discount;
      return sum + subtotal - discountAmount;
    }, 0);

    // Create return
    const newReturn = createReturn({
      transactionId: selectedTransaction.id,
      transactionNumber: selectedTransaction.transactionNumber,
      items: returnForm.items.map(item => ({
        ...item,
        reasonNotes: item.reasonNotes,
      })),
      subtotal: refundTotal,
      refundTotal,
      refundMethod: returnForm.refundMethod,
      customRefundMethodName: returnForm.customRefundMethodName,
      storeCreditAmount: returnForm.refundMethod === "store_credit" ? refundTotal : undefined,
      giftCardNumber: returnForm.refundMethod === "gift_card" ? returnForm.giftCardNumber : undefined,
      status: "completed",
      customerId: selectedTransaction.customerId,
      customerName: selectedTransaction.customerName,
      customerEmail: selectedTransaction.customerEmail,
      processedBy: "current-user-id", // TODO: Get from auth
      processedByName: "Current User", // TODO: Get from auth
      notes: returnForm.notes,
      completedAt: new Date().toISOString().slice(0, 19),
    });

    // Create store credit if applicable
    if (returnForm.refundMethod === "store_credit" && selectedTransaction.customerId) {
      createStoreCredit({
        customerId: selectedTransaction.customerId,
        customerName: selectedTransaction.customerName || "Customer",
        amount: refundTotal,
        balance: refundTotal,
        issuedFrom: newReturn.id,
        notes: `Issued from return ${newReturn.returnNumber}`,
      });
    }

    // Create gift card if applicable
    if (returnForm.refundMethod === "gift_card") {
      createGiftCard({
        amount: refundTotal,
        balance: refundTotal,
        issuedFrom: newReturn.id,
        customerId: selectedTransaction.customerId,
        customerName: selectedTransaction.customerName,
        isActive: true,
        notes: `Issued from return ${newReturn.returnNumber}`,
      });
    }

    // TODO: Restock items to inventory
    // This would update product/variant stock levels

    // Close modal and reset
    setIsReturnModalOpen(false);
    setSelectedTransaction(null);
    setReturnForm({ items: [], refundMethod: "original_payment" });

    // Show success message
    alert(`Return processed successfully: ${newReturn.returnNumber}`);
  };

  const handleSaveOrder = () => {
    // In a real app, this would save to the backend
    setIsOrderModalOpen(false);
  };

  const handleSaveSupplier = () => {
    // In a real app, this would save to the backend
    setIsSupplierModalOpen(false);
  };

  const handleOpenReceiveOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    // Initialize receiving form with current received quantities
    setReceivingForm({
      items: order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        newReceivedQuantity: item.receivedQuantity, // Start with current received quantity
      })),
    });
    setIsReceiveOrderModalOpen(true);
  };

  const handleUpdateReceivingQuantity = (
    sku: string,
    quantity: number
  ) => {
    setReceivingForm((prev) => ({
      items: prev.items.map((item) =>
        item.sku === sku
          ? {
              ...item,
              newReceivedQuantity: Math.max(
                0,
                Math.min(quantity, item.orderedQuantity)
              ),
            }
          : item
      ),
    }));
  };

  const handleProcessReceiving = () => {
    if (!selectedOrder) return;

    const itemsToReceive = receivingForm.items.filter(
      (item) => item.newReceivedQuantity > item.receivedQuantity
    );

    if (itemsToReceive.length === 0) {
      alert("No items to receive. Please increase quantities for at least one item.");
      return;
    }

    // Update stock levels and create inventory movements
    itemsToReceive.forEach((item) => {
      const quantityToReceive = item.newReceivedQuantity - item.receivedQuantity;
      
      // Find product/variant
      let product: Product | undefined;
      let variant: ProductVariant | undefined;
      
      if (item.variantId) {
        product = products.find((p) => p.id === item.productId);
        variant = product?.variants.find((v) => v.id === item.variantId);
      } else {
        product = products.find((p) => p.id === item.productId);
      }

      if (!product) {
        console.error(`Product not found: ${item.productId}`);
        return;
      }

      // Update stock
      const previousStock = variant?.stock ?? product.stock;
      const newStock = previousStock + quantityToReceive;

      if (variant) {
        variant.stock = newStock;
      } else {
        product.stock = newStock;
      }

      // Create inventory movement
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-${item.sku}`,
        productId: item.productId,
        productName: product.name,
        variantId: item.variantId,
        variantName: variant?.name,
        sku: item.sku,
        movementType: "purchase",
        quantity: quantityToReceive,
        previousStock,
        newStock,
        reason: `Purchase order received: ${selectedOrder.orderNumber}`,
        referenceId: selectedOrder.id,
        referenceType: "purchase_order",
        createdBy: "Current User", // TODO: Get from auth
        createdAt: new Date().toISOString(),
      };

      inventoryMovements.push(movement);
    });

    // Update order items with new received quantities
    selectedOrder.items = selectedOrder.items.map((orderItem) => {
      const receivingItem = receivingForm.items.find(
        (item) => item.sku === orderItem.sku
      );
      if (receivingItem) {
        return {
          ...orderItem,
          receivedQuantity: receivingItem.newReceivedQuantity,
        };
      }
      return orderItem;
    });

    // Update order status based on received quantities
    const allItemsReceived = selectedOrder.items.every(
      (item) => item.receivedQuantity >= item.quantity
    );
    const someItemsReceived = selectedOrder.items.some(
      (item) => item.receivedQuantity > 0
    );

    if (allItemsReceived) {
      selectedOrder.status = "received";
      selectedOrder.receivedAt = new Date().toISOString();
    } else if (someItemsReceived) {
      selectedOrder.status = "partially_received";
    }

    // Close modal and reset
    setIsReceiveOrderModalOpen(false);
    setSelectedOrder(null);
    setReceivingForm({ items: [] });

    // Show success message
    alert(
      `Order ${selectedOrder.orderNumber} received successfully. Stock levels updated.`
    );
  };

  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "ordered":
        return "default";
      case "shipped":
        return "outline";
      case "partially_received":
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
      case "partially_received":
        return <PackageCheck className="h-4 w-4" />;
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
        { value: "partially_received", label: "Partially Received" },
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

  const transactionColumns: ColumnDef<Transaction>[] = [
    {
      key: "transactionNumber",
      label: "Transaction #",
      defaultVisible: true,
      render: (item) => (
        <span className="font-mono font-medium">{item.transactionNumber}</span>
      ),
    },
    {
      key: "customerName",
      label: "Customer",
      icon: User,
      defaultVisible: true,
      render: (item) => item.customerName || "Walk-in",
    },
    {
      key: "items",
      label: "Items",
      defaultVisible: true,
      render: (item) => {
        const items = item.items as CartItem[];
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
      key: "paymentMethod",
      label: "Payment",
      icon: CreditCard,
      defaultVisible: true,
      render: (item) => {
        const method = item.paymentMethod as string;
        return method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      },
    },
    {
      key: "createdAt",
      label: "Date",
      icon: Calendar,
      defaultVisible: true,
      render: (item) => new Date(item.createdAt as string).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => {
        const status = item.status as string;
        const hasReturns = (item.returns as Return[] | undefined)?.length > 0;
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                status === "completed"
                  ? "default"
                  : status === "refunded"
                  ? "secondary"
                  : "destructive"
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {hasReturns && (
              <Badge variant="outline" className="text-xs">
                Has Returns
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  const transactionFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "completed", label: "Completed" },
        { value: "refunded", label: "Refunded" },
        { value: "voided", label: "Voided" },
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
          setSelectedTab(value as "orders" | "suppliers" | "transactions")
        }
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          {selectedTab !== "transactions" && (
            <Button
              onClick={
                selectedTab === "orders" ? handleCreateOrder : handleAddSupplier
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {selectedTab === "orders" ? "New Order" : "Add Supplier"}
            </Button>
          )}
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
                  {(item.status === "shipped" ||
                    item.status === "ordered" ||
                    item.status === "partially_received") && (
                    <DropdownMenuItem
                      onClick={() => handleOpenReceiveOrder(item as PurchaseOrder)}
                    >
                      <PackageCheck className="h-4 w-4 mr-2" />
                      Receive Order
                    </DropdownMenuItem>
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

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <DataTable
            data={allTransactions as Transaction[]}
            columns={transactionColumns}
            filters={transactionFilters}
            searchKey="transactionNumber"
            searchPlaceholder="Search by transaction number, customer..."
            actions={(item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleViewTransaction(item as Transaction)}
                  >
                    View Details
                  </DropdownMenuItem>
                  {(item as Transaction).status === "completed" && (
                    <DropdownMenuItem
                      onClick={() => handleInitiateReturn(item as Transaction)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Return / Refund
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

      {/* Return / Refund Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return / Refund</DialogTitle>
            <DialogDescription>
              Process a return and refund for transaction {selectedTransaction?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6 py-4">
              {/* Transaction Info */}
              <div className="p-4 rounded-lg bg-muted">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction</p>
                    <p className="font-medium font-mono">{selectedTransaction.transactionNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(selectedTransaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedTransaction.customerName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{selectedTransaction.customerName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Original Total</p>
                    <p className="font-medium">${selectedTransaction.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Select Items to Return */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Select Items to Return
                </Label>
                <div className="space-y-2 border rounded-lg p-4">
                  {selectedTransaction.items.map((item, index) => {
                    const returnItem = returnForm.items.find(
                      (ri) => ri.transactionItemId === `${selectedTransaction.id}-${index}`
                    );
                    const isSelected = !!returnItem;
                    const maxQuantity = item.quantity;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          isSelected ? "bg-blue-50 border-blue-200" : "bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newReturnItem = {
                                      transactionItemId: `${selectedTransaction.id}-${index}`,
                                      productId: item.productId,
                                      productName: item.productName,
                                      variantId: item.variantId,
                                      variantName: item.variantName,
                                      sku: item.sku,
                                      quantity: 1,
                                      originalQuantity: item.quantity,
                                      unitPrice: item.unitPrice,
                                      discount: item.discount,
                                      discountType: item.discountType,
                                      total: item.total,
                                      reason: "customer_request" as ReturnReason,
                                      restocked: true,
                                    };
                                    setReturnForm({
                                      ...returnForm,
                                      items: [...returnForm.items, newReturnItem],
                                    });
                                  } else {
                                    setReturnForm({
                                      ...returnForm,
                                      items: returnForm.items.filter(
                                        (ri) => ri.transactionItemId !== `${selectedTransaction.id}-${index}`
                                      ),
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <div className="flex-1">
                                <p className="font-medium">{item.productName}</p>
                                {item.variantName && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.variantName}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  ${item.unitPrice.toFixed(2)} each × {item.quantity}
                                </p>
                              </div>
                            </div>
                          </div>
                          {isSelected && returnItem && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId === `${selectedTransaction.id}-${index}`
                                      ? { ...ri, quantity: Math.max(1, ri.quantity - 1) }
                                      : ri
                                  );
                                  setReturnForm({ ...returnForm, items: updated });
                                }}
                                disabled={returnItem.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">
                                {returnItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId === `${selectedTransaction.id}-${index}`
                                      ? { ...ri, quantity: Math.min(maxQuantity, ri.quantity + 1) }
                                      : ri
                                  );
                                  setReturnForm({ ...returnForm, items: updated });
                                }}
                                disabled={returnItem.quantity >= maxQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Select
                                value={returnItem.reason}
                                onValueChange={(value: ReturnReason) => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId === `${selectedTransaction.id}-${index}`
                                      ? { ...ri, reason: value }
                                      : ri
                                  );
                                  setReturnForm({ ...returnForm, items: updated });
                                }}
                              >
                                <SelectTrigger className="w-40 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="defective">Defective</SelectItem>
                                  <SelectItem value="wrong_item">Wrong Item</SelectItem>
                                  <SelectItem value="not_as_described">Not as Described</SelectItem>
                                  <SelectItem value="customer_request">Customer Request</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Summary */}
              {returnForm.items.length > 0 && (
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <h4 className="font-medium">Return Summary</h4>
                  <div className="space-y-1">
                    {returnForm.items.map((item, index) => {
                      const subtotal = item.unitPrice * item.quantity;
                      const discountAmount = item.discountType === "percent"
                        ? (subtotal * item.discount) / 100
                        : item.discount;
                      const total = subtotal - discountAmount;
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Refund Total</span>
                      <span>
                        $
                        {returnForm.items
                          .reduce((sum, item) => {
                            const subtotal = item.unitPrice * item.quantity;
                            const discountAmount = item.discountType === "percent"
                              ? (subtotal * item.discount) / 100
                              : item.discount;
                            return sum + subtotal - discountAmount;
                          }, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Method */}
              {returnForm.items.length > 0 && (
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Refund Method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={returnForm.refundMethod === "original_payment" ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => setReturnForm({ ...returnForm, refundMethod: "original_payment" })}
                    >
                      <ArrowLeft className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Original Payment</p>
                        <p className="text-xs text-muted-foreground">
                          Refund to original payment method
                        </p>
                      </div>
                    </Button>
                    <Button
                      variant={returnForm.refundMethod === "store_credit" ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => setReturnForm({ ...returnForm, refundMethod: "store_credit" })}
                    >
                      <Wallet className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Store Credit</p>
                        <p className="text-xs text-muted-foreground">
                          Issue store credit to customer
                        </p>
                      </div>
                    </Button>
                    <Button
                      variant={returnForm.refundMethod === "gift_card" ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => setReturnForm({ ...returnForm, refundMethod: "gift_card" })}
                    >
                      <Gift className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Gift Card</p>
                        <p className="text-xs text-muted-foreground">
                          Issue gift card
                        </p>
                      </div>
                    </Button>
                    <Button
                      variant={returnForm.refundMethod === "cash" ? "default" : "outline"}
                      className="h-auto p-4 flex flex-col items-start gap-2"
                      onClick={() => setReturnForm({ ...returnForm, refundMethod: "cash" })}
                    >
                      <Banknote className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Cash</p>
                        <p className="text-xs text-muted-foreground">
                          Cash refund
                        </p>
                      </div>
                    </Button>
                    {customPaymentMethods
                      .filter((m) => m.isActive && m.canBeUsedForRefunds)
                      .map((method) => (
                        <Button
                          key={method.id}
                          variant={returnForm.refundMethod === "custom" && returnForm.customRefundMethodName === method.name ? "default" : "outline"}
                          className="h-auto p-4 flex flex-col items-start gap-2"
                          onClick={() => setReturnForm({ ...returnForm, refundMethod: "custom", customRefundMethodName: method.name })}
                        >
                          <CreditCard className="h-5 w-5" />
                          <div className="text-left">
                            <p className="font-medium">{method.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {method.description || "Custom payment method"}
                            </p>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Additional Fields based on Refund Method */}
              {returnForm.items.length > 0 && returnForm.refundMethod === "store_credit" && (
                <div className="grid gap-2">
                  <Label>Store Credit Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={returnForm.storeCreditAmount || ""}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        storeCreditAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter amount"
                  />
                </div>
              )}

              {returnForm.items.length > 0 && returnForm.refundMethod === "gift_card" && (
                <div className="grid gap-2">
                  <Label>Gift Card Number (optional - will be generated if empty)</Label>
                  <Input
                    type="text"
                    value={returnForm.giftCardNumber || ""}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        giftCardNumber: e.target.value,
                      })
                    }
                    placeholder="Leave empty to generate new card"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="grid gap-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={returnForm.notes || ""}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, notes: e.target.value })
                  }
                  placeholder="Additional notes about this return..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReturnModalOpen(false);
                setSelectedTransaction(null);
                setReturnForm({ items: [], refundMethod: "original_payment" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessReturn}
              disabled={returnForm.items.length === 0}
            >
              Process Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Order Modal */}
      <Dialog
        open={isReceiveOrderModalOpen}
        onOpenChange={setIsReceiveOrderModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>
              Enter the quantities received for each item. Stock levels will be updated automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold font-mono">{selectedOrder.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium pb-2 border-b">
                  <span className="font-medium">Item</span>
                  <div className="flex items-center gap-8">
                    <span className="w-24 text-center">Ordered</span>
                    <span className="w-24 text-center">Received</span>
                    <span className="w-24 text-center">To Receive</span>
                  </div>
                </div>

                {receivingForm.items.map((item, index) => {
                  const orderItem = selectedOrder.items.find(
                    (oi) => oi.sku === item.sku
                  );
                  const quantityToReceive =
                    item.newReceivedQuantity - item.receivedQuantity;
                  const remainingQuantity =
                    item.orderedQuantity - item.newReceivedQuantity;

                  return (
                    <div
                      key={item.sku}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {orderItem?.productName || "Unknown Product"}
                          </p>
                          {orderItem?.variantName && (
                            <p className="text-sm text-muted-foreground">
                              {orderItem.variantName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="w-24 text-center">
                            <span className="text-sm font-medium">
                              {item.orderedQuantity}
                            </span>
                          </div>
                          <div className="w-24 text-center">
                            <span className="text-sm text-muted-foreground">
                              {item.receivedQuantity}
                            </span>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min={item.receivedQuantity}
                              max={item.orderedQuantity}
                              value={item.newReceivedQuantity}
                              onChange={(e) =>
                                handleUpdateReceivingQuantity(
                                  item.sku,
                                  parseInt(e.target.value) || item.receivedQuantity
                                )
                              }
                              className="text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {quantityToReceive > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                          <PackageCheck className="h-4 w-4" />
                          <span>
                            Will receive {quantityToReceive} unit
                            {quantityToReceive !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {remainingQuantity > 0 && quantityToReceive > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            {remainingQuantity} unit
                            {remainingQuantity !== 1 ? "s" : ""} remaining
                          </span>
                        </div>
                      )}

                      {item.newReceivedQuantity >= item.orderedQuantity && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Fully received</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Items to Receive:</span>
                  <span className="font-medium">
                    {receivingForm.items
                      .filter(
                        (item) => item.newReceivedQuantity > item.receivedQuantity
                      )
                      .reduce(
                        (sum, item) =>
                          sum + (item.newReceivedQuantity - item.receivedQuantity),
                        0
                      )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Items Fully Received:</span>
                  <span className="font-medium">
                    {
                      receivingForm.items.filter(
                        (item) => item.newReceivedQuantity >= item.orderedQuantity
                      ).length
                    }{" "}
                    / {receivingForm.items.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReceiveOrderModalOpen(false);
                setSelectedOrder(null);
                setReceivingForm({ items: [] });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessReceiving}
              disabled={
                receivingForm.items.filter(
                  (item) => item.newReceivedQuantity > item.receivedQuantity
                ).length === 0
              }
            >
              <PackageCheck className="h-4 w-4 mr-2" />
              Process Receiving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
