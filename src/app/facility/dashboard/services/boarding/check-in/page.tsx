"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  LogIn,
  LogOut,
  Clock,
  PawPrint,
  Phone,
  User,
  Calendar,
  CalendarPlus,
  CalendarMinus,
  Bed,
  DollarSign,
  AlertTriangle,
  Pill,
} from "lucide-react";
import {
  boardingGuests,
  BoardingGuest,
  calculateBoardingPrice,
  getApplicableDiscount,
} from "@/data/boarding";

export default function BoardingCheckInPage() {
  const [guests, setGuests] = useState<BoardingGuest[]>(boardingGuests);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEarlyCheckoutModalOpen, setIsEarlyCheckoutModalOpen] =
    useState(false);
  const [selectedGuest, setSelectedGuest] = useState<BoardingGuest | null>(
    null,
  );

  // Extension form state
  const [extensionNights, setExtensionNights] = useState(1);
  const [extensionNotes, setExtensionNotes] = useState("");

  // Early checkout form state
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");

  const checkedInGuests = guests.filter((g) => g.status === "checked-in");
  const scheduledGuests = guests.filter((g) => g.status === "scheduled");

  const handleCheckIn = (guest: BoardingGuest) => {
    const now = new Date().toISOString();
    setGuests(
      guests.map((g) =>
        g.id === guest.id
          ? { ...g, status: "checked-in" as const, actualCheckIn: now }
          : g,
      ),
    );
    setIsCheckInModalOpen(false);
    setSelectedGuest(null);
  };

  const handleCheckOut = () => {
    if (!selectedGuest) return;
    const now = new Date().toISOString();
    setGuests(
      guests.map((g) =>
        g.id === selectedGuest.id
          ? { ...g, status: "checked-out" as const, actualCheckOut: now }
          : g,
      ),
    );
    setIsCheckOutModalOpen(false);
    setSelectedGuest(null);
  };

  const handleExtendStay = () => {
    if (!selectedGuest) return;

    const currentCheckOut = new Date(selectedGuest.checkOutDate);
    const newCheckOut = new Date(currentCheckOut);
    newCheckOut.setDate(newCheckOut.getDate() + extensionNights);

    const newTotalNights = selectedGuest.totalNights + extensionNights;
    const discount = getApplicableDiscount(newTotalNights);
    const discountPercent = discount?.discountPercent || 0;

    const newTotalPrice = calculateBoardingPrice(
      selectedGuest.nightlyRate,
      newTotalNights,
      discountPercent,
      selectedGuest.peakSurcharge,
    );

    setGuests(
      guests.map((g) =>
        g.id === selectedGuest.id
          ? {
              ...g,
              checkOutDate: newCheckOut.toISOString(),
              totalNights: newTotalNights,
              discountApplied: discountPercent,
              totalPrice: newTotalPrice,
              notes: extensionNotes
                ? `${g.notes}\n[Extension]: ${extensionNotes}`
                : g.notes,
            }
          : g,
      ),
    );

    setIsExtendModalOpen(false);
    setSelectedGuest(null);
    setExtensionNights(1);
    setExtensionNotes("");
  };

  const handleEarlyCheckout = () => {
    if (!selectedGuest) return;

    const now = new Date();
    const checkIn = new Date(selectedGuest.checkInDate);
    const actualNights = Math.max(
      1,
      Math.ceil((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const discount = getApplicableDiscount(actualNights);
    const discountPercent = discount?.discountPercent || 0;

    const adjustedPrice = calculateBoardingPrice(
      selectedGuest.nightlyRate,
      actualNights,
      discountPercent,
      selectedGuest.peakSurcharge,
    );

    setGuests(
      guests.map((g) =>
        g.id === selectedGuest.id
          ? {
              ...g,
              status: "checked-out" as const,
              actualCheckOut: now.toISOString(),
              totalNights: actualNights,
              totalPrice: adjustedPrice,
              discountApplied: discountPercent,
              notes: `${g.notes}\n[Early Checkout]: ${earlyCheckoutReason}`,
            }
          : g,
      ),
    );

    setIsEarlyCheckoutModalOpen(false);
    setSelectedGuest(null);
    setEarlyCheckoutReason("");
  };

  const openCheckInModal = (guest: BoardingGuest) => {
    setSelectedGuest(guest);
    setIsCheckInModalOpen(true);
  };

  const openCheckOutModal = (guest: BoardingGuest) => {
    setSelectedGuest(guest);
    setIsCheckOutModalOpen(true);
  };

  const openExtendModal = (guest: BoardingGuest) => {
    setSelectedGuest(guest);
    setIsExtendModalOpen(true);
  };

  const openEarlyCheckoutModal = (guest: BoardingGuest) => {
    setSelectedGuest(guest);
    setIsEarlyCheckoutModalOpen(true);
  };

  const columns: ColumnDef<BoardingGuest>[] = [
    {
      key: "petName",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
      render: (guest) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
            <PawPrint className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{guest.petName}</p>
            <p className="text-xs text-muted-foreground">{guest.petBreed}</p>
          </div>
        </div>
      ),
    },
    {
      key: "ownerName",
      label: "Owner",
      icon: User,
      defaultVisible: true,
      render: (guest) => (
        <div>
          <p className="font-medium">{guest.ownerName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {guest.ownerPhone}
          </p>
        </div>
      ),
    },
    {
      key: "kennelName",
      label: "Kennel",
      icon: Bed,
      defaultVisible: true,
      render: (guest) => <Badge variant="outline">{guest.kennelName}</Badge>,
    },
    {
      key: "checkInDate",
      label: "Check-In",
      icon: Calendar,
      defaultVisible: true,
      render: (guest) => {
        const date = new Date(guest.checkInDate);
        return (
          <div>
            <p className="font-medium">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
        );
      },
    },
    {
      key: "checkOutDate",
      label: "Check-Out",
      icon: Calendar,
      defaultVisible: true,
      render: (guest) => {
        const date = new Date(guest.checkOutDate);
        return (
          <div>
            <p className="font-medium">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {guest.totalNights} night(s)
            </p>
          </div>
        );
      },
    },
    {
      key: "packageType",
      label: "Package",
      defaultVisible: true,
      render: (guest) => (
        <Badge
          variant={
            guest.packageType === "Luxury Suite"
              ? "default"
              : guest.packageType === "Premium Suite"
                ? "secondary"
                : "outline"
          }
        >
          {guest.packageType}
        </Badge>
      ),
    },
    {
      key: "totalPrice",
      label: "Total",
      icon: DollarSign,
      defaultVisible: true,
      render: (guest) => (
        <div>
          <p className="font-medium">${guest.totalPrice.toFixed(2)}</p>
          {guest.discountApplied > 0 && (
            <p className="text-xs text-success">
              -{guest.discountApplied}% off
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (guest) => (
        <Badge
          variant={
            guest.status === "checked-in"
              ? "success"
              : guest.status === "scheduled"
                ? "secondary"
                : "outline"
          }
        >
          {guest.status === "checked-in"
            ? "Checked In"
            : guest.status === "scheduled"
              ? "Scheduled"
              : "Checked Out"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      defaultVisible: true,
      render: (guest) => (
        <div className="flex items-center gap-2">
          {guest.status === "scheduled" && (
            <Button
              size="sm"
              variant="default"
              onClick={() => openCheckInModal(guest)}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Check In
            </Button>
          )}
          {guest.status === "checked-in" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openExtendModal(guest)}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                Extend
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEarlyCheckoutModal(guest)}
              >
                <CalendarMinus className="h-4 w-4 mr-1" />
                Early
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => openCheckOutModal(guest)}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Check Out
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "checked-in", label: "Checked In" },
        { value: "scheduled", label: "Scheduled" },
        { value: "checked-out", label: "Checked Out" },
      ],
    },
    {
      key: "packageType",
      label: "Package",
      options: [
        { value: "Standard Kennel", label: "Standard" },
        { value: "Premium Suite", label: "Premium" },
        { value: "Luxury Suite", label: "Luxury" },
      ],
    },
    {
      key: "petSize",
      label: "Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "giant", label: "Giant" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Currently Boarding
                </p>
                <p className="text-2xl font-bold">{checkedInGuests.length}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <Bed className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Scheduled Arrivals
                </p>
                <p className="text-2xl font-bold">{scheduledGuests.length}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pets with Medications
                </p>
                <p className="text-2xl font-bold">
                  {
                    checkedInGuests.filter((g) => g.medications.length > 0)
                      .length
                  }
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Pill className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Boarding Guests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={guests.filter((g) => g.status !== "checked-out")}
            columns={columns}
            filters={filters}
            searchKey="petName"
            searchPlaceholder="Search by pet name..."
          />
        </CardContent>
      </Card>

      {/* Check-In Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-success" />
              Check In Guest
            </DialogTitle>
            <DialogDescription>
              Confirm check-in for {selectedGuest?.petName}
            </DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pet</p>
                    <p className="font-medium">{selectedGuest.petName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Breed</p>
                    <p className="font-medium">{selectedGuest.petBreed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="font-medium">{selectedGuest.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedGuest.ownerPhone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kennel</p>
                    <p className="font-medium">{selectedGuest.kennelName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Package</p>
                    <p className="font-medium">{selectedGuest.packageType}</p>
                  </div>
                </div>
              </div>

              {selectedGuest.allergies.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Allergies: {selectedGuest.allergies.join(", ")}
                  </p>
                </div>
              )}

              {selectedGuest.medications.length > 0 && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Medications Required
                  </p>
                  <ul className="mt-1 text-sm text-purple-600 dark:text-purple-300">
                    {selectedGuest.medications.map((med) => (
                      <li key={med.id}>
                        • {med.medicationName} - {med.dosage} ({med.frequency})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGuest.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedGuest.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckInModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedGuest && handleCheckIn(selectedGuest)}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Confirm Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Modal */}
      <Dialog open={isCheckOutModalOpen} onOpenChange={setIsCheckOutModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-warning" />
              Check Out Guest
            </DialogTitle>
            <DialogDescription>
              Confirm check-out for {selectedGuest?.petName}
            </DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pet</p>
                    <p className="font-medium">{selectedGuest.petName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="font-medium">{selectedGuest.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Nights</p>
                    <p className="font-medium">{selectedGuest.totalNights}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-medium text-lg">
                      ${selectedGuest.totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm font-medium mb-2">Billing Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {selectedGuest.totalNights} nights @ $
                      {selectedGuest.nightlyRate}/night
                    </span>
                    <span>
                      $
                      {(
                        selectedGuest.nightlyRate * selectedGuest.totalNights
                      ).toFixed(2)}
                    </span>
                  </div>
                  {selectedGuest.discountApplied > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Multi-night discount</span>
                      <span>-{selectedGuest.discountApplied}%</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total Due</span>
                    <span>${selectedGuest.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckOutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Confirm Check-Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stay Extension Modal */}
      <Dialog open={isExtendModalOpen} onOpenChange={setIsExtendModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Extend Stay
            </DialogTitle>
            <DialogDescription>
              Extend the boarding stay for {selectedGuest?.petName}
            </DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Check-Out</p>
                    <p className="font-medium">
                      {new Date(selectedGuest.checkOutDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Nights</p>
                    <p className="font-medium">{selectedGuest.totalNights}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extensionNights">Additional Nights</Label>
                <Select
                  value={extensionNights.toString()}
                  onValueChange={(v) => setExtensionNights(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 14].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} night{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm font-medium mb-2">Updated Stay Details</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Check-Out</span>
                    <span className="font-medium">
                      {new Date(
                        new Date(selectedGuest.checkOutDate).getTime() +
                          extensionNights * 24 * 60 * 60 * 1000,
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Nights</span>
                    <span className="font-medium">
                      {selectedGuest.totalNights + extensionNights}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Additional Cost
                    </span>
                    <span className="font-medium">
                      $
                      {(selectedGuest.nightlyRate * extensionNights).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extensionNotes">Notes (optional)</Label>
                <Textarea
                  id="extensionNotes"
                  value={extensionNotes}
                  onChange={(e) => setExtensionNotes(e.target.value)}
                  placeholder="Reason for extension..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExtendModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExtendStay}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Confirm Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Checkout Modal */}
      <Dialog
        open={isEarlyCheckoutModalOpen}
        onOpenChange={setIsEarlyCheckoutModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarMinus className="h-5 w-5 text-warning" />
              Early Checkout
            </DialogTitle>
            <DialogDescription>
              Process early checkout for {selectedGuest?.petName}
            </DialogDescription>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-sm text-warning font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  This guest was scheduled to check out on{" "}
                  {new Date(selectedGuest.checkOutDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Nights</p>
                    <p className="font-medium">{selectedGuest.totalNights}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual Nights</p>
                    <p className="font-medium">
                      {Math.max(
                        1,
                        Math.ceil(
                          (new Date().getTime() -
                            new Date(selectedGuest.checkInDate).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Original Total</p>
                    <p className="font-medium">
                      ${selectedGuest.totalPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Adjusted Total</p>
                    <p className="font-medium text-lg">
                      $
                      {(
                        selectedGuest.nightlyRate *
                        Math.max(
                          1,
                          Math.ceil(
                            (new Date().getTime() -
                              new Date(selectedGuest.checkInDate).getTime()) /
                              (1000 * 60 * 60 * 24),
                          ),
                        )
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="earlyCheckoutReason">
                  Reason for Early Checkout
                </Label>
                <Textarea
                  id="earlyCheckoutReason"
                  value={earlyCheckoutReason}
                  onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                  placeholder="Owner request, pet health, etc..."
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEarlyCheckoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEarlyCheckout}
              disabled={!earlyCheckoutReason.trim()}
            >
              <CalendarMinus className="h-4 w-4 mr-2" />
              Confirm Early Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
