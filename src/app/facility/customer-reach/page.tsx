"use client";

import { useState, useMemo } from "react";

import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MessageSquare,
  Send,
  Users,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// Mock activity data for clients - multiple activities per client
const clientActivities = [
  {
    clientId: 15,
    activities: [
      { date: "2024-11-10", service: "Daycare" },
      { date: "2024-10-05", service: "Grooming" },
    ],
  },
  {
    clientId: 16,
    activities: [
      { date: "2024-11-08", service: "Boarding" },
      { date: "2024-09-15", service: "Daycare" },
    ],
  },
  {
    clientId: 17,
    activities: [
      { date: "2024-10-15", service: "Grooming" },
      { date: "2024-08-20", service: "Veterinary" },
    ],
  },
  {
    clientId: 18,
    activities: [
      { date: "2024-11-12", service: "Grooming" },
      { date: "2024-10-01", service: "Daycare" },
    ],
  },
  {
    clientId: 19,
    activities: [
      { date: "2024-11-05", service: "Daycare" },
      { date: "2024-09-10", service: "Boarding" },
    ],
  },
  {
    clientId: 20,
    activities: [
      { date: "2024-11-01", service: "Boarding" },
      { date: "2024-07-15", service: "Grooming" },
    ],
  },
  {
    clientId: 21,
    activities: [
      { date: "2024-10-20", service: "Veterinary" },
      { date: "2024-06-10", service: "Daycare" },
    ],
  },
  {
    clientId: 22,
    activities: [
      { date: "2024-11-09", service: "Boarding" },
      { date: "2024-08-05", service: "Grooming" },
    ],
  },
  {
    clientId: 23,
    activities: [
      { date: "2024-11-07", service: "Veterinary" },
      { date: "2024-09-20", service: "Daycare" },
    ],
  },
  {
    clientId: 24,
    activities: [
      { date: "2024-11-03", service: "Grooming" },
      { date: "2024-07-25", service: "Boarding" },
    ],
  },
  {
    clientId: 25,
    activities: [
      { date: "2024-10-25", service: "Veterinary" },
      { date: "2024-05-15", service: "Grooming" },
    ],
  },
  {
    clientId: 26,
    activities: [
      { date: "2024-11-11", service: "Daycare" },
      { date: "2024-10-10", service: "Veterinary" },
    ],
  },
  {
    clientId: 27,
    activities: [
      { date: "2024-11-06", service: "Grooming" },
      { date: "2024-08-30", service: "Boarding" },
    ],
  },
  {
    clientId: 28,
    activities: [
      { date: "2024-11-04", service: "Boarding" },
      { date: "2024-09-05", service: "Daycare" },
    ],
  },
  {
    clientId: 29,
    activities: [
      { date: "2024-11-02", service: "Daycare" },
      { date: "2024-07-10", service: "Grooming" },
    ],
  },
];

export default function CustomerReachPage() {
  const facilityId = 11; // Static facility ID for now
  const facility = facilities.find((f) => f.id === facilityId);

  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [campaignType, setCampaignType] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const facilityClients = clients
    .filter((client) => client.facility === facility?.name)
    .map((client) => {
      const clientActivity = clientActivities.find(
        (a) => a.clientId === client.id,
      );
      const activities = clientActivity?.activities || [];
      const sortedActivities = activities.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const lastActivity = sortedActivities[0];
      return {
        ...client,
        lastActivity: lastActivity?.date || "N/A",
        lastService: lastActivity?.service || "N/A",
        allActivities: activities,
      };
    });

  const filteredClients = useMemo(() => {
    return facilityClients.filter((client) => {
      const now = new Date();
      const activities = client.allActivities;

      // Check if client has any activity for the selected service within the timeframe
      const relevantActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.date);
        const daysSinceActivity = Math.floor(
          (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        let activityMatch = true;
        if (activityFilter === "7days") activityMatch = daysSinceActivity <= 7;
        else if (activityFilter === "30days")
          activityMatch = daysSinceActivity <= 30;
        else if (activityFilter === "90days")
          activityMatch = daysSinceActivity <= 90;

        const serviceMatch =
          serviceFilter === "all" || activity.service === serviceFilter;

        return activityMatch && serviceMatch;
      });

      return relevantActivities.length > 0;
    });
  }, [facilityClients, activityFilter, serviceFilter]);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const handleSelectClient = (clientId: number, checked: boolean) => {
    if (checked) {
      setSelectedClients((prev) => [...prev, clientId]);
    } else {
      setSelectedClients((prev) => prev.filter((id) => id !== clientId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClients.map((c) => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSendCampaign = () => {
    if (selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }

    // Mock sending campaign
    toast.success(
      `Campaign sent to ${selectedClients.length} clients via ${campaignType.toUpperCase()}`,
    );
    setIsDialogOpen(false);
    setSelectedClients([]);
    setSubject("");
    setMessage("");
  };

  const columns: ColumnDef<(typeof facilityClients)[number]>[] = [
    {
      key: "select",
      label: "",
      render: (client) => (
        <Checkbox
          checked={selectedClients.includes(client.id)}
          onCheckedChange={(checked) =>
            handleSelectClient(client.id, checked as boolean)
          }
        />
      ),
      defaultVisible: true,
    },
    {
      key: "name",
      label: "Name",
      defaultVisible: true,
    },
    {
      key: "email",
      label: "Email",
      defaultVisible: true,
    },
    {
      key: "phone",
      label: "Phone",
      defaultVisible: true,
      render: (client) => client.phone || "N/A",
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      defaultVisible: true,
      render: (client) => new Date(client.lastActivity).toLocaleDateString(),
    },
    {
      key: "lastService",
      label: "Last Service",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (client) => (
        <Badge variant={client.status === "active" ? "default" : "secondary"}>
          {client.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Customer Reach - {facility.name}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={selectedClients.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              Send Campaign ({selectedClients.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="min-w-5xl">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-xl">
                Send Marketing Campaign
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Campaign Type</Label>
                <Tabs
                  value={campaignType}
                  onValueChange={(value) =>
                    setCampaignType(value as "email" | "sms")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger
                      value="email"
                      className="flex items-center gap-2 text-sm"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger
                      value="sms"
                      className="flex items-center gap-2 text-sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {campaignType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Subject Line
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="h-11"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message Content
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Enter your ${campaignType} message`}
                  rows={8}
                  className="resize-none"
                />
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Sending to {selectedClients.length} client
                    {selectedClients.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button onClick={handleSendCampaign} className="px-6">
                  <Send className="mr-2 h-4 w-4" />
                  Send Campaign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityClients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Filtered Clients
            </CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredClients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedClients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.filter((c) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Label>Last Activity</Label>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Last Service</Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="Daycare">Daycare</SelectItem>
                  <SelectItem value="Boarding">Boarding</SelectItem>
                  <SelectItem value="Grooming">Grooming</SelectItem>
                  <SelectItem value="Veterinary">Veterinary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={
                selectedClients.length === filteredClients.length &&
                filteredClients.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all">Select all filtered clients</Label>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={filteredClients}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search clients..."
        itemsPerPage={10}
      />
    </div>
  );
}
