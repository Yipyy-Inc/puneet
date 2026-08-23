"use client";

import { useState } from "react";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useSaveStep } from "@/lib/api/merchant-application";
import {
  BUSINESS_STRUCTURES,
  businessStepSchema,
  type MerchantApplication,
} from "@/lib/merchant-application/application";
import {
  Field,
  SelectField,
  TextField,
  fieldErrors,
  type FieldErrors,
} from "./fields";

// ============================================================================
// Step 1 — the business the merchant account will belong to.
//
// ── THE LEGAL NAME WARNING IS THE POINT OF THIS SCREEN ────────────────────
//
// Every acquirer's onboarding guidance names the same commonest cause of a
// stalled application: a legal name that does not match the tax authority's
// records character for character. It is stated here, above the field, rather
// than in a rejection three days later — the whole cost of avoiding it is
// somebody reading one sentence before they type.
//
// ── AND THE TAX NUMBER IS NOT REFORMATTED ─────────────────────────────────
//
// Whatever separators the document shows are kept. Helpfully normalising
// "12-3456789" to "123456789" is how a match becomes a mismatch at the other
// end, and the person who typed it has no way to see that we changed it.
// ============================================================================

const COUNTRIES = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
] as const;

interface BusinessForm {
  legalName: string;
  tradingName: string;
  businessStructure: string;
  taxId: string;
  incorporatedOn: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  businessPhone: string;
  businessEmail: string;
  website: string;
}

function formFrom(application: MerchantApplication): BusinessForm {
  const b = application.business;
  return {
    legalName: b.legalName ?? "",
    tradingName: b.tradingName ?? "",
    businessStructure: b.businessStructure ?? "",
    taxId: b.taxId ?? "",
    incorporatedOn: b.incorporatedOn ?? "",
    addressLine1: b.addressLine1 ?? "",
    addressLine2: b.addressLine2 ?? "",
    city: b.city ?? "",
    region: b.region ?? "",
    postalCode: b.postalCode ?? "",
    country: b.country ?? "",
    businessPhone: b.businessPhone ?? "",
    businessEmail: b.businessEmail ?? "",
    website: b.website ?? "",
  };
}

export function StepBusiness({
  application,
  onSaved,
}: {
  application: MerchantApplication;
  onSaved: () => void;
}) {
  // Derived from the server, never seeded into state — a `useState(saved)` here
  // latches whatever the query had not returned yet, and Save then writes the
  // blanks back over the real row.
  const [draft, setDraft] = useState<BusinessForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const form = draft ?? formFrom(application);
  const save = useSaveStep();

  const set = <K extends keyof BusinessForm>(key: K, value: string) =>
    setDraft({ ...form, [key]: value });

  function submit() {
    const parsed = businessStepSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Some details still need attention.");
      return;
    }
    setErrors({});
    save.mutate(
      { step: "business", values: parsed.data },
      {
        onSuccess: () => {
          setDraft(null);
          onSaved();
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">Your business</h3>
        <p className="text-muted-foreground text-sm/relaxed">
          As it appears on your registration and tax records — not as your
          customers know you. There is a separate field below for that.
        </p>
      </header>

      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="leading-relaxed">
          <span className="font-semibold">
            Your legal name has to match your tax records exactly.
          </span>{" "}
          Capitalisation, punctuation and any Inc., Ltd. or LLC included. A
          mismatch here is the most common reason an application sits waiting.
        </p>
      </div>

      <section className="space-y-5">
        <TextField
          id="legal-name"
          label="Legal business name"
          value={form.legalName}
          error={errors.legalName}
          onChange={(v) => set("legalName", v)}
          placeholder="Pawradise Pet Resort Inc."
          autoComplete="organization"
        />
        <TextField
          id="trading-name"
          label="Trading name"
          optional
          value={form.tradingName}
          error={errors.tradingName}
          onChange={(v) => set("tradingName", v)}
          hint="What your customers call you, if it differs. This is what appears on their card statement."
          placeholder="Pawradise"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="structure"
            label="Business structure"
            value={form.businessStructure}
            error={errors.businessStructure}
            onChange={(v) => set("businessStructure", v)}
            options={BUSINESS_STRUCTURES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
          <TextField
            id="tax-id"
            label="Business tax number"
            value={form.taxId}
            error={errors.taxId}
            onChange={(v) => set("taxId", v)}
            inputMode="numeric"
            placeholder="12-3456789"
            hint="EIN in the US, business number in Canada. Type it exactly as your document shows it."
          />
        </div>

        <Field
          id="incorporated-on"
          label="Registered or incorporated on"
          optional
          error={errors.incorporatedOn}
          hint="Leave blank if you are a sole proprietor with no registration date."
          className="max-w-xs"
        >
          <DatePicker
            id="incorporated-on"
            value={form.incorporatedOn || undefined}
            onValueChange={(next) => set("incorporatedOn", next)}
            max={new Date().toISOString().slice(0, 10)}
            showManualInput
          />
        </Field>
      </section>

      <section className="space-y-5">
        <h4 className="text-sm font-semibold">Registered address</h4>
        <p className="text-muted-foreground -mt-3 text-xs/relaxed">
          The address on your registration. If you trade somewhere else, say so
          when we ask for documents.
        </p>

        <TextField
          id="address1"
          label="Street address"
          value={form.addressLine1}
          error={errors.addressLine1}
          onChange={(v) => set("addressLine1", v)}
          autoComplete="address-line1"
        />
        <TextField
          id="address2"
          label="Unit, suite or floor"
          optional
          value={form.addressLine2}
          error={errors.addressLine2}
          onChange={(v) => set("addressLine2", v)}
          autoComplete="address-line2"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            id="city"
            label="City"
            value={form.city}
            error={errors.city}
            onChange={(v) => set("city", v)}
            autoComplete="address-level2"
          />
          <TextField
            id="region"
            label="Province or state"
            value={form.region}
            error={errors.region}
            onChange={(v) => set("region", v)}
            autoComplete="address-level1"
          />
          <TextField
            id="postal"
            label="Postal or ZIP code"
            value={form.postalCode}
            error={errors.postalCode}
            onChange={(v) => set("postalCode", v)}
            autoComplete="postal-code"
          />
          <SelectField
            id="country"
            label="Country"
            value={form.country}
            error={errors.country}
            onChange={(v) => set("country", v)}
            options={COUNTRIES}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h4 className="text-sm font-semibold">How to reach the business</h4>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="business-phone"
            label="Business phone"
            value={form.businessPhone}
            error={errors.businessPhone}
            onChange={(v) => set("businessPhone", v)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <TextField
            id="business-email"
            label="Business email"
            value={form.businessEmail}
            error={errors.businessEmail}
            onChange={(v) => set("businessEmail", v)}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </div>
        <TextField
          id="website"
          label="Website or booking page"
          optional
          value={form.website}
          error={errors.website}
          onChange={(v) => set("website", v)}
          inputMode="url"
          placeholder="https://"
          hint="Anything that shows what you sell helps. Your Yipyy booking page counts."
        />
      </section>

      <div className="flex justify-end border-t pt-6">
        <Button size="lg" onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Save and continue
        </Button>
      </div>
    </div>
  );
}
