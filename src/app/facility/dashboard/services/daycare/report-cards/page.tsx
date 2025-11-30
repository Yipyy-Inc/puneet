"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  FileText,
  PawPrint,
  Clock,
  Utensils,
  Camera,
  Mail,
  Send,
  Plus,
  Edit,
  Eye,
  Smile,
  Meh,
  Frown,
  Zap,
  Battery,
  BatteryLow,
  Trash2,
  Check,
} from "lucide-react";
import {
  daycareReportCards,
  DaycareReportCard,
  daycareCheckIns,
  ReportCardActivity,
  ReportCardMeal,
} from "@/data/daycare";

export default function DaycareReportCardsPage() {
  const [reportCards, setReportCards] =
    useState<DaycareReportCard[]>(daycareReportCards);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DaycareReportCard | null>(
    null,
  );
  const [viewingCard, setViewingCard] = useState<DaycareReportCard | null>(
    null,
  );

  const checkedInPets = daycareCheckIns.filter(
    (c) => c.status === "checked-in",
  );

  const [formData, setFormData] = useState<{
    petId: number;
    petName: string;
    overallMood: "excellent" | "good" | "fair" | "poor";
    energyLevel: "high" | "medium" | "low";
    activities: ReportCardActivity[];
    meals: ReportCardMeal[];
    photos: string[];
    notes: string;
    staffName: string;
  }>({
    petId: 0,
    petName: "",
    overallMood: "good",
    energyLevel: "medium",
    activities: [],
    meals: [],
    photos: [],
    notes: "",
    staffName: "",
  });

  const [newActivity, setNewActivity] = useState({
    time: "",
    activity: "",
    notes: "",
  });

  const [newMeal, setNewMeal] = useState<{
    time: string;
    type: "breakfast" | "lunch" | "dinner" | "snack";
    foodType: string;
    amount: string;
    eaten: "all" | "most" | "some" | "none";
  }>({
    time: "",
    type: "breakfast",
    foodType: "",
    amount: "",
    eaten: "all",
  });

  const handleAddNew = () => {
    setEditingCard(null);
    setFormData({
      petId: 0,
      petName: "",
      overallMood: "good",
      energyLevel: "medium",
      activities: [],
      meals: [],
      photos: [],
      notes: "",
      staffName: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (card: DaycareReportCard) => {
    setEditingCard(card);
    setFormData({
      petId: card.petId,
      petName: card.petName,
      overallMood: card.overallMood,
      energyLevel: card.energyLevel,
      activities: [...card.activities],
      meals: [...card.meals],
      photos: [...card.photos],
      notes: card.notes,
      staffName: card.staffName,
    });
    setIsModalOpen(true);
  };

  const handleView = (card: DaycareReportCard) => {
    setViewingCard(card);
    setIsViewModalOpen(true);
  };

  const handleSave = () => {
    if (editingCard) {
      setReportCards(
        reportCards.map((rc) =>
          rc.id === editingCard.id
            ? {
                ...rc,
                ...formData,
              }
            : rc,
        ),
      );
    } else {
      const selectedPet = checkedInPets.find((p) => p.petId === formData.petId);
      const now = new Date();
      const newCard: DaycareReportCard = {
        id: `rc-${now.getTime()}`,
        checkInId: selectedPet?.id || "",
        petId: formData.petId,
        petName: selectedPet?.petName || formData.petName,
        date: now.toISOString().split("T")[0],
        overallMood: formData.overallMood,
        energyLevel: formData.energyLevel,
        activities: formData.activities,
        meals: formData.meals,
        photos: formData.photos,
        notes: formData.notes,
        staffName: formData.staffName,
        sentToOwner: false,
        sentAt: null,
      };
      setReportCards([newCard, ...reportCards]);
    }
    setIsModalOpen(false);
  };

  const handleSendToOwner = (cardId: string) => {
    setReportCards(
      reportCards.map((rc) =>
        rc.id === cardId
          ? { ...rc, sentToOwner: true, sentAt: new Date().toISOString() }
          : rc,
      ),
    );
  };

  const addActivity = () => {
    if (newActivity.time && newActivity.activity) {
      setFormData({
        ...formData,
        activities: [...formData.activities, { ...newActivity }],
      });
      setNewActivity({ time: "", activity: "", notes: "" });
    }
  };

  const removeActivity = (index: number) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter((_, i) => i !== index),
    });
  };

  const addMeal = () => {
    if (newMeal.time && newMeal.foodType) {
      setFormData({
        ...formData,
        meals: [...formData.meals, { ...newMeal }],
      });
      setNewMeal({
        time: "",
        type: "breakfast",
        foodType: "",
        amount: "",
        eaten: "all",
      });
    }
  };

  const removeMeal = (index: number) => {
    setFormData({
      ...formData,
      meals: formData.meals.filter((_, i) => i !== index),
    });
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "excellent":
        return <Smile className="h-4 w-4 text-success" />;
      case "good":
        return <Smile className="h-4 w-4 text-primary" />;
      case "fair":
        return <Meh className="h-4 w-4 text-warning" />;
      case "poor":
        return <Frown className="h-4 w-4 text-destructive" />;
      default:
        return <Meh className="h-4 w-4" />;
    }
  };

  const getEnergyIcon = (energy: string) => {
    switch (energy) {
      case "high":
        return <Zap className="h-4 w-4 text-warning" />;
      case "medium":
        return <Battery className="h-4 w-4 text-primary" />;
      case "low":
        return <BatteryLow className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Battery className="h-4 w-4" />;
    }
  };

  const columns: ColumnDef<DaycareReportCard>[] = [
    {
      key: "petName",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <PawPrint className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{item.petName}</span>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <span>
          {new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "overallMood",
      label: "Mood",
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          {getMoodIcon(item.overallMood)}
          <span className="capitalize">{item.overallMood}</span>
        </div>
      ),
    },
    {
      key: "energyLevel",
      label: "Energy",
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          {getEnergyIcon(item.energyLevel)}
          <span className="capitalize">{item.energyLevel}</span>
        </div>
      ),
    },
    {
      key: "activities",
      label: "Activities",
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline">{item.activities.length} activities</Badge>
      ),
    },
    {
      key: "meals",
      label: "Meals",
      icon: Utensils,
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline">{item.meals.length} meals</Badge>
      ),
    },
    {
      key: "photos",
      label: "Photos",
      icon: Camera,
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline">{item.photos.length} photos</Badge>
      ),
    },
    {
      key: "sentToOwner",
      label: "Sent",
      icon: Mail,
      defaultVisible: true,
      render: (item) =>
        item.sentToOwner ? (
          <Badge variant="success">
            <Check className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        ),
    },
  ];

  // Summary stats
  const todayCards = reportCards.filter(
    (rc) => rc.date === new Date().toISOString().split("T")[0],
  ).length;
  const sentCards = reportCards.filter((rc) => rc.sentToOwner).length;
  const pendingCards = reportCards.filter((rc) => !rc.sentToOwner).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reportCards.length}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCards}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Mail className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCards}</p>
                <p className="text-sm text-muted-foreground">Sent to Owners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Send className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCards}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daily Report Cards</CardTitle>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Report Card
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={reportCards}
            columns={columns}
            searchKey="petName"
            searchPlaceholder="Search by pet name..."
            actions={(item) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleView(item)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!item.sentToOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSendToOwner(item.id as string)}
                  >
                    <Send className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Edit Report Card" : "Create Report Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Pet Selection */}
            {!editingCard && (
              <div className="space-y-2">
                <Label>Select Pet</Label>
                <Select
                  value={formData.petId.toString()}
                  onValueChange={(value) => {
                    const pet = checkedInPets.find(
                      (p) => p.petId === parseInt(value),
                    );
                    setFormData({
                      ...formData,
                      petId: parseInt(value),
                      petName: pet?.petName || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {checkedInPets.map((pet) => (
                      <SelectItem key={pet.petId} value={pet.petId.toString()}>
                        {pet.petName} ({pet.petBreed})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mood & Energy */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overall Mood</Label>
                <Select
                  value={formData.overallMood}
                  onValueChange={(
                    value: "excellent" | "good" | "fair" | "poor",
                  ) => setFormData({ ...formData, overallMood: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">
                      <div className="flex items-center gap-2">
                        <Smile className="h-4 w-4 text-success" />
                        Excellent
                      </div>
                    </SelectItem>
                    <SelectItem value="good">
                      <div className="flex items-center gap-2">
                        <Smile className="h-4 w-4 text-primary" />
                        Good
                      </div>
                    </SelectItem>
                    <SelectItem value="fair">
                      <div className="flex items-center gap-2">
                        <Meh className="h-4 w-4 text-warning" />
                        Fair
                      </div>
                    </SelectItem>
                    <SelectItem value="poor">
                      <div className="flex items-center gap-2">
                        <Frown className="h-4 w-4 text-destructive" />
                        Poor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Energy Level</Label>
                <Select
                  value={formData.energyLevel}
                  onValueChange={(value: "high" | "medium" | "low") =>
                    setFormData({ ...formData, energyLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-warning" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Battery className="h-4 w-4 text-primary" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <BatteryLow className="h-4 w-4 text-muted-foreground" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-3">
              <Label>Activities</Label>
              <div className="space-y-2">
                {formData.activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium">{activity.time}</span>
                    <span className="text-sm flex-1">{activity.activity}</span>
                    {activity.notes && (
                      <span className="text-xs text-muted-foreground">
                        ({activity.notes})
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeActivity(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newActivity.time}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, time: e.target.value })
                  }
                  className="w-32"
                />
                <Input
                  value={newActivity.activity}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, activity: e.target.value })
                  }
                  placeholder="Activity description"
                  className="flex-1"
                />
                <Input
                  value={newActivity.notes}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, notes: e.target.value })
                  }
                  placeholder="Notes (optional)"
                  className="w-40"
                />
                <Button type="button" variant="outline" onClick={addActivity}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Meals */}
            <div className="space-y-3">
              <Label>Meals</Label>
              <div className="space-y-2">
                {formData.meals.map((meal, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium">{meal.time}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {meal.type}
                    </Badge>
                    <span className="text-sm flex-1">
                      {meal.foodType} - {meal.amount}
                    </span>
                    <Badge
                      variant={
                        meal.eaten === "all"
                          ? "success"
                          : meal.eaten === "most"
                            ? "default"
                            : meal.eaten === "some"
                              ? "warning"
                              : "destructive"
                      }
                      className="text-xs"
                    >
                      {meal.eaten}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeMeal(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-2">
                <Input
                  type="time"
                  value={newMeal.time}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, time: e.target.value })
                  }
                />
                <Select
                  value={newMeal.type}
                  onValueChange={(
                    value: "breakfast" | "lunch" | "dinner" | "snack",
                  ) => setNewMeal({ ...newMeal, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={newMeal.foodType}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, foodType: e.target.value })
                  }
                  placeholder="Food type"
                />
                <Input
                  value={newMeal.amount}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, amount: e.target.value })
                  }
                  placeholder="Amount"
                />
                <Select
                  value={newMeal.eaten}
                  onValueChange={(value: "all" | "most" | "some" | "none") =>
                    setNewMeal({ ...newMeal, eaten: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="most">Most</SelectItem>
                    <SelectItem value="some">Some</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addMeal}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes for Owner</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Write a summary of the pet's day..."
                rows={3}
              />
            </div>

            {/* Staff Name */}
            <div className="space-y-2">
              <Label>Staff Name</Label>
              <Input
                value={formData.staffName}
                onChange={(e) =>
                  setFormData({ ...formData, staffName: e.target.value })
                }
                placeholder="Enter your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.petId && !editingCard}
            >
              {editingCard ? "Save Changes" : "Create Report Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Daily Report Card - {viewingCard?.petName}
            </DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(viewingCard.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Mood</p>
                    <div className="flex items-center gap-1">
                      {getMoodIcon(viewingCard.overallMood)}
                      <span className="capitalize">
                        {viewingCard.overallMood}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Energy</p>
                    <div className="flex items-center gap-1">
                      {getEnergyIcon(viewingCard.energyLevel)}
                      <span className="capitalize">
                        {viewingCard.energyLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Activities
                </h3>
                <div className="space-y-2">
                  {viewingCard.activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <span className="text-sm font-medium text-primary">
                        {activity.time}
                      </span>
                      <div>
                        <p className="font-medium">{activity.activity}</p>
                        {activity.notes && (
                          <p className="text-sm text-muted-foreground">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meals */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Meals
                </h3>
                <div className="space-y-2">
                  {viewingCard.meals.map((meal, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary">
                          {meal.time}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {meal.type}
                        </Badge>
                        <span>
                          {meal.foodType} - {meal.amount}
                        </span>
                      </div>
                      <Badge
                        variant={
                          meal.eaten === "all"
                            ? "success"
                            : meal.eaten === "most"
                              ? "default"
                              : meal.eaten === "some"
                                ? "warning"
                                : "destructive"
                        }
                      >
                        Ate {meal.eaten}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {viewingCard.photos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Photos
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {viewingCard.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center"
                      >
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <h3 className="font-semibold">Notes from Staff</h3>
                <p className="p-4 rounded-lg bg-muted/50">
                  {viewingCard.notes}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Report by:{" "}
                  <span className="font-medium">{viewingCard.staffName}</span>
                </p>
                {viewingCard.sentToOwner ? (
                  <Badge variant="success">
                    <Check className="h-3 w-3 mr-1" />
                    Sent to owner
                    {viewingCard.sentAt &&
                      ` at ${new Date(viewingCard.sentAt).toLocaleTimeString()}`}
                  </Badge>
                ) : (
                  <Button onClick={() => handleSendToOwner(viewingCard.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Send to Owner
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
