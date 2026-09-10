"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MoreHorizontal,
  MessageSquare,
  ArrowLeft,
  PanelRightClose,
  Info,
  Search,
  Star,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
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
import { useConversationState } from "./conversation-state-context";
import { getCustomerLanguageLabel } from "@/lib/language-settings";
import { UserPlus, Lock, Unlock } from "lucide-react";
import {
  getReminderHistoryForCustomer,
  ReminderHistoryPanel,
  type ReminderTab,
} from "./ReminderHistoryPanel";
import type { Message } from "@/types/communications";
import type { ConversationStatus } from "@/types/messaging";
import { clients } from "@/data/clients";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useAssignedScope } from "@/lib/facility-permissions";
import { useAssignedClientRefs } from "@/lib/api/client";
import { facilities } from "@/data/facilities";
import { threadMeta as defaultThreadMeta } from "@/data/messaging";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatDateLong } from "@/lib/i18n/format";

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
  { labelKey: string; color: string; icon: typeof CheckCircle2 }
> = {
  open: {
    labelKey: "open",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  pending_client: {
    labelKey: "pendingClient",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  pending_staff: {
    labelKey: "pendingStaff",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock,
  },
  follow_up: {
    labelKey: "followUp",
    color: "bg-violet-100 text-violet-700 border-violet-200",
    icon: AlertCircle,
  },
  resolved: {
    labelKey: "resolved",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: CheckCircle2,
  },
  archived: {
    labelKey: "archived",
    color: "bg-slate-100 text-slate-500 border-slate-200",
    icon: Archive,
  },
};

// A channel's name, by CATALOGUE KEY.
const CHANNEL_KEYS: Record<string, string> = {
  sms: "channelSms",
  email: "channelEmail",
  "in-app": "channelChat",
};

type ActiveChannel = "sms" | "email" | "in-app";

export function ConversationThread({
  threadId,
  messages,
  detailOpen,
  onToggleDetail,
  onBack,
  mode = "facility",
  senderBlocked = false,
  composePrefill = null,
}: {
  threadId: string | null;
  messages: Message[];
  detailOpen: boolean;
  onToggleDetail: () => void;
  /** Mobile only: return to the conversation list (clears the selection). */
  onBack?: () => void;
  mode?: "facility" | "customer";
  senderBlocked?: boolean;
  composePrefill?: { key: string; text: string } | null;
}) {
  const t = useShellText("messaging");
  const locale = useShellLocale();
  const isCustomerMode = mode === "customer";
  const conversationState = useConversationState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tabsByThreadId, setTabsByThreadId] = useState<
    Record<string, ReminderTab>
  >({});
  const [statusByThreadId, setStatusByThreadId] = useState<
    Record<string, ConversationStatus>
  >(() =>
    Object.fromEntries(
      defaultThreadMeta.map((m) => [
        m.threadId,
        m.status as ConversationStatus,
      ]),
    ),
  );
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>("sms");

  const threadMessages = useMemo(() => {
    if (!threadId) return [];
    return messages
      .filter((message) => (message.threadId ?? message.id) === threadId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [threadId, messages]);

  const threadFacilityId = useMemo(() => {
    if (!isCustomerMode || !threadId) return null;
    const match = /^facility-(\d+)$/.exec(threadId);
    return match ? Number(match[1]) : null;
  }, [isCustomerMode, threadId]);

  const counterpartyId =
    threadMessages[0]?.clientId ?? threadFacilityId ?? undefined;

  // Section 5F — replying requires messages_send; when that resolves to
  // assigned_only, only within the viewer's assigned-client conversations.
  // The customer portal is never gated (owners reply on their own threads).
  const canSendMessages = usePermission("messages_send");
  const sendScope = useAssignedScope("messages_send");
  // Whether this viewer may reply HERE. `sendScope` is set only when
  // messages_send resolves to assigned_only, and the set behind it came from
  // the bookings fixture — a scoped viewer's right to reply was decided by mock
  // rows, and matched none of them, so the box was closed whoever they were.
  //
  // While the answer is unknown the reply box stays closed: opening it and then
  // refusing the send is worse than a moment's wait.
  const { refs: replyRefs } = useAssignedClientRefs(sendScope ?? undefined);
  const canReplyHere =
    isCustomerMode ||
    (canSendMessages &&
      (sendScope == null ||
        (counterpartyId != null && (replyRefs?.has(counterpartyId) ?? false))));
  const client = counterpartyId
    ? clients.find((c) => c.id === counterpartyId)
    : null;
  const facility = counterpartyId
    ? facilities.find((f) => f.id === counterpartyId)
    : null;

  const facilityLogo = (facility as Record<string, unknown>)?.logo as
    | string
    | undefined;
  const counterpartyName = isCustomerMode
    ? (facility?.name ?? threadMessages[0]?.from ?? t("facility"))
    : (client?.name ?? threadMessages[0]?.from ?? t("unknown"));
  const counterpartyImage = isCustomerMode
    ? facilityLogo
    : ((client as Record<string, unknown>)?.imageUrl as string | undefined);
  const counterpartyContact = isCustomerMode
    ? (facility as Record<string, unknown>)?.contact
    : null;

  const contactLine = isCustomerMode
    ? ((counterpartyContact as Record<string, unknown>)?.phone as
        | string
        | undefined) ||
      ((counterpartyContact as Record<string, unknown>)?.email as
        | string
        | undefined) ||
      t("typicallyResponds")
    : (client?.phone ?? client?.email ?? t("activeNow"));
  const preferredLanguageLabel =
    !isCustomerMode && client?.preferredLanguage
      ? getCustomerLanguageLabel(client.preferredLanguage)
      : null;

  const channels = [
    ...new Set(threadMessages.map((m) => m.type)),
  ] as ActiveChannel[];
  const defaultChannel: ActiveChannel = channels.includes("sms")
    ? "sms"
    : channels.includes("email")
      ? "email"
      : "in-app";

  useEffect(() => {
    setActiveChannel(defaultChannel);
  }, [threadId, defaultChannel]);

  // A deep-linked template (e.g. missed-call SMS from the Call Log) forces SMS.
  const prefillKey = composePrefill?.key;
  useEffect(() => {
    if (prefillKey) setActiveChannel("sms");
  }, [prefillKey]);

  const chatMessages = useMemo(
    () =>
      isCustomerMode
        ? threadMessages.filter((m) => m.type === "in-app")
        : threadMessages,
    [isCustomerMode, threadMessages],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages.length]);

  const reminderHistory = useMemo(
    () =>
      getReminderHistoryForCustomer({
        messages,
        counterpartyId,
        isCustomerMode,
      }),
    [counterpartyId, isCustomerMode, messages],
  );

  const activeTab = threadId
    ? (tabsByThreadId[threadId] ?? "conversation")
    : "conversation";
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
        <h3 className="mt-6 text-xl font-bold text-slate-700">
          {t("yourMessages")}
        </h3>
        <p className="mt-2 max-w-xs text-center text-sm/relaxed text-slate-400">
          {isCustomerMode
            ? t("selectAFacilityConversationFrom")
            : t("selectAClientOrCreate")}
        </p>
      </div>
    );
  }

  const grouped: Array<
    { type: "date"; date: string } | { type: "msg"; msg: Message }
  > = [];
  let lastDate = "";

  for (const message of chatMessages) {
    const date = formatDateLong(message.timestamp, locale);
    if (date !== lastDate) {
      grouped.push({ type: "date", date });
      lastDate = date;
    }
    grouped.push({ type: "msg", msg: message });
  }

  const channelLabel =
    channels.length === 0
      ? t("noHistory")
      : channels.length === 1
        ? CHANNEL_KEYS[channels[0]]
          ? t(CHANNEL_KEYS[channels[0]])
          : channels[0]
        : t("channelCount").replace("{n}", String(channels.length));

  const conversationPanel = (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          background:
            "linear-gradient(180deg, rgb(248 250 252 / 0.5) 0%, rgb(241 245 249 / 0.3) 100%)",
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
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {counterpartyName}
              </p>
              <p className="text-[11px] text-slate-400">
                {isCustomerMode
                  ? (((counterpartyContact as Record<string, unknown>)
                      ?.email as string | undefined) ?? "")
                  : (client?.email ?? "")}{" "}
                {(
                  isCustomerMode
                    ? ((counterpartyContact as Record<string, unknown>)
                        ?.phone as string | undefined)
                    : client?.phone
                )
                  ? `- ${
                      isCustomerMode
                        ? ((counterpartyContact as Record<string, unknown>)
                            ?.phone as string)
                        : client?.phone
                    }`
                  : ""}
              </p>
              <p className="mt-1 text-[10px] text-slate-300">
                {chatMessages[0]
                  ? t("conversationStarted").replace(
                      "{date}",
                      formatDateLong(chatMessages[0].timestamp, locale),
                    )
                  : null}
              </p>
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">
                {t("noChatMessagesInThis")}
              </p>
              {isCustomerMode && (
                <p className="mt-1 text-xs text-slate-500">
                  {t("openTheRemindersTabTo")}
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

      {isCustomerMode && senderBlocked ? (
        <div className="border-t bg-rose-50/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <div className="text-xs text-rose-800">
              <p className="font-semibold">{t("messagingUnavailable")}</p>
              <p className="mt-0.5 text-rose-700">
                {t("unableToMessageFacility")}
              </p>
            </div>
          </div>
        </div>
      ) : !canReplyHere ? (
        // 5F: replying needs messages_send, and when that key is assigned_only
        // it's limited to the viewer's assigned-client conversations.
        <div className="text-muted-foreground border-t px-5 py-4 text-center text-xs">
          {t("youDontHavePermissionTo")}
        </div>
      ) : (
        <ComposeBar
          mode={mode}
          threadId={threadId}
          clientName={counterpartyName}
          petName={client?.pets?.[0]?.name}
          lastMessage={threadMessages[threadMessages.length - 1]?.body}
          preferredLanguageLabel={preferredLanguageLabel ?? undefined}
          activeChannel={activeChannel}
          onChannelChange={setActiveChannel}
          recipientEmail={
            isCustomerMode
              ? (((counterpartyContact as Record<string, unknown>)?.email as
                  | string
                  | undefined) ?? null)
              : (client?.email ?? null)
          }
          senderName={isCustomerMode ? undefined : "PawCare Facility"}
          prefillKey={composePrefill?.key}
          prefillText={composePrefill?.text}
        />
      )}
    </>
  );

  return (
    // min-w-0: as a flex child of the panel column this defaulted to
    // min-width:auto and would not shrink below its ~720px content, so the
    // whole thread was clipped by the column's overflow-hidden at 390px.
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("backToInbox")}
              onClick={onBack}
              className="-ml-2 size-9 shrink-0 rounded-full lg:hidden"
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
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

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="truncate text-sm font-bold text-slate-800">
                {counterpartyName}
              </h3>
              {!isCustomerMode && client?.isBlocked && (
                <Badge
                  variant="outline"
                  className="border-rose-200 bg-rose-50 text-[9px] text-rose-700"
                >
                  {t("blocked")}
                </Badge>
              )}
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
            <p className="truncate text-[11px] text-slate-400">{contactLine}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Open / Closed toggle */}
          {!isCustomerMode && threadId && (
            <button
              type="button"
              onClick={() => {
                const next = !conversationState.isClosed(threadId);
                conversationState.setClosed(threadId, next);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                conversationState.isClosed(threadId)
                  ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              )}
              title={
                conversationState.isClosed(threadId)
                  ? t("reopenConversation2")
                  : t("markConversationClosed")
              }
            >
              {conversationState.isClosed(threadId) ? (
                <>
                  <Lock className="size-3" />
                  <span className="hidden sm:inline">{t("closed")}</span>
                </>
              ) : (
                <>
                  <Unlock className="size-3" />
                  <span className="hidden sm:inline">{t("open")}</span>
                </>
              )}
            </button>
          )}

          {/* Assign to staff */}
          {!isCustomerMode && threadId && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  title={t("assignToStaff")}
                >
                  {conversationState.getAssignee(threadId) ? (
                    <>
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white",
                          conversationState.getAssignee(threadId)!.color,
                        )}
                      >
                        {conversationState.getAssignee(threadId)!.initials}
                      </span>
                      <span className="hidden sm:inline">
                        {conversationState.getAssignee(threadId)!.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3" />
                      <span className="hidden sm:inline">{t("assign")}</span>
                    </>
                  )}
                  <ChevronDown className="hidden size-3 text-slate-400 sm:block" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-56 rounded-xl p-1 shadow-lg"
              >
                <p className="px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t("assignConversation")}
                </p>
                {conversationState.staff.map((s) => {
                  const active =
                    conversationState.getAssignee(threadId)?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => conversationState.assignTo(threadId, s.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-slate-50",
                        active && "bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          s.color,
                        )}
                      >
                        {s.initials}
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold text-slate-700">
                          {s.name}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {s.role}
                        </span>
                      </span>
                      {active && (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
                {conversationState.getAssignee(threadId) && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => conversationState.assignTo(threadId, null)}
                      className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      {t("unassign")}
                    </button>
                  </>
                )}
              </PopoverContent>
            </Popover>
          )}

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
                  <span className="hidden sm:inline">
                    {t(statusCfg.labelKey)}
                  </span>
                  <ChevronDown className="size-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-52 rounded-xl p-1 shadow-lg"
              >
                {(
                  Object.entries(STATUS_CONFIG) as [
                    ConversationStatus,
                    typeof statusCfg,
                  ][]
                ).map(([key, cfg]) => {
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
                      {t(cfg.labelKey)}
                      {currentStatus === key && (
                        <CheckCircle2 className="ml-auto size-3 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}

          {/* Secondary actions — hidden on phones to keep the header uncluttered
              (all reachable from the ⋮ menu / client profile). */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 sm:inline-flex"
          >
            <Phone className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 sm:inline-flex"
          >
            <Search className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              // Toggles the client context panel, which only renders at xl.
              "hidden size-9 rounded-full xl:inline-flex",
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

          <div className="mx-1 hidden h-5 border-l border-slate-200 sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <MoreHorizontal className="size-[18px]" />
                <span className="sr-only">{t("openMenu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                {isCustomerMode
                  ? t("viewFacilityProfile")
                  : t("viewClientProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {isCustomerMode ? t("myBookingHistory") : t("bookingHistory")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("pinConversation")}</DropdownMenuItem>
              <DropdownMenuItem>{t("markAsUnread")}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatus("archived")}
                className="text-red-500"
              >
                {t("archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isCustomerMode ? (
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
            <TabsTrigger value="conversation">{t("chat")}</TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              {t("reminders")}
              <Badge className="bg-amber-100 px-2 py-0 text-[10px] text-amber-800">
                {reminderHistory.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="conversation"
            className="flex min-h-0 flex-1 flex-col"
          >
            {conversationPanel}
          </TabsContent>

          <TabsContent
            value="reminders"
            className="min-h-0 flex-1 overflow-hidden"
          >
            <ReminderHistoryPanel
              counterpartyName={counterpartyName}
              reminderHistory={reminderHistory}
              mode={mode}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{conversationPanel}</div>
      )}
    </div>
  );
}
