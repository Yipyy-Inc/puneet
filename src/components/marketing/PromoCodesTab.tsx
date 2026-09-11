"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Edit,
  Percent,
  Plus,
  Power,
  Tag,
  Ticket,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { PromoCodeModal } from "@/components/marketing/PromoCodeModal";
import {
  useDeletePromoCode,
  usePromoCodes,
  useSavePromoCode,
} from "@/lib/api/promo-codes";
import { formatDateLong, formatMoney, formatPercent } from "@/lib/i18n/format";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { MarketingPromoCode } from "@/types/marketing";

// ============================================================================
// Marketing → Promo Codes, on the facility's own codes (20260911173538).
//
// The tab was `promoCodes` from @/data/marketing: another facility's codes,
// an Edit button that opened an empty Create form, a Copy button that
// console.logged, and tiles summed from the fixture. The codes, their use
// counts and every tile come from `promo_codes` and its redemptions now; a
// code can be edited, switched off and deleted, and a deleted code keeps the
// history of its uses.
// ============================================================================

export function PromoCodesTab() {
  const { t, fill, locale } = useStaffText("promoCodes");
  const { data, isPending } = usePromoCodes();
  const codes = data ?? NO_ITEMS;
  const save = useSavePromoCode();
  const remove = useDeletePromoCode();
  const [editing, setEditing] = useState<MarketingPromoCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MarketingPromoCode | null>(null);

  const valueOf = (c: MarketingPromoCode) =>
    c.type === "percentage"
      ? fill("percentOff", { value: formatPercent(Number(c.value), locale) })
      : c.type === "fixed"
        ? fill("amountOff", { value: formatMoney(Number(c.value), locale) })
        : fill("freeNamed", { service: t(`service_${c.value}`) });

  const toggle = (c: MarketingPromoCode) =>
    save.mutate(
      { id: c.id, code: { isActive: !c.isActive } },
      {
        onSuccess: () =>
          toast.success(
            fill(c.isActive ? "switchedOff" : "switchedOn", { code: c.code }),
          ),
        onError: (error) =>
          toast.error(t("notSaved"), {
            description: error instanceof Error ? error.message : undefined,
          }),
      },
    );

  const columns: ColumnDef<MarketingPromoCode>[] = [
    {
      accessorKey: "code",
      header: t("colCode"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-mono font-semibold">{row.original.code}</div>
          {row.original.description && (
            <div className="text-muted-foreground text-sm">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("colDiscount"),
      cell: ({ row }) => (
        <span className="tabular-nums">{valueOf(row.original)}</span>
      ),
    },
    {
      accessorKey: "usedCount",
      header: t("colUsage"),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.usageLimit
            ? fill("usedOf", {
                used: row.original.usedCount,
                limit: row.original.usageLimit,
              })
            : fill("used", { used: row.original.usedCount })}
        </span>
      ),
    },
    {
      accessorKey: "validUntil",
      header: t("colValidUntil"),
      cell: ({ row }) =>
        row.original.validUntil
          ? formatDateLong(`${row.original.validUntil}T12:00:00`, locale)
          : t("noEnd"),
    },
    {
      accessorKey: "isActive",
      header: t("colStatus"),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? (
            <CheckCircle2 className="mr-1 size-3" />
          ) : (
            <Power className="mr-1 size-3" />
          )}
          {row.original.isActive ? t("active") : t("inactive")}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: t("colActions"),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={fill("editNamed", { code: row.original.code })}
            onClick={() => setEditing(row.original)}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={fill("copyNamed", { code: row.original.code })}
            onClick={() => {
              void navigator.clipboard
                .writeText(row.original.code)
                .then(() =>
                  toast.success(fill("copied", { code: row.original.code })),
                );
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={fill(
              row.original.isActive ? "switchOffNamed" : "switchOnNamed",
              { code: row.original.code },
            )}
            disabled={save.isPending}
            onClick={() => toggle(row.original)}
          >
            <Power className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={fill("deleteNamed", { code: row.original.code })}
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const active = codes.filter((c) => c.isActive);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label={t("tileTotal")}
          value={codes.length}
          hint={fill("tileTotalHint", { count: active.length })}
          icon={Ticket}
          tone="indigo"
        />
        <KpiTile
          label={t("tileUses")}
          value={codes.reduce((sum, c) => sum + c.usedCount, 0)}
          hint={t("tileUsesHint")}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label={t("tileActive")}
          value={active.length}
          hint={t("tileActiveHint")}
          icon={Zap}
          tone="amber"
        />
        <KpiTile
          label={t("tilePercent")}
          value={codes.filter((c) => c.type === "percentage").length}
          hint={t("tilePercentHint")}
          icon={Percent}
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Tag className="size-5" />
                {t("title")}
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 size-4" />
              {t("create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : codes.length === 0 ? (
            <TableEmptyState
              pose="presenting"
              title={t("emptyTitle")}
              description={t("emptyHint")}
              action={{
                label: t("create"),
                onClick: () => setCreating(true),
                icon: Plus,
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={codes as MarketingPromoCode[]}
              searchColumn="code"
              searchPlaceholder={t("search")}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <PromoCodeModal
            key={editing?.id ?? "new"}
            code={editing}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fill("deleteTitle", { code: deleting?.code ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("deleteBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("keep")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!deleting) return;
                const gone = deleting;
                remove.mutate(gone.id, {
                  onSuccess: () => {
                    toast.success(fill("deleted", { code: gone.code }));
                    setDeleting(null);
                  },
                  onError: (error) =>
                    toast.error(t("notDeleted"), {
                      description:
                        error instanceof Error ? error.message : undefined,
                    }),
                });
              }}
            >
              {fill("deleteNamed", { code: deleting?.code ?? "" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
