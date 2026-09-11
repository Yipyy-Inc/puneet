"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
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
import { DatePicker } from "@/components/ui/date-picker";
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
  Upload,
  FileImage,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePetAge } from "@/lib/pet-utils";
import { useSettings } from "@/hooks/use-settings";
import {
  getCustomerLanguageLabel,
  getEnabledCustomerLanguageOptions,
} from "@/lib/language-settings";
import { useVaccinationRules } from "@/lib/api/facility-settings";
import type { VaccinationRules } from "@/lib/settings/vaccinations";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import type { AdditionalContact } from "@/types/client";
import { useStaffText } from "@/lib/staff/use-staff-text";

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
  expiryDate: string;
  addLater: boolean;
}

interface ProofFileEntry {
  file: File;
  preview: string;
}

interface PetVaccineRecord {
  vaccines: VaccineEntry[];
  proofs: ProofFileEntry[];
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
  contactMethod: string;
  language: string;
  vetName: string;
  vetPhone: string;
}

const STEPS = [
  { id: 1, key: "stepClient", icon: User },
  { id: 2, key: "stepPet", icon: Heart },
  { id: 3, key: "stepHealth", icon: ShieldCheck },
  { id: 4, key: "stepVaccines", icon: Syringe },
  { id: 5, key: "stepAgreements", icon: FileCheck },
  { id: 6, key: "stepReview", icon: ClipboardList },
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

// The facility's rules are passed IN now. This function read
// `vaccinationRules` from @/data/settings — the file Yipyy ships — so the
// vaccine rows a new client was asked for had nothing to do with what this
// business requires, however carefully somebody had configured it.
function getRequiredVaccinesForSpecies(
  species: string,
  vaccinationRules: VaccinationRules,
): VaccineEntry[] {
  return vaccinationRules
    .filter((rule) => rule.species.toLowerCase() === species.toLowerCase())
    .map((rule) => ({
      name: rule.vaccineName,
      expiryDate: "",
      addLater: false,
    }));
}

function createEmptyPetVaccineRecord(
  species: string,
  vaccinationRules: VaccinationRules,
): PetVaccineRecord {
  return {
    vaccines: getRequiredVaccinesForSpecies(species, vaccinationRules),
    proofs: [],
  };
}

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
  petForm?: PetForm;
  additionalContacts?: AdditionalContact[];
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
// Vaccine Step (extracted to keep main component small)
// ========================================

const PROOF_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
];
const PROOF_MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PetVaccineCard({
  pet,
  petIndex,
  record,
  updateRecord,
}: {
  pet: PetForm;
  petIndex: number;
  record: PetVaccineRecord;
  updateRecord: (
    petIndex: number,
    updater: (prev: PetVaccineRecord) => PetVaccineRecord,
  ) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateVaccine = (i: number, patch: Partial<VaccineEntry>) => {
    updateRecord(petIndex, (prev) => ({
      ...prev,
      vaccines: prev.vaccines.map((v, idx) =>
        idx === i ? { ...v, ...patch } : v,
      ),
    }));
  };

  const handleProofUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (!PROOF_ACCEPTED_TYPES.includes(file.type)) {
        toast.error(
          `${file.name}: Please upload a PDF or image file (JPG, PNG)`,
        );
        continue;
      }
      if (file.size > PROOF_MAX_SIZE) {
        toast.error(`${file.name}: File size must be less than 10MB`);
        continue;
      }
      valid.push(file);
    }

    valid.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = (e.target?.result as string) ?? "";
          updateRecord(petIndex, (prev) => ({
            ...prev,
            proofs: [...prev.proofs, { file, preview }],
          }));
        };
        reader.readAsDataURL(file);
      } else {
        updateRecord(petIndex, (prev) => ({
          ...prev,
          proofs: [...prev.proofs, { file, preview: "" }],
        }));
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeProof = (i: number) => {
    updateRecord(petIndex, (prev) => ({
      ...prev,
      proofs: prev.proofs.filter((_, idx) => idx !== i),
    }));
  };

  const { t, fill } = useStaffText("createClient");
  // french-ok: the species SLUG, used for a lookup and shown in a badge that
  // the catalogue's own species keys cover below
  const speciesLabel = pet.type || "pet";

  if (record.vaccines.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center gap-2">
          <Syringe className="text-muted-foreground size-4" />
          <p className="text-sm font-semibold">
            {pet.name || fill("petN", { n: petIndex + 1 })}
          </p>
          <Badge variant="outline" className="text-[10px] capitalize">
            {speciesLabel}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {fill("noVaccinesConfigured", {
            species: speciesLabel.toLowerCase(),
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Syringe className="text-muted-foreground size-4" />
        <p className="text-sm font-semibold">
          {pet.name || fill("petN", { n: petIndex + 1 })}
        </p>
        <Badge variant="outline" className="text-[10px] capitalize">
          {speciesLabel}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">
          {t("vaccineExpiryDates")}
        </Label>
        {record.vaccines.map((v, i) => (
          <div
            key={`${v.name}-${i}`}
            className={cn(
              "grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2",
              v.addLater && "bg-muted/30 border-dashed",
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{v.name}</p>
              {v.addLater && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-dashed text-[10px]"
                >
                  <Clock className="mr-0.5 size-2.5" />
                  {t("addingLater")}
                </Badge>
              )}
            </div>
            {!v.addLater ? (
              <DatePicker
                value={v.expiryDate}
                onValueChange={(next) => updateVaccine(i, { expiryDate: next })}
                displayMode="dialog"
                popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                calendarClassName="p-1"
                showQuickPresets={false}
                showManualInput={false}
                placeholder={t("expiryDate")}
              />
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
            <button
              type="button"
              onClick={() =>
                updateVaccine(i, {
                  addLater: !v.addLater,
                  expiryDate: v.addLater ? v.expiryDate : "",
                })
              }
              className={cn(
                "rounded-sm px-2 py-1 text-[11px] transition-colors",
                v.addLater
                  ? "text-primary hover:bg-primary/5 font-medium"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {v.addLater ? t("addNow") : t("addLater")}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Label className="text-muted-foreground mb-1.5 block text-xs">
          {t("proofOfVaccination")}
        </Label>
        <p className="text-muted-foreground mb-2 text-[11px]">
          {t("proofHelp")}
        </p>

        <label className="border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            className="hidden"
            onChange={(e) => handleProofUpload(e.target.files)}
          />
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-muted rounded-full p-2">
              <Upload className="text-muted-foreground size-4" />
            </div>
            <p className="text-xs font-medium">
              {record.proofs.length === 0
                ? t("uploadVaccineProof")
                : t("addMorePages")}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {t("multiPageHint")}
            </p>
          </div>
        </label>

        {record.proofs.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {record.proofs.map((p, i) => (
              <div
                key={`${p.file.name}-${i}`}
                className="bg-muted/30 rounded-lg border p-2"
              >
                {p.preview ? (
                  <div className="relative mb-1.5 overflow-hidden rounded-md">
                    <img
                      src={p.preview}
                      alt={p.file.name}
                      className="h-20 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-muted mb-1.5 flex h-20 items-center justify-center rounded-md">
                    <FileImage className="text-muted-foreground size-8 opacity-50" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">
                      {p.file.name}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {formatFileSize(p.file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive size-5 shrink-0 p-0"
                    onClick={() => removeProof(i)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="col-span-full flex items-center gap-1.5">
              <Check className="size-3 text-emerald-600" />
              <p className="text-muted-foreground text-[11px]">
                {fill("filesReady", { count: record.proofs.length })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VaccineStep({
  pets,
  petVaccines,
  updatePetVaccineRecord,
}: {
  pets: PetForm[];
  petVaccines: PetVaccineRecord[];
  updatePetVaccineRecord: (
    petIndex: number,
    updater: (prev: PetVaccineRecord) => PetVaccineRecord,
  ) => void;
}) {
  const { t } = useStaffText("createClient");
  const { rules: vaccinationRules } = useVaccinationRules();

  return (
    <div className="animate-in fade-in space-y-4 py-2 duration-200">
      <p className="text-muted-foreground text-sm">{t("vaccineIntro")}</p>

      {pets.map((pet, i) => (
        <PetVaccineCard
          key={`${pet.name}-${i}`}
          pet={pet}
          petIndex={i}
          record={
            petVaccines[i] ??
            createEmptyPetVaccineRecord(pet.type, vaccinationRules)
          }
          updateRecord={updatePetVaccineRecord}
        />
      ))}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mb-1 inline size-3" />{" "}
        {t("vaccineLaterNotice")}
      </div>
    </div>
  );
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
    additionalContacts: AdditionalContact[];
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
      dateOfBirth?: string;
      sex?: "male" | "female";
      spayedNeutered?: boolean;
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
            "text-destructive flex items-center gap-1 text-xs/tight",
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
  const { t, fill } = useStaffText("createClient");
  const { languageSettings } = useSettings();
  // The facility's vaccination requirements, for the empty record a pet starts
  // with. This file used to read @/data/settings directly, so a new client was
  // asked for the vaccines Yipyy ships rather than the ones this business
  // requires.
  const { rules: vaccinationRules } = useVaccinationRules();
  const customerLanguageOptions =
    getEnabledCustomerLanguageOptions(languageSettings);
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
  const [additionalContacts, setAdditionalContacts] = useState<
    AdditionalContact[]
  >(initialDraft.additionalContacts ?? []);
  const selectedPreferredLanguage = showPreferredLanguageField
    ? customerLanguageOptions.some((option) => option.code === client.language)
      ? client.language
      : fallbackPreferredLanguage
    : DEFAULT_CLIENT.language;

  // Step 2: Pets
  const [petForm, setPetForm] = useState<PetForm>({
    ...EMPTY_PET,
    ...(initialDraft.petForm ?? {}),
  });
  const [pets, setPets] = useState<PetForm[]>(initialDraft.pets ?? []);

  // Step 4: Vaccines — one record per pet, scoped to species requirements.
  // Records are created lazily: the VaccineStep falls back to
  // createEmptyPetVaccineRecord(pet.type) for any pet without a stored record.
  const [petVaccines, setPetVaccines] = useState<PetVaccineRecord[]>([]);

  const updatePetVaccineRecord = (
    petIndex: number,
    updater: (prev: PetVaccineRecord) => PetVaccineRecord,
  ) => {
    setPetVaccines((prev) => {
      const next = [...prev];
      const current =
        next[petIndex] ??
        createEmptyPetVaccineRecord(
          // french-ok: the default species SLUG, matched against the rules
          pets[petIndex]?.type ?? "Dog",
          vaccinationRules,
        );
      next[petIndex] = updater(current);
      return next;
    });
  };

  // Step 5: Agreements
  const [agreements, setAgreements] = useState({ ...DEFAULT_AGREEMENTS });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            client,
            pets,
            petForm,
            step,
            additionalContacts,
          }),
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [client, pets, petForm, step, open, additionalContacts]);

  // Validation
  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};

    if (s === 1) {
      if (!client.name.trim()) e.name = "Full name is required";
      if (!client.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))
        e.email = "Invalid email format";
      if (!client.phone.trim()) e.phone = "Phone number is required";
      else if (!isValidPhoneNumber(client.phone)) e.phone = "Use 10-15 digits";
      if (!client.street.trim()) e.street = "Street address is required";
      if (!client.city.trim()) e.city = "City is required";
      if (!client.state.trim()) e.state = "Province/State is required";
      if (!client.zip.trim()) e.zip = "Postal code is required";

      additionalContacts.forEach((contact, index) => {
        // french-ok: an error-map key prefix, never rendered
        const prefix = `additionalContact-${index}`;
        if (!contact.name.trim()) {
          e[`${prefix}-name`] = "Contact name is required";
        }
        if (!contact.phone.trim()) {
          e[`${prefix}-phone`] = "Contact phone is required";
        } else if (!isValidPhoneNumber(contact.phone)) {
          e[`${prefix}-phone`] = "Use 10-15 digits";
        }
        if (
          contact.email &&
          contact.email.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
        ) {
          e[`${prefix}-email`] = "Invalid email format";
        }
      });
    }

    if (
      s === 3 &&
      client.vetPhone.trim() &&
      !isValidPhoneNumber(client.vetPhone)
    ) {
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

  const hasPetDraftData = (): boolean => {
    return (Object.keys(EMPTY_PET) as Array<keyof PetForm>).some((key) => {
      return petForm[key].trim() !== EMPTY_PET[key].trim();
    });
  };

  const addPetFromDraft = (): boolean => {
    if (!validatePet()) {
      return false;
    }

    setPets((previous) => [...previous, petForm]);
    setPetForm({ ...EMPTY_PET });
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 2 && pets.length === 0) {
      if (!hasPetDraftData()) {
        setErrors({ pets: "At least one pet is required" });
        return;
      }

      if (!addPetFromDraft()) {
        return;
      }

      setStep(3);
      return;
    }

    if (validateStep(step)) setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleAddPet = () => {
    addPetFromDraft();
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
      additionalContacts: additionalContacts.map((c) => ({
        ...c,
        name: c.name.trim(),
        phone: c.phone.trim(),
        email: c.email?.trim() ?? "",
      })),
      pets: pets.map((p) => ({
        name: p.name,
        type: p.type,
        breed: p.breed,
        age: calculatePetAge(p.dateOfBirth).years,
        dateOfBirth: p.dateOfBirth || undefined,
        weight: parseFloat(p.weight) || 0,
        color: p.color,
        microchip: p.microchip,
        // french-ok: written to the pet RECORD, read back by other screens
        allergies: p.allergies === "yes" ? p.allergyDetails || "Yes" : "None",
        specialNeeds: p.specialNeeds,
        // Both are REQUIRED on the pet step and were dropped here, so every
        // pet created with its owner was stored with neither.
        sex: p.sex === "male" || p.sex === "female" ? p.sex : undefined,
        spayedNeutered: p.spayedNeutered
          ? p.spayedNeutered === "yes"
          : undefined,
      })),
    });
    onOpenChange(false);
    localStorage.removeItem(STORAGE_KEY);
    resetAll();
  };

  const resetAll = () => {
    setStep(1);
    setClient({ ...DEFAULT_CLIENT });
    setAdditionalContacts([]);
    setPetForm({ ...EMPTY_PET });
    setPets([]);
    setPetVaccines([]);
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
            {fill("title", { step })}
          </DialogTitle>
          <DialogDescription>
            {fill("subtitle", {
              step: t(STEPS[step - 1].key),
              facility: facilityName,
            })}
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
                  {t(s.key)}
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
              <Field label={t("fullName")} required error={errors.name}>
                <Input
                  value={client.name}
                  onChange={(e) => updateClient("name", e.target.value)}
                  placeholder={t("fullNamePlaceholder")}
                />
              </Field>
              <Field label={t("email")} required error={errors.email}>
                <Input
                  type="email"
                  value={client.email}
                  onChange={(e) => updateClient("email", e.target.value)}
                  placeholder={t("emailPlaceholder")}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("phone")} required error={errors.phone}>
                <Input
                  type="tel"
                  value={client.phone}
                  onChange={(e) =>
                    updateClient("phone", normalizePhoneInput(e.target.value))
                  }
                  placeholder="123-456-7890"
                />
              </Field>
              <Field label={t("preferredContact")}>
                <Select
                  value={client.contactMethod}
                  onValueChange={(v) => updateClient("contactMethod", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">{t("email")}</SelectItem>
                    <SelectItem value="phone">{t("phone")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {t("address")}
            </p>
            <Field label={t("street")} required error={errors.street}>
              <Input
                value={client.street}
                onChange={(e) => updateClient("street", e.target.value)}
                placeholder={t("streetPlaceholder")}
              />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t("city")} required error={errors.city}>
                <Input
                  value={client.city}
                  onChange={(e) => updateClient("city", e.target.value)}
                  placeholder={t("cityPlaceholder")}
                />
              </Field>
              <Field label={t("province")} required error={errors.state}>
                <Input
                  value={client.state}
                  onChange={(e) => updateClient("state", e.target.value)}
                  placeholder="QC"
                />
              </Field>
              <Field label={t("postalCode")} required error={errors.zip}>
                <Input
                  value={client.zip}
                  onChange={(e) => updateClient("zip", e.target.value)}
                  placeholder="H2X 1Y4"
                />
              </Field>
            </div>

            <Separator />
            <AdditionalContactsManager
              value={additionalContacts}
              onChange={(contacts) => {
                setAdditionalContacts(contacts);
                if (
                  Object.keys(errors).some((k) =>
                    k.startsWith("additionalContact-"),
                  )
                ) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((k) => {
                      if (k.startsWith("additionalContact-")) delete next[k];
                    });
                    return next;
                  });
                }
              }}
              heading={t("additionalContacts")}
              description={t("additionalContactsHelp")}
            />

            {showPreferredLanguageField && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("preferredLanguage")}>
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
                  {fill("addedPets", { count: pets.length })}
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
                      {t("remove")}
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
              <p className="text-sm font-semibold">{t("addAPet")}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t("petName")} required error={errors.petName}>
                  <Input
                    value={petForm.name}
                    onChange={(e) => updatePet("name", e.target.value)}
                    placeholder={t("petNamePlaceholder")}
                  />
                </Field>
                <Field label={t("species")} required>
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
                      <SelectItem value="Dog">{t("speciesDog")}</SelectItem>
                      <SelectItem value="Cat">{t("speciesCat")}</SelectItem>
                      <SelectItem value="Other">{t("speciesOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label={t("breed")} required error={errors.petBreed}>
                <BreedCombobox
                  species={petForm.type}
                  value={petForm.breed}
                  onChange={(v) => updatePet("breed", v)}
                  error={errors.petBreed}
                />
              </Field>

              <Separator />
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("coreDetails")}
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="mx-auto w-full max-w-sm">
                    <Field
                      label={t("dateOfBirth")}
                      required
                      error={errors.petDateOfBirth}
                    >
                      <DatePicker
                        value={petForm.dateOfBirth}
                        onValueChange={(next) => updatePet("dateOfBirth", next)}
                        max={new Date().toISOString().split("T")[0]}
                        placeholder={t("selectDateOfBirth")}
                        displayMode="dialog"
                        popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                        calendarClassName="p-1"
                        showQuickPresets={false}
                      />
                    </Field>
                  </div>
                </div>
                <Field label={t("weightLbs")} required error={errors.petWeight}>
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
                      {t("lbs")}
                    </span>
                  </div>
                </Field>

                <Field label={t("sex")} required error={errors.petSex}>
                  <Select
                    value={petForm.sex}
                    onValueChange={(v) => updatePet("sex", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("sexMale")}</SelectItem>
                      <SelectItem value="female">{t("sexFemale")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label={t("spayedNeutered")}
                  required
                  error={errors.petSpayedNeutered}
                >
                  <Select
                    value={petForm.spayedNeutered}
                    onValueChange={(v) => updatePet("spayedNeutered", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("yes")}</SelectItem>
                      <SelectItem value="no">{t("no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {petForm.dateOfBirth && (
                <p className="text-muted-foreground text-xs">
                  {t("petAge")} {calculatePetAge(petForm.dateOfBirth).display}
                </p>
              )}

              <Separator />
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("identifiers")}
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t("colorMarkings")}>
                  <Input
                    value={petForm.color}
                    onChange={(e) => updatePet("color", e.target.value)}
                    placeholder={t("colorPlaceholder")}
                  />
                </Field>
                <Field label={t("microchipNumber")}>
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
                {t("addPet")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Health & Safety ── */}
        {step === 3 && (
          <div className="animate-in fade-in space-y-4 py-2 duration-200">
            <p className="text-muted-foreground text-sm">
              {fill("healthInformationFor", {
                name: pets.map((p) => p.name).join(", ") || t("yourPets"),
              })}
            </p>

            <Field label={t("allergies")}>
              <Select
                value={petForm.allergies}
                onValueChange={(v) => updatePet("allergies", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">{t("noKnownAllergies")}</SelectItem>
                  <SelectItem value="yes">{t("hasAllergies")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.allergies === "yes" && (
              <Field label={t("allergyDetails")}>
                <Textarea
                  value={petForm.allergyDetails}
                  onChange={(e) => updatePet("allergyDetails", e.target.value)}
                  placeholder={t("allergyPlaceholder")}
                  rows={2}
                />
              </Field>
            )}

            <Field label={t("medications")}>
              <Select
                value={petForm.medications}
                onValueChange={(v) => updatePet("medications", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">{t("noMedications")}</SelectItem>
                  <SelectItem value="yes">{t("takesMedication")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.medications === "yes" && (
              <Field label={t("medicationDetails")}>
                <Textarea
                  value={petForm.medicationDetails}
                  onChange={(e) =>
                    updatePet("medicationDetails", e.target.value)
                  }
                  placeholder={t("medicationPlaceholder")}
                  rows={2}
                />
              </Field>
            )}

            <Field label={t("specialDietaryNeeds")}>
              <Select
                value={petForm.dietaryNeeds}
                onValueChange={(v) => updatePet("dietaryNeeds", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">{t("noSpecialDiet")}</SelectItem>
                  <SelectItem value="yes">{t("hasSpecialDiet")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {petForm.dietaryNeeds === "yes" && (
              <Field label={t("dietaryDetails")}>
                <Textarea
                  value={petForm.dietaryDetails}
                  onChange={(e) => updatePet("dietaryDetails", e.target.value)}
                  placeholder={t("dietaryPlaceholder")}
                  rows={2}
                />
              </Field>
            )}

            <Field label={t("behaviorNotes")}>
              <Textarea
                value={petForm.behaviorNotes}
                onChange={(e) => updatePet("behaviorNotes", e.target.value)}
                placeholder={t("behaviorPlaceholder")}
                rows={3}
              />
            </Field>

            <Separator />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {t("veterinarian")}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("vetName")}>
                <Input
                  value={client.vetName}
                  onChange={(e) => updateClient("vetName", e.target.value)}
                  placeholder={t("vetNamePlaceholder")}
                />
              </Field>
              <Field label={t("vetPhone")} error={errors.vetPhone}>
                <Input
                  type="tel"
                  value={client.vetPhone}
                  onChange={(e) =>
                    updateClient(
                      "vetPhone",
                      normalizePhoneInput(e.target.value),
                    )
                  }
                  placeholder="123-456-7890"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 4: Vaccinations ── */}
        {step === 4 && (
          <VaccineStep
            pets={pets}
            petVaccines={petVaccines}
            updatePetVaccineRecord={updatePetVaccineRecord}
          />
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
                    {t("termsOfService")}{" "}
                    <span className="text-destructive">*</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("termsBody")}
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
                    {t("liabilityWaiver")}{" "}
                    <span className="text-destructive">*</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("liabilityBody")}
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
                  <p className="text-sm font-medium">{t("marketingConsent")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("marketingBody")}
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
                  <p className="text-sm font-medium">{t("smsConsent")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("smsBody")}
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
                  <p className="text-sm font-medium">{t("photoConsent")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("photoBody")}
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
                  {t("stepClient")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setStep(1)}
                >
                  {t("edit")}
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
                  {t("preferredLanguageIs")}{" "}
                  {getCustomerLanguageLabel(selectedPreferredLanguage)}
                </p>
              )}
              {additionalContacts.length > 0 && (
                <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                  <p className="font-medium">
                    {fill("additionalContactsCount", {
                      count: additionalContacts.length,
                    })}
                  </p>
                  {additionalContacts.map((contact) => (
                    <p key={contact.id}>
                      {contact.name}
                      {contact.relationship ? ` (${contact.relationship})` : ""}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                      {contact.tags.length > 0
                        ? ` — ${contact.tags
                            .map((t) =>
                              t === "dropoff"
                                ? "Drop-off"
                                : t.charAt(0).toUpperCase() + t.slice(1),
                            )
                            .join(", ")}`
                        : ""}
                    </p>
                  ))}
                </div>
              )}
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
                  {t("edit")}
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
                    {p.weight} {t("lbs")}
                  </span>
                </div>
              ))}
            </div>

            {/* Vaccines summary */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("stepVaccines")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setStep(4)}
                >
                  {t("edit")}
                </Button>
              </div>
              {pets.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  {t("noPetsYet")}
                </p>
              ) : (
                pets.map((pet, petIdx) => {
                  const record = petVaccines[petIdx];
                  const vaccines = record?.vaccines ?? [];
                  const proofs = record?.proofs ?? [];
                  const hasAny =
                    vaccines.some((v) => v.expiryDate || v.addLater) ||
                    proofs.length > 0;

                  return (
                    <div
                      key={`${pet.name}-${petIdx}`}
                      className="border-muted mb-2 border-b pb-2 last:mb-0 last:border-b-0 last:pb-0"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {pet.name || fill("petN", { n: petIdx + 1 })}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {pet.type}
                        </Badge>
                        {proofs.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            <FileImage className="mr-0.5 size-2.5" />
                            {fill("proofFiles", { count: proofs.length })}
                          </Badge>
                        )}
                      </div>
                      {vaccines.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">
                          {t("noVaccinesForSpecies")}
                        </p>
                      ) : !hasAny ? (
                        <p className="text-muted-foreground text-xs italic">
                          {t("noVaccinesRecorded")}
                        </p>
                      ) : (
                        vaccines.map((v) => (
                          <div
                            key={v.name}
                            className="flex items-center gap-2 py-0.5"
                          >
                            <span className="text-xs font-medium">
                              {v.name}:
                            </span>
                            {v.addLater ? (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground border-dashed text-[10px]"
                              >
                                <Clock className="mr-0.5 size-2.5" />
                                {t("addingLater")}
                              </Badge>
                            ) : v.expiryDate ? (
                              <span className="text-muted-foreground text-xs">
                                {t("expires")} {v.expiryDate}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                {t("notSet")}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Agreements summary */}
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                {t("agreements")}
              </p>
              <div className="flex flex-wrap gap-2">
                {agreements.terms && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> {t("terms")}
                  </Badge>
                )}
                {agreements.liability && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> {t("liability")}
                  </Badge>
                )}
                {agreements.marketing && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Check className="mr-1 size-2.5" /> {t("marketing")}
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
              {t("back")}
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
          )}
          {step < 6 && (
            <Button onClick={handleNext}>
              {t("next")}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
          {step === 6 && (
            <Button onClick={handleSubmit}>
              <Plus className="mr-1 size-4" />
              {t("createClient")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
