"use client";

import { ExternalLink, Landmark, Package } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quickBooksCreateAccountUrl } from "@/lib/quickbooks/account-requirements";
import type { QuickBooksMapping } from "@/lib/quickbooks/mappings-store";
import type { MappableItem } from "@/lib/quickbooks/yipyy-catalog";
import type { QuickBooksAccount, QuickBooksItem } from "@/types/quickbooks";

// One row of the mapping screen: the Yipyy item on the left, the two
// QuickBooks choices on the right.

export function QuickBooksMappingCard({
  item,
  mapping,
  items,
  accounts,
  realmId,
  onChange,
}: {
  item: MappableItem;
  mapping: QuickBooksMapping | undefined;
  items: QuickBooksItem[];
  accounts: QuickBooksAccount[];
  realmId?: string;
  onChange: (patch: QuickBooksMapping) => void;
}) {
  // Money held for someone else must not be offered an income account — that
  // is exactly the mistake Tables 6 and 8 exist to prevent.
  const accountChoices = item.postsToLiability
    ? accounts.filter((a) => a.Classification === "Liability")
    : accounts.filter(
        (a) => a.Classification === "Revenue" || a.Classification === "Asset",
      );

  return (
    <div className="flex flex-col gap-3 border-b p-3 last:border-b-0 lg:flex-row lg:items-center">
      {/* ── Left: what Yipyy sells ─────────────────────────────────────── */}
      <div className="min-w-0 lg:w-2/5">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-muted-foreground text-xs">
          {item.type}
          {item.transactionCount !== undefined && (
            <>
              {" · "}
              {item.transactionCount}{" "}
              {item.transactionCount === 1 ? "sale" : "sales"}
            </>
          )}
        </p>
        {item.note && (
          <p className="text-muted-foreground mt-0.5 text-xs italic">
            {item.note}
          </p>
        )}
      </div>

      {/* ── Right: where it lands in QuickBooks ────────────────────────── */}
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Package className="size-3" />
            Product / Service
          </label>
          <Select
            value={mapping?.itemId ?? ""}
            onValueChange={(value) => onChange({ itemId: value })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Choose an item" />
            </SelectTrigger>
            <SelectContent>
              {items.map((qb) => (
                <SelectItem key={qb.Id} value={qb.Id} className="text-xs">
                  {qb.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Landmark className="size-3" />
            {item.postsToLiability ? "Liability account" : "Income account"}
          </label>
          <Select
            value={mapping?.accountId ?? ""}
            onValueChange={(value) => onChange({ accountId: value })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Choose an account" />
            </SelectTrigger>
            <SelectContent>
              {accountChoices.map((account) => (
                <SelectItem
                  key={account.Id}
                  value={account.Id}
                  className="text-xs"
                >
                  {account.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <a
        href={quickBooksCreateAccountUrl(realmId)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[11px] underline underline-offset-4"
      >
        Create new
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
