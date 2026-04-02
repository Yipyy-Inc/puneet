"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { BarcodeDisplay } from "@/components/retail/BarcodeDisplay";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";

interface BarcodeLabelPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  productName: string;
  price: number;
}

const LABEL_SIZES = [
  { value: "standard", label: 'Standard (2" × 1")', width: 192, height: 96 },
  { value: "small", label: 'Small (1.5" × 0.75")', width: 144, height: 72 },
  { value: "large", label: 'Large (3" × 1.5")', width: 288, height: 144 },
];

export function BarcodeLabelPrint({
  open,
  onOpenChange,
  barcode,
  productName,
  price,
}: BarcodeLabelPrintProps) {
  const [labelSize, setLabelSize] = useState("standard");
  const [quantity, setQuantity] = useState(1);

  const size = LABEL_SIZES.find((s) => s.value === labelSize) ?? LABEL_SIZES[0];

  const handlePrint = () => {
    const facility = facilities.find((f) => f.id === 11);
    const w = window.open("", "_blank", "width=500,height=400");
    if (!w) return;

    const labels = Array.from({ length: quantity })
      .map(
        () => `
      <div class="label" style="width:${size.width}px;height:${size.height}px;border:1px dashed #ccc;padding:8px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:4px;page-break-inside:avoid">
        <svg viewBox="0 0 120 40" width="${size.width * 0.7}" height="${size.height * 0.3}">
          ${Array.from({ length: 40 })
            .map((_, i) => {
              const v = barcode.charCodeAt(i % barcode.length) + i * 3;
              const bw = ((v >> (i % 4)) & 1) + 1;
              return i % 2 === 0
                ? `<rect x="${i * 3}" y="0" width="${bw}" height="40" fill="black"/>`
                : "";
            })
            .join("")}
        </svg>
        <p style="font-family:monospace;font-size:${size.value === "small" ? 8 : 10}px;margin:2px 0 0">${barcode}</p>
        <p style="font-size:${size.value === "small" ? 7 : 9}px;margin:1px 0 0;text-align:center;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${productName}</p>
        <p style="font-weight:bold;font-size:${size.value === "small" ? 9 : 11}px;margin:1px 0 0">$${price.toFixed(2)}</p>
      </div>
    `,
      )
      .join("");

    w.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
<style>
body{font-family:-apple-system,sans-serif;padding:20px;margin:0}
.labels{display:flex;flex-wrap:wrap;gap:0}
@media print{body{padding:0}.label{border:none !important;margin:2px !important}}
</style></head><body>
<div class="labels">${labels}</div>
<script>window.print()</script>
</body></html>`);
    w.document.close();
    toast.success(
      `${quantity} label${quantity !== 1 ? "s" : ""} sent to printer`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Print Barcode Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preview */}
          <div className="flex flex-col items-center rounded-xl border bg-white p-5">
            <BarcodeDisplay code={barcode} width={180} height={50} />
            <p className="mt-2 max-w-[180px] truncate text-center text-xs font-medium">
              {productName}
            </p>
            <p className="font-[tabular-nums] text-sm font-bold">
              ${price.toFixed(2)}
            </p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Label Size</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="text-xs"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4" />
            Print {quantity} Label{quantity !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
