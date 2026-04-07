"use client";

import { useMemo, useState } from "react";
import { ContactList } from "./ContactList";
import { ConversationThread } from "./ConversationThread";
import { ClientContextPanel } from "./ClientContextPanel";
import { messages as facilityMessages } from "@/data/communications-hub";
import { clientCommunications } from "@/data/communications";
import { facilities } from "@/data/facilities";
import type { Message } from "@/types/communications";

export type MessageCenterMode = "facility" | "customer";

function getLatestThreadId(items: Message[]): string | null {
  if (items.length === 0) return null;
  const latest = [...items].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];
  return latest.threadId ?? latest.id;
}

function buildCustomerMessages(customerId: number): Message[] {
  return clientCommunications
    .filter((record) => record.clientId === customerId)
    .map((record) => {
      const facility = facilities.find((f) => f.id === record.facilityId);
      const facilityName = facility?.name ?? `Facility #${record.facilityId}`;
      const type =
        record.type === "email" ||
        record.type === "sms" ||
        record.type === "in-app"
          ? record.type
          : "in-app";

      return {
        id: `customer-${record.id}`,
        type,
        direction: record.direction === "outbound" ? "inbound" : "outbound",
        from: facilityName,
        to: "You",
        subject: record.subject || undefined,
        body: record.content,
        status: record.status ?? "delivered",
        timestamp: record.timestamp,
        clientId: record.facilityId,
        threadId: `facility-${record.facilityId}`,
        hasRead: record.status === "read",
      } satisfies Message;
    });
}

export function MessageCenter({
  mode = "facility",
  customerId = 15,
}: {
  mode?: MessageCenterMode;
  customerId?: number;
}) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() =>
    mode === "customer"
      ? getLatestThreadId(buildCustomerMessages(customerId))
      : null,
  );
  const detailStorageKey =
    mode === "customer"
      ? "customer-messaging-detail-panel-open"
      : "messaging-detail-panel-open";

  const activeMessages = useMemo(() => {
    return mode === "customer"
      ? buildCustomerMessages(customerId)
      : facilityMessages;
  }, [mode, customerId]);

  const [detailOpen, setDetailOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(detailStorageKey) !== "false";
  });

  const toggleDetail = () => {
    const next = !detailOpen;
    setDetailOpen(next);
    localStorage.setItem(detailStorageKey, String(next));
  };

  return (
    <div
      className="flex h-[calc(100vh-120px)] gap-3"
      style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        letterSpacing: "-0.01em",
      }}
    >
      {/* Contacts */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ContactList
          messages={activeMessages}
          mode={mode}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
        />
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ConversationThread
          threadId={selectedThreadId}
          messages={activeMessages}
          mode={mode}
          detailOpen={detailOpen}
          onToggleDetail={toggleDetail}
        />
      </div>

      {/* Media panel */}
      {detailOpen && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ClientContextPanel
            threadId={selectedThreadId}
            messages={activeMessages}
            mode={mode}
            customerId={customerId}
            onClose={toggleDetail}
          />
        </div>
      )}
    </div>
  );
}
