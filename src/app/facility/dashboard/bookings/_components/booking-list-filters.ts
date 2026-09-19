import type { FilterDef } from "@/components/ui/DataTable";
import { serviceTypeLabel, statusLabel } from "@/lib/i18n/labels";
import type { AppLocale } from "@/lib/language-settings";
import {
  bookingPaymentStatusEnum,
  bookingStatusEnum,
  serviceTypeEnum,
} from "@/types/base";

/**
 * The list's filters, from the enums the database holds — not from lists
 * typed here. The status filter offered four of the twelve statuses, so a
 * request, the waiting list, a guest checked in or a no-show could not be
 * filtered for; the service filter offered "vet" and no training or custom
 * service; the payment filter offered "pending" and "refunded", which no
 * booking has, so choosing either emptied the table.
 */
export function bookingListFilters(input: {
  t: (key: string) => string;
  locale: AppLocale;
  tags: ReadonlyArray<{ id: string; name: string }>;
  tagsOf: (bookingId: number) => ReadonlyArray<{ id: string }>;
  showMoney: boolean;
}): FilterDef[] {
  const { t, locale } = input;
  return [
    {
      key: "status",
      label: t("filterStatus"),
      options: [
        { value: "all", label: t("filterAllStatuses") },
        ...bookingStatusEnum.options.map((id) => ({
          value: id,
          label: statusLabel(locale, id),
        })),
      ],
    },
    {
      key: "service",
      label: t("service"),
      options: [
        { value: "all", label: t("filterAllServices") },
        ...serviceTypeEnum.options.map((id) => ({
          value: id,
          label: serviceTypeLabel(locale, id),
        })),
      ],
    },
    ...(input.showMoney
      ? [
          {
            key: "paymentStatus",
            label: t("filterPayment"),
            options: [
              { value: "all", label: t("filterAllPayments") },
              ...bookingPaymentStatusEnum.options.map((id) => ({
                value: id,
                label: statusLabel(locale, id),
              })),
            ],
          },
        ]
      : []),
    {
      key: "tag",
      label: t("filterTag"),
      options: [
        { value: "all", label: t("filterAllTags") },
        ...input.tags.map((tag) => ({ value: tag.id, label: tag.name })),
      ],
      // A tag lives on an assignment, not on the booking row, so the lookup is
      // the comparison (the server applies it too when paging).
      filterFn: (item: { id?: unknown }, value: string) =>
        input.tagsOf(Number(item.id)).some((tag) => tag.id === value),
    },
  ];
}
