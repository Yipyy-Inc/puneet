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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Booking, InvoiceLineItem } from "@/types/booking";
import type { Pet } from "@/types/pet";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    setOpen(false);
    toast.success(`Added "${name}" to invoice`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium transition-colors">
          <Plus className="size-3" />
          Add
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium">Add Line Item</p>
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service or product name"
            className="h-7 text-xs"
          />
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="h-7 text-xs"
            min={0}
            step={0.01}
          />
        </div>
        <Button
          size="sm"
          className="mt-2 h-7 w-full text-xs"
          onClick={handleAdd}
          disabled={!name || !price}
        >
          Add Item
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
  onExpand,
}: {
  booking: Booking;
  pet?: Pet;
  onExpand: () => void;
}) {
  const sc = statusConfig(booking.status);
  const nights = nightsBetween(booking.startDate, booking.endDate);
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
          {booking.startDate !== booking.endDate &&
            ` → ${formatDateShort(booking.endDate)}`}{" "}
          · {duration}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold">
          ${booking.invoice?.total ?? booking.totalCost}
        </p>
        {booking.invoice && booking.invoice.remainingDue > 0 && (
          <p className="text-xs font-medium text-amber-600">
            Due: ${booking.invoice.remainingDue.toFixed(2)}
          </p>
        )}
        {booking.paymentStatus === "paid" &&
          (!booking.invoice || booking.invoice.remainingDue === 0) && (
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
  const nights = nightsBetween(booking.startDate, booking.endDate);
  const invoice = booking.invoice;
  const isEditable =
    booking.status === "confirmed" || booking.status === "pending";

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Inline item state
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

  const handleAddItem = (item: InvoiceLineItem) => {
    setItems((prev) => [...prev, item]);
    toast.success(`Booking updated — "${item.name}" added`);
  };

  const handleRemoveItem = (idx: number) => {
    const removed = items[idx];
    setItems((prev) => prev.filter((_, i) => i !== idx));
    toast.success(`Removed "${removed.name}" from invoice`);
  };

  const handleAddFee = (fee: InvoiceLineItem) => {
    setFees((prev) => [...prev, fee]);
    toast.success(`Fee "${fee.name}" added`);
  };

  const handleRemoveFee = (idx: number) => {
    const removed = fees[idx];
    setFees((prev) => prev.filter((_, i) => i !== idx));
    toast.success(`Removed fee "${removed.name}"`);
  };

  // Pet form status indicators
  const formStatuses = [
    { label: "Intake", ok: true },
    { label: "Vaccination", ok: pet?.petStatus !== "inactive" },
    { label: "Waiver", ok: bookingIndex % 3 !== 2 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-top-1 bg-card overflow-hidden rounded-lg border shadow-sm duration-200">
      {/* Header bar */}
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
            </div>
            <p className="text-muted-foreground text-[11px]">
              {bookingIndex + 1} of {totalBookings} ·{" "}
              {pet ? `${pet.name} (${pet.breed})` : "Unknown pet"}
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

      <div className="p-4">
        {/* Top details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
          {/* Service */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Service
            </p>
            {isEditable ? (
              <Select defaultValue={booking.service}>
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

          {/* Dates */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Dates
            </p>
            <p className="text-sm font-medium">
              {formatDateShort(booking.startDate)}
              {booking.startDate !== booking.endDate &&
                ` → ${formatDateShort(booking.endDate)}`}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {nights > 0
                ? `${nights} night${nights !== 1 ? "s" : ""}`
                : "Same day"}
            </p>
          </div>

          {/* Pet */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Pet
            </p>
            {isEditable && pets.length > 1 ? (
              <Select defaultValue={String(booking.petId)}>
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
                <span className="text-sm font-medium">{pet?.name ?? "—"}</span>
              </div>
            )}
            {pet && (
              <p className="text-muted-foreground text-[11px]">
                {pet.breed} · {pet.weight} lbs
              </p>
            )}
          </div>

          {/* Check-in / Check-out */}
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Times
            </p>
            <p className="text-sm font-medium">
              {booking.checkInTime} — {booking.checkOutTime}
            </p>
            {booking.specialRequests && (
              <p className="text-muted-foreground mt-0.5 max-w-[200px] truncate text-[11px] italic">
                {booking.specialRequests}
              </p>
            )}
          </div>
        </div>

        {/* Forms status row */}
        <div className="mt-3 flex flex-wrap gap-2">
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
          {pet?.allergies && pet.allergies !== "None" && (
            <div className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              <ShieldCheck className="size-2.5" />
              Allergy: {pet.allergies}
            </div>
          )}
        </div>

        {/* Invoice / Line Items */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Services & Items
            </p>
            {isEditable && <AddItemPopover onAdd={handleAddItem} />}
          </div>
          <div className="bg-muted/30 rounded-md border">
            {/* Items */}
            {items.map((item, idx) => (
              <div
                key={`item-${idx}`}
                className="group flex items-center justify-between border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {isEditable && (
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
                <span className="text-xs font-medium">
                  ${item.price.toFixed(2)}
                </span>
              </div>
            ))}
            {/* Fees */}
            {fees.map((fee, idx) => (
              <div
                key={`fee-${idx}`}
                className="group flex items-center justify-between border-b px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {isEditable && (
                    <button
                      onClick={() => handleRemoveFee(idx)}
                      className="text-muted-foreground/0 hover:text-destructive group-hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                  <span className="text-muted-foreground text-xs italic">
                    {fee.name}
                  </span>
                </div>
                <span className="text-xs font-medium">
                  ${fee.price.toFixed(2)}
                </span>
              </div>
            ))}
            {/* Summary */}
            <div className="space-y-1 border-t px-3 py-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>
                    Discount
                    {invoice?.discountLabel && ` (${invoice.discountLabel})`}
                  </span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Tax ({(taxRate * 100).toFixed(1)}%)
                  </span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {depositCollected > 0 && (
                <>
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Paid</span>
                    <span>-${depositCollected.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-amber-600">
                    <span>Remaining</span>
                    <span>${remainingDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
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
                onClick={() => toast.success("Printing invoice...")}
              >
                <FileText className="size-4" />
                Invoice / Receipt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Printing care sheet...")}
              >
                <ClipboardList className="size-4" />
                Care Sheet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Printing kennel label...")}
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
                Send Invoice
                <ChevronDown className="size-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => toast.success("Invoice emailed")}
              >
                <Mail className="size-4" />
                Email Invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("SMS invoice link sent")}
              >
                <Smartphone className="size-4" />
                SMS Invoice Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://yipyy.com/invoice/${booking.id}`,
                  );
                  toast.success("Invoice link copied");
                }}
              >
                <Copy className="size-4" />
                Copy Invoice Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Accept Payment */}
          {booking.paymentStatus !== "paid" &&
            booking.status !== "cancelled" && (
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="size-3" />
                Accept Payment
              </Button>
            )}

          <div className="flex-1" />

          {/* Edit */}
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3" />
              Edit
            </Button>
          )}

          {/* Cancel */}
          {isEditable && (
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
          {booking.paymentStatus === "paid" &&
            booking.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => toast.info("Refund flow would open here")}
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
            `Booking #${updated.id} updated — total: $${updated.totalCost}`,
          );
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(id, method) => {
          setPaymentOpen(false);
          toast.success(`Payment accepted via ${method} for booking #${id}`);
        }}
      />
      <CancelBookingModal
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(id, reason) => {
          setCancelOpen(false);
          toast.success(`Booking #${id} cancelled: ${reason}`);
        }}
      />
    </div>
  );
}

// ========================================
// Main Export: BookingCard
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
      onExpand={() => setExpanded(true)}
    />
  );
}
