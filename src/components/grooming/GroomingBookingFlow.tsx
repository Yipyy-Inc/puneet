"use client";

import { useState, useMemo, useEffect } from "react";
import { useGroomingValidation } from "@/hooks/use-grooming-validation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import { stylists, type Stylist } from "@/data/grooming";
import { locations } from "@/data/settings";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  AlertTriangle,
  Image as ImageIcon,
  X,
  User,
  Star,
  MapPin,
  Truck,
  Building2,
  Navigation
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
  hasVariants?: boolean; // Whether this category has style variants
}

// Service variant definitions
interface ServiceVariant {
  id: string;
  name: string;
  description: string;
  durationModifier: number; // Additional minutes
  priceModifier: number; // Additional dollars
  requiresPhotos?: boolean; // Whether photos are required for this variant
  enabled?: boolean; // Can be disabled by facility
}

// Add-on definitions
interface GroomingAddOn {
  id: string;
  name: string;
  description: string;
  durationMinutes: number; // Additional minutes
  price: number; // Additional dollars
  hiddenForAnxious?: boolean; // Hide if pet is anxious/aggressive
  suggestedForSenior?: boolean; // Suggest for senior dogs
  enabled?: boolean; // Can be disabled by facility
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
    estimatedDuration: 90, // Base duration for Medium dog
    hasVariants: true,
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
    hasVariants: true,
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
    hasVariants: true,
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
    hasVariants: true,
  },
];

// Service variants by category
const SERVICE_VARIANTS: Record<string, ServiceVariant[]> = {
  "haircut": [
    {
      id: "breed-standard",
      name: "Breed Standard",
      description: "AKC cut with specific blade requirements",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "teddy-bear",
      name: "Teddy Bear",
      description: "Round face, longer body",
      durationModifier: 15,
      priceModifier: 10,
      enabled: true,
    },
    {
      id: "puppy-cut",
      name: "Puppy Cut",
      description: "Uniform length all over",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "hand-scissor",
      name: "Hand Scissor Finish",
      description: "Precision scissor work for detailed finish",
      durationModifier: 15,
      priceModifier: 15,
      enabled: true,
    },
    {
      id: "custom",
      name: "Custom",
      description: "Describe your preferred style",
      durationModifier: 20,
      priceModifier: 20,
      requiresPhotos: true, // Facility can require photos for custom
      enabled: true,
    },
  ],
  "bath-brush": [
    {
      id: "standard",
      name: "Standard Bath",
      description: "Regular bath and brush",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "premium",
      name: "Premium Bath",
      description: "With premium shampoo and conditioner",
      durationModifier: 10,
      priceModifier: 10,
      enabled: true,
    },
  ],
  "spa": [
    {
      id: "deluxe",
      name: "Spa Day Deluxe",
      description: "Full spa experience with all treatments",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "signature",
      name: "Signature Spa",
      description: "Premium spa with aromatherapy",
      durationModifier: 30,
      priceModifier: 25,
      enabled: true,
    },
  ],
  "de-shed": [
    {
      id: "standard",
      name: "Standard De-shedding",
      description: "Basic de-shedding treatment",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "intensive",
      name: "Intensive De-shedding",
      description: "Deep treatment for heavy shedders",
      durationModifier: 20,
      priceModifier: 15,
      enabled: true,
    },
  ],
  "ala-carte": [
    {
      id: "nails-only",
      name: "Nails Only",
      description: "Nail trim and filing",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
    {
      id: "face-trim",
      name: "Face Trim Only",
      description: "Face and eye trim",
      durationModifier: 0,
      priceModifier: 0,
      enabled: true,
    },
  ],
};

// Available add-ons
const GROOMING_ADD_ONS: GroomingAddOn[] = [
  {
    id: "nail-grinding",
    name: "Nail Grinding",
    description: "Smooth nail finish with grinder",
    durationMinutes: 10,
    price: 15,
    enabled: true,
  },
  {
    id: "teeth-brushing",
    name: "Teeth Brushing",
    description: "Fresh breath and clean teeth",
    durationMinutes: 5,
    price: 10,
    enabled: true,
  },
  {
    id: "blueberry-facial",
    name: "Blueberry Facial",
    description: "Deep cleansing facial treatment",
    durationMinutes: 10,
    price: 12,
    enabled: true,
  },
  {
    id: "paw-pad-trim",
    name: "Paw Pad Trim",
    description: "Trim and shape paw pads",
    durationMinutes: 5,
    price: 8,
    enabled: true,
  },
  {
    id: "de-shedding-treatment",
    name: "De-shedding Treatment",
    description: "Specialized treatment to reduce shedding",
    durationMinutes: 20,
    price: 25,
    enabled: true,
  },
  {
    id: "premium-shampoo",
    name: "Premium Shampoo Upgrade",
    description: "Luxury shampoo and conditioner",
    durationMinutes: 0,
    price: 5,
    enabled: true,
  },
  {
    id: "nail-polish",
    name: "Nail Polish",
    description: "Colorful nail polish application",
    durationMinutes: 10,
    price: 10,
    hiddenForAnxious: true, // Requires stillness
    enabled: true,
  },
  {
    id: "joint-relief-massage",
    name: "Joint Relief Massage",
    description: "Therapeutic massage for joint comfort",
    durationMinutes: 15,
    price: 20,
    suggestedForSenior: true,
    enabled: true,
  },
];

// Mobile service zones (mock data - in production, this would come from facility config)
interface ServiceZone {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  neighborhoods: string[];
}

const MOBILE_SERVICE_ZONES: ServiceZone[] = [
  {
    id: "zone-a",
    name: "Zone A - Downtown",
    daysOfWeek: [1, 3], // Monday, Wednesday
    neighborhoods: ["Downtown", "Financial District", "SOMA"],
  },
  {
    id: "zone-b",
    name: "Zone B - North",
    daysOfWeek: [2, 4], // Tuesday, Thursday
    neighborhoods: ["North Beach", "Russian Hill", "Nob Hill"],
  },
  {
    id: "zone-c",
    name: "Zone C - West",
    daysOfWeek: [5, 6], // Friday, Saturday
    neighborhoods: ["Sunset", "Richmond", "Presidio"],
  },
];

export function GroomingBookingFlow({ open, onOpenChange }: GroomingBookingFlowProps) {
  const router = useRouter();
  const { validation, isAvailable, config } = useGroomingValidation();
  const { selectedFacility } = useCustomerFacility();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedGroomerTier, setSelectedGroomerTier] = useState<string | null>(null);
  const [sameGroomerGuarantee, setSameGroomerGuarantee] = useState(false);
  const [serviceLocation, setServiceLocation] = useState<"salon" | "mobile" | null>(null);
  const [mobileAddress, setMobileAddress] = useState("");
  const [mobileGateCode, setMobileGateCode] = useState("");
  const [mobileParking, setMobileParking] = useState<"street" | "driveway" | "">("");
  const [mobileStayInVan, setMobileStayInVan] = useState(false);
  const [salonLocationId, setSalonLocationId] = useState<string | null>(null);
  const [dropOffPreference, setDropOffPreference] = useState<"wait" | "drop-off" | "curbside" | "">("");
  const [customNotes, setCustomNotes] = useState("");
  const [customPhotos, setCustomPhotos] = useState<File[]>([]);
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

  // Get variants for selected service category
  const availableVariants = useMemo(() => {
    if (!selectedServiceCategory) return [];
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    if (!category?.hasVariants) return [];
    
    const variants = SERVICE_VARIANTS[selectedServiceCategory] || [];
    // Filter out disabled variants (in production, this would check facility config)
    return variants.filter((v) => v.enabled !== false);
  }, [selectedServiceCategory]);

  // Check if selected category has variants
  const selectedCategoryHasVariants = useMemo(() => {
    if (!selectedServiceCategory) return false;
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    return category?.hasVariants === true;
  }, [selectedServiceCategory]);

  // Calculate total duration and price based on pet size and variant
  const calculatedDuration = useMemo(() => {
    if (!selectedServiceCategory || !selectedPet) return 0;
    
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    if (!category) return 0;
    
    let baseDuration = category.estimatedDuration;
    
    // Add variant modifier if variant is selected
    if (selectedVariant) {
      const variant = availableVariants.find((v) => v.id === selectedVariant);
      if (variant) {
        baseDuration += variant.durationModifier;
      }
    }
    
    return baseDuration;
  }, [selectedServiceCategory, selectedPet, selectedVariant, availableVariants]);

  const calculatedPrice = useMemo(() => {
    if (!selectedServiceCategory || !selectedPet) return 0;
    
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    if (!category) return 0;
    
    let basePrice = getServicePrice(category, selectedPet.size);
    
    // Add variant modifier if variant is selected
    if (selectedVariant) {
      const variant = availableVariants.find((v) => v.id === selectedVariant);
      if (variant) {
        basePrice += variant.priceModifier;
      }
    }
    
    return basePrice;
  }, [selectedServiceCategory, selectedPet, selectedVariant, availableVariants]);

  // Check if photos are required for selected variant
  const requiresPhotos = useMemo(() => {
    if (!selectedVariant) return false;
    const variant = availableVariants.find((v) => v.id === selectedVariant);
    return variant?.requiresPhotos === true;
  }, [selectedVariant, availableVariants]);

  const handleContinueFromStep2 = () => {
    if (!selectedServiceCategory) return;
    
    // If category has variants, go to Step 3
    if (selectedCategoryHasVariants) {
      setCurrentStep(3);
    } else {
      // No variants, skip to next step (date/time selection)
      // TODO: Navigate to next step
      onOpenChange(false);
    }
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariant(variantId);
    // Clear custom notes and photos if switching away from custom
    if (variantId !== "custom") {
      setCustomNotes("");
      setCustomPhotos([]);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setCustomPhotos((prev) => [...prev, ...files]);
  };

  const handleRemovePhoto = (index: number) => {
    setCustomPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBackToStep2 = () => {
    setCurrentStep(2);
    setSelectedVariant(null);
    setCustomNotes("");
    setCustomPhotos([]);
  };

  // Check if pet is anxious/aggressive or senior
  const petFlags = useMemo(() => {
    if (!selectedPet) return { isAnxious: false, isSenior: false };
    
    // Check pet age for senior (typically 7+ years for dogs, 10+ for cats)
    const isSenior = selectedPet.age >= (selectedPet.type === "Dog" ? 7 : 10);
    
    // Check specialNeeds or behavior flags (in production, this would come from pet profile)
    const specialNeeds = (selectedPet as any).specialNeeds || "";
    const isAnxious = /anxious|aggressive|nervous|fearful/i.test(specialNeeds);
    
    return { isAnxious, isSenior };
  }, [selectedPet]);

  // Get available add-ons (filtered by pet flags)
  const availableAddOns = useMemo(() => {
    return GROOMING_ADD_ONS.filter((addon) => {
      // Hide if disabled
      if (addon.enabled === false) return false;
      
      // Hide nail polish for anxious pets
      if (addon.hiddenForAnxious && petFlags.isAnxious) return false;
      
      return true;
    });
  }, [petFlags]);

  // Get suggested add-ons (e.g., joint relief for senior dogs)
  const suggestedAddOns = useMemo(() => {
    return availableAddOns.filter((addon) => {
      if (addon.suggestedForSenior && petFlags.isSenior) return true;
      return false;
    });
  }, [availableAddOns, petFlags]);

  // Calculate total duration with add-ons
  const totalDurationWithAddOns = useMemo(() => {
    let total = calculatedDuration;
    
    selectedAddOns.forEach((addOnId) => {
      const addOn = GROOMING_ADD_ONS.find((a) => a.id === addOnId);
      if (addOn) {
        total += addOn.durationMinutes;
      }
    });
    
    return total;
  }, [calculatedDuration, selectedAddOns]);

  // Calculate total price with add-ons
  const totalPriceWithAddOns = useMemo(() => {
    let total = calculatedPrice;
    
    selectedAddOns.forEach((addOnId) => {
      const addOn = GROOMING_ADD_ONS.find((a) => a.id === addOnId);
      if (addOn) {
        total += addOn.price;
      }
    });
    
    return total;
  }, [calculatedPrice, selectedAddOns]);

  // Check for duration conflicts
  const durationConflict = useMemo(() => {
    if (!selectedServiceCategory) return null;
    
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    if (!category) return null;
    
    // If add-ons add significant time to a short service, show warning
    const baseDuration = category.estimatedDuration;
    const addOnDuration = selectedAddOns.reduce((sum, id) => {
      const addOn = GROOMING_ADD_ONS.find((a) => a.id === id);
      return sum + (addOn?.durationMinutes || 0);
    }, 0);
    
    // If add-ons add more than 50% of base duration, show warning
    if (addOnDuration > baseDuration * 0.5 && totalDurationWithAddOns > 60) {
      return {
        message: `This may require extending to a ${Math.ceil(totalDurationWithAddOns / 30) * 30}-minute appointment—limited availability`,
        severity: "warning" as const,
      };
    }
    
    return null;
  }, [selectedServiceCategory, selectedAddOns, totalDurationWithAddOns]);

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) => {
      if (prev.includes(addOnId)) {
        return prev.filter((id) => id !== addOnId);
      } else {
        return [...prev, addOnId];
      }
    });
  };

  const handleContinueFromStep3 = () => {
    if (!selectedVariant) return;
    
    // If custom variant requires photos, check if photos are uploaded
    if (requiresPhotos && customPhotos.length === 0) {
      // Show error or prevent proceeding
      return;
    }
    
    // Navigate to Step 4 (Add-ons)
    setCurrentStep(4);
  };

  const handleBackToStep3 = () => {
    setCurrentStep(3);
  };

  // Get groomer selection mode from config
  const groomerSelectionMode = config.bookingRules.groomerSelection.mode;

  // Check if pet needs Fear-Free Certified groomer
  const requiresFearFree = useMemo(() => {
    if (!selectedPet) return false;
    const specialNeeds = (selectedPet as any).specialNeeds || "";
    return /anxious|aggressive|fearful|nervous|behavior/i.test(specialNeeds);
  }, [selectedPet]);

  // Get pet's booking history with groomers
  const petGroomerHistory = useMemo(() => {
    if (!selectedPetId || !customer) return [];
    
    const petBookings = bookings.filter(
      (b) =>
        b.clientId === customer.id &&
        b.petId === selectedPetId &&
        b.service.toLowerCase() === "grooming" &&
        b.status === "completed" &&
        b.groomingStyle // Has groomer info
    );
    
    // Count bookings per groomer
    const groomerCounts = new Map<string, number>();
    petBookings.forEach((booking) => {
      // In production, this would come from booking.stylistId
      // For now, we'll use a mock approach
      const groomerId = (booking as any).stylistId;
      if (groomerId) {
        groomerCounts.set(groomerId, (groomerCounts.get(groomerId) || 0) + 1);
      }
    });
    
    return Array.from(groomerCounts.entries()).map(([groomerId, count]) => ({
      groomerId,
      count,
    }));
  }, [selectedPetId, customer]);

  // Get available groomers based on mode and pet needs
  const availableGroomers = useMemo(() => {
    if (groomerSelectionMode === "stealth" || groomerSelectionMode === "tier-only") {
      return []; // No specific groomers shown
    }
    
    // For "optional" and "full-choice" modes, show groomers
    let groomers = stylists.filter((s) => s.status === "active");
    
    // Filter out non-Fear-Free groomers if pet requires it
    if (requiresFearFree) {
      groomers = groomers.filter((g) =>
        g.certifications.some((c) => /fear.?free/i.test(c))
      );
    }
    
    return groomers;
  }, [groomerSelectionMode, requiresFearFree]);

  // Get groomer tiers from config
  const groomerTiers = config.bookingRules.groomerSelection.tiers || [];

  // Check if groomer selection step should be shown
  const shouldShowGroomerSelection = useMemo(() => {
    // Mode A (stealth): Skip entirely
    if (groomerSelectionMode === "stealth") return false;
    return true;
  }, [groomerSelectionMode]);

  const handleContinueFromStep4 = () => {
    // If groomer selection is not needed, skip to next step
    if (!shouldShowGroomerSelection) {
      // TODO: Navigate to next step (date/time selection)
      onOpenChange(false);
      return;
    }
    
    // Navigate to Step 5 (Groomer Selection)
    setCurrentStep(5);
  };

  const handleBackToStep4 = () => {
    setCurrentStep(4);
  };

  const handleGroomerSelect = (groomerId: string) => {
    setSelectedGroomerId(groomerId);
    setSelectedGroomerTier(null); // Clear tier selection if groomer is selected
  };

  const handleTierSelect = (tierId: string) => {
    setSelectedGroomerTier(tierId);
    setSelectedGroomerId(null); // Clear groomer selection if tier is selected
  };

  // Check if both salon and mobile are available
  const salonAvailable = config.serviceTypes.salon;
  const mobileAvailable = config.serviceTypes.mobile;

  // Determine default service location
  const defaultServiceLocation = useMemo(() => {
    if (!salonAvailable && mobileAvailable) return "mobile";
    if (salonAvailable && !mobileAvailable) return "salon";
    return null; // Both available, user must choose
  }, [salonAvailable, mobileAvailable]);

  // Auto-set service location if only one option
  useEffect(() => {
    if (defaultServiceLocation && !serviceLocation) {
      setServiceLocation(defaultServiceLocation);
    }
  }, [defaultServiceLocation, serviceLocation]);

  // Validate mobile address and find service zone
  const mobileAddressValidation = useMemo(() => {
    if (!mobileAddress || serviceLocation !== "mobile") return null;
    
    // Simple validation - in production, use geocoding API
    const addressLower = mobileAddress.toLowerCase();
    let matchedZone: ServiceZone | null = null;
    
    for (const zone of MOBILE_SERVICE_ZONES) {
      if (zone.neighborhoods.some((neighborhood) => addressLower.includes(neighborhood.toLowerCase()))) {
        matchedZone = zone;
        break;
      }
    }
    
    if (!matchedZone) {
      // Try to extract neighborhood from address
      const possibleNeighborhood = addressLower.split(",")[0]?.trim();
      return {
        isValid: false,
        zone: null,
        message: `We don't service this area yet. Join our waitlist for ${possibleNeighborhood || "this neighborhood"}`,
      };
    }
    
    return {
      isValid: true,
      zone: matchedZone,
      message: null,
    };
  }, [mobileAddress, serviceLocation]);

  // Get available salon locations
  const availableSalonLocations = useMemo(() => {
    return locations.filter((loc) => loc.isActive);
  }, []);

  // Get default salon location (first active or facility's main location)
  const defaultSalonLocation = useMemo(() => {
    if (availableSalonLocations.length > 0) {
      return availableSalonLocations[0].id;
    }
    return null;
  }, [availableSalonLocations]);

  // Auto-set salon location if only one option
  useEffect(() => {
    if (serviceLocation === "salon" && defaultSalonLocation && !salonLocationId) {
      setSalonLocationId(defaultSalonLocation);
    }
  }, [serviceLocation, defaultSalonLocation, salonLocationId]);

  const handleContinueFromStep5 = () => {
    // Validate selection based on mode
    if (groomerSelectionMode === "tier-only" && !selectedGroomerTier) {
      // "No preference" is allowed, so this is optional
    }
    if (groomerSelectionMode === "full-choice" && !selectedGroomerId && !selectedGroomerTier) {
      // "No preference" might be allowed, check config
    }
    
    // Navigate to Step 6 (Location & Logistics)
    setCurrentStep(6);
  };

  const handleBackToStep5 = () => {
    setCurrentStep(5);
  };

  const handleContinueFromStep6 = () => {
    // Validate based on service location
    if (serviceLocation === "mobile") {
      if (!mobileAddress || !mobileAddressValidation?.isValid) {
        return; // Cannot proceed without valid address
      }
    } else if (serviceLocation === "salon") {
      if (!salonLocationId || !dropOffPreference) {
        return; // Cannot proceed without location and drop-off preference
      }
    }
    
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
              : currentStep === 2
              ? `Step 2: What does ${selectedPet?.name ?? "your pet"} need today?`
              : currentStep === 3
              ? "Step 3: Choose the specific service style"
              : currentStep === 4
              ? `Step 4: Enhance ${selectedPet?.name ?? "your pet"}'s spa day`
              : currentStep === 5
              ? "Step 5: Who would you like to work with?"
              : "Step 6: Location & Logistics"
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
        ) : currentStep === 2 ? (
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
        ) : currentStep === 3 ? (
        /* Step 3: Service Specification & Variants */
        <div className="space-y-6">
          {/* Live Price and Duration Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estimated Duration</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {calculatedDuration} mins
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Total Price</p>
                  <p className="text-2xl font-bold flex items-center gap-2 justify-end">
                    <DollarSign className="h-5 w-5" />
                    ${calculatedPrice}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Variants */}
          {availableVariants.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Service Style</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {availableVariants.map((variant) => {
                  const isSelected = selectedVariant === variant.id;
                  const isCustom = variant.id === "custom";

                  return (
                    <Card
                      key={variant.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        isSelected ? "ring-2 ring-primary border-primary" : ""
                      }`}
                      onClick={() => handleVariantSelect(variant.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-lg mb-1">{variant.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {variant.description}
                            </p>
                            
                            {/* Duration and Price Modifiers */}
                            {(variant.durationModifier > 0 || variant.priceModifier > 0) && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {variant.durationModifier > 0 && (
                                  <span>+{variant.durationModifier} mins</span>
                                )}
                                {variant.priceModifier > 0 && (
                                  <span>+${variant.priceModifier}</span>
                                )}
                              </div>
                            )}

                            {/* Custom Notes Field */}
                            {isSelected && isCustom && (
                              <div className="mt-4 space-y-2">
                                <Label htmlFor="custom-notes">Describe your preferred style</Label>
                                <Textarea
                                  id="custom-notes"
                                  placeholder="E.g., Short on body, longer on legs, round face..."
                                  value={customNotes}
                                  onChange={(e) => setCustomNotes(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            )}

                            {/* Photo Upload for Custom */}
                            {isSelected && isCustom && requiresPhotos && (
                              <div className="mt-4 space-y-2">
                                <Label>Reference Photos (Required)</Label>
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    id="photo-upload"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => document.getElementById("photo-upload")?.click()}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    Upload Photos
                                  </Button>
                                  
                                  {/* Display uploaded photos */}
                                  {customPhotos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                      {customPhotos.map((photo, index) => (
                                        <div
                                          key={index}
                                          className="relative aspect-square rounded-lg overflow-hidden border"
                                        >
                                          <img
                                            src={URL.createObjectURL(photo)}
                                            alt={`Reference ${index + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemovePhoto(index);
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {customPhotos.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Please upload reference photos to help our groomers understand your desired style.
                                    </p>
                                  )}
                                </div>
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
                <p className="text-muted-foreground">
                  No variants available for this service.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep2}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueFromStep3}
                disabled={!selectedVariant || (requiresPhotos && customPhotos.length === 0)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        ) : currentStep === 4 ? (
        /* Step 4: Add-On Selection */
        <div className="space-y-6">
          {/* Total Duration and Price Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Duration</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {totalDurationWithAddOns} mins
                    {totalDurationWithAddOns > 60 && (
                      <Badge variant="outline" className="ml-2">
                        {Math.ceil(totalDurationWithAddOns / 30) * 30} min slot
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Total Price</p>
                  <p className="text-2xl font-bold flex items-center gap-2 justify-end">
                    <DollarSign className="h-5 w-5" />
                    ${totalPriceWithAddOns}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duration Conflict Warning */}
          {durationConflict && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Extended Appointment Required
                    </h4>
                    <p className="text-sm text-amber-800">
                      {durationConflict.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested Add-Ons for Senior Dogs */}
          {suggestedAddOns.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Recommended for {selectedPet?.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on {selectedPet?.name}'s profile, we recommend:
                    </p>
                    <div className="space-y-2">
                      {suggestedAddOns.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-background border border-primary/20 cursor-pointer hover:bg-primary/5"
                          onClick={() => handleAddOnToggle(addon.id)}
                        >
                          <Checkbox
                            checked={selectedAddOns.includes(addon.id)}
                            onCheckedChange={() => handleAddOnToggle(addon.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{addon.name}</p>
                            <p className="text-xs text-muted-foreground">{addon.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              +${addon.price}
                            </p>
                            {addon.durationMinutes > 0 && (
                              <p className="text-xs text-muted-foreground">
                                +{addon.durationMinutes} mins
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Add-Ons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add-On Services</h3>
            <div className="grid gap-3">
              {availableAddOns.map((addon) => {
                const isSelected = selectedAddOns.includes(addon.id);
                const isSuggested = suggestedAddOns.some((a) => a.id === addon.id);

                return (
                  <Card
                    key={addon.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      isSelected ? "ring-2 ring-primary border-primary" : ""
                    } ${isSuggested ? "border-primary/20 bg-primary/5" : ""}`}
                    onClick={() => handleAddOnToggle(addon.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleAddOnToggle(addon.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{addon.name}</h4>
                            {isSuggested && (
                              <Badge variant="outline" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {addon.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {addon.durationMinutes > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                +{addon.durationMinutes} mins
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <DollarSign className="h-3 w-3" />
                              +${addon.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep3}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromStep4}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        ) : currentStep === 5 ? (
        /* Step 5: Groomer Preference */
        <div className="space-y-6">
          {/* Mode A: No Choice (Stealth) - Should be skipped, but show message if somehow reached */}
          {groomerSelectionMode === "stealth" ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Our team will assign the best available groomer for {selectedPet?.name || "your pet"}'s needs.
                </p>
              </CardContent>
            </Card>
          ) : groomerSelectionMode === "tier-only" ? (
            /* Mode B: Tier-Based */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Your Stylist Preference</h3>
              <div className="space-y-3">
                {groomerTiers.map((tier) => {
                  const isSelected = selectedGroomerTier === tier.id;
                  // Calculate pricing based on tier
                  let priceModifier = 0;
                  if (tier.id === "senior") priceModifier = 20;
                  if (tier.id === "junior") priceModifier = -Math.round(calculatedPrice * 0.1);
                  
                  return (
                    <Card
                      key={tier.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        isSelected ? "ring-2 ring-primary border-primary" : ""
                      }`}
                      onClick={() => handleTierSelect(tier.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{tier.name}</h4>
                            {tier.description && (
                              <p className="text-sm text-muted-foreground">{tier.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {priceModifier !== 0 && (
                              <p className={`text-sm font-semibold ${priceModifier > 0 ? "text-primary" : "text-green-600"}`}>
                                {priceModifier > 0 ? `+$${priceModifier}` : `$${priceModifier}`}
                              </p>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-primary ml-2" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    !selectedGroomerTier ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => handleTierSelect("no-preference")}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">No preference</h4>
                        <p className="text-sm text-muted-foreground">First available</p>
                      </div>
                      {!selectedGroomerTier && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (groomerSelectionMode === "full-choice" || groomerSelectionMode === "optional") ? (
            /* Mode C: Specific Groomer with Bios */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Your Stylist</h3>
              
              {/* Fear-Free Requirement Notice */}
              {requiresFearFree && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-900">
                          {selectedPet?.name} requires a Fear-Free Certified groomer. Only qualified stylists are shown below.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                {availableGroomers.map((groomer) => {
                  const isSelected = selectedGroomerId === groomer.id;
                  const history = petGroomerHistory.find((h) => h.groomerId === groomer.id);
                  const isFearFree = groomer.certifications.some((c) => /fear.?free/i.test(c));
                  const isQualified = !requiresFearFree || isFearFree;
                  
                  return (
                    <Card
                      key={groomer.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? "ring-2 ring-primary border-primary" : ""
                      } ${!isQualified ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}`}
                      onClick={() => isQualified && handleGroomerSelect(groomer.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Groomer Photo */}
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-2 border-border">
                            {groomer.photoUrl ? (
                              <img
                                src={groomer.photoUrl}
                                alt={groomer.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Scissors className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Groomer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-lg">{groomer.name}</h4>
                              {history && (
                                <Badge variant="default" className="text-xs">
                                  Booked {history.count} {history.count === 1 ? "time" : "times"}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Specializations */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {groomer.specializations.slice(0, 3).map((spec) => (
                                <Badge key={spec} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                              {groomer.certifications.some((c) => /fear.?free/i.test(c)) && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Fear-Free Certified
                                </Badge>
                              )}
                            </div>
                            
                            {/* Bio */}
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {groomer.bio}
                            </p>
                            
                            {/* Rating and Experience */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {groomer.rating}
                              </span>
                              <span>{groomer.yearsExperience} years experience</span>
                            </div>
                            
                            {/* Not Qualified Warning */}
                            {!isQualified && (
                              <p className="text-xs text-destructive mt-2">
                                Not qualified for {selectedPet?.name}'s care needs
                              </p>
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
                
                {/* No Preference Option */}
                <Card
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    !selectedGroomerId && !selectedGroomerTier ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedGroomerId(null);
                    setSelectedGroomerTier("no-preference");
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h4 className="font-semibold mb-1">No preference</h4>
                        <p className="text-sm text-muted-foreground">First available stylist</p>
                        {!selectedGroomerId && !selectedGroomerTier && (
                          <CheckCircle2 className="h-6 w-6 text-primary mx-auto mt-2" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Mode D: Same-Groomer Guarantee (Optional - for recurring bookings) */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Groomer Preference</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Keep the same groomer for all future appointments?</h4>
                      <p className="text-sm text-muted-foreground">
                        We'll assign {selectedPet?.name || "your pet"} to the same groomer for consistency.
                      </p>
                    </div>
                    <Checkbox
                      checked={sameGroomerGuarantee}
                      onCheckedChange={(checked) => setSameGroomerGuarantee(checked === true)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep4}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromStep5}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        ) : (
        /* Step 6: Location & Logistics */
        <div className="space-y-6">
          {/* Service Type Selection (if both available) */}
          {salonAvailable && mobileAvailable && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Service Location</h3>
              <RadioGroup
                value={serviceLocation || ""}
                onValueChange={(value) => setServiceLocation(value as "salon" | "mobile")}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Card
                    className={`cursor-pointer transition-all ${
                      serviceLocation === "salon" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                    }`}
                    onClick={() => setServiceLocation("salon")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <RadioGroupItem value="salon" id="salon" />
                            <Label htmlFor="salon" className="font-semibold text-lg cursor-pointer">
                              Physical Salon
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Visit our facility for your pet's grooming appointment
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${
                      serviceLocation === "mobile" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                    }`}
                    onClick={() => setServiceLocation("mobile")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <RadioGroupItem value="mobile" id="mobile" />
                            <Label htmlFor="mobile" className="font-semibold text-lg cursor-pointer">
                              Mobile Van
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            We come to you! Grooming service at your location
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Mobile Service Form */}
          {serviceLocation === "mobile" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Address</h3>
              
              {/* Address Input */}
              <div className="space-y-2">
                <Label htmlFor="mobile-address">Service Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobile-address"
                    placeholder="Enter your address (e.g., 123 Main St, Downtown, San Francisco)"
                    value={mobileAddress}
                    onChange={(e) => setMobileAddress(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {mobileAddress && mobileAddressValidation && (
                  <div className="mt-2">
                    {mobileAddressValidation.isValid ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Service available in {mobileAddressValidation.zone?.name}</span>
                      </div>
                    ) : (
                      <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-amber-900">{mobileAddressValidation.message}</p>
                              <Button variant="outline" size="sm" className="mt-2">
                                Join Waitlist
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Location Details */}
              {mobileAddressValidation?.isValid && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Location Details</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gate-code">Gate Code (if applicable)</Label>
                    <Input
                      id="gate-code"
                      placeholder="Enter gate code"
                      value={mobileGateCode}
                      onChange={(e) => setMobileGateCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Parking Instructions</Label>
                    <RadioGroup
                      value={mobileParking}
                      onValueChange={(value) => setMobileParking(value as "street" | "driveway")}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="street" id="street" />
                          <Label htmlFor="street" className="cursor-pointer">Park on street</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="driveway" id="driveway" />
                          <Label htmlFor="driveway" className="cursor-pointer">Driveway available</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {petFlags.isAnxious && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="stay-in-van"
                          checked={mobileStayInVan}
                          onCheckedChange={(checked) => setMobileStayInVan(checked === true)}
                        />
                        <Label htmlFor="stay-in-van" className="cursor-pointer">
                          Aggressive dog—remain in van
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        Our groomer will work with {selectedPet?.name} inside the mobile van for safety.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Salon Service Form */}
          {serviceLocation === "salon" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Salon Location</h3>
              
              {/* Multi-location Selection */}
              {availableSalonLocations.length > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="salon-location">Select Location *</Label>
                  <select
                    id="salon-location"
                    value={salonLocationId || ""}
                    onChange={(e) => setSalonLocationId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a location</option>
                    {availableSalonLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.address}
                      </option>
                    ))}
                  </select>
                </div>
              ) : availableSalonLocations.length === 1 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">
                          Checking in at {availableSalonLocations[0].name}?
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {availableSalonLocations[0].address}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      {selectedFacility?.name || "Facility"} - {selectedFacility?.address || "Main location"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Drop-off Preference */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Drop-off Preference *</h4>
                <RadioGroup
                  value={dropOffPreference}
                  onValueChange={(value) => setDropOffPreference(value as "wait" | "drop-off" | "curbside")}
                >
                  <div className="space-y-3">
                    <Card
                      className={`cursor-pointer transition-all ${
                        dropOffPreference === "wait" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                      }`}
                      onClick={() => setDropOffPreference("wait")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="wait" id="wait" />
                          <Label htmlFor="wait" className="cursor-pointer flex-1">
                            <div>
                              <p className="font-medium">I'll wait in lobby</p>
                              <p className="text-xs text-muted-foreground">
                                You'll receive a 15-minute early notification when ready
                              </p>
                            </div>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${
                        dropOffPreference === "drop-off" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                      }`}
                      onClick={() => setDropOffPreference("drop-off")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="drop-off" id="drop-off" />
                          <Label htmlFor="drop-off" className="cursor-pointer flex-1">
                            <div>
                              <p className="font-medium">Drop off and return</p>
                              <p className="text-xs text-muted-foreground">Standard drop-off process</p>
                            </div>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${
                        dropOffPreference === "curbside" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                      }`}
                      onClick={() => setDropOffPreference("curbside")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="curbside" id="curbside" />
                          <Label htmlFor="curbside" className="cursor-pointer flex-1">
                            <div>
                              <p className="font-medium">Curbside pickup</p>
                              <p className="text-xs text-muted-foreground">
                                We'll bring your pet to your vehicle when ready
                              </p>
                            </div>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep5}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueFromStep6}
                disabled={
                  (serviceLocation === "mobile" && (!mobileAddress || !mobileAddressValidation?.isValid)) ||
                  (serviceLocation === "salon" && (!salonLocationId || !dropOffPreference))
                }
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
