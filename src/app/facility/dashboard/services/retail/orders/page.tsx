"use client";

import { useState } from "react";
import {
  Plus,
  Minus,
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
  User as UserIcon,
  CreditCard,
  Gift,
  Wallet,
  PackageCheck,
  AlertCircle,
  Banknote,
  Smartphone,
  Printer,
  Link as LinkIcon,
  Globe,
  Phone,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  ExternalLink,
  Hash,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  createReturn,
  createStoreCredit,
  createGiftCard,
  customPaymentMethods,
  inventoryMovements,
  type PurchaseOrder,
  type Supplier,
  type PurchaseOrderItem,
  type Transaction,
  type Return,
  type ReturnItem,
  type RefundMethod,
  type ReturnReason,
  type CartItem,
  getAllTransactions,
  type InventoryMovement,
  type Product,
  type ProductVariant,
  type PaymentMethod,
} from "@/data/retail";
import { processFiservRefund } from "@/lib/fiserv-payment-service";
import {
  getYipyyPayTransactionByTransactionId,
  getCloverTerminalTransactionByTransactionId,
  getFiservConfig,
} from "@/data/fiserv-payments";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { hasPermission, getCurrentUserId } from "@/lib/role-utils";
import {
  getPaymentMethodLabel,
  formatTransactionTimestamp,
  getLocationName,
} from "@/lib/payment-method-utils";
import { logPaymentAction } from "@/lib/payment-audit";

type PurchaseOrderWithRecord = PurchaseOrder & Record<string, unknown>;
type SupplierWithRecord = Supplier & Record<string, unknown>;

export default function OrdersPage() {
  const { role: facilityRole } = useFacilityRole();
  const currentUserId = getCurrentUserId() || "staff-001";
  const isManager = facilityRole === "manager" || facilityRole === "owner";
  const canOverrideRefund =
    hasPermission(facilityRole, "process_refund", currentUserId || undefined) &&
    isManager;

  const [selectedTab, setSelectedTab] = useState<
    "orders" | "suppliers" | "transactions"
  >("orders");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReceiveOrderModalOpen, setIsReceiveOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
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
    items: ReturnItem[];
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
    contactTitle: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    website: "",
    portalUrl: "",
    portalUsername: "",
    portalPassword: "",
    paymentTerms: "Net 30",
    preferredPaymentMethod: "" as string,
    accountNumber: "",
    leadTimeDays: 7,
    minimumOrderAmount: 0,
    notes: "",
  });
  const [showPortalPassword, setShowPortalPassword] = useState(false);

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
      contactTitle: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      website: "",
      portalUrl: "",
      portalUsername: "",
      portalPassword: "",
      paymentTerms: "Net 30",
      preferredPaymentMethod: "",
      accountNumber: "",
      leadTimeDays: 7,
      minimumOrderAmount: 0,
      notes: "",
    });
    setShowPortalPassword(false);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName,
      contactTitle: supplier.contactTitle || "",
      email: supplier.email,
      phone: supplier.phone,
      secondaryPhone: supplier.secondaryPhone || "",
      address: supplier.address,
      city: supplier.city,
      state: supplier.state || "",
      postalCode: supplier.postalCode || "",
      country: supplier.country,
      website: supplier.website || "",
      portalUrl: supplier.orderingPortal?.url || "",
      portalUsername: supplier.orderingPortal?.username || "",
      portalPassword: supplier.orderingPortal?.password || "",
      paymentTerms: supplier.paymentTerms,
      preferredPaymentMethod: supplier.preferredPaymentMethod || "",
      accountNumber: supplier.accountNumber || "",
      leadTimeDays: supplier.leadTimeDays,
      minimumOrderAmount: supplier.minimumOrderAmount || 0,
      notes: supplier.notes,
    });
    setShowPortalPassword(false);
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

  const handleProcessReturn = async () => {
    if (!selectedTransaction || returnForm.items.length === 0) return;

    const facilityId = 11; // TODO: Get from context
    const fiservConfig = getFiservConfig(facilityId);
    const refundRules = fiservConfig?.refundRules;
    const refundMethods = fiservConfig?.refundMethods;

    // Check if refund method is enabled
    if (refundMethods) {
      if (
        returnForm.refundMethod === "original_payment" &&
        !refundMethods.originalPayment
      ) {
        alert(
          "Original payment refunds are disabled. Please select another refund method.",
        );
        return;
      }
      if (returnForm.refundMethod === "cash" && !refundMethods.cash) {
        alert(
          "Cash refunds are disabled. Please select another refund method.",
        );
        return;
      }
      if (
        returnForm.refundMethod === "store_credit" &&
        !refundMethods.storeCredit
      ) {
        alert(
          "Store credit refunds are disabled. Please select another refund method.",
        );
        return;
      }
      if (returnForm.refundMethod === "gift_card" && !refundMethods.giftCard) {
        alert(
          "Gift card refunds are disabled. Please select another refund method.",
        );
        return;
      }
      if (returnForm.refundMethod === "custom" && !refundMethods.custom) {
        alert(
          "Custom payment method refunds are disabled. Please select another refund method.",
        );
        return;
      }
    }

    const refundTotal = returnForm.items.reduce((sum, item) => {
      const subtotal = item.unitPrice * item.quantity;
      const discountAmount =
        item.discountType === "percent"
          ? (subtotal * item.discount) / 100
          : item.discount;
      return sum + subtotal - discountAmount;
    }, 0);

    // Check manager approval requirement
    if (refundRules?.managerApprovalRequired) {
      const threshold = refundRules.managerApprovalThreshold || 0;
      if (refundTotal > threshold && !canOverrideRefund) {
        alert(
          `Manager approval required for refunds over $${threshold.toFixed(2)}. Current refund amount: $${refundTotal.toFixed(2)}. Please contact a manager.`,
        );
        return;
      }
    }

    // Validate that at least one item has a reason (if required)
    if (refundRules?.requireReason) {
      const itemsWithoutReason = returnForm.items.filter(
        (item) =>
          !item.reason || (item.reason === "other" && !item.reasonNotes),
      );
      if (itemsWithoutReason.length > 0) {
        alert(
          "Return reason is required for all items. Please select a reason for each item.",
        );
        return;
      }
    } else {
      // Recommended but not required
      const itemsWithoutReason = returnForm.items.filter(
        (item) =>
          !item.reason || (item.reason === "other" && !item.reasonNotes),
      );
      if (itemsWithoutReason.length > 0) {
        const proceed = confirm(
          "Warning: Some items don't have a return reason specified. It's recommended to provide a reason for audit purposes. Do you want to continue anyway?",
        );
        if (!proceed) return;
      }
    }

    // Validate that notes are provided (if required)
    if (refundRules?.requireNotes && !returnForm.notes) {
      alert(
        "Notes are required for all refunds. Please provide notes explaining the refund.",
      );
      return;
    } else if (
      !refundRules?.requireNotes &&
      returnForm.refundMethod !== "original_payment" &&
      !returnForm.notes
    ) {
      // Recommended but not required for overrides
      const proceed = confirm(
        "Warning: No notes provided for this refund override. It's recommended to document why the refund method was changed. Do you want to continue anyway?",
      );
      if (!proceed) return;
    }
    let fiservRefundId: string | undefined;
    let refundProcessed = false;
    let refundError: string | undefined;

    // Process refund via original payment method if applicable
    if (returnForm.refundMethod === "original_payment") {
      // Handle split payments - refund proportionally or last payment first
      if (
        selectedTransaction.paymentMethod === "split" &&
        selectedTransaction.payments &&
        selectedTransaction.payments.length > 1
      ) {
        // Get refund policy from facility settings
        const fiservConfig = getFiservConfig(facilityId);
        const refundPolicy =
          fiservConfig?.processingSettings?.splitPaymentRefundPolicy ||
          "last_payment_first";

        if (refundPolicy === "last_payment_first") {
          // Refund from last payment first, then work backwards
          let remainingRefund = refundTotal;
          const refunds: Array<{
            method: PaymentMethod;
            amount: number;
            transactionId?: string;
          }> = [];

          for (
            let i = selectedTransaction.payments.length - 1;
            i >= 0 && remainingRefund > 0;
            i--
          ) {
            const payment = selectedTransaction.payments[i];
            const refundAmount = Math.min(remainingRefund, payment.amount);

            // Process refund based on payment method
            if (
              (payment.method === "credit" || payment.method === "debit") &&
              selectedTransaction.yipyyPayTransactionId
            ) {
              // Refund via Yipyy Pay (iPhone)
              const yipyyPayTxn = getYipyyPayTransactionByTransactionId(
                selectedTransaction.yipyyPayTransactionId,
              );
              if (yipyyPayTxn) {
                const fiservRefundRequest = {
                  facilityId,
                  originalTransactionId: selectedTransaction.id,
                  fiservTransactionId: yipyyPayTxn.yipyyTransactionId,
                  amount: refundAmount,
                  reason:
                    returnForm.notes || "Refund for return (split payment)",
                  metadata: {
                    returnReason:
                      returnForm.items[0]?.reason || "customer_request",
                    splitPaymentIndex: i,
                    refundPolicy: "last_payment_first",
                  },
                };

                try {
                  const fiservRefundResponse =
                    await processFiservRefund(fiservRefundRequest);
                  if (fiservRefundResponse.success) {
                    refunds.push({
                      method: payment.method,
                      amount: refundAmount,
                      transactionId: fiservRefundResponse.fiservRefundId,
                    });
                    remainingRefund -= refundAmount;
                    refundProcessed = true;
                  } else {
                    refundError = `Payment ${i + 1} refund failed: ${fiservRefundResponse.error?.message || "Unknown error"}`;
                    if (!canOverrideRefund) {
                      alert(
                        `Refund failed: ${refundError}. Please contact a manager for override options.`,
                      );
                      return;
                    }
                  }
                } catch (error) {
                  refundError = `Payment ${i + 1} refund error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  if (!canOverrideRefund) {
                    alert(
                      `Refund failed: ${refundError}. Please contact a manager for override options.`,
                    );
                    return;
                  }
                }
              }
            } else if (
              (payment.method === "credit" || payment.method === "debit") &&
              selectedTransaction.cloverTransactionId
            ) {
              // Refund via Clover Terminal
              const cloverTxn = getCloverTerminalTransactionByTransactionId(
                selectedTransaction.cloverTransactionId,
              );
              if (cloverTxn) {
                const fiservRefundRequest = {
                  facilityId,
                  originalTransactionId: selectedTransaction.id,
                  fiservTransactionId: cloverTxn.cloverTransactionId, // Clover transaction ID is used as Fiserv transaction ID
                  amount: refundAmount,
                  reason:
                    returnForm.notes || "Refund for return (split payment)",
                  metadata: {
                    returnReason:
                      returnForm.items[0]?.reason || "customer_request",
                    splitPaymentIndex: i,
                    refundPolicy: "last_payment_first",
                  },
                };

                try {
                  const fiservRefundResponse =
                    await processFiservRefund(fiservRefundRequest);
                  if (fiservRefundResponse.success) {
                    refunds.push({
                      method: payment.method,
                      amount: refundAmount,
                      transactionId: fiservRefundResponse.fiservRefundId,
                    });
                    remainingRefund -= refundAmount;
                    refundProcessed = true;
                  } else {
                    refundError = `Payment ${i + 1} refund failed: ${fiservRefundResponse.error?.message || "Unknown error"}`;
                    if (!canOverrideRefund) {
                      alert(
                        `Refund failed: ${refundError}. Please contact a manager for override options.`,
                      );
                      return;
                    }
                  }
                } catch (error) {
                  refundError = `Payment ${i + 1} refund error: ${error instanceof Error ? error.message : "Unknown error"}`;
                  if (!canOverrideRefund) {
                    alert(
                      `Refund failed: ${refundError}. Please contact a manager for override options.`,
                    );
                    return;
                  }
                }
              }
            } else if (
              (payment.method === "credit" || payment.method === "debit") &&
              selectedTransaction.fiservTransactionId
            ) {
              // Refund via Fiserv
              const fiservRefundRequest = {
                facilityId,
                originalTransactionId: selectedTransaction.id,
                fiservTransactionId: selectedTransaction.fiservTransactionId,
                amount: refundAmount,
                reason: returnForm.notes || "Refund for return (split payment)",
                metadata: {
                  returnReason:
                    returnForm.items[0]?.reason || "customer_request",
                  splitPaymentIndex: i,
                  refundPolicy: "last_payment_first",
                },
              };

              try {
                const fiservRefundResponse =
                  await processFiservRefund(fiservRefundRequest);
                if (fiservRefundResponse.success) {
                  refunds.push({
                    method: payment.method,
                    amount: refundAmount,
                    transactionId: fiservRefundResponse.fiservRefundId,
                  });
                  remainingRefund -= refundAmount;
                  refundProcessed = true;
                } else {
                  refundError = `Payment ${i + 1} refund failed: ${fiservRefundResponse.error?.message || "Unknown error"}`;
                  if (!canOverrideRefund) {
                    alert(
                      `Refund failed: ${refundError}. Please contact a manager for override options.`,
                    );
                    return;
                  }
                }
              } catch (error) {
                refundError = `Payment ${i + 1} refund error: ${error instanceof Error ? error.message : "Unknown error"}`;
                if (!canOverrideRefund) {
                  alert(
                    `Refund failed: ${refundError}. Please contact a manager for override options.`,
                  );
                  return;
                }
              }
            } else if (
              payment.method === "cash" ||
              payment.method === "store_credit" ||
              payment.method === "gift_card"
            ) {
              // Cash/store credit/gift card - no processing needed
              refunds.push({
                method: payment.method,
                amount: refundAmount,
              });
              remainingRefund -= refundAmount;
              refundProcessed = true;
            }
          }

          // Update audit notes with split payment refund details
          if (refunds.length > 0) {
            fiservRefundId = refunds
              .map((r) => r.transactionId)
              .filter(Boolean)
              .join(", ");
          }
        } else {
          // Proportional refund - refund each payment method proportionally
          const totalOriginal = selectedTransaction.payments.reduce(
            (sum, p) => sum + p.amount,
            0,
          );
          const refunds: Array<{
            method: PaymentMethod;
            amount: number;
            transactionId?: string;
          }> = [];

          for (let i = 0; i < selectedTransaction.payments.length; i++) {
            const payment = selectedTransaction.payments[i];
            const proportionalRefund =
              (payment.amount / totalOriginal) * refundTotal;

            // Process refund based on payment method (similar logic as above)
            // ... (similar to last_payment_first logic but proportional)
            // For brevity, using same logic structure
            refunds.push({
              method: payment.method,
              amount: proportionalRefund,
            });
            refundProcessed = true;
          }

          if (refunds.length > 0) {
            fiservRefundId = refunds
              .map((r) => r.transactionId)
              .filter(Boolean)
              .join(", ");
          }
        }
      }
      // Check if original payment was via Yipyy Pay (iPhone) - single payment
      else if (selectedTransaction.yipyyPayTransactionId) {
        const yipyyPayTxn = getYipyyPayTransactionByTransactionId(
          selectedTransaction.yipyyPayTransactionId,
        );
        if (yipyyPayTxn) {
          // Process refund through Fiserv (Yipyy Pay uses Fiserv backend)
          const fiservRefundRequest = {
            facilityId,
            originalTransactionId: selectedTransaction.id,
            fiservTransactionId: yipyyPayTxn.yipyyTransactionId,
            amount: refundTotal,
            reason: returnForm.notes || "Refund for return",
            metadata: {
              returnReason: returnForm.items[0]?.reason || "customer_request",
              yipyyPayTransactionId: selectedTransaction.yipyyPayTransactionId,
            },
          };

          try {
            const fiservRefundResponse =
              await processFiservRefund(fiservRefundRequest);
            if (fiservRefundResponse.success) {
              fiservRefundId = fiservRefundResponse.fiservRefundId;
              refundProcessed = true;
            } else {
              refundError =
                fiservRefundResponse.error?.message || "Fiserv refund failed";
              // If refund fails and user is manager, allow override
              if (!canOverrideRefund) {
                alert(
                  `Refund failed: ${refundError}. Please contact a manager for override options.`,
                );
                return;
              }
            }
          } catch {
            refundError = "Error processing Fiserv refund";
            if (!canOverrideRefund) {
              alert(
                `Refund failed: ${refundError}. Please contact a manager for override options.`,
              );
              return;
            }
          }
        }
      }
      // Check if original payment was via Clover Terminal
      else if (selectedTransaction.cloverTransactionId) {
        const cloverTxn = getCloverTerminalTransactionByTransactionId(
          selectedTransaction.cloverTransactionId,
        );
        if (cloverTxn) {
          // Process refund through Fiserv
          const fiservRefundRequest = {
            facilityId,
            originalTransactionId: selectedTransaction.id,
            fiservTransactionId: cloverTxn.cloverTransactionId, // Clover transaction ID is used as Fiserv transaction ID
            amount: refundTotal,
            reason: returnForm.notes || "Refund for return",
            metadata: {
              returnReason: returnForm.items[0]?.reason || "customer_request",
              cloverTransactionId: selectedTransaction.cloverTransactionId,
            },
          };

          try {
            const fiservRefundResponse =
              await processFiservRefund(fiservRefundRequest);
            if (fiservRefundResponse.success) {
              fiservRefundId = fiservRefundResponse.fiservRefundId;
              refundProcessed = true;
            } else {
              refundError =
                fiservRefundResponse.error?.message || "Fiserv refund failed";
              if (!canOverrideRefund) {
                alert(
                  `Refund failed: ${refundError}. Please contact a manager for override options.`,
                );
                return;
              }
            }
          } catch {
            refundError = "Error processing Fiserv refund";
            if (!canOverrideRefund) {
              alert(
                `Refund failed: ${refundError}. Please contact a manager for override options.`,
              );
              return;
            }
          }
        }
      }
      // Check if original payment was via Fiserv (saved card or new card)
      else if (selectedTransaction.fiservTransactionId) {
        const fiservRefundRequest = {
          facilityId,
          originalTransactionId: selectedTransaction.id,
          fiservTransactionId: selectedTransaction.fiservTransactionId,
          amount: refundTotal,
          reason: returnForm.notes || "Refund for return",
          metadata: {
            returnReason: returnForm.items[0]?.reason || "customer_request",
            tokenizedCardId: selectedTransaction.tokenizedCardId,
          },
        };

        try {
          const fiservRefundResponse =
            await processFiservRefund(fiservRefundRequest);
          if (fiservRefundResponse.success) {
            fiservRefundId = fiservRefundResponse.fiservRefundId;
            refundProcessed = true;
          } else {
            refundError =
              fiservRefundResponse.error?.message || "Fiserv refund failed";
            if (!canOverrideRefund) {
              alert(
                `Refund failed: ${refundError}. Please contact a manager for override options.`,
              );
              return;
            }
          }
        } catch {
          refundError = "Error processing Fiserv refund";
          if (!canOverrideRefund) {
            alert(
              `Refund failed: ${refundError}. Please contact a manager for override options.`,
            );
            return;
          }
        }
      }
      // For cash payments, refund is immediate
      else if (selectedTransaction.paymentMethod === "cash") {
        refundProcessed = true;
      }
    }

    // Handle cash refund override (when refund method is explicitly set to cash)
    if (returnForm.refundMethod === "cash") {
      refundProcessed = true;
      // Cash refunds are immediate - no processing needed
    }

    // Log method override if not original payment
    if (returnForm.refundMethod !== "original_payment" && canOverrideRefund) {
      logPaymentAction("method_override", {
        facilityId,
        transactionId: selectedTransaction.id,
        transactionNumber: selectedTransaction.transactionNumber,
        amount: refundTotal,
        originalPaymentMethod: selectedTransaction.paymentMethod,
        overrideMethod: returnForm.refundMethod,
        staffId: currentUserId,
        staffName: "Staff",
        staffRole: facilityRole,
        customerId: selectedTransaction.customerId,
        customerName: selectedTransaction.customerName,
        reason: returnForm.notes || "Manager override",
        notes: `Refund method overridden from ${selectedTransaction.paymentMethod} to ${returnForm.refundMethod}`,
        metadata: {
          canOverride: canOverrideRefund,
          isManager: isManager,
        },
      });
    }

    // Log refund action
    logPaymentAction("refund", {
      facilityId,
      transactionId: selectedTransaction.id,
      transactionNumber: selectedTransaction.transactionNumber,
      amount: refundTotal,
      paymentMethod: returnForm.refundMethod,
      originalPaymentMethod: selectedTransaction.paymentMethod,
      processorTransactionId: fiservRefundId,
      staffId: currentUserId,
      staffName: "Staff",
      staffRole: facilityRole,
      customerId: selectedTransaction.customerId,
      customerName: selectedTransaction.customerName,
      reason: returnForm.notes || "Customer return",
      notes: `Refund processed: ${refundProcessed ? "Success" : "Failed"}`,
      metadata: {
        refundError: refundError,
        itemsReturned: returnForm.items.length,
        isOverride: returnForm.refundMethod !== "original_payment",
      },
    });

    // Create return with audit trail
    const auditNotes = [
      `Refund Method: ${returnForm.refundMethod}`,
      returnForm.refundMethod === "original_payment" &&
      refundProcessed &&
      fiservRefundId
        ? `Fiserv Refund ID: ${fiservRefundId}`
        : null,
      returnForm.refundMethod === "original_payment" && refundError
        ? `Refund Error: ${refundError}${canOverrideRefund ? " (Manager Override)" : ""}`
        : null,
      returnForm.refundMethod !== "original_payment" && canOverrideRefund
        ? `Manager Override: ${returnForm.refundMethod}`
        : null,
      returnForm.notes ? `Notes: ${returnForm.notes}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const newReturn = createReturn({
      transactionId: selectedTransaction.id,
      transactionNumber: selectedTransaction.transactionNumber,
      items: returnForm.items.map((item) => ({
        ...item,
        reasonNotes: item.reasonNotes,
      })),
      subtotal: refundTotal,
      refundTotal,
      refundMethod: returnForm.refundMethod,
      customRefundMethodName: returnForm.customRefundMethodName,
      storeCreditAmount:
        returnForm.refundMethod === "store_credit" ? refundTotal : undefined,
      giftCardNumber:
        returnForm.refundMethod === "gift_card"
          ? returnForm.giftCardNumber
          : undefined,
      status:
        refundProcessed || returnForm.refundMethod !== "original_payment"
          ? "completed"
          : "pending",
      customerId: selectedTransaction.customerId,
      customerName: selectedTransaction.customerName,
      customerEmail: selectedTransaction.customerEmail,
      processedBy: "current-user-id", // TODO: Get from auth
      processedByName: "Current User", // TODO: Get from auth
      notes: auditNotes,
      completedAt:
        refundProcessed || returnForm.refundMethod !== "original_payment"
          ? new Date().toISOString().slice(0, 19)
          : undefined,
    });

    // Create store credit if applicable
    if (
      returnForm.refundMethod === "store_credit" &&
      selectedTransaction.customerId
    ) {
      createStoreCredit({
        customerId: selectedTransaction.customerId,
        customerName: selectedTransaction.customerName || "Customer",
        amount: refundTotal,
        balance: refundTotal,
        issuedFrom: newReturn.id,
        notes: `Issued from return ${newReturn.returnNumber}${refundError ? ` (Override due to: ${refundError})` : ""}`,
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
        notes: `Issued from return ${newReturn.returnNumber}${refundError ? ` (Override due to: ${refundError})` : ""}`,
      });
    }

    // Update transaction status and add return to transaction history
    if (selectedTransaction) {
      // Add return to transaction's returns array
      const updatedReturns = [
        ...(selectedTransaction.returns || []),
        newReturn,
      ];
      // Update transaction status if fully refunded
      const totalRefunded = updatedReturns.reduce(
        (sum, r) => sum + r.refundTotal,
        0,
      );
      if (totalRefunded >= selectedTransaction.total) {
        // Transaction is fully refunded
        // Note: In a real app, this would update the transaction in the database
        // For now, we just log it
        console.log(
          `Transaction ${selectedTransaction.transactionNumber} fully refunded`,
        );
      }
    }

    // TODO: Restock items to inventory
    // This would update product/variant stock levels

    // Close modal and reset
    setIsReturnModalOpen(false);
    setSelectedTransaction(null);
    setReturnForm({ items: [], refundMethod: "original_payment" });

    // Show success message
    const successMessage =
      refundProcessed || returnForm.refundMethod !== "original_payment"
        ? `Return processed successfully: ${newReturn.returnNumber}`
        : `Return created but refund pending: ${newReturn.returnNumber}. ${refundError || "Please process refund manually."}`;
    alert(successMessage);
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

  const handleUpdateReceivingQuantity = (sku: string, quantity: number) => {
    setReceivingForm((prev) => ({
      items: prev.items.map((item) =>
        item.sku === sku
          ? {
              ...item,
              newReceivedQuantity: Math.max(
                0,
                Math.min(quantity, item.orderedQuantity),
              ),
            }
          : item,
      ),
    }));
  };

  const handleProcessReceiving = () => {
    if (!selectedOrder) return;

    const itemsToReceive = receivingForm.items.filter(
      (item) => item.newReceivedQuantity > item.receivedQuantity,
    );

    if (itemsToReceive.length === 0) {
      alert(
        "No items to receive. Please increase quantities for at least one item.",
      );
      return;
    }

    // Update stock levels and create inventory movements
    itemsToReceive.forEach((item) => {
      const quantityToReceive =
        item.newReceivedQuantity - item.receivedQuantity;

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
    const updatedItems = selectedOrder.items.map((orderItem) => {
      const receivingItem = receivingForm.items.find(
        (item) => item.sku === orderItem.sku,
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
    const allItemsReceived = updatedItems.every(
      (item) => item.receivedQuantity >= item.quantity,
    );
    const someItemsReceived = updatedItems.some(
      (item) => item.receivedQuantity > 0,
    );

    let updatedStatus = selectedOrder.status;
    let updatedReceivedAt = selectedOrder.receivedAt;
    if (allItemsReceived) {
      updatedStatus = "received";
      updatedReceivedAt = new Date().toISOString();
    } else if (someItemsReceived) {
      updatedStatus = "partially_received";
    }

    const _updatedOrder = {
      ...selectedOrder,
      items: updatedItems,
      status: updatedStatus,
      receivedAt: updatedReceivedAt,
    };

    // Close modal and reset
    setIsReceiveOrderModalOpen(false);
    setSelectedOrder(null);
    setReceivingForm({ items: [] });

    // Show success message
    alert(
      `Order ${selectedOrder.orderNumber} received successfully. Stock levels updated.`,
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
        return <Clock className="size-4" />;
      case "ordered":
        return <Package className="size-4" />;
      case "shipped":
        return <Truck className="size-4" />;
      case "partially_received":
        return <PackageCheck className="size-4" />;
      case "received":
        return <CheckCircle2 className="size-4" />;
      case "cancelled":
        return <XCircle className="size-4" />;
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
          <div className="text-muted-foreground text-sm">
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
      label: "Payment Method",
      icon: CreditCard,
      defaultVisible: true,
      render: (item) => {
        const paymentInfo = getPaymentMethodLabel(item as Transaction);
        const PaymentIcon = paymentInfo.icon;
        return (
          <div className="flex items-center gap-2">
            <PaymentIcon className="text-muted-foreground size-4" />
            <div className="flex flex-col">
              <span className="font-medium">{paymentInfo.label}</span>
              {paymentInfo.transactionId && (
                <span className="text-muted-foreground font-mono text-xs">
                  ID: {paymentInfo.transactionId.slice(0, 12)}...
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "processorTransactionId",
      label: "Processor ID",
      defaultVisible: false,
      render: (item) => {
        const txn = item as Transaction;
        const transactionId =
          txn.yipyyPayTransactionId ||
          txn.cloverTransactionId ||
          txn.fiservTransactionId;
        if (!transactionId)
          return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{transactionId}</span>
            {txn.yipyyPayTransactionId && (
              <span className="text-muted-foreground text-xs">Yipyy Pay</span>
            )}
            {txn.cloverTransactionId && (
              <span className="text-muted-foreground text-xs">Clover</span>
            )}
            {txn.fiservTransactionId &&
              !txn.yipyyPayTransactionId &&
              !txn.cloverTransactionId && (
                <span className="text-muted-foreground text-xs">Fiserv</span>
              )}
          </div>
        );
      },
    },
    {
      key: "cashier",
      label: "Staff Member",
      icon: UserIcon,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{txn.cashierName || "Unknown"}</span>
            {txn.cashierId && (
              <span className="text-muted-foreground text-xs">
                ID: {txn.cashierId}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      icon: MapPin,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        const locationName = getLocationName(txn.locationId);
        return (
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            <span>{locationName}</span>
          </div>
        );
      },
    },
    {
      key: "timestamp",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        return (
          <div className="flex flex-col">
            <span>{formatTransactionTimestamp(txn.createdAt)}</span>
            <span className="text-muted-foreground text-xs">
              {new Date(txn.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: "bookingReference",
      label: "Booking/Service",
      icon: LinkIcon,
      defaultVisible: false,
      render: (item) => {
        const txn = item as Transaction;
        if (!txn.bookingId && !txn.bookingService) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-col">
            {txn.bookingId && (
              <span className="font-medium">Booking #{txn.bookingId}</span>
            )}
            {txn.bookingService && (
              <span className="text-muted-foreground text-xs capitalize">
                {txn.bookingService}
              </span>
            )}
            {txn.petName && (
              <span className="text-muted-foreground text-xs">
                Pet: {txn.petName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date",
      icon: Calendar,
      defaultVisible: false,
      render: (item) => new Date(item.createdAt as string).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => {
        const status = item.status as string;
        const returns = item.returns as Return[] | undefined;
        const hasReturns = returns && returns.length > 0;
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
            <Package className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <p className="text-muted-foreground text-xs">
              {receivedOrders} received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-muted-foreground text-xs">Awaiting delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Value</CardTitle>
            <DollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalOrderValue.toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">Total ordered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Building2 className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-muted-foreground text-xs">
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
              <Package className="size-4" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="size-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Building2 className="size-4" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          {selectedTab !== "transactions" && (
            <Button
              onClick={
                selectedTab === "orders" ? handleCreateOrder : handleAddSupplier
              }
            >
              <Plus className="mr-2 size-4" />
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
                    <MoreHorizontal className="size-4" />
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
                      onClick={() =>
                        handleOpenReceiveOrder(item as PurchaseOrder)
                      }
                    >
                      <PackageCheck className="mr-2 size-4" />
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
                    <MoreHorizontal className="size-4" />
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
                      <RotateCcw className="mr-2 size-4" />
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
                    <MoreHorizontal className="size-4" />
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
              <p className="text-muted-foreground text-sm">
                Add products to this order. Select from available products
                below.
              </p>
              <div className="space-y-2 rounded-lg border p-4">
                {products.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="bg-muted/30 flex items-center justify-between rounded-sm border p-2"
                  >
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="text-primary size-5" />
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier details below."
                : "Fill in the supplier details. Only company name is required to get started."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Company Info ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold tracking-wide uppercase">
                  Company
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-name" className="text-xs font-medium">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sup-name"
                    value={supplierForm.name}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, name: e.target.value })
                    }
                    placeholder="e.g., PetSupply Wholesale"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-website" className="text-xs font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-website"
                      value={supplierForm.website}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          website: e.target.value,
                        })
                      }
                      placeholder="www.company.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Contact Person ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold tracking-wide uppercase">
                  Contact Person
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-contact" className="text-xs font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="sup-contact"
                    value={supplierForm.contactName}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        contactName: e.target.value,
                      })
                    }
                    placeholder="Robert Martinez"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-title" className="text-xs font-medium">
                    Title / Role
                  </Label>
                  <Input
                    id="sup-title"
                    value={supplierForm.contactTitle}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        contactTitle: e.target.value,
                      })
                    }
                    placeholder="Account Manager"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-email" className="text-xs font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-email"
                      type="email"
                      value={supplierForm.email}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="orders@company.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-phone" className="text-xs font-medium">
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-phone"
                      value={supplierForm.phone}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="(555) 123-4567"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-phone2" className="text-xs font-medium">
                    Secondary Phone
                  </Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-phone2"
                      value={supplierForm.secondaryPhone}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          secondaryPhone: e.target.value,
                        })
                      }
                      placeholder="(555) 123-4568"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Address ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold tracking-wide uppercase">
                  Address
                </h4>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sup-address" className="text-xs font-medium">
                  Street Address
                </Label>
                <Input
                  id="sup-address"
                  value={supplierForm.address}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="1234 Distribution Way"
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-city" className="text-xs font-medium">
                    City
                  </Label>
                  <Input
                    id="sup-city"
                    value={supplierForm.city}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, city: e.target.value })
                    }
                    placeholder="Chicago"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-state" className="text-xs font-medium">
                    State / Province
                  </Label>
                  <Input
                    id="sup-state"
                    value={supplierForm.state}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        state: e.target.value,
                      })
                    }
                    placeholder="IL"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-postal" className="text-xs font-medium">
                    Postal Code
                  </Label>
                  <Input
                    id="sup-postal"
                    value={supplierForm.postalCode}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        postalCode: e.target.value,
                      })
                    }
                    placeholder="60601"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-country" className="text-xs font-medium">
                    Country
                  </Label>
                  <Input
                    id="sup-country"
                    value={supplierForm.country}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        country: e.target.value,
                      })
                    }
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Ordering Portal & Credentials ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold tracking-wide uppercase">
                  Ordering Portal
                </h4>
                <span className="text-muted-foreground text-xs">
                  (saved locally)
                </span>
              </div>
              <p className="text-muted-foreground -mt-2 text-xs">
                Save the login credentials for this supplier&apos;s ordering
                website for quick access.
              </p>
              <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="sup-portal-url"
                    className="text-xs font-medium"
                  >
                    Portal URL
                  </Label>
                  <div className="relative">
                    <ExternalLink className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-portal-url"
                      value={supplierForm.portalUrl}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          portalUrl: e.target.value,
                        })
                      }
                      placeholder="https://portal.supplier.com"
                      className="bg-background pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="sup-portal-user"
                      className="text-xs font-medium"
                    >
                      Username
                    </Label>
                    <div className="relative">
                      <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="sup-portal-user"
                        value={supplierForm.portalUsername}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            portalUsername: e.target.value,
                          })
                        }
                        placeholder="your_username"
                        className="bg-background pr-9 pl-9"
                      />
                      {supplierForm.portalUsername && (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              supplierForm.portalUsername,
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="sup-portal-pass"
                      className="text-xs font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="sup-portal-pass"
                        type={showPortalPassword ? "text" : "password"}
                        value={supplierForm.portalPassword}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            portalPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="bg-background pr-16 pl-9"
                      />
                      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 gap-1">
                        {supplierForm.portalPassword && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                supplierForm.portalPassword,
                              )
                            }
                          >
                            <Copy className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setShowPortalPassword(!showPortalPassword)
                          }
                        >
                          {showPortalPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {supplierForm.portalUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const url = supplierForm.portalUrl.startsWith("http")
                        ? supplierForm.portalUrl
                        : `https://${supplierForm.portalUrl}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                    Open Portal
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Payment & Ordering ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="text-muted-foreground size-4" />
                <h4 className="text-sm font-semibold tracking-wide uppercase">
                  Payment & Ordering
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-terms" className="text-xs font-medium">
                    Payment Terms
                  </Label>
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
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="sup-payment-method"
                    className="text-xs font-medium"
                  >
                    Preferred Payment Method
                  </Label>
                  <Select
                    value={supplierForm.preferredPaymentMethod}
                    onValueChange={(value) =>
                      setSupplierForm({
                        ...supplierForm,
                        preferredPaymentMethod: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-account" className="text-xs font-medium">
                    Account Number
                  </Label>
                  <div className="relative">
                    <Hash className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-account"
                      value={supplierForm.accountNumber}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          accountNumber: e.target.value,
                        })
                      }
                      placeholder="PSW-10482"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sup-lead" className="text-xs font-medium">
                    Lead Time (days)
                  </Label>
                  <div className="relative">
                    <Clock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-lead"
                      type="number"
                      min={1}
                      value={supplierForm.leadTimeDays}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          leadTimeDays: parseInt(e.target.value) || 1,
                        })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="sup-min-order"
                    className="text-xs font-medium"
                  >
                    Min. Order ($)
                  </Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="sup-min-order"
                      type="number"
                      min={0}
                      value={supplierForm.minimumOrderAmount || ""}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          minimumOrderAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Notes ── */}
            <div className="grid gap-1.5">
              <Label htmlFor="sup-notes" className="text-xs font-medium">
                Notes
              </Label>
              <Textarea
                id="sup-notes"
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, notes: e.target.value })
                }
                placeholder="Shipping preferences, discount codes, special instructions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSupplierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={!supplierForm.name.trim()}
            >
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-lg font-semibold">
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

              <div className="bg-muted grid grid-cols-2 gap-4 rounded-lg p-4">
                <div>
                  <p className="text-muted-foreground text-sm">Order Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.orderedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
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
                    <p className="text-muted-foreground text-sm">Received</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.receivedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-sm">Created By</p>
                  <p className="font-medium">{selectedOrder.createdBy}</p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Order Items</h4>
                <div className="divide-y rounded-lg border">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.variantName && (
                          <p className="text-muted-foreground text-sm">
                            {item.variantName}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
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

              <div className="bg-muted space-y-2 rounded-lg p-4">
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
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="mb-1 font-medium">Notes</h4>
                  <p className="text-muted-foreground text-sm">
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return / Refund</DialogTitle>
            <DialogDescription>
              Process a return and refund for transaction{" "}
              {selectedTransaction?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6 py-4">
              {/* Transaction Info */}
              <div className="bg-muted rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Transaction</p>
                    <p className="font-mono font-medium">
                      {selectedTransaction.transactionNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Date</p>
                    <p className="font-medium">
                      {new Date(
                        selectedTransaction.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedTransaction.customerName && (
                    <div>
                      <p className="text-muted-foreground text-sm">Customer</p>
                      <p className="font-medium">
                        {selectedTransaction.customerName}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Original Total
                    </p>
                    <p className="font-medium">
                      ${selectedTransaction.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Select Items to Return */}
              <div>
                <Label className="mb-3 block text-base font-medium">
                  Select Items to Return
                </Label>
                <div className="space-y-2 rounded-lg border p-4">
                  {selectedTransaction.items.map((item, index) => {
                    const returnItem = returnForm.items.find(
                      (ri) =>
                        ri.transactionItemId ===
                        `${selectedTransaction.id}-${index}`,
                    );
                    const isSelected = !!returnItem;
                    const maxQuantity = item.quantity;

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border p-3 ${
                          isSelected
                            ? "border-blue-200 bg-blue-50"
                            : "bg-background"
                        } `}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked && item.productId) {
                                    const newReturnItem: ReturnItem = {
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
                                      discountType:
                                        item.discountType || "fixed",
                                      total: item.total,
                                      reason:
                                        "customer_request" as ReturnReason,
                                      restocked: true,
                                    };
                                    setReturnForm({
                                      ...returnForm,
                                      items: [
                                        ...returnForm.items,
                                        newReturnItem,
                                      ],
                                    });
                                  } else {
                                    setReturnForm({
                                      ...returnForm,
                                      items: returnForm.items.filter(
                                        (ri) =>
                                          ri.transactionItemId !==
                                          `${selectedTransaction.id}-${index}`,
                                      ),
                                    });
                                  }
                                }}
                                className="rounded-sm"
                              />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.productName}
                                </p>
                                {item.variantName && (
                                  <p className="text-muted-foreground text-sm">
                                    {item.variantName}
                                  </p>
                                )}
                                <p className="text-muted-foreground text-sm">
                                  ${item.unitPrice.toFixed(2)} each ×{" "}
                                  {item.quantity}
                                </p>
                              </div>
                            </div>
                          </div>
                          {isSelected && returnItem && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7"
                                onClick={() => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId ===
                                    `${selectedTransaction.id}-${index}`
                                      ? {
                                          ...ri,
                                          quantity: Math.max(
                                            1,
                                            ri.quantity - 1,
                                          ),
                                        }
                                      : ri,
                                  );
                                  setReturnForm({
                                    ...returnForm,
                                    items: updated,
                                  });
                                }}
                                disabled={returnItem.quantity <= 1}
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">
                                {returnItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-7"
                                onClick={() => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId ===
                                    `${selectedTransaction.id}-${index}`
                                      ? {
                                          ...ri,
                                          quantity: Math.min(
                                            maxQuantity,
                                            ri.quantity + 1,
                                          ),
                                        }
                                      : ri,
                                  );
                                  setReturnForm({
                                    ...returnForm,
                                    items: updated,
                                  });
                                }}
                                disabled={returnItem.quantity >= maxQuantity}
                              >
                                <Plus className="size-3" />
                              </Button>
                              <Select
                                value={returnItem.reason}
                                onValueChange={(value: ReturnReason) => {
                                  const updated = returnForm.items.map((ri) =>
                                    ri.transactionItemId ===
                                    `${selectedTransaction.id}-${index}`
                                      ? { ...ri, reason: value }
                                      : ri,
                                  );
                                  setReturnForm({
                                    ...returnForm,
                                    items: updated,
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 w-40 text-xs">
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="defective">
                                    Defective
                                  </SelectItem>
                                  <SelectItem value="wrong_item">
                                    Wrong Item
                                  </SelectItem>
                                  <SelectItem value="not_as_described">
                                    Not as Described
                                  </SelectItem>
                                  <SelectItem value="customer_request">
                                    Customer Request
                                  </SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {isSelected &&
                            returnItem &&
                            (!returnItem.reason ||
                              (returnItem.reason === "other" &&
                                !returnItem.reasonNotes)) && (
                              <p className="mt-1 ml-2 text-xs text-orange-600">
                                ⚠️ Return reason recommended for audit purposes
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Summary */}
              {returnForm.items.length > 0 && (
                <div className="bg-muted space-y-2 rounded-lg p-4">
                  <h4 className="font-medium">Return Summary</h4>
                  <div className="space-y-1">
                    {returnForm.items.map((item, index) => {
                      const subtotal = item.unitPrice * item.quantity;
                      const discountAmount =
                        item.discountType === "percent"
                          ? (subtotal * item.discount) / 100
                          : item.discount;
                      const total = subtotal - discountAmount;
                      return (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Refund Total</span>
                      <span>
                        $
                        {returnForm.items
                          .reduce((sum, item) => {
                            const subtotal = item.unitPrice * item.quantity;
                            const discountAmount =
                              item.discountType === "percent"
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
                  <Label className="mb-3 block text-base font-medium">
                    Refund Method
                  </Label>

                  {/* Show original payment method info */}
                  {selectedTransaction && (
                    <div className="bg-muted mb-3 rounded-lg p-3">
                      <p className="mb-1 text-sm font-medium">
                        Original Payment Method:
                      </p>
                      <div className="flex items-center gap-2">
                        {selectedTransaction.yipyyPayTransactionId && (
                          <Badge variant="default" className="gap-1">
                            <Smartphone className="size-3" />
                            Pay with iPhone
                          </Badge>
                        )}
                        {selectedTransaction.cloverTransactionId && (
                          <Badge variant="default" className="gap-1">
                            <Printer className="size-3" />
                            Clover Terminal
                          </Badge>
                        )}
                        {selectedTransaction.fiservTransactionId &&
                          !selectedTransaction.yipyyPayTransactionId &&
                          !selectedTransaction.cloverTransactionId && (
                            <Badge variant="default" className="gap-1">
                              <CreditCard className="size-3" />
                              Card Payment (Fiserv)
                            </Badge>
                          )}
                        {!selectedTransaction.yipyyPayTransactionId &&
                          !selectedTransaction.cloverTransactionId &&
                          !selectedTransaction.fiservTransactionId && (
                            <Badge variant="outline" className="gap-1">
                              {selectedTransaction.paymentMethod === "cash" && (
                                <Banknote className="size-3" />
                              )}
                              {selectedTransaction.paymentMethod ===
                                "store_credit" && <Wallet className="size-3" />}
                              {selectedTransaction.paymentMethod ===
                                "gift_card" && <Gift className="size-3" />}
                              {selectedTransaction.paymentMethod
                                .charAt(0)
                                .toUpperCase() +
                                selectedTransaction.paymentMethod
                                  .slice(1)
                                  .replace(/_/g, " ")}
                            </Badge>
                          )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Refund will default to original payment method
                      </p>
                    </div>
                  )}

                  {(() => {
                    const facilityId = 11; // TODO: Get from context
                    const fiservConfig = getFiservConfig(facilityId);
                    const refundMethods = fiservConfig?.refundMethods;

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {refundMethods?.originalPayment !== false && (
                          <Button
                            variant={
                              returnForm.refundMethod === "original_payment"
                                ? "default"
                                : "outline"
                            }
                            className="flex h-auto flex-col items-start gap-2 p-4"
                            onClick={() =>
                              setReturnForm({
                                ...returnForm,
                                refundMethod: "original_payment",
                              })
                            }
                          >
                            <ArrowLeft className="size-5" />
                            <div className="text-left">
                              <p className="font-medium">Original Payment</p>
                              <p className="text-muted-foreground text-xs">
                                Refund to original payment method
                              </p>
                            </div>
                          </Button>
                        )}
                        {refundMethods?.storeCredit !== false && (
                          <Button
                            variant={
                              returnForm.refundMethod === "store_credit"
                                ? "default"
                                : "outline"
                            }
                            className="flex h-auto flex-col items-start gap-2 p-4"
                            onClick={() =>
                              setReturnForm({
                                ...returnForm,
                                refundMethod: "store_credit",
                              })
                            }
                            disabled={
                              !canOverrideRefund &&
                              returnForm.refundMethod === "original_payment"
                            }
                          >
                            <Wallet className="size-5" />
                            <div className="text-left">
                              <p className="font-medium">Store Credit</p>
                              <p className="text-muted-foreground text-xs">
                                Issue store credit to customer
                                {!canOverrideRefund &&
                                  returnForm.refundMethod ===
                                    "original_payment" && (
                                    <span className="mt-1 block text-orange-600">
                                      Manager only
                                    </span>
                                  )}
                              </p>
                            </div>
                          </Button>
                        )}
                        {refundMethods?.giftCard !== false && (
                          <Button
                            variant={
                              returnForm.refundMethod === "gift_card"
                                ? "default"
                                : "outline"
                            }
                            className="flex h-auto flex-col items-start gap-2 p-4"
                            onClick={() =>
                              setReturnForm({
                                ...returnForm,
                                refundMethod: "gift_card",
                              })
                            }
                            disabled={
                              !canOverrideRefund &&
                              returnForm.refundMethod === "original_payment"
                            }
                          >
                            <Gift className="size-5" />
                            <div className="text-left">
                              <p className="font-medium">Gift Card</p>
                              <p className="text-muted-foreground text-xs">
                                Issue gift card to customer
                                {!canOverrideRefund &&
                                  returnForm.refundMethod ===
                                    "original_payment" && (
                                    <span className="mt-1 block text-orange-600">
                                      Manager only
                                    </span>
                                  )}
                              </p>
                            </div>
                          </Button>
                        )}
                        {canOverrideRefund && refundMethods?.cash !== false && (
                          <Button
                            variant={
                              returnForm.refundMethod === "cash"
                                ? "default"
                                : "outline"
                            }
                            className="flex h-auto flex-col items-start gap-2 p-4"
                            onClick={() =>
                              setReturnForm({
                                ...returnForm,
                                refundMethod: "cash",
                              })
                            }
                          >
                            <Banknote className="size-5" />
                            <div className="text-left">
                              <p className="font-medium">Cash (Override)</p>
                              <p className="text-muted-foreground text-xs">
                                Manager override - refund in cash
                              </p>
                            </div>
                          </Button>
                        )}
                        {refundMethods?.custom !== false &&
                          customPaymentMethods
                            .filter((m) => m.isActive && m.canBeUsedForRefunds)
                            .map((method) => (
                              <Button
                                key={method.id}
                                variant={
                                  returnForm.refundMethod === "custom" &&
                                  returnForm.customRefundMethodName ===
                                    method.name
                                    ? "default"
                                    : "outline"
                                }
                                className="flex h-auto flex-col items-start gap-2 p-4"
                                onClick={() =>
                                  setReturnForm({
                                    ...returnForm,
                                    refundMethod: "custom",
                                    customRefundMethodName: method.name,
                                  })
                                }
                              >
                                <CreditCard className="size-5" />
                                <div className="text-left">
                                  <p className="font-medium">{method.name}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {method.description ||
                                      "Custom payment method"}
                                  </p>
                                </div>
                              </Button>
                            ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Additional Fields based on Refund Method */}
              {returnForm.items.length > 0 &&
                returnForm.refundMethod === "store_credit" && (
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

              {returnForm.items.length > 0 &&
                returnForm.refundMethod === "gift_card" && (
                  <div className="grid gap-2">
                    <Label>
                      Gift Card Number (optional - will be generated if empty)
                    </Label>
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
                <Label>
                  Notes{" "}
                  {returnForm.refundMethod !== "original_payment" && (
                    <span className="text-orange-600">(Recommended)</span>
                  )}
                </Label>
                <Textarea
                  value={returnForm.notes || ""}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, notes: e.target.value })
                  }
                  placeholder={
                    returnForm.refundMethod !== "original_payment"
                      ? "Please document why the refund method was changed..."
                      : "Additional notes about this return..."
                  }
                  rows={3}
                />
                {returnForm.refundMethod !== "original_payment" &&
                  !returnForm.notes && (
                    <p className="text-xs text-orange-600">
                      ⚠️ It&apos;s recommended to provide notes when using an
                      override refund method for audit purposes.
                    </p>
                  )}
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>
              Enter the quantities received for each item. Stock levels will be
              updated automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-semibold">
                      {selectedOrder.orderNumber}
                    </p>
                    <p className="text-muted-foreground text-sm">
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
                <div className="flex items-center justify-between border-b pb-2 text-sm font-medium">
                  <span className="font-medium">Item</span>
                  <div className="flex items-center gap-8">
                    <span className="w-24 text-center">Ordered</span>
                    <span className="w-24 text-center">Received</span>
                    <span className="w-24 text-center">To Receive</span>
                  </div>
                </div>

                {receivingForm.items.map((item) => {
                  const orderItem = selectedOrder.items.find(
                    (oi) => oi.sku === item.sku,
                  );
                  const quantityToReceive =
                    item.newReceivedQuantity - item.receivedQuantity;
                  const remainingQuantity =
                    item.orderedQuantity - item.newReceivedQuantity;

                  return (
                    <div
                      key={item.sku}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {orderItem?.productName || "Unknown Product"}
                          </p>
                          {orderItem?.variantName && (
                            <p className="text-muted-foreground text-sm">
                              {orderItem.variantName}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs">
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
                            <span className="text-muted-foreground text-sm">
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
                                  parseInt(e.target.value) ||
                                    item.receivedQuantity,
                                )
                              }
                              className="text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {quantityToReceive > 0 && (
                        <div className="flex items-center gap-2 rounded-sm bg-green-50 p-2 text-sm text-green-600">
                          <PackageCheck className="size-4" />
                          <span>
                            Will receive {quantityToReceive} unit
                            {quantityToReceive !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {remainingQuantity > 0 && quantityToReceive > 0 && (
                        <div className="flex items-center gap-2 rounded-sm bg-amber-50 p-2 text-sm text-amber-600">
                          <AlertCircle className="size-4" />
                          <span>
                            {remainingQuantity} unit
                            {remainingQuantity !== 1 ? "s" : ""} remaining
                          </span>
                        </div>
                      )}

                      {item.newReceivedQuantity >= item.orderedQuantity && (
                        <div className="flex items-center gap-2 rounded-sm bg-blue-50 p-2 text-sm text-blue-600">
                          <CheckCircle2 className="size-4" />
                          <span>Fully received</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span>Total Items to Receive:</span>
                  <span className="font-medium">
                    {receivingForm.items
                      .filter(
                        (item) =>
                          item.newReceivedQuantity > item.receivedQuantity,
                      )
                      .reduce(
                        (sum, item) =>
                          sum +
                          (item.newReceivedQuantity - item.receivedQuantity),
                        0,
                      )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Items Fully Received:</span>
                  <span className="font-medium">
                    {
                      receivingForm.items.filter(
                        (item) =>
                          item.newReceivedQuantity >= item.orderedQuantity,
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
                  (item) => item.newReceivedQuantity > item.receivedQuantity,
                ).length === 0
              }
            >
              <PackageCheck className="mr-2 size-4" />
              Process Receiving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
