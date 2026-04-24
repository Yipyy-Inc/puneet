"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import {
  CreditCard,
  Printer,
  Eye,
  PawPrint,
  Phone,
  Calendar,
  AlertTriangle,
  Pill,
  Utensils,
  User,
  RefreshCw,
  Tag,
  SkipForward,
} from "lucide-react";
import {
  getCurrentGuests,
  BoardingGuest,
  KennelCardData,
} from "@/data/boarding";
import { PrintKennelCardsModal } from "@/components/facility/boarding/kennel-card-print";

// ── Check-In Print Prompt ─────────────────────────────────────────────────────

function CheckInPrintPrompt({
  guest,
  open,
  onClose,
  onPrint,
}: {
  guest: BoardingGuest | null;
  open: boolean;
  onClose: () => void;
  onPrint: (format: "kennel" | "door") => void;
}) {
  if (!guest) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PawPrint className="size-5 text-primary" />
            Card ready — print now?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="font-semibold">{guest.petName}</p>
            <p className="text-muted-foreground text-sm">
              {guest.kennelName} · {guest.petBreed}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Which card format would you like to print at check-in?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onPrint("kennel")}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/10"
            >
              <CreditCard className="size-8 text-primary" />
              Kennel Card
              <span className="text-muted-foreground text-xs font-normal">
                Full info · A5
              </span>
            </button>
            <button
              onClick={() => onPrint("door")}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-border p-4 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Tag className="size-8 text-muted-foreground" />
              Door Card
              <span className="text-muted-foreground text-xs font-normal">
                Compact · badge
              </span>
            </button>
          </div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
          >
            <SkipForward className="mr-2 size-4" />
            Skip printing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KennelCardsPage() {
  const currentGuests = getCurrentGuests();
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSingleId, setPrintSingleId] = useState<string | null>(null);
  const [printInitialFormat, setPrintInitialFormat] = useState<"kennel" | "door">("kennel");
  const [checkInPromptGuest, setCheckInPromptGuest] = useState<BoardingGuest | null>(null);
  const [generatedCards, setGeneratedCards] = useState<
    Map<string, KennelCardData>
  >(new Map());
  const printRef = useRef<HTMLDivElement>(null);

  // Counter for generating unique IDs
  const idCounterRef = useRef(0);
  const getNextId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);

  const selectedGuest = currentGuests.find((g) => g.id === selectedGuestId);

  const generateKennelCard = (guest: BoardingGuest): KennelCardData => {
    return {
      id: getNextId("kc"),
      guestId: guest.id,
      petName: guest.petName,
      petBreed: guest.petBreed,
      petSex: "Unknown",
      petWeight: guest.petWeight,
      petColor: guest.petColor,
      petPhotoUrl: guest.petPhotoUrl,
      ownerNames: guest.ownerName,
      primaryPhone: guest.ownerPhone,
      checkInDate: guest.checkInDate.split("T")[0],
      checkOutDate: guest.checkOutDate.split("T")[0],
      allergies: guest.allergies,
      medications: guest.medications.map((m) => ({
        name: `${m.medicationName} ${m.dosage}`,
        schedule: m.times.length > 0 ? m.times.join(", ") : m.frequency,
      })),
      feedingInstructions: guest.feedingInstructions,
      foodBrand: guest.foodBrand,
      feedingAmount: guest.feedingAmount,
      feedingTimes: guest.feedingTimes,
      emergencyVetContact: guest.emergencyVetContact,
      qrCodeUrl: `/qr-codes/${guest.id}.png`,
      generatedAt: new Date().toISOString(),
    };
  };

  const handleGenerateCard = (guestOverride?: BoardingGuest) => {
    const guest = guestOverride ?? selectedGuest;
    if (!guest) return;

    const isFirstGeneration = !generatedCards.has(guest.id);
    const card = generateKennelCard(guest);
    setGeneratedCards(new Map(generatedCards.set(guest.id, card)));

    if (isFirstGeneration) {
      // Show check-in print prompt instead of immediately opening preview
      setCheckInPromptGuest(guest);
    } else {
      setSelectedGuestId(guest.id);
      setIsPreviewOpen(true);
    }
  };

  const handleCheckInPrint = (format: "kennel" | "door") => {
    if (!checkInPromptGuest) return;
    setPrintInitialFormat(format);
    setPrintSingleId(checkInPromptGuest.id);
    setCheckInPromptGuest(null);
    setPrintModalOpen(true);
  };

  const handleRegenerateCard = (guestId: string) => {
    const guest = currentGuests.find((g) => g.id === guestId);
    if (!guest) return;

    const card = generateKennelCard(guest);
    setGeneratedCards(new Map(generatedCards.set(guestId, card)));
  };

  const handlePrint = (guestId?: string, format: "kennel" | "door" = "kennel") => {
    setPrintInitialFormat(format);
    setPrintSingleId(guestId ?? null);
    setPrintModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const currentCard = selectedGuest
    ? generatedCards.get(selectedGuest.id)
    : null;

  return (
    <div className="space-y-6">
      {/* Generator Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="size-5" />
              Generate Kennel Card
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
            >
              <Printer className="mr-2 size-4" />
              Print All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[250px] flex-1 space-y-2">
              <Label>Select Pet</Label>
              <Select
                value={selectedGuestId}
                onValueChange={setSelectedGuestId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a boarding guest" />
                </SelectTrigger>
                <SelectContent>
                  {currentGuests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      <div className="flex items-center gap-2">
                        <PawPrint className="size-4" />
                        {guest.petName} - {guest.kennelName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleGenerateCard()} disabled={!selectedGuestId}>
              <CreditCard className="mr-2 size-4" />
              Generate Card
            </Button>
          </div>

          {selectedGuest && (
            <div className="bg-muted/50 mt-4 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Pet</p>
                  <p className="font-medium">{selectedGuest.petName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Breed</p>
                  <p className="font-medium">{selectedGuest.petBreed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kennel</p>
                  <p className="font-medium">{selectedGuest.kennelName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{selectedGuest.ownerName}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Cards List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="size-5" />
            Generated Kennel Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentGuests.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <PawPrint className="mx-auto mb-3 size-12 opacity-50" />
              <p>No boarding guests currently</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentGuests.map((guest) => {
                const card = generatedCards.get(guest.id);
                return (
                  <div
                    key={guest.id}
                    className="bg-card hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                          <PawPrint className="text-primary size-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{guest.petName}</p>
                          <p className="text-muted-foreground text-xs">
                            {guest.kennelName}
                          </p>
                        </div>
                      </div>
                      {card ? (
                        <Badge variant="success">Generated</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>

                    <div className="mb-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Check-in:</span>
                        <span>{formatDate(guest.checkInDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Check-out:
                        </span>
                        <span>{formatDate(guest.checkOutDate)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {card ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedGuestId(guest.id);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye className="mr-1 size-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateCard(guest.id)}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGenerateCard(guest)}
                        >
                          <CreditCard className="mr-1 size-4" />
                          Generate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Kennel Card Preview
            </DialogTitle>
          </DialogHeader>

          {selectedGuest && (
            <>
              {/* Printable Card */}
              <div
                ref={printRef}
                className="rounded-lg border-2 border-dashed bg-white p-6 text-black print:border-solid"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between border-b pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-gray-200">
                      {selectedGuest.petPhotoUrl ? (
                        <div className="bg-primary/20 flex size-full items-center justify-center">
                          <PawPrint className="text-primary size-10" />
                        </div>
                      ) : (
                        <PawPrint className="size-10 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedGuest.petName}
                      </h2>
                      <p className="text-gray-600">{selectedGuest.petBreed}</p>
                      <div className="mt-1 flex gap-2 text-sm">
                        <span>{selectedGuest.petSize.toUpperCase()}</span>
                        <span>•</span>
                        <span>{selectedGuest.petWeight} lbs</span>
                        <span>•</span>
                        <span>{selectedGuest.petColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {selectedGuest.kennelName}
                    </p>
                    <div className="mt-2">
                      <QRCodeSVG
                        value={`https://care.doggieville.ca/${selectedGuest.id}`}
                        size={64}
                        level="M"
                      />
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="size-4" />
                    <span className="font-semibold">Owner:</span>
                    <span>{selectedGuest.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <span className="font-semibold">Phone:</span>
                    <span>{selectedGuest.ownerPhone}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-green-600" />
                      <span className="font-semibold text-green-800">
                        Check-In
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold">
                      {formatDate(selectedGuest.checkInDate)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-orange-600" />
                      <span className="font-semibold text-orange-800">
                        Check-Out
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold">
                      {formatDate(selectedGuest.checkOutDate)}
                    </p>
                  </div>
                </div>

                {/* Allergies */}
                {selectedGuest.allergies.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="size-5" />
                      <span className="font-bold">ALLERGIES</span>
                    </div>
                    <p className="mt-1 font-medium text-red-700">
                      {selectedGuest.allergies.join(", ")}
                    </p>
                  </div>
                )}

                {/* Medications */}
                {selectedGuest.medications.length > 0 && (
                  <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="flex items-center gap-2 text-purple-800">
                      <Pill className="size-5" />
                      <span className="font-bold">MEDICATIONS</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {selectedGuest.medications.map((med) => (
                        <p key={med.id} className="text-purple-700">
                          <span className="font-medium">
                            {med.medicationName}
                          </span>{" "}
                          - {med.dosage} ({med.frequency})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feeding */}
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Utensils className="size-5" />
                    <span className="font-bold">FEEDING</span>
                  </div>
                  <div className="mt-2 text-blue-700">
                    <p>
                      <span className="font-medium">Food:</span>{" "}
                      {selectedGuest.foodBrand}
                    </p>
                    <p>
                      <span className="font-medium">Amount:</span>{" "}
                      {selectedGuest.feedingAmount}
                    </p>
                    <p>
                      <span className="font-medium">Times:</span>{" "}
                      {selectedGuest.feedingTimes.join(", ")}
                    </p>
                    {selectedGuest.feedingInstructions && (
                      <p className="mt-1 text-sm italic">
                        {selectedGuest.feedingInstructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Emergency Vet */}
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-sm">
                    <span className="font-semibold">Emergency Vet:</span>{" "}
                    {selectedGuest.emergencyVetContact}
                  </p>
                </div>

                {/* Notes */}
                {selectedGuest.notes && (
                  <div className="mt-4 rounded-lg border p-3">
                    <p className="mb-1 font-semibold">Notes:</p>
                    <p className="text-sm text-gray-600">
                      {selectedGuest.notes}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 border-t pt-3 text-center text-xs text-gray-500">
                  <p>
                    Generated:{" "}
                    {currentCard
                      ? new Date(currentCard.generatedAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handlePrint(selectedGuest.id)}
                >
                  <Printer className="mr-2 size-4" />
                  Print Card
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CheckInPrintPrompt
        guest={checkInPromptGuest}
        open={!!checkInPromptGuest}
        onClose={() => setCheckInPromptGuest(null)}
        onPrint={handleCheckInPrint}
      />

      <PrintKennelCardsModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        initialFormat={printInitialFormat}
        guests={
          printSingleId
            ? currentGuests.filter((g) => g.id === printSingleId)
            : currentGuests
        }
      />
    </div>
  );
}
