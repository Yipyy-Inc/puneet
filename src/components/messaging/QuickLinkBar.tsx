"use client";

import {
  CalendarPlus,
  FileText,
  ClipboardList,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShellText } from "@/lib/shell/use-shell-text";

export interface QuickLinkAction {
  id: "booking" | "waiver" | "intake" | "payment" | "appointment";
  labelKey: string;
  icon: typeof CalendarPlus;
  tone: string;
  /**
   * The start of a message a person will edit and send, so it is written in
   * the language of the person writing it — the same rule as the missed-call
   * prefill. `t` is the messaging catalogue.
   */
  buildSnippet: (ctx: QuickLinkContext, t: (key: string) => string) => string;
}

export interface QuickLinkContext {
  clientName?: string;
  clientFirstName?: string;
  petName?: string;
  upcomingBookingSummary?: string | null;
  bookingId?: string | number | null;
  facilitySlug?: string;
}

const SLUG = "yipyy.com";

export const QUICK_LINK_ACTIONS: QuickLinkAction[] = [
  {
    id: "booking",
    labelKey: "qlBookingLink",
    icon: CalendarPlus,
    tone: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    buildSnippet: (ctx, t) =>
      t("qlBookingSnippet")
        .replace("{name}", ctx.clientFirstName ? ` ${ctx.clientFirstName}` : "")
        .replace(
          "{url}",
          `https://${SLUG}/book?c=${encodeURIComponent(ctx.clientName ?? "")}`,
        ),
  },
  {
    id: "waiver",
    labelKey: "qlWaiver",
    icon: FileText,
    tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    buildSnippet: (ctx, t) =>
      t("qlWaiverSnippet").replace(
        "{url}",
        `https://${SLUG}/forms/waiver?c=${encodeURIComponent(ctx.clientName ?? "")}`,
      ),
  },
  {
    id: "intake",
    labelKey: "qlIntakeForm",
    icon: ClipboardList,
    tone: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    buildSnippet: (ctx, t) =>
      t("qlIntakeSnippet")
        .replace("{pet}", ctx.petName ?? t("yourPet"))
        .replace(
          "{url}",
          `https://${SLUG}/forms/intake?c=${encodeURIComponent(ctx.clientName ?? "")}`,
        ),
  },
  {
    id: "payment",
    labelKey: "qlPaymentLink",
    icon: CreditCard,
    tone: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    buildSnippet: (ctx, t) =>
      t("qlPaymentSnippet").replace(
        "{url}",
        `https://${SLUG}/pay?c=${encodeURIComponent(ctx.clientName ?? "")}`,
      ),
  },
  {
    id: "appointment",
    labelKey: "qlAppointment",
    icon: CalendarClock,
    tone: "bg-pink-50 text-pink-700 hover:bg-pink-100",
    buildSnippet: (ctx, t) =>
      ctx.upcomingBookingSummary
        ? t("qlAppointmentSnippet")
            .replace("{summary}", ctx.upcomingBookingSummary)
            .replace("{url}", `https://${SLUG}/bookings/${ctx.bookingId ?? ""}`)
        : t("qlBookingsSnippet").replace("{url}", `https://${SLUG}/bookings`),
  },
];

export function QuickLinkBar({
  context,
  onInsert,
  disabled,
}: {
  context: QuickLinkContext;
  onInsert: (snippet: string) => void;
  disabled?: boolean;
}) {
  const t = useShellText("messaging");
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/40 px-4 py-2">
      <span className="mr-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {t("qlInsert")}
      </span>
      {QUICK_LINK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onInsert(action.buildSnippet(context, t))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
              action.tone,
            )}
          >
            <Icon className="size-3" />
            {t(action.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
