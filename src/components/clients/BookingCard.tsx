"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Printer,
  Send,
  CreditCard,
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
  XCircle,
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
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right text-xs font-medium">{children}</span>
    </div>
  );
}

function AddItemPopover({ onAdd }: { onAdd: (item: InvoiceLineItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const retailSuggestions = products.slice(0, 4);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="size-3" />
          Add Item
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {retailSuggestions.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onAdd({
                  name: p.name,
                  unitPrice: p.basePrice,
                  quantity: 1,
                  price: p.basePrice,
                });
                setOpen(false);
                toast.success(`Added "${p.name}"`);
              }}
              className="hover:bg-foreground hover:text-background rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all"
            >
              ${p.basePrice}
            </button>
          ))}
        </div>
        <div className="space-y-2">
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
              disabled={!name || !price}
              onClick={() => {
                onAdd({
                  name,
                  unitPrice: parseFloat(price),
                  quantity: 1,
                  price: parseFloat(price),
                });
                setName("");
                setPrice("");
                setOpen(false);
                toast.success(`Added "${name}"`);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ========================================
// Compact Row
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
  const total = booking.invoice?.total ?? booking.totalCost;

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
        <p className="text-sm font-semibold">${total.toFixed(2)}</p>
        {booking.paymentStatus === "paid" ? (
          <p className="text-xs text-emerald-600">Paid</p>
        ) : (
          <p className="text-muted-foreground text-xs capitalize">
            {booking.paymentStatus}
          </p>
        )}
      </div>
      <ChevronDown className="text-muted-foreground/50 group-hover:text-foreground size-4 shrink-0 transition-colors" />
    </button>
  );
}

// ========================================
// Expanded Card — READ-ONLY
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
  const nights = nightsBetween(booking.startDate, booking.endDate);
  const isCancelled = booking.status === "cancelled";
  const isPaid = booking.paymentStatus === "paid";

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<InvoiceLineItem[]>([]);

  const baseItems = invoice?.items ?? [
    {
      name: `${booking.service} — ${booking.serviceType?.replace("_", " ") ?? "standard"}`,
      unitPrice: booking.basePrice,
      quantity: nights > 0 ? nights : 1,
      price: booking.basePrice * (nights > 0 ? nights : 1),
    },
  ];
  const allItems = [...baseItems, ...addedItems];
  const fees = invoice?.fees ?? [];
  const subtotal =
    allItems.reduce((s, i) => s + i.price, 0) +
    fees.reduce((s, f) => s + f.price, 0);
  const discount = invoice?.discount ?? booking.discount;
  const taxRate = invoice?.taxRate ?? 0;
  const taxAmount = (subtotal - discount) * taxRate;
  const total = subtotal - discount + taxAmount;
  const depositCollected = invoice?.depositCollected ?? 0;
  const remainingDue = total - depositCollected;

  const selectedPet =
    pets.find(
      (p) =>
        p.id ===
        (Array.isArray(booking.petId) ? booking.petId[0] : booking.petId),
    ) ?? pet;

  const formStatuses = [
    { label: "Intake", ok: true },
    { label: "Vaccination", ok: selectedPet?.petStatus !== "inactive" },
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
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3" />
            Edit
          </Button>
          {!isCancelled && (
            <AddItemPopover
              onAdd={(item) => setAddedItems((p) => [...p, item])}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Printer className="size-3" />
                <ChevronDown className="size-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => window.print()}>
                <FileText className="size-4" />
                Invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Care sheet printed")}
              >
                <ClipboardList className="size-4" />
                Care Sheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Label printed")}>
                <Tag className="size-4" />
                Kennel Label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Send className="size-3" />
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
              <DropdownMenuItem onClick={() => toast.success("SMS sent")}>
                <Smartphone className="size-4" />
                SMS
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://yipyy.com/invoice/${booking.id}`,
                  );
                  toast.success("Copied");
                }}
              >
                <Copy className="size-4" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isPaid && !isCancelled && (
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setPaymentOpen(true)}
            >
              <CreditCard className="size-3" />
              Payment
            </Button>
          )}
          <div className="flex-1" />
          {isPaid && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <RotateCcw className="size-3" />
              Refund
            </Button>
          )}
          {!isCancelled && booking.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-7 gap-1 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="size-3" />
              Cancel
            </Button>
          )}
        </div>

        {/* Read-only details */}
        <div className="divide-y rounded-md border px-3">
          <InfoRow label="Service">
            <span className="capitalize">{booking.service}</span>
          </InfoRow>
          <InfoRow label="Arriving">
            {formatDateLong(booking.startDate)}
            {booking.checkInTime && ` at ${booking.checkInTime}`}
          </InfoRow>
          <InfoRow label="Departing">
            {formatDateLong(booking.endDate)}
            {booking.checkOutTime && ` at ${booking.checkOutTime}`}
          </InfoRow>
          <InfoRow label="Duration">
            {nights > 0
              ? `${nights} night${nights !== 1 ? "s" : ""}`
              : "Same day"}
          </InfoRow>
          {booking.kennel && <InfoRow label="Room">{booking.kennel}</InfoRow>}
          {booking.specialRequests && (
            <InfoRow label="Requests">
              <span className="max-w-[180px] text-right italic">
                {booking.specialRequests}
              </span>
            </InfoRow>
          )}
        </div>

        {/* Pet */}
        {selectedPet && (
          <div className="flex items-start gap-3 rounded-md border px-3 py-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
              <PawPrint className="text-primary size-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">
                  {selectedPet.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {selectedPet.breed} · {selectedPet.weight} lbs
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {formStatuses.map((f) => (
                  <div
                    key={f.label}
                    className={cn(
                      "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                      f.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    {f.ok ? (
                      <CheckCircle className="size-2" />
                    ) : (
                      <AlertTriangle className="size-2" />
                    )}
                    {f.label}
                  </div>
                ))}
                {selectedPet.allergies && selectedPet.allergies !== "None" && (
                  <div className="flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
                    <ShieldCheck className="size-2" />
                    {selectedPet.allergies}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charges */}
        <div className="rounded-md border">
          <div className="bg-muted/30 border-b px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Services & Charges
            </p>
          </div>
          {allItems.map((item, idx) => (
            <div
              key={`item-${idx}`}
              className="flex items-center justify-between border-b px-3 py-1.5 last:border-b-0"
            >
              <span className="text-xs">
                {item.name}
                {item.quantity > 1 && (
                  <span className="text-muted-foreground">
                    {" "}
                    × {item.quantity}
                  </span>
                )}
                {idx >= baseItems.length && (
                  <Badge variant="outline" className="ml-1.5 text-[8px]">
                    New
                  </Badge>
                )}
              </span>
              <span className="font-[tabular-nums] text-xs font-medium">
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
          {fees.map((fee, idx) => (
            <div
              key={`fee-${idx}`}
              className="flex items-center justify-between border-b px-3 py-1.5 last:border-b-0"
            >
              <span className="text-muted-foreground text-xs italic">
                {fee.name}
              </span>
              <span className="font-[tabular-nums] text-xs font-medium">
                ${fee.price.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="bg-muted/20 space-y-0.5 border-t px-3 py-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-[tabular-nums]">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Discount</span>
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
                  <span>{remainingDue > 0 ? "Balance" : "Fully Paid"}</span>
                  <span className="font-[tabular-nums]">
                    ${Math.max(0, remainingDue).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditBookingModal
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(u) => {
          setEditOpen(false);
          toast.success(`Booking #${u.id} updated`);
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, m) => {
          setPaymentOpen(false);
          toast.success(`Payment via ${m} for #${bId}`);
        }}
      />
      <CancelBookingModal
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(bId, r) => {
          setCancelOpen(false);
          toast.success(`Booking #${bId} cancelled: ${r}`);
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
