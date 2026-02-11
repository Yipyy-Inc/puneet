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
  Navigation,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { cn } from "@/lib/utils";

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(1);
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [mobileDateRange, setMobileDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [customNotes, setCustomNotes] = useState("");
  const [customPhotos, setCustomPhotos] = useState<File[]>([]);
  const [showAddPet, setShowAddPet] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Step 8: Recurring & Packages
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<4 | 6 | 8 | "custom">(4);
  const [customFrequency, setCustomFrequency] = useState<number>(4);
  const [recurringEndAfter, setRecurringEndAfter] = useState<"occurrences" | "date" | "never">("never");
  const [recurringOccurrences, setRecurringOccurrences] = useState<number>(6);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
  const [keepSameGroomer, setKeepSameGroomer] = useState(true);
  const [useExistingPackage, setUseExistingPackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [upsellPackage, setUpsellPackage] = useState(false);
  const [selectedUpsellPackageId, setSelectedUpsellPackageId] = useState<string | null>(null);
  const [upgradeToVIP, setUpgradeToVIP] = useState(false);
  
  // Step 9: Client Details & Pet Profile Updates
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [petBehaviorUpdate, setPetBehaviorUpdate] = useState("");
  const [petCoatPhoto, setPetCoatPhoto] = useState<File | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Step 10: Review & Deposit
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<"full" | "deposit" | "hold" | "venue" | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Prevent hydration mismatch by only rendering date-dependent content on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  // Check if this is a new client (no previous bookings)
  const isNewClient = useMemo(() => {
    if (!customer) return true;
    const hasBookings = bookings.some((b) => b.clientId === customer.id);
    return !hasBookings;
  }, [customer]);

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

  // Mock data for packages and memberships (in production, fetch from API)
  const customerPackages = useMemo(() => {
    // Mock: Customer has a 4-pack grooming package with 3 remaining credits
    return [
      {
        id: "pkg-001",
        name: "4-Pack Grooming Package",
        creditsRemaining: 3,
        creditsTotal: 4,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      },
    ];
  }, []);

  const availablePackages = useMemo(() => {
    // Mock: Available packages for upsell
    return [
      {
        id: "pkg-upsell-001",
        name: "4-Pack Grooming Package",
        description: "Save $40 on 4 grooming appointments",
        packagePrice: 260, // $65 per appointment
        totalValue: 300, // $75 per appointment x 4
        savings: 40,
        savingsPercentage: 13,
        credits: 4,
      },
    ];
  }, []);

  const membershipPlan = useMemo(() => {
    // Mock: VIP membership plan
    return {
      id: "vip-001",
      name: "VIP Membership",
      monthlyPrice: 29,
      discountPercentage: 20,
      perks: ["20% off all grooming", "Priority booking", "Free add-ons"],
    };
  }, []);

  // Get groomer surcharge
  const groomerSurcharge = useMemo(() => {
    if (selectedGroomerTier === "Senior Stylist") {
      return 20;
    } else if (selectedGroomerTier === "Junior Stylist") {
      return -Math.round(totalPriceWithAddOns * 0.1); // 10% discount
    }
    return 0;
  }, [selectedGroomerTier, totalPriceWithAddOns]);

  // Calculate final price with discounts and groomer surcharge
  const finalPrice = useMemo(() => {
    let price = totalPriceWithAddOns + groomerSurcharge;
    let discount = 0;
    let discountReason = "";

    // Apply recurring discount (10%)
    if (recurringEnabled) {
      discount = price * 0.1;
      discountReason = "10% recurring discount";
    }

    // Apply membership discount (20%)
    if (upgradeToVIP) {
      const membershipDiscount = price * 0.2;
      if (membershipDiscount > discount) {
        discount = membershipDiscount;
        discountReason = "20% VIP membership discount";
      }
    }

    // If using existing package, price is 0 (covered by package)
    if (useExistingPackage && selectedPackageId) {
      return {
        originalPrice: price,
        discount: price,
        finalPrice: 0,
        discountReason: "Package credit",
        savings: price,
      };
    }

    return {
      originalPrice: price,
      discount,
      finalPrice: price - discount,
      discountReason,
      savings: discount,
    };
  }, [totalPriceWithAddOns, groomerSurcharge, recurringEnabled, upgradeToVIP, useExistingPackage, selectedPackageId]);

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

  // Time slot interface
  interface TimeSlot {
    time: string; // HH:mm format
    status: "optimal" | "tight" | "off-peak" | "unavailable";
    available: boolean;
    reason?: string; // Why unavailable
    driveTimeFromPrevious?: number; // For mobile: minutes from previous appointment
    routePosition?: string; // For mobile: "You'll be our 2nd stop in [Neighborhood]"
  }

  // Generate time slots for salon
  const generateSalonTimeSlots = useMemo(() => {
    if (!selectedDate || serviceLocation !== "salon") return [];
    
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    const slotDuration = totalDurationWithAddOns; // Total duration needed
    
    // Generate 30-minute interval slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        
        // Check if slot fits (basic logic - in production, check groomer/station availability)
        const slotEnd = hour * 60 + minute + slotDuration;
        const endHourCheck = Math.floor(slotEnd / 60);
        const endMinuteCheck = slotEnd % 60;
        
        if (endHourCheck < endHour || (endHourCheck === endHour && endMinuteCheck === 0)) {
          // Determine slot status
          let status: TimeSlot["status"] = "optimal";
          if (hour === startHour || (hour === endHour - 1 && minute >= 30)) {
            status = "off-peak"; // Early morning or late afternoon
          }
          // In production, check if groomer has back-to-back appointments
          
          slots.push({
            time: timeString,
            status,
            available: true,
          });
        }
      }
    }
    
    return slots;
  }, [selectedDate, serviceLocation, totalDurationWithAddOns]);

  // Generate time slots for mobile (with routing algorithm)
  const generateMobileTimeSlots = useMemo(() => {
    if (!mobileDateRange || !mobileAddressValidation?.isValid || serviceLocation !== "mobile") {
      return [];
    }
    
    const slots: TimeSlot[] = [];
    const zone = mobileAddressValidation.zone;
    if (!zone) return [];
    
    // Mock route data - in production, this would come from van scheduling
    const mockRoute = [
      { time: "08:00", address: "123 Main St, Downtown", driveTime: 0 },
      { time: "10:15", address: "456 Oak Ave, Downtown", driveTime: 15 },
      { time: "13:00", address: "789 Pine St, Downtown", driveTime: 20 },
    ];
    
    // Generate slots for each day in range that matches zone days
    const startDate = new Date(mobileDateRange.start);
    const endDate = new Date(mobileDateRange.end);
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if this day is in the zone's service days
      if (zone.daysOfWeek.includes(dayOfWeek)) {
        // Generate time slots for this day
        const daySlots: TimeSlot[] = [];
        const slotDuration = totalDurationWithAddOns;
        
        // Check each potential slot against route
        for (let hour = 8; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            
            // Find previous appointment in route
            const previousAppt = mockRoute.find((apt) => {
              const [aptHour, aptMin] = apt.time.split(":").map(Number);
              const aptTime = aptHour * 60 + aptMin;
              const slotTime = hour * 60 + minute;
              return aptTime < slotTime;
            });
            
            if (previousAppt) {
              const [prevHour, prevMin] = previousAppt.time.split(":").map(Number);
              const prevTime = prevHour * 60 + prevMin;
              const slotTime = hour * 60 + minute;
              const driveTime = previousAppt.driveTime || 15;
              const bufferTime = 15; // Cleanup time
              const prevEndTime = prevTime + 90 + bufferTime; // Assume 90 min appointment + buffer
              
              // Check if slot fits with drive time
              if (slotTime >= prevEndTime + driveTime) {
                const slotEndTime = slotTime + slotDuration;
                // Check if slot doesn't exceed end of day
                if (slotEndTime <= 17 * 60) {
                  const routePosition = mockRoute.indexOf(previousAppt) + 2; // +1 for index, +1 for this being next
                  const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
                  daySlots.push({
                    time: timeString,
                    status: driveTime < 15 ? "optimal" : "tight",
                    available: true,
                    driveTimeFromPrevious: driveTime,
                    routePosition: `You'll be our ${routePosition}${routePosition === 2 ? "nd" : routePosition === 3 ? "rd" : "th"} stop in ${zone.name} that ${weekday}`,
                  });
                }
              }
            } else {
              // First appointment of the day - check if slot fits
              const slotEndTime = (hour * 60 + minute) + slotDuration;
              if (slotEndTime <= 17 * 60) {
                const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
                daySlots.push({
                  time: timeString,
                  status: hour < 10 ? "off-peak" : "optimal",
                  available: true,
                  routePosition: `You'll be our first stop in ${zone.name} that ${weekday}`,
                });
              }
            }
          }
        }
        
        // Add date info to slots
        daySlots.forEach((slot) => {
          slots.push({
            ...slot,
            time: `${currentDate.toISOString().split("T")[0]} ${slot.time}`, // Include date
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }, [mobileDateRange, mobileAddressValidation, serviceLocation, totalDurationWithAddOns]);

  // Get available time slots based on service location
  const availableTimeSlots = useMemo(() => {
    if (serviceLocation === "salon") {
      return generateSalonTimeSlots;
    } else if (serviceLocation === "mobile") {
      return generateMobileTimeSlots;
    }
    return [];
  }, [serviceLocation, generateSalonTimeSlots, generateMobileTimeSlots]);

  // Get minimum date based on lead time
  const minBookingDate = useMemo(() => {
    const now = new Date();
    const minimumHours = config.bookingRules.leadTime.minimumHours;
    const minDate = new Date(now.getTime() + minimumHours * 60 * 60 * 1000);
    return minDate;
  }, [config]);

  // Get disabled dates (days with no availability)
  const disabledDates = useMemo(() => {
    const disabled: Date[] = [];
    // In production, check actual availability
    // For now, disable past dates and dates before minimum lead time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Disable if before minimum lead time
      if (date < minBookingDate) {
        disabled.push(date);
      }
      
      // For mobile: disable days not in zone's service days
      if (serviceLocation === "mobile" && mobileAddressValidation?.zone) {
        const dayOfWeek = date.getDay();
        if (!mobileAddressValidation.zone.daysOfWeek.includes(dayOfWeek)) {
          disabled.push(date);
        }
      }
    }
    
    return disabled;
  }, [minBookingDate, serviceLocation, mobileAddressValidation]);

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
    } else {
      // No service location selected
      return;
    }
    
    // Navigate to Step 7 (Date & Time Selection)
    setCurrentStep(7);
  };

  const handleBackToStep6 = () => {
    setCurrentStep(6);
  };

  const handleContinueFromStep7 = () => {
    if (serviceLocation === "salon") {
      if (!selectedDate || !selectedTimeSlot) {
        return; // Cannot proceed without date and time
      }
    } else if (serviceLocation === "mobile") {
      if (!selectedTimeSlot) {
        return; // Cannot proceed without time slot (date is included in slot for mobile)
      }
      // Extract date from slot time (format: "YYYY-MM-DD HH:mm")
      const [datePart] = selectedTimeSlot.split(" ");
      if (datePart) {
        setSelectedDate(new Date(datePart));
      }
    }
    
    // Navigate to Step 8 (Recurring & Packages)
    setCurrentStep(8);
  };

  const handleBackToStep7 = () => {
    setCurrentStep(7);
  };

  const handleContinueFromStep8 = () => {
    // Skip Step 9 for existing clients, go directly to Step 10
    if (!isNewClient) {
      // Initialize client details from existing customer data
      if (customer) {
        setClientName(customer.name || "");
        setClientPhone(customer.phone || "");
        setClientEmail(customer.email || "");
        setPhoneVerified(true); // Existing clients have verified phone
      }
      
      // Navigate directly to Step 10 (Review & Deposit)
      setCurrentStep(10);
      
      // Auto-select deposit method based on config
      const depositType = config.bookingRules.deposit.type;
      if (depositType === "none") {
        setDepositPaymentMethod("venue");
      } else if (depositType === "fixed" || depositType === "percentage") {
        if (config.bookingRules.deposit.requiredAtBooking) {
          setDepositPaymentMethod("deposit");
        } else {
          setDepositPaymentMethod("hold");
        }
      }
    } else {
      // New clients must complete Step 9 (Client Details & Pet Profile Updates)
      setCurrentStep(9);
    }
  };

  const handleBackToStep8 = () => {
    setCurrentStep(8);
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate phone format
  const validatePhone = (phone: string): boolean => {
    // Remove spaces, dashes, parentheses for validation
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    return /^\d{10,15}$/.test(cleaned);
  };

  // Send SMS verification code
  const handleSendVerificationCode = async () => {
    if (!clientPhone || !validatePhone(clientPhone)) {
      setFormErrors((prev) => ({
        ...prev,
        phone: "Please enter a valid phone number",
      }));
      return;
    }

    setIsSendingCode(true);
    try {
      // TODO: Replace with actual API call to send SMS code
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPhoneVerificationSent(true);
      setFormErrors((prev) => {
        const { phone, ...rest } = prev;
        return rest;
      });
      // Mock: In production, this would come from the API
      // For demo purposes, we'll use a fixed code
    } catch (error) {
      setFormErrors((prev) => ({
        ...prev,
        phone: "Failed to send verification code. Please try again.",
      }));
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify SMS code
  const handleVerifyCode = async () => {
    if (!phoneVerificationCode || phoneVerificationCode.length !== 6) {
      setFormErrors((prev) => ({
        ...prev,
        verificationCode: "Please enter the 6-digit code",
      }));
      return;
    }

    setIsVerifyingPhone(true);
    try {
      // TODO: Replace with actual API call to verify code
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Mock: Accept any 6-digit code for demo
      if (phoneVerificationCode.length === 6) {
        setPhoneVerified(true);
        setFormErrors((prev) => {
          const { verificationCode, ...rest } = prev;
          return rest;
        });
      } else {
        setFormErrors((prev) => ({
          ...prev,
          verificationCode: "Invalid code. Please try again.",
        }));
      }
    } catch (error) {
      setFormErrors((prev) => ({
        ...prev,
        verificationCode: "Verification failed. Please try again.",
      }));
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // Validate Step 9 form
  const validateStep9 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!clientName.trim()) {
      errors.name = "Name is required";
    }

    if (!clientEmail.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(clientEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!clientPhone.trim()) {
      errors.phone = "Phone is required";
    } else if (!validatePhone(clientPhone)) {
      errors.phone = "Please enter a valid phone number";
    }

    // For new clients, phone must be verified
    if (isNewClient && !phoneVerified) {
      errors.phone = "Phone number must be verified";
    }

    if (specialInstructions.length > 500) {
      errors.specialInstructions = "Special instructions must be 500 characters or less";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueFromStep9 = () => {
    if (!validateStep9()) {
      return;
    }

    // Navigate to Step 10 (Review & Deposit)
    setCurrentStep(10);
    
    // Auto-select deposit method based on config
    const depositType = config.bookingRules.deposit.type;
    if (depositType === "none") {
      setDepositPaymentMethod("venue");
    } else if (depositType === "fixed" || depositType === "percentage") {
      if (config.bookingRules.deposit.requiredAtBooking) {
        setDepositPaymentMethod("deposit");
      } else {
        setDepositPaymentMethod("hold");
      }
    }
  };

  const handleBackToStep9 = () => {
    setCurrentStep(9);
  };

  // Calculate deposit amount
  const depositAmount = useMemo(() => {
    if (!depositPaymentMethod || depositPaymentMethod === "venue" || depositPaymentMethod === "hold") {
      return 0;
    }
    
    const depositConfig = config.bookingRules.deposit;
    if (depositPaymentMethod === "full") {
      return finalPrice.finalPrice;
    } else if (depositPaymentMethod === "deposit") {
      if (depositConfig.type === "fixed" && depositConfig.amount) {
        return depositConfig.amount;
      } else if (depositConfig.type === "percentage" && depositConfig.percentage) {
        return finalPrice.finalPrice * (depositConfig.percentage / 100);
      }
    }
    
    return 0;
  }, [depositPaymentMethod, finalPrice, config]);

  // Get available deposit payment methods
  const availableDepositMethods = useMemo(() => {
    const methods: Array<{ id: "full" | "deposit" | "hold" | "venue"; label: string; description: string }> = [];
    const depositConfig = config.bookingRules.deposit;
    
    // Full prepayment
    methods.push({
      id: "full",
      label: "Pay in full now",
      description: `$${finalPrice.finalPrice.toFixed(2)} will be charged immediately`,
    });
    
    // Deposit (if configured)
    if (depositConfig.type === "fixed" || depositConfig.type === "percentage") {
      const depositAmount = depositConfig.type === "fixed" 
        ? depositConfig.amount || 0
        : finalPrice.finalPrice * ((depositConfig.percentage || 0) / 100);
      
      methods.push({
        id: "deposit",
        label: `Pay ${depositConfig.type === "fixed" ? `$${depositAmount.toFixed(2)}` : `${depositConfig.percentage}%`} deposit`,
        description: `$${depositAmount.toFixed(2)} now, remaining $${(finalPrice.finalPrice - depositAmount).toFixed(2)} at service`,
      });
    }
    
    // Card hold (if deposit not required at booking)
    if (!depositConfig.requiredAtBooking) {
      methods.push({
        id: "hold",
        label: "Hold card (no charge)",
        description: "We'll hold your card but won't charge until service",
      });
    }
    
    // Pay at venue
    methods.push({
      id: "venue",
      label: "Pay at venue",
      description: "Pay when you arrive for your appointment",
    });
    
    return methods;
  }, [config, finalPrice]);

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins} minutes`;
    } else if (mins === 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    } else {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ${mins} minutes`;
    }
  };

  // Format date and time for display
  const formattedDateTime = useMemo(() => {
    if (!selectedDate || !selectedTimeSlot) return "Not selected";
    
    const date = new Date(selectedDate);
    const time = serviceLocation === "mobile" 
      ? selectedTimeSlot.split(" ")[1] || selectedTimeSlot
      : selectedTimeSlot;
    
    return `${date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    })} at ${time}`;
  }, [selectedDate, selectedTimeSlot, serviceLocation]);

  // Get selected groomer name
  const selectedGroomerName = useMemo(() => {
    if (selectedGroomerId) {
      const groomer = stylists.find((s) => s.id === selectedGroomerId);
      return groomer?.name || "Not selected";
    } else if (selectedGroomerTier) {
      return selectedGroomerTier;
    }
    return "System assigned";
  }, [selectedGroomerId, selectedGroomerTier]);


  // Get selected service category name
  const selectedServiceCategoryName = useMemo(() => {
    const category = SERVICE_CATEGORIES.find((c) => c.id === selectedServiceCategory);
    return category?.name || "Not selected";
  }, [selectedServiceCategory]);

  // Get selected variant name
  const selectedVariantName = useMemo(() => {
    if (!selectedVariant) return null;
    const variant = availableVariants.find((v) => v.id === selectedVariant);
    return variant?.name || null;
  }, [selectedVariant, availableVariants]);

  // Get selected add-ons
  const selectedAddOnsList = useMemo(() => {
    return selectedAddOns.map((id) => {
      const addon = GROOMING_ADD_ONS.find((a) => a.id === id);
      return addon;
    }).filter(Boolean);
  }, [selectedAddOns]);

  // Get location display
  const locationDisplay = useMemo(() => {
    if (serviceLocation === "mobile") {
      return mobileAddress || "Not specified";
    } else if (serviceLocation === "salon") {
      const location = locations.find((l) => l.id === salonLocationId);
      return location?.address || "Not specified";
    }
    return "Not specified";
  }, [serviceLocation, mobileAddress, salonLocationId]);

  // Handle booking confirmation
  const handleBookAppointment = async () => {
    if (!policyAccepted) {
      setFormErrors({ policy: "You must accept the cancellation policy to continue" });
      return;
    }

    if (depositPaymentMethod && depositPaymentMethod !== "venue" && depositPaymentMethod !== "hold") {
      // In production, this would process payment
      // For now, we'll just simulate the booking
    }

    setIsBooking(true);
    try {
      // TODO: Replace with actual API calls
      // 1. Slot hold (10-minute timer if payment pending)
      // 2. SMS confirmation to client
      // 3. Calendar block for groomer
      // 4. Email with "Add to Calendar" .ics file
      // 5. If mobile: Route recalculation for that van's entire day
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Success - close modal and show success message
      onOpenChange(false);
      // TODO: Show success toast/notification
    } catch (error) {
      setFormErrors({ booking: "Failed to book appointment. Please try again." });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCoatPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFormErrors((prev) => ({
          ...prev,
          coatPhoto: "Please upload an image file",
        }));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          coatPhoto: "Image must be less than 5MB",
        }));
        return;
      }
      setPetCoatPhoto(file);
      setFormErrors((prev) => {
        const { coatPhoto, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRemoveCoatPhoto = () => {
    setPetCoatPhoto(null);
  };

  // If grooming is not available, don't show the flow
  if (!isAvailable) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl sm:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw]">
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
              : currentStep === 6
              ? "Step 6: Location & Logistics"
              : currentStep === 7
              ? "Step 7: When works for you?"
              : currentStep === 8
              ? "Step 8: Make this hassle-free"
              : currentStep === 9
              ? "Step 9: Confirm your details"
              : "Step 10: Booking Summary"
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

        {/* Step 7: Date & Time Selection */}
        {currentStep === 7 && (
        <div className="space-y-6">
          {serviceLocation === "salon" ? (
            <>
              {/* Physical Salon Calendar */}
              <div className="space-y-4">
                <h4 className="font-semibold">Select Date</h4>
                <p className="text-sm text-muted-foreground">
                  Choose a date for your appointment. Available dates are shown in the calendar.
                </p>
                <DateSelectionCalendar
                  mode="single"
                  selectedDates={selectedDate ? [selectedDate] : []}
                  onSelectionChange={(dates) => {
                    if (dates.length > 0) {
                      setSelectedDate(dates[0]);
                      setSelectedTimeSlot(null); // Reset time when date changes
                    } else {
                      setSelectedDate(null);
                    }
                  }}
                  minDate={minBookingDate}
                  disabledDates={disabledDates}
                  bookingRules={{
                    minimumAdvanceBooking: config.bookingRules.leadTime.minimumHours,
                    maximumAdvanceBooking: 14, // 2 weeks
                  }}
                />
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Select Time</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose an available time slot. Total appointment duration: {totalDurationWithAddOns} minutes.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                        className={cn(
                          "h-auto py-3 flex flex-col items-center gap-1",
                          slot.status === "optimal" && "border-green-500 hover:border-green-600",
                          slot.status === "tight" && "border-yellow-500 hover:border-yellow-600",
                          slot.status === "off-peak" && "border-blue-500 hover:border-blue-600",
                          !slot.available && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!slot.available}
                        onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                      >
                        <span className="font-medium">{slot.time}</span>
                        {slot.status === "optimal" && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            Optimal
                          </Badge>
                        )}
                        {slot.status === "tight" && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                            Tight
                          </Badge>
                        )}
                        {slot.status === "off-peak" && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                            Off-peak
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                  {availableTimeSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No available time slots for this date. Please select another date.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : serviceLocation === "mobile" ? (
            <>
              {/* Mobile Date Range Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold">Select Preferred Date Range</h4>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred dates. We'll find the best available slot based on our route optimization.
                </p>
                <DateSelectionCalendar
                  mode="range"
                  rangeStart={mobileDateRange?.start || null}
                  rangeEnd={mobileDateRange?.end || null}
                  onRangeChange={(start, end) => {
                    if (start && end) {
                      // Ensure dates are at start of day
                      const startDate = new Date(start);
                      startDate.setHours(0, 0, 0, 0);
                      const endDate = new Date(end);
                      endDate.setHours(23, 59, 59, 999);
                      setMobileDateRange({ start: startDate, end: endDate });
                      setSelectedDate(null);
                      setSelectedTimeSlot(null);
                    } else {
                      setMobileDateRange(null);
                    }
                  }}
                  minDate={minBookingDate}
                  disabledDates={disabledDates}
                  bookingRules={{
                    minimumAdvanceBooking: config.bookingRules.leadTime.minimumHours,
                    maximumAdvanceBooking: 14,
                  }}
                />
              </div>

              {/* Mobile Time Slot Results */}
              {mobileDateRange && availableTimeSlots.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Available Time Slots</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on route optimization, here are the best available slots:
                  </p>
                  <div className="space-y-3">
                    {availableTimeSlots.map((slot, index) => {
                      // Extract date and time from slot.time (format: "YYYY-MM-DD HH:mm" for mobile)
                      const [datePart, timePart] = slot.time.split(" ");
                      const displayTime = timePart || slot.time;
                      const displayDate = datePart ? new Date(datePart).toLocaleDateString("en-US", { 
                        weekday: "short", 
                        month: "short", 
                        day: "numeric" 
                      }) : null;
                      
                      return (
                        <Card
                          key={`${slot.time}-${index}`}
                          className={cn(
                            "cursor-pointer transition-all",
                            selectedTimeSlot === slot.time ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                          )}
                          onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-3 h-3 rounded-full flex-shrink-0",
                                  slot.status === "optimal" && "bg-green-500",
                                  slot.status === "tight" && "bg-yellow-500",
                                  slot.status === "off-peak" && "bg-blue-500"
                                )} />
                                <div>
                                  {displayDate && (
                                    <p className="text-xs text-muted-foreground mb-1">{displayDate}</p>
                                  )}
                                  <p className="font-medium">{displayTime}</p>
                                  {slot.routePosition && (
                                    <p className="text-xs text-muted-foreground mt-1">{slot.routePosition}</p>
                                  )}
                                  {slot.driveTimeFromPrevious && (
                                    <p className="text-xs text-muted-foreground">
                                      {slot.driveTimeFromPrevious} min drive from previous appointment
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {slot.status === "optimal" && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                    Optimal
                                  </Badge>
                                )}
                                {slot.status === "tight" && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                    Tight
                                  </Badge>
                                )}
                                {slot.status === "off-peak" && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                    Off-peak
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              {mobileDateRange && availableTimeSlots.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No available slots found for the selected date range. Please try a different range.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep6}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinueFromStep7}
                disabled={
                  (serviceLocation === "salon" && (!selectedDate || !selectedTimeSlot)) ||
                  (serviceLocation === "mobile" && !selectedTimeSlot)
                }
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* Step 8: Recurring & Packages (Upsell Layer) */}
        {currentStep === 8 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Make this hassle-free</h4>
            <p className="text-sm text-muted-foreground">
              Set up recurring appointments, use package credits, or upgrade to save more.
            </p>
          </div>

          {/* Recurring Setup */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recurring Appointments</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recurring-enabled"
                    checked={recurringEnabled}
                    onCheckedChange={(checked) => setRecurringEnabled(checked === true)}
                  />
                  <Label htmlFor="recurring-enabled" className="cursor-pointer">
                    Enable recurring
                  </Label>
                </div>
              </div>
            </CardHeader>
            {recurringEnabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Book this every:</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[4, 6, 8].map((weeks) => (
                      <Button
                        key={weeks}
                        variant={recurringFrequency === weeks ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRecurringFrequency(weeks as 4 | 6 | 8)}
                      >
                        {weeks} weeks
                      </Button>
                    ))}
                    <Button
                      variant={recurringFrequency === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRecurringFrequency("custom")}
                    >
                      Custom
                    </Button>
                  </div>
                  {recurringFrequency === "custom" && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min="1"
                        value={customFrequency}
                        onChange={(e) => setCustomFrequency(Number(e.target.value))}
                        className="w-24"
                      />
                      <Label>weeks</Label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End after:</Label>
                  <RadioGroup
                    value={recurringEndAfter}
                    onValueChange={(value) => setRecurringEndAfter(value as "occurrences" | "date" | "never")}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="occurrences" id="end-occurrences" />
                        <Label htmlFor="end-occurrences" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <span>After</span>
                            <Input
                              type="number"
                              min="1"
                              value={recurringOccurrences}
                              onChange={(e) => setRecurringOccurrences(Number(e.target.value))}
                              className="w-20"
                              disabled={recurringEndAfter !== "occurrences"}
                            />
                            <span>occurrences</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="date" id="end-date" />
                        <Label htmlFor="end-date" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <span>Specific date:</span>
                            <Input
                              type="date"
                              value={recurringEndDate ? recurringEndDate.toISOString().split("T")[0] : ""}
                              onChange={(e) => setRecurringEndDate(e.target.value ? new Date(e.target.value) : null)}
                              disabled={recurringEndAfter !== "date"}
                            />
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never" id="end-never" />
                        <Label htmlFor="end-never" className="cursor-pointer">Never (ongoing)</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox
                    id="keep-same-groomer"
                    checked={keepSameGroomer}
                    onCheckedChange={(checked) => setKeepSameGroomer(checked === true)}
                  />
                  <Label htmlFor="keep-same-groomer" className="cursor-pointer">
                    Keep same groomer for all appointments
                  </Label>
                </div>

                {recurringEnabled && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                    <p className="text-sm text-green-800">
                      <strong>Save 10% with recurring</strong> — ${finalPrice.finalPrice.toFixed(2)} instead of ${finalPrice.originalPrice.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Package Redemption */}
          {customerPackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Use Package Credit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerPackages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.creditsRemaining} of {pkg.creditsTotal} credits remaining
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valid until {pkg.validUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`use-package-${pkg.id}`}
                        checked={useExistingPackage && selectedPackageId === pkg.id}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUseExistingPackage(true);
                            setSelectedPackageId(pkg.id);
                            setUpgradeToVIP(false); // Can't use both
                          } else {
                            setUseExistingPackage(false);
                            setSelectedPackageId(null);
                          }
                        }}
                      />
                      <Label htmlFor={`use-package-${pkg.id}`} className="cursor-pointer">
                        Use 1 credit
                      </Label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Package Upsell */}
          {!useExistingPackage && availablePackages.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Save More with a Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availablePackages.map((pkg) => (
                  <div key={pkg.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">${pkg.packagePrice}</p>
                        <p className="text-xs text-muted-foreground line-through">${pkg.totalValue}</p>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-2">
                      <p className="text-sm text-green-800">
                        <strong>Save ${pkg.savings} ({pkg.savingsPercentage}% off)</strong> — ${pkg.savings} off today's booking
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`upsell-package-${pkg.id}`}
                        checked={upsellPackage && selectedUpsellPackageId === pkg.id}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setUpsellPackage(true);
                            setSelectedUpsellPackageId(pkg.id);
                            setUpgradeToVIP(false); // Can't use both
                          } else {
                            setUpsellPackage(false);
                            setSelectedUpsellPackageId(null);
                          }
                        }}
                      />
                      <Label htmlFor={`upsell-package-${pkg.id}`} className="cursor-pointer">
                        Add {pkg.name} and save ${pkg.savings} today
                      </Label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Membership Upsell */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Upgrade to VIP Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>${membershipPlan.monthlyPrice}/month</strong> — Get {membershipPlan.discountPercentage}% off all grooming services
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {membershipPlan.perks.map((perk, index) => (
                    <li key={index}>{perk}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-2">
                <p className="text-sm text-green-800">
                  <strong>Save {membershipPlan.discountPercentage}% on this booking</strong> — ${finalPrice.originalPrice * (membershipPlan.discountPercentage / 100)} off today
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="upgrade-vip"
                  checked={upgradeToVIP}
                  onCheckedChange={(checked) => {
                    setUpgradeToVIP(checked === true);
                    if (checked) {
                      setUseExistingPackage(false); // Can't use both
                      setSelectedPackageId(null);
                      setUpsellPackage(false);
                      setSelectedUpsellPackageId(null);
                    }
                  }}
                />
                <Label htmlFor="upgrade-vip" className="cursor-pointer">
                  Upgrade to VIP for ${membershipPlan.monthlyPrice}/month and get {membershipPlan.discountPercentage}% off this booking
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Price Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-medium">${finalPrice.originalPrice.toFixed(2)}</p>
                </div>
                {finalPrice.discount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <p className="text-sm">Discount ({finalPrice.discountReason})</p>
                    <p className="text-sm font-medium">-${finalPrice.discount.toFixed(2)}</p>
                  </div>
                )}
                {useExistingPackage && (
                  <div className="flex items-center justify-between text-green-600">
                    <p className="text-sm">Package Credit</p>
                    <p className="text-sm font-medium">-${finalPrice.originalPrice.toFixed(2)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-base font-semibold">Total</p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {useExistingPackage ? (
                      <span className="text-green-600">$0.00</span>
                    ) : (
                      <span>${finalPrice.finalPrice.toFixed(2)}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep7}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromStep8}>
                Continue to Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* Step 9: Client Details & Pet Profile Updates */}
        {currentStep === 9 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Confirm your details</h4>
            <p className="text-sm text-muted-foreground">
              Please review and update your contact information and pet details.
            </p>
          </div>

          {/* Client Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setFormErrors((prev) => {
                      const { name, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    setFormErrors((prev) => {
                      const { email, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={formErrors.email ? "border-destructive" : ""}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  We'll send booking confirmations to this email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      setFormErrors((prev) => {
                        const { phone, ...rest } = prev;
                        return rest;
                      });
                      // Reset verification if phone changes
                      if (phoneVerified) {
                        setPhoneVerified(false);
                        setPhoneVerificationSent(false);
                        setPhoneVerificationCode("");
                      }
                    }}
                    className={formErrors.phone ? "border-destructive" : ""}
                    placeholder="(555) 123-4567"
                  />
                  {!phoneVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendVerificationCode}
                      disabled={!clientPhone || !validatePhone(clientPhone) || isSendingCode}
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Code"
                      )}
                    </Button>
                  )}
                  {phoneVerified && (
                    <div className="flex items-center gap-2 px-3 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Verified</span>
                    </div>
                  )}
                </div>
                {formErrors.phone && (
                  <p className="text-sm text-destructive">{formErrors.phone}</p>
                )}
                {isNewClient && !phoneVerified && (
                  <p className="text-xs text-muted-foreground">
                    Phone verification required for new clients to prevent fake bookings
                  </p>
                )}

                {/* Phone Verification Code Input */}
                {phoneVerificationSent && !phoneVerified && (
                  <div className="space-y-2 mt-2 p-3 bg-muted rounded-md">
                    <Label htmlFor="verification-code">Enter verification code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verification-code"
                        type="text"
                        value={phoneVerificationCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setPhoneVerificationCode(value);
                          setFormErrors((prev) => {
                            const { verificationCode, ...rest } = prev;
                            return rest;
                          });
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className={formErrors.verificationCode ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={!phoneVerificationCode || phoneVerificationCode.length !== 6 || isVerifyingPhone}
                      >
                        {isVerifyingPhone ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    {formErrors.verificationCode && (
                      <p className="text-sm text-destructive">{formErrors.verificationCode}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit code sent to {clientPhone}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pet Behavior Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pet Behavior Update - {selectedPet?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pet-behavior">
                  Any changes since last visit?
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Please let us know about any new allergies, injuries, or aggression triggers
                </p>
                <Textarea
                  id="pet-behavior"
                  value={petBehaviorUpdate}
                  onChange={(e) => setPetBehaviorUpdate(e.target.value)}
                  placeholder="e.g., New allergy to lavender, recent leg injury, gets anxious around loud noises..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pet Coat Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Current Coat Condition Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coat-photo">
                  Upload current photo of {selectedPet?.name}'s coat condition
                </Label>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-primary">Helps us prepare!</strong> This helps our groomers understand the current condition of your pet's coat.
                </p>
                {!petCoatPhoto ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="coat-photo"
                      accept="image/*"
                      onChange={handleCoatPhotoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="coat-photo"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG up to 5MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img
                        src={URL.createObjectURL(petCoatPhoto)}
                        alt="Pet coat condition"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveCoatPhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {petCoatPhoto.name} ({(petCoatPhoto.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                {formErrors.coatPhoto && (
                  <p className="text-sm text-destructive">{formErrors.coatPhoto}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Special Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="special-instructions">
                  Additional notes or special requests
                </Label>
                <Textarea
                  id="special-instructions"
                  value={specialInstructions}
                  onChange={(e) => {
                    setSpecialInstructions(e.target.value);
                    setFormErrors((prev) => {
                      const { specialInstructions, ...rest } = prev;
                      return rest;
                    });
                  }}
                  placeholder="Any additional information you'd like our groomers to know..."
                  rows={4}
                  maxLength={500}
                  className={formErrors.specialInstructions ? "border-destructive" : ""}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {formErrors.specialInstructions && (
                      <span className="text-destructive">{formErrors.specialInstructions}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {specialInstructions.length}/500 characters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep8}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueFromStep9}>
                Continue to Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* Step 10: Review & Deposit */}
        {currentStep === 10 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Booking Summary</h4>
            <p className="text-sm text-muted-foreground">
              Please review your booking details and complete payment.
            </p>
          </div>

          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service */}
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">
                    {selectedServiceCategoryName}
                    {selectedVariantName && ` (${selectedVariantName})`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPet?.name} • {formatDuration(calculatedDuration)}
                  </p>
                </div>
                <p className="font-semibold">${calculatedPrice.toFixed(2)}</p>
              </div>

              {/* Add-ons */}
              {selectedAddOnsList.length > 0 && (
                <div className="space-y-2 py-2 border-b">
                  {selectedAddOnsList.map((addon) => (
                    <div key={addon?.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">+</span>
                        <p className="text-sm">{addon?.name}</p>
                        <span className="text-xs text-muted-foreground">
                          (+{addon?.durationMinutes} mins)
                        </span>
                      </div>
                      <p className="text-sm font-medium">+${addon?.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Groomer */}
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Groomer</p>
                  <p className="text-sm text-muted-foreground">{selectedGroomerName}</p>
                </div>
                {groomerSurcharge !== 0 && (
                  <p className={`text-sm font-medium ${groomerSurcharge > 0 ? "" : "text-green-600"}`}>
                    {groomerSurcharge > 0 ? "+" : ""}${groomerSurcharge.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {serviceLocation === "mobile" ? "Mobile van at" : "Salon at"} {locationDisplay}
                  </p>
                </div>
                {serviceLocation === "mobile" && (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Date & Time */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Date & Time</p>
                  <p className="text-sm text-muted-foreground">{formattedDateTime}</p>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <p className="font-medium">Total Duration</p>
                </div>
                <p className="font-semibold">{formatDuration(totalDurationWithAddOns)}</p>
              </div>

              {/* Total Price */}
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-lg font-semibold">Total</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {useExistingPackage ? (
                    <span className="text-green-600">$0.00</span>
                  ) : (
                    <span>${finalPrice.finalPrice.toFixed(2)}</span>
                  )}
                </p>
              </div>
              {finalPrice.discount > 0 && (
                <p className="text-sm text-green-600 text-right">
                  You saved ${finalPrice.savings.toFixed(2)}!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Deposit Collection */}
          {config.bookingRules.deposit.type !== "none" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup
                  value={depositPaymentMethod || ""}
                  onValueChange={(value) => setDepositPaymentMethod(value as "full" | "deposit" | "hold" | "venue")}
                >
                  {availableDepositMethods.map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        depositPaymentMethod === method.id
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setDepositPaymentMethod(method.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label htmlFor={method.id} className="cursor-pointer flex-1">
                            <div>
                              <p className="font-medium">{method.label}</p>
                              <p className="text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </RadioGroup>
                {depositPaymentMethod && depositPaymentMethod !== "venue" && depositPaymentMethod !== "hold" && (
                  <div className="bg-muted rounded-md p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {depositPaymentMethod === "full" ? "Total amount" : "Deposit amount"}
                      </p>
                      <p className="text-lg font-bold">${depositAmount.toFixed(2)}</p>
                    </div>
                    {depositPaymentMethod === "deposit" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Remaining ${(finalPrice.finalPrice - depositAmount).toFixed(2)} due at service
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Policy Acceptance */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="policy-accept"
                    checked={policyAccepted}
                    onCheckedChange={(checked) => {
                      setPolicyAccepted(checked === true);
                      setFormErrors((prev) => {
                        const { policy, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className={formErrors.policy ? "border-destructive" : ""}
                  />
                  <Label htmlFor="policy-accept" className="cursor-pointer flex-1">
                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        24-hour cancellation policy
                      </Link>
                      {" "}({selectedFacility?.name || "facility"}'s specific terms)
                    </span>
                  </Label>
                </div>
                {formErrors.policy && (
                  <p className="text-sm text-destructive">{formErrors.policy}</p>
                )}
                {formErrors.booking && (
                  <p className="text-sm text-destructive">{formErrors.booking}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleBackToStep9}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBookAppointment}
                disabled={!policyAccepted || isBooking}
                className="min-w-[150px]"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Book Appointment"
                )}
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
