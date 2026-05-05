"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  defaultInvoiceTemplate,
  loadInvoiceTemplate,
  saveInvoiceTemplate,
} from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";
import {
  buildInvoiceDocumentHtml,
  type InvoiceDocumentData,
} from "@/lib/invoice-document";

const PREVIEW_DATA: InvoiceDocumentData = {
  invoiceNumber: "10001",
  invoiceStatus: "open",
  issuedDate: new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
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
  subtotal: 170,
  taxes: [
    { name: "GST", rate: 0.05, amount: 8.5 },
    { name: "QST", rate: 0.09975, amount: 16.96 },
  ],
  total: 195.46,
  depositCollected: 50,
  remainingDue: 145.46,
  payments: [
    {
      date: "2026-04-01",
      method: "card",
      amount: 50,
      kind: "deposit",
      collectedBy: "Sarah K.",
    },
  ],
};

export function InvoiceTemplateSettings() {
  const [template, setTemplate] = useState<InvoiceTemplate>(
    defaultInvoiceTemplate,
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be under 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update("logoUrl", reader.result as string);
      toast.success("Logo uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveInvoiceTemplate(template);
    setDirty(false);
    toast.success("Invoice template saved");
  };

  const handleReset = () => {
    setTemplate(defaultInvoiceTemplate);
    setDirty(true);
  };

  const previewHtml = useMemo(() => {
    if (!hasMounted) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return buildInvoiceDocumentHtml(template, PREVIEW_DATA, origin);
  }, [template, hasMounted]);

  const handleOpenFullPreview = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(previewHtml);
    w.document.close();
  };

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Invoice Template</h2>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Brand the invoice your clients receive. Logo, contact info, footer
            message, and signature line — all configurable. Live preview on the
            right updates as you type.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenFullPreview}>
            <Eye className="size-3.5" />
            Full preview
          </Button>
          <Button onClick={handleSave} disabled={!dirty}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Editor */}
        <div className="space-y-5">
          {/* Branding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Logo</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex size-20 items-center justify-center rounded-lg border border-dashed bg-muted/30">
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
                      Upload logo
                    </Button>
                    {template.logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-8"
                        onClick={() => update("logoUrl", "")}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  PNG or JPG, under 1 MB. Replaces the Yipyy logo.
                </p>
              </div>
              <div>
                <Label className="text-xs">Accent color</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={template.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border"
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
              <CardTitle className="text-sm">Facility information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Facility name</Label>
                <Input
                  value={template.facilityName}
                  onChange={(e) => update("facilityName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Address line 1</Label>
                  <Input
                    value={template.addressLine1 ?? ""}
                    onChange={(e) => update("addressLine1", e.target.value)}
                    className="mt-1"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label className="text-xs">Address line 2</Label>
                  <Input
                    value={template.addressLine2 ?? ""}
                    onChange={(e) => update("addressLine2", e.target.value)}
                    className="mt-1"
                    placeholder="City, State ZIP"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={template.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={template.email ?? ""}
                    onChange={(e) => update("email", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website (optional)</Label>
                <Input
                  value={template.website ?? ""}
                  onChange={(e) => update("website", e.target.value)}
                  className="mt-1"
                  placeholder="examplepetcare.com"
                />
              </div>
              <div>
                <Label className="text-xs">Tax / registration numbers</Label>
                <Input
                  value={template.taxNumbers ?? ""}
                  onChange={(e) => update("taxNumbers", e.target.value)}
                  className="mt-1"
                  placeholder="GST: 123456789 · QST: 987654321"
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer + signature */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Footer & signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Custom footer message</Label>
                <Textarea
                  value={template.footerText}
                  onChange={(e) => update("footerText", e.target.value)}
                  className="mt-1 h-24 text-sm"
                  placeholder="Thank you for trusting us with your furry family member."
                />
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  Appears in a highlighted box at the bottom of every invoice.
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Show thank-you line</p>
                    <p className="text-muted-foreground text-[11px]">
                      Small centered note at the very bottom of the printed
                      page.
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
                    onChange={(e) =>
                      update("thankYouMessage", e.target.value)
                    }
                    className="mt-2 text-sm"
                    placeholder="We'll see you again soon!"
                  />
                )}
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">
                      Include signature line
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Adds a signature + date line for clients to sign on the
                      printed copy.
                    </p>
                  </div>
                  <Switch
                    checked={template.signatureEnabled}
                    onCheckedChange={(v) => update("signatureEnabled", v)}
                  />
                </div>
                {template.signatureEnabled && (
                  <div className="mt-2">
                    <Label className="text-[11px]">Signature label</Label>
                    <Input
                      value={template.signatureLabel}
                      onChange={(e) =>
                        update("signatureLabel", e.target.value)
                      }
                      className="mt-1 text-sm"
                      placeholder="Client Signature"
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
            <CardHeader className="bg-muted/40 border-b py-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4" />
                Live preview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Sample data
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-zinc-200/50 p-4">
                <iframe
                  title="Invoice preview"
                  srcDoc={previewHtml}
                  className="h-[720px] w-full rounded-md border bg-white shadow-sm"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
