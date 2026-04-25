"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MoreHorizontal,
  MessageSquare,
  PanelRightClose,
  Info,
  Search,
  Star,
  Smartphone,
  Mail,
  MessageCircle,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  StickyNote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { ComposeBar } from "./ComposeBar";
import { getCustomerLanguageLabel } from "@/lib/language-settings";
import {
  getReminderHistoryForCustomer,
  ReminderHistoryPanel,
  type ReminderTab,
} from "./ReminderHistoryPanel";
import { InternalNotesTab } from "./InternalNotesTab";
import type { Message } from "@/types/communications";
import type { ConversationStatus } from "@/types/messaging";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { threadMeta as defaultThreadMeta, internalNotes as defaultInternalNotes } from "@/data/messaging";

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
];

function avatarColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  open: { label: "Open", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending_client: { label: "Pending Client", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  pending_staff: { label: "Pending Staff", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  follow_up: { label: "Follow-up", color: "bg-violet-100 text-violet-700 border-violet-200", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-slate-100 text-slate-600 border-slate-200", icon: CheckCircle2 },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500 border-slate-200", icon: Archive },
};

const CHANNEL_ICONS = {
  sms: Smartphone,
  email: Mail,
  "in-app": MessageCircle,
};

const CHANNEL_LABELS = {
  sms: "SMS",
  email: "Email",
  "in-app": "Chat",
};

type ActiveChannel = "sms" | "email" | "in-app";

export function ConversationThread({
  threadId,
  messages,
  detailOpen,
  onToggleDetail,
  mode = "facility",
}: {
  threadId: string | null;
  messages: Message[];
  detailOpen: boolean;
  onToggleDetail: () => void;
  mode?: "facility" | "customer";
}) {
  const isCustomerMode = mode === "customer";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tabsByThreadId, setTabsByThreadId] = useState<Record<string, ReminderTab>>({});
  const [statusByThreadId, setStatusByThreadId] = useState<Record<string, ConversationStatus>>(
    () =>
      Object.fromEntries(
        defaultThreadMeta.map((m) => [m.threadId, m.status as ConversationStatus]),
      ),
  );
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>("sms");

  const threadMessages = useMemo(() => {
    if (!threadId) return [];
    return messages
      .filter((message) => (message.threadId ?? message.id) === threadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [threadId, messages]);

  const threadFacilityId = useMemo(() => {
    if (!isCustomerMode || !threadId) return null;
    const match = /^facility-(\d+)$/.exec(threadId);
    return match ? Number(match[1]) : null;
  }, [isCustomerMode, threadId]);

  const counterpartyId = threadMessages[0]?.clientId ?? threadFacilityId ?? undefined;
  const client = counterpartyId ? clients.find((c) => c.id === counterpartyId) : null;
  const facility = counterpartyId ? facilities.find((f) => f.id === counterpartyId) : null;

  const facilityLogo = (facility as Record<string, unknown>)?.logo as string | undefined;
  const counterpartyName = isCustomerMode
    ? (facility?.name ?? threadMessages[0]?.from ?? "Facility")
    : (client?.name ?? threadMessages[0]?.from ?? "Unknown");
  const counterpartyImage = isCustomerMode
    ? facilityLogo
    : ((client as Record<string, unknown>)?.imageUrl as string | undefined);
  const counterpartyContact = isCustomerMode
    ? (facility as Record<string, unknown>)?.contact
    : null;

  const contactLine = isCustomerMode
    ? ((counterpartyContact as Record<string, unknown>)?.phone as string | undefined) ||
      ((counterpartyContact as Record<string, unknown>)?.email as string | undefined) ||
      "Typically responds within 2 hours"
    : (client?.phone ?? client?.email ?? "Active now");
  const preferredLanguageLabel =
    !isCustomerMode && client?.preferredLanguage
      ? getCustomerLanguageLabel(client.preferredLanguage)
      : null;

  const channels = [...new Set(threadMessages.map((m) => m.type))] as ActiveChannel[];
  const defaultChannel: ActiveChannel =
    channels.includes("sms") ? "sms" : channels.includes("email") ? "email" : "in-app";

  useEffect(() => {
    setActiveChannel(defaultChannel);
  }, [threadId, defaultChannel]);

  const chatMessages = useMemo(
    () =>
      isCustomerMode
        ? threadMessages.filter((m) => m.type === "in-app")
        : threadMessages,
    [isCustomerMode, threadMessages],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  const reminderHistory = useMemo(
    () =>
      getReminderHistoryForCustomer({ messages, counterpartyId, isCustomerMode }),
    [counterpartyId, isCustomerMode, messages],
  );

  const threadNotes = useMemo(
    () =>
      threadId
        ? defaultInternalNotes.filter((n) => n.threadId === threadId)
        : [],
    [threadId],
  );

  const activeTab = threadId ? (tabsByThreadId[threadId] ?? "conversation") : "conversation";
  const currentStatus: ConversationStatus =
    (threadId ? statusByThreadId[threadId] : null) ?? "open";
  const statusCfg = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusCfg.icon;

  const setStatus = (s: ConversationStatus) => {
    if (!threadId) return;
    setStatusByThreadId((prev) => ({ ...prev, [threadId]: s }));
  };

  if (!threadId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/30">
        <div className="relative">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-blue-50">
            <MessageSquare className="size-10 text-blue-300" />
          </div>
          <div className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-2xl bg-emerald-50">
            <Star className="size-5 text-emerald-300" />
          </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-700">Your Messages</h3>
        <p className="mt-2 max-w-xs text-center text-sm/relaxed text-slate-400">
          {isCustomerMode
            ? "Select a facility conversation from the left panel"
            : "Select a client from the left panel or create a new message"}
        </p>
      </div>
    );
  }

  const grouped: Array<{ type: "date"; date: string } | { type: "msg"; msg: Message }> = [];
  let lastDate = "";

  for (const message of chatMessages) {
    const date = new Date(message.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (date !== lastDate) {
      grouped.push({ type: "date", date });
      lastDate = date;
    }
    grouped.push({ type: "msg", msg: message });
  }

  const channelLabel =
    channels.length === 0
      ? "No history"
      : channels.length === 1
        ? CHANNEL_LABELS[channels[0]] ?? channels[0]
        : `${channels.length} channels`;

  const conversationPanel = (
    <>
      {/* Channel switcher */}
      {!isCustomerMode && (
        <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="mr-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Send via:
          </span>
          {(["sms", "email", "in-app"] as const).map((ch) => {
            const Icon = CHANNEL_ICONS[ch];
            const active = activeChannel === ch;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-white shadow-sm text-slate-800 border border-slate-200"
                    : "text-slate-400 hover:bg-white/60 hover:text-slate-600",
                )}
              >
                <Icon className="size-3.5" />
                {CHANNEL_LABELS[ch]}
              </button>
            );
          })}
          {activeChannel === "email" && (
            <span className="ml-auto text-[10px] text-amber-500">
              Client may not respond instantly
            </span>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          background: "linear-gradient(180deg, rgb(248 250 252 / 0.5) 0%, rgb(241 245 249 / 0.3) 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl px-6 py-5">
          {grouped.length > 0 && (
            <div className="mb-4 flex flex-col items-center py-4 text-center">
              {counterpartyImage ? (
                <img
                  src={counterpartyImage}
                  alt=""
                  className="size-16 rounded-full object-cover shadow-md ring-4 ring-white"
                />
              ) : (
                <div
                  className={cn(
                    "flex size-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-md ring-4 ring-white",
                    avatarColor(counterpartyName),
                  )}
                >
                  {initials(counterpartyName)}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold text-slate-700">{counterpartyName}</p>
              <p className="text-[11px] text-slate-400">
                {isCustomerMode
                  ? (((counterpartyContact as Record<string, unknown>)?.email as string | undefined) ?? "")
                  : (client?.email ?? "")}{" "}
                {(isCustomerMode
                  ? ((counterpartyContact as Record<string, unknown>)?.phone as string | undefined)
                  : client?.phone)
                  ? `- ${
                      isCustomerMode
                        ? ((counterpartyContact as Record<string, unknown>)?.phone as string)
                        : client?.phone
                    }`
                  : ""}
              </p>
              <p className="mt-1 text-[10px] text-slate-300">
                Conversation started{" "}
                {chatMessages[0]
                  ? new Date(chatMessages[0].timestamp).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">
                No chat messages in this thread yet
              </p>
              {isCustomerMode && (
                <p className="mt-1 text-xs text-slate-500">
                  Open the Reminders tab to see your reminders.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {grouped.map((item, index) =>
                item.type === "date" ? (
                  <DateSeparator key={`d-${index}`} date={item.date} />
                ) : (
                  <MessageBubble
                    key={item.msg.id}
                    message={item.msg}
                    clientName={counterpartyName}
                    clientImage={counterpartyImage}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <ComposeBar
        mode={mode}
        clientName={counterpartyName}
        lastMessage={threadMessages[threadMessages.length - 1]?.body}
        preferredLanguageLabel={preferredLanguageLabel ?? undefined}
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
      />
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          {counterpartyImage ? (
            <img
              src={counterpartyImage}
              alt=""
              className="size-11 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
                avatarColor(counterpartyName),
              )}
            >
              {initials(counterpartyName)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">{counterpartyName}</h3>
              {preferredLanguageLabel && (
                <Badge
                  variant="outline"
                  className="border-indigo-200 bg-indigo-50 text-[9px] text-indigo-700"
                >
                  {preferredLanguageLabel}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-slate-200 text-[9px] text-slate-400"
              >
                {channelLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">{contactLine}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Status selector */}
          {!isCustomerMode && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:brightness-95",
                    statusCfg.color,
                  )}
                >
                  <StatusIcon className="size-3" />
                  {statusCfg.label}
                  <ChevronDown className="size-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 rounded-xl p-1 shadow-lg">
                {(Object.entries(STATUS_CONFIG) as [ConversationStatus, typeof statusCfg][]).map(
                  ([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatus(key)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-50",
                          currentStatus === key && "bg-slate-50",
                        )}
                      >
                        <Icon className="size-3.5" />
                        {cfg.label}
                        {currentStatus === key && (
                          <CheckCircle2 className="ml-auto size-3 text-emerald-500" />
                        )}
                      </button>
                    );
                  },
                )}
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Phone className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Search className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-9 rounded-full",
              detailOpen
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-blue-50 hover:text-blue-600",
            )}
            onClick={onToggleDetail}
          >
            {detailOpen ? (
              <PanelRightClose className="size-[18px]" />
            ) : (
              <Info className="size-[18px]" />
            )}
          </Button>

          <div className="mx-1 h-5 border-l border-slate-200" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <MoreHorizontal className="size-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                {isCustomerMode ? "View facility profile" : "View client profile"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {isCustomerMode ? "My booking history" : "Booking history"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Pin conversation</DropdownMenuItem>
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("archived")} className="text-red-500">
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (!threadId) return;
          setTabsByThreadId((current) => ({
            ...current,
            [threadId]: value as ReminderTab,
          }));
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="border-b border-slate-200 bg-white px-4">
          <TabsTrigger value="conversation">
            {isCustomerMode ? "Chat" : "Conversation"}
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            {isCustomerMode ? "Reminders" : "Reminder History"}
            <Badge className="bg-amber-100 px-2 py-0 text-[10px] text-amber-800">
              {reminderHistory.length}
            </Badge>
          </TabsTrigger>
          {!isCustomerMode && (
            <TabsTrigger value="notes" className="gap-2">
              <StickyNote className="size-3.5" />
              Internal Notes
              {threadNotes.length > 0 && (
                <Badge className="bg-slate-100 px-2 py-0 text-[10px] text-slate-600">
                  {threadNotes.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="conversation" className="flex min-h-0 flex-1 flex-col">
          {conversationPanel}
        </TabsContent>

        <TabsContent value="reminders" className="min-h-0 flex-1 overflow-hidden">
          <ReminderHistoryPanel
            counterpartyName={counterpartyName}
            reminderHistory={reminderHistory}
            mode={mode}
          />
        </TabsContent>

        {!isCustomerMode && (
          <TabsContent value="notes" className="min-h-0 flex-1 overflow-hidden">
            <InternalNotesTab threadId={threadId} initialNotes={threadNotes} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
