"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Percent,
  DollarSign,
  Receipt,
  Mail,
  Printer,
  Search,
  X,
  User,
  SplitSquareHorizontal,
  Link as LinkIcon,
  Calendar,
  PawPrint,
  Check,
  Phone,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  products,
  getProductByBarcode,
  getRetailStats,
  addRetailTransaction,
  getPromoCodeByCode,
  getAccountDiscount,
  applyPromoCode,
  type Product,
  type ProductVariant,
  type CartItem,
  type PaymentMethod,
  type CartDiscount,
  type PromoCode,
  type AccountDiscount,
} from "@/data/retail";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { hasPermission, getCurrentUserId } from "@/lib/role-utils";
import { useFacilityRole } from "@/hooks/use-facility-role";

interface CartItemWithId extends CartItem {
  id: string;
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const { role: facilityRole } = useFacilityRole();
  const currentUserId = getCurrentUserId();
  const canApplyDiscount = hasPermission(facilityRole, "apply_discount", currentUserId || undefined);
  const isManager = facilityRole === "manager" || facilityRole === "owner";
  
  const [cart, setCart] = useState<CartItemWithId[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isCartDiscountModalOpen, setIsCartDiscountModalOpen] = useState(false);
  const [isPromoCodeModalOpen, setIsPromoCodeModalOpen] = useState(false);
  const [isCompItemModalOpen, setIsCompItemModalOpen] = useState(false);
  const [isEditPriceModalOpen, setIsEditPriceModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  
  // Discount states
  const [cartDiscount, setCartDiscount] = useState<CartDiscount | null>(null);
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
  const [accountDiscount, setAccountDiscount] = useState<AccountDiscount | null>(null);

  // Pre-select client when navigating from client file (e.g. ?clientId=15)
  useEffect(() => {
    const clientId = searchParams.get("clientId");
    if (clientId) {
      setSelectedClientId(clientId);
      const client = clients.find((c) => String(c.id) === clientId);
      if (client) {
        setCustomerName(client.name);
        setCustomerEmail(client.email || "");
      }
    }
  }, [searchParams]);

  // Check for account discount when client is selected
  useEffect(() => {
    if (selectedClientId && selectedClientId !== "__walk_in__") {
      const accDiscount = getAccountDiscount(selectedClientId);
      setAccountDiscount(accDiscount);
    } else {
      setAccountDiscount(null);
    }
  }, [selectedClientId]);

  const [discountForm, setDiscountForm] = useState({
    type: "fixed" as "fixed" | "percent",
    value: 0,
  });
  
  const [cartDiscountForm, setCartDiscountForm] = useState({
    type: "percent" as "percent" | "fixed",
    value: 0,
    reason: "",
  });
  
  const [compItemForm, setCompItemForm] = useState({
    reason: "",
  });
  
  const [editPriceForm, setEditPriceForm] = useState({
    unitPrice: 0,
    discount: 0,
    discountType: "fixed" as "fixed" | "percent",
  });

  // Tips state
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [tipCustomAmount, setTipCustomAmount] = useState<string>("");

  const [paymentForm, setPaymentForm] = useState({
    method: "cash" as PaymentMethod,
    splitPayments: false,
    payments: [{ method: "cash" as PaymentMethod, amount: 0 }],
    chargeType: "pay_now" as "pay_now" | "add_to_booking" | "charge_to_account" | "charge_to_active_stay",
    selectedBookingId: null as number | null,
  });
  const [isBookingSelectModalOpen, setIsBookingSelectModalOpen] = useState(false);

  const stats = getRetailStats();

  // Calculate subtotal (before any discounts)
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  // Calculate line item discounts
  const lineItemDiscountTotal = cart.reduce((sum, item) => sum + item.discount, 0);
  
  // Calculate cart-wide discount
  let cartDiscountAmount = 0;
  if (cartDiscount) {
    if (cartDiscount.type === "percent") {
      cartDiscountAmount = (subtotal - lineItemDiscountTotal) * (cartDiscount.value / 100);
    } else if (cartDiscount.type === "fixed") {
      cartDiscountAmount = Math.min(cartDiscount.value, subtotal - lineItemDiscountTotal);
    } else if (cartDiscount.type === "promo_code" && appliedPromoCode) {
      if (appliedPromoCode.discountType === "percent") {
        const maxDiscount = appliedPromoCode.maxDiscount || Infinity;
        cartDiscountAmount = Math.min(
          (subtotal - lineItemDiscountTotal) * (appliedPromoCode.discountValue / 100),
          maxDiscount
        );
      } else {
        cartDiscountAmount = Math.min(
          appliedPromoCode.discountValue,
          subtotal - lineItemDiscountTotal
        );
      }
    } else if (cartDiscount.type === "account_discount" && accountDiscount) {
      if (accountDiscount.applicableTo === "products" || accountDiscount.applicableTo === "all" || accountDiscount.applicableTo === "both") {
        if (accountDiscount.discountType === "percent") {
          cartDiscountAmount = (subtotal - lineItemDiscountTotal) * (accountDiscount.discountValue / 100);
        } else {
          cartDiscountAmount = Math.min(accountDiscount.discountValue, subtotal - lineItemDiscountTotal);
        }
      }
    }
  }
  
  // Apply account discount automatically if available and no other cart discount
  if (!cartDiscount && accountDiscount && selectedClientId && selectedClientId !== "__walk_in__") {
    if (accountDiscount.applicableTo === "products" || accountDiscount.applicableTo === "all" || accountDiscount.applicableTo === "both") {
      if (accountDiscount.discountType === "percent") {
        cartDiscountAmount = (subtotal - lineItemDiscountTotal) * (accountDiscount.discountValue / 100);
      } else {
        cartDiscountAmount = Math.min(accountDiscount.discountValue, subtotal - lineItemDiscountTotal);
      }
    }
  }
  
  const discountTotal = lineItemDiscountTotal + cartDiscountAmount;
  const taxTotal = 0; // Can be calculated if needed
  
  // Determine service type for tips configuration
  const detectedServiceType = useMemo(() => {
    // Check if booking is selected
    if (selectedBookingId) {
      const booking = bookings.find((b) => b.id === selectedBookingId);
      if (booking?.service) {
        const service = booking.service.toLowerCase();
        if (service.includes("grooming")) return "grooming";
        if (service.includes("training")) return "training";
        if (service.includes("daycare")) return "daycare";
        if (service.includes("boarding")) return "boarding";
      }
    }
    
    // Check cart items for service indicators (could be extended)
    // For now, default to "retail" if no service detected
    return "retail";
  }, [selectedBookingId]);

  // Get tips configuration based on service type
  // Default configuration (in a real app, this would come from settings/API)
  const defaultTipsConfig = {
    enabled: true,
    percentages: [15, 18, 20, 25],
  };
  
  // Service-specific tips configuration
  const serviceTipsConfig: Record<string, { enabled: boolean; percentages: number[] }> = {
    grooming: { enabled: true, percentages: [15, 18, 20, 25] },
    training: { enabled: false, percentages: [15, 18, 20] },
    daycare: { enabled: true, percentages: [10, 15, 20] },
    boarding: { enabled: true, percentages: [10, 15, 20] },
    retail: { enabled: false, percentages: [15, 18, 20, 25] },
    other: { enabled: true, percentages: [15, 18, 20, 25] },
  };
  
  const tipsConfig = serviceTipsConfig[detectedServiceType] || defaultTipsConfig;

  // Calculate tip amount
  const calculatedTipAmount = useMemo(() => {
    if (tipPercentage !== null) {
      return (subtotal - discountTotal) * (tipPercentage / 100);
    }
    if (tipCustomAmount) {
      const custom = parseFloat(tipCustomAmount);
      return isNaN(custom) ? 0 : custom;
    }
    return tipAmount;
  }, [tipPercentage, tipCustomAmount, tipAmount, subtotal, discountTotal]);

  const grandTotal = subtotal - discountTotal + taxTotal + calculatedTipAmount;

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = getProductByBarcode(barcodeInput.trim());
    if (found) {
      addToCart(found);
      setBarcodeInput("");
    } else {
      // Could show an error toast here
      alert("Product not found");
    }
  };

  const addToCart = (item: Product | ProductVariant) => {
    const isVariant = "variantType" in item;
    const product = isVariant
      ? products.find((p) =>
          p.variants.some((v) => v.id === (item as ProductVariant).id),
        )
      : (item as Product);

    if (!product) return;

    const cartItemId = isVariant
      ? `${product.id}-${(item as ProductVariant).id}`
      : product.id;
    const existingItem = cart.find((c) => c.id === cartItemId);

    if (existingItem) {
      updateQuantity(cartItemId, existingItem.quantity + 1);
    } else {
      const newItem: CartItemWithId = {
        id: cartItemId,
        productId: product.id,
        productName: product.name,
        variantId: isVariant ? (item as ProductVariant).id : undefined,
        variantName: isVariant ? (item as ProductVariant).name : undefined,
        sku: isVariant ? (item as ProductVariant).sku : product.sku,
        quantity: 1,
        unitPrice: isVariant
          ? (item as ProductVariant).price
          : product.basePrice,
        discount: 0,
        discountType: "fixed",
        total: isVariant ? (item as ProductVariant).price : product.basePrice,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.id === itemId) {
          const discountAmount =
            item.discountType === "percent"
              ? (item.unitPrice * newQuantity * item.discount) / 100
              : item.discount;
          return {
            ...item,
            quantity: newQuantity,
            total: item.unitPrice * newQuantity - discountAmount,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const applyDiscount = () => {
    if (!selectedCartItem || !canApplyDiscount) return;

    setCart(
      cart.map((item) => {
        if (item.id === selectedCartItem) {
          const discountAmount =
            discountForm.type === "percent"
              ? (item.unitPrice * item.quantity * discountForm.value) / 100
              : discountForm.value;
          return {
            ...item,
            discount: discountAmount,
            discountType: discountForm.type,
            total: item.unitPrice * item.quantity - discountAmount,
          };
        }
        return item;
      }),
    );

    setIsDiscountModalOpen(false);
    setSelectedCartItem(null);
    setDiscountForm({ type: "fixed", value: 0 });
  };

  const applyCartDiscount = () => {
    if (!canApplyDiscount) return;

    setCartDiscount({
      type: cartDiscountForm.type,
      value: cartDiscountForm.value,
      appliedBy: currentUserId || undefined,
      reason: cartDiscountForm.reason || undefined,
    });
    setIsCartDiscountModalOpen(false);
    setCartDiscountForm({ type: "percent", value: 0, reason: "" });
  };

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) return;

    const promo = getPromoCodeByCode(promoCode.trim());
    if (!promo) {
      alert("Invalid or expired promo code");
      return;
    }

    // Check minimum purchase
    if (promo.minPurchase && subtotal < promo.minPurchase) {
      alert(`Minimum purchase of $${promo.minPurchase} required for this promo code`);
      return;
    }

    setAppliedPromoCode(promo);
    setCartDiscount({
      type: "promo_code",
      value: promo.discountValue,
      promoCode: promo.code,
      appliedBy: currentUserId || undefined,
    });
    setIsPromoCodeModalOpen(false);
    setPromoCode("");
  };

  const removeCartDiscount = () => {
    setCartDiscount(null);
    setAppliedPromoCode(null);
  };

  const applyCompItem = () => {
    if (!selectedCartItem || !isManager) return;

    setCart(
      cart.map((item) => {
        if (item.id === selectedCartItem) {
          return {
            ...item,
            isComp: true,
            compReason: compItemForm.reason,
            discount: item.unitPrice * item.quantity,
            discountType: "fixed",
            total: 0,
          };
        }
        return item;
      }),
    );

    setIsCompItemModalOpen(false);
    setSelectedCartItem(null);
    setCompItemForm({ reason: "" });
  };

  const openEditPriceModal = (itemId: string) => {
    if (!canApplyDiscount) return;
    
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    setSelectedCartItem(itemId);
    setEditPriceForm({
      unitPrice: item.unitPrice,
      discount: item.discount,
      discountType: item.discountType,
    });
    setIsEditPriceModalOpen(true);
  };

  const applyPriceEdit = () => {
    if (!selectedCartItem || !canApplyDiscount) return;

    setCart(
      cart.map((item) => {
        if (item.id === selectedCartItem) {
          const newSubtotal = editPriceForm.unitPrice * item.quantity;
          const discountAmount =
            editPriceForm.discountType === "percent"
              ? (newSubtotal * editPriceForm.discount) / 100
              : editPriceForm.discount;
          const newTotal = newSubtotal - discountAmount;

          return {
            ...item,
            unitPrice: editPriceForm.unitPrice,
            discount: discountAmount,
            discountType: editPriceForm.discountType,
            total: newTotal,
          };
        }
        return item;
      }),
    );

    setIsEditPriceModalOpen(false);
    setSelectedCartItem(null);
    setEditPriceForm({ unitPrice: 0, discount: 0, discountType: "fixed" });
  };

  const handlePayment = () => {
    // Record transaction and link to client file, pet, and/or booking when selected
    const customerId =
      selectedClientId && selectedClientId !== "__walk_in__"
        ? selectedClientId
        : undefined;
    const name =
      customerName ||
      (selectedClientId && selectedClientId !== "__walk_in__"
        ? clients.find((c) => String(c.id) === selectedClientId)?.name
        : undefined);
    const email =
      customerEmail ||
      (selectedClientId && selectedClientId !== "__walk_in__"
        ? clients.find((c) => String(c.id) === selectedClientId)?.email
        : undefined);

    // Get pet name if pet is selected
    const petName = selectedPetId && selectedClientId && selectedClientId !== "__walk_in__"
      ? clients
          .find((c) => String(c.id) === selectedClientId)
          ?.pets.find((p) => p.id === selectedPetId)?.name
      : undefined;

    // Get booking service if booking is selected
    const booking = selectedBookingId
      ? bookings.find((b) => b.id === selectedBookingId)
      : null;

    addRetailTransaction({
      items: cart.map(({ id, ...item }) => item),
      subtotal,
      discountTotal,
      cartDiscount: cartDiscount || undefined,
      promoCodeUsed: appliedPromoCode?.code || undefined,
      accountDiscountApplied: accountDiscount?.id || undefined,
      taxTotal,
      tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
      tipPercentage: tipPercentage || undefined,
      total: grandTotal,
      paymentMethod: paymentForm.splitPayments ? "split" : paymentForm.method,
      payments: paymentForm.splitPayments
        ? paymentForm.payments
        : [{ method: paymentForm.method, amount: grandTotal }],
      customerId,
      customerName: name,
      customerEmail: email,
      petId: selectedPetId || undefined,
      petName: petName,
      bookingId: selectedBookingId || undefined,
      bookingService: booking?.service,
      cashierId: currentUserId || "staff-001",
      cashierName: "Staff",
      notes: "",
    });
    
    // Apply promo code usage count (increment usage in data)
    if (appliedPromoCode) {
      const promo = getPromoCodeByCode(appliedPromoCode.code);
      if (promo) {
        applyPromoCode(appliedPromoCode.code);
      }
    }
    
    // Clear cart and discounts
    setCart([]);
    setCartDiscount(null);
    setAppliedPromoCode(null);
    setSelectedClientId("");
    setCustomerName("");
    setCustomerEmail("");
    setSelectedPetId(null);
    setSelectedBookingId(null);
    // Clear tips
    setTipAmount(0);
    setTipPercentage(null);
    setTipCustomAmount("");

    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  const completeTransaction = (sendReceipt: boolean) => {
    if (sendReceipt && customerEmail) {
      // Send receipt email
      console.log("Sending receipt to:", customerEmail);
    }
    // Reset cart and customer info
    setCart([]);
    setSelectedClientId("");
    setCustomerName("");
    setCustomerEmail("");
    setSelectedPetId(null);
    setSelectedBookingId(null);
    setIsReceiptModalOpen(false);
    setPaymentForm({
      method: "cash",
      splitPayments: false,
      payments: [{ method: "cash", amount: 0 }],
    });
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === "__walk_in__") {
      setCustomerName("");
      setCustomerEmail("");
      setSelectedPetId(null);
      setSelectedBookingId(null);
      return;
    }
    const client = clients.find((c) => String(c.id) === clientId);
    if (client) {
      setCustomerName(client.name);
      setCustomerEmail(client.email || "");
      // Reset pet and booking when client changes
      setSelectedPetId(null);
      setSelectedBookingId(null);
    }
  };

  // Search customers by multiple criteria
  const searchCustomers = (query: string) => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    
    return clients.filter((client) => {
      // Search by email
      if (client.email?.toLowerCase().includes(lowerQuery)) return true;
      // Search by phone
      if (client.phone?.toLowerCase().includes(lowerQuery)) return true;
      // Search by full name
      if (client.name.toLowerCase().includes(lowerQuery)) return true;
      // Search by first name
      const firstName = client.name.split(" ")[0]?.toLowerCase();
      if (firstName?.includes(lowerQuery)) return true;
      // Search by last name
      const lastName = client.name.split(" ").slice(1).join(" ").toLowerCase();
      if (lastName.includes(lowerQuery)) return true;
      // Search by pet name
      if (client.pets?.some((pet) => pet.name.toLowerCase().includes(lowerQuery))) return true;
      return false;
    });
  };

  const filteredCustomers = useMemo(() => {
    return searchCustomers(linkSearchQuery);
  }, [linkSearchQuery]);

  // Get pets for selected client
  const clientPets = useMemo(() => {
    if (!selectedClientId || selectedClientId === "__walk_in__") return [];
    const client = clients.find((c) => String(c.id) === selectedClientId);
    return client?.pets || [];
  }, [selectedClientId]);

  // Get bookings for selected client/pet
  const clientBookings = useMemo(() => {
    if (!selectedClientId || selectedClientId === "__walk_in__") return [];
    const clientIdNum = parseInt(selectedClientId);
    
    return bookings.filter((booking) => {
      if (booking.clientId !== clientIdNum) return false;
      // If pet is selected, filter by pet
      if (selectedPetId && booking.petId !== selectedPetId) return false;
      // Only show active/upcoming bookings
      return booking.status === "confirmed" || booking.status === "checked-in" || booking.status === "pending";
    }).sort((a, b) => {
      // Sort by start date, most recent first
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [selectedClientId, selectedPetId]);

  // Get active stays (currently checked in) for charge to active stay option
  const activeStays = useMemo(() => {
    if (!selectedClientId || selectedClientId === "__walk_in__") return [];
    const clientIdNum = parseInt(selectedClientId);
    const today = new Date().toISOString().split("T")[0];
    
    // Get bookings that are checked in
    const checkedInBookings = bookings.filter((booking) => {
      if (booking.clientId !== clientIdNum) return false;
      if (selectedPetId && booking.petId !== selectedPetId) return false;
      // Check if booking is active today and checked in
      const startDate = booking.startDate.split("T")[0];
      const endDate = booking.endDate.split("T")[0];
      return (
        booking.status === "checked-in" &&
        startDate <= today &&
        endDate >= today
      );
    });

    // Also check daycare and boarding check-ins
    // Note: This would need to import from daycare/boarding data files
    // For now, we'll use bookings with checked-in status
    
    return checkedInBookings.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [selectedClientId, selectedPetId]);

  // Get all bookable bookings (for "Add to Booking" option)
  const bookableBookings = useMemo(() => {
    if (!selectedClientId || selectedClientId === "__walk_in__") return [];
    const clientIdNum = parseInt(selectedClientId);
    
    return bookings.filter((booking) => {
      if (booking.clientId !== clientIdNum) return false;
      if (selectedPetId && booking.petId !== selectedPetId) return false;
      // Show confirmed, pending, and checked-in bookings (can add items to these)
      return booking.status === "confirmed" || booking.status === "checked-in" || booking.status === "pending";
    }).sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [selectedClientId, selectedPetId]);

  const filteredProducts = products.filter(
    (p) =>
      p.status === "active" &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery)),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Product Search & Selection */}
      <div className="lg:col-span-2 space-y-4">
        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Sales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.todayRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.todayTransactions} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayItems}</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Badge
                variant={stats.lowStockCount > 0 ? "destructive" : "secondary"}
              >
                {stats.lowStockCount}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                Items need restock
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Alerts
              </CardTitle>
              <Badge
                variant={stats.pendingAlerts > 0 ? "destructive" : "secondary"}
              >
                {stats.pendingAlerts}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAlerts}</div>
              <p className="text-xs text-muted-foreground">Unacknowledged</p>
            </CardContent>
          </Card>
        </div>

        {/* Barcode Scanner Input */}
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Scan barcode or enter SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button type="submit">Add</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductModalOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Product Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Add</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {products.slice(0, 8).map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-start"
                  onClick={() => {
                    if (product.hasVariants && product.variants.length > 0) {
                      // If has variants, add the first variant
                      addToCart(product.variants[0]);
                    } else {
                      addToCart(product);
                    }
                  }}
                >
                  <span className="font-medium text-sm truncate w-full text-left">
                    {product.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ${product.basePrice.toFixed(2)}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Cart */}
      <div className="space-y-4">
        <Card className="max-h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
              </CardTitle>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCart([])}
                  className="text-destructive"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            {/* Customer / Pet / Booking Link - Links sale to client file, pet, and/or booking */}
            <div className="space-y-3 mb-3 p-3 border rounded-lg bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Attach to Account / Pet / Booking
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </Button>
              </div>

              {/* Selected Customer */}
              {selectedClientId && selectedClientId !== "__walk_in__" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-background rounded border">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customerName}</p>
                      {customerEmail && (
                        <p className="text-xs text-muted-foreground truncate">{customerEmail}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSelectedClientId("");
                        setCustomerName("");
                        setCustomerEmail("");
                        setSelectedPetId(null);
                        setSelectedBookingId(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Selected Pet */}
                  {selectedPetId && (
                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                      <PawPrint className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {clientPets.find((p) => p.id === selectedPetId)?.name || "Pet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {clientPets.find((p) => p.id === selectedPetId)?.type} • {clientPets.find((p) => p.id === selectedPetId)?.breed}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectedPetId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Selected Booking */}
                  {selectedBookingId && (
                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {clientBookings.find((b) => b.id === selectedBookingId)?.service || "Booking"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const booking = clientBookings.find((b) => b.id === selectedBookingId);
                            if (!booking) return "";
                            return `${booking.startDate}${booking.endDate !== booking.startDate ? ` - ${booking.endDate}` : ""}`;
                          })()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectedBookingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Quick Add Pet/Booking */}
                  {!selectedPetId && clientPets.length > 0 && (
                    <Select
                      value={selectedPetId?.toString() || "__none__"}
                      onValueChange={(value) => setSelectedPetId(value && value !== "__none__" ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Link to pet (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No pet</SelectItem>
                        {clientPets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name} ({pet.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {!selectedBookingId && clientBookings.length > 0 && (
                    <Select
                      value={selectedBookingId?.toString() || "__none__"}
                      onValueChange={(value) => setSelectedBookingId(value && value !== "__none__" ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Apply to booking/stay (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No booking</SelectItem>
                        {clientBookings.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id.toString()}>
                            {booking.service} • {booking.startDate}
                            {booking.petId && (
                              <> • {clientPets.find((p) => p.id === booking.petId)?.name}</>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Link to Customer / Pet / Booking
                </Button>
              )}

              {selectedClientId && selectedClientId !== "__walk_in__" && (
                <p className="text-xs text-muted-foreground">
                  Purchase will appear in customer file and invoice correctly
                </p>
              )}
            </div>

            <Separator className="mb-3 flex-shrink-0" />

            {/* Cart Items - Scrollable area */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan a barcode to add items</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-[200px] max-h-[400px]">
                <div className="space-y-2 pr-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.productName}
                        </p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          ${item.unitPrice.toFixed(2)} each
                        </p>
                        {item.discount > 0 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            -${item.discount.toFixed(2)} discount
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          ${item.total.toFixed(2)}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {canApplyDiscount && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => {
                                  setSelectedCartItem(item.id);
                                  setIsDiscountModalOpen(true);
                                }}
                                title="Apply Discount"
                              >
                                <Percent className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-blue-600"
                                onClick={() => openEditPriceModal(item.id)}
                                title="Edit Price / Discount"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-green-600"
                              onClick={() => {
                                setSelectedCartItem(item.id);
                                setIsCompItemModalOpen(true);
                              }}
                              title="Comp / Free Item"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                            title="Remove Item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Cart Summary - Always visible at bottom */}
            <div className="pt-3 border-t mt-3 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${discountTotal.toFixed(2)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${taxTotal.toFixed(2)}</span>
                </div>
              )}
              
              {/* Tips Section - Only show if tips are enabled for this service type */}
              {tipsConfig.enabled && (subtotal - discountTotal) > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Tip</Label>
                      {calculatedTipAmount > 0 && (
                        <span className="text-sm font-medium">${calculatedTipAmount.toFixed(2)}</span>
                      )}
                    </div>
                    
                    {/* Tip Percentage Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {tipsConfig.percentages.map((percent) => (
                        <Button
                          key={percent}
                          variant={tipPercentage === percent ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setTipPercentage(percent);
                            setTipCustomAmount("");
                            setTipAmount(0);
                          }}
                        >
                          {percent}%
                        </Button>
                      ))}
                    </div>
                    
                    {/* Custom Tip Amount */}
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Custom $"
                        value={tipCustomAmount}
                        onChange={(e) => {
                          setTipCustomAmount(e.target.value);
                          setTipPercentage(null);
                          setTipAmount(0);
                        }}
                        className="h-8 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setTipPercentage(null);
                          setTipCustomAmount("");
                          setTipAmount(0);
                        }}
                        disabled={calculatedTipAmount === 0}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>

              <div className="space-y-2 pt-2">
                {/* Pay Now Options */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Pay Now</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentForm({
                          ...paymentForm,
                          method: "cash",
                          splitPayments: false,
                          chargeType: "pay_now",
                        });
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      <Banknote className="h-4 w-4" />
                      Cash
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={cart.length === 0}
                      onClick={() => {
                        setPaymentForm({
                          ...paymentForm,
                          method: "credit",
                          splitPayments: false,
                          chargeType: "pay_now",
                        });
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      Card
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={cart.length === 0}
                    onClick={() => {
                      setPaymentForm({
                        ...paymentForm,
                        splitPayments: true,
                        chargeType: "pay_now",
                        payments: [
                          { method: "credit", amount: grandTotal / 2 },
                          { method: "cash", amount: grandTotal / 2 },
                        ],
                      });
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <SplitSquareHorizontal className="h-4 w-4" />
                    Split Payment
                  </Button>
                </div>

                {/* Charge Options - Only show if customer is selected */}
                {selectedClientId && selectedClientId !== "__walk_in__" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Charge Options</Label>
                      
                      {/* Add to Booking */}
                      {bookableBookings.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 justify-start"
                          disabled={cart.length === 0}
                          onClick={() => {
                            setPaymentForm({
                              ...paymentForm,
                              chargeType: "add_to_booking",
                              selectedBookingId: null,
                            });
                            setIsBookingSelectModalOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                          Add to Booking / Reservation
                          {bookableBookings.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {bookableBookings.length} available
                            </Badge>
                          )}
                        </Button>
                      )}

                      {/* Charge to Active Stay */}
                      {activeStays.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 justify-start"
                          disabled={cart.length === 0}
                          onClick={() => {
                            setPaymentForm({
                              ...paymentForm,
                              chargeType: "charge_to_active_stay",
                              selectedBookingId: activeStays[0]?.id || null,
                            });
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          <LinkIcon className="h-4 w-4" />
                          Charge to Active Stay
                          <Badge variant="secondary" className="ml-auto">
                            {activeStays.length} active
                          </Badge>
                        </Button>
                      )}

                      {/* Charge to Account */}
                      <Button
                        variant="outline"
                        className="w-full gap-2 justify-start"
                        disabled={cart.length === 0}
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            chargeType: "charge_to_account",
                          });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4" />
                        Charge to Account / Card on File
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Search Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Browse Products</DialogTitle>
            <DialogDescription>
              Search and select products to add to cart
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • SKU: {product.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${product.basePrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                      </p>
                    </div>
                  </div>

                  {product.hasVariants && product.variants.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <Button
                          key={variant.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            addToCart(variant);
                            setIsProductModalOpen(false);
                            setSearchQuery("");
                          }}
                          disabled={variant.stock <= 0}
                        >
                          {variant.name} - ${variant.price.toFixed(2)}
                          {variant.stock <= 0 && " (Out of Stock)"}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        addToCart(product);
                        setIsProductModalOpen(false);
                        setSearchQuery("");
                      }}
                      disabled={product.stock <= 0}
                    >
                      Add to Cart
                      {product.stock <= 0 && " (Out of Stock)"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Discount Modal */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              Add a discount to the selected item
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Discount Type</Label>
              <Select
                value={discountForm.type}
                onValueChange={(value: "fixed" | "percent") =>
                  setDiscountForm({ ...discountForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                {discountForm.type === "fixed"
                  ? "Amount ($)"
                  : "Percentage (%)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={discountForm.type === "percent" ? 100 : undefined}
                value={discountForm.value}
                onChange={(e) =>
                  setDiscountForm({
                    ...discountForm,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDiscountModalOpen(false);
                setSelectedCartItem(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={applyDiscount} disabled={!canApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Discount Modal */}
      <Dialog open={isCartDiscountModalOpen} onOpenChange={setIsCartDiscountModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Cart Discount</DialogTitle>
            <DialogDescription>
              Apply a discount to the entire cart
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Discount Type</Label>
              <Select
                value={cartDiscountForm.type}
                onValueChange={(value: "percent" | "fixed") =>
                  setCartDiscountForm({ ...cartDiscountForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                {cartDiscountForm.type === "fixed"
                  ? "Amount ($)"
                  : "Percentage (%)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={cartDiscountForm.type === "percent" ? 100 : undefined}
                value={cartDiscountForm.value}
                onChange={(e) =>
                  setCartDiscountForm({
                    ...cartDiscountForm,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            {isManager && (
              <div className="grid gap-2">
                <Label>Reason (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., Manager override, Customer complaint"
                  value={cartDiscountForm.reason}
                  onChange={(e) =>
                    setCartDiscountForm({
                      ...cartDiscountForm,
                      reason: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCartDiscountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={applyCartDiscount} disabled={!canApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo Code Modal */}
      <Dialog open={isPromoCodeModalOpen} onOpenChange={setIsPromoCodeModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
            <DialogDescription>
              Enter a promo code to apply a discount
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Promo Code</Label>
              <Input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyPromoCode();
                  }
                }}
              />
            </div>

            {appliedPromoCode && (
              <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                <p className="text-sm font-medium text-green-900">
                  Promo Code Applied: {appliedPromoCode.code}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {appliedPromoCode.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPromoCodeModalOpen(false);
                setPromoCode("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApplyPromoCode} disabled={!promoCode.trim()}>
              Apply Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comp Item Modal (Manager Only) */}
      {isManager && (
        <Dialog open={isCompItemModalOpen} onOpenChange={setIsCompItemModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Comp / Free Item</DialogTitle>
              <DialogDescription>
                Mark this item as complimentary (free)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Reason (Required)</Label>
                <Input
                  type="text"
                  placeholder="e.g., Customer complaint, Employee benefit"
                  value={compItemForm.reason}
                  onChange={(e) =>
                    setCompItemForm({ reason: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCompItemModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyCompItem}
                disabled={!compItemForm.reason.trim()}
              >
                Comp Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Price / Discount Modal */}
      {canApplyDiscount && (
        <Dialog open={isEditPriceModalOpen} onOpenChange={setIsEditPriceModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Price & Discount</DialogTitle>
              <DialogDescription>
                Update the unit price and discount for this item
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editPriceForm.unitPrice}
                  onChange={(e) =>
                    setEditPriceForm({
                      ...editPriceForm,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Discount Type</Label>
                <Select
                  value={editPriceForm.discountType}
                  onValueChange={(value: "fixed" | "percent") =>
                    setEditPriceForm({ ...editPriceForm, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>
                  {editPriceForm.discountType === "fixed"
                    ? "Discount Amount ($)"
                    : "Discount Percentage (%)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={editPriceForm.discountType === "percent" ? 100 : undefined}
                  step={editPriceForm.discountType === "percent" ? "1" : "0.01"}
                  value={editPriceForm.discount}
                  onChange={(e) =>
                    setEditPriceForm({
                      ...editPriceForm,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              {editPriceForm.unitPrice > 0 && (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>
                      ${(editPriceForm.unitPrice * (cart.find((i) => i.id === selectedCartItem)?.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                  {editPriceForm.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>
                        -$
                        {editPriceForm.discountType === "percent"
                          ? (
                              (editPriceForm.unitPrice *
                                (cart.find((i) => i.id === selectedCartItem)?.quantity || 1) *
                                editPriceForm.discount) /
                              100
                            ).toFixed(2)
                          : editPriceForm.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Total:</span>
                    <span>
                      $
                      {(
                        editPriceForm.unitPrice *
                          (cart.find((i) => i.id === selectedCartItem)?.quantity || 1) -
                        (editPriceForm.discountType === "percent"
                          ? (editPriceForm.unitPrice *
                              (cart.find((i) => i.id === selectedCartItem)?.quantity || 1) *
                              editPriceForm.discount) /
                            100
                          : editPriceForm.discount)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditPriceModalOpen(false);
                  setSelectedCartItem(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={applyPriceEdit}>Update Price</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Booking Selection Modal (for Add to Booking) */}
      <Dialog open={isBookingSelectModalOpen} onOpenChange={setIsBookingSelectModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Booking to Add Items</DialogTitle>
            <DialogDescription>
              Choose which booking/reservation to add these retail items to
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px]">
            {bookableBookings.length > 0 ? (
              <div className="space-y-2">
                {bookableBookings.map((booking) => {
                  const pet = clientPets.find((p) => p.id === booking.petId);
                  return (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setPaymentForm({
                          ...paymentForm,
                          selectedBookingId: booking.id,
                        });
                        setIsBookingSelectModalOpen(false);
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {booking.service}
                            </Badge>
                            <Badge
                              variant={
                                booking.status === "checked-in"
                                  ? "default"
                                  : booking.status === "confirmed"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="font-medium mt-2">
                            {pet?.name || "Pet"} • {booking.serviceType}
                          </p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {booking.startDate}
                              {booking.endDate !== booking.startDate && ` - ${booking.endDate}`}
                            </div>
                            {booking.checkInTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Check-in: {booking.checkInTime}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Current total: ${booking.totalCost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentForm({
                              ...paymentForm,
                              selectedBookingId: booking.id,
                            });
                            setIsBookingSelectModalOpen(false);
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No bookings available</p>
                <p className="text-sm mt-1">
                  Customer must have a confirmed or active booking
                </p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBookingSelectModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentForm.chargeType === "add_to_booking"
                ? "Add to Booking Invoice"
                : paymentForm.chargeType === "charge_to_active_stay"
                  ? "Charge to Active Stay"
                  : paymentForm.chargeType === "charge_to_account"
                    ? "Charge to Account"
                    : "Process Payment"}
            </DialogTitle>
            <DialogDescription>
              {paymentForm.chargeType === "add_to_booking" && paymentForm.selectedBookingId ? (
                <>
                  Items will be added to booking #{paymentForm.selectedBookingId}
                  <br />
                  Total: ${grandTotal.toFixed(2)}
                </>
              ) : paymentForm.chargeType === "charge_to_active_stay" ? (
                <>
                  Items will be charged to the active stay
                  <br />
                  Total: ${grandTotal.toFixed(2)}
                </>
              ) : paymentForm.chargeType === "charge_to_account" ? (
                <>
                  Items will be charged to customer account / card on file
                  <br />
                  Total: ${grandTotal.toFixed(2)}
                </>
              ) : (
                `Total amount: ${grandTotal.toFixed(2)}`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show booking info if adding to booking */}
            {paymentForm.chargeType === "add_to_booking" && paymentForm.selectedBookingId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Adding to Booking</p>
                {(() => {
                  const booking = bookings.find((b) => b.id === paymentForm.selectedBookingId);
                  const pet = booking ? clientPets.find((p) => p.id === booking.petId) : null;
                  return booking ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      {booking.service} • {pet?.name} • {booking.startDate}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Show active stay info if charging to active stay */}
            {paymentForm.chargeType === "charge_to_active_stay" && paymentForm.selectedBookingId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Charging to Active Stay</p>
                {(() => {
                  const stay = activeStays.find((s) => s.id === paymentForm.selectedBookingId);
                  const pet = stay ? clientPets.find((p) => p.id === stay.petId) : null;
                  return stay ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      {stay.service} • {pet?.name} • Checked in
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Show account info if charging to account */}
            {paymentForm.chargeType === "charge_to_account" && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Charging to Account</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {customerName} • Card on file will be charged
                </div>
              </div>
            )}

            {/* Payment method selection - only show for "pay_now" */}
            {paymentForm.chargeType === "pay_now" && paymentForm.splitPayments ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Split Payment</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaymentForm({
                        ...paymentForm,
                        payments: [
                          ...paymentForm.payments,
                          { method: "cash", amount: 0 },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </div>

                {paymentForm.payments.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Method</Label>
                      <Select
                        value={payment.method}
                        onValueChange={(value: PaymentMethod) => {
                          const newPayments = [...paymentForm.payments];
                          newPayments[index].method = value;
                          setPaymentForm({
                            ...paymentForm,
                            payments: newPayments,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                          <SelectItem value="debit">Debit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        value={payment.amount}
                        onChange={(e) => {
                          const newPayments = [...paymentForm.payments];
                          newPayments[index].amount =
                            parseFloat(e.target.value) || 0;
                          setPaymentForm({
                            ...paymentForm,
                            payments: newPayments,
                          });
                        }}
                      />
                    </div>
                    {paymentForm.payments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newPayments = paymentForm.payments.filter(
                            (_, i) => i !== index,
                          );
                          setPaymentForm({
                            ...paymentForm,
                            payments: newPayments,
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="text-sm">
                  <span>
                    Total: $
                    {paymentForm.payments
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toFixed(2)}
                  </span>
                  {paymentForm.payments.reduce(
                    (sum, p) => sum + p.amount,
                    0,
                  ) !== grandTotal && (
                    <span className="text-destructive ml-2">
                      (Must equal ${grandTotal.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(value: PaymentMethod) =>
                      setPaymentForm({ ...paymentForm, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="debit">Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentForm.method === "cash" && (
                  <div className="grid gap-2">
                    <Label>Amount Tendered</Label>
                    <Input type="number" min={grandTotal} placeholder="0.00" />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                if (paymentForm.chargeType === "add_to_booking") {
                  setPaymentForm({
                    ...paymentForm,
                    selectedBookingId: null,
                  });
                }
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePayment}>
              {paymentForm.chargeType === "add_to_booking"
                ? "Add to Booking"
                : paymentForm.chargeType === "charge_to_active_stay"
                  ? "Charge to Stay"
                  : paymentForm.chargeType === "charge_to_account"
                    ? "Charge to Account"
                    : "Complete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Customer / Pet / Booking Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Search Customer / Pet / Booking</DialogTitle>
            <DialogDescription>
              Search by email, phone, name, or pet name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, phone, name, first name, last name, or pet name..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[400px]">
              {linkSearchQuery.trim() ? (
                filteredCustomers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredCustomers.map((client) => (
                      <div
                        key={client.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          handleClientSelect(String(client.id));
                          setIsLinkModalOpen(false);
                          setLinkSearchQuery("");
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{client.name}</p>
                              {selectedClientId === String(client.id) && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </div>
                              )}
                              {client.pets && client.pets.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <PawPrint className="h-3 w-3" />
                                  {client.pets.map((pet, idx) => (
                                    <Badge key={pet.id} variant="outline" className="text-xs">
                                      {pet.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No customers found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Start typing to search customers</p>
                  <p className="text-sm mt-1">
                    Search by email, phone, name, or pet name
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false);
                setLinkSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleClientSelect("__walk_in__");
                setIsLinkModalOpen(false);
                setLinkSearchQuery("");
              }}
            >
              Walk-in (No Customer)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Successful
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              ${grandTotal.toFixed(2)}
            </div>
            <p className="text-muted-foreground">Transaction complete</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!customerEmail}
              onClick={() => completeTransaction(true)}
            >
              <Mail className="h-4 w-4" />
              Email Receipt
            </Button>
          </div>

          <Button
            className="w-full mt-2"
            onClick={() => completeTransaction(false)}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
