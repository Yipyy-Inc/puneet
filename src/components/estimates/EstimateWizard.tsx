"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Sparkles,
  Check,
  ChevronRight,
  Search,
  FileText,
  Send,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Mail,
  Phone,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { clients } from "@/data/clients";
import { getNextEstimateId } from "@/data/estimates";
import { GuestContactForm } from "./GuestContactForm";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import type { EstimateLineItem } from "@/types/booking";

interface EstimateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
}

const STEPS = [
  { id: "client", title: "Client" },
  { id: "service", title: "Service" },
  { id: "details", title: "Details" },
  { id: "review", title: "Review & Send" },
];

export function EstimateWizard({
  open,
  onOpenChange,
  facilityId,
}: EstimateWizardProps) {
  const [step, setStep] = useState(0);

  // Client selection
  const [isGuest, setIsGuest] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Guest contact
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPetNames, setGuestPetNames] = useState<string[]>([""]);
  const [publicNote, setPublicNote] = useState("");
  const [createAccount, setCreateAccount] = useState(true);

  // Service
  const [selectedService, setSelectedService] = useState("");

  // Details
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [roomType, setRoomType] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [internalNote, setInternalNote] = useState("");

  // Completion
  const [created, setCreated] = useState(false);
  const [sent, setSent] = useState(false);
  const [generatedEstimateId, setGeneratedEstimateId] = useState<string | null>(
    null,
  );

  const facilityClients = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.facility === "Example Pet Care Facility" && c.status !== "prospect",
      ),
    [],
  );

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return facilityClients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return facilityClients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [clientSearch, facilityClients]);

  const selectedClient = facilityClients.find((c) => c.id === selectedClientId);

  const guestPetSummary = useMemo(
    () => guestPetNames.map((name) => name.trim()).filter(Boolean),
    [guestPetNames],
  );

  const resolvedGuestPetNames = useMemo(
    () => (guestPetNames.length > 0 ? guestPetNames : [""]),
    [guestPetNames],
  );

  const handleGuestPetNameChange = (index: number, value: string) => {
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      names[index] = value;
      return names;
    });
  };

  const addGuestPetField = () => {
    setGuestPetNames((prev) => [...(prev.length > 0 ? prev : [""]), ""]);
  };

  const removeGuestPetField = (index: number) => {
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      if (names.length <= 1) return names;
      const next = names.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  // Auto-generate line items from service details
  const autoLineItems = useMemo((): EstimateLineItem[] => {
    if (!selectedService || !startDate) return [];
    const svc = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
    const price = svc?.basePrice ?? 45;
    const items: EstimateLineItem[] = [];

    if (selectedService === "boarding" && startDate && endDate) {
      const roomPrices: Record<string, number> = {
        Standard: 35,
        Deluxe: 50,
        "Luxury Suite": 65,
      };
      const nightlyRate = roomPrices[roomType] ?? price;
      const nights = Math.max(
        1,
        Math.round(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            86400000,
        ),
      );
      items.push({
        label: roomType ? `${roomType} Room` : "Boarding Room",
        description: `${nights} night${nights !== 1 ? "s" : ""} @ $${nightlyRate}/night`,
        amount: nightlyRate,
        quantity: nights,
        total: nightlyRate * nights,
      });
    } else {
      items.push({
        label: svc?.name ?? selectedService,
        description: `${svc?.name ?? selectedService} service`,
        amount: price,
        quantity: 1,
        total: price,
      });
    }
    return items;
  }, [selectedService, startDate, endDate, roomType]);

  // Merge auto + custom line items
  const allLineItems = lineItems.length > 0 ? lineItems : autoLineItems;
  const subtotal = allLineItems.reduce((s, li) => s + li.total, 0);
  const taxRate = 0.05;
  const taxAmount = (subtotal - discount) * taxRate;
  const total = subtotal - discount + taxAmount;

  const canProceed = () => {
    switch (step) {
      case 0:
        if (isGuest) return !!guestName.trim() && !!guestEmail.trim();
        return !!selectedClientId;
      case 1:
        return !!selectedService;
      case 2:
        if (selectedService === "boarding")
          return !!startDate && !!endDate && !!roomType;
        return !!startDate;
      case 3:
        if (isGuest) return !!guestName.trim() && !!guestEmail.trim();
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 2 && lineItems.length === 0) {
      setLineItems(autoLineItems);
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleCreate = () => {
    const newId = getNextEstimateId();
    setGeneratedEstimateId(newId);
    setCreated(true);
    toast.success(`Estimate ${newId} created`);
  };

  const handleSend = () => {
    setSent(true);
    toast.success(
      `Estimate sent to ${isGuest ? guestEmail : selectedClient?.email}`,
    );
  };

  const handleClose = () => {
    setStep(0);
    setIsGuest(false);
    setSelectedClientId(null);
    setSelectedService("");
    setStartDate("");
    setEndDate("");
    setRoomType("");
    setLineItems([]);
    setDiscount(0);
    setCreated(false);
    setSent(false);
    setGeneratedEstimateId(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestPetNames([""]);
    setPublicNote("");
    setInternalNote("");
    onOpenChange(false);
  };

  const addCustomLineItem = () => {
    setLineItems([
      ...allLineItems,
      { label: "Custom Item", amount: 0, quantity: 1, total: 0 },
    ]);
  };

  const updateLineItem = (idx: number, patch: Partial<EstimateLineItem>) => {
    const updated = [...allLineItems];
    const item = { ...updated[idx], ...patch };
    item.total = item.amount * item.quantity;
    updated[idx] = item;
    setLineItems(updated);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(allLineItems.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Create Estimate</DialogTitle>

        {/* Header */}
        <div className="shrink-0 border-b px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="size-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {created ? "Estimate Ready" : "New Estimate"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {created
                  ? "Review and send to customer"
                  : `Step ${step + 1} of ${STEPS.length}`}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          {!created && (
            <div className="mt-4 flex gap-1">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    i <= step ? "bg-blue-500" : "bg-slate-200",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            {/* Success screens */}
            {created && !sent && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
                  <Check className="size-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold">Estimate Created</h3>
                {generatedEstimateId && (
                  <Badge
                    variant="outline"
                    className="font-mono text-xs tracking-wider"
                  >
                    {generatedEstimateId}
                  </Badge>
                )}
                <p className="text-muted-foreground max-w-sm text-sm">
                  for{" "}
                  <span className="font-medium text-slate-700">
                    {isGuest ? guestName : selectedClient?.name}
                  </span>
                  {isGuest &&
                    guestPetSummary.length > 0 &&
                    ` — ${guestPetSummary.join(", ")}`}
                </p>
                <div className="rounded-xl border bg-slate-50 px-6 py-3">
                  <p className="text-xl font-bold tabular-nums">
                    ${total.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Estimated total
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Save as Draft
                  </Button>
                  <Button className="gap-1.5" onClick={handleSend}>
                    <Send className="size-4" />
                    Send to Customer
                  </Button>
                </div>
              </div>
            )}

            {created && sent && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="size-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold">Estimate Sent!</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Sent to{" "}
                  <span className="font-medium text-slate-700">
                    {isGuest ? guestEmail : selectedClient?.email}
                  </span>
                </p>
                {isGuest && createAccount && (
                  <Badge className="bg-blue-50 text-blue-700">
                    Customer account created
                  </Badge>
                )}
                <Button className="mt-2" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}

            {/* Step 0: Client */}
            {!created && step === 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Who is this estimate for?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(false);
                      setSelectedClientId(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                      !isGuest
                        ? "border-blue-400 bg-blue-50/50 shadow-sm"
                        : "border-slate-200 hover:border-blue-200",
                    )}
                  >
                    <User className="size-6 text-blue-500" />
                    <span className="text-sm font-semibold">
                      Existing Client
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Search your client database
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(true);
                      setSelectedClientId(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                      isGuest
                        ? "border-violet-400 bg-violet-50/50 shadow-sm"
                        : "border-slate-200 hover:border-violet-200",
                    )}
                  >
                    <Sparkles className="size-6 text-violet-500" />
                    <span className="text-sm font-semibold">New Inquiry</span>
                    <span className="text-muted-foreground text-[11px]">
                      No account yet — add info later
                    </span>
                  </button>
                </div>

                {/* Client search */}
                {!isGuest && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients..."
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClientId(c.id)}
                          className={cn(
                            "flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-0",
                            selectedClientId === c.id
                              ? "bg-blue-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                            {c.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {c.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {c.email}
                            </p>
                          </div>
                          {selectedClientId === c.id && (
                            <Check className="size-4 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guest inquiry details */}
                {isGuest && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold">New Inquiry</h3>

                    <div className="space-y-4 rounded-xl border bg-slate-50/40 p-4">
                      <h4 className="text-base font-semibold">
                        Contact Information
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <User className="size-3.5" /> Name *
                          </Label>
                          <Input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Customer name"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <Mail className="size-3.5" /> Email *
                          </Label>
                          <Input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <Phone className="size-3.5" /> Phone
                          </Label>
                          <Input
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border bg-violet-50/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="flex items-center gap-1.5 text-base font-semibold">
                            <PawPrint className="size-4" /> Pet Information
                          </h4>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Add one or more pets to include in this estimate.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs"
                          onClick={addGuestPetField}
                        >
                          <Plus className="size-3" />
                          Add pet
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {resolvedGuestPetNames.map((petName, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-violet-100 text-xs font-semibold text-violet-700">
                              {index + 1}
                            </div>
                            <Input
                              value={petName}
                              onChange={(e) =>
                                handleGuestPetNameChange(index, e.target.value)
                              }
                              placeholder={`Pet ${index + 1} name (optional)`}
                              className="bg-white"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-red-500"
                              disabled={resolvedGuestPetNames.length <= 1}
                              onClick={() => removeGuestPetField(index)}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Remove pet</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Service */}
            {!created && step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Select a service</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_CATEGORIES.filter(
                    (s) => s.id !== "retail" && s.id !== "store",
                  ).map((svc) => {
                    const Icon = svc.icon;
                    const selected = selectedService === svc.id;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setSelectedService(svc.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                          selected
                            ? "border-blue-400 bg-blue-50/50 shadow-sm"
                            : "border-slate-200 hover:border-blue-200 hover:shadow-sm",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg",
                            selected ? "bg-blue-100" : "bg-slate-100",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5",
                              selected ? "text-blue-600" : "text-slate-400",
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{svc.name}</p>
                          <p className="text-muted-foreground text-[11px]">
                            from ${svc.basePrice}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {!created && step === 2 && (
              <div className="space-y-5">
                <h3 className="font-semibold">Service Details</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {selectedService === "boarding"
                        ? "Check-in Date"
                        : "Date"}
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  {selectedService === "boarding" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        Check-out Date
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Check-in Time
                    </Label>
                    <Input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Check-out Time
                    </Label>
                    <Input
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                    />
                  </div>
                </div>

                {selectedService === "boarding" && (
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select value={roomType} onValueChange={setRoomType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">
                          Standard Room — $35/night
                        </SelectItem>
                        <SelectItem value="Deluxe">
                          Deluxe Room — $50/night
                        </SelectItem>
                        <SelectItem value="Luxury Suite">
                          Luxury Suite — $65/night
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Preview line items */}
                {autoLineItems.length > 0 && (
                  <div className="rounded-xl border bg-slate-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                      Estimated pricing
                    </p>
                    {autoLineItems.map((li, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{li.label}</span>
                        <span className="font-semibold tabular-nums">
                          ${li.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & Send */}
            {!created && step === 3 && (
              <div className="space-y-5">
                {/* Line items editor */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Line Items</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={addCustomLineItem}
                    >
                      <Plus className="size-3" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {allLineItems.map((li, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <Input
                          value={li.label}
                          onChange={(e) =>
                            updateLineItem(i, { label: e.target.value })
                          }
                          className="h-8 min-w-0 flex-1 text-sm"
                        />
                        <Input
                          type="number"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(i, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="h-8 w-16 text-center text-sm"
                        />
                        <span className="text-muted-foreground text-xs">x</span>
                        <Input
                          type="number"
                          value={li.amount}
                          onChange={(e) =>
                            updateLineItem(i, {
                              amount: Number(e.target.value),
                            })
                          }
                          className="h-8 w-20 text-sm"
                          step="0.01"
                        />
                        <span className="w-20 text-right text-sm font-semibold tabular-nums">
                          ${li.total.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(i)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="h-7 w-24 text-right text-sm"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(taxRate * 100).toFixed(0)}%)
                    </span>
                    <span className="tabular-nums">
                      ${taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Internal note */}
                <div className="space-y-2">
                  <Label>Internal Note (staff only)</Label>
                  <Textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Notes visible only to staff..."
                    rows={2}
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Guest contact form */}
                {isGuest && (
                  <GuestContactForm
                    name={guestName}
                    setName={setGuestName}
                    email={guestEmail}
                    setEmail={setGuestEmail}
                    phone={guestPhone}
                    setPhone={setGuestPhone}
                    guestPetNames={guestPetNames}
                    setGuestPetNames={setGuestPetNames}
                    publicNote={publicNote}
                    setPublicNote={setPublicNote}
                    createAccount={createAccount}
                    setCreateAccount={setCreateAccount}
                  />
                )}

                {/* Existing client recipient */}
                {!isGuest && selectedClient && (
                  <div className="rounded-xl border bg-blue-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                      Send to
                    </p>
                    <p className="text-sm font-semibold">
                      {selectedClient.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {selectedClient.email} · {selectedClient.phone}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {!created && (
          <div className="flex shrink-0 justify-between border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              {step === STEPS.length - 1 ? (
                <Button
                  onClick={handleCreate}
                  disabled={!canProceed()}
                  className="gap-1.5 bg-blue-500 hover:bg-blue-600"
                >
                  <FileText className="size-4" />
                  {isGuest && createAccount
                    ? "Create Account & Estimate"
                    : "Create Estimate"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
