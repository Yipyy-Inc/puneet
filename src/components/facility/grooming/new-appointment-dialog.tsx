"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { cn } from "@/lib/utils";
import { DollarSign, Plus, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";

// ─── Add-on catalogue ─────────────────────────────────────────────────────────

const ADD_ONS = [
  { id: "ao-01", name: "Teeth Brushing", price: 15, duration: 10 },
  { id: "ao-02", name: "Nail Grinding", price: 12, duration: 10 },
  { id: "ao-03", name: "Blueberry Facial", price: 20, duration: 15 },
  { id: "ao-04", name: "De-shedding Treatment", price: 25, duration: 20 },
  { id: "ao-05", name: "Paw Balm Treatment", price: 10, duration: 10 },
  { id: "ao-06", name: "Anal Gland Expression", price: 18, duration: 10 },
  { id: "ao-07", name: "Flea Treatment", price: 22, duration: 15 },
  { id: "ao-08", name: "Bandana or Bow", price: 5, duration: 0 },
] as const;

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  petName: "",
  petBreed: "",
  petSize: "",
  coatType: "",
  packageId: "",
  stylistId: "",
  date: "",
  startTime: "09:00",
  specialInstructions: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
}: NewAppointmentDialogProps) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, date: defaultDate ?? "" });
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const { data: packages = [] } = useQuery(groomingQueries.packages());
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());

  const activeStylists = useMemo(
    () => stylistsData.filter((s) => s.status === "active"),
    [stylistsData],
  );

  const selectedPackage = packages.find((p) => p.id === form.packageId);

  // Auto-calculate price from pet size + selected package
  const basePrice = useMemo(() => {
    if (!selectedPackage || !form.petSize) return null;
    const sizeKey = form.petSize as keyof typeof selectedPackage.sizePricing;
    return selectedPackage.sizePricing?.[sizeKey] ?? selectedPackage.basePrice;
  }, [selectedPackage, form.petSize]);

  const addOnTotal = useMemo(
    () =>
      selectedAddOns.reduce((sum, id) => {
        const ao = ADD_ONS.find((a) => a.id === id);
        return sum + (ao?.price ?? 0);
      }, 0),
    [selectedAddOns],
  );

  const totalPrice = (basePrice ?? 0) + addOnTotal;

  // Filter stylists by package restrictions
  const eligibleStylists = useMemo(() => {
    if (!selectedPackage) return activeStylists;
    const { assignedStylistIds } = selectedPackage;
    if (!assignedStylistIds || assignedStylistIds.length === 0)
      return activeStylists;
    return activeStylists.filter((s) => assignedStylistIds.includes(s.id));
  }, [activeStylists, selectedPackage]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function handleClose() {
    setForm({ ...DEFAULT_FORM, date: defaultDate ?? "" });
    setSelectedAddOns([]);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (
      !form.ownerName ||
      !form.petName ||
      !form.petSize ||
      !form.packageId ||
      !form.stylistId ||
      !form.date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success(`Appointment booked for ${form.petName}`);
    handleClose();
  }

  const showAddOns = !!selectedPackage;
  const showPriceSummary = basePrice !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="size-4 text-pink-500" />
            New Grooming Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-1">
          {/* ── Client ── */}
          <section>
            <SectionHeading>Client</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Owner's full name"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="(514) 555-0100"
                  value={form.ownerPhone}
                  onChange={(e) => update("ownerPhone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="owner@email.com"
                  value={form.ownerEmail}
                  onChange={(e) => update("ownerEmail", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Pet ── */}
          <section>
            <SectionHeading>Pet</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  Pet Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Buddy"
                  value={form.petName}
                  onChange={(e) => update("petName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Breed</Label>
                <Input
                  placeholder="e.g. Golden Retriever"
                  value={form.petBreed}
                  onChange={(e) => update("petBreed", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Size <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.petSize}
                  onValueChange={(v) => update("petSize", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small — under 15 lbs</SelectItem>
                    <SelectItem value="medium">Medium — 15–40 lbs</SelectItem>
                    <SelectItem value="large">Large — 40–70 lbs</SelectItem>
                    <SelectItem value="giant">Giant — 70+ lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Coat Type</Label>
                <Select
                  value={form.coatType}
                  onValueChange={(v) => update("coatType", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select coat" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["short", "medium", "long", "wire", "curly", "double"] as const
                    ).map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Service ── */}
          <section>
            <SectionHeading>Service</SectionHeading>
            <div>
              <Label className="text-xs">
                Service <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.packageId}
                onValueChange={(v) => {
                  update("packageId", v);
                  // Reset groomer + add-ons when service changes
                  update("stylistId", "");
                  setSelectedAddOns([]);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {packages
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center justify-between w-full gap-6">
                          <span>{p.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {p.duration} min
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Service description + what's included */}
              {selectedPackage && (
                <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs">
                  <p className="text-muted-foreground mb-1.5">
                    {selectedPackage.description}
                  </p>
                  {selectedPackage.includes && selectedPackage.includes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPackage.includes.map((inc: string) => (
                        <Badge
                          key={inc}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {inc}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Add-ons — appear naturally after service selection ── */}
            {showAddOns && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="size-3.5 text-pink-500" />
                  <Label className="text-xs text-muted-foreground">
                    Want to add anything?{" "}
                    <span className="text-muted-foreground/60">Optional</span>
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ADD_ONS.map((ao) => {
                    const selected = selectedAddOns.includes(ao.id);
                    return (
                      <div
                        key={ao.id}
                        onClick={() => toggleAddOn(ao.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                          selected
                            ? "border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-950/20"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleAddOn(ao.id)}
                          className="pointer-events-none flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight truncate">
                            {ao.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            +${ao.price}
                            {ao.duration > 0 ? ` · ${ao.duration} min` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* ── Schedule ── */}
          <section>
            <SectionHeading>Schedule</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">
                  Groomer <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.stylistId}
                  onValueChange={(v) => update("stylistId", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Assign groomer" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleStylists.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPackage &&
                  selectedPackage.assignedStylistIds &&
                  selectedPackage.assignedStylistIds.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      This service requires a qualified groomer
                    </p>
                  )}
              </div>
              <div>
                <Label className="text-xs">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update("startTime", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Notes ── */}
          <section>
            <SectionHeading>Notes</SectionHeading>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">
                  Special Instructions / Allergies
                </Label>
                <Textarea
                  placeholder="Allergies, sensitivities, handling notes…"
                  value={form.specialInstructions}
                  onChange={(e) =>
                    update("specialInstructions", e.target.value)
                  }
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Internal Notes</Label>
                <Textarea
                  placeholder="Staff-only notes (not visible to client)"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* ── Price summary ── */}
          {showPriceSummary && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Estimated Total</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPackage?.name}
                    {selectedAddOns.length > 0
                      ? ` + ${selectedAddOns.length} add-on${selectedAddOns.length > 1 ? "s" : ""}`
                      : ""}
                    {form.petSize ? ` · ${form.petSize} dog` : ""}
                  </p>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <DollarSign className="size-4 text-muted-foreground self-center" />
                  <span className="text-2xl font-bold">{totalPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="size-4 mr-1.5" />
            Book Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
