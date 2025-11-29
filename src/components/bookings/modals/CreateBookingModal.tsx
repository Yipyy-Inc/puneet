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
import { Plus } from "lucide-react";
import { clients } from "@/data/clients";
import type { Booking } from "@/data/bookings";

interface CreateBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newBooking: Omit<Booking, "id">) => void;
  facilityId: number;
}

export function CreateBookingModal({
  open,
  onOpenChange,
  onSave,
  facilityId,
}: CreateBookingModalProps) {
  const [formData, setFormData] = useState({
    clientId: "",
    petId: "",
    service: "daycare",
    startDate: "",
    endDate: "",
    checkInTime: "08:00",
    checkOutTime: "17:00",
    basePrice: 50,
    discount: 0,
    discountReason: "",
    specialRequests: "",
  });

  const facilityClients = clients.filter(
    (c) => c.facility === "Example Pet Care Facility",
  );
  const selectedClient = facilityClients.find(
    (c) => c.id.toString() === formData.clientId,
  );
  const availablePets = selectedClient?.pets || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.petId || !formData.startDate) {
      alert("Please fill in all required fields");
      return;
    }

    const newBooking: Omit<Booking, "id"> = {
      clientId: parseInt(formData.clientId),
      petId: parseInt(formData.petId),
      facilityId,
      service: formData.service,
      startDate: formData.startDate,
      endDate: formData.endDate || formData.startDate,
      status: "pending",
      basePrice: formData.basePrice,
      discount: formData.discount,
      discountReason: formData.discountReason || undefined,
      totalCost: formData.basePrice - formData.discount,
      paymentStatus: "pending",
      specialRequests: formData.specialRequests || undefined,
      checkInTime: formData.checkInTime,
      checkOutTime: formData.checkOutTime,
    };

    onSave(newBooking);
    onOpenChange(false);

    // Reset form
    setFormData({
      clientId: "",
      petId: "",
      service: "daycare",
      startDate: "",
      endDate: "",
      checkInTime: "08:00",
      checkOutTime: "17:00",
      basePrice: 50,
      discount: 0,
      discountReason: "",
      specialRequests: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Booking
          </DialogTitle>
          <DialogDescription>
            Add a new booking for your facility
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Client Selection */}
            <div className="grid gap-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value, petId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {facilityClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet Selection */}
            <div className="grid gap-2">
              <Label htmlFor="pet">Pet *</Label>
              <Select
                value={formData.petId}
                onValueChange={(value) =>
                  setFormData({ ...formData, petId: value })
                }
                disabled={!formData.clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pet" />
                </SelectTrigger>
                <SelectContent>
                  {availablePets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name} ({pet.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service */}
            <div className="grid gap-2">
              <Label htmlFor="service">Service *</Label>
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
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  min={formData.startDate}
                />
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
                <Label htmlFor="basePrice">Base Price ($) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount">Discount ($)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={formData.basePrice}
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Discount Reason */}
            {formData.discount > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="discountReason">Discount Reason</Label>
                <Input
                  id="discountReason"
                  value={formData.discountReason}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountReason: e.target.value,
                    })
                  }
                  placeholder="e.g., Loyalty discount, First-time customer"
                />
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
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Create Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
