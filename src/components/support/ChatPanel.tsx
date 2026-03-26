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
import { VariableInsertDropdown } from "@/components/shared/VariableInsertDropdown";
import { useInsertAtCursor } from "@/hooks/use-insert-at-cursor";

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
  const chatInputRef = useRef<HTMLInputElement>(null);
  const insertVariable = useInsertAtCursor(
    chatInputRef,
    newMessage,
    setNewMessage,
  );

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
      <Card className="flex h-full flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l shadow-none">
        {/* Header */}
        <CardHeader className="border-b px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="text-primary size-4" />
            </div>
            <CardTitle className="text-lg">Live Chat Support</CardTitle>
          </div>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/50 border-0 pl-9 focus-visible:ring-1"
            />
          </div>
        </CardHeader>

        {/* Conversations List */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-50" />
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
                      className="group hover:bg-muted/50 mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all"
                    >
                      <div className="relative">
                        <Avatar className="border-background h-10 w-10 border-2 shadow-sm">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-medium">
                            {getInitials(participantName)}
                          </AvatarFallback>
                        </Avatar>
                        {isActive && (
                          <span className="status-online border-background bg-success absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground truncate text-sm font-medium">
                            {participantName}
                          </span>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(chat.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {chat.facility}
                        </p>
                        <p className="text-muted-foreground group-hover:text-foreground/70 mt-1 truncate text-sm transition-colors">
                          {lastMessage?.message || "No messages yet"}
                        </p>
                      </div>
                      {isActive && (
                        <Badge className="bg-success/10 text-success hover:bg-success/20 shrink-0 border-0 text-xs">
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
    <Card className="flex h-full flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l shadow-none">
      {/* Chat Header */}
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted h-8 w-8 shrink-0"
            onClick={() => onSelectChat(null)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="relative">
            <Avatar className="border-background h-11 w-11 border-2 shadow-sm">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
                {getInitials(participantName)}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="status-online border-background bg-success absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate font-semibold">
              {participantName}
            </h3>
            <p className="text-muted-foreground truncate text-sm">
              {selectedChat.facility}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="hover:border-primary/50 hover:bg-primary/10 hover:text-primary h-9 w-9 rounded-full transition-colors"
          >
            <Phone className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hover:border-primary/50 hover:bg-primary/10 hover:text-primary h-9 w-9 rounded-full transition-colors"
          >
            <Video className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hover:bg-muted h-9 w-9 rounded-full transition-colors"
          >
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Activity Label */}
      <div className="bg-muted/30 border-b px-4 py-2">
        <p className="text-muted-foreground text-center text-xs font-medium tracking-wider uppercase">
          Activity
        </p>
      </div>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {selectedChat.messages.map((msg) => {
              const isSupport =
                msg.sender.includes("Support") || msg.sender.includes("Agent");
              const senderName = msg.sender.replace(/\s*\(.*?\)\s*/g, "");

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "animate-fade-in flex gap-3",
                    isSupport ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {!isSupport && (
                    <Avatar className="border-border h-8 w-8 shrink-0 border shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "flex max-w-[80%] flex-col",
                      isSupport ? "items-end" : "items-start",
                    )}
                  >
                    {!isSupport && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-foreground text-xs font-medium">
                          {senderName}
                        </span>
                        <span className="text-muted-foreground text-xs">
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
                          : `border-border/50 bg-muted text-foreground rounded-bl-md border`,
                      )}
                    >
                      {msg.message}
                    </div>
                    {isSupport && (
                      <span className="text-muted-foreground mt-1 text-xs">
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
      <div className="bg-card border-t p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 shrink-0"
          >
            <Paperclip className="size-4" />
          </Button>
          <div className="relative flex-1">
            <Input
              ref={chatInputRef}
              placeholder="Write a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="bg-muted/50 focus-visible:ring-primary border-0 pr-10 focus-visible:ring-1"
            />
          </div>
          <VariableInsertDropdown context="general" onInsert={insertVariable} />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 shrink-0"
          >
            <Smile className="size-4" />
          </Button>
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 h-9 w-9 shrink-0 shadow-sm"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
