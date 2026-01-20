"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Booking } from "@/lib/types";
import { clients } from "@/data/clients";

const TIME_STEP_MINUTES = 30;

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  if (!isValidTime(value)) return null;
  const [h, m] = value.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface EditBookingModalProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedBooking: Booking) => void;
}

export function EditBookingModal({
  booking,
  open,
  onOpenChange,
  onSave,
}: EditBookingModalProps) {
  const [formData, setFormData] = useState({
    service: booking.service,
    startDate: booking.startDate,
    endDate: booking.endDate,
    checkInTime: booking.checkInTime || "",
    checkOutTime: booking.checkOutTime || "",
    basePrice: booking.basePrice,
    discount: booking.discount,
    discountReason: booking.discountReason || "",
    specialRequests: booking.specialRequests || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

  const isSameDay =
    !!formData.startDate &&
    !!formData.endDate &&
    formData.startDate === formData.endDate;
  // For daycare/grooming (typically same-day), we enforce checkout > checkin.
  // For boarding across multiple days, times are "time-of-day" on different dates, so ordering isn't required.
  const requiresCheckoutAfterCheckin = formData.service !== "boarding" || isSameDay;

  const checkInMinutes = timeToMinutes(formData.checkInTime);
  const checkOutMinutes = timeToMinutes(formData.checkOutTime);
  const minCheckOutTime =
    requiresCheckoutAfterCheckin && checkInMinutes !== null
      ? minutesToTime(checkInMinutes + TIME_STEP_MINUTES)
      : undefined;
  const maxCheckInTime =
    requiresCheckoutAfterCheckin && checkOutMinutes !== null
      ? minutesToTime(checkOutMinutes - TIME_STEP_MINUTES)
      : undefined;
  const sameDayDurationMinutes =
    requiresCheckoutAfterCheckin &&
    checkInMinutes !== null &&
    checkOutMinutes !== null
      ? checkOutMinutes - checkInMinutes
      : null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    if (formData.basePrice < 0) {
      newErrors.basePrice = "Base price cannot be negative";
    }
    if (formData.discount < 0) {
      newErrors.discount = "Discount cannot be negative";
    }
    if (formData.discount > formData.basePrice) {
      newErrors.discount = "Discount cannot exceed base price";
    }
    if (formData.discount > 0 && !formData.discountReason.trim()) {
      newErrors.discountReason =
        "Discount reason is required when discount is applied";
    }

    // Times
    if (formData.checkInTime && !formData.checkOutTime) {
      newErrors.checkOutTime = "Check-out time is required";
    }
    if (formData.checkOutTime && !formData.checkInTime) {
      newErrors.checkInTime = "Check-in time is required";
    }
    if (formData.checkInTime && !isValidTime(formData.checkInTime)) {
      newErrors.checkInTime = "Invalid time format";
    }
    if (formData.checkOutTime && !isValidTime(formData.checkOutTime)) {
      newErrors.checkOutTime = "Invalid time format";
    }
    if (
      requiresCheckoutAfterCheckin &&
      checkInMinutes !== null &&
      checkOutMinutes !== null &&
      checkOutMinutes - checkInMinutes < TIME_STEP_MINUTES
    ) {
      newErrors.checkOutTime = `Check-out must be at least ${TIME_STEP_MINUTES} minutes after check-in`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const updatedBooking: Booking = {
      ...booking,
      ...formData,
      totalCost: formData.basePrice - formData.discount,
    };
    onSave(updatedBooking);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form data when opening modal
      setFormData({
        service: booking.service,
        startDate: booking.startDate,
        endDate: booking.endDate,
        checkInTime: booking.checkInTime || "",
        checkOutTime: booking.checkOutTime || "",
        basePrice: booking.basePrice,
        discount: booking.discount,
        discountReason: booking.discountReason || "",
        specialRequests: booking.specialRequests || "",
      });
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Service */}
            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <Select
                value={formData.service}
                onValueChange={(value) =>
                  setFormData({ ...formData, service: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daycare">Daycare</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <DatePicker
                  value={formData.startDate}
                  onValueChange={(next) => {
                    setFormData((prev) => {
                      if (!next) return { ...prev, startDate: "", endDate: "" };
                      return {
                        ...prev,
                        startDate: next,
                        endDate:
                          prev.endDate && prev.endDate < next ? next : prev.endDate,
                      };
                    });
                    setErrors((prev) => ({
                      ...prev,
                      startDate: "",
                      endDate: "",
                    }));
                  }}
                  placeholder="Select start date"
                  className={errors.startDate ? "border-destructive" : ""}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <DatePicker
                  value={formData.endDate}
                  min={formData.startDate || undefined}
                  disabled={!formData.startDate}
                  onValueChange={(next) => {
                    // Guard: never allow end date before start date
                    if (formData.startDate && next && next < formData.startDate) return;
                    setFormData((prev) => ({ ...prev, endDate: next }));
                    setErrors((prev) => ({ ...prev, endDate: "" }));
                  }}
                  placeholder="Select end date"
                  className={errors.endDate ? "border-destructive" : ""}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="checkInTime">Check-in Time</Label>
                <TimePicker
                  value={formData.checkInTime || undefined}
                  onValueChange={(nextCheckIn) => {
                    setFormData((prev) => {
                      if (!requiresCheckoutAfterCheckin) {
                        return { ...prev, checkInTime: nextCheckIn };
                      }
                      const nextCheckInMinutes = timeToMinutes(nextCheckIn);
                      const prevCheckOutMinutes = timeToMinutes(prev.checkOutTime);

                      // If checkout is missing/invalid or now before checkin, auto-bump it by step.
                      const shouldAutoBump =
                        nextCheckInMinutes !== null &&
                        (prevCheckOutMinutes === null ||
                          prevCheckOutMinutes - nextCheckInMinutes < TIME_STEP_MINUTES);

                      return {
                        ...prev,
                        checkInTime: nextCheckIn,
                        checkOutTime:
                          shouldAutoBump && nextCheckInMinutes !== null
                            ? minutesToTime(nextCheckInMinutes + TIME_STEP_MINUTES)
                            : prev.checkOutTime,
                      };
                    });
                    if (errors.checkInTime || errors.checkOutTime) {
                      setErrors((prev) => ({
                        ...prev,
                        checkInTime: "",
                        checkOutTime: "",
                      }));
                    }
                  }}
                  stepMinutes={TIME_STEP_MINUTES}
                  max={maxCheckInTime}
                  className={errors.checkInTime ? "border-destructive" : ""}
                />
                {errors.checkInTime && (
                  <p className="text-sm text-destructive">{errors.checkInTime}</p>
                )}
                {requiresCheckoutAfterCheckin && (
                  <p className="text-xs text-muted-foreground">
                    Increments of {TIME_STEP_MINUTES} minutes
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOutTime">Check-out Time</Label>
                <TimePicker
                  value={formData.checkOutTime || undefined}
                  onValueChange={(nextCheckOut) => {
                    setFormData((prev) => ({ ...prev, checkOutTime: nextCheckOut }));
                    if (errors.checkOutTime) {
                      setErrors((prev) => ({ ...prev, checkOutTime: "" }));
                    }
                  }}
                  stepMinutes={TIME_STEP_MINUTES}
                  min={minCheckOutTime}
                  className={errors.checkOutTime ? "border-destructive" : ""}
                />
                {errors.checkOutTime && (
                  <p className="text-sm text-destructive">{errors.checkOutTime}</p>
                )}
                {requiresCheckoutAfterCheckin && sameDayDurationMinutes !== null && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {(sameDayDurationMinutes / 60).toFixed(1)} hours
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    });
                    if (errors.basePrice) {
                      setErrors({ ...errors, basePrice: "" });
                    }
                  }}
                  className={errors.basePrice ? "border-destructive" : ""}
                  required
                />
                {errors.basePrice && (
                  <p className="text-sm text-destructive">{errors.basePrice}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount">Discount ($)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    });
                    if (errors.discount) {
                      setErrors({ ...errors, discount: "" });
                    }
                  }}
                  className={errors.discount ? "border-destructive" : ""}
                />
                {errors.discount && (
                  <p className="text-sm text-destructive">{errors.discount}</p>
                )}
              </div>
            </div>

            {/* Discount Reason */}
            {formData.discount > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="discountReason">Discount Reason</Label>
                <Input
                  id="discountReason"
                  value={formData.discountReason}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      discountReason: e.target.value,
                    });
                    if (errors.discountReason) {
                      setErrors({ ...errors, discountReason: "" });
                    }
                  }}
                  className={errors.discountReason ? "border-destructive" : ""}
                  placeholder="e.g., Loyalty discount, First-time customer"
                />
                {errors.discountReason && (
                  <p className="text-sm text-destructive">
                    {errors.discountReason}
                  </p>
                )}
              </div>
            )}

            {/* Total Cost */}
            <div className="grid gap-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <Label className="text-base">Total Cost</Label>
                <div className="text-2xl font-bold">
                  ${(formData.basePrice - formData.discount).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the errors above before saving.
                </AlertDescription>
              </Alert>
            )}

            {/* Special Requests */}
            <div className="grid gap-2">
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specialRequests: e.target.value,
                  })
                }
                rows={3}
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
