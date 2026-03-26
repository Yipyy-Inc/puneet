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
  playdateAlertLogs,
  getAlertStatusVariant,
  formatAlertChannel,
} from "@/data/marketing";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
  banRecords,
} from "@/data/pet-data";
import { getTagsForEntity } from "@/data/tags-notes";
import { TagList } from "@/components/shared/TagList";
import { NotesList } from "@/components/shared/NotesList";
import {
  payments,
  invoices,
  giftCards,
  customerCredits,
} from "@/data/payments";
import { getClientRetailPurchases } from "@/data/retail";
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
import Link from "next/link";
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
  ShoppingBag,
  Receipt,
  Bell,
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
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Client not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/facility/dashboard/clients")}
          >
            <ArrowLeft className="mr-2 size-4" />
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
  const clientPlaydateAlerts = playdateAlertLogs.filter(
    (a) => a.recipientCustomerId === client.id,
  );

  // Client billing data
  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const clientInvoices = invoices.filter((inv) => inv.clientId === client.id);
  const clientGiftCards = giftCards.filter(
    (gc) => gc.purchasedByClientId === client.id,
  );
  const clientCredits = customerCredits.filter((c) => c.clientId === client.id);

  // Retail purchase history (linked to client file)
  const clientRetailPurchases = getClientRetailPurchases(client.id);
  const totalRetailSpent = clientRetailPurchases.reduce(
    (sum, t) => sum + t.total,
    0,
  );

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
        return <Mail className="size-4" />;
      case "sms":
        return <MessageSquare className="size-4" />;
      case "call":
        return <PhoneCall className="size-4" />;
      case "in-app":
        return <MessageCircle className="size-4" />;
      case "note":
        return <FileText className="size-4" />;
      default:
        return <MessageSquare className="size-4" />;
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

    // Get pet tags (via new tag system)
    const tags = getTagsForEntity("pet", pet.id);

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
        <div className="flex flex-1 items-center gap-4">
          {/* Client Avatar */}
          <div className="relative">
            <div className="bg-muted flex h-16 w-16 items-center justify-center overflow-hidden rounded-full">
              <User className="text-muted-foreground h-8 w-8" />
            </div>
            {isEditing && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full"
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
            <div className="text-muted-foreground mt-1 flex items-center gap-2">
              <Building className="size-4" />
              <span>{client.facility}</span>
            </div>
            {clientBanRecord && (
              <div className="border-destructive/20 bg-destructive/10 mt-2 rounded-md border p-2">
                <p className="text-destructive text-xs font-medium">
                  Ban Reason: {clientBanRecord.reason}
                </p>
                {clientBanRecord.notes && (
                  <p className="text-destructive/80 mt-1 text-xs">
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
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-1 size-4" />
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
                <Edit className="mr-1 size-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="mr-1 size-4" />
                Email
              </Button>
              <Button variant="outline" size="sm">
                <PhoneCall className="mr-1 size-4" />
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
                <Plus className="mr-1 size-4" />
                Book
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customer Tags */}
      <div className="flex items-center gap-2">
        <TagList entityType="customer" entityId={client.id} editable />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalBookings}</div>
            <div className="text-muted-foreground text-xs">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{client.pets.length}</div>
            <div className="text-muted-foreground text-xs">Pets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${totalSpent}</div>
            <div className="text-muted-foreground text-xs">Total Spent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{clientDocs.length}</div>
            <div className="text-muted-foreground text-xs">Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              ${totalRetailSpent.toFixed(2)}
            </div>
            <div className="text-muted-foreground text-xs">
              Retail Purchases ({clientRetailPurchases.length})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pets">Pets ({client.pets.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="purchases">
            Purchases ({clientRetailPurchases.length})
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Contact & Info Section */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="size-4" />
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
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <Mail className="text-muted-foreground size-4" />
                      <span className="text-sm font-medium">
                        {client.email}
                      </span>
                    </div>
                    {client.phone && (
                      <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                        <Phone className="text-muted-foreground size-4" />
                        <span className="text-sm font-medium">
                          {client.phone}
                        </span>
                      </div>
                    )}
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <Building className="text-muted-foreground size-4" />
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
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="size-4" />
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
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-sm font-medium">
                      {client.address.street}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {client.address.city}, {client.address.state}{" "}
                      {client.address.zip}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {client.address.country}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No address on file
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="size-4" />
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
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <User className="text-muted-foreground size-4" />
                      <div>
                        <span className="text-sm font-medium">
                          {client.emergencyContact.name}
                        </span>
                        <p className="text-muted-foreground text-xs">
                          {client.emergencyContact.relationship}
                        </p>
                      </div>
                    </div>
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <Phone className="text-muted-foreground size-4" />
                      <span className="text-sm font-medium">
                        {client.emergencyContact.phone}
                      </span>
                    </div>
                    {client.emergencyContact.email && (
                      <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                        <Mail className="text-muted-foreground size-4" />
                        <span className="text-sm font-medium">
                          {client.emergencyContact.email}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No emergency contact on file
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Communication Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="size-4" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Marketing Emails</div>
                    <div className="text-muted-foreground text-xs">
                      Campaigns, promos, newsletters
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Opted In
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Playdate Alerts</div>
                    <div className="text-muted-foreground text-xs">
                      Friend booking notifications
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Opted In
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">
                      Channel Preference
                    </div>
                    <div className="text-muted-foreground text-xs">
                      How to reach this customer
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Email + SMS
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Pet Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Heart className="size-4" />
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
                        className="bg-muted/50 hover:bg-muted cursor-pointer rounded-lg p-3 transition-colors"
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                          )
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {pet.type === "Dog" ? (
                              <Dog className="text-muted-foreground size-4" />
                            ) : (
                              <Cat className="text-muted-foreground size-4" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold">
                                  {pet.name}
                                </h4>
                                {petData.banRecord && (
                                  <Badge
                                    variant="destructive"
                                    className="px-1 py-0 text-[10px]"
                                  >
                                    Banned
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {pet.breed} • {pet.age}{" "}
                                {pet.age === 1 ? "year" : "years"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">{pet.type}</Badge>
                        </div>
                        <div className="mt-2">
                          <TagList
                            entityType="pet"
                            entityId={pet.id}
                            compact
                            maxVisible={3}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No pets registered
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bookings History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="size-4" />
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
                          className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-4 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-lg p-2 ${
                                booking.status === "completed"
                                  ? "bg-green-100"
                                  : booking.status === "confirmed"
                                    ? "bg-blue-100"
                                    : booking.status === "pending"
                                      ? "bg-amber-100"
                                      : "bg-red-100"
                              } `}
                            >
                              {booking.status === "completed" && (
                                <CheckCircle className="size-4 text-green-600" />
                              )}
                              {booking.status === "confirmed" && (
                                <Clock className="size-4 text-blue-600" />
                              )}
                              {booking.status === "pending" && (
                                <Clock className="size-4 text-amber-600" />
                              )}
                              {booking.status === "cancelled" && (
                                <X className="size-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold capitalize">
                                {booking.service}
                                {pet && (
                                  <span className="text-muted-foreground font-normal">
                                    {" "}
                                    • {pet.name}
                                  </span>
                                )}
                              </h4>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {formatDate(booking.startDate)}
                                {booking.startDate !== booking.endDate &&
                                  ` - ${formatDate(booking.endDate)}`}
                              </p>
                              {booking.specialRequests && (
                                <p className="text-muted-foreground mt-1 text-xs italic">
                                  {booking.specialRequests}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              ${booking.totalCost}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  {clientBookings.length > 5 && (
                    <p className="text-muted-foreground pt-2 text-center text-xs">
                      Showing 5 of {clientBookings.length} bookings
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No bookings yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Purchase History (Retail) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="size-4" />
                Purchase History
              </CardTitle>
              {clientRetailPurchases.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("purchases")}
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {clientRetailPurchases.length > 0 ? (
                <div className="space-y-3">
                  {clientRetailPurchases.slice(0, 5).map((txn) => (
                    <div
                      key={txn.id}
                      className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-3 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-100 p-2">
                          <Receipt className="size-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">
                            {txn.transactionNumber}
                          </h4>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {txn.items.length} item
                            {txn.items.length !== 1 ? "s" : ""} •{" "}
                            {txn.items
                              .map((i) => i.productName)
                              .slice(0, 2)
                              .join(", ")}
                            {txn.items.length > 2 && "..."}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatDateTime(txn.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          ${txn.total.toFixed(2)}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {txn.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {clientRetailPurchases.length > 5 && (
                    <p className="text-muted-foreground pt-2 text-center text-xs">
                      Showing 5 of {clientRetailPurchases.length} purchases
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <ShoppingBag className="text-muted-foreground mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    No retail purchases yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Purchases from the store will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" />
                Customer Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesList category="customer" entityId={client.id} />
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
                <Plus className="mr-1 size-4" />
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
                        className="bg-card hover:bg-muted cursor-pointer rounded-lg border p-4 transition-colors"
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                          )
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
                            {pet.type === "Dog" ? (
                              <Dog className="text-muted-foreground h-8 w-8" />
                            ) : (
                              <Cat className="text-muted-foreground h-8 w-8" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold">
                              {pet.name}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              {pet.breed} • {pet.age}{" "}
                              {pet.age === 1 ? "year" : "years"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary">{pet.type}</Badge>
                              <Badge variant="outline">{pet.weight} kg</Badge>
                              {petData.banRecord && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Banned
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2">
                              <TagList
                                entityType="pet"
                                entityId={pet.id}
                                editable
                              />
                            </div>
                          </div>
                        </div>
                        {petData.banRecord && (
                          <div className="bg-destructive/10 text-destructive mt-3 flex items-start gap-2 rounded-sm p-2 text-xs">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
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
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.totalStays}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Stays
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.vaccinations.length}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Vaccines
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {petData.reports.length}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Reports
                            </div>
                          </div>
                        </div>
                        {petData.expiredVaccinations.length > 0 && (
                          <div className="bg-destructive/10 text-destructive mt-3 flex items-center gap-2 rounded-sm p-2 text-xs">
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
                <div className="py-8 text-center">
                  <Heart className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
                    No pets registered
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="mr-1 size-4" />
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
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="size-4" />
                Billing & Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Billing Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-green-600">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Paid
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-600">
                    ${totalOutstanding.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Outstanding
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-green-600">
                    ${totalCredits.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Credit Balance
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold">
                    {clientPayments.length}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Transactions
                  </div>
                </div>
              </div>

              {/* Outstanding Alert */}
              {outstandingInvoices.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="size-4 text-amber-600" />
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
                            className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-4 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`rounded-lg p-2 ${
                                  payment.status === "completed"
                                    ? "bg-green-100"
                                    : payment.status === "refunded"
                                      ? "bg-red-100"
                                      : "bg-amber-100"
                                } `}
                              >
                                {payment.paymentMethod === "card" && (
                                  <CreditCard className="size-4" />
                                )}
                                {payment.paymentMethod === "cash" && (
                                  <Wallet className="size-4" />
                                )}
                                {payment.paymentMethod === "gift_card" && (
                                  <Gift className="size-4" />
                                )}
                                {!["card", "cash", "gift_card"].includes(
                                  payment.paymentMethod,
                                ) && <DollarSign className="size-4" />}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">
                                  {payment.description}
                                </h4>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {formatDate(payment.createdAt)} •{" "}
                                  {payment.paymentMethod.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-sm font-semibold ${
                                  payment.status === "refunded"
                                    ? "text-red-600"
                                    : "text-green-600"
                                } `}
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
                                className="mt-1 text-xs"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
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
                              className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-4 transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold">
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
                                <p className="text-muted-foreground mt-1 text-xs">
                                  Issued: {formatDate(invoice.issuedDate)} •
                                  Due: {formatDate(invoice.dueDate)}
                                  {daysOverdue > 0 &&
                                    ` • ${daysOverdue} days overdue`}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">
                                  ${invoice.total.toFixed(2)}
                                </div>
                                {invoice.amountDue > 0 && (
                                  <div className="mt-1 flex items-center gap-2">
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
                    <p className="text-muted-foreground py-8 text-center text-sm">
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
                          className="bg-card flex items-start justify-between rounded-lg border p-4"
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
                            <p className="mt-1 text-sm">{credit.description}</p>
                            {credit.expiryDate && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                Expires: {formatDate(credit.expiryDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              ${credit.remainingAmount.toFixed(2)}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              of ${credit.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
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
                          className="bg-card flex items-start justify-between rounded-lg border p-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Gift className="text-muted-foreground size-4" />
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
                              <p className="text-muted-foreground mt-1 text-xs">
                                Expires: {formatDate(gc.expiryDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              ${gc.currentBalance.toFixed(2)}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              of ${gc.initialAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No gift cards
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase History (Retail) Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingBag className="size-4" />
                  Retail Purchase History
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  Food, accessories, and other items purchased from the store
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/facility/dashboard/services/retail?clientId=${client.id}`}
                >
                  <ExternalLink className="mr-1 size-4" />
                  New Sale
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {clientRetailPurchases.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">Total Spent</span>
                    <span className="text-xl font-bold text-amber-600">
                      ${totalRetailSpent.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {clientRetailPurchases.map((txn) => (
                      <div
                        key={txn.id}
                        className="bg-card overflow-hidden rounded-lg border"
                      >
                        <div className="bg-muted/30 flex items-center justify-between border-b p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-amber-100 p-2">
                              <Receipt className="size-4 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {txn.transactionNumber}
                              </h4>
                              <p className="text-muted-foreground text-xs">
                                {formatDateTime(txn.createdAt)} •{" "}
                                {txn.paymentMethod}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              ${txn.total.toFixed(2)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {txn.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                            Items
                          </p>
                          <div className="space-y-2">
                            {txn.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {item.productName}
                                  {item.variantName && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ({item.variantName})
                                    </span>
                                  )}
                                  <span className="text-muted-foreground ml-1">
                                    × {item.quantity}
                                  </span>
                                </span>
                                <span className="font-medium">
                                  ${item.total.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {txn.discountTotal > 0 && (
                            <div className="text-muted-foreground mt-2 flex justify-between border-t pt-2 text-sm">
                              <span>Discount</span>
                              <span>-${txn.discountTotal.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ShoppingBag className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-30" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No retail purchases yet
                  </h3>
                  <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                    When this customer buys food, accessories, or other products
                    from your store, their purchases will appear here.
                  </p>
                </div>
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
                <Upload className="mr-1 size-4" />
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
                        className="bg-card hover:bg-muted rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-1 items-start gap-3">
                            <div
                              className={`rounded-lg p-2 ${
                                isAgreement
                                  ? isDigital
                                    ? "bg-blue-100"
                                    : "bg-green-100"
                                  : "bg-muted"
                              } `}
                            >
                              {isAgreement ? (
                                isDigital ? (
                                  <Globe className="size-4 text-blue-600" />
                                ) : (
                                  <PenLine className="size-4 text-green-600" />
                                )
                              ) : (
                                <FileText className="text-muted-foreground size-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium">
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
                              <div className="mt-1 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {doc.type}
                                </Badge>
                                {doc.fileSize && (
                                  <span className="text-muted-foreground text-xs">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                )}
                                <span className="text-muted-foreground text-xs">
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
                                <div className="bg-muted/50 mt-2 rounded-sm p-2 text-xs">
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
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            {term}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              )}

                              {doc.notes && (
                                <p className="text-muted-foreground mt-2 text-xs">
                                  {doc.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {doc.fileUrl && (
                              <Button variant="ghost" size="sm">
                                <Download className="size-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No documents uploaded
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          {/* Playdate Alerts for this client */}
          {clientPlaydateAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Heart className="size-4" />
                  Playdate Alert History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientPlaydateAlerts
                    .sort(
                      (a, b) =>
                        new Date(b.sentAt).getTime() -
                        new Date(a.sentAt).getTime(),
                    )
                    .slice(0, 5)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="bg-card space-y-2 rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="size-4 text-pink-500" />
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {formatAlertChannel(alert.channel)}
                              </Badge>
                              <Badge
                                variant={getAlertStatusVariant(alert.status)}
                                className="ml-1 text-xs"
                              >
                                {alert.status}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(alert.sentAt)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">
                            Playdate alert: {alert.triggerPetName} booked
                          </h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {alert.triggerPetName} is coming — alert sent for{" "}
                            {alert.recipientPetName}
                          </p>
                        </div>
                        {alert.reasonSuppressed && (
                          <div className="text-muted-foreground border-t pt-2 text-xs">
                            Suppressed: {alert.reasonSuppressed}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                          className="bg-card space-y-2 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="size-4" />
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
                                  className="ml-1 text-xs"
                                >
                                  {call.status}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(call.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                Duration: {formatDuration(call.duration)}
                              </div>
                              {call.staffName && (
                                <div className="text-muted-foreground mt-1 text-xs">
                                  Handled by: {call.staffName}
                                </div>
                              )}
                            </div>
                            {call.recordingUrl && (
                              <Button variant="outline" size="sm">
                                <Play className="mr-1 h-3 w-3" />
                                Play Recording
                              </Button>
                            )}
                          </div>
                          {call.notes && (
                            <div className="border-t pt-2">
                              <p className="text-muted-foreground text-sm">
                                {call.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
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
                          className="bg-card space-y-2 rounded-lg border p-4"
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
                                    className="ml-1 text-xs"
                                  >
                                    Sent
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="ml-1 text-xs"
                                  >
                                    Received
                                  </Badge>
                                )}
                                {comm.status && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-xs"
                                  >
                                    {comm.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(comm.timestamp)}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">
                              {comm.subject}
                            </h4>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {comm.content}
                            </p>
                          </div>
                          {comm.staffName && (
                            <div className="text-muted-foreground border-t pt-2 text-xs">
                              By: {comm.staffName}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
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
        <DialogContent className="flex max-h-[90vh] min-w-6xl flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6">
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
          <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-lg">
            {pet.type === "Dog" ? (
              <Dog className="text-muted-foreground h-8 w-8" />
            ) : (
              <Cat className="text-muted-foreground h-8 w-8" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{pet.name}</h2>
            <div className="mt-2 flex items-center gap-2">
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
            <FileText className="mr-1 size-4" />
            Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalStays}</div>
            <div className="text-muted-foreground text-xs">Total Stays</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.length}</div>
            <div className="text-muted-foreground text-xs">Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{vaccinations.length}</div>
            <div className="text-muted-foreground text-xs">Vaccinations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-muted-foreground text-xs">Report Cards</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(expiredVaccinations.length > 0 || upcomingVaccinations.length > 0) && (
        <div className="space-y-2">
          {expiredVaccinations.length > 0 && (
            <div className="border-destructive/20 bg-destructive/10 flex items-center gap-2 rounded-lg border p-3">
              <AlertCircle className="text-destructive size-4" />
              <span className="text-destructive text-sm font-medium">
                {expiredVaccinations.length} vaccination
                {expiredVaccinations.length > 1 ? "s" : ""} expired - Update
                required
              </span>
            </div>
          )}
          {upcomingVaccinations.length > 0 &&
            expiredVaccinations.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <Clock className="size-4 text-yellow-600" />
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
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
                  <p className="text-muted-foreground text-sm">Type</p>
                  <p className="font-medium">{pet.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Breed</p>
                  <p className="font-medium">{pet.breed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Age</p>
                  <p className="font-medium">
                    {pet.age} {pet.age === 1 ? "year" : "years"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Weight</p>
                  <p className="font-medium">{pet.weight} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Color</p>
                  <p className="font-medium">{pet.color}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Microchip</p>
                  <p className="font-mono text-sm font-medium">
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
                <p className="text-muted-foreground mb-1 text-sm">Allergies</p>
                <Badge
                  variant={
                    pet.allergies !== "None" ? "destructive" : "secondary"
                  }
                >
                  {pet.allergies}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm">
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
                <Upload className="mr-1 size-4" />
                Upload Photo
              </Button>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative cursor-pointer"
                    >
                      <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden rounded-lg">
                        <ImageIcon className="text-muted-foreground h-12 w-12" />
                      </div>
                      {photo.isPrimary && (
                        <Badge className="absolute top-2 right-2 text-xs">
                          Primary
                        </Badge>
                      )}
                      <div className="mt-2">
                        {photo.caption && (
                          <p className="text-muted-foreground truncate text-xs">
                            {photo.caption}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {formatDate(photo.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Camera className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">No photos yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Pet Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <NotesList category="pet" entityId={pet.id} />
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
                <Upload className="mr-1 size-4" />
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
                          className="bg-card space-y-2 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Syringe className="text-muted-foreground mt-1 size-4" />
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold">
                                  {vacc.vaccineName}
                                </h4>
                                {vacc.veterinarianName && (
                                  <p className="text-muted-foreground mt-1 text-xs">
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
                            <p className="text-muted-foreground border-t pt-2 text-xs">
                              {vacc.notes}
                            </p>
                          )}
                          {vacc.documentUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full"
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download Certificate
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Syringe className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
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
                        className="bg-card hover:bg-muted rounded-lg border p-4 transition-colors"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold capitalize">
                              {booking.service}
                              {booking.status === "completed" && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                              {booking.status === "pending" && (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                            </h4>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {formatDate(booking.startDate)}
                              {booking.startDate !== booking.endDate &&
                                ` - ${formatDate(booking.endDate)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              ${booking.totalCost}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                        {booking.specialRequests && (
                          <p className="text-muted-foreground border-t pt-2 text-xs italic">
                            {booking.specialRequests}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <History className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
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
                        <p className="text-muted-foreground mt-1 text-sm">
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
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Activity className="size-4" />
                          Activities
                        </h4>
                        <ul className="space-y-1">
                          {report.activities.map((activity, idx) => (
                            <li
                              key={idx}
                              className="text-muted-foreground flex items-start gap-2 text-sm"
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
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Utensils className="size-4" />
                          Meals
                        </h4>
                        <div className="space-y-2">
                          {report.meals.map((meal, idx) => (
                            <div
                              key={idx}
                              className="bg-muted/50 flex items-center justify-between rounded-sm p-2"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {meal.time} - {meal.food}
                                </p>
                                <p className="text-muted-foreground text-xs">
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
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <CheckCircle className="size-4" />
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
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Camera className="size-4" />
                          Photos ({report.photos.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {report.photos.map((photo, idx) => (
                            <div
                              key={idx}
                              className="bg-muted flex aspect-square items-center justify-center rounded-lg"
                            >
                              <ImageIcon className="text-muted-foreground h-8 w-8" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Notes */}
                    {report.staffNotes && (
                      <div className="border-t pt-3">
                        <h4 className="mb-1 text-sm font-semibold">
                          Staff Notes
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {report.staffNotes}
                        </p>
                      </div>
                    )}

                    {report.sentToOwner && report.sentAt && (
                      <div className="text-muted-foreground flex items-center gap-2 border-t pt-2 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Sent to owner on {formatDateTime(report.sentAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Award className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
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
