"use client";

import { useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
  petRelationships,
} from "@/data/pet-data";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Dog,
  Cat,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Activity,
  Utensils,
  Camera,
  Upload,
  Award,
  Syringe,
  Edit,
  Save,
  X,
  Heart,
  UserPlus,
  AlertTriangle,
  Users,
  Star,
  Bell,
  Ghost,
  Egg,
  PartyPopper,
} from "lucide-react";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import type { Client } from "@/types/client";
import type { NewBooking as BookingData } from "@/types/booking";
import type { Evaluation, Pet } from "@/types/pet";
import { StaffEvaluationFormModal } from "@/components/evaluations/StaffEvaluationFormModal";
import { DataTable } from "@/components/ui/DataTable";
import { NotesButton } from "@/components/shared/NotesButton";
import { TagsButton } from "@/components/shared/TagsButton";
import { ClientInfoStrip } from "@/components/clients/ClientInfoStrip";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { hasPermission } from "@/lib/role-utils";

/* ── Report-card theme visuals ────────────────────────────────────── */
interface ThemeStyle {
  label: string;
  emoji: string;
  cardBg: string;
  accentBg: string;
  accentText: string;
  DecorativeIcon: React.ComponentType<{ className?: string }>;
  iconPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  patternClass?: string;
}

const reportCardThemes: Record<string, ThemeStyle> = {
  everyday: {
    label: "Everyday",
    emoji: "✨",
    cardBg: "bg-slate-50",
    accentBg: "bg-slate-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
  },
  christmas: {
    label: "Christmas",
    emoji: "🎄",
    cardBg: "bg-red-50",
    accentBg: "bg-red-600",
    accentText: "text-white",
    DecorativeIcon: Bell,
    iconPosition: "top-right",
    patternClass: "report-card-pattern-snowflakes",
  },
  halloween: {
    label: "Halloween",
    emoji: "🎃",
    cardBg: "bg-orange-50",
    accentBg: "bg-violet-700",
    accentText: "text-white",
    DecorativeIcon: Ghost,
    iconPosition: "top-right",
    patternClass: "report-card-pattern-spiderweb",
  },
  easter: {
    label: "Easter",
    emoji: "🐣",
    cardBg: "bg-pink-50",
    accentBg: "bg-pink-500",
    accentText: "text-white",
    DecorativeIcon: Egg,
    iconPosition: "bottom-right",
  },
  thanksgiving: {
    label: "Thanksgiving",
    emoji: "🦃",
    cardBg: "bg-amber-50",
    accentBg: "bg-amber-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
  },
  new_year: {
    label: "New Year",
    emoji: "🎉",
    cardBg: "bg-indigo-50",
    accentBg: "bg-indigo-600",
    accentText: "text-white",
    DecorativeIcon: PartyPopper,
    iconPosition: "top-right",
  },
  valentines: {
    label: "Valentine's",
    emoji: "💘",
    cardBg: "bg-rose-50",
    accentBg: "bg-rose-500",
    accentText: "text-white",
    DecorativeIcon: Heart,
    iconPosition: "top-right",
  },
  summer: {
    label: "Summer",
    emoji: "☀️",
    cardBg: "bg-sky-50",
    accentBg: "bg-sky-500",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
  },
  winter: {
    label: "Winter",
    emoji: "❄️",
    cardBg: "bg-blue-50",
    accentBg: "bg-blue-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
    patternClass: "report-card-pattern-snowflakes",
  },
};

/* All card backgrounds are now light (-50 shades), so no dark detection needed */

export default function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string; petId: string }>;
}) {
  const { id, petId } = use(params);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const { role, userId } = useFacilityRole();
  const canUseEvaluationForm = hasPermission(
    role,
    "add_pet_notes",
    userId ?? undefined,
  );
  const [activeEvaluation, setActiveEvaluation] = useState<Evaluation | null>(
    null,
  );

  const client = clients.find((c) => c.id === parseInt(id));
  const pet = client?.pets.find((p) => p.id === parseInt(petId));

  const [editedPet, setEditedPet] = useState<Pet | null>(pet || null);

  const petEvaluations = (pet as { evaluations?: Evaluation[] } | undefined)
    ?.evaluations;

  const latestEvaluation = useMemo(() => {
    const evals = petEvaluations || [];
    return [...evals].sort((a, b) => {
      const da = a.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
      const db = b.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
      return db - da;
    })[0];
  }, [petEvaluations]);

  const latestFailedEvaluation = useMemo(() => {
    const failed = petEvaluations?.filter((e) => e.status === "failed") || [];
    return failed
      .map((e) => ({
        ...e,
        evaluatedAtValue: e.evaluatedAt ? new Date(e.evaluatedAt).getTime() : 0,
      }))
      .sort((a, b) => b.evaluatedAtValue - a.evaluatedAtValue)[0];
  }, [petEvaluations]);

  if (!client || !pet) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pet not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/facility/dashboard/clients/${id}`)}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Client
          </Button>
        </div>
      </div>
    );
  }

  const photos = petPhotos.filter((p) => p.petId === pet.id);
  const vaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
  const petBookings = bookings.filter((b) => b.petId === pet.id);
  const reports = reportCards.filter((r) => r.petId === pet.id);
  const relationships = petRelationships.filter((r) => r.petId === pet.id);
  const friends = relationships.filter(
    (r) =>
      r.relationshipType === "friend" || r.relationshipType === "best_friend",
  );
  const enemies = relationships.filter(
    (r) => r.relationshipType === "keep_apart",
  );
  const totalStays = petBookings.filter((b) => b.status === "completed").length;
  const expiredVaccinations = vaccinations.filter(
    (v) => new Date(v.expiryDate) < new Date(),
  );
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const upcomingVaccinations = vaccinations.filter(
    (v) =>
      new Date(v.expiryDate) <= sixtyDaysFromNow &&
      new Date(v.expiryDate) > now,
  );

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

  const hasValidEvaluation =
    petEvaluations?.some(
      (e) => e.status === "passed" && e.isExpired !== true,
    ) ?? false;

  const hasExpiredEvaluation =
    petEvaluations?.some(
      (e) =>
        (e.status === "passed" && e.isExpired === true) ||
        e.status === "outdated",
    ) ?? false;

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
    // For now we just toggle edit mode off
  };

  const handleCancel = () => {
    setEditedPet(pet);
    setIsEditing(false);
  };

  const handleCreateBooking = (bookingData: BookingData) => {
    // In a real app, this would save to the backend
    console.log("Creating booking:", bookingData);
    // For now, just close the modal
    setBookingModalOpen(false);
  };

  return (
    <div>
      {/* Client info strip */}
      <ClientInfoStrip
        client={client}
        backHref={`/facility/dashboard/clients/${id}`}
        currentContext={`Pet: ${pet.name}`}
      />

      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
                {pet.type === "Dog" ? (
                  <Dog className="text-muted-foreground size-6" />
                ) : (
                  <Cat className="text-muted-foreground size-6" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {pet.name}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline">
                    {pet.type} • {pet.breed}
                  </Badge>
                  <Badge variant="secondary">
                    {pet.age} {pet.age === 1 ? "year" : "years"}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Owner: {client.name}
            </p>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookingModalOpen(true)}
                >
                  <Calendar className="mr-1 size-4" />
                  Book
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="mr-1 size-4" />
                  Report
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tags + Notes */}
        <div className="flex items-center gap-2">
          <TagsButton entityType="pet" entityId={pet.id} />
          <NotesButton entityType="pet" entityId={pet.id} />
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
        {(expiredVaccinations.length > 0 ||
          upcomingVaccinations.length > 0) && (
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
          <TabsList
            className={`grid w-full ${canUseEvaluationForm ? "grid-cols-7" : `grid-cols-6`} `}
          >
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="relationships">
              Relationships
              {enemies.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {enemies.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
            <TabsTrigger value="history">Stay History</TabsTrigger>
            <TabsTrigger value="reports">Report Cards</TabsTrigger>
            {canUseEvaluationForm && (
              <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Evaluation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">
                    {hasValidEvaluation ? "Valid" : "Expired"}
                  </div>
                  <Badge
                    variant={
                      hasValidEvaluation && !hasExpiredEvaluation
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {hasValidEvaluation && !hasExpiredEvaluation
                      ? "Valid"
                      : "Expired"}
                  </Badge>
                </div>
                {latestEvaluation && (
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span className="font-medium">Last outcome:</span>
                    <Badge
                      variant={
                        latestEvaluation.status === "passed"
                          ? "secondary"
                          : "destructive"
                      }
                      className="capitalize"
                    >
                      {latestEvaluation.status}
                    </Badge>
                    {latestEvaluation.isExpired && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                )}
                {latestFailedEvaluation?.notes && (
                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p className="font-semibold">Last failure reason (staff)</p>
                    <p>{latestFailedEvaluation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing && editedPet ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editedPet.name}
                        onChange={(e) =>
                          setEditedPet({ ...editedPet, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={editedPet.type}
                        onValueChange={(value) =>
                          setEditedPet({ ...editedPet, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dog">Dog</SelectItem>
                          <SelectItem value="Cat">Cat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed">Breed</Label>
                      <Input
                        id="breed"
                        value={editedPet.breed}
                        onChange={(e) =>
                          setEditedPet({ ...editedPet, breed: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (years)</Label>
                      <Input
                        id="age"
                        type="number"
                        value={editedPet.age}
                        onChange={(e) =>
                          setEditedPet({
                            ...editedPet,
                            age: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={editedPet.weight}
                        onChange={(e) =>
                          setEditedPet({
                            ...editedPet,
                            weight: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={editedPet.color}
                        onChange={(e) =>
                          setEditedPet({ ...editedPet, color: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="microchip">Microchip</Label>
                      <Input
                        id="microchip"
                        value={editedPet.microchip}
                        onChange={(e) =>
                          setEditedPet({
                            ...editedPet,
                            microchip: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Medical & Diet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && editedPet ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies</Label>
                      <Textarea
                        id="allergies"
                        value={editedPet.allergies}
                        onChange={(e) =>
                          setEditedPet({
                            ...editedPet,
                            allergies: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialNeeds">Special Needs</Label>
                      <Textarea
                        id="specialNeeds"
                        value={editedPet.specialNeeds}
                        onChange={(e) =>
                          setEditedPet({
                            ...editedPet,
                            specialNeeds: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-muted-foreground mb-1 text-sm">
                        Allergies
                      </p>
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="space-y-4">
            {/* Friends Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Heart className="size-4 text-green-600" />
                  Friends ({friends.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-1 size-4" />
                  Add Friend
                </Button>
              </CardHeader>
              <CardContent>
                {friends.length > 0 ? (
                  <div className="space-y-3">
                    {friends.map((rel) => (
                      <div
                        key={rel.id}
                        className="bg-card hover:bg-muted flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-green-100">
                            {rel.relatedPetType === "Dog" ? (
                              <Dog className="size-5 text-green-600" />
                            ) : (
                              <Cat className="size-5 text-green-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">
                              {rel.relatedPetName}
                            </h4>
                            <p className="text-muted-foreground text-xs">
                              {rel.relatedPetBreed}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={
                              rel.relationshipType === "best_friend"
                                ? "border-pink-200 bg-pink-50 text-pink-700"
                                : "border-green-200 bg-green-50 text-green-700"
                            }
                          >
                            {rel.relationshipType === "best_friend"
                              ? "Best Friend"
                              : "Friend"}
                          </Badge>
                          <Badge
                            variant={rel.allowAlerts ? "default" : "secondary"}
                            className="cursor-pointer text-xs"
                            title={
                              rel.allowAlerts
                                ? "Playdate alerts enabled for this friend"
                                : "Playdate alerts disabled for this friend"
                            }
                          >
                            {rel.allowAlerts ? "Alerts On" : "Alerts Off"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {friends.map((rel) =>
                      rel.notes ? (
                        <div
                          key={`${rel.id}-notes`}
                          className="text-muted-foreground -mt-2 px-4 text-xs"
                        >
                          Note: {rel.notes}
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Heart className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground text-sm">
                      No friends added yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enemies Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="text-destructive size-4" />
                  Keep Apart ({enemies.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-1 size-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {enemies.length > 0 ? (
                  <div className="space-y-3">
                    {enemies.map((rel) => (
                      <div
                        key={rel.id}
                        className="border-destructive/20 bg-destructive/5 rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-destructive/10 flex size-10 items-center justify-center rounded-full">
                              {rel.relatedPetType === "Dog" ? (
                                <Dog className="text-destructive size-5" />
                              ) : (
                                <Cat className="text-destructive size-5" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {rel.relatedPetName}
                              </h4>
                              <p className="text-muted-foreground text-xs">
                                {rel.relatedPetBreed}
                              </p>
                            </div>
                          </div>
                          <Badge variant="destructive">Keep Apart</Badge>
                        </div>
                        {rel.notes && (
                          <div className="bg-destructive/10 text-destructive mt-3 rounded-sm p-2 text-xs">
                            <AlertTriangle className="mr-1 inline size-3" />
                            {rel.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Users className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground text-sm">
                      No pets to keep apart
                    </p>
                  </div>
                )}
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
                          <ImageIcon className="text-muted-foreground size-12" />
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
                    <Camera className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground text-sm">
                      No photos yet
                    </p>
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
                  <Syringe className="mr-1 size-4" />
                  Add Vaccination
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
                      .map((vax) => {
                        const status = getVaccinationStatus(vax);
                        return (
                          <div
                            key={vax.id}
                            className="bg-card flex items-start justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`rounded-lg p-2 ${
                                  status.status === "expired"
                                    ? "bg-destructive/10"
                                    : status.status === "expiring-soon"
                                      ? "bg-yellow-100"
                                      : "bg-green-100"
                                } `}
                              >
                                <Syringe
                                  className={`size-4 ${
                                    status.status === "expired"
                                      ? "text-destructive"
                                      : status.status === "expiring-soon"
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                  } `}
                                />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">
                                  {vax.vaccineName}
                                </h4>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  Administered:{" "}
                                  {formatDate(vax.administeredDate)}
                                </p>
                                {vax.veterinarianName && (
                                  <p className="text-muted-foreground text-xs">
                                    By: {vax.veterinarianName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  status.status === "expired"
                                    ? "destructive"
                                    : status.status === "expiring-soon"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {status.status === "expired"
                                  ? `Expired ${status.days} days ago`
                                  : status.status === "expiring-soon"
                                    ? `Expires in ${status.days} days`
                                    : `Valid for ${status.days} days`}
                              </Badge>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Expires: {formatDate(vax.expiryDate)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Syringe className="text-muted-foreground mx-auto mb-2 size-12" />
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
                          className="bg-card hover:bg-muted flex cursor-pointer items-start justify-between rounded-lg border p-4 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-muted rounded-lg p-2">
                              <Calendar className="text-muted-foreground size-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {booking.service}
                              </h4>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {formatDate(booking.startDate)} -{" "}
                                {formatDate(booking.endDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                booking.status === "completed"
                                  ? "outline"
                                  : booking.status === "confirmed"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {booking.status}
                            </Badge>
                            <p className="mt-1 text-sm font-medium">
                              ${booking.totalCost}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground text-sm">
                      No booking history
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Cards Tab */}
          <TabsContent value="reports" className="space-y-6">
            {reports.length > 0 ? (
              reports
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((report) => {
                  const theme =
                    reportCardThemes[report.theme || "everyday"] ??
                    reportCardThemes.everyday;
                  const { DecorativeIcon } = theme;

                  return (
                    <div
                      key={report.id}
                      className={`relative overflow-hidden rounded-xl border ${theme.cardBg} `}
                    >
                      {/* Decorative corner icon */}
                      <DecorativeIcon
                        className={`absolute h-20 w-20 text-gray-900 opacity-[0.06] ${
                          theme.iconPosition === "top-right"
                            ? "-top-1 -right-1"
                            : theme.iconPosition === "top-left"
                              ? "-top-1 -left-1"
                              : theme.iconPosition === "bottom-right"
                                ? "-right-1 -bottom-1"
                                : "-bottom-1 -left-1"
                        } `}
                      />

                      {/* Themed header banner */}
                      <div
                        className={`relative px-5 py-3 ${theme.accentBg} ${theme.accentText} flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{theme.emoji}</span>
                          <div>
                            <p className="text-sm font-bold">
                              {formatDate(report.date)}
                            </p>
                            <p className="text-xs opacity-80">
                              By: {report.createdBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={` ${getMoodColor(report.mood)} text-xs capitalize`}
                          >
                            {report.mood}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/40 text-xs text-white/90 capitalize"
                          >
                            {report.serviceType}
                          </Badge>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="relative space-y-4 p-4">
                        {/* Activities */}
                        {report.activities.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                              <Activity className="size-4" />
                              Activities
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {report.activities.map((activity, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {activity}
                                </Badge>
                              ))}
                            </div>
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
                                  className="flex items-center justify-between rounded-sm bg-gray-50 p-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {meal.time} - {meal.food}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      {meal.amount}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
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
                                  variant={
                                    potty.type === "success"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {potty.time} -{" "}
                                  {potty.type === "success"
                                    ? "Success"
                                    : "Accident"}
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
                                  className="flex aspect-square items-center justify-center rounded-lg bg-gray-100"
                                >
                                  <ImageIcon className="text-muted-foreground size-8" />
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
                            <CheckCircle className="size-3 text-green-500" />
                            Sent to owner on {formatDateTime(report.sentAt)}
                          </div>
                        )}
                      </div>

                      {/* Theme label footer */}
                      <div className="flex justify-end px-5 pb-3">
                        <span className="text-xs font-medium text-gray-400">
                          {theme.emoji} {theme.label} Theme
                        </span>
                      </div>
                    </div>
                  );
                })
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Award className="text-muted-foreground mx-auto mb-2 size-12" />
                  <p className="text-muted-foreground text-sm">
                    No report cards yet
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {canUseEvaluationForm && (
            <TabsContent value="evaluations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Evaluations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const evals = ((pet as Pet).evaluations ?? []).map((ev) => {
                      const expired =
                        ev.isExpired === true || ev.status === "outdated";
                      const outcome =
                        ev.status === "passed"
                          ? "PASS"
                          : ev.status === "failed"
                            ? "FAIL"
                            : ev.status.toUpperCase();
                      const validity = expired ? "Expired" : "Valid";
                      return { ...ev, expired, outcome, validity };
                    });

                    if (evals.length === 0) {
                      return (
                        <p className="text-muted-foreground text-sm">
                          No evaluations found for this pet.
                        </p>
                      );
                    }

                    return (
                      <DataTable
                        data={evals}
                        searchKeys={["id", "status", "evaluatedBy", "notes"]}
                        searchPlaceholder="Search evaluations..."
                        columns={[
                          {
                            key: "evaluatedAt",
                            label: "Date",
                            render: (row) =>
                              row.evaluatedAt
                                ? formatDateTime(row.evaluatedAt)
                                : "Not completed",
                          },
                          {
                            key: "outcome",
                            label: "Outcome",
                            render: (row) => (
                              <Badge
                                variant={
                                  row.outcome === "PASS"
                                    ? "secondary"
                                    : row.outcome === "FAIL"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {row.outcome}
                              </Badge>
                            ),
                          },
                          {
                            key: "validity",
                            label: "Validity",
                            render: (row) =>
                              row.status === "passed" ||
                              row.status === "outdated" ? (
                                <Badge
                                  variant={
                                    row.expired ? "destructive" : "secondary"
                                  }
                                >
                                  {row.validity}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              ),
                          },
                          {
                            key: "evaluatedBy",
                            label: "Evaluator",
                            render: (row) => row.evaluatedBy || "—",
                          },
                          {
                            key: "notes",
                            label: "Notes (staff)",
                            render: (row) =>
                              row.notes ? (
                                <span className="text-muted-foreground line-clamp-2">
                                  {row.notes}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              ),
                          },
                        ]}
                        actions={(row) => (
                          <Button
                            size="sm"
                            onClick={() => setActiveEvaluation(row)}
                          >
                            Complete Evaluation
                          </Button>
                        )}
                      />
                    );
                  })()}
                </CardContent>
              </Card>

              {activeEvaluation && (
                <StaffEvaluationFormModal
                  open={!!activeEvaluation}
                  onOpenChange={(open) => !open && setActiveEvaluation(null)}
                  evaluation={activeEvaluation}
                  petName={pet.name}
                />
              )}
            </TabsContent>
          )}
        </Tabs>

        <PageAuditTrail area="pets" entityId={String(petId)} />

        <BookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          clients={clients as Client[]}
          facilityId={1} // Assuming facility ID is 1
          facilityName="Sample Facility"
          onCreateBooking={handleCreateBooking}
          preSelectedClientId={Number(id)}
          preSelectedPetId={parseInt(petId)}
        />
      </div>
    </div>
  );
}
