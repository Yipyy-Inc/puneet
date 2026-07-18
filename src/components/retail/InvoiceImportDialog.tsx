"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileUp,
  Camera,
  Upload,
  Keyboard,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CameraScanner } from "@/components/retail/CameraScanner";
import { InvoiceLineItemsTable } from "@/components/retail/InvoiceLineItemsTable";
import { retailQueries } from "@/lib/api/retail";
import {
  extractInvoice,
  type ExtractedInvoice,
} from "@/lib/retail/invoice-extraction";
import { matchSupplierByName } from "@/lib/retail/supplier-match";

interface InvoiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step =
  | "choose" // pick capture method
  | "camera" // live camera (reuses CameraScanner)
  | "loading" // reading the invoice
  | "error" // unreadable
  | "header" // Step 2 — confirm extracted header
  | "manual" // Step 3 — empty line-item table (built separately)
  | "review"; // Step 3 — line items from the extracted invoice (built separately)

const NEW_SUPPLIER = "__new_supplier__";

interface HeaderForm {
  /** Selected existing supplier id, or null when creating a new supplier. */
  supplierId: string | null;
  isNewSupplier: boolean;
  newSupplierName: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO YYYY-MM-DD
  invoiceTotal: string; // editable; cross-checked against line items later
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic"];
const FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic";

const IS_DEV = process.env.NODE_ENV !== "production";

function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return "Unsupported file type. Use PDF, JPG, PNG, or HEIC.";
  }
  if (file.size > MAX_BYTES) {
    return "That file is over 10 MB. Try a smaller scan or the PDF.";
  }
  return null;
}

/**
 * Supplier-invoice import — Step 1 (spec 2.2–2.3): choose how to capture the
 * invoice (photo / file / manual), then run extraction and route to the review
 * (Step 2) or manual line-item table (Step 3), which are built separately.
 *
 * Shared shell opened by BOTH entry points (Orders "Import from Invoice" and
 * Inventory "Receive Stock via Invoice").
 */
export function InvoiceImportDialog({
  open,
  onOpenChange,
}: InvoiceImportDialogProps) {
  const [step, setStep] = useState<Step>("choose");
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: suppliers = [] } = useQuery(retailQueries.suppliers());
  const { data: products = [] } = useQuery(retailQueries.products());

  const reset = () => {
    setStep("choose");
    setExtracted(null);
    setHeaderForm(null);
    setFileName(undefined);
    setSimulateFailure(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runExtraction = async (file: File) => {
    setStep("loading");
    setFileName(file.name);
    try {
      const result = await extractInvoice(file, { simulateFailure });
      setExtracted(result);

      // Fuzzy-match the extracted supplier name against the existing list.
      const match = matchSupplierByName(result.header.supplierName, suppliers);
      setHeaderForm({
        supplierId: match?.supplier.id ?? null,
        isNewSupplier: !match,
        newSupplierName: match ? "" : (result.header.supplierName ?? ""),
        invoiceNumber: result.header.invoiceNumber ?? "",
        invoiceDate: result.header.invoiceDate ?? "",
        invoiceTotal:
          result.header.total != null ? String(result.header.total) : "",
      });
      setStep("header");
    } catch {
      setStep("error");
    }
  };

  const updateHeader = (patch: Partial<HeaderForm>) =>
    setHeaderForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const headerValid =
    !!headerForm &&
    (headerForm.isNewSupplier
      ? headerForm.newSupplierName.trim().length > 0
      : !!headerForm.supplierId);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    void runExtraction(file);
  };

  // The camera is a live view; "capturing" hands a photo to the (mocked)
  // extractor. Content is irrelevant in the mock — the seam is extractInvoice.
  const handleCapture = () => {
    const photo = new File([], "invoice-photo.jpg", { type: "image/jpeg" });
    void runExtraction(photo);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          step === "review" || step === "manual"
            ? "max-h-[90vh] overflow-y-auto sm:max-w-5xl"
            : "sm:max-w-lg"
        }
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5" />
            Import from Invoice
          </DialogTitle>
          <DialogDescription>
            {step === "choose"
              ? "Capture a supplier invoice to auto-fill a stock receipt."
              : "Match line items to products, confirm quantities and costs, then receive."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("camera")}
              className="hover:border-primary/50 hover:bg-muted/40 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <Camera className="text-primary mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Take a Photo</span>
                <span className="text-muted-foreground block text-xs">
                  Best for paper invoices — snap it with your camera.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:border-primary/50 hover:bg-muted/40 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <Upload className="text-primary mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Upload File</span>
                <span className="text-muted-foreground block text-xs">
                  Best for emailed invoices — PDF, JPG, PNG, or HEIC (max 10
                  MB).
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStep("manual")}
              className="hover:border-primary/50 hover:bg-muted/40 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <Keyboard className="text-primary mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">
                  Enter Manually
                </span>
                <span className="text-muted-foreground block text-xs">
                  Skip scanning and type the line items yourself.
                </span>
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={handleFilePicked}
            />

            {IS_DEV && (
              <label className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
                <Checkbox
                  checked={simulateFailure}
                  onCheckedChange={(v) => setSimulateFailure(Boolean(v))}
                />
                Simulate unreadable invoice (dev)
              </label>
            )}
          </div>
        )}

        {step === "camera" && (
          <div className="space-y-3">
            <CameraScanner onScan={handleCapture} />
            <p className="text-muted-foreground text-center text-xs">
              Frame the whole invoice, then capture.
            </p>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("choose")}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={handleCapture}>
                <Camera className="mr-2 size-4" />
                Capture photo
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="text-primary size-8 animate-spin" />
            <div>
              <p className="text-sm font-medium">Reading your invoice…</p>
              <p className="text-muted-foreground text-xs">
                This usually takes 10–20 seconds.
              </p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-medium">
                We couldn&rsquo;t read that invoice
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="mb-1 text-xs font-medium">A few things to try:</p>
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
                <li>Use better lighting and avoid glare or shadows.</li>
                <li>Flatten the page and fit the whole invoice in frame.</li>
                <li>If you have the emailed PDF, upload that instead.</li>
              </ul>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("choose")}>
                <RefreshCw className="mr-2 size-4" />
                Try again
              </Button>
              <Button onClick={() => setStep("manual")}>
                <Keyboard className="mr-2 size-4" />
                Switch to manual entry
              </Button>
            </div>
          </div>
        )}

        {step === "manual" && (
          <InvoiceLineItemsTable
            initialLines={[]}
            products={products}
            onBack={() => setStep("choose")}
          />
        )}

        {step === "header" && headerForm && (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Supplier</Label>
              <Select
                value={
                  headerForm.isNewSupplier
                    ? NEW_SUPPLIER
                    : (headerForm.supplierId ?? NEW_SUPPLIER)
                }
                onValueChange={(v) => {
                  if (v === NEW_SUPPLIER) {
                    updateHeader({
                      isNewSupplier: true,
                      supplierId: null,
                      newSupplierName:
                        headerForm.newSupplierName ||
                        (extracted?.header.supplierName ?? ""),
                    });
                  } else {
                    updateHeader({ isNewSupplier: false, supplierId: v });
                  }
                }}
              >
                <SelectTrigger aria-label="Supplier">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_SUPPLIER}>
                    + New supplier&hellip;
                  </SelectItem>
                </SelectContent>
              </Select>

              {!headerForm.isNewSupplier && headerForm.supplierId ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Sparkles className="size-3 text-emerald-600" />
                  Matched &ldquo;{extracted?.header.supplierName}&rdquo; to an
                  existing supplier. Pick a different one above if this is
                  wrong.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal text-amber-700 dark:text-amber-400"
                    >
                      New supplier
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      No match found — a supplier will be created on import.
                    </span>
                  </div>
                  <Input
                    value={headerForm.newSupplierName}
                    onChange={(e) =>
                      updateHeader({ newSupplierName: e.target.value })
                    }
                    placeholder="New supplier name"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-number" className="text-xs">
                  Invoice Number
                </Label>
                <Input
                  id="inv-number"
                  value={headerForm.invoiceNumber}
                  onChange={(e) =>
                    updateHeader({ invoiceNumber: e.target.value })
                  }
                  placeholder="e.g., INV-88213"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Invoice Date</Label>
                <DatePicker
                  value={headerForm.invoiceDate}
                  onValueChange={(v) => updateHeader({ invoiceDate: v })}
                  displayMode="dialog"
                  showManualInput
                  placeholder="Select date"
                />
              </div>
            </div>

            <div className="grid gap-1.5 sm:max-w-[calc(50%-0.5rem)]">
              <Label htmlFor="inv-total" className="text-xs">
                Invoice Total ($)
              </Label>
              <Input
                id="inv-total"
                type="number"
                min={0}
                step={0.01}
                value={headerForm.invoiceTotal}
                onChange={(e) => updateHeader({ invoiceTotal: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-muted-foreground text-xs">
                Cross-checked against the sum of line items in the next step.
              </p>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep("choose")}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={() => setStep("review")} disabled={!headerValid}>
                Confirm &amp; Review Line Items
              </Button>
            </div>
          </div>
        )}

        {step === "review" && extracted && headerForm && (
          <InvoiceLineItemsTable
            initialLines={extracted.lineItems}
            products={products}
            header={{
              supplierId: headerForm.isNewSupplier
                ? null
                : headerForm.supplierId,
              supplierName: headerForm.isNewSupplier
                ? headerForm.newSupplierName
                : (suppliers.find((s) => s.id === headerForm.supplierId)
                    ?.name ?? ""),
              invoiceNumber: headerForm.invoiceNumber,
              invoiceTotal:
                headerForm.invoiceTotal.trim() === ""
                  ? null
                  : parseFloat(headerForm.invoiceTotal) || 0,
              invoiceFileName: fileName,
            }}
            onBack={() => setStep("header")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
