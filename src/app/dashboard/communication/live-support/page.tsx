"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { supportTickets, SupportTicket } from "@/data/support-tickets";
import { chatConversations, ChatConversation } from "@/data/chats";
import { ChatPanel } from "@/components/support/ChatPanel";
import { StatCard } from "@/components/ui/StatCard";
import {
  MessageSquare,
  Ticket,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Headphones,
  Bug,
  Lightbulb,
  Wrench,
  Plus,
  MoreVertical,
  Play,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function LiveSupportPage() {
  const [ticketsState, setTicketsState] = useState(supportTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(
    null,
  );

  const updateTicketStatus = (
    ticketId: string,
    newStatus: SupportTicket["status"],
  ) => {
    setTicketsState((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : ticket,
      ),
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) =>
        prev
          ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() }
          : null,
      );
    }
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;
    updateTicketStatus(selectedTicket.id, "Resolved");
    setIsResolveDialogOpen(false);
    setResolutionNote("");
  };

  const handleCloseTicket = (ticketId: string) => {
    updateTicketStatus(ticketId, "Closed");
  };

  const handleStartProgress = (ticketId: string) => {
    updateTicketStatus(ticketId, "In Progress");
  };

  const handleReopenTicket = (ticketId: string) => {
    updateTicketStatus(ticketId, "Open");
  };

  const ticketColumns: ColumnDef<SupportTicket>[] = [
    {
      key: "id",
      label: "Ticket ID",
      icon: Ticket,
      defaultVisible: true,
    },
    {
      key: "title",
      label: "Title",
      icon: MessageSquare,
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      icon: CheckCircle,
      defaultVisible: true,
      render: (ticket) => (
        <Badge
          className={
            ticket.status === "Resolved" || ticket.status === "Closed"
              ? `bg-success/10 text-success hover:bg-success/20 border-0`
              : ticket.status === "In Progress"
                ? `bg-info/10 text-info hover:bg-info/20 border-0`
                : `bg-warning/10 text-warning hover:bg-warning/20 border-0`
          }
        >
          {ticket.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      icon: AlertCircle,
      defaultVisible: true,
      render: (ticket) => (
        <Badge
          className={
            ticket.priority === "Urgent"
              ? `bg-destructive/10 text-destructive hover:bg-destructive/20 border-0`
              : ticket.priority === "High"
                ? `bg-destructive/10 text-destructive hover:bg-destructive/20 border-0`
                : ticket.priority === "Medium"
                  ? `bg-warning/10 text-warning hover:bg-warning/20 border-0`
                  : "bg-muted text-muted-foreground border-0"
          }
        >
          {ticket.priority}
        </Badge>
      ),
    },
    {
      key: "category",
      label: "Category",
      icon: Wrench,
      defaultVisible: true,
      render: (ticket) => {
        const categoryIcons: Record<string, React.ReactNode> = {
          Technical: <Bug className="mr-1 h-3 w-3" />,
          Billing: <Ticket className="mr-1 h-3 w-3" />,
          Service: <Headphones className="mr-1 h-3 w-3" />,
          "Feature Request": <Lightbulb className="mr-1 h-3 w-3" />,
        };
        return (
          <span className="flex items-center text-sm">
            {categoryIcons[ticket.category] || null}
            {ticket.category}
          </span>
        );
      },
    },
    {
      key: "requester",
      label: "Requester",
      icon: Users,
      defaultVisible: true,
    },
    {
      key: "facility",
      label: "Facility",
      icon: MessageSquare,
      defaultVisible: true,
    },
    {
      key: "createdAt",
      label: "Created",
      icon: Clock,
      defaultVisible: true,
      render: (ticket) => new Date(ticket.createdAt).toLocaleDateString(),
    },
  ];

  const ticketFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "Open", label: "Open" },
        { value: "In Progress", label: "In Progress" },
        { value: "Resolved", label: "Resolved" },
        { value: "Closed", label: "Closed" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
        { value: "Urgent", label: "Urgent" },
      ],
    },
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        { value: "Technical", label: "Technical" },
        { value: "Billing", label: "Billing" },
        { value: "Service", label: "Service" },
        { value: "Feature Request", label: "Feature Request" },
      ],
    },
  ];

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
  };

  const getTicketActions = (ticket: SupportTicket) => {
    const actions = [];

    if (ticket.status === "Open") {
      actions.push({
        label: "Start Progress",
        icon: Play,
        onClick: () => handleStartProgress(ticket.id),
      });
    }

    if (ticket.status === "Open" || ticket.status === "In Progress") {
      actions.push({
        label: "Resolve Ticket",
        icon: CheckCircle2,
        onClick: () => {
          setSelectedTicket(ticket);
          setIsResolveDialogOpen(true);
        },
        variant: "success" as const,
      });
    }

    if (ticket.status === "Resolved") {
      actions.push({
        label: "Close Ticket",
        icon: XCircle,
        onClick: () => handleCloseTicket(ticket.id),
      });
      actions.push({
        label: "Reopen Ticket",
        icon: Play,
        onClick: () => handleReopenTicket(ticket.id),
      });
    }

    if (ticket.status === "Closed") {
      actions.push({
        label: "Reopen Ticket",
        icon: Play,
        onClick: () => handleReopenTicket(ticket.id),
      });
    }

    return actions;
  };

  // Calculate stats
  const openTickets = ticketsState.filter((t) => t.status === "Open").length;
  const inProgressTickets = ticketsState.filter(
    (t) => t.status === "In Progress",
  ).length;
  const activeChats = chatConversations.filter(
    (c) => c.status === "Active",
  ).length;
  const resolvedTickets = ticketsState.filter(
    (t) => t.status === "Resolved" || t.status === "Closed",
  ).length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Live Support</h1>
            <p className="text-muted-foreground mt-1">
              Real-time chat support and ticket management for facilities
            </p>
          </div>
          <Button className="shadow-sm">
            <Plus className="mr-2 size-4" />
            Create Ticket
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open Tickets"
            value={openTickets.toString()}
            icon={Ticket}
            variant="warning"
            subtitle="Awaiting response"
          />
          <StatCard
            title="In Progress"
            value={inProgressTickets.toString()}
            icon={Clock}
            variant="info"
            subtitle="Being worked on"
          />
          <StatCard
            title="Active Chats"
            value={activeChats.toString()}
            icon={Headphones}
            variant="success"
            subtitle="Live conversations"
          />
          <StatCard
            title="Resolved"
            value={resolvedTickets.toString()}
            icon={CheckCircle}
            variant="default"
            subtitle="This month"
          />
        </div>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid h-12 w-full max-w-md grid-cols-2">
            <TabsTrigger
              value="tickets"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <Ticket className="size-4" />
              Support Tickets ({ticketsState.length})
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <MessageSquare className="size-4" />
              Chat History ({chatConversations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Support Tickets</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Manage and track support requests from facilities
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={ticketsState}
                  columns={ticketColumns}
                  filters={ticketFilters}
                  searchKey="title"
                  searchPlaceholder="Search tickets..."
                  itemsPerPage={10}
                  actions={(ticket) => {
                    const ticketActions = getTicketActions(ticket);
                    return (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsTicketModalOpen(true);
                          }}
                          className="hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ticketActions.map((action, index) => (
                              <DropdownMenuItem
                                key={index}
                                onClick={action.onClick}
                                className={
                                  action.variant === "success"
                                    ? `text-success focus:text-success`
                                    : ""
                                }
                              >
                                <action.icon className="mr-2 size-4" />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsTicketModalOpen(true);
                              }}
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chatConversations.map((chat) => {
                const isActive = chat.status === "Active";
                const participantName =
                  chat.participants
                    .find((p) => !p.includes("Support") && !p.includes("Agent"))
                    ?.replace(/\s*\(.*?\)\s*/g, "") || "Unknown";
                return (
                  <Card
                    key={chat.id}
                    className="hover:shadow-elevated hover-lift cursor-pointer transition-all"
                    onClick={() => setSelectedChat(chat)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="bg-gradient-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-medium">
                              {participantName.charAt(0)}
                            </div>
                            {isActive && (
                              <span className="status-online border-background bg-success absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {participantName}
                            </CardTitle>
                            <p className="text-muted-foreground text-xs">
                              {chat.facility}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            isActive
                              ? `bg-success/10 text-success hover:bg-success/20 border-0`
                              : "bg-muted text-muted-foreground border-0"
                          }
                        >
                          {chat.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {chat.messages[chat.messages.length - 1]?.message ||
                          "No messages yet"}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <p className="text-muted-foreground text-xs">
                          {chat.messages.length} messages
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Ticket Detail Modal */}
        <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
          <DialogContent className="flex max-h-[90vh] min-w-5xl flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl">
                  {selectedTicket?.title}
                </DialogTitle>
                <p className="text-muted-foreground text-sm">
                  {selectedTicket?.id} • {selectedTicket?.category}
                </p>
              </DialogHeader>
              {selectedTicket && (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm">{selectedTicket.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                        <span className="text-muted-foreground text-sm">
                          Status
                        </span>
                        <Badge
                          className={
                            selectedTicket.status === "Resolved" ||
                            selectedTicket.status === "Closed"
                              ? "bg-success/10 text-success border-0"
                              : selectedTicket.status === "In Progress"
                                ? "bg-info/10 text-info border-0"
                                : "bg-warning/10 text-warning border-0"
                          }
                        >
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                        <span className="text-muted-foreground text-sm">
                          Priority
                        </span>
                        <Badge
                          className={
                            selectedTicket.priority === "Urgent" ||
                            selectedTicket.priority === "High"
                              ? "bg-destructive/10 text-destructive border-0"
                              : selectedTicket.priority === "Medium"
                                ? "bg-warning/10 text-warning border-0"
                                : "bg-muted text-muted-foreground border-0"
                          }
                        >
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                        <span className="text-muted-foreground text-sm">
                          Requester
                        </span>
                        <span className="text-sm font-medium">
                          {selectedTicket.requester}
                        </span>
                      </div>
                      <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                        <span className="text-muted-foreground text-sm">
                          Facility
                        </span>
                        <span className="text-sm font-medium">
                          {selectedTicket.facility}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                      <span className="text-muted-foreground text-sm">
                        Created
                      </span>
                      <span className="text-sm">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                      <span className="text-muted-foreground text-sm">
                        Assigned To
                      </span>
                      <span className="text-sm">
                        {selectedTicket.assignedTo || "Unassigned"}
                      </span>
                    </div>
                  </div>
                  {selectedTicket.messages &&
                    selectedTicket.messages.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 font-semibold">
                          <MessageSquare className="size-4" />
                          Conversation ({selectedTicket.messages.length})
                        </h4>
                        <div className="space-y-3">
                          {selectedTicket.messages.map((msg) => {
                            const isSupport =
                              msg.sender.includes("Support") ||
                              msg.sender.includes("Agent");
                            return (
                              <div
                                key={msg.id}
                                className={`rounded-xl p-4 ${
                                  isSupport
                                    ? "bg-primary/10 ml-8"
                                    : "bg-muted/50 mr-8"
                                } `}
                              >
                                <div className="mb-2 flex items-start justify-between">
                                  <span className="text-sm font-medium">
                                    {msg.sender}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {new Date(msg.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Action Buttons */}
                  {selectedTicket.status !== "Closed" && (
                    <div className="flex items-center gap-2 border-t pt-4">
                      {selectedTicket.status === "Open" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStartProgress(selectedTicket.id)}
                        >
                          <Play className="mr-2 size-4" />
                          Start Progress
                        </Button>
                      )}
                      {(selectedTicket.status === "Open" ||
                        selectedTicket.status === "In Progress") && (
                        <Button
                          className="bg-success hover:bg-success/90"
                          onClick={() => setIsResolveDialogOpen(true)}
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          Resolve Ticket
                        </Button>
                      )}
                      {selectedTicket.status === "Resolved" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                          >
                            <XCircle className="mr-2 size-4" />
                            Close Ticket
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleReopenTicket(selectedTicket.id)
                            }
                          >
                            <Play className="mr-2 size-4" />
                            Reopen
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Resolve Ticket Dialog */}
        <Dialog
          open={isResolveDialogOpen}
          onOpenChange={setIsResolveDialogOpen}
        >
          <DialogContent className="min-w-5xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-success h-5 w-5" />
                Resolve Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                You are about to resolve ticket:{" "}
                <span className="text-foreground font-medium">
                  {selectedTicket?.title}
                </span>
              </p>
              <div>
                <Label htmlFor="resolution-note">
                  Resolution Note (Optional)
                </Label>
                <Textarea
                  id="resolution-note"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResolveDialogOpen(false);
                  setResolutionNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-success hover:bg-success/90"
                onClick={handleResolveTicket}
              >
                <CheckCircle2 className="mr-2 size-4" />
                Resolve Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Right Chat Panel */}
      <div className="w-[380px] shrink-0">
        <ChatPanel
          conversations={chatConversations}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
