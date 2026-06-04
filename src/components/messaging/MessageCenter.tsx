"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContactList } from "./ContactList";
import { ConversationThread } from "./ConversationThread";
import { ClientContextPanel } from "./ClientContextPanel";
import { messages as facilityMessages, callLogs } from "@/data/communications-hub";
import { clientCommunications } from "@/data/communications";
import { facilities } from "@/data/facilities";
import { clients } from "@/data/clients";
import { isClientBlocked } from "@/lib/blocked-clients";
import type { Message } from "@/types/communications";

export type MessageCenterMode = "facility" | "customer";

function getLatestThreadId(items: Message[]): string | null {
  if (items.length === 0) return null;
  const latest = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
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

function getCustomerFacilityIds(customerId: number): number[] {
  const customer = clients.find((client) => client.id === customerId);
  if (!customer) return [];

  const customerEmail = customer.email.trim().toLowerCase();
  const customerName = customer.name.trim().toLowerCase();

  return facilities
    .filter((facility) => {
      const roster = (facility as Record<string, unknown>).clients as
        | Array<{
            person?: {
              name?: string;
              email?: string;
            };
          }>
        | undefined;

      if (!roster) return false;

      return roster.some((entry) => {
        const personName = entry.person?.name?.trim().toLowerCase();
        const personEmail = entry.person?.email?.trim().toLowerCase();

        return (
          (personEmail !== undefined && personEmail === customerEmail) ||
          (personName !== undefined && personName === customerName)
        );
      });
    })
    .map((facility) => facility.id);
}

const phoneDigits = (s: string | undefined | null) =>
  (s ?? "").replace(/\D/g, "").slice(-10);

// Find an existing facility conversation thread for a call-log follow-up,
// by the call's linked client, falling back to the caller's phone number.
function findThreadForCall(source: string, toPhone: string | null): string | null {
  const call = callLogs.find((c) => c.id === source);
  if (call?.clientId != null) {
    const m = facilityMessages.find((msg) => msg.clientId === call.clientId);
    if (m) return m.threadId ?? m.id;
  }
  const target = phoneDigits(toPhone ?? call?.from);
  if (target) {
    const client = clients.find((c) => phoneDigits(c.phone) === target);
    if (client) {
      const m = facilityMessages.find((msg) => msg.clientId === client.id);
      if (m) return m.threadId ?? m.id;
    }
  }
  return null;
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

  const customerFacilityIds = useMemo(
    () => (mode === "customer" ? getCustomerFacilityIds(customerId) : []),
    [mode, customerId],
  );

  const senderBlocked = useMemo(
    () => (mode === "customer" ? isClientBlocked(customerId) : false),
    [mode, customerId],
  );

  const threadIds = useMemo(
    () => [
      ...new Set(
        activeMessages.map((message) => message.threadId ?? message.id),
      ),
    ],
    [activeMessages],
  );

  const customerThreadIds = useMemo(() => {
    if (mode !== "customer") return threadIds;

    const enrollmentThreadIds = customerFacilityIds.map(
      (facilityId) => `facility-${facilityId}`,
    );

    return [...new Set([...enrollmentThreadIds, ...threadIds])];
  }, [mode, customerFacilityIds, threadIds]);

  const showContactList = mode !== "customer" || customerThreadIds.length !== 1;

  useEffect(() => {
    if (mode !== "customer") return;
    if (customerThreadIds.length === 0) return;
    if (
      selectedThreadId !== null &&
      customerThreadIds.includes(selectedThreadId)
    ) {
      return;
    }

    setSelectedThreadId(customerThreadIds[0]);
  }, [mode, selectedThreadId, customerThreadIds]);

  const [detailOpen, setDetailOpen] = useState(true);

  // Deep-link from the Call Log: ?to=callerPhone&source=callLogId opens the
  // matching conversation with a pre-filled missed-call SMS template.
  const searchParams = useSearchParams();
  const sourceParam = mode === "facility" ? searchParams.get("source") : null;
  const toParam = mode === "facility" ? searchParams.get("to") : null;
  const [composePrefill, setComposePrefill] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const prefillAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "facility" || !sourceParam) return;
    if (prefillAppliedRef.current === sourceParam) return;
    const threadId = findThreadForCall(sourceParam, toParam);
    if (!threadId) return;
    prefillAppliedRef.current = sourceParam;
    setSelectedThreadId(threadId);
    const call = callLogs.find((c) => c.id === sourceParam);
    const firstName = (call?.clientName ?? "").split(" ")[0] || "there";
    const callbackNumber = call?.to ?? toParam ?? "us";
    setComposePrefill({
      key: sourceParam,
      text: `Hi ${firstName}, sorry we missed your call at Doggieville MTL. How can we help? Reply here or call us back at ${callbackNumber}.`,
    });
  }, [mode, sourceParam, toParam]);

  useEffect(() => {
    if (localStorage.getItem(detailStorageKey) === "false") {
      setDetailOpen(false);
    }
  }, [detailStorageKey]);

  const toggleDetail = () => {
    const next = !detailOpen;
    setDetailOpen(next);
    localStorage.setItem(detailStorageKey, String(next));
  };

  return (
    <div
      className="flex h-full w-full gap-3"
      style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        letterSpacing: "-0.01em",
      }}
    >
      {/* Contacts */}
      {showContactList && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ContactList
            messages={activeMessages}
            mode={mode}
            selectedThreadId={selectedThreadId}
            onSelectThread={setSelectedThreadId}
            customerFacilityIds={
              mode === "customer" ? customerFacilityIds : undefined
            }
          />
        </div>
      )}

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ConversationThread
          threadId={selectedThreadId}
          messages={activeMessages}
          mode={mode}
          detailOpen={detailOpen}
          onToggleDetail={toggleDetail}
          senderBlocked={senderBlocked}
          composePrefill={composePrefill}
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
