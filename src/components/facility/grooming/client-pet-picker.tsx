"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  PawPrint,
  Phone,
  Plus,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clientQueries } from "@/lib/api/client";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

// ─── Shape passed up to the parent (matches dialog form fields) ──────────────

export interface ClientPetPickerValue {
  /** Set when the picker matched an existing client. */
  clientId?: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  /** Set when the picker selected an existing pet for that client. */
  petId?: number;
  petName: string;
  petBreed: string;
  petSize: string;
  coatType: string;
  petAgeMonths?: number;
}

const EMPTY_VALUE: ClientPetPickerValue = {
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  petName: "",
  petBreed: "",
  petSize: "",
  coatType: "",
};

interface ClientPetPickerProps {
  value: ClientPetPickerValue;
  onChange: (next: ClientPetPickerValue) => void;
}

// Clients carry weight in lbs but the booking flow speaks in size buckets.
function inferSizeFromWeight(w?: number): string {
  if (w === undefined) return "";
  if (w < 20) return "small";
  if (w < 50) return "medium";
  if (w < 80) return "large";
  return "giant";
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  );
}

export function ClientPetPicker({ value, onChange }: ClientPetPickerProps) {
  const { data: clients = [] } = useQuery(clientQueries.all());

  const selectedClient = useMemo(
    () =>
      value.clientId ? clients.find((c) => c.id === value.clientId) ?? null : null,
    [clients, value.clientId],
  );

  // Local UI flags. The "mode" is derived from these + value so the picker
  // stays fully controlled by the parent's form state.
  const [addingNewClient, setAddingNewClient] = useState(false);
  const [addingNewPet, setAddingNewPet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const clientMode: "search" | "new" | "selected" = selectedClient
    ? "selected"
    : addingNewClient || value.ownerName
      ? "new"
      : "search";

  const clientPets = (selectedClient?.pets ?? []) as Pet[];
  // When the selected client has zero pets, default straight to "add new pet".
  const petMode: "pick" | "new" =
    addingNewPet || (selectedClient && clientPets.length === 0 && !value.petId)
      ? "new"
      : "pick";

  // ─── Client handlers ───────────────────────────────────────────────────────

  function pickClient(c: Client) {
    onChange({
      ...EMPTY_VALUE,
      clientId: c.id,
      ownerName: c.name,
      ownerPhone: c.phone ?? "",
      ownerEmail: c.email,
    });
    setAddingNewClient(false);
    setAddingNewPet(false);
    setSearchQuery("");
  }

  function startNewClient(seedName: string) {
    onChange({
      ...EMPTY_VALUE,
      ownerName: seedName,
    });
    setAddingNewClient(true);
    setAddingNewPet(false);
  }

  function changeClient() {
    onChange({ ...EMPTY_VALUE });
    setAddingNewClient(false);
    setAddingNewPet(false);
    setSearchQuery("");
  }

  function updateOwnerDraft(patch: Partial<ClientPetPickerValue>) {
    onChange({ ...value, ...patch });
  }

  // ─── Pet handlers ──────────────────────────────────────────────────────────

  function pickPet(p: Pet) {
    onChange({
      ...value,
      petId: p.id,
      petName: p.name,
      petBreed: p.breed,
      petSize: inferSizeFromWeight(p.weight),
      coatType: p.coatType ?? "",
      petAgeMonths:
        typeof p.age === "number" ? Math.max(0, Math.round(p.age * 12)) : undefined,
    });
    setAddingNewPet(false);
  }

  function startNewPet() {
    onChange({
      ...value,
      petId: undefined,
      petName: "",
      petBreed: "",
      petSize: "",
      coatType: "",
      petAgeMonths: undefined,
    });
    setAddingNewPet(true);
  }

  function cancelNewPet() {
    onChange({
      ...value,
      petId: undefined,
      petName: "",
      petBreed: "",
      petSize: "",
      coatType: "",
      petAgeMonths: undefined,
    });
    setAddingNewPet(false);
  }

  function updatePetDraft(patch: Partial<ClientPetPickerValue>) {
    onChange({ ...value, ...patch });
  }

  // ─── Search results ────────────────────────────────────────────────────────

  const q = searchQuery.trim().toLowerCase();
  const matched = useMemo(() => {
    if (!q) return clients.slice(0, 6);
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [clients, q]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeading>Client</SectionHeading>

        {clientMode === "search" && (
          <div className="rounded-lg border bg-card">
            <Command shouldFilter={false}>
              <CommandInput
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search by name, phone, or email…"
              />
              <CommandList className="max-h-64">
                <CommandEmpty>
                  <div className="py-3 text-center text-xs text-muted-foreground">
                    No matches.
                  </div>
                </CommandEmpty>
                {matched.length > 0 && (
                  <CommandGroup
                    heading={q ? "Matches" : "Recent clients"}
                  >
                    {matched.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.phone ?? ""} ${c.email}`}
                        onSelect={() => pickClient(c)}
                        className="gap-2"
                      >
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={c.imageUrl} alt={c.name} />
                          <AvatarFallback className="text-[10px]">
                            {c.name
                              .split(" ")
                              .map((p) => p.charAt(0))
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {c.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.phone ?? "no phone"} · {c.email}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {c.pets?.length ?? 0}{" "}
                          {(c.pets?.length ?? 0) === 1 ? "pet" : "pets"}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            <div className="border-t bg-muted/20 px-1.5 py-1">
              <button
                type="button"
                onClick={() => startNewClient(searchQuery.trim())}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-pink-700 hover:bg-pink-100/60 dark:text-pink-300 dark:hover:bg-pink-950/30"
              >
                <Plus className="size-3.5" />
                <span className="truncate">
                  Add new client
                  {searchQuery.trim() ? ` "${searchQuery.trim()}"` : ""}
                </span>
              </button>
            </div>
          </div>
        )}

        {clientMode === "new" && (
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">
                New client — quick details
              </p>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...EMPTY_VALUE });
                  setAddingNewClient(false);
                }}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                <ArrowLeft className="size-3" />
                Search instead
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Owner's full name"
                  value={value.ownerName}
                  onChange={(e) =>
                    updateOwnerDraft({ ownerName: e.target.value })
                  }
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="(514) 555-0100"
                  value={value.ownerPhone}
                  onChange={(e) =>
                    updateOwnerDraft({ ownerPhone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="owner@email.com"
                  value={value.ownerEmail}
                  onChange={(e) =>
                    updateOwnerDraft({ ownerEmail: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {clientMode === "selected" && selectedClient && (
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <Avatar className="size-10 shrink-0">
              <AvatarImage
                src={selectedClient.imageUrl}
                alt={selectedClient.name}
              />
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {selectedClient.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {selectedClient.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-2.5" />
                    {selectedClient.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-2.5" />
                  {selectedClient.email}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={changeClient}
            >
              Change
            </Button>
          </div>
        )}
      </section>

      {/* Pet section appears once we have a client (existing or being created). */}
      {(clientMode === "selected" || clientMode === "new") && (
        <section>
          <SectionHeading>Pet</SectionHeading>

          {clientMode === "selected" && petMode === "pick" && (
            <PetGallery
              pets={clientPets}
              selectedPetId={value.petId}
              onPick={pickPet}
              onAddNew={startNewPet}
            />
          )}

          {(petMode === "new" || clientMode === "new") && (
            <NewPetForm
              value={value}
              onUpdate={updatePetDraft}
              onCancel={
                clientMode === "selected" && clientPets.length > 0
                  ? cancelNewPet
                  : undefined
              }
            />
          )}
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PetGallery({
  pets,
  selectedPetId,
  onPick,
  onAddNew,
}: {
  pets: Pet[];
  selectedPetId?: number;
  onPick: (p: Pet) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {pets.map((p) => {
        const selected = p.id === selectedPetId;
        const size = inferSizeFromWeight(p.weight);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            data-selected={selected ? "true" : "false"}
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-card p-2 text-left transition-colors",
              "data-[selected=true]:border-pink-300 data-[selected=true]:bg-pink-50 data-[selected=true]:ring-2 data-[selected=true]:ring-pink-200",
              "dark:data-[selected=true]:border-pink-700 dark:data-[selected=true]:bg-pink-950/20 dark:data-[selected=true]:ring-pink-900",
              "hover:bg-muted/40",
            )}
          >
            <Avatar className="size-12 shrink-0">
              <AvatarImage src={p.imageUrl} alt={p.name} />
              <AvatarFallback>
                <PawPrint className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {p.breed}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {size && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[9px] capitalize"
                  >
                    {size}
                  </Badge>
                )}
                {typeof p.age === "number" && (
                  <span className="text-[10px] text-muted-foreground">
                    {p.age < 1
                      ? `${Math.round(p.age * 12)} mo`
                      : `${Math.floor(p.age)} yr`}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddNew}
        className="flex min-h-[68px] items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-pink-700 hover:bg-pink-50 dark:text-pink-300 dark:hover:bg-pink-950/30"
      >
        <Plus className="size-4" />
        Add new pet
      </button>
    </div>
  );
}

function NewPetForm({
  value,
  onUpdate,
  onCancel,
}: {
  value: ClientPetPickerValue;
  onUpdate: (patch: Partial<ClientPetPickerValue>) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      {onCancel && (
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">
            New pet — quick details
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-3" />
            Pick from list
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs">
            Pet Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Buddy"
            value={value.petName}
            onChange={(e) => onUpdate({ petName: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Breed</Label>
          <Input
            placeholder="e.g. Golden Retriever"
            value={value.petBreed}
            onChange={(e) => onUpdate({ petBreed: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            Size <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.petSize}
            onValueChange={(v) => onUpdate({ petSize: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small — under 15 lbs</SelectItem>
              <SelectItem value="medium">Medium — 15–40 lbs</SelectItem>
              <SelectItem value="large">Large — 40–70 lbs</SelectItem>
              <SelectItem value="giant">Giant — 70+ lbs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Coat Type</Label>
          <Select
            value={value.coatType}
            onValueChange={(v) => onUpdate({ coatType: v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select coat" />
            </SelectTrigger>
            <SelectContent>
              {(
                ["short", "medium", "long", "wire", "curly", "double"] as const
              ).map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">
            Age (months)
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              drives age-group pricing if the service has rules
            </span>
          </Label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 6 = puppy, 96 = senior"
            value={value.petAgeMonths ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              onUpdate({
                petAgeMonths:
                  raw.trim() === "" ? undefined : Math.max(0, Number(raw)),
              });
            }}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
