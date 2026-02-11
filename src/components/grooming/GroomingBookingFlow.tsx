"use client";

import { useState, useMemo, useEffect } from "react";
import { useGroomingValidation } from "@/hooks/use-grooming-validation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Dog, 
  Plus, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  ArrowRight,
  Scissors,
  Sparkles,
  Droplets,
  Clock,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export type PetSize = "S" | "M" | "L" | "XL";

export interface PetWithBookingInfo {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  imageUrl?: string;
  size: PetSize;
  lastGroomingDate?: string;
  lastGroomingService?: string;
  vaccinationStatus: {
    required: boolean;
    isCompliant: boolean;
    missingRecords: string[];
    expiredRecords: string[];
  };
}

interface GroomingBookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Phase 2, Step 1: Pet Identification
 * "Who are we pampering today?"
 */
// Service category definitions with pricing and duration
interface ServiceCategoryOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  basePrice: number;
  estimatedDuration: number; // in minutes
  sizePricing?: {
    S?: number;
    M?: number;
    L?: number;
    XL?: number;
  };
}

const SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  {
    id: "bath-brush",
    name: "Bath & Brush",
    description: "No cutting - just a refreshing bath and brush out",
    icon: Droplets,
    basePrice: 45,
    estimatedDuration: 45,
    sizePricing: {
      S: 40,
      M: 45,
      L: 55,
      XL: 65,
    },
  },
  {
    id: "haircut",
    name: "Haircut Services",
    description: "Full groom with haircut and styling",
    icon: Scissors,
    basePrice: 65,
    estimatedDuration: 120,
    sizePricing: {
      S: 55,
      M: 65,
      L: 85,
      XL: 105,
    },
  },
  {
    id: "spa",
    name: "Spa Treatments",
    description: "Luxury spa experience with premium treatments",
    icon: Sparkles,
    basePrice: 95,
    estimatedDuration: 180,
    sizePricing: {
      S: 85,
      M: 95,
      L: 120,
      XL: 150,
    },
  },
  {
    id: "de-shed",
    name: "De-shedding Packages",
    description: "Specialized treatment to reduce shedding",
    icon: Droplets,
    basePrice: 55,
    estimatedDuration: 90,
    sizePricing: {
      S: 45,
      M: 55,
      L: 70,
      XL: 90,
    },
  },
  {
    id: "ala-carte",
    name: "À La Carte",
    description: "Individual services like nails only, face trim only",
    icon: Scissors,
    basePrice: 25,
    estimatedDuration: 30,
  },
];

export function GroomingBookingFlow({ open, onOpenChange }: GroomingBookingFlowProps) {
  const router = useRouter();
  const { validation, isAvailable, config } = useGroomingValidation();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);
  const [showAddPet, setShowAddPet] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering date-dependent content on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  // Get customer's pets with booking info
  const petsWithInfo = useMemo((): PetWithBookingInfo[] => {
    if (!customer) return [];

    return customer.pets.map((pet) => {
      // Get last grooming booking
      const lastGroomingBooking = bookings
        .filter(
          (b) =>
            b.clientId === customer.id &&
            b.petId === pet.id &&
            b.service.toLowerCase() === "grooming" &&
            b.status === "completed"
        )
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

      // Determine pet size based on weight
      const size: PetSize =
        pet.weight <= 15 ? "S" : pet.weight <= 50 ? "M" : pet.weight <= 100 ? "L" : "XL";

      // Check vaccination status
      const petVaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
      const requiredVaccines = config.bookingRules.vaccination?.requiredVaccines ?? [
        "Rabies",
        "DHPP",
        "Bordetella",
      ];
      const missingRecords: string[] = [];
      const expiredRecords: string[] = [];

      requiredVaccines.forEach((vaccine) => {
        const record = petVaccinations.find((v) =>
          v.vaccineName.toLowerCase().includes(vaccine.toLowerCase())
        );
        if (!record) {
          missingRecords.push(vaccine);
        } else {
          const expiryDate = new Date(record.expiryDate);
          const now = new Date();
          // Compare dates without time to avoid hydration issues
          const expiryDateOnly = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
          const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (expiryDateOnly < nowDateOnly) {
            expiredRecords.push(vaccine);
          }
        }
      });

      const isCompliant = missingRecords.length === 0 && expiredRecords.length === 0;

      return {
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight,
        color: pet.color,
        imageUrl: pet.imageUrl,
        size,
        lastGroomingDate: lastGroomingBooking?.endDate,
        lastGroomingService: lastGroomingBooking?.service,
        vaccinationStatus: {
          required: true, // From facility config
          isCompliant,
          missingRecords,
          expiredRecords,
        },
      };
    });
  }, [customer, config]);

  // Check if facility requires vaccination records before proceeding
  const requireVaccinationApproval = useMemo(() => {
    return config.bookingRules.vaccination?.requireRecordsBeforeBooking ?? true;
  }, [config]);

  const handlePetSelect = (petId: number) => {
    const pet = petsWithInfo.find((p) => p.id === petId);
    if (!pet) return;

    // Check vaccination compliance if required
    if (requireVaccinationApproval && !pet.vaccinationStatus.isCompliant) {
      // Show warning but allow selection
      // In production, this might block or show a modal
      setSelectedPetId(petId);
      return;
    }

    setSelectedPetId(petId);
  };

  const handleRebookLastTime = (petId: number) => {
    const pet = petsWithInfo.find((p) => p.id === petId);
    if (!pet || !pet.lastGroomingService) return;

    // TODO: Navigate to booking with pre-filled service
    // For now, just select the pet
    handlePetSelect(petId);
  };

  // Check if pet has matting flag from last visit
  const hasMattingFlag = useMemo(() => {
    if (!selectedPetId || !customer) return false;
    
    const lastGroomingBooking = bookings
      .filter(
        (b) =>
          b.clientId === customer.id &&
          b.petId === selectedPetId &&
          b.service.toLowerCase() === "grooming" &&
          b.status === "completed"
      )
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

    if (!lastGroomingBooking) return false;

    // Check notes for matting references
    const notes = lastGroomingBooking.specialRequests || "";
    const hasMattingInNotes = /matting|matted|mat/i.test(notes);

    // Check if de-matting was an add-on
    const hasDeMattingAddOn = lastGroomingBooking.groomingAddOns?.some(
      (addon) => /de.?matting|matting/i.test(addon)
    );

    return hasMattingInNotes || hasDeMattingAddOn;
  }, [selectedPetId, customer]);

  // Get selected pet
  const selectedPet = useMemo(() => {
    return petsWithInfo.find((p) => p.id === selectedPetId);
  }, [petsWithInfo, selectedPetId]);

  // Get available service categories based on facility config
  const availableServiceCategories = useMemo(() => {
    return SERVICE_CATEGORIES.filter((category) => {
      // Map our service categories to config categories
      let configCategoryId = category.id;
      if (category.id === "bath-brush") configCategoryId = "bath-only";
      if (category.id === "spa") configCategoryId = "full-groom"; // Spa is like full groom
      if (category.id === "ala-carte") configCategoryId = "nail-trim"; // À la carte includes nail trim
      
      const configCategory = config.bookingRules.serviceVisibility.categories.find(
        (c) => c.id === configCategoryId
      );
      return configCategory?.enabled !== false;
    });
  }, [config]);

  // Get price for selected service based on pet size
  const getServicePrice = (category: ServiceCategoryOption, petSize: PetSize): number => {
    if (category.sizePricing && category.sizePricing[petSize]) {
      return category.sizePricing[petSize];
    }
    return category.basePrice;
  };

  const handleContinue = () => {
    if (!selectedPetId) return;
    setCurrentStep(2);
  };

  const handleServiceSelect = (categoryId: string) => {
    setSelectedServiceCategory(categoryId);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setSelectedServiceCategory(null);
  };

  const handleContinueFromStep2 = () => {
    if (!selectedServiceCategory) return;
    // TODO: Navigate to next step (date/time selection)
    // For now, just close and show a message
    onOpenChange(false);
  };

  // If grooming is not available, don't show the flow
  if (!isAvailable) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book a Grooming Appointment</DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? "Step 1: Who are we pampering today?"
              : `Step 2: What does ${selectedPet?.name || "your pet"} need today?`
            }
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 ? (
        <div className="space-y-6">
          {/* Returning Client: Pet List */}
          {petsWithInfo.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select a Pet</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {petsWithInfo.map((pet) => {
                  const isSelected = selectedPetId === pet.id;
                  const hasVaccinationIssues =
                    requireVaccinationApproval && !pet.vaccinationStatus.isCompliant;

                  return (
                    <Card
                      key={pet.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      } ${hasVaccinationIssues ? "border-destructive/50" : ""}`}
                      onClick={() => handlePetSelect(pet.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Pet Image */}
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-2 border-border">
                            {pet.imageUrl ? (
                              <img
                                src={pet.imageUrl}
                                alt={pet.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dog className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>

                          {/* Pet Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{pet.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {pet.size}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {pet.breed} • {pet.age} {pet.age === 1 ? "year" : "years"} • {pet.weight} lbs
                            </p>

                            {/* Last Grooming Info */}
                            {pet.lastGroomingDate && isMounted && (
                              <div className="mt-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Last: {new Date(pet.lastGroomingDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                {pet.lastGroomingService && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRebookLastTime(pet.id);
                                    }}
                                  >
                                    Rebook same
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Vaccination Status */}
                            {requireVaccinationApproval && (
                              <div className="mt-2">
                                {pet.vaccinationStatus.isCompliant ? (
                                  <div className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Vaccinations up to date</span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs text-destructive">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Vaccination records required</span>
                                    </div>
                                    {pet.vaccinationStatus.missingRecords.length > 0 && (
                                      <p className="text-xs text-muted-foreground pl-4">
                                        Missing: {pet.vaccinationStatus.missingRecords.join(", ")}
                                      </p>
                                    )}
                                    {pet.vaccinationStatus.expiredRecords.length > 0 && (
                                      <p className="text-xs text-muted-foreground pl-4">
                                        Expired: {pet.vaccinationStatus.expiredRecords.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="shrink-0">
                              <CheckCircle2 className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Dog className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No pets yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first pet to get started with grooming appointments
                </p>
                <Button asChild>
                  <Link href="/customer/pets/add">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Pet
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Add New Pet Button */}
          {petsWithInfo.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/customer/pets/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Pet
                </Link>
              </Button>
            </div>
          )}

          {/* Vaccination Upload Warning */}
          {selectedPetId && requireVaccinationApproval && (
            (() => {
              const selectedPet = petsWithInfo.find((p) => p.id === selectedPetId);
              if (!selectedPet || selectedPet.vaccinationStatus.isCompliant) return null;

              return (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Vaccination Records Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Before booking, please upload vaccination records for {selectedPet.name}.
                    </p>
                    {selectedPet.vaccinationStatus.missingRecords.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Missing Records:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {selectedPet.vaccinationStatus.missingRecords.map((vaccine) => (
                            <li key={vaccine}>{vaccine}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedPet.vaccinationStatus.expiredRecords.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Expired Records:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {selectedPet.vaccinationStatus.expiredRecords.map((vaccine) => (
                            <li key={vaccine}>{vaccine}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/customer/pets/${selectedPet.id}`}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Records
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Allow proceeding with warning (facility can block in config)
                          // In production, this might be blocked if facility requires approval
                        }}
                      >
                        Continue Anyway (Requires Staff Approval)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()
          )}

          {/* Continue Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedPetId}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
        ) : (
        /* Step 2: Service Category Selection */
        <div className="space-y-6">
          {/* Matting Warning for Haircut */}
          {selectedServiceCategory === "haircut" && hasMattingFlag && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Additional De-matting Fees May Apply
                    </h4>
                    <p className="text-sm text-amber-800">
                      {selectedPet?.name} had matting noted during their last visit. 
                      Additional de-matting fees may apply depending on the severity. 
                      Our staff will assess upon arrival.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Category Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {availableServiceCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedServiceCategory === category.id;
              const price = selectedPet 
                ? getServicePrice(category, selectedPet.size)
                : category.basePrice;

              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    isSelected ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => handleServiceSelect(category.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg mb-1">{category.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {category.description}
                        </p>

                        {/* Price and Duration */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>~{category.estimatedDuration} mins</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <DollarSign className="h-4 w-4" />
                            <span>~${price}</span>
                          </div>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="shrink-0">
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep1}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueFromStep2}
                disabled={!selectedServiceCategory}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
