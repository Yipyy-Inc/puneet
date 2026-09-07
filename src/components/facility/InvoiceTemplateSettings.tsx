"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Eye, FileText, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  defaultInvoiceTemplate,
  loadInvoiceTemplate,
} from "@/data/invoice-template";
import type {
  InvoiceTemplate,
  TaxRegistration,
  InvoiceNumberFormat,
  InvoicePaymentTerms,
} from "@/types/invoice-template";
import {
  buildInvoiceDocumentHtml,
  formatInvoiceNumber,
  type InvoiceDocumentData,
} from "@/lib/invoice-document";
import { buildRetailTaxLines, retailQueries } from "@/lib/api/retail";
import { invoiceTemplateMutations } from "@/lib/api/invoice-template";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { formatDateLong } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { RetailTaxConfig } from "@/data/retail-config";

// Heavy, conditionally-shown modal — loaded on demand when the user opens the
// full preview, keeping it out of the settings-page bundle.
const InvoiceFullPreviewDialog = dynamic(
  () =>
    import("@/components/facility/InvoiceFullPreviewDialog").then(
      (mod) => mod.InvoiceFullPreviewDialog,
    ),
  { ssr: false },
);

function newTaxRegistrationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tax-reg-${Math.round(performance.now() * 1000)}`;
}

const PREVIEW_SUBTOTAL = 170;
const PREVIEW_DEPOSIT = 50;

/**
 * Sample invoice for the live preview. Taxes are derived from the retail Tax
 * Configuration (Retail Settings → Tax Configuration) rather than hardcoded, so
 * the template reflects the same single source of truth the POS uses. While the
 * config is still loading (`taxConfig` undefined) the tax lines render as a
 * skeleton — never a fabricated rate.
 */
function buildPreviewData(
  taxConfig: RetailTaxConfig | undefined,
  numberFormat: InvoiceNumberFormat,
  locale: AppLocale,
): InvoiceDocumentData {
  const taxes = taxConfig
    ? buildRetailTaxLines(PREVIEW_SUBTOTAL, taxConfig)
    : [];
  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  const total = PREVIEW_SUBTOTAL + taxTotal;
  const now = new Date();
  return {
    invoiceNumber: formatInvoiceNumber(
      numberFormat,
      now.getFullYear(),
      now.getMonth() + 1,
      numberFormat.nextNumber,
    ),
    invoiceStatus: "open",
    issuedDate: formatDateLong(new Date(), locale),
    bookingDateRange: "Apr 1 – Apr 4, 2026 (3 nights)",
    clientName: "Alice Johnson",
    clientEmail: "alice@example.com",
    clientPhone: "(555) 234-5678",
    petName: "Buddy",
    serviceLabel: "Boarding",
    items: [
      {
        name: "Boarding — Standard (3 nights)",
        unitPrice: 45,
        quantity: 3,
        price: 135,
      },
      {
        name: "Video Call",
        unitPrice: 20,
        quantity: 1,
        price: 20,
        staffName: "Amy C.",
      },
      {
        name: "Enrichment Session",
        unitPrice: 15,
        quantity: 1,
        price: 15,
        staffName: "Jake M.",
      },
    ],
    subtotal: PREVIEW_SUBTOTAL,
    taxes,
    taxesLoading: !taxConfig,
    total,
    depositCollected: PREVIEW_DEPOSIT,
    remainingDue: total - PREVIEW_DEPOSIT,
    payments: [
      {
        date: "2026-04-01",
        method: "card",
        amount: PREVIEW_DEPOSIT,
        kind: "deposit",
        collectedBy: "Sarah K.",
      },
    ],
  };
}

/** Example invoice number for the current month, for the live hint. */
function exampleInvoiceNumber(fmt: InvoiceNumberFormat): string {
  const now = new Date();
  return formatInvoiceNumber(
    fmt,
    now.getFullYear(),
    now.getMonth() + 1,
    fmt.nextNumber,
  );
}

export function InvoiceTemplateSettings() {
  const { locale, section } = useSettingsText();
  const t = section("invoice-template");
  const [template, setTemplate] = useState<InvoiceTemplate>(
    defaultInvoiceTemplate,
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Tax rates come from Retail/POS Settings — the single source of truth.
  const { data: taxConfig } = useQuery(retailQueries.taxConfig());

  useEffect(() => {
    setTemplate(loadInvoiceTemplate());
    setHasMounted(true);
  }, []);

  const update = <K extends keyof InvoiceTemplate>(
    key: K,
    value: InvoiceTemplate[K],
  ) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // ── Tax registration list ────────────────────────────────────────────
  const addTaxRegistration = () => {
    update("taxRegistrations", [
      ...template.taxRegistrations,
      { id: newTaxRegistrationId(), label: "", value: "" },
    ]);
  };

  const updateTaxRegistration = (
    id: string,
    patch: Partial<Omit<TaxRegistration, "id">>,
  ) => {
    update(
      "taxRegistrations",
      template.taxRegistrations.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    );
  };

  const removeTaxRegistration = (id: string) => {
    update(
      "taxRegistrations",
      template.taxRegistrations.filter((r) => r.id !== id),
    );
  };

  const updateNumberFormat = (patch: Partial<InvoiceNumberFormat>) => {
    update("invoiceNumberFormat", {
      ...template.invoiceNumberFormat,
      ...patch,
    });
  };

  const updatePaymentTerms = (patch: Partial<InvoicePaymentTerms>) => {
    update("paymentTerms", { ...template.paymentTerms, ...patch });
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error(t("logoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update("logoUrl", reader.result as string);
      toast.success(t("logoUploaded"));
    };
    reader.readAsDataURL(file);
  };

  const saveTemplate = useMutation({
    ...invoiceTemplateMutations.save(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-template"] });
      setDirty(false);
      toast.success(t("savedToast"));
    },
  });

  const handleSave = () => {
    saveTemplate.mutate();
  };

  const handleReset = () => {
    setTemplate(defaultInvoiceTemplate);
    setDirty(true);
  };

  const previewHtml = useMemo(() => {
    if (!hasMounted) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildInvoiceDocumentHtml(
      template,
      buildPreviewData(taxConfig, template.invoiceNumberFormat, locale),
      origin,
    );
  }, [template, hasMounted, taxConfig, locale]);

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {t("intro")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t("resetDefaults")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullPreviewOpen(true)}
          >
            <Eye className="size-3.5" />
            {t("fullPreview")}
          </Button>
          <Button onClick={handleSave} disabled={!dirty}>
            {t(dirty ? "saveChanges" : "saved")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Editor */}
        <div className="space-y-5">
          {/* Branding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("branding")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">{t("logo")}</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="bg-muted/30 flex size-20 items-center justify-center rounded-lg border border-dashed">
                    {template.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.logoUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <ImagePlus className="text-muted-foreground size-6" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("uploadLogo")}
                    </Button>
                    {template.logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-8"
                        onClick={() => update("logoUrl", "")}
                      >
                        <Trash2 className="size-3.5" />
                        {t("remove")}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  {t("logoHelp")}
                </p>
              </div>
              <div>
                <Label className="text-xs">{t("accentColour")}</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={template.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-sm border"
                  />
                  <Input
                    value={template.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="h-9 flex-1 font-mono text-xs"
                    placeholder="#0f172a"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facility info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("facilityInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t("facilityName")}</Label>
                <Input
                  value={template.facilityName}
                  onChange={(e) => update("facilityName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{t("addressLine1")}</Label>
                  <Input
                    value={template.addressLine1 ?? ""}
                    onChange={(e) => update("addressLine1", e.target.value)}
                    className="mt-1"
                    placeholder={t("addressPlaceholder1")}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("addressLine2")}</Label>
                  <Input
                    value={template.addressLine2 ?? ""}
                    onChange={(e) => update("addressLine2", e.target.value)}
                    className="mt-1"
                    placeholder={t("addressPlaceholder2")}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{t("phone")}</Label>
                  <Input
                    value={template.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("email")}</Label>
                  <Input
                    value={template.email ?? ""}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("website")}</Label>
                <Input
                  value={template.website ?? ""}
                  onChange={(e) => update("website", e.target.value)}
                  className="mt-1"
                  placeholder={t("websitePlaceholder")}
                />
              </div>
              <div>
                <Label className="text-xs">{t("taxRegistrations")}</Label>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {t("taxRegistrationsHelp")}
                </p>
                <div className="mt-2 space-y-2">
                  {template.taxRegistrations.length === 0 && (
                    <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-[11px]">
                      {t("noRegistrations")}
                    </p>
                  )}
                  {template.taxRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center gap-2">
                      <Input
                        value={reg.label}
                        onChange={(e) =>
                          updateTaxRegistration(reg.id, {
                            label: e.target.value,
                          })
                        }
                        className="h-9 flex-1"
                        placeholder={t("registrationLabelPlaceholder")}
                        aria-label={t("registrationLabel")}
                      />
                      <Input
                        value={reg.value}
                        onChange={(e) =>
                          updateTaxRegistration(reg.id, {
                            value: e.target.value,
                          })
                        }
                        className="h-9 flex-1"
                        placeholder={t("registrationNumberPlaceholder")}
                        aria-label={t("registrationNumber")}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-9 shrink-0"
                        onClick={() => removeTaxRegistration(reg.id)}
                        aria-label={t("removeRegistration")}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={addTaxRegistration}
                  >
                    <Plus className="size-3.5" />
                    {t("addRegistration")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice numbering */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("numbering")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{t("prefix")}</Label>
                  <Input
                    value={template.invoiceNumberFormat.prefix}
                    onChange={(e) =>
                      updateNumberFormat({ prefix: e.target.value })
                    }
                    className="mt-1"
                    placeholder={t("prefixPlaceholder")}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("counterDigits")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={template.invoiceNumberFormat.padding}
                    onChange={(e) =>
                      updateNumberFormat({
                        padding: Math.min(
                          10,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("yearFormat")}</Label>
                  <Select
                    value={template.invoiceNumberFormat.yearFormat}
                    onValueChange={(v) =>
                      updateNumberFormat({
                        yearFormat: v as InvoiceNumberFormat["yearFormat"],
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("formatNone")}</SelectItem>
                      <SelectItem value="YYYY">YYYY (2026)</SelectItem>
                      <SelectItem value="YY">YY (26)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("monthFormat")}</Label>
                  <Select
                    value={template.invoiceNumberFormat.monthFormat}
                    onValueChange={(v) =>
                      updateNumberFormat({
                        monthFormat: v as InvoiceNumberFormat["monthFormat"],
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("formatNone")}</SelectItem>
                      <SelectItem value="MM">MM (06)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("nextNumber")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={template.invoiceNumberFormat.nextNumber}
                    onChange={(e) =>
                      updateNumberFormat({
                        nextNumber: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="bg-muted/40 rounded-md border px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {t("nextInvoice")}{" "}
                </span>
                <span className="font-mono font-semibold">
                  {exampleInvoiceNumber(template.invoiceNumberFormat)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment terms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("paymentTerms")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t("terms")}</Label>
                <Select
                  value={template.paymentTerms.type}
                  onValueChange={(v) =>
                    updatePaymentTerms({
                      type: v as InvoicePaymentTerms["type"],
                    })
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">
                      {t("termsDueOnReceipt")}
                    </SelectItem>
                    {[7, 14, 30].map((days) => (
                      <SelectItem key={days} value={`net_${days}`}>
                        {t("termsNet").replace("{n}", String(days))}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">{t("termsCustom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {template.paymentTerms.type === "custom" && (
                <div>
                  <Label className="text-xs">{t("customTerms")}</Label>
                  <Input
                    value={template.paymentTerms.customText}
                    onChange={(e) =>
                      updatePaymentTerms({ customText: e.target.value })
                    }
                    className="mt-1"
                    placeholder={t("customTermsPlaceholder")}
                  />
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                {t("paymentTermsHelp")}
              </p>
            </CardContent>
          </Card>

          {/* Footer + signature */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("footerSignature")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">{t("footerMessage")}</Label>
                <Textarea
                  value={template.footerText}
                  onChange={(e) => update("footerText", e.target.value)}
                  className="mt-1 h-24 text-sm"
                  placeholder={t("footerPlaceholder")}
                />
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  {t("footerHelp")}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{t("showThankYou")}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("showThankYouHelp")}
                    </p>
                  </div>
                  <Switch
                    checked={template.showThankYou}
                    onCheckedChange={(v) => update("showThankYou", v)}
                  />
                </div>
                {template.showThankYou && (
                  <Input
                    value={template.thankYouMessage}
                    onChange={(e) => update("thankYouMessage", e.target.value)}
                    className="mt-2 text-sm"
                    placeholder={t("thankYouPlaceholder")}
                  />
                )}
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      {t("includeSignature")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("includeSignatureHelp")}
                    </p>
                  </div>
                  <Switch
                    checked={template.signatureEnabled}
                    onCheckedChange={(v) => update("signatureEnabled", v)}
                  />
                </div>
                {template.signatureEnabled && (
                  <div className="mt-2">
                    <Label className="text-[11px]">{t("signatureLabel")}</Label>
                    <Input
                      value={template.signatureLabel}
                      onChange={(e) => update("signatureLabel", e.target.value)}
                      className="mt-1 text-sm"
                      placeholder={t("signatureLabelPlaceholder")}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/40 flex flex-row items-center justify-between border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                {t("livePreview")}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {t("sampleData")}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-zinc-200/50 p-4">
                <iframe
                  title={t("previewTitle")}
                  srcDoc={previewHtml}
                  className="h-[720px] w-full rounded-md border bg-white shadow-sm"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {fullPreviewOpen && (
        <InvoiceFullPreviewDialog
          open={fullPreviewOpen}
          onOpenChange={setFullPreviewOpen}
          html={previewHtml}
        />
      )}
    </div>
  );
}
