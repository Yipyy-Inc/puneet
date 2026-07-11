"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Sparkles,
  Check,
  ChevronRight,
  Search,
  FileText,
  Send,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Mail,
  Phone,
  PawPrint,
  Info,
  Dog,
  Cat,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { clients } from "@/data/clients";
import { getNextEstimateId } from "@/data/estimates";
import { trainingClasses } from "@/data/training";
import { taxRates } from "@/data/settings";
import { defaultServiceAddOns } from "@/data/service-addons";
import { defaultDepositRules } from "@/data/deposit-rules";
import { getEstimateSettings } from "@/data/estimate-settings";
import { provisionAccountForEstimate } from "@/lib/estimates/account-provisioning";
import {
  sendStandardEstimateEmail,
  sendWelcomeEstimateEmail,
} from "@/lib/estimates/email-sends";
import { GuestContactForm } from "./GuestContactForm";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import type { Estimate, EstimateLineItem } from "@/types/booking";

interface EstimateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
}

const STEPS = [
  { id: "client", title: "Client" },
  { id: "pets", title: "Pets" },
  { id: "service", title: "Service" },
  { id: "details", title: "Details" },
  { id: "review", title: "Review & Send" },
];

interface AddedPet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
}

// Facility-configured discount reasons offered on estimates (+ Custom free text).
const DISCOUNT_TYPES = [
  "Loyalty",
  "Seasonal Promotion",
  "Multi-Pet",
  "Referral",
  "Staff",
  "Custom",
] as const;

// Default estimate expiry: today + settings.defaultExpiryDays (F2), as YYYY-MM-DD.
function computeDefaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + getEstimateSettings().defaultExpiryDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EstimateWizard({ open, onOpenChange }: EstimateWizardProps) {
  const [step, setStep] = useState(0);

  // Client selection
  const [isGuest, setIsGuest] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Pet selection (existing-client flow)
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [addedPets, setAddedPets] = useState<AddedPet[]>([]);
  const [petTempSeq, setPetTempSeq] = useState(-1);
  const [isAddingPet, setIsAddingPet] = useState(false);
  const emptyPetDraft = {
    name: "",
    species: "Dog",
    breed: "",
    age: "",
    weight: "",
  };
  const [newPetDraft, setNewPetDraft] = useState(emptyPetDraft);

  // Guest contact
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPetNames, setGuestPetNames] = useState<string[]>([""]);
  const [publicNote, setPublicNote] = useState("");
  const [createAccount, setCreateAccount] = useState(true);

  // Service
  const [selectedService, setSelectedService] = useState("");

  // Details
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [roomType, setRoomType] = useState("");
  // Service-conditional (spec 4.3)
  const [daycareMode, setDaycareMode] = useState<"single" | "multi">("single");
  const [trainingProgramId, setTrainingProgramId] = useState("");
  const [trainingSessions, setTrainingSessions] = useState(1);

  // Line items
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [internalNote, setInternalNote] = useState("");
  // Notes & expiry (spec 4.5)
  const [expiryDate, setExpiryDate] = useState(computeDefaultExpiry);
  // Pricing (spec 4.4)
  const [addonSearch, setAddonSearch] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">(
    "fixed",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountCustomReason, setDiscountCustomReason] = useState("");
  const [depositOverride, setDepositOverride] = useState("");

  // Completion
  const [created, setCreated] = useState(false);
  const [sent, setSent] = useState(false);
  const [accountProvisioned, setAccountProvisioned] = useState(false);
  const [generatedEstimateId, setGeneratedEstimateId] = useState<string | null>(
    null,
  );

  const facilityClients = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.facility === "Example Pet Care Facility" && c.status !== "prospect",
      ),
    [],
  );

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return facilityClients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return facilityClients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [clientSearch, facilityClients]);

  const selectedClient = facilityClients.find((c) => c.id === selectedClientId);

  const guestPetSummary = guestPetNames
    .map((name) => name.trim())
    .filter(Boolean);

  const resolvedGuestPetNames = guestPetNames.length > 0 ? guestPetNames : [""];

  const handleGuestPetNameChange = (index: number, value: string) => {
    setGuestPetNames((prev) => {
      const names = [...prev];
      names[index] = value;
      return names;
    });
  };

  const addGuestPetField = () => {
    setGuestPetNames((prev) => [...prev, ""]);
  };

  const removeGuestPetField = (index: number) => {
    setGuestPetNames((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Existing-client pet selection ─────────────────────────────────────────
  const togglePet = (id: number) =>
    setSelectedPetIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const submitNewPet = () => {
    const name = newPetDraft.name.trim();
    if (!name) return;
    const id = petTempSeq;
    setPetTempSeq((s) => s - 1);
    setAddedPets((prev) => [...prev, { ...newPetDraft, name, id }]);
    setSelectedPetIds((prev) => [...prev, id]);
    setNewPetDraft(emptyPetDraft);
    setIsAddingPet(false);
  };

  const removeAddedPet = (id: number) => {
    setAddedPets((prev) => prev.filter((p) => p.id !== id));
    setSelectedPetIds((prev) => prev.filter((p) => p !== id));
  };

  // Normalized card list (existing pets + newly-added) and the resolved set of
  // pets this estimate is for (used by the Details context + downstream).
  const clientPetCards = selectedClient
    ? [
        ...selectedClient.pets.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.type,
          breed: p.breed,
        })),
        ...addedPets.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
        })),
      ]
    : [];

  const estimatePetLabels = isGuest
    ? guestPetSummary
    : clientPetCards
        .filter((p) => selectedPetIds.includes(p.id))
        .map((p) => p.name);

  // Auto-generate line items from service details
  const autoLineItems = useMemo((): EstimateLineItem[] => {
    if (!selectedService || !startDate) return [];
    const svc = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
    const price = svc?.basePrice ?? 45;
    const items: EstimateLineItem[] = [];

    const nightsBetween = () =>
      Math.max(
        1,
        Math.round(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            86400000,
        ),
      );

    if (selectedService === "boarding" && startDate && endDate) {
      const roomPrices: Record<string, number> = {
        Standard: 35,
        Premium: 50,
        "Luxury Suite": 65,
      };
      const nightlyRate = roomPrices[roomType] ?? price;
      const nights = nightsBetween();
      items.push({
        label: roomType ? `${roomType} Room` : "Boarding Room",
        description: `${nights} night${nights !== 1 ? "s" : ""} @ $${nightlyRate}/night`,
        amount: nightlyRate,
        quantity: nights,
        total: nightlyRate * nights,
      });
    } else if (selectedService === "daycare") {
      const days = daycareMode === "multi" && endDate ? nightsBetween() + 1 : 1;
      items.push({
        label: "Daycare",
        description: `${days} day${days !== 1 ? "s" : ""} @ $${price}/day`,
        amount: price,
        quantity: days,
        total: price * days,
      });
    } else if (selectedService === "training") {
      const program = trainingClasses.find((c) => c.id === trainingProgramId);
      const perSession =
        program && program.totalSessions > 0
          ? Math.round(program.price / program.totalSessions)
          : price;
      const sessions = Math.max(1, trainingSessions);
      items.push({
        label: program ? program.name : "Training",
        description: `${sessions} session${sessions !== 1 ? "s" : ""} @ $${perSession}/session`,
        amount: perSession,
        quantity: sessions,
        total: perSession * sessions,
      });
    } else {
      items.push({
        label: svc?.name ?? "Service",
        description: `${svc?.name ?? "Service"} service`,
        amount: price,
        quantity: 1,
        total: price,
      });
    }
    return items;
  }, [
    selectedService,
    startDate,
    endDate,
    roomType,
    daycareMode,
    trainingProgramId,
    trainingSessions,
  ]);

  // Merge auto + custom line items
  const allLineItems = lineItems.length > 0 ? lineItems : autoLineItems;
  const subtotal = allLineItems.reduce((s, li) => s + li.total, 0);

  // Discount — % of subtotal or a flat $ amount.
  const discountAmount =
    discountMode === "percent"
      ? Math.round(subtotal * ((Number(discountValue) || 0) / 100) * 100) / 100
      : Number(discountValue) || 0;

  // Tax — auto-applied from settings: service-specific rate, else the default.
  const taxRatePct =
    taxRates.find((t) => t.applicableServices.includes(selectedService))
      ?.rate ??
    taxRates.find((t) => t.applicableServices.includes("all"))?.rate ??
    taxRates.find((t) => t.isDefault)?.rate ??
    0;
  const taxRate = taxRatePct / 100;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxable * taxRate;
  const total = taxable + taxAmount;

  // Deposit — auto-populated from the facility's deposit rules, overridable.
  const depositRule = defaultDepositRules.find(
    (r) =>
      r.enabled && r.scope === "service" && r.serviceType === selectedService,
  );
  const depositAuto = depositRule
    ? depositRule.amountType === "percentage"
      ? Math.round(total * (depositRule.amount / 100) * 100) / 100
      : depositRule.amount
    : 0;

  // Add-ons offered for this service (fallback to all active).
  const serviceAddOns = defaultServiceAddOns.filter(
    (a) => a.isActive && a.applicableServices.includes(selectedService),
  );
  const activeAddOns =
    serviceAddOns.length > 0
      ? serviceAddOns
      : defaultServiceAddOns.filter((a) => a.isActive);
  const filteredAddOns = addonSearch.trim()
    ? activeAddOns.filter((a) =>
        a.name.toLowerCase().includes(addonSearch.toLowerCase()),
      )
    : activeAddOns;

  // Service types offered on estimates (spec 4.3): the four core services + Other.
  const serviceOptions: {
    id: string;
    name: string;
    basePrice: number;
    icon: LucideIcon;
  }[] = [
    ...SERVICE_CATEGORIES.filter((s) =>
      ["boarding", "daycare", "grooming", "training"].includes(s.id),
    ).map((s) => ({
      id: s.id,
      name: s.name,
      basePrice: s.basePrice,
      icon: s.icon,
    })),
    { id: "other", name: "Other", basePrice: 45, icon: Package },
  ];

  const handleSelectProgram = (id: string) => {
    setTrainingProgramId(id);
    const program = trainingClasses.find((c) => c.id === id);
    if (program) setTrainingSessions(program.totalSessions);
  };

  // Whether the service-conditional inputs for the chosen service are complete.
  const detailsValid =
    selectedService === "boarding"
      ? !!startDate && !!endDate && !!roomType
      : selectedService === "daycare"
        ? daycareMode === "multi"
          ? !!startDate && !!endDate
          : !!startDate
        : selectedService === "training"
          ? !!trainingProgramId && !!startDate
          : !!startDate;

  const canProceed =
    step === 0
      ? isGuest
        ? !!guestName.trim() && !!guestEmail.trim()
        : !!selectedClientId
      : step === 1
        ? isGuest
          ? guestPetSummary.length > 0
          : selectedPetIds.length > 0
        : step === 2
          ? !!selectedService
          : step === 3
            ? detailsValid
            : step === 4
              ? isGuest
                ? !!guestName.trim() && !!guestEmail.trim()
                : true
              : false;

  const handleNext = () => {
    if (step === 3 && lineItems.length === 0) {
      setLineItems(autoLineItems);
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  // Send-time context (spec 4.6): recipient + welcome-email eligibility.
  const recipientEmail = (
    isGuest ? guestEmail : (selectedClient?.email ?? "")
  ).trim();
  const welcomeEmailSent =
    accountProvisioned && getEstimateSettings().sendWelcomeEmail;

  // Assemble the estimate object from wizard state (used on send).
  const buildEstimate = (id: string, now: Date): Estimate => ({
    id,
    estimateId: id,
    clientId: selectedClientId ?? 0,
    clientName: isGuest ? guestName : (selectedClient?.name ?? ""),
    clientEmail: recipientEmail,
    clientPhone: isGuest ? guestPhone : selectedClient?.phone,
    petIds: isGuest ? [] : selectedPetIds,
    petNames: estimatePetLabels,
    service: selectedService,
    serviceType: roomType || undefined,
    startDate,
    endDate: endDate || startDate,
    lineItems: allLineItems,
    subtotal,
    discount: discountAmount,
    discountReason: discountType
      ? discountType === "Custom"
        ? discountCustomReason
        : discountType
      : undefined,
    taxRate,
    taxAmount,
    total,
    depositRequired:
      depositOverride.trim() !== ""
        ? Number(depositOverride) || 0
        : depositAuto,
    status: "sent",
    sentAt: now.toISOString(),
    sentVia: "email",
    expiresAt: expiryDate || undefined,
    createdAt: now.toISOString(),
    createdBy: "Front Desk",
    isGuestEstimate: isGuest || undefined,
    guestName: isGuest ? guestName : undefined,
    guestEmail: isGuest ? guestEmail : undefined,
    guestPhone: isGuest ? guestPhone : undefined,
    publicNote: publicNote || undefined,
    internalNote: internalNote || undefined,
    roomType: roomType || undefined,
    checkInTime,
    checkOutTime,
    guestPetInfo:
      isGuest && guestPetSummary[0] ? { name: guestPetSummary[0] } : undefined,
  });

  // "Save as Draft" — persists the estimate without sending (spec 4.6). Never
  // triggers account provisioning.
  const handleSaveDraft = () => {
    const id = generatedEstimateId ?? getNextEstimateId();
    setGeneratedEstimateId(id);
    setCreated(true);
    toast.success(`Estimate ${id} saved as draft`);
  };

  // "Send Estimate" — saves + sends. Runs the account auto-creation flow (Area
  // 4) when the email isn't already in the CRM; the estimate email goes out
  // (Area 6). Reuses the id if saved as draft first.
  const handleSendEstimate = () => {
    const id = generatedEstimateId ?? getNextEstimateId();
    const now = new Date();
    const estimate = buildEstimate(id, now);
    const outcome = provisionAccountForEstimate(estimate, {
      facilityName: "Example Pet Care Facility",
      now,
    });
    // Mocked send: combined welcome+estimate email for a new account (6.2),
    // otherwise the standard estimate email (6.1).
    if (outcome.accountCreated) sendWelcomeEstimateEmail(estimate);
    else sendStandardEstimateEmail(estimate);
    setGeneratedEstimateId(id);
    setAccountProvisioned(outcome.accountCreated);
    setCreated(true);
    setSent(true);
    toast.success(`Estimate ${id} sent to ${recipientEmail}`);
  };

  const handleClose = () => {
    setStep(0);
    setIsGuest(false);
    setSelectedClientId(null);
    setSelectedPetIds([]);
    setAddedPets([]);
    setPetTempSeq(-1);
    setIsAddingPet(false);
    setNewPetDraft(emptyPetDraft);
    setSelectedService("");
    setStartDate("");
    setEndDate("");
    setRoomType("");
    setDaycareMode("single");
    setTrainingProgramId("");
    setTrainingSessions(1);
    setLineItems([]);
    setAddonSearch("");
    setDiscountMode("fixed");
    setDiscountValue("");
    setDiscountType("");
    setDiscountCustomReason("");
    setDepositOverride("");
    setCreated(false);
    setSent(false);
    setAccountProvisioned(false);
    setGeneratedEstimateId(null);
    setGuestFirstName("");
    setGuestLastName("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestPetNames([""]);
    setPublicNote("");
    setInternalNote("");
    setExpiryDate(computeDefaultExpiry());
    onOpenChange(false);
  };

  const addCustomLineItem = () => {
    setLineItems([
      ...allLineItems,
      { label: "Custom Item", amount: 0, quantity: 1, total: 0 },
    ]);
  };

  const addAddOnLineItem = (addon: (typeof defaultServiceAddOns)[number]) => {
    setLineItems([
      ...allLineItems,
      {
        label: addon.name,
        description: "Add-on",
        amount: addon.price,
        quantity: 1,
        total: addon.price,
      },
    ]);
    setAddonSearch("");
  };

  const updateLineItem = (idx: number, patch: Partial<EstimateLineItem>) => {
    const updated = [...allLineItems];
    const item = { ...updated[idx], ...patch };
    item.total = item.amount * item.quantity;
    updated[idx] = item;
    setLineItems(updated);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(allLineItems.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Create Estimate</DialogTitle>

        {/* Header */}
        <div className="shrink-0 border-b px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="size-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {created ? "Estimate Ready" : "New Estimate"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {created
                  ? "Review and send to customer"
                  : `Step ${step + 1} of ${STEPS.length}`}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          {!created && (
            <div className="mt-4 flex gap-1">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    i <= step ? "bg-blue-500" : "bg-slate-200",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            {/* Success screens */}
            {created && !sent && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
                  <FileText className="size-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold">Saved as Draft</h3>
                {generatedEstimateId && (
                  <Badge
                    variant="outline"
                    className="font-mono text-xs tracking-wider"
                  >
                    {generatedEstimateId}
                  </Badge>
                )}
                <p className="text-muted-foreground max-w-sm text-sm">
                  Estimate saved for{" "}
                  <span className="font-medium text-slate-700">
                    {isGuest ? guestName : selectedClient?.name}
                  </span>
                  . It hasn&apos;t been sent yet — send it whenever you&apos;re
                  ready.
                </p>
                <div className="rounded-xl border bg-slate-50 px-6 py-3">
                  <p className="text-xl font-bold tabular-nums">
                    ${total.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Estimated total
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Done
                  </Button>
                  <Button className="gap-1.5" onClick={handleSendEstimate}>
                    <Send className="size-4" />
                    Send Estimate
                  </Button>
                </div>
              </div>
            )}

            {created && sent && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="size-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold">Estimate Sent!</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Estimate{" "}
                  <span className="font-medium text-slate-700">
                    {generatedEstimateId}
                  </span>{" "}
                  sent to{" "}
                  <span className="font-medium text-slate-700">
                    {recipientEmail}
                  </span>
                  . They will receive a link to view and accept it.
                </p>
                {accountProvisioned && (
                  <div className="max-w-sm rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    A new account was created for{" "}
                    <span className="font-medium">{recipientEmail}</span>.
                    {welcomeEmailSent ? " A welcome email has been sent." : ""}
                  </div>
                )}
                <Button className="mt-2" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}

            {/* Step 0: Client */}
            {!created && step === 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Who is this estimate for?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(false);
                      setSelectedClientId(null);
                      setSelectedPetIds([]);
                      setAddedPets([]);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                      !isGuest
                        ? "border-transparent bg-blue-50/50 shadow-sm"
                        : "border-slate-200 hover:border-blue-200",
                    )}
                  >
                    <User className="size-6 text-blue-500" />
                    <span className="text-sm font-semibold">
                      Existing Client
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Search your client database
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGuest(true);
                      setSelectedClientId(null);
                      setSelectedPetIds([]);
                      setAddedPets([]);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                      isGuest
                        ? "border-transparent bg-violet-50/50 shadow-sm"
                        : "border-slate-200 hover:border-violet-200",
                    )}
                  >
                    <Sparkles className="size-6 text-violet-500" />
                    <span className="text-sm font-semibold">New Inquiry</span>
                    <span className="text-muted-foreground text-[11px]">
                      No account yet — add info later
                    </span>
                  </button>
                </div>

                {/* Client search */}
                {!isGuest && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients..."
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setSelectedPetIds(c.pets.map((p) => p.id));
                            setAddedPets([]);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-0",
                            selectedClientId === c.id
                              ? "bg-blue-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                            {c.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {c.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {c.email}
                            </p>
                          </div>
                          {selectedClientId === c.id && (
                            <Check className="size-4 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Read-only summary of the chosen customer + pets */}
                    {selectedClient && (
                      <div className="space-y-3 rounded-xl border bg-slate-50/60 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                            {selectedClient.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {selectedClient.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {selectedClient.email}
                              {selectedClient.phone &&
                                ` · ${selectedClient.phone}`}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                            Pets ({selectedClient.pets.length})
                          </p>
                          {selectedClient.pets.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedClient.pets.map((p) => (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className="gap-1 bg-white text-xs font-normal"
                                >
                                  <PawPrint className="size-3 text-slate-400" />
                                  {p.name}
                                  <span className="text-muted-foreground">
                                    · {p.breed}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-xs">
                              No pets on file for this client.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Guest inquiry details */}
                {isGuest && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold">New Inquiry</h3>

                    <div className="space-y-4 rounded-xl border bg-slate-50/40 p-4">
                      <h4 className="text-base font-semibold">
                        Create New Customer
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <User className="size-3.5" /> First name *
                          </Label>
                          <Input
                            value={guestFirstName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGuestFirstName(v);
                              setGuestName(`${v} ${guestLastName}`.trim());
                            }}
                            placeholder="First name"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <User className="size-3.5" /> Last name
                          </Label>
                          <Input
                            value={guestLastName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGuestLastName(v);
                              setGuestName(`${guestFirstName} ${v}`.trim());
                            }}
                            placeholder="Last name"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <Mail className="size-3.5" /> Email *
                          </Label>
                          <Input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-sm font-medium">
                            <Phone className="size-3.5" /> Phone
                          </Label>
                          <Input
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        An account will be created automatically when the
                        estimate is sent.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 (spec 4.2): Pets */}
            {!created && step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">
                    {isGuest
                      ? "Which pets is this estimate for?"
                      : "Select pet(s)"}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {isGuest
                      ? "Add each pet — required for room selection and pricing."
                      : "Choose one or more pets, or add a new one for this estimate."}
                  </p>
                </div>

                {isGuest ? (
                  <div className="space-y-3 rounded-xl border bg-violet-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-base font-semibold">
                          <PawPrint className="size-4" /> Pet Information{" "}
                          <span className="text-destructive text-sm">*</span>
                        </h4>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Add at least one pet — required for room selection and
                          pricing.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {guestPetSummary.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-violet-200 bg-white text-[11px] text-violet-700"
                          >
                            {guestPetSummary.length} added
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs"
                          onClick={addGuestPetField}
                        >
                          <Plus className="size-3" />
                          Add pet
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {resolvedGuestPetNames.map((petName, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-violet-100 text-xs font-semibold text-violet-700">
                            {index + 1}
                          </div>
                          <Input
                            value={petName}
                            onChange={(e) =>
                              handleGuestPetNameChange(index, e.target.value)
                            }
                            placeholder={
                              index === 0
                                ? "Pet name (e.g. Buddy)"
                                : `Pet ${index + 1} name (optional)`
                            }
                            className="bg-white"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-slate-400 hover:text-red-500"
                            disabled={resolvedGuestPetNames.length <= 1}
                            onClick={() => removeGuestPetField(index)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Remove pet</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !selectedClient ? (
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      Please select a client first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientPetCards.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {clientPetCards.map((pet) => {
                          const isSelected = selectedPetIds.includes(pet.id);
                          const isAdded = pet.id < 0;
                          return (
                            <div
                              key={pet.id}
                              role="checkbox"
                              aria-checked={isSelected}
                              aria-label={`${pet.name}, ${pet.species}`}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  togglePet(pet.id);
                                }
                              }}
                              onClick={() => togglePet(pet.id)}
                              className={cn(
                                "relative cursor-pointer rounded-xl border-2 p-3 transition-all outline-none",
                                "focus-visible:ring-2 focus-visible:ring-blue-400",
                                isSelected
                                  ? "border-transparent bg-blue-50/60 shadow-sm"
                                  : "border-slate-200 hover:border-blue-200",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                  {pet.species === "Cat" ? (
                                    <Cat className="size-5 text-slate-500" />
                                  ) : (
                                    <PawPrint className="size-5 text-slate-500" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">
                                    {pet.name}
                                  </p>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {pet.species}
                                    {pet.breed ? ` • ${pet.breed}` : ""}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Check className="size-4 shrink-0 text-blue-600" />
                                )}
                              </div>
                              {isAdded && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAddedPet(pet.id);
                                  }}
                                  className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-500"
                                  aria-label={`Remove ${pet.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        This client has no pets on file — add one below.
                      </p>
                    )}

                    {isAddingPet ? (
                      <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                          <PawPrint className="size-4 text-violet-600" />
                          Add new pet for this estimate
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">
                              Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              autoFocus
                              value={newPetDraft.name}
                              onChange={(e) =>
                                setNewPetDraft((p) => ({
                                  ...p,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="e.g. Buddy"
                              className="bg-white"
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Species</Label>
                            <div className="flex gap-2">
                              {(["Dog", "Cat"] as const).map((sp) => {
                                const Icon = sp === "Cat" ? Cat : Dog;
                                const active = newPetDraft.species === sp;
                                return (
                                  <button
                                    key={sp}
                                    type="button"
                                    onClick={() =>
                                      setNewPetDraft((p) => ({
                                        ...p,
                                        species: sp,
                                      }))
                                    }
                                    className={cn(
                                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-medium transition-all",
                                      active
                                        ? "border-transparent bg-violet-100 text-violet-700"
                                        : "border-slate-200 hover:border-violet-200",
                                    )}
                                  >
                                    <Icon className="size-4" /> {sp}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Breed</Label>
                            <Input
                              value={newPetDraft.breed}
                              onChange={(e) =>
                                setNewPetDraft((p) => ({
                                  ...p,
                                  breed: e.target.value,
                                }))
                              }
                              placeholder="e.g. Labrador"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Age (years)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={newPetDraft.age}
                              onChange={(e) =>
                                setNewPetDraft((p) => ({
                                  ...p,
                                  age: e.target.value,
                                }))
                              }
                              placeholder="e.g. 3"
                              className="bg-white"
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Weight (lbs)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={newPetDraft.weight}
                              onChange={(e) =>
                                setNewPetDraft((p) => ({
                                  ...p,
                                  weight: e.target.value,
                                }))
                              }
                              placeholder="e.g. 45"
                              className="bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingPet(false);
                              setNewPetDraft(emptyPetDraft);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={submitNewPet}
                            disabled={!newPetDraft.name.trim()}
                          >
                            Add pet
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingPet(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-50/40"
                      >
                        <Plus className="size-4" />
                        Add new pet for this estimate
                      </button>
                    )}

                    {selectedPetIds.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {selectedPetIds.length} pet
                        {selectedPetIds.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Service */}
            {!created && step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Select a service</h3>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map((svc) => {
                    const Icon = svc.icon;
                    const selected = selectedService === svc.id;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setSelectedService(svc.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                          selected
                            ? "border-transparent bg-blue-50/50 shadow-sm"
                            : "border-slate-200 hover:border-blue-200 hover:shadow-sm",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg",
                            selected ? "bg-blue-100" : "bg-slate-100",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-5",
                              selected ? "text-blue-600" : "text-slate-400",
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{svc.name}</p>
                          <p className="text-muted-foreground text-[11px]">
                            from ${svc.basePrice}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Details */}
            {!created && step === 3 && (
              <div className="space-y-5">
                <h3 className="font-semibold">Service Details</h3>

                {/* Pet context — the pets selected in Step 2 */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-violet-50/40 px-3 py-2.5">
                  <PawPrint className="size-3.5 shrink-0 text-violet-600" />
                  <span className="text-xs font-semibold text-violet-700">
                    Pets:
                  </span>
                  {estimatePetLabels.length > 0 ? (
                    estimatePetLabels.map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="bg-white text-xs"
                      >
                        {name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs italic">
                      No pets selected — go back to add one
                    </span>
                  )}
                </div>

                {/* Boarding: date range + times + room type */}
                {selectedService === "boarding" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" /> Check-in Date
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" /> Check-out Date
                        </Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Clock className="size-3.5" /> Check-in Time
                        </Label>
                        <Input
                          type="time"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Clock className="size-3.5" /> Check-out Time
                        </Label>
                        <Input
                          type="time"
                          value={checkOutTime}
                          onChange={(e) => setCheckOutTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Room Type{" "}
                        <span className="text-destructive text-xs">*</span>
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            {
                              value: "Standard",
                              price: 35,
                              desc: "Cozy & comfortable",
                            },
                            {
                              value: "Premium",
                              price: 50,
                              desc: "Extra space & views",
                            },
                            {
                              value: "Luxury Suite",
                              price: 65,
                              desc: "Premium experience",
                            },
                          ] as const
                        ).map((room) => (
                          <button
                            key={room.value}
                            type="button"
                            onClick={() => setRoomType(room.value)}
                            className={cn(
                              "flex flex-col items-start gap-0.5 rounded-xl border-2 p-3 text-left transition-all",
                              roomType === room.value
                                ? "border-transparent bg-blue-50/50 shadow-sm"
                                : "border-slate-200 hover:border-blue-200",
                            )}
                          >
                            <span className="text-sm font-semibold">
                              {room.value}
                            </span>
                            <span className="text-base font-bold text-blue-600">
                              ${room.price}
                              <span className="text-muted-foreground text-xs font-normal">
                                /night
                              </span>
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {room.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Daycare: single vs multi-day */}
                {selectedService === "daycare" && (
                  <>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { value: "single", label: "Single Day" },
                            { value: "multi", label: "Multiple Days" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDaycareMode(opt.value)}
                            className={cn(
                              "rounded-xl border-2 p-3 text-sm font-medium transition-all",
                              daycareMode === opt.value
                                ? "border-transparent bg-blue-50/50 shadow-sm"
                                : "border-slate-200 hover:border-blue-200",
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" />{" "}
                          {daycareMode === "multi" ? "Start Date" : "Date"}
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      {daycareMode === "multi" ? (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" /> End Date
                          </Label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <Clock className="size-3.5" /> Drop-off Time
                          </Label>
                          <Input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Grooming: date + appointment time */}
                {selectedService === "grooming" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> Appointment Date
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Appointment Time
                      </Label>
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Training: program + session count + start date */}
                {selectedService === "training" && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        Program{" "}
                        <span className="text-destructive text-xs">*</span>
                      </Label>
                      <Select
                        value={trainingProgramId}
                        onValueChange={handleSelectProgram}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a training program" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingClasses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} · {c.totalSessions} sessions
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Number of Sessions</Label>
                        <Input
                          type="number"
                          min={1}
                          value={trainingSessions}
                          onChange={(e) =>
                            setTrainingSessions(
                              Math.max(1, Number(e.target.value)),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" /> Start Date
                        </Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Other: single date + time */}
                {selectedService === "other" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> Date
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Time
                      </Label>
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Preview line items */}
                {autoLineItems.length > 0 && (
                  <div className="rounded-xl border bg-slate-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                      Estimated pricing
                    </p>
                    {autoLineItems.map((li, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{li.label}</span>
                        <span className="font-semibold tabular-nums">
                          ${li.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review & Send */}
            {!created && step === 4 && (
              <div className="space-y-5">
                {/* Line items editor */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Line Items</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={addCustomLineItem}
                    >
                      <Plus className="size-3" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {allLineItems.map((li, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <Input
                          value={li.label}
                          onChange={(e) =>
                            updateLineItem(i, { label: e.target.value })
                          }
                          className="h-8 min-w-0 flex-1 text-sm"
                        />
                        <Input
                          type="number"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(i, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="h-8 w-16 text-center text-sm"
                        />
                        <span className="text-muted-foreground text-xs">x</span>
                        <Input
                          type="number"
                          value={li.amount}
                          onChange={(e) =>
                            updateLineItem(i, {
                              amount: Number(e.target.value),
                            })
                          }
                          className="h-8 w-20 text-sm"
                          step="0.01"
                        />
                        <span className="w-20 text-right text-sm font-semibold tabular-nums">
                          ${li.total.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(i)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add-ons — searchable, from the facility's configured add-ons */}
                <div className="space-y-2">
                  <Label className="text-sm">Add-ons</Label>
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={addonSearch}
                      onChange={(e) => setAddonSearch(e.target.value)}
                      placeholder="Search add-ons to include..."
                      className="pl-10"
                    />
                    {addonSearch.trim() && (
                      <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-white shadow-md">
                        {filteredAddOns.length === 0 ? (
                          <p className="text-muted-foreground px-3 py-3 text-sm">
                            No add-ons found
                          </p>
                        ) : (
                          filteredAddOns.map((addon) => (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => addAddOnLineItem(addon)}
                              className="hover:bg-muted flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-0"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {addon.name}
                              </span>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                ${addon.price.toFixed(2)}
                                {addon.unitLabel ? ` / ${addon.unitLabel}` : ""}
                              </span>
                              <Plus className="size-3.5 shrink-0 text-blue-500" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount — % or $, with configured types + Custom */}
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Discount</Label>
                    <div className="flex gap-1">
                      {(["percent", "fixed"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDiscountMode(m)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                            discountMode === m
                              ? "border-primary bg-primary/5 text-primary"
                              : "hover:bg-muted/50",
                          )}
                        >
                          {m === "percent" ? "%" : "$"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountMode === "percent" ? "10" : "25.00"}
                      className="text-sm"
                    />
                    <Select
                      value={discountType}
                      onValueChange={setDiscountType}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Reason (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {discountType === "Custom" && (
                    <Input
                      value={discountCustomReason}
                      onChange={(e) => setDiscountCustomReason(e.target.value)}
                      placeholder="Custom discount reason"
                      className="text-sm"
                    />
                  )}
                </div>

                {/* Pricing summary — live running total */}
                <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-700">
                      <span>
                        Discount
                        {discountType
                          ? ` (${discountType === "Custom" ? discountCustomReason || "Custom" : discountType})`
                          : ""}
                      </span>
                      <span className="tabular-nums">
                        -${discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({taxRatePct.toFixed(2).replace(/\.?0+$/, "")}%)
                    </span>
                    <span className="tabular-nums">
                      ${taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Deposit — auto from deposit rules, overridable */}
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <Label className="text-sm">Deposit</Label>
                    <p className="text-muted-foreground text-[11px]">
                      {depositRule
                        ? `Auto: ${depositRule.label}`
                        : "No deposit rule for this service"}
                    </p>
                  </div>
                  <div className="relative w-32">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={
                        depositOverride.trim() !== ""
                          ? depositOverride
                          : depositAuto
                      }
                      onChange={(e) => setDepositOverride(e.target.value)}
                      className="pl-6 text-right text-sm"
                    />
                  </div>
                </div>

                {/* Internal note (staff-only, F1) */}
                <div className="space-y-2">
                  <Label>Internal Note (staff only)</Label>
                  <Textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Notes visible only to staff..."
                    rows={2}
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Customer-facing note (F1 publicNote) — guests set this in the
                    New Inquiry form below. Included in the email + customer portal. */}
                {!isGuest && (
                  <div className="space-y-2">
                    <Label>Note for Customer (optional)</Label>
                    <Textarea
                      value={publicNote}
                      onChange={(e) => setPublicNote(e.target.value)}
                      placeholder="Included in the estimate email and customer portal..."
                      rows={3}
                      className="min-h-[70px] resize-y text-sm/relaxed"
                    />
                  </div>
                )}

                {/* Expiry (F2) — pre-filled from settings.defaultExpiryDays, overridable */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Estimate Expires
                  </Label>
                  <DatePicker
                    value={expiryDate || undefined}
                    onValueChange={(v) => setExpiryDate(v)}
                    placeholder="Select expiry date"
                    className="w-full"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Pre-filled to {getEstimateSettings().defaultExpiryDays} days
                    from today (from settings) — override as needed.
                  </p>
                </div>

                {/* Guest contact form */}
                {isGuest && (
                  <GuestContactForm
                    name={guestName}
                    setName={setGuestName}
                    email={guestEmail}
                    setEmail={setGuestEmail}
                    phone={guestPhone}
                    setPhone={setGuestPhone}
                    guestPetNames={guestPetNames}
                    setGuestPetNames={setGuestPetNames}
                    publicNote={publicNote}
                    setPublicNote={setPublicNote}
                    createAccount={createAccount}
                    setCreateAccount={setCreateAccount}
                  />
                )}

                {/* Existing client recipient */}
                {!isGuest && selectedClient && (
                  <div className="rounded-xl border bg-blue-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                      Send to
                    </p>
                    <p className="text-sm font-semibold">
                      {selectedClient.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {selectedClient.email} · {selectedClient.phone}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {!created && (
          <div className="flex shrink-0 justify-between border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              {step === STEPS.length - 1 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={!canProceed}
                    className="gap-1.5"
                  >
                    <FileText className="size-4" />
                    Save as Draft
                  </Button>
                  <Button
                    onClick={handleSendEstimate}
                    disabled={!canProceed}
                    className="gap-1.5 bg-blue-500 hover:bg-blue-600"
                  >
                    <Send className="size-4" />
                    Send Estimate
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="gap-1.5"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
