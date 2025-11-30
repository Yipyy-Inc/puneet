"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, ColumnDef, FilterDef } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import {
  supportTickets,
  supportAgents,
  slaConfigs,
  getTicketStats,
  SupportTicket,
  SupportAgent,
  SLAConfig,
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
  Mail,
  Tag,
  Calendar,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function SupportTicketing() {
  const [ticketsState, setTicketsState] = useState(supportTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSLAModalOpen, setIsSLAModalOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("tickets");

  const stats = useMemo(() => getTicketStats(), []);

  const updateTicketStatus = (ticketId: string, newStatus: SupportTicket["status"]) => {
    setTicketsState((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
          : ticket
      )
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
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
          : ticket
      )
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
          : null
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
    const hoursRemaining = (resolutionDue.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (ticket.status === "Resolved" || ticket.status === "Closed") {
      return ticket.sla.resolutionMet
        ? { status: "met", label: "SLA Met", color: "text-success" }
        : { status: "breached", label: "SLA Breached", color: "text-destructive" };
    }

    if (hoursRemaining < 0) {
      return { status: "breached", label: "SLA Breached", color: "text-destructive" };
    } else if (hoursRemaining < 2) {
      return { status: "critical", label: "SLA Critical", color: "text-destructive" };
    } else if (hoursRemaining < 4) {
      return { status: "warning", label: "SLA Warning", color: "text-warning" };
    }
    return { status: "on-track", label: "On Track", color: "text-success" };
  };

  const getTimelineIcon = (type: TicketTimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return <CircleDot className="h-4 w-4 text-primary" />;
      case "status_change":
        return <RefreshCw className="h-4 w-4 text-info" />;
      case "assignment":
        return <UserPlus className="h-4 w-4 text-success" />;
      case "priority_change":
        return <ArrowUpCircle className="h-4 w-4 text-warning" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "sla_update":
        return <Timer className="h-4 w-4 text-info" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "note":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
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
          <p className="font-medium truncate">{ticket.title}</p>
          <p className="text-xs text-muted-foreground truncate">{ticket.facility}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CheckCircle,
      defaultVisible: true,
      render: (ticket) => (
        <Badge className={`${getStatusColor(ticket.status)} border`}>
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
        <Badge className={`${getPriorityColor(ticket.priority)} border`}>
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
          <span className={`text-sm font-medium ${slaStatus.color}`}>
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
          <h1 className="text-3xl font-bold tracking-tight">Support & Ticketing</h1>
          <p className="text-muted-foreground mt-1">
            Manage support tickets, assign agents, and track SLAs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSLAModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            SLA Settings
          </Button>
          <Button>
            <Ticket className="h-4 w-4 mr-2" />
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
        <TabsList className="grid w-full grid-cols-3 h-12 max-w-lg">
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            All Tickets
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Timer className="h-4 w-4" />
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
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ticketActions.map((action, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={action.onClick}
                              className={
                                action.variant === "success"
                                  ? "text-success focus:text-success"
                                  : action.variant === "warning"
                                    ? "text-warning focus:text-warning"
                                    : ""
                              }
                            >
                              <action.icon className="h-4 w-4 mr-2" />
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
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-lg">
                        {agent.name.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${getAgentStatusColor(agent.status)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{agent.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {agent.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.department}</p>
                      <p className="text-xs text-muted-foreground mt-1">{agent.email}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        className={`${
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
                      <span className="text-muted-foreground">Active Tickets</span>
                      <span className="font-medium">{agent.activeTickets}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Specializations</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.specializations.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className={`${getPriorityColor(sla.priority)} border`}>
                        {sla.priority}
                      </Badge>
                      {sla.name}
                    </CardTitle>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>{sla.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {sla.firstResponseTime < 1
                          ? `${sla.firstResponseTime * 60}m`
                          : `${sla.firstResponseTime}h`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">First Response</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-warning">{sla.escalationTime}h</p>
                      <p className="text-xs text-muted-foreground mt-1">Escalation</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-success">{sla.resolutionTime}h</p>
                      <p className="text-xs text-muted-foreground mt-1">Resolution</p>
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
                <TrendingUp className="h-5 w-5" />
                SLA Performance Overview
              </CardTitle>
              <CardDescription>Current month performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">First Response SLA</span>
                    <span className="text-sm text-success font-semibold">94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">47/50 tickets met</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Resolution SLA</span>
                    <span className="text-sm text-warning font-semibold">88%</span>
                  </div>
                  <Progress value={88} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">44/50 tickets met</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Avg Response Time</span>
                    <span className="text-sm font-semibold">45 min</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: 1 hour</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Avg Resolution Time</span>
                    <span className="text-sm font-semibold">6.2 hrs</span>
                  </div>
                  <Progress value={82} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Target: 8 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <span className="font-mono text-primary">{selectedTicket?.id}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {selectedTicket?.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTicket?.category} • {selectedTicket?.subcategory}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(selectedTicket?.status || "Open")} border`}>
                    {selectedTicket?.status}
                  </Badge>
                  <Badge className={`${getPriorityColor(selectedTicket?.priority || "Low")} border`}>
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
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm">{selectedTicket.description}</p>
                  </div>

                  {/* SLA Status */}
                  {selectedTicket.sla && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Timer className="h-4 w-4" />
                          SLA Tracking
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">First Response</p>
                            <p className={`text-sm font-medium ${selectedTicket.sla.firstResponseMet ? "text-success" : "text-muted-foreground"}`}>
                              {selectedTicket.sla.firstResponseMet ? "✓ Met" : "Pending"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(selectedTicket.sla.firstResponseDue).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Escalation</p>
                            <p className={`text-sm font-medium ${selectedTicket.sla.isEscalated ? "text-destructive" : "text-muted-foreground"}`}>
                              {selectedTicket.sla.isEscalated ? "⚠ Escalated" : "Not Escalated"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(selectedTicket.sla.escalationDue).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                            <p className={`text-sm font-medium ${getSLAStatus(selectedTicket)?.color}`}>
                              {getSLAStatus(selectedTicket)?.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(selectedTicket.sla.resolutionDue).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Messages */}
                  {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Conversation ({selectedTicket.messages.length})
                      </h4>
                      <div className="space-y-3">
                        {selectedTicket.messages.map((msg) => {
                          const isSupport = msg.sender !== selectedTicket.requester;
                          return (
                            <div
                              key={msg.id}
                              className={`p-4 rounded-xl ${
                                isSupport ? "bg-primary/10 ml-8" : "bg-muted/50 mr-8"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-sm">{msg.sender}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(msg.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{msg.message}</p>
                              {msg.isInternal && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  Internal Note
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Box */}
                      <div className="mt-4 flex gap-2">
                        <Textarea placeholder="Type your reply..." className="min-h-[80px]" />
                        <Button className="shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Info */}
                  {selectedTicket.resolution && (
                    <Card className="border-success/20 bg-success/5">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          Resolution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm">{selectedTicket.resolution.resolutionNote}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>Resolved by {selectedTicket.resolution.resolvedBy}</span>
                          <span>{new Date(selectedTicket.resolution.resolvedAt).toLocaleString()}</span>
                        </div>
                        {selectedTicket.resolution.satisfactionRating && (
                          <div className="mt-2 flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Rating:</span>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${i < selectedTicket.resolution!.satisfactionRating! ? "text-warning" : "text-muted"}`}
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
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedTicket.requester}</p>
                          <p className="text-xs text-muted-foreground">{selectedTicket.requesterEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedTicket.facility}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedTicket.assignedTo || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                      {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {selectedTicket.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Activity Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {selectedTicket.timeline.map((event, index) => (
                            <div key={event.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                {getTimelineIcon(event.type)}
                                {index < selectedTicket.timeline!.length - 1 && (
                                  <div className="w-px h-full bg-border mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-3">
                                <p className="text-sm">{formatTimelineEvent(event)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {event.actor} • {new Date(event.timestamp).toLocaleString()}
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
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4" />
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
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Agent
                      </Button>
                      {selectedTicket.status === "Open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => updateTicketStatus(selectedTicket.id, "In Progress")}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Progress
                        </Button>
                      )}
                      {(selectedTicket.status === "Open" || selectedTicket.status === "In Progress") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-warning hover:text-warning"
                            onClick={() => updateTicketStatus(selectedTicket.id, "Escalated")}
                          >
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                            Escalate
                          </Button>
                          <Button
                            size="sm"
                            className="w-full justify-start bg-success hover:bg-success/90"
                            onClick={() => setIsResolveDialogOpen(true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign ticket <span className="font-mono font-medium">{selectedTicket?.id}</span> to a
              support agent
            </p>
            <div>
              <Label>Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {supportAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${getAgentStatusColor(agent.status)}`}
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
              <div className="p-3 bg-muted/50 rounded-lg">
                {(() => {
                  const agent = supportAgents.find((a) => a.id === selectedAgentId);
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
                        <span className="text-muted-foreground">Specializations:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.specializations.map((spec) => (
                            <Badge key={spec} variant="outline" className="text-xs">
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
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedTicket && assignTicket(selectedTicket.id, selectedAgentId)}
              disabled={!selectedAgentId}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Ticket Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Resolve Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to resolve ticket:{" "}
              <span className="font-medium text-foreground">{selectedTicket?.title}</span>
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
            <Button className="bg-success hover:bg-success/90" onClick={handleResolveTicket}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Resolve Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLA Settings Modal */}
      <Dialog open={isSLAModalOpen} onOpenChange={setIsSLAModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              SLA Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure Service Level Agreements for different ticket priorities. SLAs define
              response and resolution time targets.
            </p>
            <div className="space-y-4">
              {slaConfigs.map((sla) => (
                <div key={sla.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getPriorityColor(sla.priority)} border`}>
                        {sla.priority}
                      </Badge>
                      <span className="font-medium">{sla.name}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
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
            <Button>
              <Shield className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

