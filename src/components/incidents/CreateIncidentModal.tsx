"use client";

import { useState, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Camera,
  X,
  UserPlus,
  Siren,
  Bandage,
  Stethoscope,
  Dog,
  Droplets,
  DoorOpen,
  FileText,
  ShieldAlert,
  Users,
  NotebookPen,
  MessageSquare,
  Bell,
  Eye,
  EyeOff,
  Link,
  Search,
  PawPrint,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { clients } from "@/data/clients";
import { useAiText } from "@/hooks/use-ai-text";
import { AiGenerateButton } from "@/components/shared/AiGenerateButton";

interface CreateIncidentModalProps {
  onClose: () => void;
  prefilledPet?: { id: number; name: string; clientName: string };
  reservationId?: string;
  boardingGuestId?: string;
}

// ── Incident type card ────────────────────────────────────────────────────────

const INCIDENT_TYPES = [
  { value: "injury",     label: "Injury",           icon: Bandage,     color: "red",    desc: "Cut, bite, scratch" },
  { value: "illness",    label: "Illness",           icon: Stethoscope, color: "orange", desc: "Vomiting, lethargy" },
  { value: "behavioral", label: "Behavioral",        icon: Dog,         color: "amber",  desc: "Aggression, anxiety" },
  { value: "fight",      label: "Fight",             icon: ShieldAlert, color: "red",    desc: "Dog altercation" },
  { value: "accident",   label: "Accident",          icon: Droplets,    color: "blue",   desc: "Spill, knock over" },
  { value: "escape",     label: "Escape Attempt",   icon: DoorOpen,    color: "purple", desc: "Breakout attempt" },
  { value: "other",      label: "Other",             icon: FileText,    color: "slate",  desc: "Anything else" },
] as const;

type IncidentType = (typeof INCIDENT_TYPES)[number]["value"];

const SEVERITY_LEVELS = [
  {
    value: "low",
    label: "Low",
    desc: "Minor — no immediate action",
    dot: "bg-green-500",
    card: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10",
    selected: "border-green-500 bg-green-500 text-white",
    unselected: "border-green-200 bg-green-50/50 text-green-700 hover:border-green-400 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Requires attention",
    dot: "bg-amber-500",
    card: "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10",
    selected: "border-amber-500 bg-amber-500 text-white",
    unselected: "border-amber-200 bg-amber-50/50 text-amber-700 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  },
  {
    value: "high",
    label: "High",
    desc: "Serious — act fast",
    dot: "bg-orange-500",
    card: "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10",
    selected: "border-orange-500 bg-orange-500 text-white",
    unselected: "border-orange-200 bg-orange-50/50 text-orange-700 hover:border-orange-400 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  },
  {
    value: "critical",
    label: "Critical",
    desc: "Emergency — urgent!",
    dot: "bg-red-500",
    card: "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10",
    selected: "border-red-500 bg-red-500 text-white",
    unselected: "border-red-200 bg-red-50/50 text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
  },
] as const;

type SeverityValue = (typeof SEVERITY_LEVELS)[number]["value"];

// ── Pet picker dialog ─────────────────────────────────────────────────────────

type PetOption = { uid: string; id: number; name: string; type: string; breed: string; clientName: string };

function PetPickerDialog({
  pets,
  selectedIds,
  lockedId,
  placeholder,
  onSelect,
}: {
  pets: PetOption[];
  selectedIds: number[];
  lockedId?: number;
  placeholder: string;
  onSelect: (pet: PetOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = useMemo(
    () => pets.filter((p) => !selectedIds.includes(p.id) && p.id !== lockedId),
    [pets, selectedIds, lockedId],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return available;
    return available.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q),
    );
  }, [available, query]);

  const handleSelect = (pet: PetOption) => {
    onSelect(pet);
    setOpen(false);
    setQuery("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <DialogPrimitive.Trigger asChild>
        <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <span className="flex items-center gap-2">
            <Search className="size-3.5 shrink-0" />
            {placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-70 bg-black/55 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300"
        />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-71 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-0 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.45)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-3 duration-200 ease-out dark:border-slate-700 dark:bg-slate-900"
        >
          <DialogPrimitive.Title className="sr-only">Select pets involved</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search and select the pets involved in this incident.</DialogPrimitive.Description>

          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-xl border-b border-orange-100 bg-orange-50 px-4 py-3 dark:border-orange-900/50 dark:bg-orange-900/20">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
              <PawPrint className="size-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">Pets Involved</p>
              <p className="text-xs text-orange-700/70 dark:text-orange-400/70">Select all pets part of this incident</p>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-700/60">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <Search className="size-3.5 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, breed or owner..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <PawPrint className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {query ? "No pets match your search" : "All pets already added"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((pet) => (
                  <button
                    key={pet.uid}
                    onClick={() => handleSelect(pet)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50/70 dark:hover:bg-orange-900/20"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                      <PawPrint className="size-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pet.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {pet.breed} · {pet.clientName}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700/60">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Staff picker dialog ───────────────────────────────────────────────────────

function StaffPickerDialog({
  staffMembers,
  selectedStaff,
  placeholder,
  onSelect,
}: {
  staffMembers: string[];
  selectedStaff: string[];
  placeholder: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");

  const available = useMemo(
    () => staffMembers.filter((s) => !selectedStaff.includes(s)),
    [staffMembers, selectedStaff],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return available;
    return available.filter((s) => s.toLowerCase().includes(q));
  }, [available, query]);

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
    setQuery("");
    setCustomName("");
  };

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name) return;
    handleSelect(name);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setCustomName(""); } }}>
      <DialogPrimitive.Trigger asChild>
        <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <span className="flex items-center gap-2">
            <Search className="size-3.5 shrink-0" />
            {placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-70 bg-black/55 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-71 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-0 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.45)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-3 duration-200 ease-out dark:border-slate-700 dark:bg-slate-900">
          <DialogPrimitive.Title className="sr-only">Select staff on scene</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Select or add the staff members involved in this incident.</DialogPrimitive.Description>

          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-xl border-b border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-900/20">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Users className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Staff on Scene</p>
              <p className="text-xs text-blue-700/70 dark:text-blue-400/70">Select everyone present during the incident</p>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-700/60">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <Search className="size-3.5 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search staff..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && !query ? (
              <div className="py-6 text-center">
                <Users className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">All staff already added</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No staff match — add them below</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-900/20"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Users className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                    <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom name input */}
          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-700/60">
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Not in the list?</p>
            <div className="flex gap-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                placeholder="Type their name and press Enter"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-600"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              >
                <UserPlus className="size-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700/60">
            <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Close
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconColor: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <span className="text-sm font-semibold">{label}</span>
      {badge && <div className="ml-auto">{badge}</div>}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CreateIncidentModal({
  onClose,
  prefilledPet,
  reservationId,
  boardingGuestId,
}: CreateIncidentModalProps) {
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<SeverityValue | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [clientFacingNotes, setClientFacingNotes] = useState("");
  const now = new Date();
  const [incidentDate, setIncidentDate] = useState<string>(
    now.toISOString().split("T")[0],
  );
  const [incidentTime, setIncidentTime] = useState<string>(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  );
  const [selectedPets, setSelectedPets] = useState<{ uid: string; id: number; name: string; clientName: string }[]>(
    prefilledPet ? [{ uid: `prefilled-${prefilledPet.id}`, ...prefilledPet }] : [],
  );
  const [staffInvolved, setStaffInvolved] = useState<string[]>([]);
  const [reportedBy, setReportedBy] = useState("");
  const [notifyManager, setNotifyManager] = useState(true);
  const [notifyClient, setNotifyClient] = useState(false);
  const [photos, setPhotos] = useState<
    { id: string; url: string; caption: string; isClientVisible: boolean }[]
  >([]);

  const allPets = clients.flatMap((client) =>
    client.pets.map((pet) => ({
      uid: `${client.id}-${pet.id}`,
      id: pet.id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      clientName: client.name,
    })),
  );

  const staffMembers = ["Sarah Johnson", "Mike Davis", "Emily Brown", "Emma Wilson", "John Smith"];

  const handleAddPet = (pet: PetOption) => {
    if (!selectedPets.find((p) => p.id === pet.id)) {
      setSelectedPets([...selectedPets, pet]);
    }
  };

  const handleRemovePet = (petId: number) => {
    setSelectedPets(selectedPets.filter((p) => p.id !== petId));
  };

  const handleAddStaff = (staff: string) => {
    if (!staffInvolved.includes(staff)) setStaffInvolved([...staffInvolved, staff]);
  };

  const handleRemoveStaff = (staff: string) => {
    setStaffInvolved(staffInvolved.filter((s) => s !== staff));
  };


  const handleAddPhoto = () => {
    setPhotos([
      ...photos,
      { id: `photo-${Date.now()}`, url: `/images/incidents/photo-${photos.length + 1}.jpg`, caption: "", isClientVisible: false },
    ]);
  };

  const handleSubmit = () => {
    const fullIncidentDate = incidentDate ? `${incidentDate}T${incidentTime}:00` : "";
    console.log("Creating incident:", { incidentType, severity, title, description, internalNotes, clientFacingNotes, incidentDate: fullIncidentDate, selectedPets, staffInvolved, reportedBy, notifyManager, notifyClient }, "Photos:", photos, { reservationId, boardingGuestId });
    onClose();
  };

  const aiDescription = useAiText({ type: "incident_description", maxWords: 100 });
  const aiClientNote = useAiText({ type: "incident_client_note", maxWords: 80 });

  const selectedSeverityMeta = SEVERITY_LEVELS.find((s) => s.value === severity);
  const isCriticalOrHigh = severity === "critical" || severity === "high";
  const isValid = incidentType && severity && title && description && selectedPets.length > 0 && reportedBy;

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <Siren className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="text-base font-bold">Report New Incident</div>
            <DialogDescription className="mt-0 text-xs">
              Document what happened — staff and management will be notified per severity
            </DialogDescription>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 py-2">

        {/* ── Reservation context banner ──────────────────────────────────── */}
        {(reservationId || boardingGuestId) && (
          <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
            <Link className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Linked to{" "}
              {prefilledPet ? <strong>{prefilledPet.name}&apos;s</strong> : "the"} boarding
              reservation{reservationId ? <> · <span className="font-mono font-semibold">{reservationId}</span></> : null}
            </p>
          </div>
        )}

        {/* ── What happened? ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={AlertTriangle}
            label="What happened?"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INCIDENT_TYPES.slice(0, 4).map((t) => {
              const Icon = t.icon;
              const selected = incidentType === t.value;
              const colorMap: Record<string, { bg: string; icon: string; sel: string }> = {
                red:    { bg: "bg-red-100 dark:bg-red-900/30",    icon: "text-red-600 dark:text-red-400",    sel: "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500" },
                orange: { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400", sel: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500" },
                amber:  { bg: "bg-amber-100 dark:bg-amber-900/30",  icon: "text-amber-600 dark:text-amber-400",  sel: "border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500" },
                blue:   { bg: "bg-blue-100 dark:bg-blue-900/30",   icon: "text-blue-600 dark:text-blue-400",   sel: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500" },
                purple: { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", sel: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500" },
                slate:  { bg: "bg-slate-100 dark:bg-slate-900/30",  icon: "text-slate-600 dark:text-slate-400",  sel: "border-slate-500 bg-slate-50 dark:bg-slate-900/20 ring-1 ring-slate-500" },
              };
              const c = colorMap[t.color];
              return (
                <button
                  key={t.value}
                  onClick={() => setIncidentType(t.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${selected ? c.sel : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
                >
                  <div className={`flex size-9 items-center justify-center rounded-lg ${selected ? c.bg : "bg-muted/60"}`}>
                    <Icon className={`size-4.5 ${selected ? c.icon : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${selected ? "" : "text-foreground"}`}>{t.label}</p>
                    <p className="text-muted-foreground text-[10px] leading-tight">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {INCIDENT_TYPES.slice(4).map((t) => {
              const Icon = t.icon;
              const selected = incidentType === t.value;
              const colorMap: Record<string, { bg: string; icon: string; sel: string }> = {
                red:    { bg: "bg-red-100 dark:bg-red-900/30",    icon: "text-red-600 dark:text-red-400",    sel: "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500" },
                orange: { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400", sel: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-500" },
                amber:  { bg: "bg-amber-100 dark:bg-amber-900/30",  icon: "text-amber-600 dark:text-amber-400",  sel: "border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500" },
                blue:   { bg: "bg-blue-100 dark:bg-blue-900/30",   icon: "text-blue-600 dark:text-blue-400",   sel: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500" },
                purple: { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400", sel: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500" },
                slate:  { bg: "bg-slate-100 dark:bg-slate-900/30",  icon: "text-slate-600 dark:text-slate-400",  sel: "border-slate-500 bg-slate-50 dark:bg-slate-900/20 ring-1 ring-slate-500" },
              };
              const c = colorMap[t.color];
              return (
                <button
                  key={t.value}
                  onClick={() => setIncidentType(t.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${selected ? c.sel : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
                >
                  <div className={`flex size-9 items-center justify-center rounded-lg ${selected ? c.bg : "bg-muted/60"}`}>
                    <Icon className={`size-4.5 ${selected ? c.icon : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${selected ? "" : "text-foreground"}`}>{t.label}</p>
                    <p className="text-muted-foreground text-[10px] leading-tight">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Severity ────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={Siren}
            label="How serious is it?"
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SEVERITY_LEVELS.map((lvl) => {
              const selected = severity === lvl.value;
              return (
                <button
                  key={lvl.value}
                  onClick={() => setSeverity(lvl.value)}
                  className={`rounded-xl border-2 px-3 py-3 text-center text-sm font-semibold transition-all cursor-pointer ${selected ? lvl.selected : lvl.unselected}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`inline-block size-2 rounded-full ${selected ? "bg-current opacity-80" : lvl.dot}`} />
                    {lvl.label}
                  </div>
                  <p className={`mt-0.5 text-[10px] font-normal ${selected ? "opacity-80" : "text-muted-foreground"}`}>{lvl.desc}</p>
                </button>
              );
            })}
          </div>

          {isCriticalOrHigh && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Manager notification is <strong>required</strong> for {severity} severity incidents.
              </p>
            </div>
          )}
        </div>

        {/* ── When did it happen? ──────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date *</Label>
            <DatePicker
              value={incidentDate}
              onValueChange={(v) => setIncidentDate(v)}
              max={new Date().toISOString().split("T")[0]}
              placeholder="Pick a date"
              displayMode="dialog"
              popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
              calendarClassName="p-1"
              showQuickPresets={false}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Time *</Label>
            <TimePickerLux
              value={incidentTime}
              onValueChange={setIncidentTime}
              displayMode="dialog"
            />
          </div>
        </div>

        {/* ── Title ───────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Incident Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bite mark on left ear"
          />
        </div>

        {/* ── People ──────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={Users}
            label="People Involved"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />

          <div className="divide-y rounded-xl border">
            {/* Pets */}
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="inline-block size-2 rounded-full bg-orange-400" />
                  Pets Involved *
                </Label>
                {selectedPets.length > 0 && (
                  <span className="text-muted-foreground text-xs">{selectedPets.length} added</span>
                )}
              </div>

              {/* Selected pet cards */}
              {selectedPets.length > 0 && (
                <div className="space-y-2">
                  {selectedPets.map((pet) => {
                    const isLocked = pet.id === prefilledPet?.id;
                    return (
                      <div
                        key={pet.uid}
                        className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/60 px-3 py-2.5 dark:border-orange-900 dark:bg-orange-900/10"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                          <PawPrint className="size-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-none">{pet.name}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{pet.clientName}</p>
                        </div>
                        {isLocked ? (
                          <span className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                            From reservation
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemovePet(pet.id)}
                            className="text-muted-foreground hover:text-destructive rounded-full p-0.5 transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <PetPickerDialog
                pets={allPets}
                selectedIds={selectedPets.map((p) => p.id)}
                lockedId={prefilledPet?.id}
                placeholder={prefilledPet ? "Add another pet involved..." : "Add a pet..."}
                onSelect={handleAddPet}
              />
            </div>

            {/* Staff on scene */}
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="inline-block size-2 rounded-full bg-blue-400" />
                  Staff on Scene
                </Label>
                {staffInvolved.length > 0 && (
                  <span className="text-muted-foreground text-xs">{staffInvolved.length} added</span>
                )}
              </div>

              {staffInvolved.length > 0 && (
                <div className="space-y-2">
                  {staffInvolved.map((staff) => (
                    <div
                      key={staff}
                      className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-900/10"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Users className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="flex-1 text-sm font-semibold">{staff}</p>
                      <button
                        onClick={() => handleRemoveStaff(staff)}
                        className="text-muted-foreground hover:text-destructive rounded-full p-0.5 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <StaffPickerDialog
                staffMembers={staffMembers}
                selectedStaff={staffInvolved}
                placeholder="Add a staff member..."
                onSelect={handleAddStaff}
              />
            </div>

            {/* Reported by */}
            <div className="space-y-2.5 p-4">
              <Label className="text-sm font-semibold">
                <span className="mr-1.5 inline-block size-2 rounded-full bg-slate-400" />
                Reported By *
              </Label>
              <Select value={reportedBy} onValueChange={setReportedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is filing this report?" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={NotebookPen}
            label="What exactly happened?"
            iconBg="bg-slate-100 dark:bg-slate-900/30"
            iconColor="text-slate-600 dark:text-slate-400"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Incident Description *</Label>
              <AiGenerateButton
                onClick={async () => {
                  const result = await aiDescription.generate({
                    petName: selectedPets.map((p) => p.name).join(", "),
                    incidentType,
                    title,
                  });
                  if (result) setDescription(result);
                }}
                isGenerating={aiDescription.isGenerating}
              />
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail — sequence of events, what you observed, who was present..."
              rows={5}
              className="min-h-[140px] resize-y text-sm/7"
            />
          </div>

          {/* Internal notes */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="size-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Internal Notes</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">Staff Only</Badge>
            </div>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Actions taken, observations, context that should stay internal..."
              rows={3}
              className="bg-background text-sm"
            />
          </div>
        </div>

        {/* ── Client-facing notes ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={MessageSquare}
            label="Message to Pet Owner"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 dark:border-emerald-800 dark:bg-emerald-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="size-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Visible to client if you notify them</span>
              </div>
              <AiGenerateButton
                onClick={async () => {
                  const result = await aiClientNote.generate({
                    petName: selectedPets.map((p) => p.name).join(", "),
                    incidentType,
                    title,
                  });
                  if (result) setClientFacingNotes(result);
                }}
                isGenerating={aiClientNote.isGenerating}
              />
            </div>
            <Textarea
              value={clientFacingNotes}
              onChange={(e) => setClientFacingNotes(e.target.value)}
              placeholder="What should the owner know? Keep it calm, clear, and reassuring..."
              rows={4}
              className="min-h-[120px] resize-y bg-background text-sm/7"
            />
          </div>
        </div>

        {/* ── Photos ──────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={Camera}
            label="Photos"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            badge={
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddPhoto}>
                <Camera className="mr-1 size-3" />
                Add Photo
              </Button>
            }
          />

          {photos.length === 0 ? (
            <button
              onClick={handleAddPhoto}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-900/10"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <Camera className="size-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Click to attach photos of the incident</p>
              <p className="text-muted-foreground text-xs">You can control which ones are visible to the client</p>
            </button>
          ) : (
            <div className="space-y-2">
              {photos.map((photo) => (
                <div key={photo.id} className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Camera className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Caption (optional)"
                      value={photo.caption}
                      onChange={(e) =>
                        setPhotos(photos.map((p) => p.id === photo.id ? { ...p, caption: e.target.value } : p))
                      }
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          checked={photo.isClientVisible}
                          onCheckedChange={() =>
                            setPhotos(photos.map((p) => p.id === photo.id ? { ...p, isClientVisible: !p.isClientVisible } : p))
                          }
                        />
                        <Eye className="size-3 text-muted-foreground" />
                        Visible to client
                      </label>
                      <button onClick={() => setPhotos(photos.filter((p) => p.id !== photo.id))} className="text-muted-foreground hover:text-destructive rounded transition-colors">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionHeader
            icon={Bell}
            label="Notifications"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />

          <div className="divide-y rounded-xl border">
            <label className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  Notify Manager
                  {isCriticalOrHigh && (
                    <Badge variant="destructive" className="text-[10px]">
                      Required for {severity}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Send an immediate alert to the facility manager
                </p>
              </div>
              <Checkbox
                checked={notifyManager}
                onCheckedChange={(v) => setNotifyManager(v as boolean)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Notify Pet Owner</p>
                <p className="text-muted-foreground text-xs">
                  Send the client-facing message you wrote above
                </p>
              </div>
              <Checkbox
                checked={notifyClient}
                onCheckedChange={(v) => setNotifyClient(v as boolean)}
              />
            </label>
          </div>
        </div>

        {/* ── Validation summary ───────────────────────────────────────────── */}
        {!isValid && (
          <div className="rounded-xl border border-muted bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Required:{" "}
              {[
                !incidentType && "incident type",
                !severity && "severity",
                !title && "title",
                !description && "description",
                selectedPets.length === 0 && "at least one pet",
                !reportedBy && "reported by",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="gap-2"
          variant={isCriticalOrHigh ? "destructive" : "default"}
        >
          <Siren className="size-4" />
          File Incident Report
        </Button>
      </DialogFooter>
    </>
  );
}
