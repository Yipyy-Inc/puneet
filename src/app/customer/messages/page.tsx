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
  Clock as ClockIcon,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageAttachmentUpload, type Attachment } from "@/components/customer/MessageAttachmentUpload";
import { facilityConfig } from "@/data/facility-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

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
  deliveryStatus?: "sent" | "delivered" | "read" | "failed"; // For SMS/Email
  senderLabel?: string; // "You" or staff name
}

export default function CustomerMessagesPage() {
  const { selectedFacility } = useCustomerFacility();
  const router = useRouter();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "reminders">("chat");

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
          // Map underlying communication type to a customer-facing channel.
          // Only allow \"email\", \"sms\", or \"in-app\"; everything else becomes undefined.
          channel:
            comm.type === "email" || comm.type === "sms" || comm.type === "in-app"
              ? comm.type
              : undefined,
          facilityId: comm.facilityId,
          facilityName:
            facilities.find((f) => f.id === comm.facilityId)?.name || "Facility",
          subject: comm.subject,
          content: comm.content,
          timestamp: comm.timestamp,
          isRead: comm.status === "read",
          direction: comm.direction,
          staffName: comm.staffName,
          deliveryStatus: comm.status,
          senderLabel: comm.direction === "inbound" ? comm.staffName || "Facility" : "You",
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
          content: `Your ${booking.service} booking for ${new Date(booking.startDate).toLocaleDateString("en-US")} has been confirmed.`,
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
            // Do not expose internal staff notes to customers
            content: `Your ${rc.serviceType} report card for this stay is ready.`,
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
    // Include attachments in the API call
    if (attachments.length > 0) {
      toast.success(`Message sent with ${attachments.length} attachment(s)!`);
    } else {
      toast.success("Message sent!");
    }
    setNewMessage("");
    setAttachments([]);
  };

  // Separate reminders from regular messages
  const chatMessages = useMemo(() => {
    if (!selectedThread) return [];
    const allMessages = messagesByFacility[selectedThread] || [];
    return allMessages.filter((m) => m.type !== "reminder");
  }, [selectedThread, messagesByFacility]);

  const reminderMessages = useMemo(() => {
    return Object.values(messagesByFacility)
      .flat()
      .filter((m) => m.type === "reminder")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messagesByFacility]);

  // Check if facility is currently in office hours
  const isInOfficeHours = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[dayOfWeek] as keyof typeof facilityConfig.checkInOutTimes.operatingHours;
    const hours = facilityConfig.checkInOutTimes.operatingHours[dayName];
    
    if (!hours) return false;
    return currentTime >= hours.open && currentTime <= hours.close;
  }, []);

  const messagingConfig = facilityConfig.messaging;

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
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedThreadData.facilityName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {chatMessages.length} messages
                      {reminderMessages.length > 0 && ` • ${reminderMessages.length} reminders`}
                    </p>
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "reminders")} className="flex-1 flex flex-col">
                <div className="px-4 pt-2 border-b">
                  <TabsList>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="reminders">
                      Reminders
                      {reminderMessages.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {reminderMessages.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Chat Tab */}
                <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                  {/* Office Hours / Auto-Reply Banner */}
                  {messagingConfig?.officeHours?.enabled && (
                    <div className="px-4 pt-4">
                      <Alert variant={isInOfficeHours ? "default" : "default"}>
                        <ClockIcon className="h-4 w-4" />
                        <AlertDescription>
                          {isInOfficeHours ? (
                            <span>{messagingConfig.officeHours.responseTimeExpectation}</span>
                          ) : (
                            <span>{messagingConfig.officeHours.awayMessage}</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {chatMessages.map((message) => (
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
                          {/* Channel, Sender, and Delivery Status */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {/* Channel Icon */}
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                message.direction === "inbound"
                                  ? "bg-background"
                                  : "bg-primary-foreground/20 border-primary-foreground/30"
                              }`}
                            >
                              {message.channel === "email" && <Mail className="h-3 w-3 mr-1" />}
                              {message.channel === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                              {message.channel === "in-app" && <MessageSquare className="h-3 w-3 mr-1" />}
                              {message.type === "booking_confirmation" && <Calendar className="h-3 w-3 mr-1" />}
                              {message.type === "report_card" && <FileText className="h-3 w-3 mr-1" />}
                              {message.channel || (message.type === "booking_confirmation" ? "Booking" : message.type === "report_card" ? "Report Card" : "Message")}
                            </Badge>
                            
                            {/* Sender Label */}
                            <span className="text-xs opacity-80">
                              {message.senderLabel || (message.direction === "inbound" ? message.staffName || "Facility" : "You")}
                            </span>

                            {/* Delivery Status (for SMS/Email) */}
                            {message.deliveryStatus && message.direction === "outbound" && (
                              <div className="flex items-center gap-1 text-xs opacity-70">
                                {message.deliveryStatus === "delivered" && (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Delivered</span>
                                  </>
                                )}
                                {message.deliveryStatus === "read" && (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Read</span>
                                  </>
                                )}
                                {message.deliveryStatus === "sent" && (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span>Sent</span>
                                  </>
                                )}
                                {message.deliveryStatus === "failed" && (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    <span>Failed</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div className="text-xs opacity-70 mb-2">
                            {formatTimestamp(message.timestamp)}
                          </div>

                          {/* Booking Context Link */}
                          {message.bookingId && (
                            <div className="mb-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => router.push(`/customer/bookings?booking=${message.bookingId}`)}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Booking: {bookings.find((b) => b.id === message.bookingId)?.service || "View Details"}
                              </Button>
                            </div>
                          )}

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
                  <div className="max-w-3xl mx-auto space-y-2">
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-2">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{att.name}</span>
                            <span className="text-muted-foreground">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
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
                      </div>
                      <div className="flex flex-col gap-2">
                        <MessageAttachmentUpload
                          attachments={attachments}
                          onAttachmentsChange={setAttachments}
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim() && attachments.length === 0}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                </TabsContent>

                {/* Reminders Tab */}
                <TabsContent value="reminders" className="flex-1 m-0">
                <ScrollArea className="flex-1 p-4">
                  {reminderMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                      <p className="font-semibold">No reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Booking reminders will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {reminderMessages.map((message) => (
                        <Card key={message.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Bell className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    <Bell className="h-3 w-3 mr-1" />
                                    Reminder
                                  </Badge>
                                  {message.bookingId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-6"
                                      onClick={() => router.push(`/customer/bookings?booking=${message.bookingId}`)}
                                    >
                                      <Calendar className="h-3 w-3 mr-1" />
                                      View Booking
                                    </Button>
                                  )}
                                </div>
                                <h4 className="font-semibold mb-1">{message.subject}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{message.content}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimestamp(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                </TabsContent>
              </Tabs>
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
