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
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Wifi,
  WifiOff,
  Wallet,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  getFiservConfig,
  getTokenizedCardsByClient,
  getDefaultTokenizedCard,
  getCloverTerminal,
  getCloverTerminalsByFacility,
  getYipyyPayConfig,
  getYipyyPayDevicesByFacility,
  getYipyyPayDevice,
  type TokenizedCard,
} from "@/data/fiserv-payments";
import {
  processFiservPayment,
  type FiservPaymentRequest,
} from "@/lib/fiserv-payment-service";
import {
  processCloverPayment,
  type CloverPaymentRequest,
} from "@/lib/clover-terminal-service";
import {
  processYipyyPay,
  type YipyyPayRequest,
} from "@/lib/yipyy-pay-service";
import { isDeviceReadyForTapToPay } from "@/lib/device-detection";
import { locations } from "@/data/settings";

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

  const [paymentForm, setPaymentForm] = useState<{
    method: PaymentMethod;
    splitPayments: boolean;
    payments: { 
      method: PaymentMethod; 
      amount: number;
      useYipyyPay?: boolean;
      useCloverTerminal?: boolean;
      yipyyPayDeviceId?: string;
      cloverTerminalId?: string;
      tokenizedCardId?: string;
    }[];
    chargeType: "pay_now" | "add_to_booking" | "charge_to_account" | "charge_to_active_stay";
    selectedBookingId: number | null;
  }>({
    method: "cash",
    splitPayments: false,
    payments: [{ method: "cash", amount: 0 }],
    chargeType: "pay_now",
    selectedBookingId: null,
  });
  const [isBookingSelectModalOpen, setIsBookingSelectModalOpen] = useState(false);
  
  // Fiserv payment state
  const [selectedTokenizedCard, setSelectedTokenizedCard] = useState<TokenizedCard | null>(null);
  const [saveCardToAccount, setSaveCardToAccount] = useState(false);
  const [newCardDetails, setNewCardDetails] = useState({
    number: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    cardholderName: "",
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Clover terminal state
  const [useCloverTerminal, setUseCloverTerminal] = useState(false);
  const [cloverTerminalId, setCloverTerminalId] = useState<string | null>(null);
  
  // Yipyy Pay / Tap to Pay state
  const [useYipyyPay, setUseYipyyPay] = useState(false);
  const [yipyyPayDeviceId, setYipyyPayDeviceId] = useState<string | null>(null);
  
  // Store Credit and Gift Card state
  const [selectedGiftCardCode, setSelectedGiftCardCode] = useState("");
  const [selectedGiftCard, setSelectedGiftCard] = useState<{ id: string; balance: number; code: string } | null>(null);
  const [storeCreditAmount, setStoreCreditAmount] = useState<number>(0);
  
  // Tap to Pay modal state
  const [isTapToPayModalOpen, setIsTapToPayModalOpen] = useState(false);
  const [tapToPayStatus, setTapToPayStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [tapToPayError, setTapToPayError] = useState<string | null>(null);
  const [tapToPayResponse, setTapToPayResponse] = useState<any>(null);

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

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    
    try {
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

      const facilityId = 11; // TODO: Get from context
      const fiservConfig = getFiservConfig(facilityId);
      
      // Handle split payments
      if (paymentForm.splitPayments && paymentForm.payments.length > 0) {
        const processedPayments: Array<{
          method: PaymentMethod;
          amount: number;
          transactionId?: string;
          yipyyPayTransactionId?: string;
          cloverTransactionId?: string;
          fiservTransactionId?: string;
          notes?: string;
        }> = [];
        let allPaymentsSuccessful = true;
        let paymentErrors: string[] = [];

        // Process each payment in the split
        for (let i = 0; i < paymentForm.payments.length; i++) {
          const payment = paymentForm.payments[i];
          
          try {
            // Process Pay with iPhone
            if ((payment.method === "credit" || payment.method === "debit") && payment.useYipyyPay && payment.yipyyPayDeviceId) {
              const device = getYipyyPayDevice(facilityId, payment.yipyyPayDeviceId);
              
              if (!device || !device.isAuthorized || !device.isActive) {
                paymentErrors.push(`Payment ${i + 1} (iPhone): Device not available`);
                allPaymentsSuccessful = false;
                continue;
              }

              const yipyyPayRequest: YipyyPayRequest = {
                facilityId,
                deviceId: payment.yipyyPayDeviceId,
                amount: payment.amount,
                currency: "USD",
                description: `Split Payment ${i + 1}/${paymentForm.payments.length} - POS Transaction`,
                customerId: customerId ? Number(customerId) : undefined,
                bookingId: selectedBookingId || undefined,
                sendReceipt: fiservConfig?.yipyyPay?.autoSendReceipt ?? true,
                processedBy: currentUserId || "staff-001",
                processedById: currentUserId ? Number(currentUserId) : undefined,
              };

              const yipyyPayResponse = await processYipyyPay(yipyyPayRequest);
              
              if (yipyyPayResponse.success) {
                processedPayments.push({
                  method: payment.method,
                  amount: payment.amount,
                  yipyyPayTransactionId: yipyyPayResponse.transactionId,
                  notes: `Pay with iPhone (${device.deviceName})`,
                });
              } else {
                paymentErrors.push(`Payment ${i + 1} (iPhone): ${yipyyPayResponse.error?.message || "Failed"}`);
                allPaymentsSuccessful = false;
              }
            }
            // Process Clover Terminal
            else if ((payment.method === "credit" || payment.method === "debit") && payment.useCloverTerminal && payment.cloverTerminalId) {
              const terminal = getCloverTerminal(facilityId, payment.cloverTerminalId);
              
              if (!terminal || !terminal.isOnline) {
                paymentErrors.push(`Payment ${i + 1} (Clover): Terminal not available`);
                allPaymentsSuccessful = false;
                continue;
              }

              const cloverRequest: CloverPaymentRequest = {
                facilityId,
                terminalId: payment.cloverTerminalId,
                amount: payment.amount,
                currency: "USD",
                description: `Split Payment ${i + 1}/${paymentForm.payments.length} - POS Transaction`,
                customerId: customerId ? Number(customerId) : undefined,
                bookingId: selectedBookingId || undefined,
                printReceipt: fiservConfig?.cloverTerminal?.autoPrintReceipts ?? true,
                printCustomerCopy: true,
                printMerchantCopy: true,
              };

              const cloverResponse = await processCloverPayment(cloverRequest);
              
              if (cloverResponse.success) {
                processedPayments.push({
                  method: payment.method,
                  amount: payment.amount,
                  cloverTransactionId: cloverResponse.cloverTransactionId,
                  fiservTransactionId: cloverResponse.fiservTransactionId,
                  notes: `Clover Terminal (${terminal.terminalName})`,
                });
              } else {
                paymentErrors.push(`Payment ${i + 1} (Clover): ${cloverResponse.error?.message || "Failed"}`);
                allPaymentsSuccessful = false;
              }
            }
            // Process Fiserv (web card payment)
            else if ((payment.method === "credit" || payment.method === "debit") && !payment.useYipyyPay && !payment.useCloverTerminal) {
              let paymentSource: "new_card" | "tokenized_card" = "new_card";
              let tokenizedCardId: string | undefined = payment.tokenizedCardId;
              
              if (tokenizedCardId && customerId) {
                paymentSource = "tokenized_card";
              } else if (customerId && selectedTokenizedCard) {
                paymentSource = "tokenized_card";
                tokenizedCardId = selectedTokenizedCard.id;
              }

              const fiservRequest: FiservPaymentRequest = {
                facilityId,
                clientId: customerId ? Number(customerId) : 0,
                amount: payment.amount,
                currency: "USD",
                paymentSource,
                tokenizedCardId,
                newCard: paymentSource === "new_card" && newCardDetails.number
                  ? {
                      number: newCardDetails.number.replace(/\s/g, ""),
                      expMonth: parseInt(newCardDetails.expMonth, 10),
                      expYear: parseInt(newCardDetails.expYear, 10),
                      cvv: newCardDetails.cvv,
                      cardholderName: newCardDetails.cardholderName || name || "Customer",
                      saveToAccount: saveCardToAccount && !!customerId,
                      setAsDefault: saveCardToAccount && !!customerId,
                    }
                  : undefined,
                description: `Split Payment ${i + 1}/${paymentForm.payments.length} - POS Transaction`,
                context: "pos",
                bookingId: selectedBookingId || undefined,
              };

              const fiservResponse = await processFiservPayment(fiservRequest);
              
              if (fiservResponse.success) {
                processedPayments.push({
                  method: payment.method,
                  amount: payment.amount,
                  fiservTransactionId: fiservResponse.fiservTransactionId,
                  notes: `Card Payment (Fiserv)`,
                });
              } else {
                paymentErrors.push(`Payment ${i + 1} (Card): ${fiservResponse.error?.message || "Failed"}`);
                allPaymentsSuccessful = false;
              }
            }
            // Process Cash, Store Credit, Gift Card (no processing needed, just record)
            else {
              processedPayments.push({
                method: payment.method,
                amount: payment.amount,
                notes: payment.method === "cash" ? "Cash" : payment.method === "store_credit" ? "Store Credit" : "Gift Card",
              });
            }
          } catch (error) {
            paymentErrors.push(`Payment ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
            allPaymentsSuccessful = false;
          }
        }

        if (!allPaymentsSuccessful) {
          alert(`Some payments failed:\n${paymentErrors.join("\n")}\n\nPlease retry or use a different payment method.`);
          setIsProcessingPayment(false);
          return;
        }

        // All payments successful - record transaction
        const paymentNotes = processedPayments
          .map((p, idx) => `${idx + 1}. ${p.notes || p.method}: $${p.amount.toFixed(2)}`)
          .join(" | ");

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
          paymentMethod: "split",
          payments: processedPayments.map(p => ({
            method: p.method,
            amount: p.amount,
          })),
          customerId,
          customerName: name,
          customerEmail: email,
          petId: selectedPetId || undefined,
          petName: petName,
          bookingId: selectedBookingId || undefined,
          bookingService: booking?.service,
          cashierId: currentUserId || "staff-001",
          cashierName: "Staff",
          notes: `Split Payment: ${paymentNotes}`,
          // Store transaction IDs from last card payment (for refund purposes)
          yipyyPayTransactionId: processedPayments.find(p => p.yipyyPayTransactionId)?.yipyyPayTransactionId,
          cloverTransactionId: processedPayments.find(p => p.cloverTransactionId)?.cloverTransactionId,
          fiservTransactionId: processedPayments.find(p => p.fiservTransactionId)?.fiservTransactionId,
        });
      }
      // Process payment through Clover terminal if enabled and selected (single payment)
      else if (
        useCloverTerminal &&
        cloverTerminalId &&
        fiservConfig?.cloverTerminal?.enabled &&
        (paymentForm.method === "credit" || paymentForm.method === "debit")
      ) {
        const terminal = getCloverTerminal(facilityId, cloverTerminalId);
        
        if (!terminal || !terminal.isOnline) {
          alert("Clover terminal is not available or offline. Please use another payment method.");
          setIsProcessingPayment(false);
          return;
        }

        // Prepare Clover terminal payment request
        const cloverRequest: CloverPaymentRequest = {
          facilityId,
          terminalId: cloverTerminalId,
          amount: grandTotal - (calculatedTipAmount || 0),
          currency: "USD",
          tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
          description: `POS Transaction - ${cart.length} item(s)`,
          invoiceId: undefined, // TODO: Link to invoice if applicable
          customerId: customerId ? Number(customerId) : undefined,
          bookingId: selectedBookingId || undefined,
          printReceipt: fiservConfig.cloverTerminal?.autoPrintReceipts ?? true,
          printCustomerCopy: true,
          printMerchantCopy: true,
        };

        // Process payment through Clover terminal
        const cloverResponse = await processCloverPayment(cloverRequest);

        if (!cloverResponse.success) {
          alert(`Payment failed: ${cloverResponse.error?.message || "Unknown error"}`);
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Clover details
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
          paymentMethod: paymentForm.method,
          payments: [{ method: paymentForm.method, amount: grandTotal }],
          customerId,
          customerName: name,
          customerEmail: email,
          petId: selectedPetId || undefined,
          petName: petName,
          bookingId: selectedBookingId || undefined,
          bookingService: booking?.service,
          cashierId: currentUserId || "staff-001",
          cashierName: "Staff",
          notes: `Clover Terminal (${cloverResponse.paymentMethod.toUpperCase()}): ${cloverResponse.cloverTransactionId}${cloverResponse.receiptPrinted ? " - Receipt printed" : ""}`,
          cloverTransactionId: cloverResponse.cloverTransactionId,
          fiservTransactionId: cloverResponse.fiservTransactionId,
        });
      }
      // Process payment via Yipyy Pay / Tap to Pay on iPhone
      else if (
        useYipyyPay &&
        yipyyPayDeviceId &&
        fiservConfig?.yipyyPay?.enabled &&
        (paymentForm.method === "credit" || paymentForm.method === "debit")
      ) {
        const yipyyPayConfig = getYipyyPayConfig(facilityId);
        const device = getYipyyPayDevice(facilityId, yipyyPayDeviceId);
        
        if (!device || !device.isAuthorized || !device.isActive) {
          alert("Yipyy Pay device is not available or not authorized. Please use another payment method.");
          setIsProcessingPayment(false);
          return;
        }

        // Prepare Yipyy Pay request
        const yipyyPayRequest: YipyyPayRequest = {
          facilityId,
          deviceId: yipyyPayDeviceId,
          amount: grandTotal - (calculatedTipAmount || 0),
          currency: "USD",
          tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
          description: `POS Transaction - ${cart.length} item(s)`,
          invoiceId: undefined, // TODO: Link to invoice if applicable
          customerId: customerId ? Number(customerId) : undefined,
          bookingId: selectedBookingId || undefined,
          sendReceipt: fiservConfig.yipyyPay?.autoSendReceipt ?? true,
          processedBy: "Staff",
          processedById: currentUserId ? Number(currentUserId) : undefined,
        };

        // Process payment via Yipyy Pay / Tap to Pay
        const yipyyPayResponse = await processYipyyPay(yipyyPayRequest);

        if (!yipyyPayResponse.success) {
          alert(`Payment failed: ${yipyyPayResponse.error?.message || "Unknown error"}`);
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Yipyy Pay details
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
          paymentMethod: paymentForm.method,
          payments: [{ method: paymentForm.method, amount: grandTotal }],
          customerId,
          customerName: name,
          customerEmail: email,
          petId: selectedPetId || undefined,
          petName: petName,
          bookingId: selectedBookingId || undefined,
          bookingService: booking?.service,
          cashierId: currentUserId || "staff-001",
          cashierName: "Staff",
          notes: `Yipyy Pay (Tap to Pay - iPhone): ${yipyyPayResponse.yipyyTransactionId}${yipyyPayResponse.receiptSent ? " - Receipt sent" : ""}`,
          yipyyPayTransactionId: yipyyPayResponse.transactionId, // Store Yipyy Pay transaction ID
        });
      }
      // Process card payments through Fiserv if enabled (web payment)
      else if (
        (paymentForm.method === "credit" || paymentForm.method === "debit") &&
        !useCloverTerminal &&
        !useYipyyPay &&
        fiservConfig?.integrationSettings.posEnabled &&
        fiservConfig?.enabledPaymentMethods.card
      ) {
        // Determine payment source
        let paymentSource: "new_card" | "tokenized_card" = "new_card";
        let tokenizedCardId: string | undefined;
        
        if (selectedTokenizedCard && customerId) {
          paymentSource = "tokenized_card";
          tokenizedCardId = selectedTokenizedCard.id;
        } else if (customerId && !newCardDetails.number) {
          // Try to use default card on file
          const defaultCard = getDefaultTokenizedCard(facilityId, Number(customerId));
          if (defaultCard) {
            paymentSource = "tokenized_card";
            tokenizedCardId = defaultCard.id;
          }
        }

        // Prepare Fiserv payment request
        const fiservRequest: FiservPaymentRequest = {
          facilityId,
          clientId: customerId ? Number(customerId) : 0,
          amount: grandTotal - (calculatedTipAmount || 0),
          currency: "USD",
          paymentSource,
          tokenizedCardId,
          newCard: paymentSource === "new_card" && newCardDetails.number
            ? {
                number: newCardDetails.number.replace(/\s/g, ""),
                expMonth: parseInt(newCardDetails.expMonth, 10),
                expYear: parseInt(newCardDetails.expYear, 10),
                cvv: newCardDetails.cvv,
                cardholderName: newCardDetails.cardholderName || name || "Customer",
                saveToAccount: saveCardToAccount && !!customerId,
                setAsDefault: saveCardToAccount && !!customerId,
              }
            : undefined,
          tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
          description: `POS Transaction - ${cart.length} item(s)`,
          context: "pos",
          bookingId: selectedBookingId || undefined,
        };

        // Process payment through Fiserv
        const fiservResponse = await processFiservPayment(fiservRequest);

        if (!fiservResponse.success) {
          alert(`Payment failed: ${fiservResponse.error?.message || "Unknown error"}`);
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Fiserv details
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
          notes: `Fiserv Transaction: ${fiservResponse.fiservTransactionId}`,
          fiservTransactionId: fiservResponse.fiservTransactionId,
          tokenizedCardId: fiservResponse.tokenizedCardId,
        });
      } else {
        // Handle Store Credit and Gift Card payments
        let finalAmount = grandTotal;
        let paymentNotes = "";

        // Apply store credit if selected
        if (paymentForm.method === "store_credit" && storeCreditAmount > 0) {
          finalAmount = grandTotal - storeCreditAmount;
          paymentNotes = `Store Credit Applied: $${storeCreditAmount.toFixed(2)}`;
          if (finalAmount > 0) {
            paymentNotes += ` | Remaining: $${finalAmount.toFixed(2)}`;
            // TODO: Prompt for additional payment method for remaining amount
            alert(`Store credit applied: $${storeCreditAmount.toFixed(2)}. Remaining amount: $${finalAmount.toFixed(2)} needs to be paid with another method.`);
            setIsProcessingPayment(false);
            return;
          }
        }

        // Apply gift card if selected
        if (paymentForm.method === "gift_card" && selectedGiftCard) {
          const giftCardAmount = Math.min(selectedGiftCard.balance, grandTotal);
          finalAmount = grandTotal - giftCardAmount;
          paymentNotes = `Gift Card Applied: $${giftCardAmount.toFixed(2)} (Card: ${selectedGiftCard.code})`;
          if (finalAmount > 0) {
            paymentNotes += ` | Remaining: $${finalAmount.toFixed(2)}`;
            // TODO: Prompt for additional payment method for remaining amount
            alert(`Gift card applied: $${giftCardAmount.toFixed(2)}. Remaining amount: $${finalAmount.toFixed(2)} needs to be paid with another method.`);
            setIsProcessingPayment(false);
            return;
          }
        }

        // Non-card payment or Fiserv not enabled - process normally
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
          total: finalAmount > 0 ? finalAmount : grandTotal,
          paymentMethod: paymentForm.splitPayments ? "split" : paymentForm.method,
          payments: paymentForm.splitPayments
            ? paymentForm.payments
            : [{ method: paymentForm.method, amount: finalAmount > 0 ? finalAmount : grandTotal }],
          customerId,
          customerName: name,
          customerEmail: email,
          petId: selectedPetId || undefined,
          petName: petName,
          bookingId: selectedBookingId || undefined,
          bookingService: booking?.service,
          cashierId: currentUserId || "staff-001",
          cashierName: "Staff",
          notes: paymentNotes || "",
        });
      }
      
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
      // Clear Fiserv state
      setSelectedTokenizedCard(null);
      setSaveCardToAccount(false);
      setNewCardDetails({
        number: "",
        expMonth: "",
        expYear: "",
        cvv: "",
        cardholderName: "",
      });

      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
    } catch (error) {
      console.error("Payment processing error:", error);
      alert("An error occurred while processing the payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
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
      chargeType: "pay_now",
      selectedBookingId: null,
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
      // Only show active/upcoming bookings (exclude completed and cancelled)
      return booking.status === "pending" || booking.status === "confirmed";
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
        (booking.status === "confirmed" || booking.status === "pending") &&
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
      // Show confirmed and pending bookings (can add items to these)
      return booking.status === "confirmed" || booking.status === "pending";
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
                                booking.status === "confirmed"
                                  ? "default"
                                  : booking.status === "pending"
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

                {paymentForm.payments.map((payment, index) => {
                  const facilityId = 11; // TODO: Get from context
                  const fiservConfig = getFiservConfig(facilityId);
                  const inPersonMethods = fiservConfig?.inPersonMethods;
                  const isLastPayment = index === paymentForm.payments.length - 1;
                  const remainingAmount = grandTotal - paymentForm.payments
                    .slice(0, index)
                    .reduce((sum, p) => sum + p.amount, 0);
                  
                  return (
                    <div key={index} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Method</Label>
                          <Select
                            value={payment.method}
                            onValueChange={(value: PaymentMethod) => {
                              const newPayments = [...paymentForm.payments];
                              newPayments[index] = {
                                ...newPayments[index],
                                method: value,
                                // Reset iPhone/Clover flags when changing method
                                useYipyyPay: value === "credit" || value === "debit" ? newPayments[index].useYipyyPay : false,
                                useCloverTerminal: value === "credit" || value === "debit" ? newPayments[index].useCloverTerminal : false,
                              };
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
                              {inPersonMethods?.cash !== false && (
                                <SelectItem value="cash">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4" />
                                    <span>Cash</span>
                                  </div>
                                </SelectItem>
                              )}
                              {(inPersonMethods?.cloverTerminal || inPersonMethods?.payWithiPhone || fiservConfig?.enabledPaymentMethods.card) && (
                                <>
                                  <SelectItem value="credit">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      <span>Credit Card</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="debit">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      <span>Debit Card</span>
                                    </div>
                                  </SelectItem>
                                </>
                              )}
                              {inPersonMethods?.storeCredit !== false && (
                                <SelectItem value="store_credit">
                                  <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4" />
                                    <span>Store Credit</span>
                                  </div>
                                </SelectItem>
                              )}
                              {inPersonMethods?.giftCard !== false && (
                                <SelectItem value="gift_card">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4" />
                                    <span>Gift Card</span>
                                  </div>
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            max={isLastPayment ? remainingAmount : undefined}
                            step="0.01"
                            value={payment.amount}
                            onChange={(e) => {
                              const newPayments = [...paymentForm.payments];
                              const amount = parseFloat(e.target.value) || 0;
                              if (isLastPayment) {
                                newPayments[index].amount = Math.min(amount, remainingAmount);
                              } else {
                                newPayments[index].amount = amount;
                              }
                              setPaymentForm({
                                ...paymentForm,
                                payments: newPayments,
                              });
                            }}
                            onBlur={() => {
                              // Auto-adjust last payment to cover remaining balance
                              if (isLastPayment) {
                                const newPayments = [...paymentForm.payments];
                                const totalSoFar = newPayments
                                  .slice(0, index)
                                  .reduce((sum, p) => sum + p.amount, 0);
                                newPayments[index].amount = grandTotal - totalSoFar;
                                setPaymentForm({
                                  ...paymentForm,
                                  payments: newPayments,
                                });
                              }
                            }}
                          />
                          {isLastPayment && (
                            <div className="mt-1 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Remaining: ${remainingAmount.toFixed(2)}
                              </p>
                              {(payment.method === "credit" || payment.method === "debit") && inPersonMethods?.payWithiPhone && (
                                <p className="text-xs text-blue-600 font-medium">
                                  💡 Final payment can be completed with Pay with iPhone
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {paymentForm.payments.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newPayments = paymentForm.payments.filter(
                                (_, i) => i !== index,
                              );
                              // Recalculate last payment amount
                              if (newPayments.length > 0) {
                                const totalSoFar = newPayments
                                  .slice(0, -1)
                                  .reduce((sum, p) => sum + p.amount, 0);
                                newPayments[newPayments.length - 1].amount = grandTotal - totalSoFar;
                              }
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

                      {/* Pay with iPhone option for credit/debit */}
                      {(payment.method === "credit" || payment.method === "debit") && inPersonMethods?.payWithiPhone && (
                        <div className="space-y-2 border rounded-lg p-3 bg-muted/50">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Pay with iPhone (Tap to Pay)</Label>
                            <Switch
                              checked={payment.useYipyyPay || false}
                              onCheckedChange={(checked) => {
                                const newPayments = [...paymentForm.payments];
                                newPayments[index] = {
                                  ...newPayments[index],
                                  useYipyyPay: checked,
                                  useCloverTerminal: checked ? false : newPayments[index].useCloverTerminal,
                                };
                                if (checked) {
                                  const devices = getYipyyPayDevicesByFacility(facilityId);
                                  if (devices.length > 0) {
                                    newPayments[index].yipyyPayDeviceId = devices[0].deviceId;
                                  }
                                } else {
                                  newPayments[index].yipyyPayDeviceId = undefined;
                                }
                                setPaymentForm({
                                  ...paymentForm,
                                  payments: newPayments,
                                });
                              }}
                            />
                          </div>
                          {payment.useYipyyPay && (
                            <div className="grid gap-2">
                              <Label className="text-xs">Select iPhone Device</Label>
                              <Select
                                value={payment.yipyyPayDeviceId || ""}
                                onValueChange={(value) => {
                                  const newPayments = [...paymentForm.payments];
                                  newPayments[index].yipyyPayDeviceId = value;
                                  setPaymentForm({
                                    ...paymentForm,
                                    payments: newPayments,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select device" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getYipyyPayDevicesByFacility(facilityId).map((device) => (
                                    <SelectItem key={device.id} value={device.deviceId}>
                                      <div className="flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        <span>{device.deviceName}</span>
                                        {device.isAuthorized ? (
                                          <Badge variant="default" className="ml-2">Ready</Badge>
                                        ) : (
                                          <Badge variant="secondary" className="ml-2">Pending</Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clover Terminal option for credit/debit */}
                      {(payment.method === "credit" || payment.method === "debit") && !payment.useYipyyPay && inPersonMethods?.cloverTerminal && (
                        <div className="space-y-2 border rounded-lg p-3 bg-muted/50">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Use Clover Terminal</Label>
                            <Switch
                              checked={payment.useCloverTerminal || false}
                              onCheckedChange={(checked) => {
                                const newPayments = [...paymentForm.payments];
                                newPayments[index] = {
                                  ...newPayments[index],
                                  useCloverTerminal: checked,
                                };
                                if (checked) {
                                  const terminals = getCloverTerminalsByFacility(facilityId);
                                  if (terminals.length > 0) {
                                    newPayments[index].cloverTerminalId = terminals[0].terminalId;
                                  }
                                } else {
                                  newPayments[index].cloverTerminalId = undefined;
                                }
                                setPaymentForm({
                                  ...paymentForm,
                                  payments: newPayments,
                                });
                              }}
                            />
                          </div>
                          {payment.useCloverTerminal && (
                            <div className="grid gap-2">
                              <Label className="text-xs">Select Terminal</Label>
                              <Select
                                value={payment.cloverTerminalId || ""}
                                onValueChange={(value) => {
                                  const newPayments = [...paymentForm.payments];
                                  newPayments[index].cloverTerminalId = value;
                                  setPaymentForm({
                                    ...paymentForm,
                                    payments: newPayments,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select terminal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getCloverTerminalsByFacility(facilityId).map((terminal) => (
                                    <SelectItem key={terminal.terminalId} value={terminal.terminalId}>
                                      <div className="flex items-center gap-2">
                                        <Printer className="h-4 w-4" />
                                        <span>{terminal.terminalName}</span>
                                        {terminal.isOnline ? (
                                          <Badge variant="default" className="ml-2">Online</Badge>
                                        ) : (
                                          <Badge variant="secondary" className="ml-2">Offline</Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Store Credit for split payment */}
                      {payment.method === "store_credit" && selectedClientId && selectedClientId !== "__walk_in__" && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            Available: ${getStoreCreditBalance(selectedClientId).toFixed(2)}
                          </p>
                        </div>
                      )}

                      {/* Gift Card for split payment */}
                      {payment.method === "gift_card" && (
                        <div className="grid gap-2">
                          <Label className="text-xs">Gift Card Code</Label>
                          <Input
                            type="text"
                            placeholder="Enter gift card code"
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

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
                    onValueChange={(value: PaymentMethod) => {
                      setPaymentForm({ ...paymentForm, method: value });
                      // Reset Clover terminal and Yipyy Pay selection when changing payment method
                      if (value !== "credit" && value !== "debit") {
                        setUseCloverTerminal(false);
                        setCloverTerminalId(null);
                        setUseYipyyPay(false);
                        setYipyyPayDeviceId(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const facilityId = 11; // TODO: Get from context
                        const fiservConfig = getFiservConfig(facilityId);
                        const inPersonMethods = fiservConfig?.inPersonMethods;
                        const paymentOptions: JSX.Element[] = [];

                        // Cash
                        if (inPersonMethods?.cash !== false) {
                          paymentOptions.push(
                            <SelectItem key="cash" value="cash">
                              <div className="flex items-center gap-2">
                                <Banknote className="h-4 w-4" />
                                <span>Cash</span>
                              </div>
                            </SelectItem>
                          );
                        }

                        // Credit/Debit Card (with Clover Terminal or iPhone options)
                        if (inPersonMethods?.cloverTerminal || inPersonMethods?.payWithiPhone || fiservConfig?.enabledPaymentMethods.card) {
                          paymentOptions.push(
                            <SelectItem key="credit" value="credit">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Credit Card</span>
                                {inPersonMethods?.cloverTerminal && (
                                  <Badge variant="outline" className="ml-2 text-xs">Clover Terminal</Badge>
                                )}
                                {inPersonMethods?.payWithiPhone && (
                                  <Badge variant="outline" className="ml-2 text-xs">iPhone</Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                          paymentOptions.push(
                            <SelectItem key="debit" value="debit">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Debit Card</span>
                                {inPersonMethods?.cloverTerminal && (
                                  <Badge variant="outline" className="ml-2 text-xs">Clover Terminal</Badge>
                                )}
                                {inPersonMethods?.payWithiPhone && (
                                  <Badge variant="outline" className="ml-2 text-xs">iPhone</Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        }

                        // Store Credit
                        if (inPersonMethods?.storeCredit !== false) {
                          paymentOptions.push(
                            <SelectItem key="store_credit" value="store_credit">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Store Credit</span>
                              </div>
                            </SelectItem>
                          );
                        }

                        // Gift Card
                        if (inPersonMethods?.giftCard !== false) {
                          paymentOptions.push(
                            <SelectItem key="gift_card" value="gift_card">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Gift Card</span>
                              </div>
                            </SelectItem>
                          );
                        }

                        // Manual Card Entry (if enabled and admin)
                        if (inPersonMethods?.manualCardEntry && isManager) {
                          paymentOptions.push(
                            <SelectItem key="manual_card" value="credit">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Manual Card Entry</span>
                                <Badge variant="secondary" className="ml-2 text-xs">Admin Only</Badge>
                              </div>
                            </SelectItem>
                          );
                        }

                        return paymentOptions;
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clover Terminal Selection */}
                {(paymentForm.method === "credit" || paymentForm.method === "debit") && (() => {
                  const facilityId = 11; // TODO: Get from context
                  const fiservConfig = getFiservConfig(facilityId);
                  const terminals = fiservConfig?.cloverTerminal?.enabled
                    ? getCloverTerminalsByFacility(facilityId)
                    : [];

                  if (terminals.length > 0) {
                    return (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Use Clover Terminal</Label>
                            <p className="text-xs text-muted-foreground">
                              Process payment via physical terminal (Tap/Chip/Swipe)
                            </p>
                          </div>
                          <Switch
                            checked={useCloverTerminal}
                            onCheckedChange={(checked) => {
                              setUseCloverTerminal(checked);
                              if (checked && terminals.length > 0) {
                                // Auto-select first terminal or configured terminal
                                const defaultTerminalId = fiservConfig?.cloverTerminal?.terminalId || terminals[0].terminalId;
                                setCloverTerminalId(defaultTerminalId);
                              } else {
                                setCloverTerminalId(null);
                              }
                            }}
                          />
                        </div>
                        {useCloverTerminal && (
                          <div className="grid gap-2">
                            <Label className="text-xs">Select Terminal</Label>
                            <Select
                              value={cloverTerminalId || ""}
                              onValueChange={setCloverTerminalId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select terminal" />
                              </SelectTrigger>
                              <SelectContent>
                                {terminals.map((terminal) => (
                                  <SelectItem key={terminal.terminalId} value={terminal.terminalId}>
                                    <div className="flex items-center gap-2">
                                      <span>{terminal.terminalName}</span>
                                      {terminal.isOnline ? (
                                        <Badge variant="default" className="ml-2">Online</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="ml-2">Offline</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {cloverTerminalId && (() => {
                              const terminal = getCloverTerminal(facilityId, cloverTerminalId);
                              if (!terminal) return null;
                              return (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {terminal.location && <span>Location: {terminal.location} • </span>}
                                  Supports: {[
                                    terminal.supportsTap && "Tap",
                                    terminal.supportsChip && "Chip",
                                    terminal.supportsSwipe && "Swipe",
                                  ].filter(Boolean).join(", ")}
                                  {fiservConfig?.cloverTerminal?.autoPrintReceipts && (
                                    <span> • Auto-print enabled</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Yipyy Pay / Tap to Pay Selection */}
                {(paymentForm.method === "credit" || paymentForm.method === "debit") && !useCloverTerminal && (() => {
                  const facilityId = 11; // TODO: Get from context
                  const fiservConfig = getFiservConfig(facilityId);
                  const devices = fiservConfig?.yipyyPay?.enabled
                    ? getYipyyPayDevicesByFacility(facilityId)
                    : [];

                  if (devices.length > 0) {
                    return (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Pay with iPhone (Tap to Pay)</Label>
                            <p className="text-xs text-muted-foreground">
                              Accept contactless payment directly on iPhone - no terminal needed
                            </p>
                          </div>
                          <Switch
                            checked={useYipyyPay}
                            onCheckedChange={(checked) => {
                              setUseYipyyPay(checked);
                              if (checked && devices.length > 0) {
                                // Auto-select first available device
                                setYipyyPayDeviceId(devices[0].deviceId);
                              } else {
                                setYipyyPayDeviceId(null);
                              }
                            }}
                          />
                        </div>
                        {useYipyyPay && (
                          <div className="grid gap-2">
                            <Label className="text-xs">Select iPhone Device</Label>
                            <Select
                              value={yipyyPayDeviceId || ""}
                              onValueChange={setYipyyPayDeviceId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select device" />
                              </SelectTrigger>
                              <SelectContent>
                                {devices.map((device) => (
                                  <SelectItem key={device.id} value={device.deviceId}>
                                    <div className="flex items-center gap-2">
                                      <Smartphone className="h-4 w-4" />
                                      <span>{device.deviceName}</span>
                                      {device.isAuthorized ? (
                                        <Badge variant="default" className="ml-2">Ready</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="ml-2">Pending</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {yipyyPayDeviceId && (() => {
                              const device = getYipyyPayDevice(facilityId, yipyyPayDeviceId);
                              if (!device) return null;
                              return (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {device.lastUsedAt && (
                                    <span>Last used: {new Date(device.lastUsedAt).toLocaleDateString()} • </span>
                                  )}
                                  Tap customer's card or phone to iPhone
                                  {fiservConfig?.yipyyPay?.autoSendReceipt && (
                                    <span> • Receipt will be sent automatically</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {paymentForm.method === "cash" && (
                  <div className="grid gap-2">
                    <Label>Amount Tendered</Label>
                    <Input type="number" min={grandTotal} placeholder="0.00" />
                  </div>
                )}

                {/* Store Credit */}
                {paymentForm.method === "store_credit" && (() => {
                  const facilityId = 11; // TODO: Get from context
                  const customerId = selectedClientId && selectedClientId !== "__walk_in__" 
                    ? selectedClientId 
                    : null;
                  const availableStoreCredit = customerId 
                    ? getStoreCreditBalance(customerId)
                    : 0;

                  if (!customerId) {
                    return (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Please select a customer to use store credit
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 border rounded-lg p-4">
                      <div className="space-y-2">
                        <Label>Available Store Credit</Label>
                        <div className="text-2xl font-bold text-green-600">
                          ${availableStoreCredit.toFixed(2)}
                        </div>
                        {availableStoreCredit < grandTotal && (
                          <p className="text-xs text-muted-foreground">
                            Store credit balance is less than total. Remaining amount will need to be paid with another method.
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Amount to Apply</Label>
                        <Input
                          type="number"
                          min={0}
                          max={Math.min(availableStoreCredit, grandTotal)}
                          step="0.01"
                          value={storeCreditAmount || ""}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            setStoreCreditAmount(Math.min(amount, availableStoreCredit, grandTotal));
                          }}
                          placeholder={`Max: $${Math.min(availableStoreCredit, grandTotal).toFixed(2)}`}
                        />
                      </div>
                      {storeCreditAmount > 0 && (
                        <div className="text-sm">
                          <span>Remaining after store credit: </span>
                          <span className="font-semibold">
                            ${(grandTotal - storeCreditAmount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Gift Card */}
                {paymentForm.method === "gift_card" && (
                  <div className="space-y-3 border rounded-lg p-4">
                    <div className="grid gap-2">
                      <Label>Gift Card Code</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter gift card code"
                          value={selectedGiftCardCode}
                          onChange={(e) => setSelectedGiftCardCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const facilityId = 11; // TODO: Get from context
                              const giftCard = giftCards.find(
                                (gc) => gc.code === selectedGiftCardCode && gc.facilityId === facilityId && gc.status === "active"
                              );
                              if (giftCard) {
                                setSelectedGiftCard({
                                  id: giftCard.id,
                                  balance: giftCard.currentBalance,
                                  code: giftCard.code,
                                });
                                if (giftCard.currentBalance < grandTotal) {
                                  alert(
                                    `Gift card balance ($${giftCard.currentBalance.toFixed(2)}) is less than total. Remaining amount will need to be paid with another method.`
                                  );
                                }
                              } else {
                                alert("Gift card not found or inactive");
                                setSelectedGiftCard(null);
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const facilityId = 11; // TODO: Get from context
                            const giftCard = giftCards.find(
                              (gc) => gc.code === selectedGiftCardCode && gc.facilityId === facilityId && gc.status === "active"
                            );
                            if (giftCard) {
                              setSelectedGiftCard({
                                id: giftCard.id,
                                balance: giftCard.currentBalance,
                                code: giftCard.code,
                              });
                              if (giftCard.currentBalance < grandTotal) {
                                alert(
                                  `Gift card balance ($${giftCard.currentBalance.toFixed(2)}) is less than total. Remaining amount will need to be paid with another method.`
                                );
                              }
                            } else {
                              alert("Gift card not found or inactive");
                              setSelectedGiftCard(null);
                            }
                          }}
                        >
                          Lookup
                        </Button>
                      </div>
                    </div>
                    {selectedGiftCard && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Gift Card: {selectedGiftCard.code}</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${selectedGiftCard.balance.toFixed(2)}
                        </div>
                        {selectedGiftCard.balance < grandTotal && (
                          <p className="text-xs text-muted-foreground">
                            Remaining amount: ${(grandTotal - selectedGiftCard.balance).toFixed(2)} will need to be paid with another method
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Card on File Selection */}
                {(paymentForm.method === "credit" || paymentForm.method === "debit") && !useCloverTerminal && !useYipyyPay && (() => {
                  const facilityId = 11; // TODO: Get from context
                  const fiservConfig = getFiservConfig(facilityId);
                  const customerId = selectedClientId && selectedClientId !== "__walk_in__" 
                    ? Number(selectedClientId) 
                    : null;
                  const tokenizedCards = customerId && fiservConfig?.enabledPaymentMethods.cardOnFile
                    ? getTokenizedCardsByClient(facilityId, customerId)
                    : [];

                  if (tokenizedCards.length > 0) {
                    return (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
                        <Label className="text-sm font-semibold">Saved Card on File</Label>
                        <div className="grid gap-2">
                          <Select
                            value={selectedTokenizedCard?.id || "new"}
                            onValueChange={(value) => {
                              if (value === "new") {
                                setSelectedTokenizedCard(null);
                              } else {
                                const card = tokenizedCards.find((c) => c.id === value);
                                setSelectedTokenizedCard(card || null);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Enter New Card</SelectItem>
                              {tokenizedCards.map((card) => (
                                <SelectItem key={card.id} value={card.id}>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    <span>{card.cardBrand?.toUpperCase()} •••• {card.cardLast4}</span>
                                    <span className="text-muted-foreground">(Exp {card.cardExpMonth}/{card.cardExpYear})</span>
                                    {card.isDefault && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {selectedTokenizedCard 
                              ? `Using saved ${selectedTokenizedCard.cardBrand?.toUpperCase()} card ending in ${selectedTokenizedCard.cardLast4}`
                              : "Select a saved card or enter new card details below"}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Fiserv Card Selection - New Card Entry */}
                {(paymentForm.method === "credit" || paymentForm.method === "debit") && !useCloverTerminal && !useYipyyPay && (
                  <div className="space-y-4">

                    {!selectedTokenizedCard && (
                      <div className="space-y-3 border rounded-lg p-4">
                        <Label>Card Details</Label>
                        <div className="grid gap-2">
                          <Label className="text-xs">Card Number</Label>
                          <Input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={newCardDetails.number}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, "");
                              if (/^\d*$/.test(value) && value.length <= 16) {
                                const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                                setNewCardDetails({ ...newCardDetails, number: formatted });
                              }
                            }}
                            maxLength={19}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="grid gap-2">
                            <Label className="text-xs">Month</Label>
                            <Input
                              type="text"
                              placeholder="MM"
                              value={newCardDetails.expMonth}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 2) {
                                  setNewCardDetails({ ...newCardDetails, expMonth: value });
                                }
                              }}
                              maxLength={2}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Year</Label>
                            <Input
                              type="text"
                              placeholder="YYYY"
                              value={newCardDetails.expYear}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 4) {
                                  setNewCardDetails({ ...newCardDetails, expYear: value });
                                }
                              }}
                              maxLength={4}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">CVV</Label>
                            <Input
                              type="text"
                              placeholder="123"
                              value={newCardDetails.cvv}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                if (value.length <= 4) {
                                  setNewCardDetails({ ...newCardDetails, cvv: value });
                                }
                              }}
                              maxLength={4}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Cardholder Name</Label>
                          <Input
                            type="text"
                            placeholder="John Doe"
                            value={newCardDetails.cardholderName}
                            onChange={(e) =>
                              setNewCardDetails({ ...newCardDetails, cardholderName: e.target.value })
                            }
                          />
                        </div>
                        {selectedClientId && selectedClientId !== "__walk_in__" && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="saveCard"
                              checked={saveCardToAccount}
                              onChange={(e) => setSaveCardToAccount(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="saveCard" className="text-sm font-normal">
                              Save card to customer account for future payments
                            </Label>
                          </div>
                        )}
                      </div>
                    )}
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
            <Button onClick={handlePayment} disabled={isProcessingPayment}>
              {isProcessingPayment
                ? "Processing..."
                : paymentForm.chargeType === "add_to_booking"
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

      {/* Tap to Pay Modal */}
      <Dialog open={isTapToPayModalOpen} onOpenChange={(open) => {
        setIsTapToPayModalOpen(open);
        if (!open) {
          setTapToPayStatus("idle");
          setTapToPayError(null);
          setTapToPayResponse(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pay with iPhone (Tap to Pay)
            </DialogTitle>
            <DialogDescription>
              Process contactless payment directly on iPhone
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const facilityId = 11; // TODO: Get from context
            const fiservConfig = getFiservConfig(facilityId);
            const inPersonMethods = fiservConfig?.inPersonMethods;
            const device = yipyyPayDeviceId ? getYipyyPayDevice(facilityId, yipyyPayDeviceId) : null;
            const minIOSVersion = inPersonMethods?.iphoneSettings?.deviceRequirements.minIOSVersion || "16.0";
            const deviceCheck = isDeviceReadyForTapToPay(minIOSVersion);
            const enabledLocations = inPersonMethods?.iphoneSettings?.enabledLocations || [];
            const restrictedRoles = inPersonMethods?.iphoneSettings?.restrictedRoles || [];
            const currentLocation = "loc-001"; // TODO: Get from context
            const isLocationEnabled = enabledLocations.includes(currentLocation);
            const isRoleAuthorized = restrictedRoles.length === 0 || restrictedRoles.includes(facilityRole);

            // Pre-payment checks
            if (tapToPayStatus === "idle") {
              const checks: { label: string; passed: boolean; error?: string }[] = [
                {
                  label: "Device is iPhone",
                  passed: deviceCheck.isIPhone,
                  error: "Device is not an iPhone",
                },
                {
                  label: `iOS ${minIOSVersion}+`,
                  passed: deviceCheck.isIOSSupported,
                  error: `iOS version ${deviceCheck.iosVersion || "unknown"} is below minimum ${minIOSVersion}`,
                },
                {
                  label: "NFC Support",
                  passed: deviceCheck.supportsNFC,
                  error: "Device does not support NFC (requires iPhone XS or newer)",
                },
                {
                  label: "Facility has method enabled",
                  passed: inPersonMethods?.payWithiPhone === true,
                  error: "Pay with iPhone is not enabled for this facility",
                },
                {
                  label: "Location enabled",
                  passed: isLocationEnabled,
                  error: "Pay with iPhone is not enabled for this location",
                },
                {
                  label: "Role authorized",
                  passed: isRoleAuthorized,
                  error: "Your role is not authorized to use Pay with iPhone",
                },
                {
                  label: "Device authorized",
                  passed: device?.isAuthorized === true && device?.isActive === true,
                  error: "Selected iPhone device is not authorized or active",
                },
              ];

              const failedChecks = checks.filter((c) => !c.passed);

              if (failedChecks.length > 0) {
                return (
                  <div className="space-y-4">
                    <Alert className="border-destructive">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Pre-payment checks failed:</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {failedChecks.map((check, idx) => (
                            <li key={idx} className="text-destructive">
                              {check.label}: {check.error}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsTapToPayModalOpen(false);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Back to Payment
                      </Button>
                    </DialogFooter>
                  </div>
                );
              }

              // All checks passed - show payment prompt
              return (
                <div className="space-y-6">
                  {/* Amount Display */}
                  <div className="text-center space-y-2">
                    <div className="text-5xl font-bold text-primary">
                      ${grandTotal.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Subtotal: ${subtotal.toFixed(2)}</div>
                      {taxTotal > 0 && <div>Tax: ${taxTotal.toFixed(2)}</div>}
                      {calculatedTipAmount > 0 && (
                        <div>Tip: ${calculatedTipAmount.toFixed(2)}</div>
                      )}
                    </div>
                  </div>

                  {/* Visual Prompt */}
                  <div className="flex flex-col items-center space-y-4 p-6 bg-muted rounded-lg border-2 border-dashed">
                    <div className="text-center space-y-2">
                      <Smartphone className="h-16 w-16 mx-auto text-primary animate-pulse" />
                      <p className="text-lg font-semibold">
                        Hold customer's card/phone/watch
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        near the top of iPhone to pay
                      </p>
                    </div>
                    {device && (
                      <div className="text-sm text-muted-foreground text-center">
                        Device: {device.deviceName}
                        {device.isAuthorized && (
                          <Badge variant="default" className="ml-2">Ready</Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsTapToPayModalOpen(false);
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        if (!yipyyPayDeviceId) return;

                        setTapToPayStatus("processing");
                        setTapToPayError(null);

                        try {
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

                          const yipyyPayRequest: YipyyPayRequest = {
                            facilityId: 11,
                            deviceId: yipyyPayDeviceId,
                            amount: grandTotal - (calculatedTipAmount || 0),
                            currency: "USD",
                            tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
                            description: `POS Transaction - ${cart.length} item(s)`,
                            invoiceId: undefined,
                            customerId: customerId ? Number(customerId) : undefined,
                            bookingId: selectedBookingId || undefined,
                            sendReceipt: fiservConfig?.yipyyPay?.autoSendReceipt ?? true,
                            processedBy: currentUserId || "staff-001",
                            processedById: currentUserId ? Number(currentUserId) : undefined,
                          };

                          const response = await processYipyyPay(yipyyPayRequest);
                          setTapToPayResponse(response);

                          if (response.success) {
                            setTapToPayStatus("success");
                            
                            // Record transaction
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
                              paymentMethod: paymentForm.method,
                              payments: [{ method: paymentForm.method, amount: grandTotal }],
                              customerId,
                              customerName: name,
                              customerEmail: email,
                              petId: selectedPetId || undefined,
                              petName: selectedPetId && selectedClientId && selectedClientId !== "__walk_in__"
                                ? clients
                                    .find((c) => String(c.id) === selectedClientId)
                                    ?.pets.find((p) => p.id === selectedPetId)?.name
                                : undefined,
                              bookingId: selectedBookingId || undefined,
                              bookingService: selectedBookingId
                                ? bookings.find((b) => b.id === selectedBookingId)?.service
                                : undefined,
                              cashierId: currentUserId || "staff-001",
                              cashierName: "Staff",
                              notes: `Yipyy Pay Transaction: ${response.yipyyTransactionId}`,
                              yipyyPayTransactionId: response.transactionId, // Store Yipyy Pay transaction ID
                            });

                            // Apply promo code usage
                            if (appliedPromoCode) {
                              const promo = getPromoCodeByCode(appliedPromoCode.code);
                              if (promo) {
                                applyPromoCode(appliedPromoCode.code);
                              }
                            }

                            // Clear cart
                            setCart([]);
                            setCartDiscount(null);
                            setAppliedPromoCode(null);
                            setSelectedClientId("");
                            setCustomerName("");
                            setCustomerEmail("");
                            setSelectedPetId(null);
                            setSelectedBookingId(null);
                            setTipAmount(0);
                            setTipPercentage(null);
                            setTipCustomAmount("");
                            setUseYipyyPay(false);
                            setYipyyPayDeviceId(null);
                          } else {
                            setTapToPayStatus("failed");
                            setTapToPayError(response.error?.message || "Payment failed");
                          }
                        } catch (error) {
                          setTapToPayStatus("failed");
                          setTapToPayError("An error occurred while processing the payment");
                          console.error("Tap to Pay error:", error);
                        }
                      }}
                    >
                      Start Payment
                    </Button>
                  </div>
                </div>
              );
            }

            // Processing state
            if (tapToPayStatus === "processing") {
              return (
                <div className="space-y-6 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Smartphone className="h-20 w-20 text-primary animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">Processing payment...</p>
                      <p className="text-sm text-muted-foreground">
                        Hold customer's card/phone/watch near the top of iPhone
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Success state
            if (tapToPayStatus === "success" && tapToPayResponse) {
              return (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                    <div className="space-y-1">
                      <p className="text-xl font-semibold text-green-600">Payment Successful!</p>
                      <p className="text-sm text-muted-foreground">
                        Transaction ID: {tapToPayResponse.yipyyTransactionId}
                      </p>
                    </div>
                  </div>

                  {/* Receipt Options */}
                  <div className="space-y-2">
                    <Label>Receipt Delivery</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          window.print();
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={!customerEmail}
                        onClick={() => {
                          // TODO: Send email receipt
                          alert("Receipt sent via email");
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={!customerEmail}
                        onClick={() => {
                          // TODO: Send SMS receipt
                          alert("Receipt sent via SMS");
                        }}
                      >
                        <Phone className="h-4 w-4" />
                        SMS
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setIsTapToPayModalOpen(false);
                          setIsReceiptModalOpen(true);
                        }}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsTapToPayModalOpen(false);
                      setIsReceiptModalOpen(true);
                    }}
                  >
                    Done
                  </Button>
                </div>
              );
            }

            // Failed state
            if (tapToPayStatus === "failed") {
              return (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <div className="space-y-1">
                      <p className="text-xl font-semibold text-destructive">Payment Failed</p>
                      <p className="text-sm text-muted-foreground">{tapToPayError}</p>
                    </div>
                  </div>

                  {/* Retry Options */}
                  <div className="space-y-2">
                    <Label>Retry Options</Label>
                    <div className="grid gap-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={async () => {
                          setTapToPayStatus("idle");
                          setTapToPayError(null);
                          // Retry will be handled by the idle state logic
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry Tap to Pay
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setIsTapToPayModalOpen(false);
                          setUseYipyyPay(false);
                          setUseCloverTerminal(true);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        Switch to Clover Terminal
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setIsTapToPayModalOpen(false);
                          setUseYipyyPay(false);
                          setPaymentForm({ ...paymentForm, method: "cash" });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <Banknote className="h-4 w-4" />
                        Switch to Cash
                      </Button>
                      {selectedClientId && selectedClientId !== "__walk_in__" && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            setIsTapToPayModalOpen(false);
                            setUseYipyyPay(false);
                            setPaymentForm({ ...paymentForm, method: "store_credit" });
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                          Switch to Store Credit
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsTapToPayModalOpen(false);
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    Back to Payment
                  </Button>
                </div>
              );
            }

            return null;
          })()}
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
