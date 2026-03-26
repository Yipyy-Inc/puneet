"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Users,
  Clock,
  Search,
  Paperclip,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  messages,
  petUpdates,
  internalMessages,
} from "@/data/communications-hub";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ComposeMessageModal } from "@/components/communications/ComposeMessageModal";
import { PetUpdateModal } from "@/components/communications/PetUpdateModal";
import { AppointmentRemindersTab } from "@/components/additional-features/AppointmentRemindersTab";
import type { Message } from "@/data/communications-hub";

// Conversation interface
interface Conversation {
  clientId: number;
  clientName: string;
  lastMessage: Message;
  unreadCount: number;
  channels: ("email" | "sms" | "in-app")[];
  messages: Message[];
}

export default function MessagingPage() {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showPetUpdateModal, setShowPetUpdateModal] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "email" | "sms" | "in-app"
  >("all");

  // Group messages by customer into conversations
  const conversations = useMemo(() => {
    const conversationMap = new Map<number, Conversation>();

    messages.forEach((msg) => {
      if (!msg.clientId) return; // Skip messages without clientId

      if (!conversationMap.has(msg.clientId)) {
        // Get client name from the message 'from' field
        const clientName = msg.from.includes("@")
          ? msg.from
              .split("@")[0]
              .replace(/\./g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())
          : msg.from.includes("+")
            ? msg.from // Phone number
            : msg.from.replace(/Client Portal - /, "") ||
              `Client ${msg.clientId}`;

        conversationMap.set(msg.clientId, {
          clientId: msg.clientId,
          clientName,
          lastMessage: msg,
          unreadCount: 0,
          channels: [],
          messages: [],
        });
      }

      const conv = conversationMap.get(msg.clientId)!;
      conv.messages.push(msg);

      // Update last message if this is newer
      if (new Date(msg.timestamp) > new Date(conv.lastMessage.timestamp)) {
        conv.lastMessage = msg;
      }

      // Count unread
      if (!msg.hasRead && msg.direction === "inbound") {
        conv.unreadCount++;
      }

      // Track channels
      if (!conv.channels.includes(msg.type)) {
        conv.channels.push(msg.type);
      }
    });

    // Sort by last message timestamp (newest first)
    return Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime(),
    );
  }, []);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((conv) => conv.channels.includes(filterType));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.clientName.toLowerCase().includes(query) ||
          conv.lastMessage.body.toLowerCase().includes(query) ||
          conv.lastMessage.from.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [conversations, filterType, searchQuery]);

  // Get messages for selected conversation, sorted by timestamp
  const conversationMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return [...selectedConversation.messages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [selectedConversation]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get channel icon
  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="size-4" />;
      case "sms":
        return <MessageSquare className="size-4" />;
      case "in-app":
        return <MessageSquare className="size-4" />;
      default:
        return <MessageSquare className="size-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messaging</h1>
          <p className="text-muted-foreground mt-1">
            Customer conversations (chat, SMS, email)
          </p>
        </div>
        <Button onClick={() => setShowComposeModal(true)}>
          <Plus className="mr-2 size-4" />
          New Message
        </Button>
      </div>

      {/* Messaging Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">
            <Mail className="mr-2 size-4" />
            Inbox
            {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pet-updates">
            <Bell className="mr-2 size-4" />
            Pet Updates
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="mr-2 size-4" />
            Appointment Reminders
          </TabsTrigger>
          <TabsTrigger value="internal">
            <Users className="mr-2 size-4" />
            Internal
          </TabsTrigger>
        </TabsList>

        {/* Unified Inbox Tab - Conversation View */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="grid h-[calc(100vh-300px)] grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 transform" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="text-muted-foreground size-4" />
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterType === "email" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("email")}
                    >
                      <Mail className="mr-1 size-3" />
                      Email
                    </Button>
                    <Button
                      variant={filterType === "sms" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("sms")}
                    >
                      <MessageSquare className="mr-1 size-3" />
                      SMS
                    </Button>
                    <Button
                      variant={filterType === "in-app" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("in-app")}
                    >
                      <MessageSquare className="mr-1 size-3" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  {filteredConversations.length === 0 ? (
                    <div className="text-muted-foreground px-4 py-8 text-center">
                      <MessageSquare className="mx-auto mb-4 size-12 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.clientId}
                          onClick={() => setSelectedConversation(conv)}
                          className={`hover:bg-muted w-full p-4 text-left transition-colors ${
                            selectedConversation?.clientId === conv.clientId
                              ? "border-l-primary bg-muted border-l-4"
                              : ""
                          } `}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="truncate font-semibold">
                                  {conv.clientName}
                                </span>
                                {conv.unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="mb-1 flex items-center gap-2">
                                {conv.channels.map((channel) => (
                                  <span
                                    key={channel}
                                    className="text-muted-foreground"
                                  >
                                    {getChannelIcon(channel)}
                                  </span>
                                ))}
                              </div>
                              <p className="text-muted-foreground truncate text-sm">
                                {conv.lastMessage.body}
                              </p>
                            </div>
                            <div className="text-muted-foreground shrink-0 text-xs">
                              {formatTimestamp(conv.lastMessage.timestamp)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Conversation Detail */}
            <Card className="lg:col-span-2">
              {selectedConversation ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedConversation.clientName}
                          {selectedConversation.unreadCount > 0 && (
                            <Badge variant="destructive">
                              {selectedConversation.unreadCount} unread
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2">
                          {selectedConversation.channels.map((channel) => (
                            <Badge
                              key={channel}
                              variant="outline"
                              className="capitalize"
                            >
                              {getChannelIcon(channel)}
                              <span className="ml-1">
                                {channel === "in-app" ? "Chat" : channel}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComposeModal(true)}
                      >
                        <Plus className="mr-2 size-4" />
                        Reply
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-420px)]">
                      <div className="space-y-4 p-4">
                        {conversationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${
                              msg.direction === "outbound"
                                ? "justify-end"
                                : "justify-start"
                            } `}
                          >
                            {msg.direction === "inbound" && (
                              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                                {getChannelIcon(msg.type)}
                              </div>
                            )}
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.direction === "outbound"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              } `}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <Badge
                                  variant={
                                    msg.direction === "outbound"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {getChannelIcon(msg.type)}
                                  <span className="ml-1 capitalize">
                                    {msg.type === "in-app" ? "Chat" : msg.type}
                                  </span>
                                </Badge>
                                {!msg.hasRead &&
                                  msg.direction === "inbound" && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Unread
                                    </Badge>
                                  )}
                              </div>
                              {msg.subject && (
                                <div className="mb-1 font-semibold">
                                  {msg.subject}
                                </div>
                              )}
                              <div className="text-sm whitespace-pre-wrap">
                                {msg.body}
                              </div>
                              {msg.attachments &&
                                msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {msg.attachments.map((att) => (
                                      <div
                                        key={att.id}
                                        className="bg-background/50 flex items-center gap-2 rounded-sm p-2 text-xs"
                                      >
                                        <Paperclip className="size-3" />
                                        <span className="truncate">
                                          {att.name}
                                        </span>
                                        <span className="text-muted-foreground">
                                          ({(att.size / 1024).toFixed(1)} KB)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              <div className="mt-2 text-xs opacity-70">
                                {formatTimestamp(msg.timestamp)}
                                {msg.status && (
                                  <span className="ml-2 capitalize">
                                    • {msg.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            {msg.direction === "outbound" && (
                              <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                                <MessageSquare className="text-primary-foreground size-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-muted-foreground text-center">
                    <MessageSquare className="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="mt-2 text-sm">
                      Choose a conversation from the list to view messages
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Pet Updates Tab */}
        <TabsContent value="pet-updates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-Time Pet Updates</CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Quick updates sent to pet owners
                  </p>
                </div>
                <Button onClick={() => setShowPetUpdateModal(true)}>
                  <Plus className="mr-2 size-4" />
                  Send Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {petUpdates.map((update) => (
                  <div key={update.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-semibold">
                            {update.petName}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {update.updateType}
                          </Badge>
                        </div>
                        <p className="text-sm">{update.message}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          By {update.staffName} •{" "}
                          {formatTimestamp(update.timestamp)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          update.notificationSent ? "default" : "secondary"
                        }
                      >
                        {update.notificationSent ? "Sent" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <AppointmentRemindersTab />
        </TabsContent>

        {/* Internal Communications Tab - CLEARLY SEPARATED */}
        <TabsContent value="internal" className="space-y-4">
          {/* Warning Banner - Clear Separation */}
          <div className="rounded-lg border-2 border-orange-500/30 bg-orange-50/50 p-4 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <Users className="size-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Internal Team Communication Only
                  </p>
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-700 dark:text-orange-300"
                  >
                    Staff Only
                  </Badge>
                </div>
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  This section is completely separate from customer messaging.
                  No customer data is visible or accessible here. Staff-to-staff
                  communication only.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-muted border-2">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    Internal Team Communications
                    <Badge variant="secondary" className="ml-2">
                      Internal
                    </Badge>
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Team messages with @mentions, channels, and read receipts.
                    <span className="text-foreground font-medium">
                      {" "}
                      No customer data.
                    </span>
                  </p>
                </div>
                <Button onClick={() => setShowComposeModal(true)}>
                  <Plus className="mr-2 size-4" />
                  New Internal Message
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {internalMessages.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <Users className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p className="text-lg font-medium">No internal messages</p>
                  <p className="mt-2 text-sm">
                    Start a conversation with your team
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {internalMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="border-muted bg-background hover:bg-muted/50 rounded-lg border-2 p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-semibold">{msg.from}</span>
                            <Badge
                              variant={
                                msg.channel === "urgent"
                                  ? "destructive"
                                  : msg.channel === "shifts"
                                    ? "default"
                                    : "outline"
                              }
                              className="capitalize"
                            >
                              {msg.channel}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                            {msg.hasRead.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {msg.hasRead.length} read
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <div className="text-muted-foreground ml-4 shrink-0 text-xs">
                          {formatTimestamp(msg.timestamp)}
                        </div>
                      </div>
                      {msg.mentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.mentions.map((mention, idx) => (
                            <Badge key={idx} variant="secondary">
                              @{mention}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optional: Note about moving to separate section */}
          <div className="border-muted bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-center text-xs">
              💡 <span className="font-medium">Note:</span> This internal
              messaging feature can be moved to a dedicated Staff/Operations
              section if preferred for better separation.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <ComposeMessageModal onClose={() => setShowComposeModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showPetUpdateModal} onOpenChange={setShowPetUpdateModal}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <PetUpdateModal onClose={() => setShowPetUpdateModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
