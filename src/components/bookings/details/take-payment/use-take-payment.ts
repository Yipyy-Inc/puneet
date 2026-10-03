"use client";

import { useCallback, useRef, useState } from "react";

import type { CloverCardFieldsHandle } from "@/components/payments/clover-card-fields";
import { useApplyPromoCode, PromoCodeRefused } from "@/lib/api/promo-codes";
import { useRemoveLineItem } from "@/lib/api/booking-line-items";
import type {
  CheckoutLeg,
  CheckoutPayment,
  CheckoutResult,
} from "@/lib/checkout/checkout-payment";
import type { PaymentMethod } from "@/lib/invoice-lifecycle";
import { formatMoney } from "@/lib/i18n/format";
import {
  carriesTip,
  submitWording,
  tillBlock,
  workOutTill,
  type PayMethod,
  type TillFigures,
} from "@/lib/payments/take-payment-math";
import { activeTipTier } from "@/lib/tips";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { useMarkTransferPending } from "./use-pending-transfers";
import {
  useReaderStates,
  useTillData,
  type TakePaymentProps,
} from "./use-till-data";

// ============================================================================
// The Take payment dialog's state — the client's mock (2026-10-03), wired to
// the checkout the booking page and the board already trust.
//
// Every figure comes from `workOutTill` (lib/payments/take-payment-math),
// which is unit-tested; this hook only holds what staff chose and turns it
// into the `CheckoutPayment` the caller awaits. One press takes the money:
// the old dialog's second "confirm" press is gone, as the mock has none —
// what stops a wrong payment now is the summary above the button and a button
// that says exactly what it will do ("Charge $377.70").
// ============================================================================

const TENDER: Record<PayMethod, PaymentMethod> = {
  card: "card_on_file",
  terminal: "terminal",
  cash: "cash",
  gift: "gift_card",
  etransfer: "e_transfer",
};

const cents = (dollars: number) => Math.round(dollars * 100);
const dollars = (value: number) => value / 100;
/** A typed figure in cents, or null for an empty or unreadable field. */
function typedCents(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100)
    : null;
}

export type TipChoice = "none" | "custom" | number;

export interface DoneState {
  result: CheckoutResult;
  pending: boolean;
  /** What each leg took, for the done screen. */
  lines: { label: string; cents: number }[];
  creditCents: number;
  remainingCents: number;
  receipt:
    | { kind: "none" }
    | { kind: "sent"; channels: ("email" | "sms")[] }
    | { kind: "failed"; detail: string };
}

export function useTakePayment(props: TakePaymentProps) {
  const data = useTillData(props);
  const { t, fill, locale } = useStaffText("takePayment");
  const applyPromo = useApplyPromoCode();
  const removeLine = useRemoveLineItem();
  const markPending = useMarkTransferPending(props.booking.id);
  const cardFields = useRef<CloverCardFieldsHandle | null>(null);
  // Handed to the hosted fields as a callback ref, so the state object the
  // screen renders from holds no ref.
  const setCardFields = useCallback((handle: CloverCardFieldsHandle | null) => {
    cardFields.current = handle;
  }, []);

  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  const [mode, setMode] = useState<"full" | "custom">("full");
  const [custom, setCustom] = useState("");
  const [useCredit, setUseCredit] = useState<boolean | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  // Null until somebody chooses: the tip the booking already carries.
  const [tipChoice, setTipChoice] = useState<TipChoice | null>(null);
  const [tipCustom, setTipCustom] = useState("");
  const [chosenMethod, setMethod] = useState<PayMethod | null>(null);
  const [chosenCard, setCard] = useState<string | null>(null);
  // Consent is asked, never assumed: unticked until somebody ticks it.
  const [saveCard, setSaveCard] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [cashGiven, setCashGiven] = useState("");
  const [changeAsCredit, setChangeAsCredit] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [gift, setGift] = useState<{ code: string; balance: number } | null>(
    null,
  );
  const [giftError, setGiftError] = useState("");
  const [split, setSplit] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");
  const [method2, setMethod2] = useState<PayMethod | null>(null);
  const [etRef, setEtRef] = useState("");
  const [etPending, setEtPending] = useState(true);
  const [note, setNote] = useState("");
  const [receiptEmail, setReceiptEmail] = useState(true);
  const [receiptSms, setReceiptSms] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);

  const money = (value: number) =>
    `${value < 0 ? "−" : ""}${formatMoney(Math.abs(dollars(value)), locale)}`;

  // ── Which methods, and which one ──────────────────────────────────────
  const methods = data.methods;
  const method =
    chosenMethod && methods.includes(chosenMethod)
      ? chosenMethod
      : (methods[0] ?? null);
  const cardId =
    chosenCard ?? data.cards[0]?.id ?? (data.newCardConfig ? "new" : null);

  // ── Credit ─────────────────────────────────────────────────────────────
  const creditAvailable = cents(data.creditAvailable);
  const askMode = data.creditMode === "ask";
  const creditUndecided = askMode && creditAvailable > 0 && useCredit === null;
  const creditOn = creditAvailable > 0 && (useCredit ?? !askMode);

  // ── The figures, twice: the tip is a share of what is being collected ──
  const giftCents = gift ? cents(gift.balance) : null;
  const first = workOutTill({
    supplyOwedCents: data.supplyOwedCents,
    taxFor: data.taxFor,
    mode,
    customCents: typedCents(custom),
    creditAvailableCents: creditAvailable,
    useCredit: creditOn,
    tipCents: 0,
    method,
    second: null,
  });
  const giftShort =
    method === "gift" && giftCents !== null && giftCents < first.dueCents;
  const twoMethods = (split && method !== "gift") || giftShort;
  const tipAllowed =
    data.showTip &&
    carriesTip(method) &&
    (!twoMethods || method2 === null || carriesTip(method2));

  const tier = activeTipTier(
    data.tipConfig,
    dollars(first.collect.subtotalCents),
  );
  const presetCents = (index: number) => {
    const option = tier.options[index];
    if (!option) return 0;
    return option.type === "percentage"
      ? Math.round((first.collect.subtotalCents * option.value) / 100)
      : cents(option.value);
  };
  const pledgedCents = cents(props.pledgedTip ?? 0);
  const tipCents = !tipAllowed
    ? 0
    : tipChoice === null
      ? pledgedCents
      : tipChoice === "none"
        ? 0
        : tipChoice === "custom"
          ? (typedCents(tipCustom) ?? 0)
          : presetCents(tipChoice);

  const figures: TillFigures = workOutTill({
    supplyOwedCents: data.supplyOwedCents,
    taxFor: data.taxFor,
    mode,
    customCents: typedCents(custom),
    creditAvailableCents: creditAvailable,
    useCredit: creditOn,
    tipCents,
    method,
    second: twoMethods
      ? {
          method: method2,
          firstCents: giftShort
            ? (giftCents ?? 0)
            : (typedCents(splitAmount) ?? 0),
        }
      : null,
  });

  const cashLeg = figures.legs.find((leg) => leg.method === "cash");
  const cashIsFirst = figures.legs[0]?.method === "cash";
  const givenCents = cashIsFirst ? typedCents(cashGiven) : null;
  const changeCents =
    cashLeg && givenCents !== null ? givenCents - cashLeg.totalCents : 0;
  const readerState = useReaderStates(
    props.booking.id,
    data.readers.map((reader) => reader.serial),
    method === "terminal" || method2 === "terminal",
  );
  const readerOnline = (serial: string | null) =>
    serial !== null && readerState(serial) === "online";
  const etPendingNow =
    method === "etransfer" && etPending && !twoMethods && figures.dueCents > 0;

  const block = tillBlock({
    figures,
    mode,
    creditUndecided,
    method,
    giftChecked: gift !== null,
    needsSecond: twoMethods,
    secondMethod: method2,
    cashGivenCents: givenCents,
    cardChosen: cardId !== null,
    cardReady: cardId !== "new" || cardReady,
    readerChosen: readerOnline(data.reader?.serial ?? null),
  });
  const wording = submitWording(figures, method);

  // ── Promo codes: lines on the bill, put on and taken off ───────────────
  const submitPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code || applyPromo.isPending) return;
    setPromoError("");
    applyPromo.mutate(
      { bookingRef: props.booking.id, code },
      {
        onSuccess: () => {
          setPromo("");
          setPromoOpen(false);
        },
        onError: (error) => {
          const reason =
            error instanceof PromoCodeRefused ? error.reason : null;
          const said = reason ? data.promoReason(reason) : "";
          setPromoError(
            said && said !== reason
              ? said
              : error instanceof Error
                ? error.message
                : t("promoNotApplied"),
          );
        },
      },
    );
  };
  const removePromo = (lineId: string) =>
    removeLine.mutate(
      { bookingRef: props.booking.id, id: lineId },
      {
        onError: (error) =>
          setPromoError(
            error instanceof Error ? error.message : t("promoNotRemoved"),
          ),
      },
    );

  const checkGift = async () => {
    const code = giftCode.trim();
    if (!code) return;
    setGiftError("");
    const found = await data.lookUpGiftCard(code);
    if (!found) {
      setGift(null);
      setGiftError(t("giftNotFound"));
      return;
    }
    if (found.effectiveStatus !== "active" || found.balance <= 0) {
      setGift(null);
      setGiftError(t("giftNotUsable"));
      return;
    }
    setGift({ code: found.code, balance: found.balance });
  };

  // ── Taking it ─────────────────────────────────────────────────────────
  const legLabel = (m: PayMethod) =>
    t(
      {
        card: "shortCard",
        terminal: "shortTerminal",
        cash: "shortCash",
        gift: "shortGift",
        etransfer: "shortETransfer",
      }[m],
    );

  const submit = async () => {
    if (block || stage !== "form") return;
    setProblem(null);
    setStage("processing");
    try {
      // A card typed now: tokenised (and kept, with consent) BEFORE any money
      // moves — Clover's token pays once, so saving comes first.
      const usesCard = figures.legs.some((leg) => leg.method === "card");
      let savedCardId = usesCard && cardId !== "new" ? cardId : null;
      let cardSource: string | null = null;
      if (usesCard && cardId === "new") {
        const token = await cardFields.current?.createToken();
        if (!token?.ok) throw new Error(token?.message ?? t("cardNotRead"));
        if (saveCard && props.clientRowId) {
          savedCardId = await data.saveCard(token.token);
        }
        if (!savedCardId) cardSource = token.token;
      }

      // An e-transfer still on its way is written down first; if it cannot
      // be, nothing else happens.
      const pendingLeg = etPendingNow
        ? figures.legs.find((leg) => leg.method === "etransfer")
        : undefined;
      if (pendingLeg) {
        await markPending.mutateAsync({
          total: dollars(pendingLeg.totalCents),
          subtotal: dollars(pendingLeg.subtotalCents),
          tax: dollars(pendingLeg.taxCents),
          reference: etRef,
        });
      }

      const legs = figures.legs.filter((leg) => leg !== pendingLeg);
      const parts: CheckoutLeg[] = [
        ...(figures.credit.usedCents > 0
          ? [
              {
                method: "store_credit" as const,
                subtotal: dollars(figures.credit.subtotalCents),
                tax: dollars(figures.credit.taxCents),
                tip: 0,
              },
            ]
          : []),
        ...legs.map((leg, index) => ({
          method: TENDER[leg.method],
          subtotal: dollars(leg.subtotalCents),
          tax: dollars(leg.taxCents),
          tip: dollars(leg.tipCents),
          ...(leg.method === "cash"
            ? {
                cashReceived: dollars(
                  index === 0 && givenCents !== null
                    ? givenCents
                    : leg.totalCents,
                ),
              }
            : {}),
        })),
      ];
      const paymentNote = [etRef.trim(), note.trim()]
        .filter(Boolean)
        .join(" · ");
      const payment: CheckoutPayment = {
        method: TENDER[method ?? "cash"],
        subtotal: dollars(figures.collect.subtotalCents),
        tax: dollars(figures.collect.taxCents),
        tip: dollars(figures.tipCents),
        amount: dollars(figures.collect.totalCents + figures.tipCents),
        parts,
        partial: figures.remainingCents > 0,
        changeAsCredit: changeCents > 0 && changeAsCredit,
        changeAmount: changeCents > 0 ? dollars(changeCents) : 0,
        ...(data.reader ? { deviceSerial: data.reader.serial } : {}),
        ...(savedCardId ? { savedCardId } : {}),
        ...(cardSource ? { cardSource } : {}),
        ...(gift ? { giftCardCode: gift.code } : {}),
        ...(paymentNote ? { note: paymentNote } : {}),
      };
      const result = await props.onConfirm(payment);

      const channels = [
        ...(receiptEmail ? (["email"] as const) : []),
        ...(receiptSms ? (["sms"] as const) : []),
      ];
      let receipt: DoneState["receipt"] = { kind: "none" };
      if (channels.length > 0 && result.taken > 0) {
        const sent = await data.sendReceipt(channels);
        receipt = sent.ok
          ? { kind: "sent", channels: sent.channels }
          : { kind: "failed", detail: sent.detail };
      }
      setDone({
        result,
        pending: Boolean(pendingLeg),
        lines: legs.map((leg) => ({
          label: legLabel(leg.method),
          cents: leg.totalCents,
        })),
        creditCents: figures.credit.usedCents,
        remainingCents:
          result.stillOwed !== undefined
            ? cents(result.stillOwed) + data.taxFor(cents(result.stillOwed))
            : figures.remainingCents,
        receipt,
      });
      setStage("done");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("notTaken"));
      setStage("form");
    }
  };

  /** Stop the reader asking. A card approved a moment earlier stays paid. */
  const stopReader = async () => {
    if (!data.reader) return;
    await fetch("/api/payments/clover/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        deviceSerial: data.reader.serial,
      }),
    }).catch(() => null);
  };

  return {
    props,
    data,
    t,
    fill,
    locale,
    money,
    stage,
    figures,
    block,
    wording,
    problem,
    done,
    setCardFields,
    amount: {
      mode,
      setMode,
      custom,
      setCustom,
    },
    credit: {
      available: creditAvailable,
      on: creditOn,
      undecided: creditUndecided,
      askMode,
      set: setUseCredit,
    },
    promo: {
      open: promoOpen,
      setOpen: setPromoOpen,
      code: promo,
      setCode: (value: string) => {
        setPromo(value);
        setPromoError("");
      },
      error: promoError,
      submit: submitPromo,
      applying: applyPromo.isPending,
      remove: removePromo,
      removing: removeLine.isPending,
    },
    tip: {
      shown: data.showTip,
      allowed: tipAllowed,
      choice: tipChoice,
      setChoice: setTipChoice,
      custom: tipCustom,
      setCustom: setTipCustom,
      tier,
      presetCents,
      pledgedCents,
      cents: tipCents,
    },
    pay: {
      methods,
      method,
      setMethod: (m: PayMethod) => {
        setMethod(m);
        setMethod2(null);
        if (m !== "gift") setGiftError("");
      },
      cardId,
      setCard,
      saveCard,
      setSaveCard,
      setCardReady,
      cashGiven,
      setCashGiven,
      givenCents,
      changeCents,
      cashLeg,
      changeAsCredit,
      setChangeAsCredit,
      giftCode,
      setGiftCode: (value: string) => {
        setGiftCode(value);
        setGift(null);
        setGiftError("");
      },
      gift,
      giftError,
      checkGift,
      giftShort,
      etRef,
      setEtRef,
      etPending,
      setEtPending,
      split,
      toggleSplit: () => {
        setSplit(!split);
        setMethod2(null);
        setSplitAmount(split ? "" : (dollars(first.dueCents) / 2).toFixed(2));
      },
      splitAmount,
      setSplitAmount,
      twoMethods,
      method2,
      setMethod2,
      legLabel,
    },
    receipt: {
      email: receiptEmail,
      setEmail: setReceiptEmail,
      sms: receiptSms,
      setSms: setReceiptSms,
    },
    note,
    setNote,
    submit,
    stopReader,
    etPendingNow,
    readerState,
  };
}

export type TakePayment = ReturnType<typeof useTakePayment>;
