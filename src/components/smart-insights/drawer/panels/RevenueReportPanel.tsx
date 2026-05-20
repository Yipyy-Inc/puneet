"use client";

import { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.6 Take Action — surface open / unpaid invoices for the affected
 * period so the manager can reconcile.
 */

interface OpenInvoice {
  id: string;
  date: string;
  client: string;
  petName: string;
  amount: number;
  status: "open" | "unpaid" | "uncollected_deposit";
  reason: string;
}

const INVOICES: OpenInvoice[] = [
  { id: "INV-9821", date: "May 14", client: "Sandra Beaulieu", petName: "Rocky", amount: 285, status: "open", reason: "Check-out not closed" },
  { id: "INV-9824", date: "May 15", client: "Tomás García", petName: "Luna", amount: 165, status: "unpaid", reason: "Card declined" },
  { id: "INV-9830", date: "May 16", client: "Ines Lemay", petName: "Charlie", amount: 420, status: "open", reason: "Late pickup, fee pending" },
  { id: "INV-9835", date: "May 17", client: "Daniel Brodeur", petName: "Nala", amount: 95, status: "unpaid", reason: "Awaiting bank transfer" },
  { id: "INV-9841", date: "May 18", client: "Olivia Frenette", petName: "Mochi", amount: 540, status: "open", reason: "Boarding extension not invoiced" },
  { id: "INV-9847", date: "May 19", client: "Hugo St-Pierre", petName: "Zoey", amount: 215, status: "uncollected_deposit", reason: "Deposit not collected" },
  { id: "INV-9853", date: "May 19", client: "Jordan Mills", petName: "Coco", amount: 180, status: "open", reason: "Add-on not billed" },
];

const TOTAL = INVOICES.reduce((s, i) => s + i.amount, 0);

const STATUS_STYLE: Record<OpenInvoice["status"], string> = {
  open: "border-amber-300 bg-amber-50 text-amber-900",
  unpaid: "border-red-300 bg-red-50 text-red-900",
  uncollected_deposit: "border-blue-300 bg-blue-50 text-blue-900",
};

const STATUS_LABEL: Record<OpenInvoice["status"], string> = {
  open: "Open",
  unpaid: "Unpaid",
  uncollected_deposit: "No deposit",
};

export function RevenueReportPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [reconciled, setReconciled] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setReconciled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <FileText className="size-3.5" />
          Open invoices · past 7 days
        </div>
        <p>
          <span className="font-semibold">{INVOICES.length}</span> invoices ·
          gap from rolling avg:{" "}
          <span className="font-semibold text-red-700">${TOTAL.toLocaleString()}</span>
        </p>
      </div>

      <ul className="space-y-2">
        {INVOICES.map((inv) => {
          const isReconciled = reconciled.has(inv.id);
          return (
            <li
              key={inv.id}
              data-reconciled={isReconciled}
              className="flex items-start gap-3 rounded-md border p-3 data-[reconciled=true]:opacity-60"
            >
              <Checkbox
                id={`inv-${inv.id}`}
                checked={isReconciled}
                onCheckedChange={() => toggle(inv.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Receipt className="text-muted-foreground size-3.5" />
                  <span className="text-sm font-semibold">{inv.id}</span>
                  <Badge variant="outline" className={STATUS_STYLE[inv.status]}>
                    {STATUS_LABEL[inv.status]}
                  </Badge>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {inv.date}
                  </span>
                </div>
                <p className="text-sm">
                  {inv.client} · {inv.petName} ·{" "}
                  <span className="font-semibold">${inv.amount}</span>
                </p>
                <p className="text-muted-foreground text-xs">{inv.reason}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel={`Mark ${reconciled.size}/${INVOICES.length} reconciled`}
          onPrimary={() => onComplete()}
          primaryDisabled={reconciled.size === 0}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
