"use client";

import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { AddOn } from "@/types/add-on";

/**
 * One add-on in the list: its colour, name, price and minutes, whether it
 * needs a staff member, and the reference's three actions. The menu button is
 * always there — a row action revealed on hover does not exist for the two
 * contexts with no hover (§6 rule 11).
 */
export function AddOnRow({
  addOn,
  t,
  locale,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  addOn: AddOn;
  t: (key: string) => string;
  locale: AppLocale;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const meta = [
    formatMoney(addOn.price, locale),
    addOn.durationMin > 0
      ? t("minutes").replace("{n}", String(addOn.durationMin))
      : null,
    addOn.requiresStaff ? t("needsStaff") : null,
  ].filter((part): part is string => part !== null);

  return (
    <li className="bg-card flex min-h-14 items-center gap-3 rounded-lg border border-(--line) px-3 py-2 max-lg:min-h-16">
      {/* The calendar colour, as the calendar will show it. A mark, never
          the only way anything is said. */}
      <span
        className="size-3 shrink-0 rounded-full border border-(--line-strong)"
        style={
          addOn.colorCode ? { backgroundColor: addOn.colorCode } : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-[15px] font-semibold">
            {addOn.name}
          </span>
          {!addOn.isActive ? (
            <StatusBadge type="status" value="inactive" />
          ) : null}
        </div>
        <p className="text-[13.5px] text-(--ink-secondary) tabular-nums">
          {meta.join(" · ")}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("rowActions").replace("{name}", addOn.name)}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" aria-hidden />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="size-4" aria-hidden />
            {t("duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
