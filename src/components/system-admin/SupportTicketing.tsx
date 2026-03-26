"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import {
  supportTickets,
  supportAgents,
  slaConfigs,
  getTicketStats,
  SupportTicket,
  SupportAgent,
  TicketTimelineEvent,
} from "@/data/support-tickets";
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  AlertTriangle,
  Timer,
  TrendingUp,
  Eye,
  MoreVertical,
  Play,
  CheckCircle2,
  XCircle,
  UserPlus,
  MessageSquare,
  ArrowUpCircle,
  History,
  Settings,
  Shield,
  Edit,
  FileText,
  Send,
  RefreshCw,
  CircleDot,
  Circle,
  ArrowRight,
  User,
  Building,
  Tag,
  Calendar,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function SupportTicketing() {
  const [ticketsState, setTicketsState] = useState(supportTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSLAModalOpen, setIsSLAModalOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("tickets");
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");

  const stats = useMemo(() => getTicketStats(), []);

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

  const assignTicket = (ticketId: string, agentId: string) => {
    const agent = supportAgents.find((a) => a.id === agentId);
    if (!agent) return;

    setTicketsState((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              assignedTo: agent.name,
              assignedAgentId: agentId,
              updatedAt: new Date().toISOString(),
            }
          : ticket,
      ),
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              assignedTo: agent.name,
              assignedAgentId: agentId,
              updatedAt: new Date().toISOString(),
            }
          : null,
      );
    }
    setIsAssignModalOpen(false);
    setSelectedAgentId("");
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;
    updateTicketStatus(selectedTicket.id, "Resolved");
    setIsResolveDialogOpen(false);
    setResolutionNote("");
  };

  const getStatusColor = (status: SupportTicket["status"]) => {
    switch (status) {
      case "Open":
        return "bg-warning/10 text-warning border-warning/20";
      case "In Progress":
        return "bg-info/10 text-info border-info/20";
      case "Resolved":
      case "Closed":
        return "bg-success/10 text-success border-success/20";
      case "Escalated":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Pending":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "High":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "Medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "Low":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAgentStatusColor = (status: SupportAgent["status"]) => {
    switch (status) {
      case "Available":
        return "bg-success";
      case "Busy":
        return "bg-warning";
      case "Away":
        return "bg-orange-500";
      case "Offline":
        return "bg-muted-foreground";
      default:
        return "bg-muted-foreground";
    }
  };

  const getSLAStatus = (ticket: SupportTicket) => {
    if (!ticket.sla) return null;
    const now = new Date();
    const resolutionDue = new Date(ticket.sla.resolutionDue);
    const hoursRemaining =
      (resolutionDue.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (ticket.status === "Resolved" || ticket.status === "Closed") {
      return ticket.sla.resolutionMet
        ? { status: "met", label: "SLA Met", color: "text-success" }
        : {
            status: "breached",
            label: "SLA Breached",
            color: "text-destructive",
          };
    }

    if (hoursRemaining < 0) {
      return {
        status: "breached",
        label: "SLA Breached",
        color: "text-destructive",
      };
    } else if (hoursRemaining < 2) {
      return {
        status: "critical",
        label: "SLA Critical",
        color: "text-destructive",
      };
    } else if (hoursRemaining < 4) {
      return { status: "warning", label: "SLA Warning", color: "text-warning" };
    }
    return { status: "on-track", label: "On Track", color: "text-success" };
  };

  const getTimelineIcon = (type: TicketTimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return <CircleDot className="text-primary size-4" />;
      case "status_change":
        return <RefreshCw className="text-info size-4" />;
      case "assignment":
        return <UserPlus className="text-success size-4" />;
      case "priority_change":
        return <ArrowUpCircle className="text-warning size-4" />;
      case "message":
        return <MessageSquare className="text-primary size-4" />;
      case "sla_update":
        return <Timer className="text-info size-4" />;
      case "escalation":
        return <AlertTriangle className="text-destructive size-4" />;
      case "note":
        return <FileText className="text-muted-foreground size-4" />;
      default:
        return <Circle className="text-muted-foreground size-4" />;
    }
  };

  const formatTimelineEvent = (event: TicketTimelineEvent) => {
    switch (event.type) {
      case "created":
        return event.details.message || "Ticket created";
      case "status_change":
        return `Status changed from ${event.details.from} to ${event.details.to}`;
      case "assignment":
        return `Assigned to ${event.details.to}${event.details.message ? ` - ${event.details.message}` : ""}`;
      case "priority_change":
        return `Priority changed from ${event.details.from} to ${event.details.to}`;
      case "message":
        return event.details.message || "Message sent";
      case "escalation":
        return event.details.message || "Ticket escalated";
      case "note":
        return event.details.note || "Note added";
      default:
        return event.details.message || "Activity recorded";
    }
  };

  const ticketColumns: ColumnDef<SupportTicket>[] = [
    {
      key: "id",
      label: "Ticket ID",
      icon: Ticket,
      defaultVisible: true,
      render: (ticket) => (
        <span className="font-mono text-sm font-medium">{ticket.id}</span>
      ),
    },
    {
      key: "title",
      label: "Title",
      icon: MessageSquare,
      defaultVisible: true,
      render: (ticket) => (
        <div className="max-w-[300px]">
          <p className="truncate font-medium">{ticket.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {ticket.facility}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CheckCircle,
      defaultVisible: true,
      render: (ticket) => (
        <Badge className={` ${getStatusColor(ticket.status)} border`}>
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
        <Badge className={` ${getPriorityColor(ticket.priority)} border`}>
          {ticket.priority}
        </Badge>
      ),
    },
    {
      key: "sla",
      label: "SLA Status",
      icon: Timer,
      defaultVisible: true,
      render: (ticket) => {
        const slaStatus = getSLAStatus(ticket);
        if (!slaStatus) return <span className="text-muted-foreground">-</span>;
        return (
          <span className={`text-sm font-medium ${slaStatus.color} `}>
            {slaStatus.label}
          </span>
        );
      },
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      icon: Users,
      defaultVisible: true,
      render: (ticket) => (
        <span className={ticket.assignedTo ? "" : "text-muted-foreground"}>
          {ticket.assignedTo || "Unassigned"}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      icon: Tag,
      defaultVisible: true,
    },
    {
      key: "createdAt",
      label: "Created",
      icon: Clock,
      defaultVisible: true,
      render: (ticket) => (
        <span className="text-sm">
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      ),
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
        { value: "Escalated", label: "Escalated" },
        { value: "Pending", label: "Pending" },
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

  const getTicketActions = (ticket: SupportTicket) => {
    const actions = [];

    actions.push({
      label: "Assign Agent",
      icon: UserPlus,
      onClick: () => {
        setSelectedTicket(ticket);
        setIsAssignModalOpen(true);
      },
    });

    if (ticket.status === "Open") {
      actions.push({
        label: "Start Progress",
        icon: Play,
        onClick: () => updateTicketStatus(ticket.id, "In Progress"),
      });
    }

    if (ticket.status === "Open" || ticket.status === "In Progress") {
      actions.push({
        label: "Escalate",
        icon: ArrowUpCircle,
        onClick: () => updateTicketStatus(ticket.id, "Escalated"),
        variant: "warning" as const,
      });
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

    if (ticket.status === "Escalated") {
      actions.push({
        label: "De-escalate",
        icon: Play,
        onClick: () => updateTicketStatus(ticket.id, "In Progress"),
      });
    }

    if (ticket.status === "Resolved") {
      actions.push({
        label: "Close Ticket",
        icon: XCircle,
        onClick: () => updateTicketStatus(ticket.id, "Closed"),
      });
      actions.push({
        label: "Reopen Ticket",
        icon: RefreshCw,
        onClick: () => updateTicketStatus(ticket.id, "Open"),
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Support & Ticketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage support tickets, assign agents, and track SLAs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSLAModalOpen(true)}>
            <Settings className="mr-2 size-4" />
            SLA Settings
          </Button>
          <Button onClick={() => setIsCreateTicketModalOpen(true)}>
            <Ticket className="mr-2 size-4" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          title="Total Tickets"
          value={stats.total.toString()}
          icon={Ticket}
          variant="default"
          subtitle="All tickets"
        />
        <StatCard
          title="Open"
          value={stats.open.toString()}
          icon={AlertCircle}
          variant="warning"
          subtitle="Awaiting action"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress.toString()}
          icon={Clock}
          variant="info"
          subtitle="Being worked on"
        />
        <StatCard
          title="Escalated"
          value={stats.escalated.toString()}
          icon={AlertTriangle}
          variant="warning"
          subtitle="Need attention"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved.toString()}
          icon={CheckCircle}
          variant="success"
          subtitle="Completed"
        />
        <StatCard
          title="SLA Breached"
          value={stats.breached.toString()}
          icon={Timer}
          variant="secondary"
          subtitle="Past due"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-12 w-full max-w-lg grid-cols-3">
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="size-4" />
            All Tickets
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="size-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Timer className="size-4" />
            SLA Config
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Support Tickets</CardTitle>
              <CardDescription>
                View, assign, and manage all support tickets with SLA tracking
              </CardDescription>
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
                                  : action.variant === "warning"
                                    ? `text-warning focus:text-warning`
                                    : ""
                              }
                            >
                              <action.icon className="mr-2 size-4" />
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {supportAgents.map((agent) => (
              <Card
                key={agent.id}
                className="transition-shadow hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="from-primary/20 to-primary/5 text-primary flex size-12 items-center justify-center rounded-full bg-linear-to-br text-lg font-semibold">
                        {agent.name.charAt(0)}
                      </div>
                      <span
                        className={`border-background absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 ${getAgentStatusColor(agent.status)} `}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="truncate font-semibold">{agent.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {agent.role}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {agent.department}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {agent.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        className={` ${
                          agent.status === "Available"
                            ? "bg-success/10 text-success"
                            : agent.status === "Busy"
                              ? "bg-warning/10 text-warning"
                              : agent.status === "Away"
                                ? "bg-orange-500/10 text-orange-600"
                                : "bg-muted text-muted-foreground"
                        } border-0`}
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Active Tickets
                      </span>
                      <span className="font-medium">{agent.activeTickets}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Specializations
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.specializations.map((spec) => (
                          <Badge
                            key={spec}
                            variant="outline"
                            className="text-xs"
                          >
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SLA Config Tab */}
        <TabsContent value="sla" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {slaConfigs.map((sla) => (
              <Card key={sla.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Badge
                        className={` ${getPriorityColor(sla.priority)} border`}
                      >
                        {sla.priority}
                      </Badge>
                      {sla.name}
                    </CardTitle>
                    <Button variant="ghost" size="sm">
                      <Edit className="size-4" />
                    </Button>
                  </div>
                  <CardDescription>{sla.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-primary text-2xl font-bold">
                        {sla.firstResponseTime < 1
                          ? `${sla.firstResponseTime * 60}m`
                          : `${sla.firstResponseTime}h`}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        First Response
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-warning text-2xl font-bold">
                        {sla.escalationTime}h
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Escalation
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-success text-2xl font-bold">
                        {sla.resolutionTime}h
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Resolution
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SLA Performance Overview */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5" />
                SLA Performance Overview
              </CardTitle>
              <CardDescription>
                Current month performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      First Response SLA
                    </span>
                    <span className="text-success text-sm font-semibold">
                      94%
                    </span>
                  </div>
                  <Progress value={94} className="h-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    47/50 tickets met
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Resolution SLA</span>
                    <span className="text-warning text-sm font-semibold">
                      88%
                    </span>
                  </div>
                  <Progress value={88} className="h-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    44/50 tickets met
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Avg Response Time
                    </span>
                    <span className="text-sm font-semibold">45 min</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Target: 1 hour
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Avg Resolution Time
                    </span>
                    <span className="text-sm font-semibold">6.2 hrs</span>
                  </div>
                  <Progress value={82} className="h-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Target: 8 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="flex max-h-[90vh] min-w-5xl flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <span className="text-primary font-mono">
                      {selectedTicket?.id}
                    </span>
                    <ArrowRight className="text-muted-foreground size-4" />
                    {selectedTicket?.title}
                  </DialogTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {selectedTicket?.category} • {selectedTicket?.subcategory}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={` ${getStatusColor(selectedTicket?.status || "Open")} border`}
                  >
                    {selectedTicket?.status}
                  </Badge>
                  <Badge
                    className={` ${getPriorityColor(selectedTicket?.priority || "Low")} border`}
                  >
                    {selectedTicket?.priority}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {selectedTicket && (
              <div className="grid grid-cols-3 gap-6">
                {/* Main Content - 2 columns */}
                <div className="col-span-2 space-y-6">
                  {/* Description */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h4 className="mb-2 text-sm font-medium">Description</h4>
                    <p className="text-sm">{selectedTicket.description}</p>
                  </div>

                  {/* SLA Status */}
                  {selectedTicket.sla && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Timer className="size-4" />
                          SLA Tracking
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-muted-foreground mb-1 text-xs">
                              First Response
                            </p>
                            <p
                              className={`text-sm font-medium ${
                                selectedTicket.sla.firstResponseMet
                                  ? `text-success`
                                  : `text-muted-foreground`
                              } `}
                            >
                              {selectedTicket.sla.firstResponseMet
                                ? "✓ Met"
                                : "Pending"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Due:{" "}
                              {new Date(
                                selectedTicket.sla.firstResponseDue,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground mb-1 text-xs">
                              Escalation
                            </p>
                            <p
                              className={`text-sm font-medium ${
                                selectedTicket.sla.isEscalated
                                  ? `text-destructive`
                                  : `text-muted-foreground`
                              } `}
                            >
                              {selectedTicket.sla.isEscalated
                                ? "⚠ Escalated"
                                : "Not Escalated"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Due:{" "}
                              {new Date(
                                selectedTicket.sla.escalationDue,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground mb-1 text-xs">
                              Resolution
                            </p>
                            <p
                              className={`text-sm font-medium ${getSLAStatus(selectedTicket)?.color} `}
                            >
                              {getSLAStatus(selectedTicket)?.label}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Due:{" "}
                              {new Date(
                                selectedTicket.sla.resolutionDue,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Messages */}
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
                              msg.sender !== selectedTicket.requester;
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
                                {msg.isInternal && (
                                  <Badge
                                    variant="outline"
                                    className="mt-2 text-xs"
                                  >
                                    Internal Note
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Reply Box */}
                        <div className="mt-4 flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            className="min-h-20"
                          />
                          <Button className="shrink-0">
                            <Send className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                  {/* Resolution Info */}
                  {selectedTicket.resolution && (
                    <Card className="border-success/20 bg-success/5">
                      <CardHeader className="py-3">
                        <CardTitle className="text-success flex items-center gap-2 text-sm">
                          <CheckCircle2 className="size-4" />
                          Resolution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm">
                          {selectedTicket.resolution.resolutionNote}
                        </p>
                        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
                          <span>
                            Resolved by {selectedTicket.resolution.resolvedBy}
                          </span>
                          <span>
                            {new Date(
                              selectedTicket.resolution.resolvedAt,
                            ).toLocaleString()}
                          </span>
                        </div>
                        {selectedTicket.resolution.satisfactionRating && (
                          <div className="mt-2 flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">
                              Rating:
                            </span>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${
                                  i <
                                  selectedTicket.resolution!.satisfactionRating!
                                    ? `text-warning`
                                    : `text-muted`
                                } `}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar - 1 column */}
                <div className="space-y-4">
                  {/* Ticket Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="text-muted-foreground size-4" />
                        <div>
                          <p className="font-medium">
                            {selectedTicket.requester}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {selectedTicket.requesterEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="text-muted-foreground size-4" />
                        <span>{selectedTicket.facility}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="text-muted-foreground size-4" />
                        <span>{selectedTicket.assignedTo || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="text-muted-foreground size-4" />
                        <span>
                          {new Date(selectedTicket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {selectedTicket.tags &&
                        selectedTicket.tags.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <Tag className="text-muted-foreground mt-0.5 size-4" />
                            <div className="flex flex-wrap gap-1">
                              {selectedTicket.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  {selectedTicket.timeline &&
                    selectedTicket.timeline.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <History className="size-4" />
                            Activity Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {selectedTicket.timeline.map((event, index) => (
                              <div key={event.id} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  {getTimelineIcon(event.type)}
                                  {index <
                                    selectedTicket.timeline!.length - 1 && (
                                    <div className="bg-border mt-1 h-full w-px" />
                                  )}
                                </div>
                                <div className="flex-1 pb-3">
                                  <p className="text-sm">
                                    {formatTimelineEvent(event)}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    {event.actor} •{" "}
                                    {new Date(event.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Zap className="size-4" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setIsAssignModalOpen(true)}
                      >
                        <UserPlus className="mr-2 size-4" />
                        Assign Agent
                      </Button>
                      {selectedTicket.status === "Open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() =>
                            updateTicketStatus(selectedTicket.id, "In Progress")
                          }
                        >
                          <Play className="mr-2 size-4" />
                          Start Progress
                        </Button>
                      )}
                      {(selectedTicket.status === "Open" ||
                        selectedTicket.status === "In Progress") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-warning hover:text-warning w-full justify-start"
                            onClick={() =>
                              updateTicketStatus(selectedTicket.id, "Escalated")
                            }
                          >
                            <ArrowUpCircle className="mr-2 size-4" />
                            Escalate
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 w-full justify-start"
                            onClick={() => setIsResolveDialogOpen(true)}
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            Resolve
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Agent Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Assign Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Assign ticket{" "}
              <span className="font-mono font-medium">
                {selectedTicket?.id}
              </span>{" "}
              to a support agent
            </p>
            <div>
              <Label>Select Agent</Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {supportAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${getAgentStatusColor(agent.status)} `}
                        />
                        <span>{agent.name}</span>
                        <span className="text-muted-foreground">
                          ({agent.activeTickets} tickets)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAgentId && (
              <div className="bg-muted/50 rounded-lg p-3">
                {(() => {
                  const agent = supportAgents.find(
                    (a) => a.id === selectedAgentId,
                  );
                  return agent ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Department</span>
                        <span className="font-medium">{agent.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Role</span>
                        <Badge variant="outline">{agent.role}</Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Specializations:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {agent.specializations.map((spec) => (
                            <Badge
                              key={spec}
                              variant="outline"
                              className="text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedTicket &&
                assignTicket(selectedTicket.id, selectedAgentId)
              }
              disabled={!selectedAgentId}
            >
              <UserPlus className="mr-2 size-4" />
              Assign Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Ticket Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-success size-5" />
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
              <Label htmlFor="resolution-note">Resolution Note</Label>
              <Textarea
                id="resolution-note"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                rows={4}
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

      {/* SLA Settings Modal */}
      <Dialog open={isSLAModalOpen} onOpenChange={setIsSLAModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              SLA Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Configure Service Level Agreements for different ticket
              priorities. SLAs define response and resolution time targets.
            </p>
            <div className="space-y-4">
              {slaConfigs.map((sla) => (
                <div key={sla.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={` ${getPriorityColor(sla.priority)} border`}
                      >
                        {sla.priority}
                      </Badge>
                      <span className="font-medium">{sla.name}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs">First Response</Label>
                      <Input
                        type="text"
                        value={
                          sla.firstResponseTime < 1
                            ? `${sla.firstResponseTime * 60} minutes`
                            : `${sla.firstResponseTime} hours`
                        }
                        readOnly
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Escalation Time</Label>
                      <Input
                        type="text"
                        value={`${sla.escalationTime} hours`}
                        readOnly
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Resolution Time</Label>
                      <Input
                        type="text"
                        value={`${sla.resolutionTime} hours`}
                        readOnly
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsSLAModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setIsSLAModalOpen(false)}>
              <Shield className="mr-2 size-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog
        open={isCreateTicketModalOpen}
        onOpenChange={setIsCreateTicketModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="size-5" />
              Create New Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-title">Title</Label>
              <Input
                id="ticket-title"
                placeholder="Enter ticket title"
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                placeholder="Describe the issue..."
                rows={4}
                value={newTicketDescription}
                onChange={(e) => setNewTicketDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="Medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue="Technical">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Feature Request">
                      Feature Request
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateTicketModalOpen(false);
                setNewTicketTitle("");
                setNewTicketDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Create a new ticket (showcase only)
                const newTicket: SupportTicket = {
                  id: `TKT-${String(ticketsState.length + 1).padStart(3, "0")}`,
                  title: newTicketTitle,
                  description: newTicketDescription,
                  status: "Open",
                  priority: "Medium",
                  category: "Technical",
                  subcategory: "General",
                  facility: "New Facility",
                  facilityId: "fac-new",
                  requester: "Admin User",
                  requesterEmail: "admin@example.com",
                  assignedTo: undefined,
                  assignedAgentId: undefined,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  tags: [],
                  messages: [],
                  timeline: [],
                };
                setTicketsState((prev) => [newTicket, ...prev]);
                setIsCreateTicketModalOpen(false);
                setNewTicketTitle("");
                setNewTicketDescription("");
              }}
              disabled={!newTicketTitle || !newTicketDescription}
            >
              <Ticket className="mr-2 size-4" />
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
