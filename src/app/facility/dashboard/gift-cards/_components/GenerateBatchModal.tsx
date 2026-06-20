"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Cpu,
  FileDown,
  Loader2,
  Package,
  Upload,
} from "lucide-react";
import type { PhysicalCardBatch } from "@/types/payments";

/** How the card numbers for this batch are sourced. */
export type BatchSourceMethod = "system" | "import";

export interface GenerateBatchConfig {
  name: string;
  quantity: number;
  /** undefined = open value (staff sets amount at activation). */
  denomination?: number;
  source: BatchSourceMethod;
}

interface GenerateBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Builds the batch and returns it (page owns the session-state mutation). */
  onGenerate: (config: GenerateBatchConfig) => Promise<PhysicalCardBatch>;
  /** Reuses the page's CSV export so the success screen can offer a download. */
  onExport?: (batch: PhysicalCardBatch) => void;
}

const STEPS = ["Configure", "Source", "Review"];
const QUICK_AMOUNTS = ["25", "50", "100"];

const SOURCE_LABEL: Record<BatchSourceMethod, string> = {
  system: "System-generated numbers",
  import: "Import from printer (CSV)",
};

export function GenerateBatchModal({
  open,
  onOpenChange,
  onGenerate,
  onExport,
}: GenerateBatchModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [mode, setMode] = useState<"open" | "fixed">("fixed");
  const [amount, setAmount] = useState("25");
  const [source, setSource] = useState<BatchSourceMethod>("system");
  const [generating, setGenerating] = useState(false);
  const [created, setCreated] = useState<PhysicalCardBatch | null>(null);

  const qty = parseInt(quantity) || 0;
  const amountValue = parseFloat(amount) || 0;
  const denomination = mode === "open" ? undefined : amountValue;
  const step1Valid = qty > 0 && (mode === "open" || amountValue > 0);

  const resolvedName = name.trim() || "New Batch";

  const reset = () => {
    setStep(0);
    setName("");
    setQuantity("100");
    setMode("fixed");
    setAmount("25");
    setSource("system");
    setCreated(null);
    setGenerating(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (generating) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const batch = await onGenerate({
      name: resolvedName,
      quantity: qty,
      denomination,
      source,
    });
    setCreated(batch);
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Batch</DialogTitle>
          <DialogDescription>
            Create a batch of blank physical cards for your print vendor.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper — once created, every step reads as done. */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = created ? true : i < step;
            const active = !created && i === step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  data-active={active}
                  data-done={done}
                  className="text-muted-foreground data-[active=true]:text-foreground data-[done=true]:text-foreground flex items-center gap-1.5 text-xs font-medium"
                >
                  <span
                    data-active={active}
                    data-done={done}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground flex size-5 items-center justify-center rounded-full border text-[11px] data-[done=true]:border-emerald-600 data-[done=true]:bg-emerald-600 data-[done=true]:text-white"
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="bg-border h-px flex-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Configure */}
        {step === 0 && !created && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gen-name">Batch name</Label>
              <Input
                id="gen-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer 2026 Physical Cards"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gen-qty">Quantity</Label>
              <Input
                id="gen-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                How many physical cards do you need?
              </p>
            </div>

            <div className="space-y-2">
              <Label>Denomination</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as "open" | "fixed")}
              >
                <label
                  htmlFor="denom-open"
                  data-active={mode === "open"}
                  className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                >
                  <RadioGroupItem
                    value="open"
                    id="denom-open"
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Open Value</p>
                    <p className="text-muted-foreground text-xs">
                      Staff sets the amount at activation time.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="denom-fixed"
                  data-active={mode === "fixed"}
                  className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                >
                  <RadioGroupItem
                    value="fixed"
                    id="denom-fixed"
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Fixed Amount</p>
                      <p className="text-muted-foreground text-xs">
                        All cards in this batch are pre-loaded at this value —
                        useful for pre-printed cards sold at a set price.
                      </p>
                    </div>
                    {mode === "fixed" && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_AMOUNTS.map((a) => (
                            <Button
                              key={a}
                              type="button"
                              size="sm"
                              variant={amount === a ? "default" : "outline"}
                              onClick={() => setAmount(a)}
                            >
                              ${a}
                            </Button>
                          ))}
                        </div>
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="pl-7"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Custom amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2 — Source method */}
        {step === 1 && !created && (
          <div className="space-y-2">
            <Label>How are card numbers sourced?</Label>
            <RadioGroup
              value={source}
              onValueChange={(v) => setSource(v as BatchSourceMethod)}
            >
              <label
                htmlFor="src-system"
                data-active={source === "system"}
                className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
              >
                <RadioGroupItem
                  value="system"
                  id="src-system"
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Cpu className="size-3.5" />
                    System-Generated Numbers
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Yipyy assigns sequential card numbers now. Cards are ready
                    immediately — download the CSV to send to your printer.
                  </p>
                </div>
              </label>

              <label
                htmlFor="src-import"
                data-active={source === "import"}
                className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
              >
                <RadioGroupItem
                  value="import"
                  id="src-import"
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Upload className="size-3.5" />
                    Import from Printer (CSV)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Your printer provides the numbers. The batch is created
                    awaiting import — upload their CSV from the Inventory tab to
                    activate the cards.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        {/* Step 3 — Review & Create */}
        {step === 2 && !created && (
          <div className="space-y-3">
            <div className="bg-muted/30 rounded-lg border p-4">
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Batch name</dt>
                  <dd className="font-medium">{resolvedName}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-medium">{qty.toLocaleString()} cards</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Denomination</dt>
                  <dd className="font-medium">
                    {denomination != null
                      ? `Fixed $${denomination.toFixed(2)}`
                      : "Open (any value)"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Source method</dt>
                  <dd className="font-medium">{SOURCE_LABEL[source]}</dd>
                </div>
                {denomination != null && (
                  <div className="flex items-center justify-between border-t pt-2.5">
                    <dt className="text-muted-foreground">Potential value</dt>
                    <dd className="font-semibold">
                      ${(qty * denomination).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <Package className="mt-0.5 size-3.5 shrink-0" />
              {source === "system"
                ? "Card numbers are auto-assigned and sequential (e.g. PHYS-9001-9001-N). Each card starts inactive until activated at sale."
                : "The batch will be created awaiting import. Upload the printer's CSV from the Inventory tab to activate these cards."}
            </p>
          </div>
        )}

        {/* Success */}
        {created && (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <div className="space-y-1">
              <p className="font-medium">Batch created</p>
              <p className="text-muted-foreground text-sm">
                {created.totalCards.toLocaleString()} cards added to{" "}
                <span className="text-foreground font-medium">
                  {created.name}
                </span>
                .
              </p>
            </div>
            {created.importedAt ? (
              onExport && (
                <Button
                  className="w-full gap-1.5"
                  onClick={() => onExport(created)}
                >
                  <FileDown className="size-4" />
                  Download Card Numbers (CSV)
                </Button>
              )
            ) : (
              <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Upload className="mt-0.5 size-3.5 shrink-0" />
                Awaiting import. Open the batch in the Inventory tab and upload
                the printer&apos;s CSV to activate the cards.
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Now visible in the{" "}
              <span className="text-foreground font-medium">Inventory</span>{" "}
              tab.
            </p>
          </div>
        )}

        <DialogFooter>
          {created ? (
            <Button
              className={cn("w-full")}
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          ) : step === 0 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(1)} disabled={!step1Valid}>
                Continue
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={generating}
              >
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Batch"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
