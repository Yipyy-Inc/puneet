"use client";

import { useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useSavePrincipal,
  useStoreSecret,
} from "@/lib/api/merchant-application";
import {
  principalSchema,
  type Principal,
} from "@/lib/merchant-application/application";
import {
  Field,
  SecretField,
  SelectField,
  StoredLast4,
  TextField,
  fieldErrors,
  type FieldErrors,
} from "./fields";

// ============================================================================
// Adding or editing one owner.
//
// ── THE IDENTITY NUMBER IS SAVED SEPARATELY, AND SECOND ───────────────────
//
// Saving is two calls, in this order: the person, then their number. It has to
// be that way for a new owner — the number is stored against a principal id
// that does not exist until the first call returns — and it is the right way
// for an existing one too, because the number takes a different path into a
// different store and should not ride along in a row update.
//
// If the second call fails the first still stands. That is deliberate: an owner
// on the list without a number is visible, flagged, and one click from being
// fixed. An owner silently rolled back is a person somebody typed in twice.
//
// ── AND IT IS NEVER IN STATE ──────────────────────────────────────────────
//
// Read from the input at submit, sent, and the input cleared. See `SecretField`.
// ============================================================================

const COUNTRIES = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
] as const;

interface OwnerForm {
  fullName: string;
  title: string;
  ownershipPercent: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isControlPerson: boolean;
}

const EMPTY: OwnerForm = {
  fullName: "",
  title: "",
  ownershipPercent: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  isControlPerson: false,
};

function formFrom(principal: Principal | null): OwnerForm {
  if (!principal) return EMPTY;
  return {
    fullName: principal.fullName,
    title: principal.title,
    ownershipPercent: String(principal.ownershipPercent ?? ""),
    dateOfBirth: principal.dateOfBirth,
    email: principal.email,
    phone: principal.phone,
    addressLine1: principal.addressLine1,
    addressLine2: principal.addressLine2 ?? "",
    city: principal.city,
    region: principal.region,
    postalCode: principal.postalCode,
    country: principal.country,
    isControlPerson: principal.isControlPerson,
  };
}

/** Eighteen years ago today. Acquirers will not accept a minor as a principal. */
function latestBirthDate(): string {
  const now = new Date();
  return new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function OwnerDialog({
  open,
  onOpenChange,
  principal,
  /** True when nobody has been marked as controlling the business yet. */
  suggestControl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  principal: Principal | null;
  suggestControl: boolean;
}) {
  const [draft, setDraft] = useState<OwnerForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [replacingId, setReplacingId] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  const savePrincipal = useSavePrincipal();
  const storeSecret = useStoreSecret();
  const busy = savePrincipal.isPending || storeSecret.isPending;

  const base = formFrom(principal);
  const form =
    draft ??
    (principal
      ? base
      : { ...base, isControlPerson: suggestControl || base.isControlPerson });

  const set = <K extends keyof OwnerForm>(key: K, value: OwnerForm[K]) =>
    setDraft({ ...form, [key]: value });

  function close() {
    setDraft(null);
    setErrors({});
    setReplacingId(false);
    if (secretRef.current) secretRef.current.value = "";
    onOpenChange(false);
  }

  async function submit() {
    const candidate = {
      ...form,
      id: principal?.id,
      ownershipPercent: Number(form.ownershipPercent),
      addressLine2: form.addressLine2 || "",
      nationalIdLast4: principal?.nationalIdLast4 ?? null,
    };
    const parsed = principalSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    // Read the number now and drop the reference to it as soon as it is sent.
    const secret = secretRef.current?.value.trim() ?? "";

    let saved: { id?: string };
    try {
      saved = await savePrincipal.mutateAsync(parsed.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That could not be saved.",
      );
      return;
    }

    const principalId = principal?.id ?? saved.id;
    if (secret && principalId) {
      try {
        await storeSecret.mutateAsync({
          kind: "principal",
          principalId,
          value: secret,
        });
      } catch (error) {
        // The person is saved. Say exactly what is missing rather than
        // reporting a failure that would send somebody to re-enter all of it.
        toast.error(
          error instanceof Error
            ? `${parsed.data.fullName} was saved, but the identity number was not: ${error.message}`
            : `${parsed.data.fullName} was saved, but the identity number was not.`,
        );
        if (secretRef.current) secretRef.current.value = "";
        close();
        return;
      }
    }

    if (secretRef.current) secretRef.current.value = "";
    toast.success(
      principal ? "Owner updated." : `${parsed.data.fullName} added.`,
    );
    close();
  }

  const hasStoredId = Boolean(principal?.nationalIdLast4);
  const showSecretInput = !hasStoredId || replacingId;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{principal ? "Edit owner" : "Add an owner"}</DialogTitle>
          <DialogDescription>
            Exactly as their government-issued ID shows it. A name that does not
            match the document is the second commonest cause of a delay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="owner-name"
              label="Full legal name"
              value={form.fullName}
              error={errors.fullName}
              onChange={(v) => set("fullName", v)}
              autoComplete="off"
            />
            <TextField
              id="owner-title"
              label="Role in the business"
              value={form.title}
              error={errors.title}
              onChange={(v) => set("title", v)}
              placeholder="Owner, Director, Partner"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="owner-percent"
              label="Ownership"
              value={form.ownershipPercent}
              error={errors.ownershipPercent}
              onChange={(v) =>
                set("ownershipPercent", v.replace(/[^0-9.]/g, ""))
              }
              inputMode="decimal"
              placeholder="50"
              hint="Percentage of the business they own."
            />
            <Field
              id="owner-dob"
              label="Date of birth"
              error={errors.dateOfBirth}
            >
              <DatePicker
                id="owner-dob"
                value={form.dateOfBirth || undefined}
                onValueChange={(next) => set("dateOfBirth", next)}
                max={latestBirthDate()}
                showManualInput
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="owner-email"
              label="Email"
              value={form.email}
              error={errors.email}
              onChange={(v) => set("email", v)}
              type="email"
              inputMode="email"
              autoComplete="off"
            />
            <TextField
              id="owner-phone"
              label="Phone"
              value={form.phone}
              error={errors.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          </div>

          <div className="space-y-5 border-t pt-5">
            <p className="text-sm font-semibold">Home address</p>
            <p className="text-muted-foreground -mt-4 text-xs/relaxed">
              Where they live, not where the business trades. This is what gets
              checked against their ID.
            </p>
            <TextField
              id="owner-address1"
              label="Street address"
              value={form.addressLine1}
              error={errors.addressLine1}
              onChange={(v) => set("addressLine1", v)}
              autoComplete="off"
            />
            <TextField
              id="owner-address2"
              label="Unit or apartment"
              optional
              value={form.addressLine2}
              error={errors.addressLine2}
              onChange={(v) => set("addressLine2", v)}
              autoComplete="off"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                id="owner-city"
                label="City"
                value={form.city}
                error={errors.city}
                onChange={(v) => set("city", v)}
                autoComplete="off"
              />
              <TextField
                id="owner-region"
                label="Province or state"
                value={form.region}
                error={errors.region}
                onChange={(v) => set("region", v)}
                autoComplete="off"
              />
              <TextField
                id="owner-postal"
                label="Postal or ZIP"
                value={form.postalCode}
                error={errors.postalCode}
                onChange={(v) => set("postalCode", v)}
                autoComplete="off"
              />
              <SelectField
                id="owner-country"
                label="Country"
                value={form.country}
                error={errors.country}
                onChange={(v) => set("country", v)}
                options={COUNTRIES}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-5">
            <p className="text-sm font-semibold">Identity</p>
            {hasStoredId && !replacingId ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Lock className="text-muted-foreground size-4" />
                  <span className="text-sm">Identity number on file</span>
                  <StoredLast4 last4={principal?.nationalIdLast4 ?? "0000"} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplacingId(true)}
                >
                  Replace
                </Button>
              </div>
            ) : null}

            {showSecretInput && (
              <SecretField
                id="owner-national-id"
                label={
                  form.country === "US"
                    ? "Social security number"
                    : "National identity number"
                }
                inputRef={secretRef}
                placeholder="•••••••••"
                hint="Encrypted the moment it arrives and readable by nobody in Yipyy. It is deleted once the account is open, and only the last four digits are ever shown back to you."
              />
            )}
            {!hasStoredId && (
              <p className="text-muted-foreground text-xs/relaxed">
                You can add this later — the owner will simply be flagged as
                incomplete until you do.
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="owner-control"
              checked={form.isControlPerson}
              onCheckedChange={(checked) =>
                set("isControlPerson", checked === true)
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="owner-control"
              className="block text-sm/relaxed font-normal"
            >
              <span className="font-medium">
                This person controls the business day to day.
              </span>
              <span className="text-muted-foreground mt-0.5 block">
                Exactly one person has to be marked, and it is a separate
                question from ownership — a 20% partner who runs the place
                qualifies, and a 90% investor who does not, does not.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {principal ? "Save changes" : "Add owner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
