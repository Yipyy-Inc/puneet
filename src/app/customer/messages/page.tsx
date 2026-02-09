"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clientCommunications } from "@/data/communications";
import { bookings } from "@/data/bookings";
import { reportCards } from "@/data/pet-data";
import { facilities } from "@/data/facilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Search,
  Calendar,
  FileText,
  Bell,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface UnifiedMessage {
  id: string;
  type: "message" | "booking_confirmation" | "reminder" | "report_card" | "notification";
  channel?: "email" | "sms" | "in-app";
  facilityId: number;
  facilityName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  direction: "inbound" | "outbound";
  bookingId?: number;
  reportCardId?: string;
  attachments?: string[];
  staffName?: string;
}

export default function CustomerMessagesPage() {
  const { selectedFacility } = useCustomerFacility();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Get customer's communications and organize by facility
  const messagesByFacility = useMemo(() => {
    const facilityMessages: Record<number, UnifiedMessage[]> = {};

    // Add regular communications
    clientCommunications
      .filter((comm) => comm.clientId === MOCK_CUSTOMER_ID)
      .forEach((comm) => {
        if (!facilityMessages[comm.facilityId]) {
          facilityMessages[comm.facilityId] = [];
        }
        facilityMessages[comm.facilityId].push({
          id: comm.id,
          type: "message",
          channel: comm.type === "call" ? undefined : comm.type,
          facilityId: comm.facilityId,
          facilityName: facilities.find((f) => f.id === comm.facilityId)?.name || "Facility",
          subject: comm.subject,
          content: comm.content,
          timestamp: comm.timestamp,
          isRead: comm.status === "read",
          direction: comm.direction,
          staffName: comm.staffName,
        });
      });

    // Add booking confirmations
    bookings
      .filter((b) => b.clientId === MOCK_CUSTOMER_ID && b.status === "confirmed")
      .forEach((booking) => {
        if (!facilityMessages[booking.facilityId]) {
          facilityMessages[booking.facilityId] = [];
        }
        facilityMessages[booking.facilityId].push({
          id: `booking-${booking.id}`,
          type: "booking_confirmation",
          facilityId: booking.facilityId,
          facilityName: facilities.find((f) => f.id === booking.facilityId)?.name || "Facility",
          subject: `Booking Confirmed - ${booking.service}`,
          content: `Your ${booking.service} booking for ${new Date(booking.startDate).toLocaleDateString()} has been confirmed.`,
          timestamp: booking.startDate,
          isRead: true,
          direction: "outbound",
          bookingId: booking.id,
        });
      });

    // Add reminders (mock - would come from notifications)
    bookings
      .filter((b) => b.clientId === MOCK_CUSTOMER_ID && b.status === "confirmed")
      .forEach((booking) => {
        const bookingDate = new Date(booking.startDate);
        const reminderDate = new Date(bookingDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        
        if (reminderDate <= new Date()) {
          if (!facilityMessages[booking.facilityId]) {
            facilityMessages[booking.facilityId] = [];
          }
          facilityMessages[booking.facilityId].push({
            id: `reminder-${booking.id}`,
            type: "reminder",
            channel: "sms",
            facilityId: booking.facilityId,
            facilityName: "Facility",
            subject: "Appointment Reminder",
            content: `Reminder: Your ${booking.service} appointment is tomorrow at ${booking.checkInTime || "8:00 AM"}`,
            timestamp: reminderDate.toISOString(),
            isRead: false,
            direction: "outbound",
            bookingId: booking.id,
          });
        }
      });

    // Add report cards
    reportCards
      .filter((rc) => {
        const booking = bookings.find((b) => b.id === rc.bookingId);
        return booking?.clientId === MOCK_CUSTOMER_ID;
      })
      .forEach((rc) => {
        const booking = bookings.find((b) => b.id === rc.bookingId);
        if (booking) {
          if (!facilityMessages[booking.facilityId]) {
            facilityMessages[booking.facilityId] = [];
          }
          facilityMessages[booking.facilityId].push({
            id: `report-${rc.id}`,
            type: "report_card",
            facilityId: booking.facilityId,
            facilityName: "Facility",
            subject: `${rc.serviceType} Report Card`,
            content: rc.staffNotes || "Daily report card available",
            timestamp: rc.date,
            isRead: !rc.sentToOwner,
            direction: "outbound",
            bookingId: rc.bookingId,
            reportCardId: rc.id,
            attachments: rc.photos,
          });
        }
      });

    // Sort messages by timestamp within each facility
    Object.keys(facilityMessages).forEach((facilityId) => {
      facilityMessages[parseInt(facilityId)].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    return facilityMessages;
  }, []);

  // Get threads (facilities with messages)
  const threads = useMemo(() => {
    return Object.entries(messagesByFacility).map(([facilityId, messages]) => {
      const unreadCount = messages.filter((m) => !m.isRead).length;
      const latestMessage = messages[0];
      return {
        facilityId: parseInt(facilityId),
        facilityName: latestMessage.facilityName,
        latestMessage: latestMessage.subject,
        latestTimestamp: latestMessage.timestamp,
        unreadCount,
        messages,
      };
    });
  }, [messagesByFacility]);

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.facilityName.toLowerCase().includes(query) ||
        thread.latestMessage.toLowerCase().includes(query) ||
        thread.messages.some((m) =>
          m.content.toLowerCase().includes(query) ||
          m.subject.toLowerCase().includes(query)
        )
    );
  }, [threads, searchQuery]);

  // Get selected thread messages
  const selectedThreadMessages = useMemo(() => {
    if (selectedThread === null) return [];
    return messagesByFacility[selectedThread] || [];
  }, [selectedThread, messagesByFacility]);

  const selectedThreadData = useMemo(() => {
    if (selectedThread === null) return null;
    return threads.find((t) => t.facilityId === selectedThread);
  }, [selectedThread, threads]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedFacility) return;

    // TODO: Replace with actual API call
    toast.success("Message sent!");
    setNewMessage("");
  };

  const getMessageIcon = (message: UnifiedMessage) => {
    switch (message.type) {
      case "booking_confirmation":
        return <CheckCircle2 className="h-4 w-4" />;
      case "reminder":
        return <Bell className="h-4 w-4" />;
      case "report_card":
        return <FileText className="h-4 w-4" />;
      case "notification":
        return <Bell className="h-4 w-4" />;
      default:
        if (message.channel === "email") return <Mail className="h-4 w-4" />;
        if (message.channel === "sms") return <MessageSquare className="h-4 w-4" />;
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Thread List */}
        <div className="w-80 border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Messages</h2>
              <Badge variant="secondary">{threads.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <Card
                    key={thread.facilityId}
                    className={`cursor-pointer transition-all ${
                      selectedThread === thread.facilityId
                        ? "ring-2 ring-primary"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedThread(thread.facilityId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {thread.facilityName}
                            </h3>
                            {thread.unreadCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {thread.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {thread.latestMessage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(thread.latestTimestamp)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content - Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedThreadData ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedThreadData.facilityName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedThreadData.messages.length} messages
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {selectedThreadMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.direction === "inbound" ? "justify-start" : "justify-end"
                      }`}
                    >
                      {message.direction === "inbound" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {getMessageIcon(message)}
                        </div>
                      )}
                      <div
                        className={`flex-1 max-w-[70%] ${
                          message.direction === "inbound" ? "" : "flex flex-col items-end"
                        }`}
                      >
                        <div
                          className={`rounded-lg p-3 ${
                            message.direction === "inbound"
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                message.direction === "inbound"
                                  ? "bg-background"
                                  : "bg-primary-foreground/20 border-primary-foreground/30"
                              }`}
                            >
                              {message.type === "booking_confirmation" && (
                                <>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Booking
                                </>
                              )}
                              {message.type === "reminder" && (
                                <>
                                  <Bell className="h-3 w-3 mr-1" />
                                  Reminder
                                </>
                              )}
                              {message.type === "report_card" && (
                                <>
                                  <FileText className="h-3 w-3 mr-1" />
                                  Report Card
                                </>
                              )}
                              {message.type === "message" && message.channel === "email" && (
                                <>
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email
                                </>
                              )}
                              {message.type === "message" && message.channel === "sms" && (
                                <>
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  SMS
                                </>
                              )}
                              {message.type === "message" && message.channel === "in-app" && (
                                <>
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Message
                                </>
                              )}
                            </Badge>
                            {message.staffName && (
                              <span className="text-xs opacity-80">
                                {message.staffName}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold mb-1">{message.subject}</h4>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((att, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 rounded bg-background/20"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-xs">Photo {idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                      {message.direction === "outbound" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          // TODO: File attachment
                          toast.info("File attachment coming soon");
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a facility from the sidebar to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
