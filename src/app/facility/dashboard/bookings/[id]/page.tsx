"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  User,
  PawPrint,
  Calendar,
  Clock,
  MapPin,
  Scissors,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  FileText,
  MessageSquare,
  DollarSign,
  ShoppingBag,
  Plus,
  X,
  Send as SendIcon,
  Utensils,
  Pill,
  Footprints,
} from "lucide-react";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { BookingActionBar } from "@/components/bookings/BookingActionBar";
import { BookingNotes } from "@/components/bookings/BookingNotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { clientCommunications } from "@/data/communications";
import { products } from "@/data/retail";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import {
  getYipyyGoForm,
  getYipyyGoDisplayStatusForBooking,
} from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { YipyyGoStaffReviewModal } from "@/components/yipyygo/YipyyGoStaffReviewModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePanel } from "@/components/bookings/InvoicePanel";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import {
  checkFormRequirements,
  getStageLabel,
  type RequirementStage,
} from "@/lib/form-requirements";
import { TagList } from "@/components/shared/TagList";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ========================================
// Helpers
// ========================================

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusDot(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "confirmed":
      return "bg-blue-500";
    case "pending":
      return "bg-amber-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

// ========================================
// Detail Field — editable inline
// ========================================

function DetailField({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group", className)}>
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {Icon && <Icon className="size-3" />}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ========================================
// Add-ons & Retail Section
// ========================================

function BookingAddOnsSection({ isEditable }: { isEditable: boolean }) {
  const [items, setItems] = useState([
    { id: 1, name: "Bath Add-on", price: 25.0, type: "service" },
    { id: 2, name: "Premium Dog Food (retail)", price: 18.0, type: "retail" },
  ]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const retailSuggestions = products.slice(0, 6);

  const addItem = (name: string, price: number, type: string) => {
    setItems((prev) => [...prev, { id: Date.now(), name, price, type }]);
    setShowAddMenu(false);
    setCustomName("");
    setCustomPrice("");
    toast.success(`Added "${name}" · $${price.toFixed(2)}`);
  };

  const removeItem = (id: number) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`Removed "${item?.name}"`);
  };

  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-4" />
            Add-ons & Retail
            <Badge variant="secondary" className="text-[10px]">
              {items.length}
            </Badge>
          </CardTitle>
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="size-3" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add menu */}
        {showAddMenu && (
          <div className="animate-in fade-in slide-in-from-top-1 bg-muted/30 mb-3 rounded-md border p-3 duration-200">
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
              Quick Add from Retail
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {retailSuggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p.name, p.basePrice, "retail")}
                  className="hover:bg-foreground hover:text-background rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all"
                >
                  {p.name} · ${p.basePrice}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
              Custom Item
            </p>
            <div className="flex gap-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Item name"
                className="h-7 flex-1 text-xs"
              />
              <Input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Price"
                className="h-7 w-20 text-xs"
                min={0}
                step={0.01}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!customName || !customPrice}
                onClick={() =>
                  addItem(customName, parseFloat(customPrice) || 0, "custom")
                }
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Items list */}
        {items.length > 0 ? (
          <div className="rounded-md border">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between border-b px-3 py-2.5 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {isEditable && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground/0 hover:text-destructive group-hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  <span className="text-sm">{item.name}</span>
                  <Badge variant="outline" className="text-[9px]">
                    {item.type}
                  </Badge>
                </div>
                <span className="font-[tabular-nums] text-sm font-medium">
                  ${item.price.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="bg-muted/30 flex justify-between border-t px-3 py-2">
              <span className="text-xs font-semibold">Add-ons Total</span>
              <span className="font-[tabular-nums] text-xs font-semibold">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-3 text-center text-sm italic">
            No add-ons or retail items
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// Care Instructions
// ========================================

function CareInstructionsSection({
  pet,
  service,
}: {
  pet: {
    name: string;
    allergies: string;
    specialNeeds: string;
    weight: number;
  };
  service: string;
}) {
  const [feeding, setFeeding] = useState(
    `${pet.weight > 20 ? "2 cups" : "1 cup"} premium kibble, twice daily (8am & 5pm)`,
  );
  const [medications, setMedications] = useState(
    pet.allergies !== "None" ? "Allergy medication with morning meal" : "None",
  );
  const [walkSchedule, setWalkSchedule] = useState(
    service === "boarding"
      ? "30 min walk at 7am, 12pm, and 6pm"
      : "Supervised group play",
  );
  const [editingField, setEditingField] = useState<string | null>(null);

  const fields = [
    {
      key: "feeding",
      label: "Feeding Schedule",
      icon: Utensils,
      value: feeding,
      set: setFeeding,
    },
    {
      key: "medications",
      label: "Medications",
      icon: Pill,
      value: medications,
      set: setMedications,
    },
    {
      key: "walks",
      label: "Walk / Exercise",
      icon: Footprints,
      value: walkSchedule,
      set: setWalkSchedule,
    },
  ];

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Utensils className="size-4" />
          Care Instructions for {pet.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map((f) => (
            <div
              key={f.key}
              className="group hover:border-foreground/20 rounded-md border px-3 py-2.5 transition-all"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
                  <f.icon className="size-3" />
                  {f.label}
                </div>
                {editingField !== f.key && (
                  <button
                    onClick={() => setEditingField(f.key)}
                    className="text-muted-foreground text-[11px] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingField === f.key ? (
                <div className="animate-in fade-in flex gap-2 duration-150">
                  <Input
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="h-7 flex-1 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingField(null);
                        toast.success(`${f.label} updated`);
                      }
                      if (e.key === "Escape") setEditingField(null);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingField(null);
                      toast.success(`${f.label} updated`);
                    }}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-sm">{f.value}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Message History
// ========================================

function MessageHistorySection({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const messages = clientCommunications
    .filter((c) => c.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 5);

  const [quickMessage, setQuickMessage] = useState("");
  const [now] = useState(() => Date.now());

  const handleSend = () => {
    if (!quickMessage.trim()) return;
    toast.success(`Message sent to ${clientName}`);
    setQuickMessage("");
  };

  const channelIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="size-3" />;
      case "sms":
        return <Phone className="size-3" />;
      default:
        return <MessageSquare className="size-3" />;
    }
  };

  const channelColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "sms":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-violet-100 text-violet-700 border-violet-200";
    }
  };

  const timeAgo = (timestamp: string) => {
    const diff = now - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4" />
            Messages with {clientName}
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {messages.length}
              </Badge>
            )}
          </CardTitle>
          <Link href="/facility/dashboard/messaging">
            <Button variant="ghost" size="sm" className="h-6 text-[11px]">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick send */}
        <div className="mb-3 flex gap-2">
          <Input
            value={quickMessage}
            onChange={(e) => setQuickMessage(e.target.value)}
            placeholder={`Quick message to ${clientName}...`}
            className="h-8 flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={handleSend}
            disabled={!quickMessage.trim()}
          >
            <SendIcon className="size-3" />
            Send
          </Button>
        </div>

        {/* Message list */}
        {messages.length > 0 ? (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="group hover:bg-muted/30 flex items-start gap-2.5 rounded-md border px-3 py-2 transition-all"
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                    channelColor(msg.type),
                  )}
                >
                  {channelIcon(msg.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {msg.subject || msg.type.toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {msg.direction}
                    </Badge>
                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {timeAgo(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-3 text-center text-sm italic">
            No messages yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// Page
// ========================================

export default function FacilityBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const bookingId = parseInt(id, 10);

  const booking = useMemo(
    () => initialBookings.find((b) => b.id === bookingId),
    [bookingId],
  );
  const client = useMemo(
    () => (booking ? clients.find((c) => c.id === booking.clientId) : null),
    [booking],
  );
  const pet = useMemo(() => {
    if (!client || !booking) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return client.pets?.find((p) => p.id === pid);
  }, [client, booking]);

  const isEditable =
    booking?.status === "confirmed" || booking?.status === "pending";
  const nights = booking
    ? nightsBetween(booking.startDate, booking.endDate)
    : 0;

  // Editable state — every field
  const [service, setService] = useState(booking?.service ?? "daycare");
  const [startDate, setStartDate] = useState(booking?.startDate ?? "");
  const [endDate, setEndDate] = useState(booking?.endDate ?? "");
  const [checkInTime, setCheckInTime] = useState(booking?.checkInTime ?? "");
  const [checkOutTime, setCheckOutTime] = useState(booking?.checkOutTime ?? "");
  const [selectedPetId, setSelectedPetId] = useState(
    booking
      ? Array.isArray(booking.petId)
        ? booking.petId[0]
        : booking.petId
      : 0,
  );
  const [kennel, setKennel] = useState(booking?.kennel ?? "");
  const [status, setStatus] = useState(booking?.status ?? "pending");
  const [specialRequests, setSpecialRequests] = useState(
    booking?.specialRequests ?? "",
  );
  const [editingRequests, setEditingRequests] = useState(false);
  const [basePrice, setBasePrice] = useState(booking?.basePrice ?? 0);
  const [discount, setDiscount] = useState(booking?.discount ?? 0);

  // Derived
  const editedNights = nightsBetween(startDate, endDate);
  const editedTotal = basePrice - discount;
  const selectedPet = client?.pets?.find((p) => p.id === selectedPetId) ?? pet;

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // YipyyGo
  const yipyyGoConfig = useMemo(
    () => (booking ? getYipyyGoConfig(booking.facilityId) : null),
    [booking],
  );
  const petIdForForm = useMemo(() => {
    if (!booking) return undefined;
    return Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  }, [booking]);
  const yipyyGoForm = useMemo(
    () => getYipyyGoForm(bookingId, petIdForForm),
    [bookingId, petIdForForm],
  );
  const yipyyGoStatus = useMemo(
    () =>
      booking
        ? getYipyyGoDisplayStatusForBooking(bookingId, {
            facilityId: booking.facilityId,
            service: booking.service,
          })
        : "not_sent",
    [bookingId, booking],
  );
  const serviceType = booking?.service?.toLowerCase() as
    | "daycare"
    | "boarding"
    | "grooming"
    | "training";
  const yipyyGoEnabled =
    yipyyGoConfig?.enabled &&
    yipyyGoConfig?.serviceConfigs?.find((s) => s.serviceType === serviceType)
      ?.enabled;
  const canReview =
    yipyyGoEnabled &&
    (yipyyGoStatus === "submitted" ||
      yipyyGoStatus === "needs_review" ||
      yipyyGoStatus === "approved");

  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const open = () => {
      if (window.location.hash === "#yipyygo") setReviewModalOpen(true);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  // Form requirements
  const formRequirementsCheck = useMemo(() => {
    if (!booking) return null;
    const svc = booking.service?.toLowerCase() ?? "";
    const facilityId = booking.facilityId;
    const customerId = booking.clientId;
    let stage: RequirementStage = "before_booking";
    if (
      booking.status === "request_submitted" ||
      booking.status === "waitlisted"
    ) {
      stage = "before_approval";
    } else if (booking.status === "confirmed") {
      stage = "before_checkin";
    } else if (
      booking.status === "completed" ||
      booking.status === "cancelled"
    ) {
      return null;
    }
    const check = checkFormRequirements(facilityId, svc, stage, customerId);
    if (check.complete) return null;
    return { ...check, stage };
  }, [booking]);

  if (!booking) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/facility/dashboard/bookings")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex-1 space-y-6 p-4 pt-6 duration-300 md:p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/facility/dashboard/bookings">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Booking #{booking.id}
              </h1>
              {isEditable ? (
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as typeof status);
                    toast.success(`Status changed to ${v}`);
                  }}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full border px-2.5 text-xs font-medium">
                    <div
                      className={cn(
                        "size-2 animate-pulse rounded-full",
                        statusDot(status),
                      )}
                    />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                  <div
                    className={cn(
                      "size-2 animate-pulse rounded-full",
                      statusDot(booking.status),
                    )}
                  />
                  <span className="text-xs font-medium capitalize">
                    {booking.status}
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatDateLong(startDate)}
              {startDate !== endDate && ` → ${formatDateLong(endDate)}`}
              {editedNights > 0 && (
                <span className="text-foreground/60 ml-2">
                  · {editedNights} night{editedNights !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="animate-in slide-in-from-top-2 bg-card/50 rounded-lg border px-4 py-3 backdrop-blur-sm duration-300">
        <BookingActionBar
          booking={booking}
          onEdit={() => setEditOpen(true)}
          onPayment={() => setPaymentOpen(true)}
          onCancel={() => setCancelOpen(true)}
          onRefund={() => toast.info("Refund flow would open here")}
        />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Client & Pet — Side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client Card */}
            <Card className="animate-in fade-in slide-in-from-left-2 group overflow-hidden duration-300">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                  <User className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">
                    <Link
                      href={`/facility/dashboard/clients/${client?.id}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {client?.name ?? "Unknown"}
                    </Link>
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">Client</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {client?.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="text-muted-foreground size-3" />
                    <span className="text-muted-foreground truncate">
                      {client.email}
                    </span>
                  </div>
                )}
                {client?.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="text-muted-foreground size-3" />
                    <span className="text-muted-foreground">
                      {client.phone}
                    </span>
                  </div>
                )}
                {client?.emergencyContact?.name && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    <span className="font-medium">Emergency:</span>{" "}
                    {client.emergencyContact.name} (
                    {client.emergencyContact.relationship})
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pet Card */}
            <Card className="animate-in fade-in slide-in-from-right-2 group overflow-hidden duration-300">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                  <PawPrint className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  {isEditable && client && client.pets.length > 1 ? (
                    <Select
                      value={String(selectedPetId)}
                      onValueChange={(v) => {
                        setSelectedPetId(Number(v));
                        const p = client.pets.find((pp) => pp.id === Number(v));
                        toast.success(`Pet changed to ${p?.name}`);
                      }}
                    >
                      <SelectTrigger className="h-8 w-full text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {client.pets.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} — {p.breed}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {selectedPet?.name ?? "Unknown"}
                      </CardTitle>
                      {selectedPet && (
                        <TagList
                          entityType="pet"
                          entityId={selectedPet.id}
                          compact
                          maxVisible={2}
                        />
                      )}
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {selectedPet
                      ? `${selectedPet.breed} · ${selectedPet.type}`
                      : "No pet"}
                  </p>
                </div>
              </CardHeader>
              {selectedPet && (
                <CardContent className="space-y-2 pt-0">
                  <div className="flex gap-4 text-xs">
                    <span>
                      <span className="text-muted-foreground">Age:</span>{" "}
                      {selectedPet.age} yrs
                    </span>
                    <span>
                      <span className="text-muted-foreground">Weight:</span>{" "}
                      {selectedPet.weight} lbs
                    </span>
                    {selectedPet.sex && (
                      <span>
                        <span className="text-muted-foreground">Sex:</span>{" "}
                        <span className="capitalize">{selectedPet.sex}</span>
                      </span>
                    )}
                  </div>
                  {selectedPet.allergies &&
                    selectedPet.allergies !== "None" && (
                      <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                        <ShieldCheck className="size-3 shrink-0" />
                        <span>
                          <span className="font-medium">Allergy:</span>{" "}
                          {selectedPet.allergies}
                        </span>
                      </div>
                    )}
                  {selectedPet.specialNeeds &&
                    selectedPet.specialNeeds !== "None" && (
                      <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-700">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>
                          <span className="font-medium">Needs:</span>{" "}
                          {selectedPet.specialNeeds}
                        </span>
                      </div>
                    )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Service Details — Editable grid */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="size-4" />
                Service Details
                {isEditable && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[9px] font-normal"
                  >
                    Editable
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
                {/* Service */}
                <DetailField icon={Scissors} label="Service">
                  {isEditable ? (
                    <Select
                      value={service}
                      onValueChange={(v) => {
                        setService(v);
                        toast.success(`Service changed to ${v}`);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daycare">Daycare</SelectItem>
                        <SelectItem value="boarding">Boarding</SelectItem>
                        <SelectItem value="grooming">Grooming</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium capitalize">
                      {booking.service}
                    </p>
                  )}
                </DetailField>

                {/* Check-in date + time */}
                <DetailField icon={Calendar} label="Check-in">
                  {isEditable ? (
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          toast.success("Check-in date updated");
                        }}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => {
                          setCheckInTime(e.target.value);
                          toast.success("Check-in time updated");
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {formatDateLong(booking.startDate)}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {booking.checkInTime ?? "—"}
                      </p>
                    </>
                  )}
                </DetailField>

                {/* Check-out date + time */}
                <DetailField icon={Calendar} label="Check-out">
                  {isEditable ? (
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          toast.success("Check-out date updated");
                        }}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => {
                          setCheckOutTime(e.target.value);
                          toast.success("Check-out time updated");
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {formatDateLong(booking.endDate)}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {booking.checkOutTime ?? "—"}
                      </p>
                    </>
                  )}
                </DetailField>

                {/* Duration — auto-calculated */}
                <DetailField icon={Clock} label="Duration">
                  <p className="text-sm font-medium">
                    {editedNights > 0
                      ? `${editedNights} night${editedNights !== 1 ? "s" : ""}`
                      : "Same day"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {booking.serviceType?.replace("_", " ") ?? "standard"}
                  </p>
                </DetailField>

                {/* Room / Kennel */}
                <DetailField icon={MapPin} label="Room / Kennel">
                  {isEditable ? (
                    <Select
                      value={kennel || "none"}
                      onValueChange={(v) => {
                        setKennel(v === "none" ? "" : v);
                        toast.success(
                          v === "none"
                            ? "Room unassigned"
                            : `Room changed to ${v}`,
                        );
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign room..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        <SelectItem value="Kennel 1">Kennel 1</SelectItem>
                        <SelectItem value="Kennel 2">Kennel 2</SelectItem>
                        <SelectItem value="Kennel 3">Kennel 3</SelectItem>
                        <SelectItem value="Suite A">Suite A</SelectItem>
                        <SelectItem value="Suite B">Suite B</SelectItem>
                        <SelectItem value="Run 1">Run 1</SelectItem>
                        <SelectItem value="Run 2">Run 2</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">
                      {booking.kennel || "—"}
                    </p>
                  )}
                </DetailField>

                {/* Base Price */}
                <DetailField icon={DollarSign} label="Base Price">
                  {isEditable ? (
                    <Input
                      type="number"
                      value={basePrice}
                      onChange={(e) =>
                        setBasePrice(parseFloat(e.target.value) || 0)
                      }
                      onBlur={() =>
                        toast.success(
                          `Base price set to $${basePrice.toFixed(2)}`,
                        )
                      }
                      className="h-8 text-xs"
                      min={0}
                      step={0.01}
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      ${booking.basePrice.toFixed(2)}
                    </p>
                  )}
                </DetailField>

                {/* Discount */}
                <DetailField icon={DollarSign} label="Discount">
                  {isEditable ? (
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) =>
                        setDiscount(parseFloat(e.target.value) || 0)
                      }
                      onBlur={() =>
                        toast.success(`Discount set to $${discount.toFixed(2)}`)
                      }
                      className="h-8 text-xs"
                      min={0}
                      step={0.01}
                    />
                  ) : booking.discount > 0 ? (
                    <p className="text-sm font-medium text-emerald-600">
                      -${booking.discount.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">None</p>
                  )}
                </DetailField>

                {/* Total — live-calculated */}
                <DetailField icon={DollarSign} label="Total">
                  <p className="font-[tabular-nums] text-lg font-bold">
                    ${editedTotal.toFixed(2)}
                  </p>
                  {editedTotal !== booking.totalCost && (
                    <p className="text-muted-foreground text-[11px] line-through">
                      ${booking.totalCost.toFixed(2)}
                    </p>
                  )}
                </DetailField>

                {booking.stylistPreference && (
                  <DetailField icon={Scissors} label="Stylist">
                    <p className="text-sm font-medium">
                      {booking.stylistPreference}
                    </p>
                  </DetailField>
                )}

                {booking.trainerId && (
                  <DetailField icon={User} label="Trainer">
                    <p className="text-sm font-medium">{booking.trainerId}</p>
                  </DetailField>
                )}

                <DetailField icon={DollarSign} label="Payment Status">
                  <StatusBadge type="status" value={booking.paymentStatus} />
                </DetailField>
              </div>
            </CardContent>
          </Card>

          {/* Special Requests — Editable */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4" />
                  Special Requests
                </CardTitle>
                {isEditable && !editingRequests && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px]"
                    onClick={() => setEditingRequests(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingRequests ? (
                <div className="space-y-2">
                  <Input
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Enter special requests..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingRequests(false);
                        toast.success("Special requests updated");
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditingRequests(false);
                        toast.success("Special requests updated");
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSpecialRequests(booking.specialRequests ?? "");
                        setEditingRequests(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    !specialRequests && "text-muted-foreground italic",
                  )}
                >
                  {specialRequests || "No special requests"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Add-ons & Retail Items */}
          <BookingAddOnsSection isEditable={isEditable} />

          {/* Care Instructions */}
          {selectedPet && (
            <CareInstructionsSection pet={selectedPet} service={service} />
          )}

          {/* Message History */}
          {client && (
            <MessageHistorySection
              clientId={client.id}
              clientName={client.name}
            />
          )}

          {/* Forms & Compliance */}
          {formRequirementsCheck && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4" />
                  Forms & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formRequirementsCheck.missing.map((m) => (
                    <div
                      key={m.formId}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
                        m.enforcement === "block"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800",
                      )}
                    >
                      {m.enforcement === "block" ? (
                        <Ban className="size-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0" />
                      )}
                      <span className="flex-1">{m.formName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {m.enforcement === "block" ? "Required" : "Recommended"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/50 mt-3 flex items-center gap-2 rounded-md px-3 py-2">
                  <CheckCircle className="text-muted-foreground size-3.5" />
                  <p className="text-muted-foreground text-xs">
                    {formRequirementsCheck.totalCompleted}/
                    {formRequirementsCheck.totalRequired} completed ·{" "}
                    {getStageLabel(formRequirementsCheck.stage)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* YipyyGo */}
          {yipyyGoEnabled && (
            <Card
              id="yipyygo"
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle className="size-4" />
                  YipyyGo Pre-Check-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <YipyyGoStatusBadge status={yipyyGoStatus} showIcon />
                  {(canReview || (yipyyGoEnabled && !yipyyGoForm)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setReviewModalOpen(true)}
                    >
                      {yipyyGoStatus === "approved"
                        ? "View form"
                        : yipyyGoForm
                          ? "Review form"
                          : "Review / complete"}
                    </Button>
                  )}
                </div>
                {yipyyGoEnabled && !yipyyGoForm && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    No form submitted yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BookingNotes />
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column — Invoice ── */}
        <div className="animate-in fade-in slide-in-from-right-3 duration-500">
          {booking.invoice ? (
            <InvoicePanel invoice={booking.invoice} />
          ) : (
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="size-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Status
                    </span>
                    <StatusBadge type="status" value={booking.paymentStatus} />
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">
                      Base Price
                    </span>
                    <span className="font-[tabular-nums] text-sm">
                      ${basePrice.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Discount
                      </span>
                      <span className="font-[tabular-nums] text-sm text-emerald-600">
                        -${discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-[tabular-nums] text-lg font-bold">
                      ${editedTotal.toFixed(2)}
                    </span>
                  </div>
                  {editedTotal !== booking.totalCost && (
                    <p className="text-muted-foreground text-right text-[11px] line-through">
                      Was ${booking.totalCost.toFixed(2)}
                    </p>
                  )}
                  {booking.paymentStatus !== "paid" && (
                    <Button
                      className="mt-2 w-full gap-1.5"
                      size="sm"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <DollarSign className="size-3.5" />
                      Accept Payment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Audit Trail ── */}
      <PageAuditTrail area="bookings" entityId={String(bookingId)} />

      {/* ── Modals ── */}
      <EditBookingModal
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(updated) => {
          setEditOpen(false);
          toast.success(
            `Booking #${updated.id} updated — total: $${updated.totalCost}`,
          );
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, method) => {
          setPaymentOpen(false);
          toast.success(`Payment accepted via ${method} for booking #${bId}`);
        }}
      />
      <CancelBookingModal
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(bId, reason) => {
          setCancelOpen(false);
          toast.success(`Booking #${bId} cancelled: ${reason}`);
        }}
      />
      <YipyyGoStaffReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={yipyyGoForm}
        bookingId={bookingId}
        facilityId={booking.facilityId}
        onApproved={() => router.refresh()}
      />
    </div>
  );
}
