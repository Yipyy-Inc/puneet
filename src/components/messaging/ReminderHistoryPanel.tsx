"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock3, Mail, Smartphone, Sparkles } from "lucide-react";
import { clientCommunications } from "@/data/communications";
import type { Message } from "@/types/communications";

export type ReminderTab = "conversation" | "reminders";

type ReminderChannel = "email" | "sms";
export type ReminderHistoryItem = {
  id: string;
  type: ReminderChannel;
  subject?: string;
  body: string;
  timestamp: string;
  status: Message["status"];
};

const REMINDER_KEYWORDS = [
  "reminder",
  "appointment",
  "vaccination",
  "expires",
  "expiry",
  "due",
  "pickup",
  "check-in",
  "check in",
  "check-out",
  "check out",
  "pre-arrival",
  "tomorrow",
];

function hasReminderKeywords(subject: string | undefined, body: string) {
  const content = `${subject ?? ""} ${body}`.toLowerCase();
  return REMINDER_KEYWORDS.some((keyword) => content.includes(keyword));
}

function isReminderMessage(message: Message, isCustomerMode: boolean) {
  if (message.type !== "email" && message.type !== "sms") return false;

  if (isCustomerMode) {
    return message.direction === "inbound";
  }

  if (message.direction !== "outbound") return false;
  return hasReminderKeywords(message.subject, message.body);
}

export function getReminderHistoryForCustomer({
  messages,
  counterpartyId,
  isCustomerMode,
}: {
  messages: Message[];
  counterpartyId?: number;
  isCustomerMode: boolean;
}): ReminderHistoryItem[] {
  if (!counterpartyId) return [];

  if (isCustomerMode) {
    return messages
      .filter(
        (message) =>
          message.clientId === counterpartyId &&
          message.type === "email" &&
          isReminderMessage(message, true),
      )
      .map((message) => ({
        id: message.id,
        type: "email" as const,
        subject: message.subject,
        body: message.body,
        timestamp: message.timestamp,
        status: message.status,
      }))
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }

  const threadReminderMessages: ReminderHistoryItem[] = messages
    .filter(
      (message) =>
        message.clientId === counterpartyId &&
        isReminderMessage(message, false),
    )
    .map((message) => {
      const channel: ReminderChannel =
        message.type === "email" ? "email" : "sms";

      return {
        id: message.id,
        type: channel,
        subject: message.subject,
        body: message.body,
        timestamp: message.timestamp,
        status: message.status,
      };
    });

  const historicalReminders: ReminderHistoryItem[] = clientCommunications
    .filter(
      (record) =>
        record.clientId === counterpartyId &&
        record.direction === "outbound" &&
        (record.type === "email" || record.type === "sms") &&
        hasReminderKeywords(record.subject, record.content),
    )
    .map((record) => {
      const channel: ReminderChannel =
        record.type === "email" ? "email" : "sms";

      return {
        id: record.id,
        type: channel,
        subject: record.subject,
        body: record.content,
        timestamp: record.timestamp,
        status: record.status ?? "sent",
      };
    });

  return [...threadReminderMessages, ...historicalReminders].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function formatReminderTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function reminderStatusLabel(status: Message["status"]) {
  if (status === "read") return "opened";
  return status;
}

function reminderStatusClass(status: Message["status"]) {
  if (status === "read") return "bg-emerald-100 text-emerald-700";
  if (status === "delivered") return "bg-blue-100 text-blue-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function ReminderColumn({
  title,
  icon: Icon,
  channel,
  items,
}: {
  title: string;
  icon: typeof Mail;
  channel: ReminderChannel;
  items: ReminderHistoryItem[];
}) {
  const titleTone =
    channel === "email"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.7)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", titleTone)}>
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" />
            {title}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-500">{items.length} sent</p>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-500">No {title.toLowerCase()} yet</p>
            <p className="mt-1 text-xs text-slate-400">
              New reminders for this customer will appear here automatically.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.8)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {item.subject ?? "Automated reminder"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    reminderStatusClass(item.status),
                  )}
                >
                  {reminderStatusLabel(item.status)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock3 className="size-3.5" />
                {formatReminderTimestamp(item.timestamp)}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function ReminderHistoryPanel({
  counterpartyName,
  reminderHistory,
  mode = "facility",
}: {
  counterpartyName: string;
  reminderHistory: ReminderHistoryItem[];
  mode?: "facility" | "customer";
}) {
  const isCustomerMode = mode === "customer";
  const emailReminders = useMemo(
    () => reminderHistory.filter((message) => message.type === "email"),
    [reminderHistory],
  );

  const smsReminders = useMemo(
    () => reminderHistory.filter((message) => message.type === "sms"),
    [reminderHistory],
  );

  const customerReminders = useMemo(
    () => reminderHistory.filter((message) => message.type === "email"),
    [reminderHistory],
  );

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-amber-50/40 via-white to-slate-50/60">
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-5 py-4 shadow-[0_26px_70px_-48px_rgba(120,53,15,0.8)]">
          <div className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-orange-300/25 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.35em] text-amber-700 uppercase">
                Reminder Concierge
              </p>
              <h4
                className="mt-1 text-2xl leading-tight font-semibold text-slate-900"
                style={{
                  fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
                }}
              >
                {counterpartyName} reminder timeline
              </h4>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                {isCustomerMode
                  ? "All reminders from this facility are listed here so your chat stays clean and easy to follow."
                  : "Every outbound reminder sent to this customer, separated by email and SMS for fast follow-up checks."}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-white/75 px-3 py-2 backdrop-blur-sm">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Sparkles className="size-3.5" />
                Total reminders
              </p>
              <p className="mt-1 text-right text-2xl font-bold text-slate-900 tabular-nums">
                {isCustomerMode ? customerReminders.length : reminderHistory.length}
              </p>
            </div>
          </div>
        </div>

        {isCustomerMode ? (
          <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.7)] backdrop-blur-sm">
            <div className="space-y-2">
              {customerReminders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-slate-500">No reminders yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    New reminders for this facility will appear here automatically.
                  </p>
                </div>
              ) : (
                customerReminders.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 px-3.5 py-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.8)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.subject ?? "Automated reminder"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          reminderStatusClass(item.status),
                        )}
                      >
                        {reminderStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock3 className="size-3.5" />
                      {formatReminderTimestamp(item.timestamp)}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <ReminderColumn
              title="Email Reminders"
              icon={Mail}
              channel="email"
              items={emailReminders}
            />
            <ReminderColumn
              title="SMS Reminders"
              icon={Smartphone}
              channel="sms"
              items={smsReminders}
            />
          </div>
        )}
      </div>
    </div>
  );
}
