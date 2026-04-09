"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BreedCombobox } from "@/components/shared/BreedCombobox";
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  User,
  Heart,
  ShieldCheck,
  Syringe,
  FileCheck,
  ClipboardList,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePetAge } from "@/lib/pet-utils";
import { useSettings } from "@/hooks/use-settings";
import {
  getCustomerLanguageLabel,
  getEnabledCustomerLanguageOptions,
} from "@/lib/language-settings";

// ========================================
// Types
// ========================================

interface PetForm {
  name: string;
  type: string;
  breed: string;
  dateOfBirth: string;
  weight: string;
  sex: string;
  spayedNeutered: string;
  color: string;
  microchip: string;
  allergies: string;
  allergyDetails: string;
  medications: string;
  medicationDetails: string;
  dietaryNeeds: string;
  dietaryDetails: string;
  behaviorNotes: string;
  specialNeeds: string;
}

const EMPTY_PET: PetForm = {
  name: "",
  type: "Dog",
  breed: "",
  dateOfBirth: "",
  weight: "",
  sex: "",
  spayedNeutered: "",
  color: "",
  microchip: "",
  allergies: "no",
  allergyDetails: "",
  medications: "no",
  medicationDetails: "",
  dietaryNeeds: "no",
  dietaryDetails: "",
  behaviorNotes: "",
  specialNeeds: "None",
};

interface VaccineEntry {
  name: string;
  dateAdministered: string;
  expiryDate: string;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
  contactMethod: string;
  language: string;
  vetName: string;
  vetPhone: string;
}

const STEPS = [
  { id: 1, label: "Client", icon: User },
  { id: 2, label: "Pet", icon: Heart },
  { id: 3, label: "Health", icon: ShieldCheck },
  { id: 4, label: "Vaccines", icon: Syringe },
  { id: 5, label: "Agreements", icon: FileCheck },
  { id: 6, label: "Review", icon: ClipboardList },
];

const STORAGE_KEY = "yipyy_create_client_draft";

const DEFAULT_CLIENT: ClientForm = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "Canada",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
  contactMethod: "sms",
  language: "en",
  vetName: "",
  vetPhone: "",
};

const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

function normalizePhoneInput(value: string): string {
  const allowedCharacters = value.replace(/[^\d+()\-\s]/g, "");
  let digitsCount = 0;
  let result = "";

  for (const char of allowedCharacters) {
    if (/\d/.test(char)) {
      if (digitsCount >= PHONE_MAX_DIGITS) {
        continue;
      }

      digitsCount += 1;
      result += char;
      continue;
    }

    if (char === "+") {
      if (result.length === 0 && !result.includes("+")) {
        result += char;
      }

      continue;
    }

    result += char;
  }

  return result;
}

function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

const DEFAULT_VACCINES: VaccineEntry[] = [
  { name: "Rabies", dateAdministered: "", expiryDate: "" },
  { name: "DHPP", dateAdministered: "", expiryDate: "" },
  { name: "Bordetella", dateAdministered: "", expiryDate: "" },
];

const DEFAULT_AGREEMENTS = {
  terms: false,
  liability: false,
  marketing: false,
  sms: true,
  photoVideo: false,
};

type CreateClientDraft = {
  step?: number;
  client?: ClientForm;
  pets?: PetForm[];
};

function loadCreateClientDraft(): CreateClientDraft {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const draft = JSON.parse(saved) as CreateClientDraft;
    return draft && typeof draft === "object" ? draft : {};
  } catch {
    return {};
  }
}

// ========================================
// Props
// ========================================

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newClient: {
    name: string;
    email: string;
    phone?: string;
    preferredLanguage?: string;
    status: string;
    facility: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zip: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
      email: string;
    };
    pets: Array<{
      name: string;
      type: string;
      breed: string;
      age: number;
      weight: number;
      color: string;
      microchip: string;
      allergies: string;
      specialNeeds: string;
    }>;
  }) => void;
  facilityName: string;
}

// ========================================
// Field wrapper with error
// ========================================

function Field({
  label,
  required,
  error,
  reserveErrorSpace,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  reserveErrorSpace?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {(error || reserveErrorSpace) && (
        <p
          className={cn(
            "text-destructive flex items-center gap-1 text-xs leading-tight",
            error ? "visible" : "invisible h-4",
          )}
          aria-live="polite"
        >
          <AlertTriangle className="size-3 shrink-0" />
          {error || " "}
        </p>
      )}
    </div>
  );
}

// ========================================
// Component
// ========================================

export function CreateClientModal({
  open,
  onOpenChange,
  onSave,
  facilityName,
}: CreateClientModalProps) {
  const { languageSettings } = useSettings();
  const customerLanguageOptions = getEnabledCustomerLanguageOptions(
    languageSettings,
  );
  const showPreferredLanguageField = customerLanguageOptions.length > 0;
  const fallbackPreferredLanguage =
    customerLanguageOptions[0]?.code ?? DEFAULT_CLIENT.language;

  const [initialDraft] = useState<CreateClientDraft>(() =>
    loadCreateClientDraft(),
  );

  const [step, setStep] = useState(initialDraft.step ?? 1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Client
  const [client, setClient] = useState<ClientForm>({
    ...DEFAULT_CLIENT,
    ...(initialDraft.client ?? {}),
  });
  const selectedPreferredLanguage = showPreferredLanguageField
    ? customerLanguageOptions.some((option) => option.code === client.language)
      ? client.language
      : fallbackPreferredLanguage
    : DEFAULT_CLIENT.language;

  // Step 2: Pets
  const [petForm, setPetForm] = useState<PetForm>({ ...EMPTY_PET });
  const [pets, setPets] = useState<PetForm[]>(initialDraft.pets ?? []);

  // Step 4: Vaccines
  const [vaccines, setVaccines] = useState<VaccineEntry[]>(
    DEFAULT_VACCINES.map((vaccine) => ({ ...vaccine })),
  );

  // Step 5: Agreements
  const [agreements, setAgreements] = useState({ ...DEFAULT_AGREEMENTS });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ client, pets, step }),
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [client, pets, step, open]);

  // Validation
  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};

    if (s === 1) {
      if (!client.name.trim()) e.name = "Full name is required";
      if (!client.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))
        e.email = "Invalid email format";
      if (!client.phone.trim()) e.phone = "Phone number is required";
      else if (!isValidPhoneNumber(client.phone))
        e.phone = "Use 10-15 digits";
      if (!client.street.trim()) e.street = "Street address is required";
      if (!client.city.trim()) e.city = "City is required";
      if (!client.state.trim()) e.state = "Province/State is required";
      if (!client.zip.trim()) e.zip = "Postal code is required";
      if (!client.emergencyName.trim())
        e.emergencyName = "Emergency contact is required";
      if (!client.emergencyPhone.trim())
        e.emergencyPhone = "Emergency phone is required";
      else if (!isValidPhoneNumber(client.emergencyPhone))
        e.emergencyPhone = "Use 10-15 digits";
      if (
        client.emergencyEmail.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.emergencyEmail)
      ) {
        e.emergencyEmail = "Invalid email format";
      }
    }

    if (s === 3 && client.vetPhone.trim() && !isValidPhoneNumber(client.vetPhone)) {
      e.vetPhone = "Use 10-15 digits";
    }

    if (s === 2 && pets.length === 0) {
      e.pets = "At least one pet is required";
    }

    if (s === 5) {
      if (!agreements.terms) e.terms = "You must accept the terms of service";
      if (!agreements.liability)
        e.liability = "You must accept the liability waiver";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePet = (): boolean => {
    const e: Record<string, string> = {};
    if (!petForm.name.trim()) e.petName = "Pet name is required";
    if (!petForm.breed.trim()) e.petBreed = "Breed is required";
    if (!petForm.dateOfBirth.trim())
      e.petDateOfBirth = "Date of birth is required";
    if (!petForm.weight.trim()) e.petWeight = "Weight is required";
    if (!petForm.sex) e.petSex = "Sex is required";
    if (!petForm.spayedNeutered) e.petSpayedNeutered = "This field is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleAddPet = () => {
    if (validatePet()) {
      setPets([...pets, petForm]);
      setPetForm({ ...EMPTY_PET });
      setErrors({});
    }
  };

  const handleSubmit = () => {
    onSave({
      name: client.name.trim(),
      email: client.email.trim(),
      phone: client.phone.trim(),
      preferredLanguage: showPreferredLanguageField
        ? selectedPreferredLanguage
        : undefined,
      status: "active",
      facility: facilityName,
      address: {
        street: client.street,
        city: client.city,
        state: client.state,
        zip: client.zip,
        country: client.country,
      },
      emergencyContact: {
        name: client.emergencyName,
        relationship: client.emergencyRelationship,
        phone: client.emergencyPhone,
        email: client.emergencyEmail.trim(),
      },
      pets: pets.map((p) => ({
        name: p.name,
        type: p.type,
        breed: p.breed,
        age: calculatePetAge(p.dateOfBirth).years,
        dateOfBirth: p.dateOfBirth || undefined,
        weight: parseFloat(p.weight) || 0,
        color: p.color,
        microchip: p.microchip,
        allergies: p.allergies === "yes" ? p.allergyDetails || "Yes" : "None",
        specialNeeds: p.specialNeeds,
      })),
    });
    onOpenChange(false);
    localStorage.removeItem(STORAGE_KEY);
    resetAll();
  };

  const resetAll = () => {
    setStep(1);
    setClient({ ...DEFAULT_CLIENT });
    setPetForm({ ...EMPTY_PET });
    setPets([]);
    setVaccines(DEFAULT_VACCINES.map((vaccine) => ({ ...vaccine })));
    setAgreements({ ...DEFAULT_AGREEMENTS });
    setErrors({});
  };

  const updateClient = (field: string, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updatePet = (field: string, value: string) => {
    setPetForm((prev) => ({ ...prev, [field]: value }));
    if (errors[`pet${field.charAt(0).toUpperCase() + field.slice(1)}`])
      setErrors((prev) => ({
        ...prev,
        [`pet${field.charAt(0).toUpperCase() + field.slice(1)}`]: "",
      }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            New Client — Step {step} of 6
          </DialogTitle>
          <DialogDescription>
            {STEPS[step - 1].label} information for {facilityName}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex flex-1 flex-col items-center">
                <button
                  onClick={() => {
                    if (done) setStep(s.id);
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-all",
                    done
                      ? "border-primary bg-primary text-primary-foreground cursor-pointer"
                      : active
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground cursor-default",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </button>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* ── Step 1: Client Information ── */}
        {step === 1 && (
          <div className="animate-in fade-in space-y-3 py-2 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" required error={errors.name}>
                <Input
                  value={client.name}
                  onChange={(e) => updateClient("name", e.target.value)}
                  placeholder="John Doe"
                />
              </Field>
              <Field label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={client.email}
                  onChange={(e) => updateClient("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" required error={errors.phone}>
                <Input
                  type="tel"
                  value={client.phone}
                  onChange={(e) =>
                    updateClient("phone", normalizePhoneInput(e.target.value))
                  }
                  placeholder="123-456-7890"
                />
              </Field>
              <Field label="Preferred Contact">
                <Select
                  value={client.contactMethod}
                  onValueChange={(v) => updateClient("contactMethod", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Address
            </p>
            <Field label="Street" required error={errors.street}>
              <Input
                value={client.street}
                onChange={(e) => updateClient("street", e.target.value)}
                placeholder="123 Main Street"
              />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="City" required error={errors.city}>
                <Input
                  value={client.city}
                  onChange={(e) => updateClient("city", e.target.value)}
                  placeholder="Montreal"
                />
              </Field>
              <Field label="Province / State" required error={errors.state}>
                <Input
                  value={client.state}
                  onChange={(e) => updateClient("state", e.target.value)}
                  placeholder="QC"
                />
              </Field>
              <Field label="Postal Code" required error={errors.zip}>
                <Input
                  value={client.zip}
                  onChange={(e) => updateClient("zip", e.target.value)}
                  placeholder="H2X 1Y4"
                />
              </Field>
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Emergency Contact
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Name" required error={errors.emergencyName}>
                <Input
                  value={client.emergencyName}
                  onChange={(e) =>
                    updateClient("emergencyName", e.target.value)
                  }
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Relationship">
                <Input
                  value={client.emergencyRelationship}
                  onChange={(e) =>
                    updateClient("emergencyRelationship", e.target.value)
                  }
                  placeholder="Spouse"
                />
              </Field>
              <Field label="Phone" required error={errors.emergencyPhone}>
                <Input
                  type="tel"
                  value={client.emergencyPhone}
                  onChange={(e) =>
                    updateClient(
                      "emergencyPhone",
                      normalizePhoneInput(e.target.value),
                    )
                  }
                  placeholder="123-456-7891"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Email (Optional)" error={errors.emergencyEmail}>
                <Input
                  type="email"
                  value={client.emergencyEmail}
                  onChange={(e) =>
                    updateClient("emergencyEmail", e.target.value)
                  }
                  placeholder="jane.doe@example.com"
                />
              </Field>
            </div>

            {showPreferredLanguageField && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Preferred Language">
                  <Select
                    value={selectedPreferredLanguage}
                    onValueChange={(v) => updateClient("language", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerLanguageOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {getCustomerLanguageLabel(option.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Pet Information ── */}
        {step === 2 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            {pets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Added Pets ({pets.length})
                </Label>
                {pets.map((p, i) => (
                  <div
                    key={i}
                    className="bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {p.type} · {p.breed} ·{" "}
                        {calculatePetAge(p.dateOfBirth).compact} · {p.weight}{" "}
                        lbs · <span className="capitalize">{p.sex}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setPets(pets.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="mr-1 size-3" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {errors.pets && (
              <p className="text-destructive flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3" />
                {errors.pets}
              </p>
            )}

            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-semibold">Add a Pet</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Pet Name" required error={errors.petName}>
                  <Input
                    value={petForm.name}
                    onChange={(e) => updatePet("name", e.target.value)}
                    placeholder="Buddy"
                  />
                </Field>
                <Field label="Species" required>
                  <Select
                    value={petForm.type}
                    onValueChange={(v) => {
                      updatePet("type", v);
                      updatePet("breed", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Breed" required error={errors.petBreed}>
                <BreedCombobox
                  species={petForm.type}
                  value={petForm.breed}
                  onChange={(v) => updatePet("breed", v)}
                  error={errors.petBreed}
                />
              </Field>

              <Separator />
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Core Details
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Date of Birth"
                  required
                  error={errors.petDateOfBirth}
                >
                  <Input
                    type="date"
                    value={petForm.dateOfBirth}
                    onChange={(e) => updatePet("dateOfBirth", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </Field>
                <Field label="Weight (lbs)" required error={errors.petWeight}>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={petForm.weight}
                      onChange={(e) => updatePet("weight", e.target.value)}
                      placeholder="25"
                      className="pr-10"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                      lbs
                    </span>
                  </div>
                </Field>

                <Field label="Sex" required error={errors.petSex}>
                  <Select
                    value={petForm.sex}
                    onValueChange={(v) => updatePet("sex", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Spayed/Neutered"
                  required
                  error={errors.petSpayedNeutered}
                >
                  <Select
                    value={petForm.spayedNeutered}
                    onValueChange={(v) => updatePet("spayedNeutered", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {petForm.dateOfBirth && (
                <p className="text-muted-foreground text-xs">
                  Pet age: {calculatePetAge(petForm.dateOfBirth).display}
                </p>
              )}

              <Separator />
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Identifiers
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Color / Markings">
                  <Input
                    value={petForm.color}
                    onChange={(e) => updatePet("color", e.target.value)}
                    placeholder="Golden"
                  />
                </Field>
                <Field label="Microchip Number">
                  <Input
                    value={petForm.microchip}
                    onChange={(e) => updatePet("microchip", e.target.value)}
                    placeholder="123456789"
                  />
                </Field>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddPet}
              >
                <Plus className="mr-2 size-4" />
                Add Pet
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Health & Safety ── */}
        {step === 3 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            <p className="text-muted-foreground text-sm">
              Health information for{" "}
              {pets.map((p) => p.name).join(", ") || "your pets"}
            </p>

            <Field label="Allergies">
              <Select
                value={petForm.allergies}
                onValueChange={(v) => updatePet("allergies", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No known allergies</SelectItem>
                  <SelectItem value="yes">Yes — has allergies</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.allergies === "yes" && (
              <Field label="Allergy Details">
                <Textarea
                  value={petForm.allergyDetails}
                  onChange={(e) => updatePet("allergyDetails", e.target.value)}
                  placeholder="Describe allergies..."
                  rows={2}
                />
              </Field>
            )}

            <Field label="Medications">
              <Select
                value={petForm.medications}
                onValueChange={(v) => updatePet("medications", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No medications</SelectItem>
                  <SelectItem value="yes">Yes — takes medication</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.medications === "yes" && (
              <Field label="Medication Details">
                <Textarea
                  value={petForm.medicationDetails}
                  onChange={(e) =>
                    updatePet("medicationDetails", e.target.value)
                  }
                  placeholder="Name, dosage, frequency..."
                  rows={2}
                />
              </Field>
            )}

            <Field label="Special Dietary Needs">
              <Select
                value={petForm.dietaryNeeds}
                onValueChange={(v) => updatePet("dietaryNeeds", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No special diet</SelectItem>
                  <SelectItem value="yes">Yes — special diet</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.dietaryNeeds === "yes" && (
              <Field label="Dietary Details">
                <Textarea
                  value={petForm.dietaryDetails}
                  onChange={(e) => updatePet("dietaryDetails", e.target.value)}
                  placeholder="Describe dietary requirements..."
                  rows={2}
                />
              </Field>
            )}

            <Field label="Behavior Notes">
              <Textarea
                value={petForm.behaviorNotes}
                onChange={(e) => updatePet("behaviorNotes", e.target.value)}
                placeholder="Anxiety triggers, aggression, separation anxiety, etc."
                rows={3}
              />
            </Field>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Veterinarian
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vet Name">
                <Input
                  value={client.vetName}
                  onChange={(e) => updateClient("vetName", e.target.value)}
                  placeholder="Dr. Smith"
                />
              </Field>
              <Field label="Vet Phone" error={errors.vetPhone}>
                <Input
                  type="tel"
                  value={client.vetPhone}
                  onChange={(e) =>
                    updateClient("vetPhone", normalizePhoneInput(e.target.value))
                  }
                  placeholder="123-456-7890"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 4: Vaccinations ── */}
        {step === 4 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            <p className="text-muted-foreground text-sm">
              Vaccination records. You can skip and add later, but bookings may
              be blocked until vaccines are verified.
            </p>

            {vaccines.map((v, i) => (
              <div key={v.name} className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">{v.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date Administered">
                    <Input
                      type="date"
                      value={v.dateAdministered}
                      onChange={(e) =>
                        setVaccines((prev) =>
                          prev.map((vv, ii) =>
                            ii === i
                              ? { ...vv, dateAdministered: e.target.value }
                              : vv,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Expiry Date">
                    <Input
                      type="date"
                      value={v.expiryDate}
                      onChange={(e) =>
                        setVaccines((prev) =>
                          prev.map((vv, ii) =>
                            ii === i
                              ? { ...vv, expiryDate: e.target.value }
                              : vv,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setVaccines([
                  ...vaccines,
                  { name: "Other", dateAdministered: "", expiryDate: "" },
                ])
              }
            >
              <Plus className="mr-2 size-3" />
              Add Vaccine
            </Button>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mb-1 inline size-3" /> Vaccination
              records can be added later, but some services may require proof
              before check-in.
            </div>
          </div>
        )}

        {/* ── Step 5: Agreements ── */}
        {step === 5 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={agreements.terms}
                  onCheckedChange={(v) =>
                    setAgreements({ ...agreements, terms: !!v })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">
                    Terms of Service <span className="text-destructive">*</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    I agree to the facility&apos;s terms of service and
                    policies.
                  </p>
                </div>
              </label>
              {errors.terms && (
                <p className="text-destructive text-xs">{errors.terms}</p>
              )}

              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={agreements.liability}
                  onCheckedChange={(v) =>
                    setAgreements({ ...agreements, liability: !!v })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">
                    Liability Waiver <span className="text-destructive">*</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    I acknowledge the risks associated with pet care services
                    and release the facility from liability.
                  </p>
                </div>
              </label>
              {errors.liability && (
                <p className="text-destructive text-xs">{errors.liability}</p>
              )}

              <Separator />

              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={agreements.marketing}
                  onCheckedChange={(v) =>
                    setAgreements({ ...agreements, marketing: !!v })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Marketing Consent</p>
                  <p className="text-muted-foreground text-xs">
                    I agree to receive promotional emails and offers.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={agreements.sms}
                  onCheckedChange={(v) =>
                    setAgreements({ ...agreements, sms: !!v })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">SMS Consent</p>
                  <p className="text-muted-foreground text-xs">
                    I agree to receive SMS notifications about bookings and
                    updates.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={agreements.photoVideo}
                  onCheckedChange={(v) =>
                    setAgreements({ ...agreements, photoVideo: !!v })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Photo / Video Consent</p>
                  <p className="text-muted-foreground text-xs">
                    I allow photos/videos of my pet to be used for social media
                    and report cards.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 6: Review ── */}
        {step === 6 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            {/* Client summary */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Client
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setStep(1)}
                >
                  Edit
                </Button>
              </div>
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-muted-foreground text-xs">
                {client.email} · {client.phone}
              </p>
              <p className="text-muted-foreground text-xs">
                {client.street}, {client.city}, {client.state} {client.zip}
              </p>
              {showPreferredLanguageField && (
                <p className="text-muted-foreground text-xs">
                  Preferred language: {getCustomerLanguageLabel(selectedPreferredLanguage)}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                Emergency: {client.emergencyName} (
                {client.emergencyRelationship}) · {client.emergencyPhone}
                {client.emergencyEmail ? ` · ${client.emergencyEmail}` : ""}
              </p>
            </div>

            {/* Pets summary */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Pets ({pets.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setStep(2)}
                >
                  Edit
                </Button>
              </div>
              {pets.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <Badge variant="outline" className="text-[10px]">
                    {p.type}
                  </Badge>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {p.breed} · {calculatePetAge(p.dateOfBirth).compact} ·{" "}
                    {p.weight} lbs
                  </span>
                </div>
              ))}
            </div>

            {/* Vaccines summary */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Vaccines
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setStep(4)}
                >
                  Edit
                </Button>
              </div>
              {vaccines.filter((v) => v.dateAdministered).length > 0 ? (
                vaccines
                  .filter((v) => v.dateAdministered)
                  .map((v) => (
                    <p key={v.name} className="text-xs">
                      <span className="font-medium">{v.name}</span>:{" "}
                      {v.dateAdministered}
                      {v.expiryDate && ` → ${v.expiryDate}`}
                    </p>
                  ))
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No vaccines recorded — can be added later
                </p>
              )}
            </div>

            {/* Agreements summary */}
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Agreements
              </p>
              <div className="flex flex-wrap gap-2">
                {agreements.terms && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> Terms
                  </Badge>
                )}
                {agreements.liability && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> Liability
                  </Badge>
                )}
                {agreements.marketing && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> Marketing
                  </Badge>
                )}
                {agreements.sms && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> SMS
                  </Badge>
                )}
                {agreements.photoVideo && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> Photo/Video
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step < 6 && (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
          {step === 6 && (
            <Button onClick={handleSubmit}>
              <Plus className="mr-1 size-4" />
              Create Client
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
