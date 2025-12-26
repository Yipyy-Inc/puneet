"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clientDocuments } from "@/data/documents";
import { clientCommunications, clientCallHistory } from "@/data/communications";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
  petTags,
  petTagAssignments,
  banRecords,
} from "@/data/pet-data";
import {
  payments,
  invoices,
  giftCards,
  customerCredits,
} from "@/data/payments";
import { Evaluation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Heart,
  FileText,
  MessageSquare,
  PhoneCall,
  MessageCircle,
  Download,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  User,
  Dog,
  Cat,
  Syringe,
  Image as ImageIcon,
  Activity,
  Utensils,
  Camera,
  Upload,
  Award,
  History,
  DollarSign,
  CreditCard,
  Wallet,
  Gift,
  Send,
  PenLine,
  Globe,
  MapPin,
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
} from "lucide-react";

interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  evaluations?: Evaluation[];
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { openBookingModal } = useBookingModal();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petActiveTab, setPetActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const client = clients.find((c) => c.id === parseInt(id));
  const facility = client
    ? facilities.find((f) => f.name === client.facility)
    : null;

  const [editedClient, setEditedClient] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    status: client?.status || "active",
    address: client?.address || {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
    emergencyContact: client?.emergencyContact || {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
  });

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Client not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/facility/dashboard/clients")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  // Get client-specific data
  const clientBookings = bookings.filter((b) => b.clientId === client.id);
  const clientDocs = clientDocuments.filter((d) => d.clientId === client.id);
  const clientComms = clientCommunications.filter(
    (c) => c.clientId === client.id,
  );
  const clientCalls = clientCallHistory.filter((c) => c.clientId === client.id);

  // Client billing data
  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const clientInvoices = invoices.filter((inv) => inv.clientId === client.id);
  const clientGiftCards = giftCards.filter(
    (gc) => gc.purchasedByClientId === client.id,
  );
  const clientCredits = customerCredits.filter((c) => c.clientId === client.id);

  // Calculate billing stats
  const totalRevenue = clientPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const outstandingInvoices = clientInvoices.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue",
  );
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.amountDue,
    0,
  );
  const totalCredits = clientCredits
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.remainingAmount, 0);

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

  // Pet modal helpers
  const getPetData = (pet: Pet) => {
    const photos = petPhotos.filter((p) => p.petId === pet.id);
    const vaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
    const petBookingsList = bookings.filter((b) => b.petId === pet.id);
    const reports = reportCards.filter((r) => r.petId === pet.id);
    const totalStays = petBookingsList.filter(
      (b) => b.status === "completed",
    ).length;
    const expiredVaccinations = vaccinations.filter(
      (v) => new Date(v.expiryDate) < new Date(),
    );
    const upcomingVaccinations = vaccinations.filter(
      (v) =>
        new Date(v.expiryDate) <=
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    );

    // Get pet tags
    const tagAssignments = petTagAssignments.filter((a) => a.petId === pet.id);
    const tags = tagAssignments
      .map((a) => petTags.find((t) => t.id === a.tagId))
      .filter(Boolean);

    // Get ban record
    const banRecord = banRecords.find(
      (b) => b.entityType === "pet" && b.entityId === pet.id && b.isBanned,
    );

    return {
      photos,
      vaccinations,
      petBookings: petBookingsList,
      reports,
      totalStays,
      expiredVaccinations,
      upcomingVaccinations,
      tags,
      banRecord,
    };
  };

  // Get client ban status
  const clientBanRecord = banRecords.find(
    (b) => b.entityType === "client" && b.entityId === client.id && b.isBanned,
  );

  const getVaccinationStatus = (
    vaccination: (typeof vaccinationRecords)[0],
  ) => {
    const expiryDate = new Date(vaccination.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return {
        status: "expired",
        color: "destructive",
        days: Math.abs(daysUntilExpiry),
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: "expiring-soon",
        color: "warning",
        days: daysUntilExpiry,
      };
    } else {
      return { status: "valid", color: "success", days: daysUntilExpiry };
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case "happy":
        return "bg-green-100 text-green-800";
      case "calm":
        return "bg-blue-100 text-blue-800";
      case "energetic":
        return "bg-orange-100 text-orange-800";
      case "anxious":
        return "bg-yellow-100 text-yellow-800";
      case "tired":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedClient({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      status: client.status,
      address: client.address || {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
      emergencyContact: client.emergencyContact || {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/facility/dashboard/clients")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          {/* Client Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            {isEditing && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
              >
                <Camera className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                {client.name}
              </h2>
              <StatusBadge type="status" value={client.status} showIcon />
              {clientBanRecord && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Banned
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{client.facility}</span>
            </div>
            {clientBanRecord && (
              <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive">
                  Ban Reason: {clientBanRecord.reason}
                </p>
                {clientBanRecord.notes && (
                  <p className="text-xs text-destructive/80 mt-1">
                    {clientBanRecord.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button variant="outline" size="sm">
                <PhoneCall className="h-4 w-4 mr-1" />
                Call
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (client && facility) {
                    openBookingModal({
                      clients: [client],
                      facilityId: facility.id,
                      facilityName: facility.name,
                      preSelectedClientId: client.id,
                      onCreateBooking: (booking) => {
                        console.log("Booking created:", booking);
                      },
                    });
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Book
              </Button>
            </>
          )}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pets">Pets ({client.pets.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Contact & Info Section */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editedClient.name}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedClient.email}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editedClient.phone}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editedClient.status}
                        onValueChange={(value) =>
                          setEditedClient({ ...editedClient, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {client.email}
                      </span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {client.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {client.facility}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="street">Street</Label>
                      <Input
                        id="street"
                        value={editedClient.address.street}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            address: {
                              ...editedClient.address,
                              street: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={editedClient.address.city}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              address: {
                                ...editedClient.address,
                                city: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={editedClient.address.state}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              address: {
                                ...editedClient.address,
                                state: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP</Label>
                        <Input
                          id="zip"
                          value={editedClient.address.zip}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              address: {
                                ...editedClient.address,
                                zip: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={editedClient.address.country}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              address: {
                                ...editedClient.address,
                                country: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : client.address ? (
                  <div className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">
                      {client.address.street}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client.address.city}, {client.address.state}{" "}
                      {client.address.zip}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client.address.country}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No address on file
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Name</Label>
                      <Input
                        id="emergencyName"
                        value={editedClient.emergencyContact.name}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            emergencyContact: {
                              ...editedClient.emergencyContact,
                              name: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelationship">
                        Relationship
                      </Label>
                      <Input
                        id="emergencyRelationship"
                        value={editedClient.emergencyContact.relationship}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            emergencyContact: {
                              ...editedClient.emergencyContact,
                              relationship: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        value={editedClient.emergencyContact.phone}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            emergencyContact: {
                              ...editedClient.emergencyContact,
                              phone: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyEmail">Email</Label>
                      <Input
                        id="emergencyEmail"
                        type="email"
                        value={editedClient.emergencyContact.email}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            emergencyContact: {
                              ...editedClient.emergencyContact,
                              email: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </>
                ) : client.emergencyContact ? (
                  <>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">
                          {client.emergencyContact.name}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {client.emergencyContact.relationship}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {client.emergencyContact.phone}
                      </span>
                    </div>
                    {client.emergencyContact.email && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {client.emergencyContact.email}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No emergency contact on file
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Pet Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Pets ({client.pets.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("pets")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {client.pets.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {client.pets.slice(0, 3).map((pet) => {
                    const petData = getPetData(pet);
                    return (
                      <div
                        key={pet.id}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                          )
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {pet.type === "Dog" ? (
                              <Dog className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Cat className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">
                                  {pet.name}
                                </h4>
                                {petData.banRecord && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    Banned
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {pet.breed} • {pet.age}{" "}
                                {pet.age === 1 ? "year" : "years"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">{pet.type}</Badge>
                        </div>
                        {petData.tags && petData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {petData.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag!.id}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white ${tag!.color}`}
                                title={tag!.description}
                              >
                                {tag!.name}
                              </span>
                            ))}
                            {petData.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{petData.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pets registered
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bookings History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Bookings History
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
                    .slice(0, 5)
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
                            <div
                              className={`p-2 rounded-lg ${
                                booking.status === "completed"
                                  ? "bg-green-100"
                                  : booking.status === "confirmed"
                                    ? "bg-blue-100"
                                    : booking.status === "pending"
                                      ? "bg-amber-100"
                                      : "bg-red-100"
                              }`}
                            >
                              {booking.status === "completed" && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {booking.status === "confirmed" && (
                                <Clock className="h-4 w-4 text-blue-600" />
                              )}
                              {booking.status === "pending" && (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                              {booking.status === "cancelled" && (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm capitalize">
                                {booking.service}
                                {pet && (
                                  <span className="text-muted-foreground font-normal">
                                    {" "}
                                    • {pet.name}
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(booking.startDate)}
                                {booking.startDate !== booking.endDate &&
                                  ` - ${formatDate(booking.endDate)}`}
                              </p>
                              {booking.specialRequests && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {booking.specialRequests}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              ${booking.totalCost}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  {clientBookings.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 5 of {clientBookings.length} bookings
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookings yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pets Tab */}
        <TabsContent value="pets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                All Pets ({client.pets.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Pet
              </Button>
            </CardHeader>
            <CardContent>
              {client.pets.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {client.pets.map((pet) => {
                    const petData = getPetData(pet);
                    return (
                      <div
                        key={pet.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted transition-colors cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                          )
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            {pet.type === "Dog" ? (
                              <Dog className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <Cat className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {pet.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {pet.breed} • {pet.age}{" "}
                              {pet.age === 1 ? "year" : "years"}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="secondary">{pet.type}</Badge>
                              <Badge variant="outline">{pet.weight} kg</Badge>
                              {petData.banRecord && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Banned
                                </Badge>
                              )}
                            </div>
                            {petData.tags && petData.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {petData.tags.map((tag) => (
                                  <span
                                    key={tag!.id}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${tag!.color}`}
                                    title={tag!.description}
                                  >
                                    {tag!.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {petData.banRecord && (
                          <div className="flex items-start gap-2 mt-3 p-2 rounded bg-destructive/10 text-destructive text-xs">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium">
                                {petData.banRecord.reason}
                              </span>
                              {petData.banRecord.notes && (
                                <p className="mt-0.5 opacity-80">
                                  {petData.banRecord.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.totalStays}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stays
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.vaccinations.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Vaccines
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.reports.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Reports
                            </div>
                          </div>
                        </div>
                        {petData.expiredVaccinations.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 p-2 rounded bg-destructive/10 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {petData.expiredVaccinations.length} expired
                            vaccination(s)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pets registered
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Pet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Billing & Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Billing Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold text-green-600">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Paid
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold text-amber-600">
                    ${totalOutstanding.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Outstanding
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold text-green-600">
                    ${totalCredits.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Credit Balance
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">
                    {clientPayments.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Transactions
                  </div>
                </div>
              </div>

              {/* Outstanding Alert */}
              {outstandingInvoices.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {outstandingInvoices.length} outstanding invoice(s) totaling
                    ${totalOutstanding.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Billing Tabs */}
              <Tabs defaultValue="payments" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="invoices">
                    Invoices
                    {outstandingInvoices.length > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        {outstandingInvoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="credits">Credits</TabsTrigger>
                  <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
                </TabsList>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-4">
                  {clientPayments.length > 0 ? (
                    <div className="space-y-3">
                      {clientPayments
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  payment.status === "completed"
                                    ? "bg-green-100"
                                    : payment.status === "refunded"
                                      ? "bg-red-100"
                                      : "bg-amber-100"
                                }`}
                              >
                                {payment.paymentMethod === "card" && (
                                  <CreditCard className="h-4 w-4" />
                                )}
                                {payment.paymentMethod === "cash" && (
                                  <Wallet className="h-4 w-4" />
                                )}
                                {payment.paymentMethod === "gift_card" && (
                                  <Gift className="h-4 w-4" />
                                )}
                                {!["card", "cash", "gift_card"].includes(
                                  payment.paymentMethod,
                                ) && <DollarSign className="h-4 w-4" />}
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">
                                  {payment.description}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(payment.createdAt)} •{" "}
                                  {payment.paymentMethod.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`font-semibold text-sm ${
                                  payment.status === "refunded"
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {payment.status === "refunded" ? "-" : ""}$
                                {payment.totalAmount.toFixed(2)}
                              </div>
                              <Badge
                                variant={
                                  payment.status === "completed"
                                    ? "outline"
                                    : payment.status === "refunded"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs mt-1"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No payment history
                    </p>
                  )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="mt-4">
                  {clientInvoices.length > 0 ? (
                    <div className="space-y-3">
                      {clientInvoices
                        .sort(
                          (a, b) =>
                            new Date(b.issuedDate).getTime() -
                            new Date(a.issuedDate).getTime(),
                        )
                        .map((invoice) => {
                          const daysOverdue =
                            invoice.status === "overdue"
                              ? Math.floor(
                                  (new Date().getTime() -
                                    new Date(invoice.dueDate).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                )
                              : 0;
                          return (
                            <div
                              key={invoice.id}
                              className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm">
                                    {invoice.invoiceNumber}
                                  </h4>
                                  <Badge
                                    variant={
                                      invoice.status === "paid"
                                        ? "outline"
                                        : invoice.status === "overdue"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {invoice.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Issued: {formatDate(invoice.issuedDate)} •
                                  Due: {formatDate(invoice.dueDate)}
                                  {daysOverdue > 0 &&
                                    ` • ${daysOverdue} days overdue`}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-sm">
                                  ${invoice.total.toFixed(2)}
                                </div>
                                {invoice.amountDue > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-amber-600">
                                      ${invoice.amountDue.toFixed(2)} due
                                    </span>
                                    <Button variant="outline" size="sm">
                                      <Send className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No invoices
                    </p>
                  )}
                </TabsContent>

                {/* Credits Tab */}
                <TabsContent value="credits" className="mt-4">
                  {clientCredits.length > 0 ? (
                    <div className="space-y-3">
                      {clientCredits.map((credit) => (
                        <div
                          key={credit.id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {credit.reason}
                              </Badge>
                              <Badge
                                variant={
                                  credit.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {credit.status}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">{credit.description}</p>
                            {credit.expiryDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Expires: {formatDate(credit.expiryDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              ${credit.remainingAmount.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              of ${credit.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No credits
                    </p>
                  )}
                </TabsContent>

                {/* Gift Cards Tab */}
                <TabsContent value="giftcards" className="mt-4">
                  {clientGiftCards.length > 0 ? (
                    <div className="space-y-3">
                      {clientGiftCards.map((gc) => (
                        <div
                          key={gc.id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">
                                {gc.code}
                              </span>
                            </div>
                            <Badge
                              variant={
                                gc.status === "active" ? "default" : "secondary"
                              }
                              className="mt-2"
                            >
                              {gc.status}
                            </Badge>
                            {gc.expiryDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Expires: {formatDate(gc.expiryDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              ${gc.currentBalance.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              of ${gc.initialAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No gift cards
                    </p>
                  )}
                </TabsContent>
              </Tabs>
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
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              {clientDocs.length > 0 ? (
                <div className="space-y-3">
                  {clientDocs.map((doc) => {
                    const isAgreement =
                      doc.type === "agreement" || doc.type === "waiver";
                    const isDigital = doc.signatureType === "digital";

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={`p-2 rounded-lg ${
                                isAgreement
                                  ? isDigital
                                    ? "bg-blue-100"
                                    : "bg-green-100"
                                  : "bg-muted"
                              }`}
                            >
                              {isAgreement ? (
                                isDigital ? (
                                  <Globe className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <PenLine className="h-4 w-4 text-green-600" />
                                )
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">
                                  {doc.name}
                                </h4>
                                {isAgreement && (
                                  <Badge
                                    variant={
                                      isDigital ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {isDigital ? "Digital" : "Physical"}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {doc.type}
                                </Badge>
                                {doc.fileSize && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                )}
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

                              {/* Signature Info for Agreements */}
                              {isAgreement && doc.signedAt && (
                                <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="text-muted-foreground">
                                        Signed by:{" "}
                                      </span>
                                      <span className="font-medium">
                                        {doc.signedByName}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Date:{" "}
                                      </span>
                                      <span className="font-medium">
                                        {formatDate(doc.signedAt)}
                                      </span>
                                    </div>
                                    {isDigital && doc.ipAddress && (
                                      <div>
                                        <span className="text-muted-foreground">
                                          IP:{" "}
                                        </span>
                                        <span className="font-mono">
                                          {doc.ipAddress}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {isDigital &&
                                    doc.agreedToTerms &&
                                    doc.agreedToTerms.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {doc.agreedToTerms.map((term, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {term}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              )}

                              {doc.notes && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {doc.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {doc.fileUrl && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          <div className="grid grid-cols-2 gap-4">
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
                      .slice(0, 5)
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
                      .slice(0, 5)
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Pet Details Modal */}
      <Dialog open={!!selectedPet} onOpenChange={() => setSelectedPet(null)}>
        <DialogContent className="min-w-6xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="sr-only">
                {selectedPet?.name} - Pet Details
              </DialogTitle>
            </DialogHeader>
            {selectedPet && (
              <PetDetailContent
                pet={selectedPet}
                activeTab={petActiveTab}
                setActiveTab={setPetActiveTab}
                getPetData={getPetData}
                getVaccinationStatus={getVaccinationStatus}
                getMoodColor={getMoodColor}
                formatDate={formatDate}
                formatDateTime={formatDateTime}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PetDetailContent({
  pet,
  activeTab,
  setActiveTab,
  getPetData,
  getVaccinationStatus,
  getMoodColor,
  formatDate,
  formatDateTime,
}: {
  pet: Pet;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getPetData: (pet: Pet) => {
    photos: typeof petPhotos;
    vaccinations: typeof vaccinationRecords;
    petBookings: typeof bookings;
    reports: typeof reportCards;
    totalStays: number;
    expiredVaccinations: typeof vaccinationRecords;
    upcomingVaccinations: typeof vaccinationRecords;
  };
  getVaccinationStatus: (vaccination: (typeof vaccinationRecords)[0]) => {
    status: string;
    color: string;
    days: number;
  };
  getMoodColor: (mood: string) => string;
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
}) {
  const {
    photos,
    vaccinations,
    petBookings,
    reports,
    totalStays,
    expiredVaccinations,
    upcomingVaccinations,
  } = getPetData(pet);
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
            {pet.type === "Dog" ? (
              <Dog className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Cat className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{pet.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {pet.type} • {pet.breed}
              </Badge>
              <Badge variant="secondary">
                {pet.age} {pet.age === 1 ? "year" : "years"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalStays}</div>
            <div className="text-xs text-muted-foreground">Total Stays</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.length}</div>
            <div className="text-xs text-muted-foreground">Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{vaccinations.length}</div>
            <div className="text-xs text-muted-foreground">Vaccinations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-xs text-muted-foreground">Report Cards</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(expiredVaccinations.length > 0 || upcomingVaccinations.length > 0) && (
        <div className="space-y-2">
          {expiredVaccinations.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {expiredVaccinations.length} vaccination
                {expiredVaccinations.length > 1 ? "s" : ""} expired - Update
                required
              </span>
            </div>
          )}
          {upcomingVaccinations.length > 0 &&
            expiredVaccinations.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {upcomingVaccinations.length} vaccination
                  {upcomingVaccinations.length > 1 ? "s" : ""} expiring within
                  60 days
                </span>
              </div>
            )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="history">Stay History</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{pet.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Breed</p>
                  <p className="font-medium">{pet.breed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium">
                    {pet.age} {pet.age === 1 ? "year" : "years"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{pet.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{pet.color}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Microchip</p>
                  <p className="font-medium font-mono text-sm">
                    {pet.microchip}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Medical & Diet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                <Badge
                  variant={
                    pet.allergies !== "None" ? "destructive" : "secondary"
                  }
                >
                  {pet.allergies}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Special Needs
                </p>
                <p className="text-sm">{pet.specialNeeds}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Photo Gallery
              </CardTitle>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Upload Photo
              </Button>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                    >
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      {photo.isPrimary && (
                        <Badge className="absolute top-2 right-2 text-xs">
                          Primary
                        </Badge>
                      )}
                      <div className="mt-2">
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground truncate">
                            {photo.caption}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(photo.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No photos yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Vaccination Records
              </CardTitle>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Add Record
              </Button>
            </CardHeader>
            <CardContent>
              {vaccinations.length > 0 ? (
                <div className="space-y-3">
                  {vaccinations
                    .sort(
                      (a, b) =>
                        new Date(b.administeredDate).getTime() -
                        new Date(a.administeredDate).getTime(),
                    )
                    .map((vacc) => {
                      const status = getVaccinationStatus(vacc);
                      return (
                        <div
                          key={vacc.id}
                          className="p-4 rounded-lg border bg-card space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Syringe className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {vacc.vaccineName}
                                </h4>
                                {vacc.veterinarianName && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Dr. {vacc.veterinarianName}
                                    {vacc.veterinaryClinic &&
                                      ` • ${vacc.veterinaryClinic}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                status.status === "expired"
                                  ? "destructive"
                                  : status.status === "expiring-soon"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {status.status === "expired"
                                ? "Expired"
                                : status.status === "expiring-soon"
                                  ? `${status.days}d left`
                                  : "Valid"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">
                                Administered
                              </p>
                              <p className="font-medium">
                                {formatDate(vacc.administeredDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Expires</p>
                              <p className="font-medium">
                                {formatDate(vacc.expiryDate)}
                              </p>
                            </div>
                          </div>
                          {vacc.notes && (
                            <p className="text-xs text-muted-foreground pt-2 border-t">
                              {vacc.notes}
                            </p>
                          )}
                          {vacc.documentUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download Certificate
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No vaccination records
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stay History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Stay History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {petBookings.length > 0 ? (
                <div className="space-y-3">
                  {petBookings
                    .sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                              {booking.service}
                              {booking.status === "completed" && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                              {booking.status === "pending" && (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(booking.startDate)}
                              {booking.startDate !== booking.endDate &&
                                ` - ${formatDate(booking.endDate)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              ${booking.totalCost}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                        {booking.specialRequests && (
                          <p className="text-xs text-muted-foreground italic pt-2 border-t">
                            {booking.specialRequests}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No stay history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Cards Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length > 0 ? (
            reports
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base capitalize">
                          {report.serviceType} Report
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(report.date)} • By {report.createdBy}
                        </p>
                      </div>
                      <Badge className={getMoodColor(report.mood)}>
                        {report.mood}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Activities */}
                    {report.activities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Activities
                        </h4>
                        <ul className="space-y-1">
                          {report.activities.map((activity, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-primary mt-1">•</span>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Meals */}
                    {report.meals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          Meals
                        </h4>
                        <div className="space-y-2">
                          {report.meals.map((meal, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {meal.time} - {meal.food}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {meal.amount}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {meal.consumed}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Potty Breaks */}
                    {report.pottyBreaks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Potty Breaks
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {report.pottyBreaks.map((potty, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {potty.time} - {potty.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {report.photos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Photos ({report.photos.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {report.photos.map((photo, idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Notes */}
                    {report.staffNotes && (
                      <div className="pt-3 border-t">
                        <h4 className="text-sm font-semibold mb-1">
                          Staff Notes
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {report.staffNotes}
                        </p>
                      </div>
                    )}

                    {report.sentToOwner && report.sentAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <CheckCircle className="h-3 w-3" />
                        Sent to owner on {formatDateTime(report.sentAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No report cards yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
