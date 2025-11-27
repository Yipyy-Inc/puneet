"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone,
  Video,
  MoreVertical,
  Send,
  Smile,
  Paperclip,
  ArrowLeft,
  Search,
  MessageSquare,
} from "lucide-react";
import { ChatConversation } from "@/data/chats";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  conversations: ChatConversation[];
  selectedChat: ChatConversation | null;
  onSelectChat: (chat: ChatConversation | null) => void;
  onSendMessage: (message: string) => void;
}

export function ChatPanel({
  conversations,
  selectedChat,
  onSelectChat,
  onSendMessage,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getParticipantName = (chat: ChatConversation) => {
    const participant = chat.participants.find(
      (p) => !p.includes("Support") && !p.includes("Agent"),
    );
    return participant?.replace(/\s*\(.*?\)\s*/g, "") || "Unknown";
  };

  const filteredConversations = conversations.filter((chat) => {
    const participantName = getParticipantName(chat).toLowerCase();
    const facility = (chat.facility || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return participantName.includes(query) || facility.includes(query);
  });

  // List view when no chat is selected
  if (!selectedChat) {
    return (
      <Card className="flex flex-col h-full rounded-none border-l border-t-0 border-b-0 border-r-0 shadow-none">
        {/* Header */}
        <CardHeader className="border-b px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Live Chat Support</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </CardHeader>

        {/* Conversations List */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((chat) => {
                  const participantName = getParticipantName(chat);
                  const lastMessage = chat.messages[chat.messages.length - 1];
                  const isActive = chat.status === "Active";

                  return (
                    <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat)}
                      className="w-full p-3 rounded-xl hover:bg-muted/50 transition-all text-left flex items-start gap-3 mb-1 group"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-medium">
                            {getInitials(participantName)}
                          </AvatarFallback>
                        </Avatar>
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background status-online" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate text-foreground">
                            {participantName}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(chat.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {chat.facility}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-1 group-hover:text-foreground/70 transition-colors">
                          {lastMessage?.message || "No messages yet"}
                        </p>
                      </div>
                      {isActive && (
                        <Badge className="shrink-0 text-xs bg-success/10 text-success hover:bg-success/20 border-0">
                          Active
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Chat detail view
  const participantName = getParticipantName(selectedChat);
  const isActive = selectedChat.status === "Active";

  return (
    <Card className="flex flex-col h-full rounded-none border-l border-t-0 border-b-0 border-r-0 shadow-none">
      {/* Chat Header */}
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 hover:bg-muted"
            onClick={() => onSelectChat(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
                {getInitials(participantName)}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background status-online" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-foreground">
              {participantName}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {selectedChat.facility}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Activity Label */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
          Activity
        </p>
      </div>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {selectedChat.messages.map((msg) => {
              const isSupport =
                msg.sender.includes("Support") || msg.sender.includes("Agent");
              const senderName = msg.sender.replace(/\s*\(.*?\)\s*/g, "");

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    isSupport ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {!isSupport && (
                    <Avatar className="h-8 w-8 shrink-0 border border-border shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      isSupport ? "items-end" : "items-start",
                    )}
                  >
                    {!isSupport && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                        isSupport
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md border border-border/50",
                      )}
                    >
                      {msg.message}
                    </div>
                    {isSupport && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Write a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pr-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 shadow-sm"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
