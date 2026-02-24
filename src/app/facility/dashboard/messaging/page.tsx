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
import { Separator } from "@/components/ui/separator";
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
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "email" | "sms" | "in-app">("all");

  // Group messages by customer into conversations
  const conversations = useMemo(() => {
    const conversationMap = new Map<number, Conversation>();

    messages.forEach((msg) => {
      if (!msg.clientId) return; // Skip messages without clientId

      if (!conversationMap.has(msg.clientId)) {
        // Get client name from the first message
        const clientName = msg.from.includes("@")
          ? msg.from.split("@")[0].replace(/\./g, " ")
          : msg.clientName || `Client ${msg.clientId}`;

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
        new Date(a.lastMessage.timestamp).getTime()
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
          conv.lastMessage.from.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [conversations, filterType, searchQuery]);

  // Get messages for selected conversation, sorted by timestamp
  const conversationMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return [...selectedConversation.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedConversation]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Get channel icon
  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "in-app":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messaging</h1>
          <p className="text-muted-foreground mt-1">
            Customer conversations (chat, SMS, email)
          </p>
        </div>
        <Button onClick={() => setShowComposeModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Messaging Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">
            <Mail className="h-4 w-4 mr-2" />
            Inbox
            {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pet-updates">
            <Bell className="h-4 w-4 mr-2" />
            Pet Updates
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="h-4 w-4 mr-2" />
            Appointment Reminders
          </TabsTrigger>
          <TabsTrigger value="internal">
            <Users className="h-4 w-4 mr-2" />
            Internal
          </TabsTrigger>
        </TabsList>

        {/* Unified Inbox Tab - Conversation View */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-300px)]">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
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
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    <Button
                      variant={filterType === "sms" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("sms")}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      SMS
                    </Button>
                    <Button
                      variant={filterType === "in-app" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("in-app")}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-420px)]">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground px-4">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.clientId}
                          onClick={() => setSelectedConversation(conv)}
                          className={`w-full text-left p-4 hover:bg-muted transition-colors ${
                            selectedConversation?.clientId === conv.clientId
                              ? "bg-muted border-l-4 border-l-primary"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold truncate">
                                  {conv.clientName}
                                </span>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                {conv.channels.map((channel) => (
                                  <span key={channel} className="text-muted-foreground">
                                    {getChannelIcon(channel)}
                                  </span>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.body}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">
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
                        <div className="flex items-center gap-2 mt-1">
                          {selectedConversation.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="capitalize">
                              {getChannelIcon(channel)}
                              <span className="ml-1">{channel === "in-app" ? "Chat" : channel}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComposeModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-420px)]">
                      <div className="p-4 space-y-4">
                        {conversationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${
                              msg.direction === "outbound" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.direction === "inbound" && (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {getChannelIcon(msg.type)}
                              </div>
                            )}
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.direction === "outbound"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={
                                    msg.direction === "outbound" ? "secondary" : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {getChannelIcon(msg.type)}
                                  <span className="ml-1 capitalize">
                                    {msg.type === "in-app" ? "Chat" : msg.type}
                                  </span>
                                </Badge>
                                {!msg.hasRead && msg.direction === "inbound" && (
                                  <Badge variant="destructive" className="text-xs">
                                    Unread
                                  </Badge>
                                )}
                              </div>
                              {msg.subject && (
                                <div className="font-semibold mb-1">{msg.subject}</div>
                              )}
                              <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((att) => (
                                    <div
                                      key={att.id}
                                      className="flex items-center gap-2 p-2 bg-background/50 rounded text-xs"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span className="truncate">{att.name}</span>
                                      <span className="text-muted-foreground">
                                        ({(att.size / 1024).toFixed(1)} KB)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="text-xs opacity-70 mt-2">
                                {formatTimestamp(msg.timestamp)}
                                {msg.status && (
                                  <span className="ml-2 capitalize">• {msg.status}</span>
                                )}
                              </div>
                            </div>
                            {msg.direction === "outbound" && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <MessageSquare className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm mt-2">
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Quick updates sent to pet owners
                  </p>
                </div>
                <Button onClick={() => setShowPetUpdateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {petUpdates.map((update) => (
                  <div key={update.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{update.petName}</span>
                          <Badge variant="outline" className="capitalize">
                            {update.updateType}
                          </Badge>
                        </div>
                        <p className="text-sm">{update.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {update.staffName} • {formatTimestamp(update.timestamp)}
                        </p>
                      </div>
                      <Badge
                        variant={update.notificationSent ? "default" : "secondary"}
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

        {/* Internal Communications Tab */}
        <TabsContent value="internal" className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 mb-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Internal Team Communication</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff-to-staff messaging separate from customer communication. 
                  This feature can be moved to a dedicated Staff/Operations section if preferred.
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Internal Team Communications
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Team messages with @mentions, channels, and read receipts
                  </p>
                </div>
                <Button onClick={() => setShowComposeModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {internalMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
                          {msg.hasRead.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {msg.hasRead.length} read
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <ComposeMessageModal onClose={() => setShowComposeModal(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showPetUpdateModal} onOpenChange={setShowPetUpdateModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <PetUpdateModal onClose={() => setShowPetUpdateModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
