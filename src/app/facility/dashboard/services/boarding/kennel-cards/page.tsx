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
  QrCode,
  User,
  RefreshCw,
} from "lucide-react";
import {
  getCurrentGuests,
  BoardingGuest,
  KennelCardData,
} from "@/data/boarding";

export default function KennelCardsPage() {
  const currentGuests = getCurrentGuests();
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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

  const handleGenerateCard = () => {
    if (!selectedGuest) return;

    const card = generateKennelCard(selectedGuest);
    setGeneratedCards(new Map(generatedCards.set(selectedGuest.id, card)));
    setIsPreviewOpen(true);
  };

  const handleRegenerateCard = (guestId: string) => {
    const guest = currentGuests.find((g) => g.id === guestId);
    if (!guest) return;

    const card = generateKennelCard(guest);
    setGeneratedCards(new Map(generatedCards.set(guestId, card)));
  };

  const handlePrint = () => {
    window.print();
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Generate Kennel Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[250px]">
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
                        <PawPrint className="h-4 w-4" />
                        {guest.petName} - {guest.kennelName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateCard} disabled={!selectedGuestId}>
              <CreditCard className="h-4 w-4 mr-2" />
              Generate Card
            </Button>
          </div>

          {selectedGuest && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Generated Kennel Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentGuests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PawPrint className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No boarding guests currently</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentGuests.map((guest) => {
                const card = generatedCards.get(guest.id);
                return (
                  <div
                    key={guest.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <PawPrint className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{guest.petName}</p>
                          <p className="text-xs text-muted-foreground">
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

                    <div className="space-y-1 text-sm mb-3">
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
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateCard(guest.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedGuestId(guest.id);
                            handleGenerateCard();
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Kennel Card Preview
            </DialogTitle>
          </DialogHeader>

          {selectedGuest && (
            <>
              {/* Printable Card */}
              <div
                ref={printRef}
                className="border-2 border-dashed rounded-lg p-6 bg-white text-black print:border-solid"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                      {selectedGuest.petPhotoUrl ? (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <PawPrint className="h-10 w-10 text-primary" />
                        </div>
                      ) : (
                        <PawPrint className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedGuest.petName}
                      </h2>
                      <p className="text-gray-600">{selectedGuest.petBreed}</p>
                      <div className="flex gap-2 mt-1 text-sm">
                        <span>{selectedGuest.petSize.toUpperCase()}</span>
                        <span>•</span>
                        <span>{selectedGuest.petWeight} lbs</span>
                        <span>•</span>
                        <span>{selectedGuest.petColor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {selectedGuest.kennelName}
                    </p>
                    <div className="w-16 h-16 bg-gray-200 rounded mt-2 flex items-center justify-center">
                      <QrCode className="h-10 w-10 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">Owner:</span>
                    <span>{selectedGuest.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-semibold">Phone:</span>
                    <span>{selectedGuest.ownerPhone}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800">
                        Check-In
                      </span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {formatDate(selectedGuest.checkInDate)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-orange-800">
                        Check-Out
                      </span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {formatDate(selectedGuest.checkOutDate)}
                    </p>
                  </div>
                </div>

                {/* Allergies */}
                {selectedGuest.allergies.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-bold">ALLERGIES</span>
                    </div>
                    <p className="mt-1 text-red-700 font-medium">
                      {selectedGuest.allergies.join(", ")}
                    </p>
                  </div>
                )}

                {/* Medications */}
                {selectedGuest.medications.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-800">
                      <Pill className="h-5 w-5" />
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
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Utensils className="h-5 w-5" />
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
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">Emergency Vet:</span>{" "}
                    {selectedGuest.emergencyVetContact}
                  </p>
                </div>

                {/* Notes */}
                {selectedGuest.notes && (
                  <div className="mt-4 p-3 border rounded-lg">
                    <p className="font-semibold mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">
                      {selectedGuest.notes}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-t text-center text-xs text-gray-500">
                  <p>
                    Generated:{" "}
                    {currentCard
                      ? new Date(currentCard.generatedAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button className="flex-1" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Card
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:border-solid,
          .print\\:border-solid * {
            visibility: visible;
          }
          .print\\:border-solid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
