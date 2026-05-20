"use client";

import { useState } from "react";
import { ExternalLink, Mail, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 9.1 Take Action — reorder panel.
 * Per spec: per-item Reorder button (opens supplier website in new tab when
 * supplier URL is configured) and Send Order Email button (mailto with item
 * name, current stock, suggested reorder quantity). Manager reviews and sends
 * from their email client.
 */

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  unit: string;
  supplierName: string;
  supplierUrl?: string;
  supplierEmail?: string;
}

const LOW_STOCK: LowStockItem[] = [
  {
    id: "inv-shampoo",
    name: "Doggieville Pro Wash Shampoo",
    currentStock: 4,
    threshold: 10,
    suggestedQty: 24,
    unit: "bottles",
    supplierName: "PetPro Supplies",
    supplierUrl: "https://petpro.example.com/orders/shampoo",
    supplierEmail: "orders@petpro.example.com",
  },
  {
    id: "inv-conditioner",
    name: "Doggieville Conditioner",
    currentStock: 6,
    threshold: 10,
    suggestedQty: 18,
    unit: "bottles",
    supplierName: "PetPro Supplies",
    supplierUrl: "https://petpro.example.com/orders/conditioner",
    supplierEmail: "orders@petpro.example.com",
  },
  {
    id: "inv-gauze",
    name: "Sterile Gauze Pads 4×4",
    currentStock: 12,
    threshold: 30,
    suggestedQty: 50,
    unit: "boxes",
    supplierName: "Vet Supplies Plus",
    supplierEmail: "orders@vetsupplies.example.com",
  },
  {
    id: "inv-ear",
    name: "Ear Cleaning Solution",
    currentStock: 3,
    threshold: 8,
    suggestedQty: 12,
    unit: "bottles",
    supplierName: "Animal Care Direct",
    supplierUrl: "https://animalcare.example.com/ear-clean",
  },
];

function buildMailto(item: LowStockItem): string {
  if (!item.supplierEmail) return "";
  const subject = `Reorder: ${item.name}`;
  const body = [
    `Hi ${item.supplierName} team,`,
    "",
    "Please place a reorder for the following item:",
    "",
    `Item: ${item.name}`,
    `Current stock: ${item.currentStock} ${item.unit}`,
    `Suggested quantity: ${item.suggestedQty} ${item.unit}`,
    "",
    "Thanks,",
    "Doggieville MTL",
  ].join("\n");
  return `mailto:${item.supplierEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function ReorderPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const markActioned = (id: string) => {
    setActioned((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <Package className="size-3.5" />
          {LOW_STOCK.length} items below reorder threshold
        </div>
        <p className="text-muted-foreground text-xs">
          Click <b>Reorder</b> to open the supplier site, or{" "}
          <b>Send Order Email</b> to draft a message in your mail client.
        </p>
      </div>

      <ul className="space-y-3">
        {LOW_STOCK.map((item) => {
          const isActioned = actioned.has(item.id);
          const mailto = buildMailto(item);

          return (
            <li
              key={item.id}
              className="space-y-2 rounded-lg border p-3"
              data-actioned={isActioned}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    {isActioned && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        <Check className="size-3" />
                        Ordered
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Supplier: <span className="font-medium">{item.supplierName}</span>
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p>
                    <span className="text-muted-foreground">In stock: </span>
                    <span className="font-semibold text-red-600">
                      {item.currentStock} {item.unit}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Threshold: </span>
                    <span className="font-medium">
                      {item.threshold} {item.unit}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Suggested: </span>
                    <span className="font-semibold">
                      {item.suggestedQty} {item.unit}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-2">
                {item.supplierUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    asChild
                    onClick={() => markActioned(item.id)}
                  >
                    <a
                      href={item.supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 size-3.5" />
                      Reorder
                    </a>
                  </Button>
                )}
                {item.supplierEmail && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    asChild
                    onClick={() => markActioned(item.id)}
                  >
                    <a href={mailto}>
                      <Mail className="mr-1 size-3.5" />
                      Send Order Email
                    </a>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel={
            actioned.size === LOW_STOCK.length
              ? "Mark all reordered"
              : `Mark ${actioned.size}/${LOW_STOCK.length} reordered`
          }
          onPrimary={() => onComplete()}
          primaryDisabled={actioned.size === 0}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
