"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Building,
  Mail,
  Phone,
  Heart,
  Calendar,
  FileText,
  MessageSquare,
  PhoneCall,
  CreditCard,
  MessageCircle,
  Gift,
  Download,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
} from "lucide-react";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { clientDocuments } from "@/data/documents";
import { clientCommunications, clientCallHistory } from "@/data/communications";

interface ClientModalProps {
  client: (typeof clients)[number];
}

export function ClientModal({ client }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Get client-specific data
  const clientBookings = bookings.filter((b) => b.clientId === client.id);
  const clientDocs = clientDocuments.filter((d) => d.clientId === client.id);
  const clientComms = clientCommunications.filter(
    (c) => c.clientId === client.id,
  );
  const clientCalls = clientCallHistory.filter((c) => c.clientId === client.id);

  // Calculate stats
  const totalBookings = clientBookings.length;
  const totalSpent = clientBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalCost, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "confirmed":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getDocumentIcon = () => {
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return <PhoneCall className="h-4 w-4" />;
      case "in-app":
        return <MessageCircle className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{client.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge type="status" value={client.status} showIcon />
            <Badge variant="outline">
              <Building className="h-3 w-3 mr-1" />
              {client.facility}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <PhoneCall className="h-4 w-4 mr-1" />
            Call
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalBookings}</div>
            <div className="text-xs text-muted-foreground">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{client.pets.length}</div>
            <div className="text-xs text-muted-foreground">Pets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${totalSpent}</div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{clientDocs.length}</div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="default" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            New Booking
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-1" />
            Send Message
          </Button>
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-1" />
            Take Payment
          </Button>
          <Button variant="outline" size="sm">
            <Gift className="h-4 w-4 mr-1" />
            Apply Credit
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{client.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Pets ({client.pets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.pets.length > 0 ? (
                <div className="space-y-2">
                  {client.pets.map((pet, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-semibold text-sm">{pet.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {pet.type} • {pet.age}{" "}
                            {pet.age === 1 ? "year" : "years"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{pet.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pets registered
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Booking History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientBookings.length > 0 ? (
                <div className="space-y-3">
                  {clientBookings
                    .sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((booking) => {
                      const pet = client.pets.find(
                        (p) => p.id === booking.petId,
                      );
                      return (
                        <div
                          key={booking.id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {getStatusIcon(booking.status)}
                            <div>
                              <h4 className="font-semibold text-sm capitalize">
                                {booking.service}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {pet?.name} • {formatDate(booking.startDate)}
                                {booking.startDate !== booking.endDate &&
                                  ` - ${formatDate(booking.endDate)}`}
                              </p>
                              {booking.specialRequests && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {booking.specialRequests}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              ${booking.totalCost}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No booking history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Documents & Agreements
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              {clientDocs.length > 0 ? (
                <div className="space-y-2">
                  {clientDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getDocumentIcon()}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{doc.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {doc.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize || 0)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doc.uploadedAt)}
                            </span>
                            {doc.expiryDate && (
                              <Badge
                                variant={
                                  new Date(doc.expiryDate) < new Date()
                                    ? "destructive"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                Expires: {formatDate(doc.expiryDate)}
                              </Badge>
                            )}
                          </div>
                          {doc.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {doc.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientCalls.length > 0 ? (
                <div className="space-y-3">
                  {clientCalls
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                    )
                    .map((call) => (
                      <div
                        key={call.id}
                        className="p-4 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4" />
                            <div>
                              <Badge
                                variant={
                                  call.direction === "inbound"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs capitalize"
                              >
                                {call.direction}
                              </Badge>
                              <Badge
                                variant={
                                  call.status === "completed"
                                    ? "outline"
                                    : call.status === "missed"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs ml-1"
                              >
                                {call.status}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(call.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              Duration: {formatDuration(call.duration)}
                            </div>
                            {call.staffName && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Handled by: {call.staffName}
                              </div>
                            )}
                          </div>
                          {call.recordingUrl && (
                            <Button variant="outline" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Play Recording
                            </Button>
                          )}
                        </div>
                        {call.notes && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">
                              {call.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No call history
                </p>
              )}
            </CardContent>
          </Card>

          {/* Messages & Emails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Messages & Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientComms.length > 0 ? (
                <div className="space-y-3">
                  {clientComms
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                    )
                    .map((comm) => (
                      <div
                        key={comm.id}
                        className="p-4 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getCommunicationIcon(comm.type)}
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {comm.type}
                              </Badge>
                              {comm.direction === "outbound" ? (
                                <Badge
                                  variant="secondary"
                                  className="text-xs ml-1"
                                >
                                  Sent
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-xs ml-1"
                                >
                                  Received
                                </Badge>
                              )}
                              {comm.status && (
                                <Badge
                                  variant="outline"
                                  className="text-xs ml-1"
                                >
                                  {comm.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comm.timestamp)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">
                            {comm.subject}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {comm.content}
                          </p>
                        </div>
                        {comm.staffName && (
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            By: {comm.staffName}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No message history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
