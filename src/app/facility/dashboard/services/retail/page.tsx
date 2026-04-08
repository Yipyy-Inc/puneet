"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { invoiceHeaderHtml } from "@/lib/invoice-header";
import { VariantSelector } from "@/components/retail/VariantSelector";
import { useHardwareBarcodeScanner } from "@/hooks/use-hardware-barcode-scanner";

const CameraScanner = dynamic(
  () =>
    import("@/components/retail/CameraScanner").then((m) => m.CameraScanner),
  { ssr: false },
);
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ShoppingCart,
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
  Pause,
  ChevronDown,
  Camera,
  ScanLine,
  Package,
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
  getStoreCreditBalance,
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
import { giftCards } from "@/data/payments";
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
  type YipyyPayResponse,
} from "@/lib/yipyy-pay-service";
import { isDeviceReadyForTapToPay } from "@/lib/device-detection";
import { logPaymentAction } from "@/lib/payment-audit";

interface CartItemWithId extends CartItem {
  id: string;
  imageUrl?: string;
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const { role: facilityRole } = useFacilityRole();
  const currentUserId = getCurrentUserId();
  const canApplyDiscount = hasPermission(
    facilityRole,
    "apply_discount",
    currentUserId || undefined,
  );
  const isManager = facilityRole === "manager" || facilityRole === "owner";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedScanRef = useRef({ code: "", at: 0 });
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<CartItemWithId[]>([]);
  const [heldSales, setHeldSales] = useState<
    { id: number; items: CartItemWithId[]; heldAt: string; label: string }[]
  >([]);
  const [cameraOpen, setCameraOpen] = useState(false);
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
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");

  // Discount states
  const [cartDiscount, setCartDiscount] = useState<CartDiscount | null>(null);
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(
    null,
  );
  const [accountDiscount, setAccountDiscount] =
    useState<AccountDiscount | null>(null);

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
    chargeType:
      | "pay_now"
      | "add_to_booking"
      | "charge_to_account"
      | "charge_to_active_stay";
    selectedBookingId: number | null;
  }>({
    method: "cash",
    splitPayments: false,
    payments: [{ method: "cash", amount: 0 }],
    chargeType: "pay_now",
    selectedBookingId: null,
  });
  const [isBookingSelectModalOpen, setIsBookingSelectModalOpen] =
    useState(false);

  // Fiserv payment state
  const [selectedTokenizedCard, setSelectedTokenizedCard] =
    useState<TokenizedCard | null>(null);
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
  const [selectedGiftCard, setSelectedGiftCard] = useState<{
    id: string;
    balance: number;
    code: string;
  } | null>(null);
  const [storeCreditAmount, setStoreCreditAmount] = useState<number>(0);

  // Tap to Pay modal state
  const [isTapToPayModalOpen, setIsTapToPayModalOpen] = useState(false);
  const [tapToPayStatus, setTapToPayStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");
  const [tapToPayError, setTapToPayError] = useState<string | null>(null);
  const [tapToPayResponse, setTapToPayResponse] =
    useState<YipyyPayResponse | null>(null);

  const stats = getRetailStats();

  // Calculate subtotal (before any discounts)
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  // Calculate line item discounts
  const lineItemDiscountTotal = cart.reduce(
    (sum, item) => sum + item.discount,
    0,
  );

  // Calculate cart-wide discount
  let cartDiscountAmount = 0;
  if (cartDiscount) {
    if (cartDiscount.type === "percent") {
      cartDiscountAmount =
        (subtotal - lineItemDiscountTotal) * (cartDiscount.value / 100);
    } else if (cartDiscount.type === "fixed") {
      cartDiscountAmount = Math.min(
        cartDiscount.value,
        subtotal - lineItemDiscountTotal,
      );
    } else if (cartDiscount.type === "promo_code" && appliedPromoCode) {
      if (appliedPromoCode.discountType === "percent") {
        const maxDiscount = appliedPromoCode.maxDiscount || Infinity;
        cartDiscountAmount = Math.min(
          (subtotal - lineItemDiscountTotal) *
            (appliedPromoCode.discountValue / 100),
          maxDiscount,
        );
      } else {
        cartDiscountAmount = Math.min(
          appliedPromoCode.discountValue,
          subtotal - lineItemDiscountTotal,
        );
      }
    } else if (cartDiscount.type === "account_discount" && accountDiscount) {
      if (
        accountDiscount.applicableTo === "products" ||
        accountDiscount.applicableTo === "all" ||
        accountDiscount.applicableTo === "both"
      ) {
        if (accountDiscount.discountType === "percent") {
          cartDiscountAmount =
            (subtotal - lineItemDiscountTotal) *
            (accountDiscount.discountValue / 100);
        } else {
          cartDiscountAmount = Math.min(
            accountDiscount.discountValue,
            subtotal - lineItemDiscountTotal,
          );
        }
      }
    }
  }

  // Apply account discount automatically if available and no other cart discount
  if (
    !cartDiscount &&
    accountDiscount &&
    selectedClientId &&
    selectedClientId !== "__walk_in__"
  ) {
    if (
      accountDiscount.applicableTo === "products" ||
      accountDiscount.applicableTo === "all" ||
      accountDiscount.applicableTo === "both"
    ) {
      if (accountDiscount.discountType === "percent") {
        cartDiscountAmount =
          (subtotal - lineItemDiscountTotal) *
          (accountDiscount.discountValue / 100);
      } else {
        cartDiscountAmount = Math.min(
          accountDiscount.discountValue,
          subtotal - lineItemDiscountTotal,
        );
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
  const serviceTipsConfig: Record<
    string,
    { enabled: boolean; percentages: number[] }
  > = {
    grooming: { enabled: true, percentages: [15, 18, 20, 25] },
    training: { enabled: false, percentages: [15, 18, 20] },
    daycare: { enabled: true, percentages: [10, 15, 20] },
    boarding: { enabled: true, percentages: [10, 15, 20] },
    retail: { enabled: false, percentages: [15, 18, 20, 25] },
    other: { enabled: true, percentages: [15, 18, 20, 25] },
  };

  const tipsConfig =
    serviceTipsConfig[detectedServiceType] || defaultTipsConfig;

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
        itemType: "product",
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
        imageUrl: product.imageUrl,
      };
      setCart([...cart, newItem]);
    }

    // Low stock warning
    const stock = isVariant ? (item as ProductVariant).stock : product.stock;
    const minStock = isVariant
      ? (item as ProductVariant).minStock
      : product.minStock;
    if (stock != null && minStock != null && stock <= minStock) {
      toast.warning(`Low stock: ${product.name} — only ${stock} left`, {
        duration: 4000,
      });
    }

    // Track recent products
    if (product) {
      setRecentProducts((prev) => {
        const filtered = prev.filter((p) => p.id !== product.id);
        return [product, ...filtered].slice(0, 5);
      });
    }
  };

  // Plays a short confirmation beep via Web Audio API (no asset needed)
  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1800;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext may be blocked before user gesture — silently ignore
    }
  };

  // Central scan handler — used by camera scanner AND hardware scanner hook
  const handleScan = useCallback(
    (code: string) => {
      setCameraOpen(false);
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      if (
        trimmed === lastProcessedScanRef.current.code &&
        now - lastProcessedScanRef.current.at < 300
      ) {
        return;
      }
      lastProcessedScanRef.current = { code: trimmed, at: now };

      const found = getProductByBarcode(trimmed);

      if (found) {
        const isVariant = "variantType" in found;
        if (!isVariant) {
          const product = found as Product;
          if (product.hasVariants && product.variants.length > 0) {
            // Base-product barcode on a multi-variant item → pick a variant
            setVariantProduct(product);
          } else {
            addToCart(found);
            playBeep();
            navigator.vibrate?.(50);
            toast.success(`Added: ${product.name}`);
          }
        } else {
          // Specific variant barcode — add straight to cart
          addToCart(found);
          playBeep();
          navigator.vibrate?.(50);
          const parentProduct = products.find((p) =>
            p.variants.some((v) => v.id === (found as ProductVariant).id),
          );
          toast.success(
            `Added: ${parentProduct?.name ?? ""} — ${(found as ProductVariant).name}`,
          );
        }
        setBarcodeInput("");
      } else {
        // No match — pre-fill the search bar so staff can see it and act
        setBarcodeInput(trimmed);
        toast.error(`No product found for barcode: ${trimmed}`);
      }

      // Re-focus the search bar after dialog animation settles
      setTimeout(() => searchInputRef.current?.focus(), 200);
    },

    [addToCart],
  );

  // Wire up hardware barcode scanner detection (USB/Bluetooth HID)
  useHardwareBarcodeScanner(searchInputRef, handleScan);

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
      alert(
        `Minimum purchase of $${promo.minPurchase} required for this promo code`,
      );
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

  const _removeCartDiscount = () => {
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
      const facilityId = 11; // TODO: Get from context
      const staffName = "Staff"; // TODO: Get from auth context

      // Check permission for manual card entry if using new card
      if (
        (paymentForm.method === "credit" || paymentForm.method === "debit") &&
        !useCloverTerminal &&
        !useYipyyPay &&
        !selectedTokenizedCard &&
        newCardDetails.number &&
        !hasPermission(
          facilityRole,
          "manual_card_entry",
          currentUserId || undefined,
        )
      ) {
        alert(
          "Manual card entry requires admin/manager permission. Please use a saved card or contact a manager.",
        );
        setIsProcessingPayment(false);
        return;
      }

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
      const petName =
        selectedPetId && selectedClientId && selectedClientId !== "__walk_in__"
          ? clients
              .find((c) => String(c.id) === selectedClientId)
              ?.pets.find((p) => p.id === selectedPetId)?.name
          : undefined;

      // Get booking service if booking is selected
      const booking = selectedBookingId
        ? bookings.find((b) => b.id === selectedBookingId)
        : null;

      const fiservConfig = getFiservConfig(facilityId);

      // Log payment attempt
      logPaymentAction("payment_capture", {
        facilityId,
        staffId: currentUserId || "staff-001",
        staffName,
        staffRole: facilityRole,
        amount: grandTotal,
        paymentMethod: paymentForm.splitPayments ? "split" : paymentForm.method,
        customerId,
        customerName: name,
        notes: `POS transaction - ${cart.length} item(s)`,
        metadata: {
          cartItems: cart.length,
          tipAmount: calculatedTipAmount,
          tipPercentage: tipPercentage,
          isManualEntry:
            !selectedTokenizedCard && newCardDetails.number ? true : false,
        },
      });

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
        const paymentErrors: string[] = [];

        // Process each payment in the split
        for (let i = 0; i < paymentForm.payments.length; i++) {
          const payment = paymentForm.payments[i];

          try {
            // Process Pay with iPhone
            if (
              (payment.method === "credit" || payment.method === "debit") &&
              payment.useYipyyPay &&
              payment.yipyyPayDeviceId
            ) {
              const device = getYipyyPayDevice(
                facilityId,
                payment.yipyyPayDeviceId,
              );

              if (!device || !device.isAuthorized || !device.isActive) {
                paymentErrors.push(
                  `Payment ${i + 1} (iPhone): Device not available`,
                );
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
                processedById: currentUserId
                  ? Number(currentUserId)
                  : undefined,
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
                paymentErrors.push(
                  `Payment ${i + 1} (iPhone): ${yipyyPayResponse.error?.message || "Failed"}`,
                );
                allPaymentsSuccessful = false;
              }
            }
            // Process Clover Terminal
            else if (
              (payment.method === "credit" || payment.method === "debit") &&
              payment.useCloverTerminal &&
              payment.cloverTerminalId
            ) {
              const terminal = getCloverTerminal(
                facilityId,
                payment.cloverTerminalId,
              );

              if (!terminal || !terminal.isOnline) {
                paymentErrors.push(
                  `Payment ${i + 1} (Clover): Terminal not available`,
                );
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
                printReceipt:
                  fiservConfig?.cloverTerminal?.autoPrintReceipts ?? true,
                printCustomerCopy: true,
                printMerchantCopy: true,
              };

              const cloverResponse = await processCloverPayment(cloverRequest);

              if (cloverResponse.success) {
                processedPayments.push({
                  method: payment.method,
                  amount: payment.amount,
                  cloverTransactionId: cloverResponse.cloverTransactionId,
                  fiservTransactionId: cloverResponse.transactionId, // Clover transaction ID is used as Fiserv transaction ID
                  notes: `Clover Terminal (${terminal.terminalName})`,
                });
              } else {
                paymentErrors.push(
                  `Payment ${i + 1} (Clover): ${cloverResponse.error?.message || "Failed"}`,
                );
                allPaymentsSuccessful = false;
              }
            }
            // Process Fiserv (web card payment)
            else if (
              (payment.method === "credit" || payment.method === "debit") &&
              !payment.useYipyyPay &&
              !payment.useCloverTerminal
            ) {
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
                newCard:
                  paymentSource === "new_card" && newCardDetails.number
                    ? {
                        number: newCardDetails.number.replace(/\s/g, ""),
                        expMonth: parseInt(newCardDetails.expMonth, 10),
                        expYear: parseInt(newCardDetails.expYear, 10),
                        cvv: newCardDetails.cvv,
                        cardholderName:
                          newCardDetails.cardholderName || name || "Customer",
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
                paymentErrors.push(
                  `Payment ${i + 1} (Card): ${fiservResponse.error?.message || "Failed"}`,
                );
                allPaymentsSuccessful = false;
              }
            }
            // Process Cash, Store Credit, Gift Card (no processing needed, just record)
            else {
              processedPayments.push({
                method: payment.method,
                amount: payment.amount,
                notes:
                  payment.method === "cash"
                    ? "Cash"
                    : payment.method === "store_credit"
                      ? "Store Credit"
                      : "Gift Card",
              });
            }
          } catch (error) {
            paymentErrors.push(
              `Payment ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
            allPaymentsSuccessful = false;
          }
        }

        if (!allPaymentsSuccessful) {
          alert(
            `Some payments failed:\n${paymentErrors.join("\n")}\n\nPlease retry or use a different payment method.`,
          );
          setIsProcessingPayment(false);
          return;
        }

        // All payments successful - record transaction
        const paymentNotes = processedPayments
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.notes || p.method}: $${p.amount.toFixed(2)}`,
          )
          .join(" | ");

        addRetailTransaction({
          items: cart.map(({ id: _id, ...item }) => item),
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
          payments: processedPayments.map((p) => ({
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
          yipyyPayTransactionId: processedPayments.find(
            (p) => p.yipyyPayTransactionId,
          )?.yipyyPayTransactionId,
          cloverTransactionId: processedPayments.find(
            (p) => p.cloverTransactionId,
          )?.cloverTransactionId,
          fiservTransactionId: processedPayments.find(
            (p) => p.fiservTransactionId,
          )?.fiservTransactionId,
          locationId: "loc-001", // TODO: Get from context
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
          alert(
            "Clover terminal is not available or offline. Please use another payment method.",
          );
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
          alert(
            `Payment failed: ${cloverResponse.error?.message || "Unknown error"}`,
          );
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Clover details
        addRetailTransaction({
          items: cart.map(({ id: _id, ...item }) => item),
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
          fiservTransactionId: cloverResponse.transactionId, // Clover transaction ID is used as Fiserv transaction ID
          locationId: "loc-001", // TODO: Get from context
        });
      }
      // Process payment via Yipyy Pay / Tap to Pay on iPhone
      else if (
        useYipyyPay &&
        yipyyPayDeviceId &&
        fiservConfig?.yipyyPay?.enabled &&
        (paymentForm.method === "credit" || paymentForm.method === "debit")
      ) {
        const _yipyyPayConfig = getYipyyPayConfig(facilityId);
        const device = getYipyyPayDevice(facilityId, yipyyPayDeviceId);

        if (!device || !device.isAuthorized || !device.isActive) {
          alert(
            "Yipyy Pay device is not available or not authorized. Please use another payment method.",
          );
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
          alert(
            `Payment failed: ${yipyyPayResponse.error?.message || "Unknown error"}`,
          );
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Yipyy Pay details
        addRetailTransaction({
          items: cart.map(({ id: _id, ...item }) => item),
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
          locationId: "loc-001", // TODO: Get from context
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
          const defaultCard = getDefaultTokenizedCard(
            facilityId,
            Number(customerId),
          );
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
          newCard:
            paymentSource === "new_card" && newCardDetails.number
              ? {
                  number: newCardDetails.number.replace(/\s/g, ""),
                  expMonth: parseInt(newCardDetails.expMonth, 10),
                  expYear: parseInt(newCardDetails.expYear, 10),
                  cvv: newCardDetails.cvv,
                  cardholderName:
                    newCardDetails.cardholderName || name || "Customer",
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
          alert(
            `Payment failed: ${fiservResponse.error?.message || "Unknown error"}`,
          );
          setIsProcessingPayment(false);
          return;
        }

        // Payment successful - record transaction with Fiserv details
        addRetailTransaction({
          items: cart.map(({ id: _id, ...item }) => item),
          subtotal,
          discountTotal,
          cartDiscount: cartDiscount || undefined,
          promoCodeUsed: appliedPromoCode?.code || undefined,
          accountDiscountApplied: accountDiscount?.id || undefined,
          taxTotal,
          tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
          tipPercentage: tipPercentage || undefined,
          total: grandTotal,
          paymentMethod: paymentForm.splitPayments
            ? "split"
            : paymentForm.method,
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
          locationId: "loc-001", // TODO: Get from context
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
            alert(
              `Store credit applied: $${storeCreditAmount.toFixed(2)}. Remaining amount: $${finalAmount.toFixed(2)} needs to be paid with another method.`,
            );
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
            alert(
              `Gift card applied: $${giftCardAmount.toFixed(2)}. Remaining amount: $${finalAmount.toFixed(2)} needs to be paid with another method.`,
            );
            setIsProcessingPayment(false);
            return;
          }
        }

        // Non-card payment or Fiserv not enabled - process normally
        addRetailTransaction({
          items: cart.map(({ id: _id, ...item }) => item),
          subtotal,
          discountTotal,
          cartDiscount: cartDiscount || undefined,
          promoCodeUsed: appliedPromoCode?.code || undefined,
          accountDiscountApplied: accountDiscount?.id || undefined,
          taxTotal,
          tipAmount: calculatedTipAmount > 0 ? calculatedTipAmount : undefined,
          tipPercentage: tipPercentage || undefined,
          total: finalAmount > 0 ? finalAmount : grandTotal,
          paymentMethod: paymentForm.splitPayments
            ? "split"
            : paymentForm.method,
          payments: paymentForm.splitPayments
            ? paymentForm.payments
            : [
                {
                  method: paymentForm.method,
                  amount: finalAmount > 0 ? finalAmount : grandTotal,
                },
              ],
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
          locationId: "loc-001", // TODO: Get from context
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
      alert(
        "An error occurred while processing the payment. Please try again.",
      );
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
      if (
        client.pets?.some((pet) => pet.name.toLowerCase().includes(lowerQuery))
      )
        return true;
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

    return bookings
      .filter((booking) => {
        if (booking.clientId !== clientIdNum) return false;
        // If pet is selected, filter by pet
        if (selectedPetId && booking.petId !== selectedPetId) return false;
        // Only show active/upcoming bookings (exclude completed and cancelled)
        return booking.status === "pending" || booking.status === "confirmed";
      })
      .sort((a, b) => {
        // Sort by start date, most recent first
        return (
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
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

    return bookings
      .filter((booking) => {
        if (booking.clientId !== clientIdNum) return false;
        if (selectedPetId && booking.petId !== selectedPetId) return false;
        // Show confirmed and pending bookings (can add items to these)
        return booking.status === "confirmed" || booking.status === "pending";
      })
      .sort((a, b) => {
        return (
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Side - Product Search & Selection */}
      <div className="space-y-4 lg:col-span-2">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              window.location.href =
                "/facility/dashboard/services/retail/orders";
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Sales
              </CardTitle>
              <DollarSign className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.todayRevenue.toFixed(2)}
              </div>
              <p className="text-muted-foreground text-xs">
                {stats.todayTransactions} transactions
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              window.location.href =
                "/facility/dashboard/services/retail/orders";
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              <ShoppingCart className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayItems}</div>
              <p className="text-muted-foreground text-xs">Today</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              window.location.href =
                "/facility/dashboard/services/retail/inventory";
            }}
          >
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
              <p className="text-muted-foreground text-xs">
                Items need restock
              </p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              window.location.href =
                "/facility/dashboard/services/retail/inventory";
            }}
          >
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
              <p className="text-muted-foreground text-xs">Unacknowledged</p>
            </CardContent>
          </Card>
        </div>

        {/* Smart Search Bar — barcode scan + product search in one */}
        <Card>
          <CardContent className="pt-4">
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (barcodeInput.trim()) handleScan(barcodeInput);
                }}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Scan barcode, search product name, or enter SKU..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="h-11 pl-10 text-sm"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1.5 px-3"
                    onClick={() => setCameraOpen(true)}
                  >
                    <Camera className="size-4" />
                    <span className="hidden text-xs sm:inline">Scan</span>
                  </Button>
                </div>
              </form>

              {/* Search results dropdown */}
              {barcodeInput.trim().length >= 2 && (
                <div className="bg-background absolute top-full right-0 left-0 z-50 mt-1 max-h-[280px] overflow-y-auto rounded-lg border shadow-lg">
                  {(() => {
                    const q = barcodeInput.toLowerCase();
                    const results = products.filter(
                      (p) =>
                        p.status === "active" &&
                        (p.name.toLowerCase().includes(q) ||
                          p.sku.toLowerCase().includes(q) ||
                          p.barcode?.includes(barcodeInput) ||
                          p.category.toLowerCase().includes(q)),
                    );
                    if (results.length === 0) {
                      // Detect barcode-like input (digits / alphanumeric, no spaces)
                      const looksLikeBarcode =
                        /^[A-Z0-9\-]{4,}$/i.test(barcodeInput.trim()) &&
                        !barcodeInput.includes(" ");
                      return (
                        <div className="p-4 text-center">
                          <p className="text-muted-foreground text-sm">
                            No products found
                          </p>
                          {looksLikeBarcode && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 gap-1.5 text-xs"
                              onClick={() => {
                                window.open(
                                  `/facility/dashboard/services/retail/products?barcode=${encodeURIComponent(barcodeInput.trim())}`,
                                  "_blank",
                                );
                              }}
                            >
                              <Plus className="size-3" />
                              Add new product with this barcode
                            </Button>
                          )}
                        </div>
                      );
                    }
                    return results.slice(0, 8).map((product) => (
                      <button
                        key={product.id}
                        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                        onClick={() => {
                          setBarcodeInput("");
                          if (
                            product.hasVariants &&
                            product.variants &&
                            product.variants.length > 0
                          ) {
                            setVariantProduct(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                      >
                        {/* Product image */}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="size-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                            <Package className="text-muted-foreground/30 size-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            SKU: {product.sku}
                            {product.category ? ` · ${product.category}` : ""}
                          </p>
                          {product.brand && (
                            <p className="text-muted-foreground/70 text-[10px]">
                              {product.brand}
                            </p>
                          )}
                          {product.hasVariants &&
                            product.variants &&
                            product.variants.length > 0 && (
                              <p className="mt-0.5 text-[10px] text-blue-600">
                                {product.variants.length} variants:{" "}
                                {product.variants
                                  .slice(0, 3)
                                  .map((v) => v.name)
                                  .join(", ")}
                                {product.variants.length > 3 &&
                                  ` +${product.variants.length - 3} more`}
                              </p>
                            )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-[tabular-nums] text-sm font-semibold">
                            ${product.basePrice.toFixed(2)}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] font-medium",
                              (product.stock ?? 0) <= (product.minStock ?? 5)
                                ? "text-red-600"
                                : "text-emerald-600",
                            )}
                          >
                            {(product.stock ?? 0) <= (product.minStock ?? 5)
                              ? "Low stock"
                              : `${product.stock ?? 0} in stock`}
                          </p>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recently Added */}
        {recentProducts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground size-4" />
                Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentProducts.map((product) => (
                  <button
                    key={product.id}
                    className="hover:border-primary/40 bg-background flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 transition-all hover:shadow-sm"
                    onClick={() => {
                      if (product.hasVariants && product.variants.length > 0) {
                        setVariantProduct(product);
                      } else {
                        addToCart(product);
                      }
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-9 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                        <Package className="text-muted-foreground/30 size-4" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="max-w-[120px] truncate text-xs font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground font-[tabular-nums] text-[10px]">
                        ${product.basePrice.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Product Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Add</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider delayDuration={300}>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {products.slice(0, 8).map((product) => (
                  <Tooltip key={product.id}>
                    <TooltipTrigger asChild>
                      <button
                        className="hover:border-primary/40 bg-background flex flex-col items-center rounded-xl border p-3 transition-all hover:shadow-sm"
                        onClick={() => {
                          if (
                            product.hasVariants &&
                            product.variants.length > 0
                          ) {
                            setVariantProduct(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="mb-2 size-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="bg-muted mb-2 flex size-16 items-center justify-center rounded-lg">
                            <Package className="text-muted-foreground/30 size-6" />
                          </div>
                        )}
                        <span className="w-full truncate text-center text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="text-muted-foreground font-[tabular-nums] text-xs">
                          ${product.basePrice.toFixed(2)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] p-3">
                      <p className="text-xs font-semibold">{product.name}</p>
                      {product.description && (
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          SKU: {product.sku}
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            (product.stock ?? 0) <= (product.minStock ?? 5)
                              ? "text-red-600"
                              : "text-emerald-600",
                          )}
                        >
                          {product.stock ?? 0} in stock
                        </span>
                      </div>
                      {product.hasVariants && product.variants.length > 0 && (
                        <p className="mt-1 text-[10px] text-blue-600">
                          {product.variants.length} variant
                          {product.variants.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Collapsible>
          <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition-colors">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="text-muted-foreground size-4" />
              Recent Sales
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                5
              </span>
            </span>
            <ChevronDown className="text-muted-foreground size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5">
              {[
                {
                  id: "TXN-001",
                  time: "2:30 PM",
                  items: 3,
                  total: 87.45,
                  method: "Card",
                },
                {
                  id: "TXN-002",
                  time: "1:15 PM",
                  items: 1,
                  total: 24.99,
                  method: "Cash",
                },
                {
                  id: "TXN-003",
                  time: "11:40 AM",
                  items: 5,
                  total: 142.5,
                  method: "Card",
                },
                {
                  id: "TXN-004",
                  time: "10:20 AM",
                  items: 2,
                  total: 36.98,
                  method: "E-Transfer",
                },
                {
                  id: "TXN-005",
                  time: "9:05 AM",
                  items: 1,
                  total: 54.99,
                  method: "Card",
                },
              ].map((txn) => (
                <div
                  key={txn.id}
                  className="bg-background flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{txn.id}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {txn.time} · {txn.items} item{txn.items !== 1 ? "s" : ""}{" "}
                      · {txn.method}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-[tabular-nums] text-sm font-semibold">
                      ${txn.total.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        toast.success(`Reprinting receipt ${txn.id}`)
                      }
                    >
                      <Printer className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Right Side - Cart (Invoice Panel Style) */}
      <div className="space-y-4">
        <Card className="flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <ShoppingCart className="size-3.5" />
                Cart
                {cart.length > 0 && (
                  <span className="text-muted-foreground font-normal normal-case">
                    — {cart.reduce((s, i) => s + i.quantity, 0)} item
                    {cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                {heldSales.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => {
                      const sale = heldSales[0];
                      setCart(sale.items);
                      setHeldSales((prev) =>
                        prev.filter((s) => s.id !== sale.id),
                      );
                      toast.success(`Resumed: ${sale.label}`);
                    }}
                  >
                    <RotateCcw className="size-3" />
                    Resume ({heldSales.length})
                  </Button>
                )}
                {cart.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => {
                        setHeldSales((prev) => [
                          ...prev,
                          {
                            id: Date.now(),
                            items: [...cart],
                            heldAt: new Date().toISOString(),
                            label: `${cart.length} item${cart.length !== 1 ? "s" : ""} · $${cart.reduce((s, i) => s + i.total, 0).toFixed(2)}`,
                          },
                        ]);
                        setCart([]);
                        toast.success("Sale parked — start a new one");
                      }}
                    >
                      <Pause className="size-3" />
                      Hold
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCart([])}
                      className="text-destructive h-7 text-[11px]"
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4">
            {/* Customer Link */}
            <div className="bg-muted/10 mb-4 shrink-0 space-y-2 rounded-lg border border-dashed p-3">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <LinkIcon className="size-3.5" />
                Customer
              </Label>

              {/* Selected Customer */}
              {selectedClientId && selectedClientId !== "__walk_in__" ? (
                <div className="space-y-2">
                  <div className="bg-background flex items-center gap-2 rounded-sm border p-2">
                    <User className="text-muted-foreground size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {customerName}
                      </p>
                      {customerEmail && (
                        <p className="text-muted-foreground truncate text-xs">
                          {customerEmail}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => {
                        setSelectedClientId("");
                        setCustomerName("");
                        setCustomerEmail("");
                        setSelectedPetId(null);
                        setSelectedBookingId(null);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>

                  {/* Selected Pet */}
                  {selectedPetId && (
                    <div className="bg-background flex items-center gap-2 rounded-sm border p-2">
                      <PawPrint className="text-muted-foreground size-4" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {clientPets.find((p) => p.id === selectedPetId)
                            ?.name || "Pet"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {clientPets.find((p) => p.id === selectedPetId)?.type}{" "}
                          •{" "}
                          {
                            clientPets.find((p) => p.id === selectedPetId)
                              ?.breed
                          }
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setSelectedPetId(null)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}

                  {/* Selected Booking */}
                  {selectedBookingId && (
                    <div className="bg-background flex items-center gap-2 rounded-sm border p-2">
                      <Calendar className="text-muted-foreground size-4" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {clientBookings.find(
                            (b) => b.id === selectedBookingId,
                          )?.service || "Booking"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {(() => {
                            const booking = clientBookings.find(
                              (b) => b.id === selectedBookingId,
                            );
                            if (!booking) return "";
                            return `${booking.startDate}${booking.endDate !== booking.startDate ? ` - ${booking.endDate}` : ""}`;
                          })()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setSelectedBookingId(null)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}

                  {/* Quick Add Pet/Booking */}
                  {!selectedPetId && clientPets.length > 0 && (
                    <Select
                      value={selectedPetId?.toString() || "__none__"}
                      onValueChange={(value) =>
                        setSelectedPetId(
                          value && value !== "__none__"
                            ? parseInt(value)
                            : null,
                        )
                      }
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
                      onValueChange={(value) =>
                        setSelectedBookingId(
                          value && value !== "__none__"
                            ? parseInt(value)
                            : null,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Apply to booking/stay (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No booking</SelectItem>
                        {clientBookings.map((booking) => (
                          <SelectItem
                            key={booking.id}
                            value={booking.id.toString()}
                          >
                            {booking.service} • {booking.startDate}
                            {booking.petId && (
                              <>
                                {" "}
                                •{" "}
                                {
                                  clientPets.find((p) => p.id === booking.petId)
                                    ?.name
                                }
                              </>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search customer by name or email..."
                    className="h-8 pl-8 text-xs"
                    onClick={() => setIsLinkModalOpen(true)}
                    readOnly
                  />
                </div>
              )}

              {selectedClientId && selectedClientId !== "__walk_in__" && (
                <p className="text-muted-foreground text-xs">
                  Purchase will appear in customer file and invoice correctly
                </p>
              )}
            </div>

            <Separator className="mb-3 shrink-0" />

            {/* Line Items */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <ShoppingCart className="text-muted-foreground/20 size-10" />
                <p className="text-muted-foreground mt-2 text-sm">
                  Cart is empty
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  Scan a barcode or search to add items
                </p>
              </div>
            ) : (
              <ScrollArea className="min-h-[150px] flex-1">
                <div className="divide-y pr-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-3 py-3 first:pt-0"
                    >
                      {/* Thumbnail */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="size-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <ShoppingCart className="text-muted-foreground/30 size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm/tight font-medium">
                          {item.productName}
                          {item.variantName && (
                            <span className="text-muted-foreground ml-1 text-xs font-normal">
                              — {item.variantName}
                            </span>
                          )}
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground ml-1 font-normal">
                              ×{item.quantity}
                            </span>
                          )}
                        </p>
                        {false && item.variantName && (
                          <p className="text-muted-foreground text-xs">
                            {item.variantName}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          ${item.unitPrice.toFixed(2)} each
                        </p>
                        {item.discount > 0 && (
                          <span className="text-xs font-medium text-emerald-600">
                            -${item.discount.toFixed(2)} discount
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!Number.isNaN(val) && val > 0) {
                              updateQuantity(item.id, val);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className="focus:border-primary h-6 w-8 rounded-sm border bg-transparent text-center text-sm font-medium focus:outline-none"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${item.total.toFixed(2)}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {canApplyDiscount && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5"
                                onClick={() => {
                                  setSelectedCartItem(item.id);
                                  setIsDiscountModalOpen(true);
                                }}
                                title="Apply Discount"
                              >
                                <Percent className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5 text-blue-600"
                                onClick={() => openEditPriceModal(item.id)}
                                title="Edit Price / Discount"
                              >
                                <DollarSign className="size-3" />
                              </Button>
                            </>
                          )}
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5 text-green-600"
                              onClick={() => {
                                setSelectedCartItem(item.id);
                                setIsCompItemModalOpen(true);
                              }}
                              title="Comp / Free Item"
                            >
                              <Check className="size-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive size-5"
                            onClick={() => removeFromCart(item.id)}
                            title="Remove Item"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Invoice Summary */}
            <div className="mt-4 shrink-0 space-y-1.5 border-t pt-3">
              <div className="flex justify-between py-0.5 text-sm">
                <span className="font-semibold">Subtotal</span>
                <span className="font-[tabular-nums] font-semibold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between py-0.5 text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-[tabular-nums]">
                    -${discountTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {/* Separate tax lines from facility config */}
              {(() => {
                const facility = facilities.find(
                  (f: { id: number }) => f.id === 11,
                );
                const tc = facility?.taxConfig;
                if (tc && tc.showTaxesSeparately && tc.taxes) {
                  const taxableAmount = subtotal - discountTotal;
                  return (
                    tc.taxes as {
                      name: string;
                      rate: number;
                      enabled: boolean;
                    }[]
                  )
                    .filter((t) => t.enabled)
                    .map((t, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between py-0.5 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {t.name} (
                          {(t.rate * 100).toFixed(
                            (t.rate * 100) % 1 === 0 ? 0 : 3,
                          )}
                          %)
                        </span>
                        <span className="font-[tabular-nums]">
                          $
                          {(
                            Math.round(taxableAmount * t.rate * 100) / 100
                          ).toFixed(2)}
                        </span>
                      </div>
                    ));
                }
                // Fallback: single tax line
                if (taxTotal > 0) {
                  return (
                    <div className="flex justify-between py-0.5 text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-[tabular-nums]">
                        ${taxTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Tips Section - Only show if tips are enabled for this service type */}
              {tipsConfig.enabled && subtotal - discountTotal > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Tip</Label>
                      {calculatedTipAmount > 0 && (
                        <span className="text-sm font-medium">
                          ${calculatedTipAmount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Tip Percentage Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {tipsConfig.percentages.map((percent) => (
                        <Button
                          key={percent}
                          variant={
                            tipPercentage === percent ? "default" : "outline"
                          }
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
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-2" />
              <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2.5">
                <span className="text-base font-bold">Total</span>
                <span className="font-[tabular-nums] text-base font-bold">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Available Benefits — only when customer linked */}
              {selectedClientId &&
                selectedClientId !== "__walk_in__" &&
                cart.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Available Benefits
                    </p>
                    <button
                      onClick={() =>
                        toast.success(
                          "Package credit applied — deducted from balance",
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-left transition-all hover:bg-emerald-100"
                    >
                      <div className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-emerald-800">
                          Package Credit
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          Client may have eligible package credits
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-700">
                        Apply →
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        toast.success(
                          "Membership discount auto-applied — 15% off",
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-left transition-all hover:bg-blue-100"
                    >
                      <div className="size-1.5 shrink-0 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-800">
                          Membership Discount
                        </p>
                        <p className="text-[10px] text-blue-600">
                          Check for active membership benefits
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-blue-700">
                        Apply →
                      </span>
                    </button>
                    <p className="text-muted-foreground text-[9px] italic">
                      Order: Package → Membership → Discount → Store Credit →
                      Tax
                    </p>
                  </div>
                )}

              {/* Action buttons — same as booking invoice panel */}
              {cart.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                          >
                            <Percent className="size-3" />
                            Discount
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="start"
                          className="w-52"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-medium">
                              Apply Discount
                            </p>
                            <Input
                              placeholder="Amount or %"
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="Reason (e.g. Loyalty 10%)"
                              className="h-7 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-7 w-full text-xs"
                              onClick={() => toast.success("Discount applied")}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-[10px]"
                        onClick={() => toast.success("Fee added to cart")}
                      >
                        <DollarSign className="size-3" />
                        Add Fee
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                          >
                            <DollarSign className="size-3" />
                            Add Tip
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="start"
                          className="w-52"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Add Tip</p>
                            <div className="flex gap-1.5">
                              {[5, 10, 15, 20].map((amt) => (
                                <button
                                  key={amt}
                                  onClick={() =>
                                    toast.success(`$${amt} tip added`)
                                  }
                                  className="hover:bg-foreground hover:text-background flex-1 rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-all"
                                >
                                  ${amt}
                                </button>
                              ))}
                            </div>
                            <Input
                              placeholder="Custom amount"
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = (e.target as HTMLInputElement)
                                    .value;
                                  if (val) toast.success(`$${val} tip added`);
                                }
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      {selectedClientId &&
                        selectedClientId !== "__walk_in__" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[10px]"
                              onClick={() =>
                                toast.success("Store credit applied")
                              }
                            >
                              Use Store Credit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[10px]"
                              onClick={() =>
                                toast.success(
                                  "Membership discount applied — 15% off",
                                )
                              }
                            >
                              Redeem Membership
                            </Button>
                          </>
                        )}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-3 pt-3">
                {/* Payment Methods */}
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Payment Method
                  </p>
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
                      <Banknote className="size-4" />
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
                      <CreditCard className="size-4" />
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
                    <SplitSquareHorizontal className="size-4" />
                    Split Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={cart.length === 0}
                    onClick={() => {
                      const facility = facilities.find(
                        (f: { id: number }) => f.id === 11,
                      );
                      const w = window.open(
                        "",
                        "_blank",
                        "width=500,height=600",
                      );
                      if (!w) return;
                      const itemsHtml = cart
                        .map(
                          (item) =>
                            `<div class="row"><span>${item.productName}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</span><span>$${item.total.toFixed(2)}</span></div>`,
                        )
                        .join("");
                      w.document
                        .write(`<!DOCTYPE html><html><head><title>Receipt</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}
.row.sub{color:#666}
.badge{background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:8px;text-align:center;margin-top:16px;font-weight:600;font-size:13px}
.footer{margin-top:24px;text-align:center;font-size:10px;color:#999}
@media print{body{padding:20px}}</style></head><body>
${invoiceHeaderHtml(facility)}
<h1 style="font-size:18px;margin:0">Retail Receipt</h1>
<p style="font-size:12px;color:#666;margin:4px 0 20px">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
${itemsHtml}
<div class="row sub"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
${discountTotal > 0 ? `<div class="row sub"><span>Discount</span><span>-$${discountTotal.toFixed(2)}</span></div>` : ""}
${taxTotal > 0 ? `<div class="row sub"><span>Tax</span><span>$${taxTotal.toFixed(2)}</span></div>` : ""}
${calculatedTipAmount > 0 ? `<div class="row sub"><span>Tip</span><span>$${calculatedTipAmount.toFixed(2)}</span></div>` : ""}
<div class="row total"><span>Total</span><span>$${grandTotal.toFixed(2)}</span></div>
<div class="footer">Thank you for your purchase!<br>${facility?.name ?? ""}</div>
<script>window.print()</script>
</body></html>`);
                      w.document.close();
                    }}
                  >
                    <Printer className="size-4" />
                    Print Receipt
                  </Button>
                </div>

                {/* Charge Options - Only show if customer is selected */}
                {selectedClientId && selectedClientId !== "__walk_in__" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Charge Options
                      </p>

                      {/* Add to Booking */}
                      {bookableBookings.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
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
                          <Calendar className="size-4" />
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
                          className="w-full justify-start gap-2"
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
                          <LinkIcon className="size-4" />
                          Charge to Active Stay
                          <Badge variant="secondary" className="ml-auto">
                            {activeStays.length} active
                          </Badge>
                        </Button>
                      )}

                      {/* Charge to Account */}
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled={cart.length === 0}
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            chargeType: "charge_to_account",
                          });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <CreditCard className="size-4" />
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

      {/* Variant Selector */}
      {variantProduct && (
        <VariantSelector
          open={!!variantProduct}
          onOpenChange={(open) => {
            if (!open) setVariantProduct(null);
          }}
          product={variantProduct}
          onAddToCart={(variant, qty) => {
            for (let i = 0; i < qty; i++) {
              addToCart(variant);
            }
            setVariantProduct(null);
          }}
        />
      )}

      {/* Camera Barcode/QR Scanner */}
      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        {/* Full-screen on mobile, centered modal on sm+ */}
        <DialogContent className="flex flex-col gap-0 p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-sm">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="size-5" />
              Scan Barcode or QR Code
            </DialogTitle>
            <DialogDescription>
              Point your camera at a product barcode or QR code
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-5 pb-5">
            {cameraOpen && <CameraScanner onScan={handleScan} />}
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setCameraOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Search Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Browse Products</DialogTitle>
            <DialogDescription>
              Search and select products to add to cart
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="mt-4 h-[400px]">
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-muted-foreground text-sm">
                        {product.category} • SKU: {product.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${product.basePrice.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-xs">
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
      <Dialog
        open={isCartDiscountModalOpen}
        onOpenChange={setIsCartDiscountModalOpen}
      >
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
      <Dialog
        open={isPromoCodeModalOpen}
        onOpenChange={setIsPromoCodeModalOpen}
      >
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
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-900">
                  Promo Code Applied: {appliedPromoCode.code}
                </p>
                <p className="mt-1 text-xs text-green-700">
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
        <Dialog
          open={isCompItemModalOpen}
          onOpenChange={setIsCompItemModalOpen}
        >
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
                  onChange={(e) => setCompItemForm({ reason: e.target.value })}
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
        <Dialog
          open={isEditPriceModalOpen}
          onOpenChange={setIsEditPriceModalOpen}
        >
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
                  max={
                    editPriceForm.discountType === "percent" ? 100 : undefined
                  }
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
                <div className="bg-muted space-y-1 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>
                      $
                      {(
                        editPriceForm.unitPrice *
                        (cart.find((i) => i.id === selectedCartItem)
                          ?.quantity || 1)
                      ).toFixed(2)}
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
                                (cart.find((i) => i.id === selectedCartItem)
                                  ?.quantity || 1) *
                                editPriceForm.discount) /
                              100
                            ).toFixed(2)
                          : editPriceForm.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>Total:</span>
                    <span>
                      $
                      {(
                        editPriceForm.unitPrice *
                          (cart.find((i) => i.id === selectedCartItem)
                            ?.quantity || 1) -
                        (editPriceForm.discountType === "percent"
                          ? (editPriceForm.unitPrice *
                              (cart.find((i) => i.id === selectedCartItem)
                                ?.quantity || 1) *
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
      <Dialog
        open={isBookingSelectModalOpen}
        onOpenChange={setIsBookingSelectModalOpen}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl">
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
                      className="hover:bg-muted/50 cursor-pointer rounded-lg border p-4 transition-colors"
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
                          <p className="mt-2 font-medium">
                            {pet?.name || "Pet"} • {booking.serviceType}
                          </p>
                          <div className="text-muted-foreground mt-1 space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {booking.startDate}
                              {booking.endDate !== booking.startDate &&
                                ` - ${booking.endDate}`}
                            </div>
                            {booking.checkInTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="size-3" />
                                Check-in: {booking.checkInTime}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <DollarSign className="size-3" />
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
              <div className="text-muted-foreground py-8 text-center">
                <Calendar className="mx-auto mb-4 size-12 opacity-50" />
                <p>No bookings available</p>
                <p className="mt-1 text-sm">
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
              {paymentForm.chargeType === "add_to_booking" &&
              paymentForm.selectedBookingId ? (
                <>
                  Items will be added to booking #
                  {paymentForm.selectedBookingId}
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
            {paymentForm.chargeType === "add_to_booking" &&
              paymentForm.selectedBookingId && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium">Adding to Booking</p>
                  {(() => {
                    const booking = bookings.find(
                      (b) => b.id === paymentForm.selectedBookingId,
                    );
                    const pet = booking
                      ? clientPets.find((p) => p.id === booking.petId)
                      : null;
                    return booking ? (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {booking.service} • {pet?.name} • {booking.startDate}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

            {/* Show active stay info if charging to active stay */}
            {paymentForm.chargeType === "charge_to_active_stay" &&
              paymentForm.selectedBookingId && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium">Charging to Active Stay</p>
                  {(() => {
                    const stay = activeStays.find(
                      (s) => s.id === paymentForm.selectedBookingId,
                    );
                    const pet = stay
                      ? clientPets.find((p) => p.id === stay.petId)
                      : null;
                    return stay ? (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {stay.service} • {pet?.name} • Checked in
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

            {/* Show account info if charging to account */}
            {paymentForm.chargeType === "charge_to_account" && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm font-medium">Charging to Account</p>
                <div className="text-muted-foreground mt-1 text-xs">
                  {customerName} • Card on file will be charged
                </div>
              </div>
            )}

            {/* Payment method selection - only show for "pay_now" */}
            {paymentForm.chargeType === "pay_now" &&
            paymentForm.splitPayments ? (
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
                    <Plus className="mr-1 size-4" />
                    Add Payment
                  </Button>
                </div>

                {paymentForm.payments.map((payment, index) => {
                  const facilityId = 11; // TODO: Get from context
                  const fiservConfig = getFiservConfig(facilityId);
                  const inPersonMethods = fiservConfig?.inPersonMethods;
                  const isLastPayment =
                    index === paymentForm.payments.length - 1;
                  const remainingAmount =
                    grandTotal -
                    paymentForm.payments
                      .slice(0, index)
                      .reduce((sum, p) => sum + p.amount, 0);

                  return (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-end gap-2">
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
                                useYipyyPay:
                                  value === "credit" || value === "debit"
                                    ? newPayments[index].useYipyyPay
                                    : false,
                                useCloverTerminal:
                                  value === "credit" || value === "debit"
                                    ? newPayments[index].useCloverTerminal
                                    : false,
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
                                    <Banknote className="size-4" />
                                    <span>Cash</span>
                                  </div>
                                </SelectItem>
                              )}
                              {(inPersonMethods?.cloverTerminal ||
                                inPersonMethods?.payWithiPhone ||
                                fiservConfig?.enabledPaymentMethods.card) && (
                                <>
                                  <SelectItem value="credit">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="size-4" />
                                      <span>Credit Card</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="debit">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="size-4" />
                                      <span>Debit Card</span>
                                    </div>
                                  </SelectItem>
                                </>
                              )}
                              {inPersonMethods?.storeCredit !== false && (
                                <SelectItem value="store_credit">
                                  <div className="flex items-center gap-2">
                                    <Wallet className="size-4" />
                                    <span>Store Credit</span>
                                  </div>
                                </SelectItem>
                              )}
                              {inPersonMethods?.giftCard !== false && (
                                <SelectItem value="gift_card">
                                  <div className="flex items-center gap-2">
                                    <Gift className="size-4" />
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
                                newPayments[index].amount = Math.min(
                                  amount,
                                  remainingAmount,
                                );
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
                                newPayments[index].amount =
                                  grandTotal - totalSoFar;
                                setPaymentForm({
                                  ...paymentForm,
                                  payments: newPayments,
                                });
                              }
                            }}
                          />
                          {isLastPayment && (
                            <div className="mt-1 space-y-1">
                              <p className="text-muted-foreground text-xs">
                                Remaining: ${remainingAmount.toFixed(2)}
                              </p>
                              {(payment.method === "credit" ||
                                payment.method === "debit") &&
                                inPersonMethods?.payWithiPhone && (
                                  <p className="text-xs font-medium text-blue-600">
                                    💡 Final payment can be completed with Pay
                                    with iPhone
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
                                newPayments[newPayments.length - 1].amount =
                                  grandTotal - totalSoFar;
                              }
                              setPaymentForm({
                                ...paymentForm,
                                payments: newPayments,
                              });
                            }}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>

                      {/* Pay with iPhone option for credit/debit */}
                      {(payment.method === "credit" ||
                        payment.method === "debit") &&
                        inPersonMethods?.payWithiPhone && (
                          <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">
                                Pay with iPhone (Tap to Pay)
                              </Label>
                              <Switch
                                checked={payment.useYipyyPay || false}
                                onCheckedChange={(checked) => {
                                  const newPayments = [...paymentForm.payments];
                                  newPayments[index] = {
                                    ...newPayments[index],
                                    useYipyyPay: checked,
                                    useCloverTerminal: checked
                                      ? false
                                      : newPayments[index].useCloverTerminal,
                                  };
                                  if (checked) {
                                    const devices =
                                      getYipyyPayDevicesByFacility(facilityId);
                                    if (devices.length > 0) {
                                      newPayments[index].yipyyPayDeviceId =
                                        devices[0].deviceId;
                                    }
                                  } else {
                                    newPayments[index].yipyyPayDeviceId =
                                      undefined;
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
                                <Label className="text-xs">
                                  Select iPhone Device
                                </Label>
                                <Select
                                  value={payment.yipyyPayDeviceId || ""}
                                  onValueChange={(value) => {
                                    const newPayments = [
                                      ...paymentForm.payments,
                                    ];
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
                                    {getYipyyPayDevicesByFacility(
                                      facilityId,
                                    ).map((device) => (
                                      <SelectItem
                                        key={device.id}
                                        value={device.deviceId}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Smartphone className="size-4" />
                                          <span>{device.deviceName}</span>
                                          {device.isAuthorized ? (
                                            <Badge
                                              variant="default"
                                              className="ml-2"
                                            >
                                              Ready
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="secondary"
                                              className="ml-2"
                                            >
                                              Pending
                                            </Badge>
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
                      {(payment.method === "credit" ||
                        payment.method === "debit") &&
                        !payment.useYipyyPay &&
                        inPersonMethods?.cloverTerminal && (
                          <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">
                                Use Clover Terminal
                              </Label>
                              <Switch
                                checked={payment.useCloverTerminal || false}
                                onCheckedChange={(checked) => {
                                  const newPayments = [...paymentForm.payments];
                                  newPayments[index] = {
                                    ...newPayments[index],
                                    useCloverTerminal: checked,
                                  };
                                  if (checked) {
                                    const terminals =
                                      getCloverTerminalsByFacility(facilityId);
                                    if (terminals.length > 0) {
                                      newPayments[index].cloverTerminalId =
                                        terminals[0].terminalId;
                                    }
                                  } else {
                                    newPayments[index].cloverTerminalId =
                                      undefined;
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
                                <Label className="text-xs">
                                  Select Terminal
                                </Label>
                                <Select
                                  value={payment.cloverTerminalId || ""}
                                  onValueChange={(value) => {
                                    const newPayments = [
                                      ...paymentForm.payments,
                                    ];
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
                                    {getCloverTerminalsByFacility(
                                      facilityId,
                                    ).map((terminal) => (
                                      <SelectItem
                                        key={terminal.terminalId}
                                        value={terminal.terminalId}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Printer className="size-4" />
                                          <span>{terminal.terminalName}</span>
                                          {terminal.isOnline ? (
                                            <Badge
                                              variant="default"
                                              className="ml-2"
                                            >
                                              Online
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="secondary"
                                              className="ml-2"
                                            >
                                              Offline
                                            </Badge>
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
                      {payment.method === "store_credit" &&
                        selectedClientId &&
                        selectedClientId !== "__walk_in__" && (
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-muted-foreground text-xs">
                              Available: $
                              {getStoreCreditBalance(selectedClientId).toFixed(
                                2,
                              )}
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
                  {(() => {
                    const facilityId = 11; // TODO: Get from context
                    const fiservConfig = getFiservConfig(facilityId);
                    const inPersonMethods = fiservConfig?.inPersonMethods;
                    const enabledPaymentMethods =
                      fiservConfig?.enabledPaymentMethods;
                    const cardOnFileEnabled =
                      fiservConfig?.cardOnFileSettings?.enabled !== false;

                    // Check if customer has saved cards
                    const customerId =
                      selectedClientId && selectedClientId !== "__walk_in__"
                        ? parseInt(selectedClientId)
                        : null;
                    const tokenizedCards =
                      customerId && cardOnFileEnabled
                        ? getTokenizedCardsByClient(facilityId, customerId)
                        : [];
                    const hasSavedCards = tokenizedCards.length > 0;

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {/* Card on File */}
                        {cardOnFileEnabled && hasSavedCards && (
                          <Button
                            type="button"
                            variant={
                              paymentForm.method === "credit" &&
                              selectedTokenizedCard
                                ? "default"
                                : "outline"
                            }
                            className="flex h-auto flex-col items-start gap-2 p-4"
                            onClick={() => {
                              setPaymentForm({
                                ...paymentForm,
                                method: "credit",
                                chargeType: "pay_now",
                                selectedBookingId: null,
                              });
                              setUseCloverTerminal(false);
                              setCloverTerminalId(null);
                              setUseYipyyPay(false);
                              setYipyyPayDeviceId(null);
                            }}
                          >
                            <CreditCard className="size-5" />
                            <div className="text-left">
                              <p className="font-medium">Card on File</p>
                              <p className="text-muted-foreground text-xs">
                                Use saved card
                                {selectedTokenizedCard && (
                                  <span className="mt-1 block">
                                    {selectedTokenizedCard.cardBrand} ••••{" "}
                                    {selectedTokenizedCard.cardLast4}
                                  </span>
                                )}
                              </p>
                            </div>
                          </Button>
                        )}

                        {/* Clover Terminal */}
                        {inPersonMethods?.cloverTerminal &&
                          fiservConfig?.cloverTerminal?.enabled && (
                            <Button
                              type="button"
                              variant={
                                paymentForm.method === "credit" &&
                                useCloverTerminal
                                  ? "default"
                                  : "outline"
                              }
                              className="flex h-auto flex-col items-start gap-2 p-4"
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  method: "credit",
                                  chargeType: "pay_now",
                                  selectedBookingId: null,
                                });
                                setUseCloverTerminal(true);
                                setUseYipyyPay(false);
                                setYipyyPayDeviceId(null);
                                setSelectedTokenizedCard(null);
                                // Auto-select first terminal if available
                                const terminals =
                                  getCloverTerminalsByFacility(facilityId);
                                if (terminals.length > 0) {
                                  const defaultTerminalId =
                                    fiservConfig?.cloverTerminal?.terminalId ||
                                    terminals[0].terminalId;
                                  setCloverTerminalId(defaultTerminalId);
                                }
                              }}
                            >
                              <Printer className="size-5" />
                              <div className="text-left">
                                <p className="font-medium">Clover Terminal</p>
                                <p className="text-muted-foreground text-xs">
                                  Tap/Chip/Swipe
                                </p>
                              </div>
                            </Button>
                          )}

                        {/* Cash */}
                        {inPersonMethods?.cash !== false &&
                          enabledPaymentMethods?.cash !== false && (
                            <Button
                              type="button"
                              variant={
                                paymentForm.method === "cash"
                                  ? "default"
                                  : "outline"
                              }
                              className="flex h-auto flex-col items-start gap-2 p-4"
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  method: "cash",
                                  chargeType: "pay_now",
                                  selectedBookingId: null,
                                });
                                setUseCloverTerminal(false);
                                setCloverTerminalId(null);
                                setUseYipyyPay(false);
                                setYipyyPayDeviceId(null);
                                setSelectedTokenizedCard(null);
                              }}
                            >
                              <Banknote className="size-5" />
                              <div className="text-left">
                                <p className="font-medium">Cash</p>
                                <p className="text-muted-foreground text-xs">
                                  Cash payment
                                </p>
                              </div>
                            </Button>
                          )}

                        {/* Store Credit */}
                        {inPersonMethods?.storeCredit !== false &&
                          enabledPaymentMethods?.storeCredit !== false && (
                            <Button
                              type="button"
                              variant={
                                paymentForm.method === "store_credit"
                                  ? "default"
                                  : "outline"
                              }
                              className="flex h-auto flex-col items-start gap-2 p-4"
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  method: "store_credit",
                                  chargeType: "pay_now",
                                  selectedBookingId: null,
                                });
                                setUseCloverTerminal(false);
                                setCloverTerminalId(null);
                                setUseYipyyPay(false);
                                setYipyyPayDeviceId(null);
                                setSelectedTokenizedCard(null);
                              }}
                              disabled={
                                !selectedClientId ||
                                selectedClientId === "__walk_in__"
                              }
                            >
                              <Wallet className="size-5" />
                              <div className="text-left">
                                <p className="font-medium">Store Credit</p>
                                <p className="text-muted-foreground text-xs">
                                  {selectedClientId &&
                                  selectedClientId !== "__walk_in__"
                                    ? `Available: $${getStoreCreditBalance(selectedClientId).toFixed(2)}`
                                    : "Select customer first"}
                                </p>
                              </div>
                            </Button>
                          )}

                        {/* Gift Card */}
                        {inPersonMethods?.giftCard !== false &&
                          enabledPaymentMethods?.giftCard !== false && (
                            <Button
                              type="button"
                              variant={
                                paymentForm.method === "gift_card"
                                  ? "default"
                                  : "outline"
                              }
                              className="flex h-auto flex-col items-start gap-2 p-4"
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  method: "gift_card",
                                  chargeType: "pay_now",
                                  selectedBookingId: null,
                                });
                                setUseCloverTerminal(false);
                                setCloverTerminalId(null);
                                setUseYipyyPay(false);
                                setYipyyPayDeviceId(null);
                                setSelectedTokenizedCard(null);
                              }}
                            >
                              <Gift className="size-5" />
                              <div className="text-left">
                                <p className="font-medium">Gift Card</p>
                                <p className="text-muted-foreground text-xs">
                                  Enter gift card code
                                </p>
                              </div>
                            </Button>
                          )}

                        {/* Pay with iPhone (Tap to Pay) - if enabled and not using Clover */}
                        {inPersonMethods?.payWithiPhone &&
                          fiservConfig?.yipyyPay?.enabled &&
                          !useCloverTerminal && (
                            <Button
                              type="button"
                              variant={
                                paymentForm.method === "credit" && useYipyyPay
                                  ? "default"
                                  : "outline"
                              }
                              className="flex h-auto flex-col items-start gap-2 p-4"
                              onClick={() => {
                                setPaymentForm({
                                  ...paymentForm,
                                  method: "credit",
                                  chargeType: "pay_now",
                                  selectedBookingId: null,
                                });
                                setUseYipyyPay(true);
                                setUseCloverTerminal(false);
                                setCloverTerminalId(null);
                                setSelectedTokenizedCard(null);
                                // Auto-select first device if available
                                const devices =
                                  getYipyyPayDevicesByFacility(facilityId);
                                if (devices.length > 0) {
                                  setYipyyPayDeviceId(devices[0].deviceId);
                                }
                              }}
                            >
                              <Smartphone className="size-5" />
                              <div className="text-left">
                                <p className="font-medium">Pay with iPhone</p>
                                <p className="text-muted-foreground text-xs">
                                  Tap to Pay
                                </p>
                              </div>
                            </Button>
                          )}
                      </div>
                    );
                  })()}
                </div>

                {/* Clover Terminal Selection */}
                {(paymentForm.method === "credit" ||
                  paymentForm.method === "debit") &&
                  useCloverTerminal &&
                  (() => {
                    const facilityId = 11; // TODO: Get from context
                    const fiservConfig = getFiservConfig(facilityId);
                    const terminals = fiservConfig?.cloverTerminal?.enabled
                      ? getCloverTerminalsByFacility(facilityId)
                      : [];

                    if (terminals.length > 0) {
                      return (
                        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Clover Terminal Selected
                            </Label>
                            <p className="text-muted-foreground text-xs">
                              Process payment via physical terminal
                              (Tap/Chip/Swipe)
                            </p>
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
                                    <SelectItem
                                      key={terminal.terminalId}
                                      value={terminal.terminalId}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{terminal.terminalName}</span>
                                        {terminal.isOnline ? (
                                          <Badge
                                            variant="default"
                                            className="ml-2"
                                          >
                                            Online
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            Offline
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {cloverTerminalId &&
                                (() => {
                                  const terminal = getCloverTerminal(
                                    facilityId,
                                    cloverTerminalId,
                                  );
                                  if (!terminal) return null;
                                  return (
                                    <div className="text-muted-foreground mt-1 text-xs">
                                      {terminal.location && (
                                        <span>
                                          Location: {terminal.location} •{" "}
                                        </span>
                                      )}
                                      Supports:{" "}
                                      {[
                                        terminal.supportsTap && "Tap",
                                        terminal.supportsChip && "Chip",
                                        terminal.supportsSwipe && "Swipe",
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                      {fiservConfig?.cloverTerminal
                                        ?.autoPrintReceipts && (
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
                {(paymentForm.method === "credit" ||
                  paymentForm.method === "debit") &&
                  useYipyyPay &&
                  !useCloverTerminal &&
                  (() => {
                    const facilityId = 11; // TODO: Get from context
                    const fiservConfig = getFiservConfig(facilityId);
                    const devices = fiservConfig?.yipyyPay?.enabled
                      ? getYipyyPayDevicesByFacility(facilityId)
                      : [];

                    if (devices.length > 0) {
                      return (
                        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Pay with iPhone (Tap to Pay) Selected
                            </Label>
                            <p className="text-muted-foreground text-xs">
                              Accept contactless payment directly on iPhone - no
                              terminal needed
                            </p>
                          </div>
                          {useYipyyPay && (
                            <div className="grid gap-2">
                              <Label className="text-xs">
                                Select iPhone Device
                              </Label>
                              <Select
                                value={yipyyPayDeviceId || ""}
                                onValueChange={setYipyyPayDeviceId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select device" />
                                </SelectTrigger>
                                <SelectContent>
                                  {devices.map((device) => (
                                    <SelectItem
                                      key={device.id}
                                      value={device.deviceId}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Smartphone className="size-4" />
                                        <span>{device.deviceName}</span>
                                        {device.isAuthorized ? (
                                          <Badge
                                            variant="default"
                                            className="ml-2"
                                          >
                                            Ready
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            Pending
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {yipyyPayDeviceId &&
                                (() => {
                                  const device = getYipyyPayDevice(
                                    facilityId,
                                    yipyyPayDeviceId,
                                  );
                                  if (!device) return null;
                                  return (
                                    <div className="text-muted-foreground mt-1 text-xs">
                                      {device.lastUsedAt && (
                                        <span>
                                          Last used:{" "}
                                          {new Date(
                                            device.lastUsedAt,
                                          ).toLocaleDateString()}{" "}
                                          •{" "}
                                        </span>
                                      )}
                                      Tap card, iPhone, or Apple Watch to the
                                      top of the phone.
                                      {fiservConfig?.yipyyPay
                                        ?.autoSendReceipt && (
                                        <span>
                                          {" "}
                                          • Receipt will be sent automatically
                                        </span>
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
                {paymentForm.method === "store_credit" &&
                  (() => {
                    const _facilityId = 11; // TODO: Get from context
                    const customerId =
                      selectedClientId && selectedClientId !== "__walk_in__"
                        ? selectedClientId
                        : null;
                    const availableStoreCredit = customerId
                      ? getStoreCreditBalance(customerId)
                      : 0;

                    if (!customerId) {
                      return (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-muted-foreground text-sm">
                            Please select a customer to use store credit
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="space-y-2">
                          <Label>Available Store Credit</Label>
                          <div className="text-2xl font-bold text-green-600">
                            ${availableStoreCredit.toFixed(2)}
                          </div>
                          {availableStoreCredit < grandTotal && (
                            <p className="text-muted-foreground text-xs">
                              Store credit balance is less than total. Remaining
                              amount will need to be paid with another method.
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
                              setStoreCreditAmount(
                                Math.min(
                                  amount,
                                  availableStoreCredit,
                                  grandTotal,
                                ),
                              );
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
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="grid gap-2">
                      <Label>Gift Card Code</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter gift card code"
                          value={selectedGiftCardCode}
                          onChange={(e) =>
                            setSelectedGiftCardCode(
                              e.target.value.toUpperCase(),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const facilityId = 11; // TODO: Get from context
                              const giftCard = giftCards.find(
                                (gc) =>
                                  gc.code === selectedGiftCardCode &&
                                  gc.facilityId === facilityId &&
                                  gc.status === "active",
                              );
                              if (giftCard) {
                                setSelectedGiftCard({
                                  id: giftCard.id,
                                  balance: giftCard.currentBalance,
                                  code: giftCard.code,
                                });
                                if (giftCard.currentBalance < grandTotal) {
                                  alert(
                                    `Gift card balance ($${giftCard.currentBalance.toFixed(2)}) is less than total. Remaining amount will need to be paid with another method.`,
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
                              (gc) =>
                                gc.code === selectedGiftCardCode &&
                                gc.facilityId === facilityId &&
                                gc.status === "active",
                            );
                            if (giftCard) {
                              setSelectedGiftCard({
                                id: giftCard.id,
                                balance: giftCard.currentBalance,
                                code: giftCard.code,
                              });
                              if (giftCard.currentBalance < grandTotal) {
                                alert(
                                  `Gift card balance ($${giftCard.currentBalance.toFixed(2)}) is less than total. Remaining amount will need to be paid with another method.`,
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
                      <div className="bg-muted space-y-2 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Gift Card: {selectedGiftCard.code}
                          </span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${selectedGiftCard.balance.toFixed(2)}
                        </div>
                        {selectedGiftCard.balance < grandTotal && (
                          <p className="text-muted-foreground text-xs">
                            Remaining amount: $
                            {(grandTotal - selectedGiftCard.balance).toFixed(2)}{" "}
                            will need to be paid with another method
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Card on File Selection */}
                {(paymentForm.method === "credit" ||
                  paymentForm.method === "debit") &&
                  !useCloverTerminal &&
                  !useYipyyPay &&
                  (() => {
                    const facilityId = 11; // TODO: Get from context
                    const fiservConfig = getFiservConfig(facilityId);
                    const customerId =
                      selectedClientId && selectedClientId !== "__walk_in__"
                        ? Number(selectedClientId)
                        : null;
                    const tokenizedCards =
                      customerId &&
                      fiservConfig?.enabledPaymentMethods.cardOnFile
                        ? getTokenizedCardsByClient(facilityId, customerId)
                        : [];

                    if (tokenizedCards.length > 0) {
                      return (
                        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                          <Label className="text-sm font-semibold">
                            Saved Card on File
                          </Label>
                          <div className="grid gap-2">
                            <Select
                              value={selectedTokenizedCard?.id || "new"}
                              onValueChange={(value) => {
                                if (value === "new") {
                                  setSelectedTokenizedCard(null);
                                } else {
                                  const card = tokenizedCards.find(
                                    (c) => c.id === value,
                                  );
                                  setSelectedTokenizedCard(card || null);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">
                                  Enter New Card
                                </SelectItem>
                                {tokenizedCards.map((card) => (
                                  <SelectItem key={card.id} value={card.id}>
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="size-4" />
                                      <span>
                                        {card.cardBrand?.toUpperCase()} ••••{" "}
                                        {card.cardLast4}
                                      </span>
                                      <span className="text-muted-foreground">
                                        (Exp {card.cardExpMonth}/
                                        {card.cardExpYear})
                                      </span>
                                      {card.isDefault && (
                                        <Badge
                                          variant="outline"
                                          className="ml-2 text-xs"
                                        >
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-xs">
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
                {(paymentForm.method === "credit" ||
                  paymentForm.method === "debit") &&
                  !useCloverTerminal &&
                  !useYipyyPay && (
                    <div className="space-y-4">
                      {/* Manual Card Entry - Check Permission */}
                      {!selectedTokenizedCard &&
                        !hasPermission(
                          facilityRole,
                          "manual_card_entry",
                          currentUserId || undefined,
                        ) && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <p className="text-sm text-yellow-800">
                              ⚠️ Manual card entry requires admin/manager
                              permission. Please use a saved card or contact a
                              manager.
                            </p>
                          </div>
                        )}

                      {!selectedTokenizedCard &&
                        hasPermission(
                          facilityRole,
                          "manual_card_entry",
                          currentUserId || undefined,
                        ) && (
                          <div className="space-y-3 rounded-lg border p-4">
                            <Label>Card Details</Label>
                            <div className="grid gap-2">
                              <Label className="text-xs">Card Number</Label>
                              <Input
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                value={newCardDetails.number}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /\s/g,
                                    "",
                                  );
                                  if (
                                    /^\d*$/.test(value) &&
                                    value.length <= 16
                                  ) {
                                    const formatted =
                                      value.match(/.{1,4}/g)?.join(" ") ||
                                      value;
                                    setNewCardDetails({
                                      ...newCardDetails,
                                      number: formatted,
                                    });
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
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    if (value.length <= 2) {
                                      setNewCardDetails({
                                        ...newCardDetails,
                                        expMonth: value,
                                      });
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
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    if (value.length <= 4) {
                                      setNewCardDetails({
                                        ...newCardDetails,
                                        expYear: value,
                                      });
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
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    if (value.length <= 4) {
                                      setNewCardDetails({
                                        ...newCardDetails,
                                        cvv: value,
                                      });
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
                                  setNewCardDetails({
                                    ...newCardDetails,
                                    cardholderName: e.target.value,
                                  })
                                }
                              />
                            </div>
                            {selectedClientId &&
                              selectedClientId !== "__walk_in__" && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="saveCard"
                                    checked={saveCardToAccount}
                                    onChange={(e) =>
                                      setSaveCardToAccount(e.target.checked)
                                    }
                                    className="rounded-sm border-gray-300"
                                  />
                                  <Label
                                    htmlFor="saveCard"
                                    className="text-sm font-normal"
                                  >
                                    Save card to customer account for future
                                    payments
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
        <DialogContent className="max-h-[80vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search Customer / Pet / Booking</DialogTitle>
            <DialogDescription>
              Search by email, phone, name, or pet name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
                        className="hover:bg-muted/50 cursor-pointer rounded-lg border p-3 transition-colors"
                        onClick={() => {
                          handleClientSelect(String(client.id));
                          setIsLinkModalOpen(false);
                          setLinkSearchQuery("");
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="text-muted-foreground size-4" />
                              <p className="font-medium">{client.name}</p>
                              {selectedClientId === String(client.id) && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="mr-1 size-3" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground mt-1 space-y-1 text-sm">
                              {client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="size-3" />
                                  {client.email}
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {client.phone}
                                </div>
                              )}
                              {client.pets && client.pets.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <PawPrint className="size-3" />
                                  {client.pets.map((pet) => (
                                    <Badge
                                      key={pet.id}
                                      variant="outline"
                                      className="text-xs"
                                    >
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
                  <div className="text-muted-foreground py-8 text-center">
                    <Search className="mx-auto mb-4 size-12 opacity-50" />
                    <p>No customers found</p>
                    <p className="mt-1 text-sm">Try a different search term</p>
                  </div>
                )
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  <Search className="mx-auto mb-4 size-12 opacity-50" />
                  <p>Start typing to search customers</p>
                  <p className="mt-1 text-sm">
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
      <Dialog
        open={isTapToPayModalOpen}
        onOpenChange={(open) => {
          setIsTapToPayModalOpen(open);
          if (!open) {
            setTapToPayStatus("idle");
            setTapToPayError(null);
            setTapToPayResponse(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-5" />
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
            const device = yipyyPayDeviceId
              ? getYipyyPayDevice(facilityId, yipyyPayDeviceId)
              : null;
            const minIOSVersion =
              inPersonMethods?.iphoneSettings?.deviceRequirements
                .minIOSVersion || "16.0";
            const deviceCheck = isDeviceReadyForTapToPay(minIOSVersion);
            const enabledLocations =
              inPersonMethods?.iphoneSettings?.enabledLocations || [];
            const restrictedRoles =
              inPersonMethods?.iphoneSettings?.restrictedRoles || [];
            const currentLocation = "loc-001"; // TODO: Get from context
            const isLocationEnabled =
              enabledLocations.includes(currentLocation);
            const isRoleAuthorized =
              restrictedRoles.length === 0 ||
              restrictedRoles.includes(facilityRole);

            // Pre-payment checks
            if (tapToPayStatus === "idle") {
              const checks: {
                label: string;
                passed: boolean;
                error?: string;
              }[] = [
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
                  error:
                    "Device does not support NFC (requires iPhone XS or newer)",
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
                  passed:
                    device?.isAuthorized === true && device?.isActive === true,
                  error: "Selected iPhone device is not authorized or active",
                },
              ];

              const failedChecks = checks.filter((c) => !c.passed);

              if (failedChecks.length > 0) {
                return (
                  <div className="space-y-4">
                    <Alert className="border-destructive">
                      <AlertCircle className="text-destructive size-4" />
                      <AlertDescription>
                        <div className="mb-2 font-semibold">
                          Pre-payment checks failed:
                        </div>
                        <ul className="list-inside list-disc space-y-1 text-sm">
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
                  <div className="space-y-2 text-center">
                    <div className="text-primary text-5xl font-bold">
                      ${grandTotal.toFixed(2)}
                    </div>
                    <div className="text-muted-foreground space-y-1 text-sm">
                      <div>Subtotal: ${subtotal.toFixed(2)}</div>
                      {taxTotal > 0 && <div>Tax: ${taxTotal.toFixed(2)}</div>}
                      {calculatedTipAmount > 0 && (
                        <div>Tip: ${calculatedTipAmount.toFixed(2)}</div>
                      )}
                    </div>
                  </div>

                  {/* Visual Prompt */}
                  <div className="bg-muted flex flex-col items-center space-y-4 rounded-lg border-2 border-dashed p-6">
                    <div className="space-y-2 text-center">
                      <Smartphone className="text-primary mx-auto h-16 w-16 animate-pulse" />
                      <p className="text-lg font-semibold">
                        Tap card, iPhone, or Apple Watch to the top of the
                        phone.
                      </p>
                    </div>
                    {device && (
                      <div className="text-muted-foreground text-center text-sm">
                        Device: {device.deviceName}
                        {device.isAuthorized && (
                          <Badge variant="default" className="ml-2">
                            Ready
                          </Badge>
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
                            selectedClientId &&
                            selectedClientId !== "__walk_in__"
                              ? selectedClientId
                              : undefined;
                          const name =
                            customerName ||
                            (selectedClientId &&
                            selectedClientId !== "__walk_in__"
                              ? clients.find(
                                  (c) => String(c.id) === selectedClientId,
                                )?.name
                              : undefined);
                          const email =
                            customerEmail ||
                            (selectedClientId &&
                            selectedClientId !== "__walk_in__"
                              ? clients.find(
                                  (c) => String(c.id) === selectedClientId,
                                )?.email
                              : undefined);

                          const yipyyPayRequest: YipyyPayRequest = {
                            facilityId: 11,
                            deviceId: yipyyPayDeviceId,
                            amount: grandTotal - (calculatedTipAmount || 0),
                            currency: "USD",
                            tipAmount:
                              calculatedTipAmount > 0
                                ? calculatedTipAmount
                                : undefined,
                            description: `POS Transaction - ${cart.length} item(s)`,
                            invoiceId: undefined,
                            customerId: customerId
                              ? Number(customerId)
                              : undefined,
                            bookingId: selectedBookingId || undefined,
                            sendReceipt:
                              fiservConfig?.yipyyPay?.autoSendReceipt ?? true,
                            processedBy: currentUserId || "staff-001",
                            processedById: currentUserId
                              ? Number(currentUserId)
                              : undefined,
                          };

                          const response =
                            await processYipyyPay(yipyyPayRequest);
                          setTapToPayResponse(response);

                          if (response.success) {
                            setTapToPayStatus("success");

                            // Record transaction
                            addRetailTransaction({
                              items: cart.map(({ id: _id, ...item }) => item),
                              subtotal,
                              discountTotal,
                              cartDiscount: cartDiscount || undefined,
                              promoCodeUsed:
                                appliedPromoCode?.code || undefined,
                              accountDiscountApplied:
                                accountDiscount?.id || undefined,
                              taxTotal,
                              tipAmount:
                                calculatedTipAmount > 0
                                  ? calculatedTipAmount
                                  : undefined,
                              tipPercentage: tipPercentage || undefined,
                              total: grandTotal,
                              paymentMethod: paymentForm.method,
                              payments: [
                                {
                                  method: paymentForm.method,
                                  amount: grandTotal,
                                },
                              ],
                              customerId,
                              customerName: name,
                              customerEmail: email,
                              petId: selectedPetId || undefined,
                              petName:
                                selectedPetId &&
                                selectedClientId &&
                                selectedClientId !== "__walk_in__"
                                  ? clients
                                      .find(
                                        (c) =>
                                          String(c.id) === selectedClientId,
                                      )
                                      ?.pets.find((p) => p.id === selectedPetId)
                                      ?.name
                                  : undefined,
                              bookingId: selectedBookingId || undefined,
                              bookingService: selectedBookingId
                                ? bookings.find(
                                    (b) => b.id === selectedBookingId,
                                  )?.service
                                : undefined,
                              cashierId: currentUserId || "staff-001",
                              cashierName: "Staff",
                              notes: `Yipyy Pay Transaction: ${response.yipyyTransactionId}`,
                              yipyyPayTransactionId: response.transactionId, // Store Yipyy Pay transaction ID
                            });

                            // Apply promo code usage
                            if (appliedPromoCode) {
                              const promo = getPromoCodeByCode(
                                appliedPromoCode.code,
                              );
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
                            setTapToPayError(
                              response.error?.message || "Payment failed",
                            );
                          }
                        } catch (error) {
                          setTapToPayStatus("failed");
                          setTapToPayError(
                            "An error occurred while processing the payment",
                          );
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
                      <Smartphone className="text-primary h-20 w-20 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">
                        Processing payment...
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Tap card, iPhone, or Apple Watch to the top of the
                        phone.
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
                      <p className="text-xl font-semibold text-green-600">
                        Payment Successful!
                      </p>
                      <p className="text-muted-foreground text-sm">
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
                        <Printer className="size-4" />
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
                        <Mail className="size-4" />
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
                        <Phone className="size-4" />
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
                    <XCircle className="text-destructive h-16 w-16" />
                    <div className="space-y-1">
                      <p className="text-destructive text-xl font-semibold">
                        Payment Failed
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {tapToPayError}
                      </p>
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
                        <RotateCcw className="size-4" />
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
                        <Printer className="size-4" />
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
                        <Banknote className="size-4" />
                        Switch to Cash
                      </Button>
                      {selectedClientId &&
                        selectedClientId !== "__walk_in__" && (
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => {
                              setIsTapToPayModalOpen(false);
                              setUseYipyyPay(false);
                              setPaymentForm({
                                ...paymentForm,
                                method: "store_credit",
                              });
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            <CreditCard className="size-4" />
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
              <Receipt className="size-5" />
              Payment Successful
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="mb-2 text-4xl font-bold text-green-600">
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
              <Printer className="size-4" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={!customerEmail}
              onClick={() => completeTransaction(true)}
            >
              <Mail className="size-4" />
              Email Receipt
            </Button>
          </div>

          <Button
            className="mt-2 w-full"
            onClick={() => completeTransaction(false)}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
