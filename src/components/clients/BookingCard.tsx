"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Minus,
  X,
  Printer,
  Send,
  CreditCard,
  Ban,
  RotateCcw,
  Copy,
  Mail,
  Smartphone,
  FileText,
  ClipboardList,
  Tag,
  PawPrint,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  ShoppingBag,
  CalendarPlus,
  CalendarMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Booking, InvoiceLineItem } from "@/types/booking";
import type { Pet } from "@/types/pet";
import { products } from "@/data/retail";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";

// ========================================
// Helpers
// ========================================

function formatDateShort(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "confirmed":
      return {
        color: "bg-blue-500/10 text-blue-600 border-blue-200",
        dot: "bg-blue-500",
      };
    case "pending":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        dot: "bg-amber-500",
      };
    case "cancelled":
      return {
        color: "bg-red-500/10 text-red-600 border-red-200",
        dot: "bg-red-500",
      };
    default:
      return {
        color: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
}

// ========================================
// Add Item Popover
// ========================================

function AddItemPopover({ onAdd }: { onAdd: (item: InvoiceLineItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const retailSuggestions = products.slice(0, 5);

  const handleAdd = () => {
    if (!name || !price) return;
    onAdd({
      name,
      unitPrice: parseFloat(price),
      quantity: 1,
      price: parseFloat(price),
    });
    setName("");
    setPrice("");
    setShowCustom(false);
    setOpen(false);
  };

  const handleQuickAdd = (pName: string, pPrice: number) => {
    onAdd({ name: pName, unitPrice: pPrice, quantity: 1, price: pPrice });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium transition-colors">
          <Plus className="size-3" />
          Add
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Quick Add
        </p>
        <div className="mb-2 flex flex-wrap gap-1">
          {retailSuggestions.map((p) => (
            <button
              key={p.id}
              onClick={() => handleQuickAdd(p.name, p.basePrice)}
              className="hover:bg-foreground hover:text-background rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all"
            >
              {p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name} · $
              {p.basePrice}
            </button>
          ))}
        </div>
        {!showCustom ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => setShowCustom(true)}
          >
            Custom Item
          </Button>
        ) : (
          <div className="animate-in fade-in space-y-2 duration-150">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="h-7 text-xs"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
                className="h-7 flex-1 text-xs"
                min={0}
                step={0.01}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAdd}
                disabled={!name || !price}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ========================================
// Extend / Shorten Stay Popover
// ========================================

function ExtendStayPopover({
  mode,
  currentEndDate,
  nightlyRate,
  onApply,
}: {
  mode: "extend" | "shorten";
  currentEndDate: string;
  nightlyRate: number;
  onApply: (newEndDate: string, priceChange: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extraNights, setExtraNights] = useState(1);
  const isExtend = mode === "extend";
  const priceChange = extraNights * nightlyRate * (isExtend ? 1 : -1);
  const newEndDate = addDays(
    currentEndDate,
    isExtend ? extraNights : -extraNights,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          {isExtend ? (
            <CalendarPlus className="size-3" />
          ) : (
            <CalendarMinus className="size-3" />
          )}
          {isExtend ? "Extend" : "Shorten"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <p className="mb-2 text-xs font-medium">
          {isExtend ? "Add" : "Remove"} nights
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setExtraNights(Math.max(1, extraNights - 1))}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold">
            {extraNights}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => setExtraNights(extraNights + 1)}
          >
            <Plus className="size-3" />
          </Button>
          <span className="text-muted-foreground text-xs">nights</span>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">New check-out</span>
            <span className="font-medium">{formatDateShort(newEndDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price change</span>
            <span
              className={cn(
                "font-medium",
                isExtend ? "text-amber-600" : "text-emerald-600",
              )}
            >
              {isExtend ? "+" : ""}${priceChange.toFixed(2)}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3 h-7 w-full text-xs"
          onClick={() => {
            onApply(newEndDate, Math.abs(priceChange));
            setOpen(false);
            setExtraNights(1);
          }}
        >
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ========================================
// Compact Row (collapsed view)
// ========================================

function BookingCompactRow({
  booking,
  pet,
  total,
  remainingDue,
  endDate,
  onExpand,
}: {
  booking: Booking;
  pet?: Pet;
  total: number;
  remainingDue: number;
  endDate: string;
  onExpand: () => void;
}) {
  const sc = statusConfig(booking.status);
  const nights = nightsBetween(booking.startDate, endDate);
  const duration =
    nights > 0 ? `${nights} night${nights !== 1 ? "s" : ""}` : "Same day";

  return (
    <button
      onClick={onExpand}
      className="bg-card hover:bg-muted/50 group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          sc.color,
        )}
      >
        <div className={cn("size-2 rounded-full", sc.dot)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">
            {booking.service}
          </span>
          {pet && (
            <span className="text-muted-foreground text-xs">• {pet.name}</span>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px] capitalize", sc.color)}
          >
            {booking.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDateShort(booking.startDate)}
          {booking.startDate !== endDate &&
            ` → ${formatDateShort(endDate)}`} · {duration}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">${total.toFixed(2)}</p>
        {remainingDue > 0 && (
          <p className="text-xs font-medium text-amber-600">
            Due: ${remainingDue.toFixed(2)}
          </p>
        )}
        {booking.paymentStatus === "paid" && remainingDue <= 0 && (
          <p className="text-xs text-emerald-600">Paid</p>
        )}
      </div>
      <ChevronDown className="text-muted-foreground/50 group-hover:text-foreground size-4 shrink-0 transition-colors" />
    </button>
  );
}

// ========================================
// Expanded Card
// ========================================

function BookingExpandedCard({
  booking,
  pet,
  pets,
  onCollapse,
  bookingIndex,
  totalBookings,
}: {
  booking: Booking;
  pet?: Pet;
  pets: Pet[];
  onCollapse: () => void;
  bookingIndex: number;
  totalBookings: number;
}) {
  const sc = statusConfig(booking.status);
  const invoice = booking.invoice;
  const isCancelled = booking.status === "cancelled";
  const isPaid = booking.paymentStatus === "paid";

  // Permission model
  const canAddItems = !isCancelled;
  const canRemoveItems =
    booking.status === "confirmed" || booking.status === "pending";
  const canEditDates =
    booking.status === "confirmed" || booking.status === "pending";
  const canExtendStay = !isCancelled;

  // Editable state
  const [startDate, setStartDate] = useState(booking.startDate);
  const [endDate, setEndDate] = useState(booking.endDate);
  const [checkInTime, setCheckInTime] = useState(booking.checkInTime ?? "");
  const [checkOutTime, setCheckOutTime] = useState(booking.checkOutTime ?? "");
  const [kennel, setKennel] = useState(booking.kennel ?? "");
  const [selectedPetId, setSelectedPetId] = useState(
    Array.isArray(booking.petId) ? booking.petId[0] : booking.petId,
  );
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pet;
  const nights = nightsBetween(startDate, endDate);

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Invoice line items
  const [items, setItems] = useState<InvoiceLineItem[]>(
    invoice?.items ?? [
      {
        name: `${booking.service} — ${booking.serviceType?.replace("_", " ") ?? "standard"}`,
        unitPrice: booking.basePrice,
        quantity: nights > 0 ? nights : 1,
        price: booking.basePrice * (nights > 0 ? nights : 1),
      },
    ],
  );
  const [fees, setFees] = useState<InvoiceLineItem[]>(invoice?.fees ?? []);

  const subtotal =
    items.reduce((s, i) => s + i.price, 0) +
    fees.reduce((s, f) => s + f.price, 0);
  const discount = invoice?.discount ?? booking.discount;
  const taxRate = invoice?.taxRate ?? 0;
  const taxAmount = (subtotal - discount) * taxRate;
  const total = subtotal - discount + taxAmount;
  const depositCollected = invoice?.depositCollected ?? 0;
  const remainingDue = total - depositCollected;
  const additionalDue = isPaid && remainingDue > 0 ? remainingDue : 0;

  const nightlyRate =
    items.length > 0 && items[0].quantity > 0
      ? items[0].unitPrice
      : booking.basePrice;

  const handleAddItem = (item: InvoiceLineItem) => {
    setItems((prev) => [...prev, item]);
    toast.success(`Added "${item.name}" · $${item.price.toFixed(2)}`);
  };

  const handleRemoveItem = (idx: number) => {
    const removed = items[idx];
    setItems((prev) => prev.filter((_, i) => i !== idx));
    toast.success(`Removed "${removed.name}"`);
  };

  const handleExtendStay = (newEnd: string, extraCost: number) => {
    setEndDate(newEnd);
    const newNights = nightsBetween(startDate, newEnd);
    // Update first item quantity
    setItems((prev) =>
      prev.map((item, i) =>
        i === 0
          ? {
              ...item,
              quantity: newNights > 0 ? newNights : 1,
              price: item.unitPrice * (newNights > 0 ? newNights : 1),
            }
          : item,
      ),
    );
    toast.success(
      `Stay extended to ${formatDateShort(newEnd)} · +$${extraCost.toFixed(2)}`,
    );
  };

  const handleShortenStay = (newEnd: string, savings: number) => {
    setEndDate(newEnd);
    const newNights = nightsBetween(startDate, newEnd);
    setItems((prev) =>
      prev.map((item, i) =>
        i === 0
          ? {
              ...item,
              quantity: newNights > 0 ? newNights : 1,
              price: item.unitPrice * (newNights > 0 ? newNights : 1),
            }
          : item,
      ),
    );
    toast.success(
      `Stay shortened to ${formatDateShort(newEnd)} · -$${savings.toFixed(2)}`,
    );
  };

  // Form status
  const formStatuses = [
    { label: "Intake", ok: true },
    {
      label: "Vaccination",
      ok: selectedPet?.petStatus !== "inactive",
    },
    { label: "Waiver", ok: bookingIndex % 3 !== 2 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-top-1 bg-card overflow-hidden rounded-lg border shadow-sm duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              sc.color,
            )}
          >
            <div className={cn("size-2 rounded-full", sc.dot)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Booking #{booking.id}</h4>
              <Badge
                variant="outline"
                className={cn("text-[10px] capitalize", sc.color)}
              >
                {booking.status}
              </Badge>
              {additionalDue > 0 && (
                <Badge className="border-amber-200 bg-amber-100 text-[10px] text-amber-700">
                  +${additionalDue.toFixed(2)} due
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-[11px]">
              {bookingIndex + 1} of {totalBookings} ·{" "}
              {selectedPet
                ? `${selectedPet.name} (${selectedPet.breed})`
                : "Unknown pet"}
            </p>
          </div>
        </div>
        <button
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
          {/* Service */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Service
            </p>
            {canAddItems ? (
              <Select
                defaultValue={booking.service}
                onValueChange={(v) => toast.success(`Service changed to ${v}`)}
              >
                <SelectTrigger className="h-8 w-full text-xs">
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
          </div>

          {/* Dates — editable */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Dates
            </p>
            {canEditDates ? (
              <div className="space-y-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    toast.success("Check-in date updated");
                  }}
                  className="h-7 text-[11px]"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    toast.success("Check-out date updated");
                  }}
                  className="h-7 text-[11px]"
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {formatDateShort(startDate)}
                  {startDate !== endDate && ` → ${formatDateShort(endDate)}`}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {nights > 0
                    ? `${nights} night${nights !== 1 ? "s" : ""}`
                    : "Same day"}
                </p>
              </>
            )}
          </div>

          {/* Pet */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Pet
            </p>
            {canAddItems && pets.length > 1 ? (
              <Select
                value={String(selectedPetId)}
                onValueChange={(v) => {
                  setSelectedPetId(Number(v));
                  const p = pets.find((pp) => pp.id === Number(v));
                  toast.success(`Pet changed to ${p?.name}`);
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-1.5">
                        <PawPrint className="size-3" />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-1.5">
                <PawPrint className="text-muted-foreground size-3.5" />
                <span className="text-sm font-medium">
                  {selectedPet?.name ?? "—"}
                </span>
              </div>
            )}
            {selectedPet && (
              <p className="text-muted-foreground text-[11px]">
                {selectedPet.breed} · {selectedPet.weight} lbs
              </p>
            )}
          </div>

          {/* Times — editable */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Times
            </p>
            {canEditDates ? (
              <div className="space-y-1">
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => {
                    setCheckInTime(e.target.value);
                    toast.success("Check-in time updated");
                  }}
                  className="h-7 text-[11px]"
                />
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => {
                    setCheckOutTime(e.target.value);
                    toast.success("Check-out time updated");
                  }}
                  className="h-7 text-[11px]"
                />
              </div>
            ) : (
              <p className="text-sm font-medium">
                {checkInTime || "—"} — {checkOutTime || "—"}
              </p>
            )}
          </div>

          {/* Room / Kennel */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              <MapPin className="mr-0.5 inline size-3" />
              Room
            </p>
            {canAddItems ? (
              <Select
                value={kennel || "none"}
                onValueChange={(v) => {
                  setKennel(v === "none" ? "" : v);
                  toast.success(
                    v === "none" ? "Room unassigned" : `Room → ${v}`,
                  );
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Assign..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectItem value="Kennel 1">Kennel 1</SelectItem>
                  <SelectItem value="Kennel 2">Kennel 2</SelectItem>
                  <SelectItem value="Suite A">Suite A</SelectItem>
                  <SelectItem value="Suite B">Suite B</SelectItem>
                  <SelectItem value="Run 1">Run 1</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{kennel || "—"}</p>
            )}
          </div>
        </div>

        {/* Extend / Shorten + Form status */}
        <div className="flex flex-wrap items-center gap-2">
          {canExtendStay && (
            <>
              <ExtendStayPopover
                mode="extend"
                currentEndDate={endDate}
                nightlyRate={nightlyRate}
                onApply={handleExtendStay}
              />
              {canEditDates && nights > 1 && (
                <ExtendStayPopover
                  mode="shorten"
                  currentEndDate={endDate}
                  nightlyRate={nightlyRate}
                  onApply={handleShortenStay}
                />
              )}
            </>
          )}
          <div className="flex-1" />
          {formStatuses.map((f) => (
            <div
              key={f.label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                f.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              {f.ok ? (
                <CheckCircle className="size-2.5" />
              ) : (
                <AlertTriangle className="size-2.5" />
              )}
              {f.label}
            </div>
          ))}
          {selectedPet?.allergies && selectedPet.allergies !== "None" && (
            <div className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              <ShieldCheck className="size-2.5" />
              Allergy: {selectedPet.allergies}
            </div>
          )}
        </div>

        {/* Services & Items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
              <ShoppingBag className="size-3" />
              Services & Items
            </p>
            {canAddItems && <AddItemPopover onAdd={handleAddItem} />}
          </div>
          <div className="bg-muted/30 rounded-md border">
            {items.map((item, idx) => (
              <div
                key={`item-${idx}`}
                className="group flex items-center justify-between border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {canRemoveItems && (
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="text-muted-foreground/0 hover:text-destructive group-hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  <span className="text-xs">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground">
                        {" "}
                        × {item.quantity}
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-[tabular-nums] text-xs font-medium">
                  ${item.price.toFixed(2)}
                </span>
              </div>
            ))}
            {fees.map((fee, idx) => (
              <div
                key={`fee-${idx}`}
                className="group flex items-center justify-between border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {canRemoveItems && (
                    <button
                      onClick={() =>
                        setFees((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground/0 hover:text-destructive group-hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  <span className="text-muted-foreground text-xs italic">
                    {fee.name}
                  </span>
                </div>
                <span className="font-[tabular-nums] text-xs font-medium">
                  ${fee.price.toFixed(2)}
                </span>
              </div>
            ))}
            {/* Summary */}
            <div className="space-y-1 border-t px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-[tabular-nums]">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>
                    Discount
                    {invoice?.discountLabel && ` (${invoice.discountLabel})`}
                  </span>
                  <span className="font-[tabular-nums]">
                    -${discount.toFixed(2)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Tax ({(taxRate * 100).toFixed(1)}%)
                  </span>
                  <span className="font-[tabular-nums]">
                    ${taxAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                <span>Total</span>
                <span className="font-[tabular-nums]">${total.toFixed(2)}</span>
              </div>
              {depositCollected > 0 && (
                <>
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Paid</span>
                    <span className="font-[tabular-nums]">
                      -${depositCollected.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex justify-between text-xs font-semibold",
                      remainingDue > 0 ? "text-amber-600" : "text-emerald-600",
                    )}
                  >
                    <span>{remainingDue > 0 ? "Remaining" : "Fully Paid"}</span>
                    <span className="font-[tabular-nums]">
                      {remainingDue > 0
                        ? `$${remainingDue.toFixed(2)}`
                        : "$0.00"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {/* Print */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
              >
                <Printer className="size-3" />
                Print
                <ChevronDown className="size-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  window.print();
                  toast.success("Print dialog opened");
                }}
              >
                <FileText className="size-4" />
                Invoice / Receipt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Care sheet sent to printer")}
              >
                <ClipboardList className="size-4" />
                Care Sheet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Kennel label sent to printer")}
              >
                <Tag className="size-4" />
                Kennel Label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send Invoice */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
              >
                <Send className="size-3" />
                Invoice
                <ChevronDown className="size-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => toast.success("Invoice emailed")}
              >
                <Mail className="size-4" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("SMS invoice link sent")}
              >
                <Smartphone className="size-4" />
                SMS Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://yipyy.com/invoice/${booking.id}`,
                  );
                  toast.success("Link copied");
                }}
              >
                <Copy className="size-4" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Accept Payment */}
          {(booking.paymentStatus !== "paid" || remainingDue > 0) &&
            !isCancelled && (
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="size-3" />
                {remainingDue > 0 && isPaid
                  ? `Pay $${remainingDue.toFixed(2)}`
                  : "Accept Payment"}
              </Button>
            )}

          <div className="flex-1" />

          {/* Edit (full modal) */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3" />
            Edit
          </Button>

          {/* Cancel */}
          {!isCancelled && booking.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-7 gap-1.5 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="size-3" />
              Cancel
            </Button>
          )}

          {/* Refund */}
          {isPaid && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <RotateCcw className="size-3" />
              Refund
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditBookingModal
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(updated) => {
          setEditOpen(false);
          toast.success(
            `Booking #${updated.id} updated — $${updated.totalCost}`,
          );
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, method) => {
          setPaymentOpen(false);
          toast.success(`Payment via ${method} for #${bId}`);
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
    </div>
  );
}

// ========================================
// Main Export
// ========================================

interface BookingCardProps {
  booking: Booking;
  pet?: Pet;
  pets: Pet[];
  bookingIndex: number;
  totalBookings: number;
}

export function BookingCard({
  booking,
  pet,
  pets,
  bookingIndex,
  totalBookings,
}: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Shared computed values for compact view
  const invoice = booking.invoice;
  const nights = nightsBetween(booking.startDate, booking.endDate);
  const total = invoice?.total ?? booking.basePrice * (nights > 0 ? nights : 1);
  const depositCollected = invoice?.depositCollected ?? 0;
  const remainingDue = total - depositCollected;

  if (expanded) {
    return (
      <BookingExpandedCard
        booking={booking}
        pet={pet}
        pets={pets}
        onCollapse={() => setExpanded(false)}
        bookingIndex={bookingIndex}
        totalBookings={totalBookings}
      />
    );
  }

  return (
    <BookingCompactRow
      booking={booking}
      pet={pet}
      total={total}
      remainingDue={
        booking.paymentStatus === "paid" && remainingDue <= 0 ? 0 : remainingDue
      }
      endDate={booking.endDate}
      onExpand={() => setExpanded(true)}
    />
  );
}
