"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { giftCardQueries } from "@/lib/api/gift-cards";
import { savedCardKeys, useSavedCards } from "@/lib/api/saved-cards";
import { useClientStoreCredit } from "@/lib/api/store-credit";
import { terminalName, useResolvedTerminal } from "@/lib/api/terminals";
import type {
  CheckoutPayment,
  CheckoutResult,
  ReceiptDetailLine,
} from "@/lib/checkout/checkout-payment";
import type { PayMethod } from "@/lib/payments/take-payment-math";
import { taxableOwedForBooking } from "@/lib/payments/service-tax";
import { DEFAULT_DESK_TIP_SERVICES } from "@/lib/settings/checkout";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

// ============================================================================
// Everything the Take payment dialog READS, for whichever screen opened it —
// the booking page or the board's Check Out.
//
//   the client's cards   only the ones they consented to (`chargeable`)
//   a new card           Clover's hosted fields, when the facility is
//                        connected (checkout-config answers)
//   the readers          and whether each is awake, asked once per open with
//                        `checkOnly` — an offline reader cannot be chosen
//   account credit       the client's own account, not the facility's ledger
//   the facility's rules checkout_config (credit), tip_config (which
//                        services are asked for a tip), tax_config
//   the bill's promo     lines carrying a code — the chip and its ×
// ============================================================================

export interface TakePaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The booking being paid. Its `rowId` is what a card is charged against. */
  booking: Booking & { rowId?: string };
  clientName: string;
  clientRef: number;
  clientRowId: string | null;
  /** "Booking #94534 · Boarding" — the subtitle, before the client's name. */
  bookingLabel: string;
  /**
   * The pre-tax supply the till asks for: the ledger's balance, plus what the
   * checkout is about to write (a late fee, service charges). Never the price.
   */
  amountDue: number;
  loyaltyDiscount?: { label: string; amount: number };
  membershipDiscount?: { label: string; amount: number };
  /** The tip the booking carries that no payment has collected yet. */
  pledgedTip?: number;
  /** What the customer is charged FOR, for the printed receipt. */
  receiptLines: ReceiptDetailLine[];
  receiptServiceWindow?: string | null;
  /**
   * The dialog WAITS for this, and a throw keeps it open with the reason on
   * screen. Resolve only once the money has been recorded.
   */
  onConfirm: (payment: CheckoutPayment) => Promise<CheckoutResult>;
}

interface CheckoutConfigResponse {
  publicApiKey: string;
  merchantId: string;
  sdkUrl: string;
}

export function useTillData(props: TakePaymentProps) {
  const queryClient = useQueryClient();
  const { t: promoT } = useStaffText("promoCodes");
  const { settings, isPending: settingsPending } = useFacilitySettings();
  const taxConfig = settings.tax_config.value as TaxConfig;
  const tipConfig = settings.tip_config.value;
  const creditMode = settings.checkout_config.value.creditAtCheckout;
  const booking = props.booking;

  const { data: savedCards, isLoading: cardsLoading } = useSavedCards(
    props.clientRowId,
  );
  const cards = (savedCards ?? []).filter((card) => card.chargeable);
  const { data: newCardConfig, isLoading: configLoading } = useQuery({
    queryKey: ["clover", "checkout-config"],
    queryFn: async (): Promise<CheckoutConfigResponse | null> => {
      const response = await fetch("/api/payments/clover/checkout-config");
      if (!response.ok) return null;
      return (await response.json()) as CheckoutConfigResponse;
    },
    staleTime: 300_000,
  });
  const { data: credit, isLoading: creditLoading } = useClientStoreCredit(
    props.clientRef,
  );
  const creditAvailable =
    credit?.accounts.find((a) => a.clientRef === props.clientRef)?.balance ?? 0;

  const {
    terminals,
    chosen: reader,
    choose: chooseReader,
    isPending: readersPending,
  } = useResolvedTerminal();
  const usable = terminals.filter((terminal) => terminal.supported);

  const { data: lineItems, isLoading: linesLoading } = useQuery({
    queryKey: ["bookings", booking.id, "line-items"],
    queryFn: async (): Promise<BookingLineItem[]> => {
      const response = await fetch(`/api/bookings/${booking.id}/line-items`);
      if (!response.ok) throw new Error("Could not read the bill.");
      return (await response.json()) as BookingLineItem[];
    },
    staleTime: 30_000,
  });
  const promoLines = (lineItems ?? []).filter((line) => line.promoCode);

  // A card needs the booking's own row; a gift card and the ledger tenders
  // only its ref. The mock's order, the first one offered is the default.
  const methods: PayMethod[] = [
    ...(booking.rowId && (cards.length > 0 || newCardConfig)
      ? (["card"] as const)
      : []),
    ...(usable.length > 0 ? (["terminal"] as const) : []),
    "cash",
    "gift",
    "etransfer",
  ];

  const supplyOwedCents = Math.max(
    0,
    Math.round(props.amountDue * 100) -
      Math.round((props.loyaltyDiscount?.amount ?? 0) * 100) -
      Math.round((props.membershipDiscount?.amount ?? 0) * 100),
  );
  const taxFor = (supplyCents: number) =>
    taxConfig.pricesIncludeTax
      ? 0
      : computeTax(taxableOwedForBooking(booking, supplyCents), taxConfig)
          .totalCents;

  const deskServices = tipConfig.deskServices ?? [...DEFAULT_DESK_TIP_SERVICES];
  // The desk asks where the facility says it does; a tip the client already
  // pledged is theirs to give, so it is always shown.
  const showTip =
    (tipConfig.enabled &&
      deskServices.includes(String(booking.service).toLowerCase())) ||
    (props.pledgedTip ?? 0) > 0;

  // The figures and the defaults are decided by these: the credit applied,
  // the first method offered, the tax, the promo lines. Until they have
  // answered, the form would change under the cashier's hands — and a press
  // in that moment would take money on figures nobody meant.
  const ready =
    !settingsPending &&
    !cardsLoading &&
    !configLoading &&
    !creditLoading &&
    !readersPending &&
    !linesLoading;

  return {
    ready,
    methods,
    cards,
    newCardConfig: newCardConfig ?? null,
    creditAvailable,
    creditMode,
    supplyOwedCents,
    taxFor,
    taxConfig,
    tipConfig,
    showTip,
    promoLines,
    promoReason: (reason: string) => promoT(reason),
    readers: usable,
    reader,
    chooseReader,
    readerName: terminalName,
    lookUpGiftCard: (code: string) =>
      queryClient.fetchQuery(giftCardQueries.byCode(code)).catch(() => null),
    /** Keep a card typed now, with the client's consent. Null if it was not. */
    saveCard: async (token: string): Promise<string | null> => {
      const response = await fetch("/api/payments/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: token,
          clientId: props.clientRowId,
          consent: true,
        }),
      }).catch(() => null);
      const body = (await response?.json().catch(() => null)) as {
        card?: { id?: string };
      } | null;
      if (!response?.ok || !body?.card?.id) return null;
      void queryClient.invalidateQueries({
        queryKey: savedCardKeys.forClient(props.clientRowId),
      });
      return body.card.id;
    },
    /** The receipt the dialog's checkboxes asked for, by email and/or text. */
    sendReceipt: async (
      channels: readonly ("email" | "sms")[],
    ): Promise<
      | { ok: true; channels: ("email" | "sms")[] }
      | { ok: false; detail: string }
    > => {
      const response = await fetch(`/api/bookings/${booking.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      }).catch(() => null);
      const body = (await response?.json().catch(() => null)) as {
        error?: string;
        channels?: Partial<
          Record<"email" | "sms", { sent: boolean; detail?: string }>
        >;
      } | null;
      if (!response?.ok || !body?.channels) {
        return { ok: false, detail: body?.error ?? "" };
      }
      const sent = channels.filter((c) => body.channels?.[c]?.sent);
      const missed = channels.find((c) => !body.channels?.[c]?.sent);
      return missed
        ? { ok: false, detail: body.channels[missed]?.detail ?? "" }
        : { ok: true, channels: sent };
    },
  };
}

export type TillData = ReturnType<typeof useTillData>;

/**
 * Whether each reader is awake — asked only once a reader could be used, with
 * `checkOnly`, which charges nothing. A sleeping terminal can take its full
 * timeout to say so, which is why this does not run on every open.
 */
export function useReaderStates(
  bookingRef: number,
  serials: string[],
  enabled: boolean,
) {
  const probes = useQueries({
    queries: serials.map((serial) => ({
      queryKey: ["clover", "terminal-ready", serial] as const,
      queryFn: async (): Promise<boolean> => {
        const response = await fetch("/api/payments/clover/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingRef,
            deviceSerial: serial,
            checkOnly: true,
          }),
        });
        const body = (await response.json().catch(() => null)) as {
          ready?: boolean;
        } | null;
        return response.ok && body?.ready === true;
      },
      enabled,
      staleTime: 30_000,
      retry: false,
    })),
  });
  return (serial: string): "online" | "offline" | "checking" => {
    const probe = probes[serials.indexOf(serial)];
    if (!probe || probe.isPending) return "checking";
    return probe.data ? "online" : "offline";
  };
}
