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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Booking } from "@/data/bookings";
import { clients } from "@/data/clients";

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
                  <SelectItem value="vet">Vet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (errors.startDate) {
                      setErrors({ ...errors, startDate: "" });
                    }
                  }}
                  className={errors.startDate ? "border-destructive" : ""}
                  required
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    if (errors.endDate) {
                      setErrors({ ...errors, endDate: "" });
                    }
                  }}
                  className={errors.endDate ? "border-destructive" : ""}
                  required
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
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) =>
                    setFormData({ ...formData, checkInTime: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOutTime">Check-out Time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOutTime: e.target.value })
                  }
                />
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
