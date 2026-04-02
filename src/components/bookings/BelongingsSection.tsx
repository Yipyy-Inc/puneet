"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Backpack, CheckCircle2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BelongingEntry } from "@/types/booking";

interface BelongingsSectionProps {
  entries: BelongingEntry[];
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const conditionStyles: Record<string, string> = {
  Good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Worn: "bg-amber-50 text-amber-700 border-amber-200",
  Damaged: "bg-red-50 text-red-700 border-red-200",
  Sealed: "bg-blue-50 text-blue-700 border-blue-200",
  Used: "bg-slate-50 text-slate-700 border-slate-200",
};

export function BelongingsSection({ entries }: BelongingsSectionProps) {
  const [items, setItems] = useState(entries);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const totalItems = items.length;
  const returnedCount = items.filter((i) => i.returned).length;

  const handleReturn = (id: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              returned: checked,
              returnedAt: checked ? new Date().toISOString() : undefined,
              returnedBy: checked ? "You" : undefined,
            }
          : e,
      ),
    );
    if (checked) toast.success("Item marked as returned");
  };

  if (items.length === 0) return null;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <Backpack className="size-3.5" />
              Belongings
            </CardTitle>
            <span className="text-muted-foreground text-[11px]">
              {returnedCount} of {totalItems} returned
            </span>
          </div>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 py-4 transition-opacity first:pt-4",
                item.returned && "opacity-50",
              )}
            >
              {/* Photo thumbnail */}
              {item.photoUrl ? (
                <button
                  onClick={() => setLightboxUrl(item.photoUrl!)}
                  className="group relative shrink-0 overflow-hidden rounded-lg"
                >
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="size-16 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <ImageIcon className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              ) : (
                <div className="bg-muted/50 flex size-16 shrink-0 items-center justify-center rounded-lg">
                  <Backpack className="text-muted-foreground/30 size-6" />
                </div>
              )}

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      item.returned && "line-through",
                    )}
                  >
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0 text-[9px] font-semibold",
                      conditionStyles[item.condition] ?? conditionStyles.Good,
                    )}
                  >
                    {item.condition}
                  </span>
                </div>
                {item.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {item.description}
                  </p>
                )}
                {item.checkedInBy && (
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Checked in by {item.checkedInBy}
                    {item.checkedInAt && ` · ${fmtTimestamp(item.checkedInAt)}`}
                  </p>
                )}
                {item.returned && item.returnedBy && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    Returned by {item.returnedBy}
                    {item.returnedAt && ` · ${fmtTimestamp(item.returnedAt)}`}
                  </p>
                )}
              </div>

              {/* Return checkbox */}
              <div className="flex shrink-0 items-center gap-1.5 pt-1">
                <Checkbox
                  id={`return-${item.id}`}
                  checked={item.returned}
                  onCheckedChange={(c) => handleReturn(item.id, c === true)}
                />
                <label
                  htmlFor={`return-${item.id}`}
                  className="text-muted-foreground cursor-pointer text-[11px]"
                >
                  Returned
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-lg p-2" showCloseButton>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Belonging photo"
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
