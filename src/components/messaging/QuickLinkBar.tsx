"use client";

import {
  CalendarPlus,
  FileText,
  ClipboardList,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickLinkAction {
  id: "booking" | "waiver" | "intake" | "payment" | "appointment";
  label: string;
  icon: typeof CalendarPlus;
  tone: string;
  buildSnippet: (ctx: QuickLinkContext) => string;
}

export interface QuickLinkContext {
  clientName?: string;
  clientFirstName?: string;
  petName?: string;
  upcomingBookingSummary?: string | null;
  bookingId?: string | number | null;
  facilitySlug?: string;
}

const SLUG = "doggieville.ca";

export const QUICK_LINK_ACTIONS: QuickLinkAction[] = [
  {
    id: "booking",
    label: "Booking link",
    icon: CalendarPlus,
    tone: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    buildSnippet: (ctx) =>
      `Hi ${ctx.clientFirstName ?? "there"}! Book your next visit here: https://${SLUG}/book?c=${encodeURIComponent(ctx.clientName ?? "")}`,
  },
  {
    id: "waiver",
    label: "Waiver",
    icon: FileText,
    tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    buildSnippet: (ctx) =>
      `Please sign the boarding waiver before drop-off: https://${SLUG}/forms/waiver?c=${encodeURIComponent(ctx.clientName ?? "")}`,
  },
  {
    id: "intake",
    label: "Intake form",
    icon: ClipboardList,
    tone: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    buildSnippet: (ctx) =>
      `Quick intake form for ${ctx.petName ?? "your pet"} (5 min): https://${SLUG}/forms/intake?c=${encodeURIComponent(ctx.clientName ?? "")}`,
  },
  {
    id: "payment",
    label: "Payment link",
    icon: CreditCard,
    tone: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    buildSnippet: (ctx) =>
      `Secure payment link: https://${SLUG}/pay?c=${encodeURIComponent(ctx.clientName ?? "")}`,
  },
  {
    id: "appointment",
    label: "Appointment",
    icon: CalendarClock,
    tone: "bg-pink-50 text-pink-700 hover:bg-pink-100",
    buildSnippet: (ctx) =>
      ctx.upcomingBookingSummary
        ? `Confirming your upcoming appointment: ${ctx.upcomingBookingSummary}. Manage it here: https://${SLUG}/bookings/${ctx.bookingId ?? ""}`
        : `Here's the link to view your bookings: https://${SLUG}/bookings`,
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
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/40 px-4 py-2">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Insert:
      </span>
      {QUICK_LINK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onInsert(action.buildSnippet(context))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
              action.tone,
            )}
          >
            <Icon className="size-3" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
